import { useRef, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { Participant } from '@/stores/meet.store'
import { cn } from '@/utils/cn'
import { useVideoPlayback } from '@/composables/meet/useVideoPlayback'
import { useAudioPlayback } from '@/composables/meet/useAudioPlayback'

interface VideoTileProps {
  participant: Participant
  stream: MediaStream | null
  isLocal?: boolean
  isMirrored?: boolean
}

export function VideoTile({ participant, stream, isLocal = false, isMirrored = false }: VideoTileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((state) => state.user)

  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  
  // Pinch zoom state
  const lastTouchDistanceRef = useRef<number | null>(null)
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)

  // Use reusable playback hooks
  const { videoRef, hasVideoTrack } = useVideoPlayback({
    stream,
    isMirrored: isLocal && isMirrored,
    muted: isLocal,
  })

  const { audioRef } = useAudioPlayback({
    stream: isLocal ? null : stream,
    muted: false,
  })


  useEffect(() => {
    if (!participant.isScreenSharing) {
      setScale(1)
      setTranslateX(0)
      setTranslateY(0)
    }
  }, [participant.isScreenSharing])

  useEffect(() => {
    if (!participant.isScreenSharing || !containerRef.current) return

    const container = containerRef.current
    let isPinching = false

    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
      if (touches.length < 2) return { x: 0, y: 0 }
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        isPinching = true
        lastTouchDistanceRef.current = getTouchDistance(e.touches)
        const rect = container.getBoundingClientRect()
        const center = getTouchCenter(e.touches)
        lastTouchCenterRef.current = {
          x: center.x - rect.left,
          y: center.y - rect.top,
        }
        panStartRef.current = null
      } else if (e.touches.length === 1 && scale > 1) {
        // Single touch pan when zoomed
        panStartRef.current = {
          x: e.touches[0].clientX - translateX,
          y: e.touches[0].clientY - translateY,
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault()
        const currentDistance = getTouchDistance(e.touches)
        const lastDistance = lastTouchDistanceRef.current

        if (lastDistance && lastDistance > 0) {
          const scaleChange = currentDistance / lastDistance
          const newScale = Math.max(0.5, Math.min(3, scale * scaleChange))
          setScale(newScale)

          // Adjust translation to keep pinch center in place
          if (lastTouchCenterRef.current) {
            const rect = container.getBoundingClientRect()
            const currentCenter = getTouchCenter(e.touches)
            const centerX = currentCenter.x - rect.left
            const centerY = currentCenter.y - rect.top

            setTranslateX((prev) => {
              const deltaX = centerX - lastTouchCenterRef.current!.x
              return prev + deltaX * (1 - scaleChange)
            })
            setTranslateY((prev) => {
              const deltaY = centerY - lastTouchCenterRef.current!.y
              return prev + deltaY * (1 - scaleChange)
            })
          }

          lastTouchDistanceRef.current = currentDistance
        }
      } else if (e.touches.length === 1 && panStartRef.current && scale > 1) {
        // Pan when zoomed
        e.preventDefault()
        setTranslateX(e.touches[0].clientX - panStartRef.current.x)
        setTranslateY(e.touches[0].clientY - panStartRef.current.y)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinching = false
        lastTouchDistanceRef.current = null
        lastTouchCenterRef.current = null
        panStartRef.current = null
      }
    }

    // Double tap to reset zoom
    let lastTapTime = 0
    const handleDoubleTap = () => {
      const currentTime = Date.now()
      if (currentTime - lastTapTime < 300) {
        setScale(1)
        setTranslateX(0)
        setTranslateY(0)
      }
      lastTapTime = currentTime
    }

    container.addEventListener('touchstart', handleTouchStart)
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchend', handleDoubleTap)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchend', handleDoubleTap)
    }
  }, [participant.isScreenSharing, scale, translateX, translateY])


  const displayName = participant.userName || 'Unknown User'
  const isCurrentUser = isLocal || participant.userId === user?.id
  // Show video only if participant says video is enabled AND stream has enabled video tracks
  // Show profile if video is disabled OR no video tracks available
  const showVideo = participant.isVideoEnabled && hasVideoTrack
  const showProfile = !showVideo

  // Get profile picture - prefer participant's profilePic, fallback to current user's
  const profilePic = participant.profilePic || (isCurrentUser ? user?.profilePic : undefined)

  const isScreenShare = participant.isScreenSharing
  const videoStyle = isScreenShare && scale !== 1
    ? {
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        transformOrigin: 'center center',
        transition: 'none',
      }
    : undefined

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-gray-900 rounded-lg min-h-0",
        isScreenShare ? "overflow-auto touch-pan-y touch-pan-x" : "overflow-hidden"
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isCurrentUser}
        style={videoStyle}
        className={cn(
          'w-full h-full',
          !showVideo && 'hidden',
          isCurrentUser && isMirrored && !isScreenShare && '-scale-x-100',
          // For screen shares, use object-contain to show full content; for video use object-cover
          isScreenShare ? 'object-contain' : 'object-cover'
        )}
      />
      {/* Dedicated audio element for remote streams */}
      {!isLocal && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          muted={false}
          style={{ display: 'none' }}
        />
      )}
      
      {showProfile && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          {profilePic ? (
            <img
              src={profilePic}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover"
              onError={(e) => {
                // Fallback to initial if image fails to load
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-3xl font-semibold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
          {isCurrentUser ? 'You' : displayName}
        </div>
        <div className="flex gap-1">
          {!participant.isAudioEnabled && (
            <div className="bg-red-500/80 backdrop-blur-sm p-1 rounded">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            </div>
          )}
          {participant.isScreenSharing && (
            <div className="bg-blue-500/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
              Sharing
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

