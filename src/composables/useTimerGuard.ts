import { useEffect, useRef, useCallback } from 'react'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import {
  pingServer,
  recordPingSuccess,
  recordPingFailure,
  getServerHealthState,
  shouldAutoStopTimer,
  setServerHealthState,
  getPendingTimerStop,
} from '@/utils/server-health'

// Configuration
const HEALTH_CHECK_INTERVAL = 5000 // Check every 5 seconds
const AUTO_STOP_THRESHOLD = 30000 // Auto-stop after 30 seconds of server unavailability
const PING_TIMEOUT = 5000 // 5 second timeout for health check

/**
 * Hook to monitor server availability and auto-stop timer when server becomes unreachable.
 * 
 * Uses multiple detection mechanisms:
 * 1. Primary: HTTP health check every 5 seconds
 * 2. Secondary: Socket connection state monitoring
 * 3. Tertiary: Browser online/offline events
 * 4. Quaternary: Tab visibility changes (to sync state on tab focus)
 * 
 * Auto-stops timer after 30 seconds of consecutive server unavailability.
 */
export function useTimerGuard() {
  const emergencyStopTimer = useTimeEntryStore((state) => state.emergencyStopTimer)
  const completePendingStop = useTimeEntryStore((state) => state.completePendingStop)
  const socketConnected = useSocketStore((state) => state.connected)
  const user = useAuthStore((state) => state.user)
  
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isStoppingRef = useRef(false)
  const lastSocketStateRef = useRef(socketConnected)
  const isCompletingPendingStopRef = useRef(false)

  /**
   * Perform emergency stop of the timer
   */
  const performEmergencyStop = useCallback(async () => {
    if (isStoppingRef.current) return
    
    const timer = useTimeEntryStore.getState().activeTimer
    if (!timer) return
    
    isStoppingRef.current = true
    
    console.warn('[TimerGuard] Server unreachable for too long, auto-stopping timer')
    
    try {
      // Use emergency stop which handles the case where server is unavailable
      await emergencyStopTimer()
    } finally {
      isStoppingRef.current = false
    }
  }, [emergencyStopTimer])

  /**
   * Complete any pending timer stop on the server
   */
  const tryCompletePendingStop = useCallback(async () => {
    if (isCompletingPendingStopRef.current) return
    
    const pendingStop = getPendingTimerStop()
    if (!pendingStop) return
    
    isCompletingPendingStopRef.current = true
    
    console.log('[TimerGuard] Server is back - completing pending timer stop')
    
    try {
      await completePendingStop()
    } finally {
      isCompletingPendingStopRef.current = false
    }
  }, [completePendingStop])

  /**
   * Check server health and handle auto-stop logic
   */
  const checkServerHealth = useCallback(async () => {
    const isServerUp = await pingServer(PING_TIMEOUT)
    
    if (isServerUp) {
      recordPingSuccess()
      
      // Check if we have a pending stop that needs to be completed
      const pendingStop = getPendingTimerStop()
      if (pendingStop) {
        await tryCompletePendingStop()
        return
      }
    } else {
      // Only track failures and check auto-stop if there's an active timer
      const timer = useTimeEntryStore.getState().activeTimer
      if (!timer) {
        // No timer active, but check for pending stop
        const pendingStop = getPendingTimerStop()
        if (!pendingStop) {
          // Reset state when no timer and no pending stop
          setServerHealthState({ serverAvailable: true, consecutiveFailures: 0 })
        }
        return
      }
      
      recordPingFailure()
      
      // Check if we should auto-stop
      if (shouldAutoStopTimer(AUTO_STOP_THRESHOLD)) {
        await performEmergencyStop()
      }
    }
  }, [performEmergencyStop, tryCompletePendingStop])

  /**
   * Handle socket disconnect as a signal of server unavailability
   */
  const handleSocketDisconnect = useCallback(() => {
    const timer = useTimeEntryStore.getState().activeTimer
    if (!timer) return
    
    const state = getServerHealthState()
    
    // If socket just disconnected and we haven't recorded a recent failure, record one
    if (state.serverAvailable || !state.lastFailedPing) {
      recordPingFailure()
    }
  }, [])

  /**
   * Handle socket reconnect as a signal of server availability
   */
  const handleSocketReconnect = useCallback(() => {
    recordPingSuccess()
    
    // Complete any pending stop when socket reconnects
    tryCompletePendingStop()
  }, [tryCompletePendingStop])

  /**
   * Handle browser online/offline events
   */
  const handleOnline = useCallback(() => {
    // When browser comes online, do an immediate health check
    checkServerHealth()
  }, [checkServerHealth])

  const handleOffline = useCallback(() => {
    const timer = useTimeEntryStore.getState().activeTimer
    if (!timer) return
    
    // Record as a failure when browser goes offline
    recordPingFailure()
  }, [])

  /**
   * Handle tab visibility changes
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // When tab becomes visible, do an immediate health check
      // This catches cases where server went down while tab was in background
      const timer = useTimeEntryStore.getState().activeTimer
      if (timer) {
        checkServerHealth()
        
        // Also check if we should have auto-stopped while tab was hidden
        if (shouldAutoStopTimer(AUTO_STOP_THRESHOLD)) {
          performEmergencyStop()
        }
      }
    }
  }, [checkServerHealth, performEmergencyStop])

  // Monitor socket connection state changes
  useEffect(() => {
    if (lastSocketStateRef.current && !socketConnected) {
      // Socket just disconnected
      handleSocketDisconnect()
    } else if (!lastSocketStateRef.current && socketConnected) {
      // Socket just reconnected
      handleSocketReconnect()
    }
    lastSocketStateRef.current = socketConnected
  }, [socketConnected, handleSocketDisconnect, handleSocketReconnect])

  // Set up health check interval
  useEffect(() => {
    // Only run health checks if user is authenticated
    if (!user) {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
      return
    }

    // Do an immediate check on mount
    checkServerHealth()
    
    // Set up periodic health checks
    healthCheckIntervalRef.current = setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL)
    
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
    }
  }, [user, checkServerHealth])

  // Set up browser event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [handleOnline, handleOffline, handleVisibilityChange])

  // Check for auto-stop on initial load
  // This catches cases where app was closed while server was down
  useEffect(() => {
    if (!user) return
    
    const checkOnLoad = async () => {
      // First, check if there's a pending stop from a previous session
      const pendingStop = getPendingTimerStop()
      if (pendingStop) {
        console.log('[TimerGuard] Found pending timer stop from previous session')
        // Try to complete it
        await tryCompletePendingStop()
        return
      }
      
      const timer = useTimeEntryStore.getState().activeTimer
      if (!timer) return
      
      const state = getServerHealthState()
      
      // If server was marked as unavailable before app closed,
      // check if threshold was exceeded
      if (!state.serverAvailable && state.lastFailedPing) {
        const downDuration = Date.now() - state.lastFailedPing
        
        // If server was down for longer than threshold, auto-stop immediately
        if (downDuration >= AUTO_STOP_THRESHOLD) {
          await performEmergencyStop()
          return
        }
      }
      
      // Otherwise, do a fresh health check
      await checkServerHealth()
    }
    
    // Small delay to ensure store is hydrated
    const timeoutId = setTimeout(checkOnLoad, 100)
    
    return () => clearTimeout(timeoutId)
  }, [user, checkServerHealth, performEmergencyStop, tryCompletePendingStop])

  // Return current server health state for debugging/display purposes
  return {
    serverHealthState: getServerHealthState(),
    checkServerHealth,
  }
}
