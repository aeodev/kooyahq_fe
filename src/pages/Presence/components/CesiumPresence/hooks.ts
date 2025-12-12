import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as Cesium from 'cesium'
import { usePresenceStore } from '@/stores/presence.store'
import { useAuthStore } from '@/stores/auth.store'
import type { PresenceUser } from '@/types/presence'
import { getFallbackAvatar, createSimpleAvatar, preloadImage } from './utils'
import axiosInstance from '@/utils/axios.instance'
import { GET_CESIUM_TOKEN } from '@/utils/api.routes'

const viewerRef = { current: null as Cesium.Viewer | null }

export function setCesiumViewer(viewer: Cesium.Viewer) {
  viewerRef.current = viewer
}

export function useCesiumIonToken() {
  const [ionToken, setIonToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchToken = async () => {
      try {
        const response = await axiosInstance.get<{ status: string; data: { token: string } }>(GET_CESIUM_TOKEN())
        if (cancelled) return

        const token = response.data.data.token ?? ''
        setIonToken(token || null)
        Cesium.Ion.defaultAccessToken = token
      } catch (_error) {
        if (cancelled) return
        setError('Failed to load Cesium token')
        setIonToken(null)
        Cesium.Ion.defaultAccessToken = ''
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchToken()

    return () => {
      cancelled = true
    }
  }, [])

  return { ionToken, loading, error }
}

export function useCesiumViewer(options?: { ionToken?: string | null; onReady?: (viewer: Cesium.Viewer) => void }) {
  const { ionToken, onReady } = options ?? {}
  const [cameraHeight, setCameraHeight] = useState<number>(20000000)
  const users = usePresenceStore((state) => state.users)
  const initializedRef = useRef(false)
  const debounceTimerRef = useRef<number | null>(null)

  useEffect(() => {
    ;(window as any).CESIUM_BASE_URL = (window as any).CESIUM_BASE_URL || '/cesium'
  }, [])

  const onViewerReady = useCallback((v?: Cesium.Viewer) => {
    if (!v || initializedRef.current) return
    initializedRef.current = true
    setCesiumViewer(v)

    v.scene.screenSpaceCameraController.minimumZoomDistance = 10.0
    v.scene.screenSpaceCameraController.maximumZoomDistance = 20000000.0

    if (!ionToken) {
      v.imageryLayers.removeAll()
      v.imageryLayers.addImageryProvider(
        new Cesium.OpenStreetMapImageryProvider({ url: 'https://a.tile.openstreetmap.org/' })
      )
    }

    const updateCameraHeight = () => {
      const newHeight = v.camera.positionCartographic.height
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = window.setTimeout(() => {
        setCameraHeight(newHeight)
      }, 150)
    }
    
    v.camera.changed.addEventListener(updateCameraHeight)
    updateCameraHeight()

    setTimeout(() => {
      if (v && users.length > 0) {
        const firstUser = users.find((u) => u.lat && u.lng && u.isActive)
        if (firstUser) {
          v.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(firstUser.lng, firstUser.lat, 2000000),
          })
        }
      }
    }, 1000)

    onReady?.(v)
  }, [ionToken, users, onReady])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return { cameraHeight, onViewerReady }
}

export function getCesiumViewer(): Cesium.Viewer | null {
  return viewerRef.current
}

export function useUserAvatars(users: PresenceUser[]) {
  const currentUser = useAuthStore((state) => state.user)
  const [validatedAvatars, setValidatedAvatars] = useState<Map<string, string>>(new Map())

  const allUsers = useMemo(() => {
    return users.filter((u) => Number.isFinite(u.lat) && Number.isFinite(u.lng) && u.isActive)
  }, [users])

  useEffect(() => {
    const loadImages = async () => {
      const loadPromises = allUsers.map(async (user) => {
        let avatar: string
        if (!user.profilePic || user.profilePic === 'undefined' || user.profilePic.trim() === '') {
          avatar = getFallbackAvatar(user.isActive ? '#22c55e' : '#94a3b8', user.name)
        } else {
          avatar = await preloadImage(user.profilePic)
        }
        
        const borderColor = user.id === currentUser?.id ? '#fbbf24' : (user.isActive ? '#22c55e' : '#94a3b8')
        const enhanced = await createSimpleAvatar(avatar, borderColor, 28)
        return { userId: user.id, avatar: enhanced }
      })

      const results = await Promise.all(loadPromises)
      const newAvatars = new Map<string, string>()
      results.forEach(({ userId, avatar }) => {
        newAvatars.set(userId, avatar)
      })
      setValidatedAvatars(newAvatars)
    }

    if (allUsers.length > 0) {
      void loadImages()
    }
  }, [allUsers, currentUser?.id])

  return { validatedAvatars, allUsers }
}

export function useClustering(allUsers: PresenceUser[], validatedAvatars: Map<string, string>, cameraHeight: number, currentUserId?: string) {
  return useMemo(() => {
    const pinData = allUsers.map((user) => {
      const avatar = validatedAvatars.get(user.id)
      const fallback = getFallbackAvatar(user.isActive ? '#22c55e' : '#94a3b8', user.name)
      return {
        id: user.id,
        name: user.name ?? 'User',
        lon: user.lng,
        lat: user.lat,
        avatar: avatar || fallback,
        isCurrentUser: user.id === currentUserId,
        isActive: user.isActive,
      }
    })
    
    // Simple distance-based clustering
    const clusterDistance = cameraHeight > 5000000 ? 0.1 : 0.01
    const shouldCluster = cameraHeight > 2000000
    
    if (!shouldCluster) {
      return { clusters: [], individualPins: pinData }
    }
    
    const clusters: Array<{ lat: number; lon: number; count: number; users: typeof pinData }> = []
    const processed = new Set<string>()
    const individualPins: typeof pinData = []
    
    pinData.forEach((pin) => {
      if (processed.has(pin.id)) return
      
      const nearby = pinData.filter((other) => {
        if (processed.has(other.id) || pin.id === other.id) return false
        const latDiff = Math.abs(pin.lat - other.lat)
        const lonDiff = Math.abs(pin.lon - other.lon)
        return latDiff < clusterDistance && lonDiff < clusterDistance
      })
      
      if (nearby.length > 0) {
        const clusterUsers = [pin, ...nearby]
        const avgLat = clusterUsers.reduce((sum, p) => sum + p.lat, 0) / clusterUsers.length
        const avgLon = clusterUsers.reduce((sum, p) => sum + p.lon, 0) / clusterUsers.length
        
        clusters.push({
          lat: avgLat,
          lon: avgLon,
          count: clusterUsers.length,
          users: clusterUsers,
        })
        
        clusterUsers.forEach((p) => processed.add(p.id))
      } else {
        // No nearby pins, this is an individual pin
        individualPins.push(pin)
        processed.add(pin.id)
      }
    })
    
    return { clusters, individualPins }
  }, [allUsers, validatedAvatars, currentUserId, cameraHeight])
}
