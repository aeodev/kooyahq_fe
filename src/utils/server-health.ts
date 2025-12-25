import { BASE_URL } from '@/utils/api.routes'

// Storage key for persisting server availability state
const STORAGE_KEY = 'kooyahq.server-health'
// Storage key for pending emergency stop (timer ID that needs to be stopped on server)
const PENDING_STOP_KEY = 'kooyahq.pending-timer-stop'

type ServerHealthState = {
  lastSuccessfulPing: number | null
  lastFailedPing: number | null
  consecutiveFailures: number
  serverAvailable: boolean
}

const DEFAULT_STATE: ServerHealthState = {
  lastSuccessfulPing: null,
  lastFailedPing: null,
  consecutiveFailures: 0,
  serverAvailable: true,
}

/**
 * Get persisted server health state from localStorage
 */
export function getServerHealthState(): ServerHealthState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_STATE
  }
}

/**
 * Persist server health state to localStorage
 */
export function setServerHealthState(state: Partial<ServerHealthState>): void {
  if (typeof window === 'undefined') return
  try {
    const current = getServerHealthState()
    const updated = { ...current, ...state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear server health state (e.g., on logout)
 */
export function clearServerHealthState(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Perform a health check ping to the server
 * Uses a short timeout to quickly detect server unavailability
 */
export async function pingServer(timeoutMs: number = 5000): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Use a simple fetch to avoid axios interceptors that might cause issues
    // Health endpoint is at /api/health
    const healthUrl = BASE_URL + '/health'
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      // Don't send credentials for health check - faster and avoids CORS issues
      credentials: 'omit',
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    clearTimeout(timeoutId)
    return false
  }
}

/**
 * Record a successful ping
 */
export function recordPingSuccess(): void {
  setServerHealthState({
    lastSuccessfulPing: Date.now(),
    consecutiveFailures: 0,
    serverAvailable: true,
  })
}

/**
 * Record a failed ping
 */
export function recordPingFailure(): void {
  const state = getServerHealthState()
  setServerHealthState({
    lastFailedPing: Date.now(),
    consecutiveFailures: state.consecutiveFailures + 1,
    serverAvailable: false,
  })
}

/**
 * Check if we should auto-stop the timer based on server availability
 * Returns true if server has been unreachable for longer than threshold
 */
export function shouldAutoStopTimer(thresholdMs: number = 30000): boolean {
  const state = getServerHealthState()
  
  // Server is available, don't stop
  if (state.serverAvailable) {
    return false
  }
  
  // No failure recorded yet
  if (!state.lastFailedPing) {
    return false
  }
  
  // Calculate how long the server has been down
  const downDuration = Date.now() - state.lastFailedPing
  
  // Adjust for consecutive failures (each failure is ~5 seconds apart)
  // If we have N consecutive failures over 5-second intervals, server has been down for ~N*5 seconds
  const estimatedDowntime = Math.max(
    downDuration,
    (state.consecutiveFailures - 1) * 5000 // First failure starts the clock
  )
  
  return estimatedDowntime >= thresholdMs
}

/**
 * Get time until auto-stop would trigger
 * Returns milliseconds remaining, or 0 if should stop now, or null if server is available
 */
export function getTimeUntilAutoStop(thresholdMs: number = 30000): number | null {
  const state = getServerHealthState()
  
  if (state.serverAvailable) {
    return null
  }
  
  if (!state.lastFailedPing) {
    return thresholdMs
  }
  
  const downDuration = Date.now() - state.lastFailedPing
  const remaining = thresholdMs - downDuration
  
  return Math.max(0, remaining)
}

/**
 * Mark a timer ID as needing to be stopped on the server
 * This is used when emergency stop happens while server is down
 */
export function setPendingTimerStop(timerId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PENDING_STOP_KEY, JSON.stringify({
      timerId,
      timestamp: Date.now(),
    }))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the pending timer stop info
 */
export function getPendingTimerStop(): { timerId: string; timestamp: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(PENDING_STOP_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Clear the pending timer stop
 */
export function clearPendingTimerStop(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PENDING_STOP_KEY)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a timer ID has a pending stop
 */
export function hasPendingStop(timerId: string): boolean {
  const pending = getPendingTimerStop()
  return pending?.timerId === timerId
}

