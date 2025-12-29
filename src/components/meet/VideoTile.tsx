import { useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { Participant } from '@/stores/meet.store'
import { cn } from '@/utils/cn'

interface VideoTileProps {
  participant: Participant
  stream: MediaStream | null
  isLocal?: boolean
}

export function VideoTile({ participant, stream, isLocal = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      video.srcObject = stream
      video.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Video play error:', err)
        }
      })
    } else {
      video.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isLocal) return

    if (stream) {
      audio.srcObject = stream
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') console.error('Audio play error:', err)
      })
    } else {
      audio.srcObject = null
    }
  }, [stream, isLocal])

  const displayName = participant.userName || 'Unknown User'
  const isCurrentUser = isLocal || participant.userId === user?.id
  const hasVideo = participant.isVideoEnabled && stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled
  const showAvatar = !hasVideo

  const profilePic = participant.profilePic || (isCurrentUser ? user?.profilePic : undefined)

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isCurrentUser}
        className={cn('w-full h-full object-cover', !hasVideo && 'hidden')}
      />

      {!isLocal && <audio ref={audioRef} autoPlay playsInline muted={false} style={{ display: 'none' }} />}

      {showAvatar && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          {profilePic ? (
            <img
              src={profilePic}
              alt={displayName}
              className="w-32 h-32 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-4xl font-semibold text-primary">
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
      </div>
    </div>
  )
}
