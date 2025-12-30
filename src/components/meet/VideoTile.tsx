import { useRef, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { Participant } from '@/stores/meet.store'
import { cn } from '@/utils/cn'

interface VideoTileProps {
  participant: Participant
  stream: MediaStream | null
  isLocal?: boolean
  isMirrored?: boolean
  className?: string
}

export function VideoTile({ participant, stream, isLocal = false, isMirrored = false, className }: VideoTileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const user = useAuthStore((state) => state.user)

  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)

  // Pinch zoom refs
  const lastTouchDistanceRef = useRef<number | null>(null)
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)

  // Simple video stream handling
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      console.log(`[VideoTile] Video element not ready for ${participant.userId}`, { isLocal })
      return
    }

    if (stream) {
      const videoTracks = stream.getVideoTracks()
      console.log(`[VideoTile] Setting stream for ${participant.userId}`, {
        isLocal,
        streamId: stream.id,
        videoTracks: videoTracks.length,
        videoTrackEnabled: videoTracks[0]?.enabled,
        videoTrackReadyState: videoTracks[0]?.readyState,
        currentSrcObject: video.srcObject instanceof MediaStream ? video.srcObject.id : null,
      })
      
      if (video.srcObject !== stream) {
        console.log(`[VideoTile] Updating video srcObject for ${participant.userId}`)
        video.srcObject = stream
      }
      
      // Ensure video tracks are enabled
      videoTracks.forEach((track) => {
        if (!track.enabled) {
          console.log(`[VideoTile] Enabling video track for ${participant.userId}`)
          track.enabled = true
        }
      })
      
      video.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(`[VideoTile] Video play error for ${participant.userId}:`, err)
        }
      })
    } else {
      console.log(`[VideoTile] No stream provided for ${participant.userId}`, { isLocal })
      video.srcObject = null
    }
  }, [stream, participant.userId, isLocal])

  // Simple audio handling for remote streams
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isLocal) return

    if (stream) {
      if (audio.srcObject !== stream) {
        audio.srcObject = stream
      }
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') console.error('Audio play error:', err)
      })
    } else {
      audio.srcObject = null
    }
  }, [stream, isLocal])

  // Reset zoom when not screen sharing
  useEffect(() => {
    if (!participant.isScreenSharing) {
      setScale(1)
      setTranslateX(0)
      setTranslateY(0)
    }
  }, [participant.isScreenSharing])

  // Pinch zoom for screen sharing
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
        isPinching = true
        lastTouchDistanceRef.current = getTouchDistance(e.touches)
        const rect = container.getBoundingClientRect()
        const center = getTouchCenter(e.touches)
        lastTouchCenterRef.current = { x: center.x - rect.left, y: center.y - rect.top }
        panStartRef.current = null
      } else if (e.touches.length === 1 && scale > 1) {
        panStartRef.current = { x: e.touches[0].clientX - translateX, y: e.touches[0].clientY - translateY }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault()
        const currentDistance = getTouchDistance(e.touches)
        const lastDistance = lastTouchDistanceRef.current

        if (lastDistance && lastDistance > 0) {
          const scaleChange = currentDistance / lastDistance
          const newScale = Math.max(0.5, Math.min(3, scale * scaleChange))
          setScale(newScale)

          if (lastTouchCenterRef.current) {
            const rect = container.getBoundingClientRect()
            const currentCenter = getTouchCenter(e.touches)
            const centerX = currentCenter.x - rect.left
            const centerY = currentCenter.y - rect.top

            setTranslateX((prev) => prev + (centerX - lastTouchCenterRef.current!.x) * (1 - scaleChange))
            setTranslateY((prev) => prev + (centerY - lastTouchCenterRef.current!.y) * (1 - scaleChange))
          }

          lastTouchDistanceRef.current = currentDistance
        }
      } else if (e.touches.length === 1 && panStartRef.current && scale > 1) {
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

  // Trust participant state + verify stream exists
  const hasStream = stream && stream.getVideoTracks().length > 0
  const showVideo = participant.isVideoEnabled && hasStream
  const showProfile = !showVideo

  const profilePic = participant.profilePic || (isCurrentUser ? user?.profilePic : undefined)
  const isScreenShare = participant.isScreenSharing

  const videoStyle =
    isScreenShare && scale !== 1
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
        'relative w-full h-full bg-gray-900 rounded-lg min-h-0',
        isScreenShare ? 'overflow-auto touch-pan-y touch-pan-x' : 'overflow-hidden',
        className
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
          isScreenShare ? 'object-contain' : 'object-cover'
        )}
      />

      {/* Audio element for remote streams */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline muted={false} style={{ display: 'none' }} />}

      {showProfile && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          {profilePic ? (
            <img
              src={profilePic}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-3xl font-semibold text-primary">{displayName.charAt(0).toUpperCase()}</span>
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
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="bg-blue-500/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">Sharing</div>
          )}
        </div>
      </div>
    </div>
  )
}
