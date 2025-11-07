import { useState, useEffect } from 'react'
import { NewsCard } from './NewsCard'
import { useIntersectionObserver } from './useIntersectionObserver'
import type { NewsItem } from '@/types/ai-news'

type LazyNewsCardProps = {
  item: NewsItem & { formattedDate: string }
}

export function LazyNewsCard({ item }: LazyNewsCardProps) {
  const { elementRef, isIntersecting } = useIntersectionObserver()
  const [hasRendered, setHasRendered] = useState(false)

  useEffect(() => {
    if (isIntersecting && !hasRendered) {
      setHasRendered(true)
    }
  }, [isIntersecting, hasRendered])

  return (
    <div ref={elementRef}>
      {hasRendered ? (
        <NewsCard item={item} />
      ) : (
        <div className="h-[200px] bg-muted/50 rounded-lg animate-pulse mb-4" aria-label="Loading news item" />
      )}
    </div>
  )
}

