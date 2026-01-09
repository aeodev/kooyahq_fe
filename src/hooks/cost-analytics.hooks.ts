import type { Socket } from 'socket.io-client'
import { SocketTimeEntriesEvents } from '@/utils/api.routes'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { fetchLiveData as fetchLiveDataService } from '@/services/cost-analytics.service'

// Debounce utility
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Registers socket event handlers for cost analytics updates.
 * Listens to time entry events (timer start/stop/pause/resume) and refreshes live cost data.
 */
export function registerCostAnalyticsHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: unknown[]) => void>
): void {
  // Debounced handler - batches rapid socket events (300ms debounce)
  const refreshLiveCostDebounced = debounce(async () => {
    const store = useCostAnalyticsStore.getState()
    // Only use silent update if we already have data (not initial load)
    if (store.liveData) {
      // Silent update - don't show loading state
      try {
        const data = await fetchLiveDataService()
        store.setLiveData(data)
        store.markAsLoaded()
      } catch (err) {
        // Silently fail for socket updates - don't show error state
        console.error('[Cost Analytics] Silent fetch failed:', err)
      }
    } else {
      // Initial load - use regular fetch with loading state
      store.setLiveLoading(true)
      store.setLiveError(null)
      try {
        const data = await fetchLiveDataService()
        store.setLiveData(data)
        store.setLiveLoading(false)
        store.markAsLoaded()
      } catch (err: unknown) {
        const error = err as { message?: string }
        store.setLiveError(error.message || 'Failed to fetch live cost data')
        store.setLiveLoading(false)
      }
    }
  }, 300)

  // Listen to all timer-related events that affect live costs
  const timerEvents = [
    SocketTimeEntriesEvents.TIMER_STARTED,
    SocketTimeEntriesEvents.TIMER_STOPPED,
    SocketTimeEntriesEvents.TIMER_PAUSED,
    SocketTimeEntriesEvents.TIMER_RESUMED,
  ]

  timerEvents.forEach((event) => {
    socket.on(event, refreshLiveCostDebounced)
    eventHandlers.set(`cost-analytics:${event}`, refreshLiveCostDebounced)
  })
}

/**
 * Unregisters socket event handlers for cost analytics.
 * Call this when the cost analytics page is unmounted.
 */
export function unregisterCostAnalyticsHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: unknown[]) => void>
): void {
  const timerEvents = [
    SocketTimeEntriesEvents.TIMER_STARTED,
    SocketTimeEntriesEvents.TIMER_STOPPED,
    SocketTimeEntriesEvents.TIMER_PAUSED,
    SocketTimeEntriesEvents.TIMER_RESUMED,
  ]

  timerEvents.forEach((event) => {
    const handler = eventHandlers.get(`cost-analytics:${event}`)
    if (handler) {
      socket.off(event, handler)
      eventHandlers.delete(`cost-analytics:${event}`)
    }
  })
}
