import type { Socket } from 'socket.io-client'
import { SocketTimeEntriesEvents } from '@/utils/api.routes'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'

/**
 * Registers socket event handlers for cost analytics updates.
 * Listens to time entry events (timer start/stop/pause/resume) and refreshes live cost data.
 */
export function registerCostAnalyticsHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: unknown[]) => void>
): void {
  // Handler to refresh live cost data when any timer event occurs
  const refreshLiveCost = () => {
    const store = useCostAnalyticsStore.getState()
    store.fetchLiveData()
  }

  // Listen to all timer-related events that affect live costs
  const timerEvents = [
    SocketTimeEntriesEvents.TIMER_STARTED,
    SocketTimeEntriesEvents.TIMER_STOPPED,
    SocketTimeEntriesEvents.TIMER_PAUSED,
    SocketTimeEntriesEvents.TIMER_RESUMED,
  ]

  timerEvents.forEach((event) => {
    socket.on(event, refreshLiveCost)
    eventHandlers.set(`cost-analytics:${event}`, refreshLiveCost)
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
