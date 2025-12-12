import { useRef, useEffect, useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { Loader2, Newspaper, Bell } from 'lucide-react'
import { LazyNewsCard } from './LazyNewsCard'
import { useAINews } from '@/hooks/ai-news.hooks'
import type { NewsFilter } from '@/types/ai-news'

const FILTERS: { value: NewsFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'news', label: 'News' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'techcrunch', label: 'TechCrunch' },
  { value: 'reddit', label: 'Reddit ML' },
  { value: 'hackernews', label: 'HackerNews' },
  { value: 'devto-ai', label: 'Dev.to AI' },
  { value: 'arxiv', label: 'ArXiv' },
]

export function AINews() {
  const observerRef = useRef<HTMLDivElement>(null)
  const filterContainerRef = useRef<HTMLDivElement>(null)
  const filterButtonRefs = useRef<Map<NewsFilter, HTMLButtonElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  
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
    loadMore,
    showPendingItems,
  } = useAINews()

  // Update indicator position when filter changes
  useEffect(() => {
    const updateIndicator = () => {
      const activeButton = filterButtonRefs.current.get(filter)
      const container = filterContainerRef.current
      
      if (activeButton && container) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()
        
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        })
      }
    }
    
    // Initial position
    updateIndicator()
    
    // Update on window resize
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [filter])

  // Memoize loadMore to prevent unnecessary re-renders
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      loadMore()
    }
  }, [hasMore, loadingMore, loading, loadMore])

  // Infinite scroll
  useEffect(() => {
    const target = observerRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [handleLoadMore])


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
    
          AI News
        </h1>
        <p className="text-muted-foreground mt-1">
          Stay ahead with curated AI insights and breakthroughs
        </p>
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
      <div 
        ref={filterContainerRef}
        className="relative flex flex-wrap gap-2 pb-3 border-b"
      >
        {/* Animated jelly selector indicator */}
        {indicatorStyle.width > 0 && (
          <div
            className="absolute bottom-0 h-[3px] bg-primary rounded-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              transform: 'translateY(3px)',
            }}
          />
        )}
        
        {FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            ref={(el) => {
              if (el) filterButtonRefs.current.set(value, el)
            }}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(value)}
            className={cn(
              'gap-2 relative z-10 transition-all duration-300 rounded-lg',
              filter === value
                ? 'text-primary font-semibold scale-105'
                : 'text-muted-foreground hover:text-foreground hover:scale-[1.02]'
            )}
          >
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
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="break-inside-avoid mb-6">
                <LazyNewsCard item={item} />
              </div>
            ))}
          </div>

          <div ref={observerRef} className="h-10 flex items-center justify-center mt-8">
            {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </div>
        </>
      )}
    </div>
  )
}
