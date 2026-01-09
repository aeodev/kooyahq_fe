import { useEffect, useRef, useCallback } from 'react'
import { useVisibility } from './useVisibility'

interface UsePollingOptions {
  /** Callback function to execute on each poll */
  callback: () => void | Promise<void>
  /** Polling interval in milliseconds */
  interval: number
  /** Whether polling is enabled */
  enabled?: boolean
  /** Whether to pause when tab is hidden */
  pauseOnHidden?: boolean
}

interface UsePollingReturn {
  /** Start polling */
  start: () => void
  /** Stop polling */
  stop: () => void
  /** Whether currently polling */
  isPolling: boolean
}

/**
 * Generic polling hook that respects visibility state
 * Automatically pauses when tab is hidden if pauseOnHidden is true
 */
export function usePolling({
  callback,
  interval,
  enabled = true,
  pauseOnHidden = true,
}: UsePollingOptions): UsePollingReturn {
  const isVisible = useVisibility()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callbackRef = useRef(callback)
  const isPollingRef = useRef(false)

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isPollingRef.current = false
  }, [])

  const start = useCallback(() => {
    stop() // Clear any existing interval
    
    if (!enabled) return
    
    // Check if we should pause due to visibility
    if (pauseOnHidden && !isVisible) return

    isPollingRef.current = true
    
    // Execute immediately
    callbackRef.current()
    
    // Set up interval
    intervalRef.current = setInterval(() => {
      // Check visibility before executing
      if (pauseOnHidden && !isVisible) {
        return
      }
      callbackRef.current()
    }, interval)
  }, [enabled, interval, isVisible, pauseOnHidden, stop])

  // Handle visibility changes
  useEffect(() => {
    if (!enabled) {
      stop()
      return
    }

    if (pauseOnHidden) {
      if (isVisible) {
        start()
      } else {
        stop()
      }
    } else {
      start()
    }

    return () => {
      stop()
    }
  }, [enabled, isVisible, pauseOnHidden, start, stop])

  return {
    start,
    stop,
    isPolling: isPollingRef.current,
  }
}
