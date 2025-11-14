import { useEffect, useRef } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_PRESENCE } from '@/utils/api.routes'
import { usePresenceStore } from '@/stores/presence.store'
import { useSocketStore } from '@/stores/socket.store'
import type { PresenceUser } from '@/types/presence'

type PresenceSyncPayload = {
  users: PresenceUser[]
}

export function usePresenceChannel() {
  const socket = useSocketStore((state) => state.socket)
  const setUsers = usePresenceStore((state) => state.setUsers)
  const setSyncing = usePresenceStore((state) => state.setSyncing)

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      setSyncing(true)
      try {
        const response = await axiosInstance.get<{ status: string; data: PresenceUser[] }>(GET_PRESENCE())
        if (isMounted) {
          setUsers(response.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch presence snapshot', error)
      } finally {
        if (isMounted) {
          setSyncing(false)
        }
      }
    }

    bootstrap()

    if (!socket) {
      return () => {
        isMounted = false
      }
    }

    const handleSync = (payload: PresenceSyncPayload) => {
      setUsers(payload.users || [])
    }

    socket.on('presence:sync', handleSync)
    socket.emit('presence:request-sync')

    return () => {
      isMounted = false
      socket.off('presence:sync', handleSync)
    }
  }, [socket, setUsers, setSyncing])
}

export function useLiveLocationSharing() {
  const socket = useSocketStore((state) => state.socket)
  const connected = useSocketStore((state) => state.connected)
  const setPermissionDenied = usePresenceStore((state) => state.setPermissionDenied)
  const setGeolocationSupported = usePresenceStore((state) => state.setGeolocationSupported)
  const locationSharingEnabled = usePresenceStore((state) => state.locationSharingEnabled)
  const watchIdRef = useRef<number | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'geolocation' in navigator
    setGeolocationSupported(supported)
    if (!supported) return

    const stopWatching = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }

    if (!socket || !connected || !locationSharingEnabled) {
      stopWatching()
      return
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setPermissionDenied(false)
      const { latitude, longitude, accuracy } = position.coords
      if (socket.connected) {
        socket.emit('presence:update-location', {
          lat: latitude,
          lng: longitude,
          accuracy,
        })
      }
    }

    const options: PositionOptions = {
      enableHighAccuracy: false,
      maximumAge: 30000,
      timeout: 15000,
    }

    const handleError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        setPermissionDenied(true)
        stopWatching()
        return
      }
      
      // For POSITION_UNAVAILABLE or TIMEOUT, retry after a delay
      // This handles cases where macOS location services aren't ready yet
      if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
        if (retryTimeoutRef.current !== null) {
          clearTimeout(retryTimeoutRef.current)
        }
        retryTimeoutRef.current = setTimeout(() => {
          if (socket && connected && locationSharingEnabled) {
            navigator.geolocation.getCurrentPosition(
              handleSuccess,
              handleError,
              options
            )
          }
        }, 2000)
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSuccess(position)
        watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options)
      },
      (error) => {
        // Even if initial getCurrentPosition fails, set up watchPosition
        // (unless it's a permission denial) - this ensures monitoring continues
        // when location services become available
        if (error.code !== error.PERMISSION_DENIED) {
          watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options)
        }
        handleError(error)
      },
      options
    )

    return () => {
      stopWatching()
    }
  }, [socket, connected, locationSharingEnabled, setPermissionDenied, setGeolocationSupported])
}
