import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import axiosInstance from '@/utils/axios.instance'
import { GET_AI_NEWS } from '@/utils/api.routes'
import type { NewsItem, NewsFilter } from '@/types/ai-news'
import { cn } from '@/utils/cn'
import { Loader2, Sparkles, Twitter, Newspaper, Filter, RefreshCw } from 'lucide-react'
import { LazyNewsCard } from './LazyNewsCard'
import { NewsCardSkeleton } from './NewsCardSkeleton'

const CACHE_KEY = 'ai-news-cache'
const CACHE_TIMESTAMP_KEY = 'ai-news-cache-timestamp'
const CACHE_DURATION = 1000 * 60 * 30 // 30 minutes

interface CachedData {
  items: NewsItem[]
  timestamp: number
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}

// Helper function to get cached news synchronously
const getCachedNewsSync = (): CachedData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10)
      if (age < CACHE_DURATION) {
        return {
          items: JSON.parse(cached),
          timestamp: parseInt(timestamp, 10),
        }
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error)
  }
  return null
}

export function AINews() {
  // Initialize with cached data if available to prevent flicker
  const cachedData = useMemo(() => getCachedNewsSync(), [])
  const [items, setItems] = useState<NewsItem[]>(cachedData?.items || [])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<NewsFilter>('all')
  const [hasMore, setHasMore] = useState(cachedData ? cachedData.items.length >= 50 : true)
  const observerTarget = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      loadNews()
    }
  }, [])

  const loadNews = async () => {
    // If we already have cached data displayed, fetch fresh data in background
    if (cachedData && items.length > 0) {
      // Silently update in background
      fetchNews(true, true)
    } else if (items.length === 0) {
      // No cache and no items, fetch immediately with loading state
      await fetchNews(true)
    }
  }

  const getCachedNews = (): CachedData | null => {
    return getCachedNewsSync()
  }

  const setCachedNews = (items: NewsItem[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(items))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
      console.error('Error setting cache:', error)
    }
  }

  const fetchNews = async (reset = false, silent = false) => {
    if (reset && !silent) {
      setLoading(true)
      setItems([])
    } else if (!silent) {
      setLoadingMore(true)
    }
    setError(null)
    
    // Get current items length before async operation
    const currentLength = items.length
    const offset = reset ? 0 : currentLength
    const limit = 50
    
    try {
      const response = await axiosInstance.get<{ 
        status: string
        data: NewsItem[]
        hasMore: boolean
        total: number
      }>(`${GET_AI_NEWS()}?limit=${limit}&offset=${offset}`)
      
      if (reset) {
        setItems(response.data.data)
        // Cache the first page of results
        setCachedNews(response.data.data)
      } else {
        setItems(prev => [...prev, ...response.data.data])
      }
      setHasMore(response.data.hasMore)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load AI news')
      // If there's an error and we have cached data, don't clear it
      if (silent && items.length === 0) {
        const cached = getCachedNews()
        if (cached) {
          setItems(cached.items)
        }
      }
    } finally {
      if (!silent) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchNews(false)
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, loading])

  const filteredItems = useMemo(() => {
    let filtered: NewsItem[]
    
    if (filter === 'all') filtered = items
    else if (filter === 'news') filtered = items.filter((item) => item.type === 'news')
    else if (filter === 'tweets') filtered = items.filter((item) => item.type === 'tweet')
    else filtered = items.filter((item) => item.source === filter)

    // Pre-calculate formatted dates to avoid recalculating on every render
    return filtered.map((item) => ({
      ...item,
      formattedDate: formatTimeAgo(item.publishedAt),
    }))
  }, [items, filter])

  const filters: { value: NewsFilter; label: string; icon?: any }[] = [
    { value: 'all', label: 'All', icon: Filter },
    { value: 'news', label: 'News', icon: Newspaper },
    { value: 'tweets', label: 'Tweets', icon: Twitter },
    { value: 'openai', label: 'OpenAI' },
    { value: 'techcrunch', label: 'TechCrunch' },
    { value: 'sama', label: 'Sam Altman' },
    { value: 'chetaslua', label: 'Chetaslua' },
  ]

  if (loading && items.length === 0 && !cachedData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              AI News
            </h1>
            <p className="text-muted-foreground mt-1">
              Latest AI news and insights from top sources
            </p>
          </div>
          <Button variant="outline" size="icon" disabled title="Loading">
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        </div>

        {/* Skeleton Loading */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI News
          </h1>
          <p className="text-muted-foreground mt-1">
            Latest AI news and insights from top sources
          </p>
        </div>
        <Button 
          onClick={() => {
            // Clear cache and force refresh
            localStorage.removeItem(CACHE_KEY)
            localStorage.removeItem(CACHE_TIMESTAMP_KEY)
            fetchNews(true)
          }} 
          variant="outline" 
          size="icon"
          disabled={loading}
          title="Refresh"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const Icon = f.icon
          return (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
              className={cn(
                'gap-2',
                filter === f.value && 'bg-primary text-primary-foreground'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {f.label}
            </Button>
          )
        })}
      </div>

      {/* News Feed */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No news items found. Try refreshing or selecting a different filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <LazyNewsCard key={item.id} item={item} />
            ))}
          </div>
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            {loadingMore && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>
        </>
      )}
    </div>
  )
}

