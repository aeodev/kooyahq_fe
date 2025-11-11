import { useEffect } from 'react'
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
  const setPermissionDenied = usePresenceStore((state) => state.setPermissionDenied)
  const setGeolocationSupported = usePresenceStore((state) => state.setGeolocationSupported)

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'geolocation' in navigator
    setGeolocationSupported(supported)
    if (!supported) {
      return
    }

    if (!socket?.connected) {
      return
    }

    let watchId: number | null = null

    const handleSuccess = (position: GeolocationPosition) => {
      setPermissionDenied(false)
      const { latitude, longitude, accuracy } = position.coords
      socket.emit('presence:update-location', {
        lat: latitude,
        lng: longitude,
        accuracy,
      })
    }

    const handleError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        setPermissionDenied(true)
      }
    }

    try {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000,
      })
    } catch (error) {
      console.error('Unable to start geolocation watcher', error)
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [socket?.connected, socket, setPermissionDenied, setGeolocationSupported])
}
