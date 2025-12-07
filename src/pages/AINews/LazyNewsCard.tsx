import { useState, useEffect } from 'react'
import { NewsCard } from './NewsCard'
import { useIntersectionObserver } from './useIntersectionObserver'
import { formatTimeAgo } from '@/utils/date'
import type { NewsItem } from '@/types/ai-news'

type LazyNewsCardProps = {
  item: NewsItem
}

export function LazyNewsCard({ item }: LazyNewsCardProps) {
  const { elementRef, isIntersecting } = useIntersectionObserver()
  const [hasRendered, setHasRendered] = useState(false)

  useEffect(() => {
    // Once rendered, keep it rendered to avoid flickering
    if (isIntersecting && !hasRendered) {
      setHasRendered(true)
    }
  }, [isIntersecting, hasRendered])

  return (
    <div ref={elementRef}>
      {hasRendered ? (
        <NewsCard item={item} formattedDate={formatTimeAgo(item.publishedAt)} />
      ) : (
        <div
          className="h-[400px] bg-muted/50 rounded-lg animate-pulse"
          aria-label="Loading news item"
        />
      )}
    </div>
  )
}
