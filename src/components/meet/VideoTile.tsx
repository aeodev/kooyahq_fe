import { useRef, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { Participant } from '@/stores/meet.store'
import { cn } from '@/utils/cn'

interface VideoTileProps {
  participant: Participant
  stream: MediaStream | null
  isLocal?: boolean
  isMirrored?: boolean
}

export function VideoTile({ participant, stream, isLocal = false, isMirrored = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((state) => state.user)
  const playPromiseRef = useRef<Promise<void> | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const [hasVideoTrack, setHasVideoTrack] = useState(false)
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  
  // Pinch zoom state
  const lastTouchDistanceRef = useRef<number | null>(null)
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)

  // Handle video stream
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Cancel any pending play attempts when stream changes
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {}) // Suppress errors from cancelled promises
      playPromiseRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (stream) {
      // Only update srcObject if it's actually different
      if (video.srcObject !== stream) {
        // Pause first to avoid interruption
        video.pause()
        video.srcObject = stream
      }
      
      // Check if stream has video tracks
      const checkVideoTracks = () => {
        const videoTracks = stream.getVideoTracks()
        setHasVideoTrack(videoTracks.length > 0 && videoTracks[0]?.enabled)
      }
      
      checkVideoTracks()
      
      // Listen for track enabled/disabled changes
      const updateVideoTrack = () => {
        checkVideoTracks()
      }
      
      // Listen for track added/removed events on the stream
      const handleTrackAdded = () => {
        checkVideoTracks()
      }
      
      const handleTrackRemoved = () => {
        checkVideoTracks()
      }
      
      stream.addEventListener('addtrack', handleTrackAdded)
      stream.addEventListener('removetrack', handleTrackRemoved)
      
      // Also listen to individual track events
      const videoTracks = stream.getVideoTracks()
      videoTracks.forEach(track => {
        track.addEventListener('enabled', updateVideoTrack)
        track.addEventListener('disabled', updateVideoTrack)
      })

      // Attempt to play video with retry logic
      const attemptPlay = async (retries = 3) => {
        // Cancel any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }

        // Don't attempt if component unmounted or video not ready
        if (!isMountedRef.current || !videoRef.current) return
        
        const currentVideo = videoRef.current
        
        // Wait for video to be ready (HAVE_METADATA at minimum)
        if (currentVideo.readyState < 1) {
          if (retries > 0) {
            retryTimeoutRef.current = setTimeout(() => attemptPlay(retries), 100)
          }
          return
        }

        try {
          // Cancel previous promise if exists
          if (playPromiseRef.current) {
            playPromiseRef.current.catch(() => {})
          }
          
          playPromiseRef.current = currentVideo.play()
          await playPromiseRef.current
          playPromiseRef.current = null
        } catch (error) {
          playPromiseRef.current = null
          // AbortError is expected when stream changes - don't log it
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`Error playing video (${retries} retries left):`, error)
          }
          if (retries > 0 && isMountedRef.current) {
            retryTimeoutRef.current = setTimeout(() => attemptPlay(retries - 1), 500)
          }
        }
      }

      // Handle video readiness - wait for metadata before playing
      const handleLoadedMetadata = () => {
        if (isMountedRef.current && videoRef.current?.paused) {
          attemptPlay()
        }
      }

      const handleCanPlay = () => {
        // Video can play, ensure it's playing
        if (isMountedRef.current && videoRef.current?.paused) {
          attemptPlay()
        }
      }

      const handlePlay = () => {
        // Video started playing successfully
      }

      const handleError = (error: Event) => {
        console.error('Video element error:', error)
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('play', handlePlay)
      video.addEventListener('error', handleError)

      // If video is already ready, attempt play
      if (video.readyState >= 1) {
        attemptPlay()
      }
      
      return () => {
        stream.removeEventListener('addtrack', handleTrackAdded)
        stream.removeEventListener('removetrack', handleTrackRemoved)
        videoTracks.forEach(track => {
          track.removeEventListener('enabled', updateVideoTrack)
          track.removeEventListener('disabled', updateVideoTrack)
        })
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('error', handleError)
        
        // Cancel any pending play attempts
        if (playPromiseRef.current) {
          playPromiseRef.current.catch(() => {})
          playPromiseRef.current = null
        }
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }
      }
    } else {
      setHasVideoTrack(false)
      video.srcObject = null
    }
  }, [stream, participant.isVideoEnabled])

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Reset zoom when screen sharing stops
  useEffect(() => {
    if (!participant.isScreenSharing) {
      setScale(1)
      setTranslateX(0)
      setTranslateY(0)
    }
  }, [participant.isScreenSharing])

  // Pinch-to-zoom for screen shares on mobile
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

  // Handle audio stream for remote participants
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isLocal) return

    if (stream) {
      // Cleanup previous stream
      if (audio.srcObject && audio.srcObject !== stream) {
        audio.srcObject = null
      }

      // Set audio stream for remote participants
      audio.srcObject = stream
      audio.muted = false

      // Attempt to play audio
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Error playing audio:', error)
        })
      }
    } else {
      audio.srcObject = null
    }
  }, [stream, isLocal])

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

