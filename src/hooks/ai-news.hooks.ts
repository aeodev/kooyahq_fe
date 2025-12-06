import { useEffect, useRef } from 'react'
import { useAINewsStore } from '@/stores/ai-news.store'

const BACKGROUND_REFRESH_MS = 5 * 60 * 1000 // 5 minutes

export function useAINews() {
  const store = useAINewsStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initial fetch
  useEffect(() => {
    if (store.items.length === 0 && !store.loading) {
      store.fetchNews(true)
    }
  }, [])

  // Background refresh interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      store.refreshBackground()
    }, BACKGROUND_REFRESH_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return store
}
