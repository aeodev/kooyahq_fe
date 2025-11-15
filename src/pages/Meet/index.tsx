import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import { useWebRTC } from '@/composables/meet/useWebRTC'
import { useActiveSpeaker } from '@/composables/meet/useActiveSpeaker'
import { VideoTile } from '@/components/meet/VideoTile'
import { ControlsBar } from '@/components/meet/ControlsBar'
import { ChatPanel } from '@/components/meet/ChatPanel'
import { cn } from '@/utils/cn'

export function Meet() {
  const { meetId } = useParams<{ meetId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const socket = useSocketStore((state) => state.socket)
  const user = useAuthStore((state) => state.user)
  
  // Redirect to pre-join if accessed directly without going through pre-join
  useEffect(() => {
    if (meetId && location.pathname === `/meet/${meetId}/join`) {
      // Check if we have state from pre-join screen
      const hasPreJoinState = location.state?.initialVideoEnabled !== undefined || location.state?.initialAudioEnabled !== undefined
      if (!hasPreJoinState) {
        // Redirect to pre-join if accessed directly
        navigate(`/meet/${meetId}`, { replace: true })
        return
      }
    }
  }, [meetId, location, navigate])
  
  const initialVideoEnabled = location.state?.initialVideoEnabled ?? true
  const initialAudioEnabled = location.state?.initialAudioEnabled ?? true
  const {
    participants,
    isChatOpen,
    toggleChat,
    isMirrored,
    toggleMirror,
    reset,
    setMeetId,
  } = useMeetStore()

  const {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isRecording,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    startRecording,
    stopRecording,
    getRemoteStreams,
    streamsUpdateCounter,
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
  } = useWebRTC(meetId || null, initialVideoEnabled, initialAudioEnabled)

  // Initialize meet
  useEffect(() => {
    if (meetId) {
      setMeetId(meetId)
    }

    return () => {
      reset()
    }
  }, [meetId, setMeetId, reset])

  // Ensure socket is connected
  useEffect(() => {
    const socketState = useSocketStore.getState()
    if (!socketState.socket?.connected && !socketState.connecting) {
      socketState.connect()
    }
  }, [socket?.connected])

  const handleLeave = () => {
    if (meetId && socket?.connected) {
      socket.emit('meet:leave', meetId)
    }
    reset()
    navigate('/')
  }

  // Get remote streams mapped by userId
  // Recalculate when participants change or streams update to ensure we get updated streams
  const remoteStreams = useMemo(() => {
    const streams = getRemoteStreams()
    const streamMap = new Map<string, MediaStream>()
    streams.forEach(({ userId, stream }) => {
      streamMap.set(userId, stream)
    })
    return streamMap
  }, [getRemoteStreams, participants, streamsUpdateCounter])

  // Detect active speaker
  const activeSpeakerId = useActiveSpeaker({
    remoteStreams,
    currentUserId: user?.id || null,
  })

  // Track if we're on mobile (below md breakpoint)
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Get all participants including self
  const allParticipants = useMemo(() => {
    const participantArray = Array.from(participants.values())
    if (user && !participants.has(user.id)) {
      participantArray.push({
        userId: user.id,
        userName: user.name,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
      })
    }
    return participantArray
  }, [participants, user, isVideoEnabled, isAudioEnabled, isScreenSharing])

  // Determine which participant to show on mobile (active speaker or fallback)
  const mobileDisplayParticipant = useMemo(() => {
    // Edge case: Only one participant (self)
    if (allParticipants.length === 1) {
      return allParticipants[0] || null
    }

    // If we have an active speaker, show them (but verify they still exist)
    if (activeSpeakerId) {
      const activeParticipant = allParticipants.find(p => p.userId === activeSpeakerId)
      if (activeParticipant) {
        return activeParticipant
      }
      // Active speaker left, fall through to next logic
    }
    
    // If no active speaker, show self if available
    if (user) {
      const selfParticipant = allParticipants.find(p => p.userId === user.id)
      if (selfParticipant) {
        return selfParticipant
      }
    }
    
    // Fallback to first other participant
    const otherParticipants = allParticipants.filter(p => p.userId !== user?.id)
    return otherParticipants[0] || allParticipants[0] || null
  }, [activeSpeakerId, allParticipants, user])

  // Filter participants for display: on mobile show only one, on desktop show all
  const displayParticipants = useMemo(() => {
    if (isMobile && mobileDisplayParticipant) {
      return [mobileDisplayParticipant]
    }
    return allParticipants
  }, [isMobile, mobileDisplayParticipant, allParticipants])

  // Calculate optimal grid layout (Google Meet-style) with mobile responsiveness
  const { gridCols, gridRows, gridStyle } = useMemo(() => {
    const count = allParticipants.length
    
    // Helper to calculate optimal grid dimensions for desktop
    const calculateGrid = (participantCount: number) => {
      if (participantCount === 1) return { cols: 1, rows: 1 }
      if (participantCount === 2) return { cols: 2, rows: 1 }
      if (participantCount === 3) return { cols: 2, rows: 2 } // 2x2 with one empty
      if (participantCount === 4) return { cols: 2, rows: 2 }
      if (participantCount === 5) return { cols: 3, rows: 2 } // 3x2 with one empty
      if (participantCount === 6) return { cols: 3, rows: 2 }
      if (participantCount === 7) return { cols: 3, rows: 3 } // 3x3 with two empty
      if (participantCount === 8) return { cols: 3, rows: 3 } // 3x3 with one empty
      if (participantCount === 9) return { cols: 3, rows: 3 }
      if (participantCount === 10) return { cols: 4, rows: 3 } // 4x3 with two empty
      if (participantCount === 11) return { cols: 4, rows: 3 } // 4x3 with one empty
      if (participantCount === 12) return { cols: 4, rows: 3 }
      if (participantCount <= 16) return { cols: 4, rows: 4 }
      if (participantCount <= 20) return { cols: 5, rows: 4 }
      if (participantCount <= 25) return { cols: 5, rows: 5 }
      // For larger groups, use a more compact grid
      const cols = Math.ceil(Math.sqrt(participantCount * 1.2)) // 1.2 aspect ratio preference
      const rows = Math.ceil(participantCount / cols)
      return { cols, rows }
    }
    
    const { cols, rows } = calculateGrid(count)
    
    // Responsive column classes: mobile (1 col), tablet (2 cols), desktop (calculated cols)
    const getResponsiveCols = (desktopCols: number) => {
      if (desktopCols === 1) return 'grid-cols-1'
      if (desktopCols === 2) return 'grid-cols-1 sm:grid-cols-2'
      if (desktopCols === 3) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
      if (desktopCols === 4) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
      if (desktopCols === 5) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
      // For larger grids, use responsive classes up to 4 columns max
      return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    }
    
    const rowClasses: Record<number, string> = {
      1: 'grid-rows-1',
      2: 'grid-rows-2',
      3: 'grid-rows-3',
      4: 'grid-rows-4',
      5: 'grid-rows-5',
    }

    // Use inline styles for grids larger than 5x5
    const useInlineStyle = cols > 5 || rows > 5

    return {
      gridCols: getResponsiveCols(cols),
      gridRows: useInlineStyle ? '' : (rowClasses[rows] || 'grid-rows-4'),
      gridStyle: useInlineStyle ? {
        gridTemplateColumns: `repeat(${Math.min(cols, 4)}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      } : undefined,
    }
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
      <div className="flex-1 relative overflow-hidden flex min-h-0" style={{ paddingBottom: isMobile ? '160px' : '0' }}>
        <div 
          className={cn(
            'grid gap-1 w-full h-full transition-all duration-300',
            // Mobile: single column, no overflow, add padding to reduce tile size
            'grid-cols-1 overflow-hidden p-3',
            // Desktop: use calculated grid with responsive classes
            'md:overflow-auto md:p-1',
            gridCols,
            gridRows,
            isChatOpen && 'mr-0 md:mr-0'
          )}
          style={isMobile ? undefined : gridStyle}
        >
          {displayParticipants.map((participant) => {
            const isLocal = participant.userId === user.id
            const stream = isLocal ? localStream : remoteStreams.get(participant.userId) || null

            return (
              <VideoTile
                key={participant.userId}
                participant={participant}
                stream={stream}
                isLocal={isLocal}
                isMirrored={isLocal && isMirrored}
              />
            )
          })}
        </div>

        <ChatPanel meetId={meetId} isOpen={isChatOpen} onClose={() => toggleChat()} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto z-50" style={{ bottom: isMobile ? '20px' : '0' }}>
        <ControlsBar
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          isMirrored={isMirrored}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleScreenShare={toggleScreenShare}
          onToggleChat={toggleChat}
          onToggleMirror={toggleMirror}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onLeave={handleLeave}
          onVideoDeviceChange={changeVideoDevice}
          onAudioInputChange={changeAudioInput}
          onAudioOutputChange={changeAudioOutput}
        />
      </div>
    </div>
  )
}

