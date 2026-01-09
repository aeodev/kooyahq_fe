import type { Socket } from 'socket.io-client'
import { SocketTimeEntriesEvents } from '@/utils/api.routes'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'

// Debounce utility
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
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
  const refreshLiveCostDebounced = debounce(() => {
    const currentStore = useCostAnalyticsStore.getState()
    // Only use silent fetch if we already have data (not initial load)
    if (currentStore.liveData) {
      currentStore.fetchLiveDataSilent()
    } else {
      // Initial load - use regular fetch
      currentStore.fetchLiveData()
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
