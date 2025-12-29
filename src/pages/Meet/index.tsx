import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import { useWebRTC } from '@/composables/meet/useWebRTC'
import { VideoTile } from '@/components/meet/VideoTile'
import { ControlsBar } from '@/components/meet/ControlsBar'
import { cn } from '@/utils/cn'

export function Meet() {
  const { meetId } = useParams<{ meetId: string }>()
  const navigate = useNavigate()
  const socket = useSocketStore((state) => state.socket)
  const user = useAuthStore((state) => state.user)
  const { participants, reset, setMeetId } = useMeetStore()

  const {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    cleanup,
  } = useWebRTC(meetId || null)

  useEffect(() => {
    if (meetId) {
      setMeetId(meetId)
    } else {
      // If meetId becomes null, cleanup immediately
      cleanup()
    }
  }, [meetId, setMeetId, cleanup])

  // Cleanup synchronously on unmount
  useLayoutEffect(() => {
    return () => {
      // This runs synchronously before browser paints, ensuring immediate cleanup
      cleanup()
      reset()
    }
  }, [cleanup, reset])

  useEffect(() => {
    const socketState = useSocketStore.getState()
    if (!socketState.socket?.connected && !socketState.connecting) {
      socketState.connect()
    }
  }, [socket?.connected])

  const handleLeave = () => {
    // Cleanup immediately before navigation
    cleanup()
    if (meetId && socket?.connected) {
      socket.emit('meet:leave', meetId)
    }
    reset()
    // Use replace to prevent back navigation
    navigate('/', { replace: true })
  }

  const allParticipants = useMemo(() => {
    const participantArray = Array.from(participants.values())
    if (user && !participants.has(user.id)) {
      participantArray.push({
        userId: user.id,
        userName: user.name,
        profilePic: user.profilePic,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing: false,
      })
    }
    return participantArray
  }, [participants, user, isVideoEnabled, isAudioEnabled])

  const { gridCols, gridRows } = useMemo(() => {
    const count = allParticipants.length
    if (count === 1) return { gridCols: 'grid-cols-1', gridRows: 'grid-rows-1' }
    if (count === 2) return { gridCols: 'grid-cols-2', gridRows: 'grid-rows-1' }
    if (count <= 4) return { gridCols: 'grid-cols-2', gridRows: 'grid-rows-2' }
    if (count <= 6) return { gridCols: 'grid-cols-3', gridRows: 'grid-rows-2' }
    if (count <= 9) return { gridCols: 'grid-cols-3', gridRows: 'grid-rows-3' }
    return { gridCols: 'grid-cols-4', gridRows: 'grid-rows-4' }
  }, [allParticipants.length])

  if (!meetId || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Invalid Meeting</h2>
          <p className="text-muted-foreground">Please check the meeting ID</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex-1 relative overflow-hidden">
        <div className={cn('grid gap-1 w-full h-full p-1', gridCols, gridRows)}>
          {allParticipants.map((participant) => {
            const isLocal = participant.userId === user.id
            const stream = isLocal ? localStream : remoteStreams.get(participant.userId) || null

            return (
              <VideoTile
                key={participant.userId}
                participant={participant}
                stream={stream}
                isLocal={isLocal}
              />
            )
          })}
        </div>
      </div>

      <ControlsBar
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onLeave={handleLeave}
      />
    </div>
  )
}
