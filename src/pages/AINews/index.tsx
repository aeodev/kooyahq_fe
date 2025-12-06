import { useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { Loader2, Sparkles, Newspaper, Filter, RefreshCw, Bell } from 'lucide-react'
import { LazyNewsCard } from './LazyNewsCard'
import { useAINews } from '@/hooks/ai-news.hooks'
import type { NewsFilter } from '@/types/ai-news'

const FILTERS: { value: NewsFilter; label: string; icon?: typeof Filter }[] = [
  { value: 'all', label: 'All', icon: Filter },
  { value: 'news', label: 'News', icon: Newspaper },
  { value: 'openai', label: 'OpenAI' },
  { value: 'techcrunch', label: 'TechCrunch' },
  { value: 'reddit', label: 'Reddit ML' },
  { value: 'hackernews', label: 'HackerNews' },
  { value: 'devto-ai', label: 'Dev.to AI' },
  { value: 'arxiv', label: 'ArXiv' },
]

export function AINews() {
  const observerRef = useRef<HTMLDivElement>(null)
  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    filter,
    hasPendingItems,
    pendingItems,
    setFilter,
    fetchNews,
    loadMore,
    showPendingItems,
  } = useAINews()

  // Infinite scroll
  useEffect(() => {
    const target = observerRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadMore])

  const isLoading = loading || loadingMore

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI News
          </h1>
          <p className="text-muted-foreground mt-1">
            Latest AI news from top sources
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchNews(true)}
          disabled={isLoading}
          title="Refresh"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* New items banner */}
      {hasPendingItems && (
        <button
          onClick={showPendingItems}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
        >
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {pendingItems.length} new {pendingItems.length === 1 ? 'item' : 'items'}
          </span>
        </button>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={filter === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(value)}
            className={cn('gap-2', filter === value && 'bg-primary text-primary-foreground')}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {loading && items.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No news found</p>
            <Button variant="outline" onClick={() => fetchNews(true)} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {items.map(item => (
              <LazyNewsCard key={item.id} item={item} />
            ))}
          </div>

          <div ref={observerRef} className="h-10 flex items-center justify-center">
            {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
        </>
      )}
    </div>
  )
}
