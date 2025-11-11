import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Pause, Play, ShieldAlert } from 'lucide-react'
import type { GlobeInstance } from 'globe.gl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePresenceStore } from '@/stores/presence.store'
import { useAuthStore } from '@/stores/auth.store'
import type { PresenceUser } from '@/types/presence'
import { useResizeObserver } from '@/hooks/useResizeObserver'

const Globe = lazy(() => import('react-globe.gl'))

type Marker = PresenceUser & {
  color: string
  size: number
}

// High-quality texture URLs
const EARTH_TEXTURE = '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const EARTH_BUMP = '//unpkg.com/three-globe/example/img/earth-topology.png'
const EARTH_NIGHT = '//unpkg.com/three-globe/example/img/night-sky.png'

// Centered view configuration - lat: 0, lng: 0 centers the globe perfectly
// Altitude of 2.2 provides optimal perspective without being too close or far
const DEFAULT_VIEW = { lat: 0, lng: 0, altitude: 2.2 }

// Controls configuration constants for better management
const CONTROLS_CONFIG = {
  minDistance: 101, // ~1.01 globe radii - prevents getting too close
  maxDistance: 400, // ~4 globe radii - prevents zooming too far out
  autoRotateSpeed: 0.5, // Slower, more elegant rotation
  enableDamping: true, // Smooth camera movements
  dampingFactor: 0.05,
} as const

export function EarthPresence() {
  const users = usePresenceStore((state) => state.users)
  const syncing = usePresenceStore((state) => state.syncing)
  const permissionDenied = usePresenceStore((state) => state.permissionDenied)
  const geolocationSupported = usePresenceStore((state) => state.geolocationSupported)
  const currentUserId = useAuthStore((state) => state.user?.id)

  const [isClient, setIsClient] = useState(false)
  const [rotationState, setRotationState] = useState<'idle' | 'rotating'>('idle')
  const globeRef = useRef<GlobeInstance | null>(null)
  const [containerRef, containerSize] = useResizeObserver<HTMLDivElement>()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Enhanced controls configuration with better settings
  useEffect(() => {
    const controls = globeRef.current?.controls?.()
    if (!controls) return

    controls.autoRotate = rotationState === 'rotating'
    controls.autoRotateSpeed = CONTROLS_CONFIG.autoRotateSpeed
    controls.enableDamping = CONTROLS_CONFIG.enableDamping
    controls.dampingFactor = CONTROLS_CONFIG.dampingFactor
    controls.enablePan = false // Disable panning for cleaner interaction
  }, [rotationState])

  const alignView = useCallback(
    (transitionMs = 0) => {
      if (!globeRef.current) return

      const controls = globeRef.current.controls?.()
      if (controls) {
        controls.enabled = true
        controls.enableZoom = true
        controls.minDistance = CONTROLS_CONFIG.minDistance
        controls.maxDistance = CONTROLS_CONFIG.maxDistance
        controls.enablePan = false
        controls.target.set(0, 0, 0)
        controls.update()
      }

      globeRef.current.pointOfView(DEFAULT_VIEW, transitionMs)
    },
    [],
  )

  const markers = useMemo<Marker[]>(() => {
    return users
      .filter((user) => Number.isFinite(user.lat) && Number.isFinite(user.lng))
      .map((user) => ({
        ...user,
        color: user.isActive ? '#22c55e' : '#94a3b8',
        size: user.id === currentUserId ? 1.8 : 1.1,
      }))
  }, [users, currentUserId])

  const activeCount = markers.filter((marker) => marker.isActive).length

  // Smoothly transition to centered view when markers change
  useEffect(() => {
    alignView(1200)
  }, [alignView, markers.length])

  // Initial alignment on client mount
  useEffect(() => {
    if (isClient) {
      alignView(0)
    }
  }, [alignView, isClient])

  const handleStartOrbit = () => setRotationState('rotating')
  const handleStopOrbit = () => setRotationState('idle')

  const handleGlobeClick = useCallback(() => {
    handleStartOrbit()
    alignView(800)
  }, [alignView])

  return (
    <Card className="relative h-[420px] overflow-hidden border-border/70 bg-gradient-to-b from-[#050d1b] via-[#060c19] to-[#0a0a14] text-white shadow-xl">
      {/* Header Section */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Live presence</p>
          <p className="text-base font-semibold text-white">
            {activeCount} active {activeCount === 1 ? 'teammate' : 'teammates'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <div className="hidden items-center gap-2 text-xs font-medium text-white/80 sm:flex">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </div>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={rotationState === 'rotating' ? handleStopOrbit : handleStartOrbit}
          >
            {rotationState === 'rotating' ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                Stop orbit
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Start orbit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Globe Container */}
      <div ref={containerRef} className="absolute inset-0">
        {isClient ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-white/80">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Initializing globe
              </div>
            }
          >
            <div className="h-full w-full [&>canvas]:!h-full [&>canvas]:!w-full">
              {containerSize.width > 0 && containerSize.height > 0 && (
                <Globe
                  ref={globeRef as any}
                  width={containerSize.width}
                  height={containerSize.height}
                  globeImageUrl={EARTH_TEXTURE}
                  bumpImageUrl={EARTH_BUMP}
                  backgroundImageUrl={EARTH_NIGHT}
                  backgroundColor="rgba(0,0,0,0)"
                  showAtmosphere
                  atmosphereAltitude={0.25}
                  atmosphereColor="#60a5fa"
                  labelsData={markers}
                  labelLat={(marker) => (marker as Marker).lat}
                  labelLng={(marker) => (marker as Marker).lng}
                  labelText={(marker) => (marker as Marker).name}
                  labelSize={(marker) => 1.2 * (marker as Marker).size}
                  labelColor={(marker) => (marker as Marker).color}
                  labelDotRadius={(marker) => 0.35 * (marker as Marker).size}
                  labelAltitude={0.01}
                  enablePointerInteraction
                  onGlobeClick={handleGlobeClick}
                  onGlobeReady={() => alignView(0)}
                />
              )}
            </div>
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center text-white/70">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing globe
          </div>
        )}
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#05060f] to-transparent" />

      {/* Instruction Banner */}
      {rotationState === 'idle' && (
        <div className="pointer-events-none absolute inset-x-4 bottom-16 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs font-medium text-white/80 backdrop-blur">
          Click the globe or use the Start orbit control to animate rotation.
        </div>
      )}

      {/* Geolocation Warning Banners */}
      {!geolocationSupported && (
        <Banner message="Your browser does not expose geolocation APIs, so we can only display other teammates." />
      )}
      {geolocationSupported && permissionDenied && (
        <Banner message="Enable location sharing in your browser so teammates can see you on the globe." />
      )}
    </Card>
  )
}

function Banner({ message }: { message: string }) {
  return (
    <div className="pointer-events-auto absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur-md">
      <ShieldAlert className="h-4 w-4 text-white" />
      <p className="text-white/90">{message}</p>
    </div>
  )
}