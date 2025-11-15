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
  const user = useAuthStore((state) => state.user)

  const [hasVideoTrack, setHasVideoTrack] = useState(false)

  // Handle video stream
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      // Cleanup previous stream
      if (video.srcObject && video.srcObject !== stream) {
        video.srcObject = null
      }

      // Set new stream
      video.srcObject = stream
      
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

      // Handle video readiness
      const handleLoadedData = () => {
        // Retry play if not already playing
        if (video.paused) {
          const playPromise = video.play()
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.error('Error playing video after loadeddata:', error)
            })
          }
        }
      }

      const handleCanPlay = () => {
        // Video is ready to play
      }

      const handlePlay = () => {
        // Video started playing
      }

      const handleError = (error: Event) => {
        console.error('Video element error:', error)
      }

      video.addEventListener('loadeddata', handleLoadedData)
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('play', handlePlay)
      video.addEventListener('error', handleError)

      // Attempt to play video with retry logic
      const attemptPlay = async (retries = 3) => {
        try {
          await video.play()
        } catch (error) {
          console.error(`Error playing video (${retries} retries left):`, error)
          if (retries > 0) {
            setTimeout(() => attemptPlay(retries - 1), 500)
          }
        }
      }
      attemptPlay()
      
      return () => {
        stream.removeEventListener('addtrack', handleTrackAdded)
        stream.removeEventListener('removetrack', handleTrackRemoved)
        videoTracks.forEach(track => {
          track.removeEventListener('enabled', updateVideoTrack)
          track.removeEventListener('disabled', updateVideoTrack)
        })
        video.removeEventListener('loadeddata', handleLoadedData)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('error', handleError)
      }
    } else {
      setHasVideoTrack(false)
      video.srcObject = null
    }
  }, [stream, participant.isVideoEnabled])

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

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden min-h-0">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isCurrentUser}
        className={cn(
          'w-full h-full object-cover',
          !showVideo && 'hidden',
          isCurrentUser && isMirrored && '-scale-x-100'
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

