import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ConnectionState } from 'livekit-client'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import { useLiveKit } from '@/composables/meet/useLiveKit'
import { useActiveSpeaker } from '@/composables/meet/useActiveSpeaker'
import { useRecording } from '@/composables/meet/useRecording'
import { usePictureInPicture } from '@/composables/meet/usePictureInPicture'
import { VideoTile, type VideoTileRef } from '@/components/meet/VideoTile'
import { ControlsBar } from '@/components/meet/ControlsBar'
import { ChatPanel } from '@/components/meet/ChatPanel'
import { InvitationModal } from '@/components/meet/InvitationModal'
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
      const hasPreJoinState = location.state?.initialVideoEnabled !== undefined || location.state?.initialAudioEnabled !== undefined
      if (!hasPreJoinState) {
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
    reset,
    setMeetId,
  } = useMeetStore()

  const {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isMirroredForRemote,
    connectionState,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleMirrorForRemote,
    getRemoteStreams,
    getRemoteScreenShareStream,
    getLocalScreenShareStream,
    streamsUpdateCounter,
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
    flipCamera,
    cleanup,
  } = useLiveKit(meetId || null, initialVideoEnabled, initialAudioEnabled)

  const { isRecording, startRecording, stopRecording } = useRecording(localStream, meetId || null)

  // Picture-in-Picture support
  const { isPiPActive, isPiPSupported, togglePiP, setVideoElement, enterPiP } = usePictureInPicture()
  const localVideoTileRef = useRef<VideoTileRef>(null)

  // Handler for PiP toggle
  const handleTogglePiP = useCallback(() => {
    const videoElement = localVideoTileRef.current?.getVideoElement()
    if (videoElement) {
      togglePiP(videoElement)
    }
  }, [togglePiP])

  // Register video element for auto-PiP on tab switch
  useEffect(() => {
    const videoElement = localVideoTileRef.current?.getVideoElement()
    if (videoElement) {
      setVideoElement(videoElement)
    }
  }, [setVideoElement, connectionState]) // Re-run when connection state changes

  // Auto-PiP when screen sharing starts
  useEffect(() => {
    if (isScreenSharing && isPiPSupported) {
      // Small delay to ensure video is ready
      const timer = setTimeout(() => {
        enterPiP()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isScreenSharing, isPiPSupported, enterPiP])

  // Initialize meet and join socket room for chat
  useEffect(() => {
    if (meetId) {
      setMeetId(meetId)
      if (socket?.connected) {
        socket.emit('meet:join', meetId)
      }
    }

    return () => {
      if (meetId && socket?.connected) {
        socket.emit('meet:leave', meetId)
      }
      reset()
    }
  }, [meetId, setMeetId, reset, socket])

  // Ensure socket is connected
  useEffect(() => {
    const socketState = useSocketStore.getState()
    if (!socketState.socket?.connected && !socketState.connecting) {
      socketState.connect()
    }
  }, [socket?.connected])

  const handleLeave = () => {
    cleanup()
    if (meetId && socket?.connected) {
      socket.emit('meet:leave', meetId)
    }
    reset()
    navigate('/')
  }

  // Get remote streams mapped by userId
  const remoteStreams = useMemo(() => {
    const streams = getRemoteStreams()
    const streamMap = new Map<string, MediaStream>()
    streams.forEach(({ userId, stream }) => {
      streamMap.set(userId, stream)
    })
    return streamMap
  }, [getRemoteStreams, participants, streamsUpdateCounter])

  // Get local screen share stream
  const localScreenShareStream = useMemo(() => {
    return getLocalScreenShareStream()
  }, [getLocalScreenShareStream, isScreenSharing])

  // Detect active speaker
  const activeSpeakerId = useActiveSpeaker({
    remoteStreams,
    currentUserId: user?.id || null,
  })

  // Track if we're on mobile
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Get all participants including self
  const allParticipants = useMemo(() => {
    const participantArray = Array.from(participants.values())

    // Ensure local user is always included (defensive programming)
    if (user && !participants.has(user.id)) {
      participantArray.push({
        userId: user.id,
        userName: user.name,
        profilePic: user.profilePic,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
      })
    }

    return participantArray
  }, [participants, user, isVideoEnabled, isAudioEnabled, isScreenSharing])

  // Detect if anyone is screen sharing
  const screenSharingParticipant = useMemo(() => {
    return allParticipants.find(p => p.isScreenSharing) || null
  }, [allParticipants])

  // Is the local user the one screen sharing?
  const isLocalScreenSharing = isScreenSharing && screenSharingParticipant?.userId === user?.id

  // Determine which participant to show on mobile
  const mobileDisplayParticipant = useMemo(() => {
    if (allParticipants.length === 1) {
      return allParticipants[0] || null
    }

    if (screenSharingParticipant) {
      return screenSharingParticipant
    }

    if (activeSpeakerId) {
      const activeParticipant = allParticipants.find(p => p.userId === activeSpeakerId)
      if (activeParticipant) {
        return activeParticipant
      }
    }
    
    if (user) {
      const selfParticipant = allParticipants.find(p => p.userId === user.id)
      if (selfParticipant) {
        return selfParticipant
      }
    }
    
    const otherParticipants = allParticipants.filter(p => p.userId !== user?.id)
    return otherParticipants[0] || allParticipants[0] || null
  }, [activeSpeakerId, allParticipants, user, screenSharingParticipant])

  // Filter participants for display
  const displayParticipants = useMemo(() => {
    if (isMobile && mobileDisplayParticipant) {
      return [mobileDisplayParticipant]
    }
    return allParticipants
  }, [isMobile, mobileDisplayParticipant, allParticipants])

  // Calculate optimal grid layout for thumbnail strip (when screen sharing)
  const thumbnailCount = screenSharingParticipant 
    ? displayParticipants.length + (isLocalScreenSharing && isVideoEnabled ? 1 : 0) // +1 for camera tile when local screen sharing
    : displayParticipants.length

  // Calculate optimal grid layout (Google Meet-style) with mobile responsiveness
  const { gridCols, gridRows, gridStyle } = useMemo(() => {
    const count = thumbnailCount
    
    const calculateGrid = (participantCount: number) => {
      if (participantCount === 1) return { cols: 1, rows: 1 }
      if (participantCount === 2) return { cols: 2, rows: 1 }
      if (participantCount === 3) return { cols: 2, rows: 2 }
      if (participantCount === 4) return { cols: 2, rows: 2 }
      if (participantCount === 5) return { cols: 3, rows: 2 }
      if (participantCount === 6) return { cols: 3, rows: 2 }
      if (participantCount === 7) return { cols: 3, rows: 3 }
      if (participantCount === 8) return { cols: 3, rows: 3 }
      if (participantCount === 9) return { cols: 3, rows: 3 }
      if (participantCount === 10) return { cols: 4, rows: 3 }
      if (participantCount === 11) return { cols: 4, rows: 3 }
      if (participantCount === 12) return { cols: 4, rows: 3 }
      if (participantCount <= 16) return { cols: 4, rows: 4 }
      if (participantCount <= 20) return { cols: 5, rows: 4 }
      if (participantCount <= 25) return { cols: 5, rows: 5 }
      const cols = Math.ceil(Math.sqrt(participantCount * 1.2))
      const rows = Math.ceil(participantCount / cols)
      return { cols, rows }
    }
    
    const { cols, rows } = calculateGrid(count)
    
    const getResponsiveCols = (desktopCols: number) => {
      if (desktopCols === 1) return 'grid-cols-1'
      if (desktopCols === 2) return 'grid-cols-1 sm:grid-cols-2'
      if (desktopCols === 3) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
      if (desktopCols === 4) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
      if (desktopCols === 5) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
      return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    }
    
    const rowClasses: Record<number, string> = {
      1: 'grid-rows-1',
      2: 'grid-rows-2',
      3: 'grid-rows-3',
      4: 'grid-rows-4',
      5: 'grid-rows-5',
    }

    const useInlineStyle = cols > 5 || rows > 5

    return {
      gridCols: getResponsiveCols(cols),
      gridRows: useInlineStyle ? '' : (rowClasses[rows] || 'grid-rows-4'),
      gridStyle: useInlineStyle ? {
        gridTemplateColumns: `repeat(${Math.min(cols, 4)}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      } : undefined,
    }
  }, [thumbnailCount])

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

  // Show connection error if LiveKit connection failed
  if (connectionState === ConnectionState.Disconnected && meetId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Connection Failed</h2>
          <p className="text-muted-foreground mb-4">
            Unable to connect to the video meeting. This could be due to network issues or server problems.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={handleLeave}
              className="w-full px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Leave Meeting
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show connecting state
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 mx-auto">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Connecting...</h2>
          <p className="text-muted-foreground">Setting up your video meeting</p>
        </div>
      </div>
    )
  }

  // Render function for a video tile
  const renderVideoTile = (
    participant: typeof displayParticipants[0],
    stream: MediaStream | null,
    isLocal: boolean,
    className?: string,
    label?: string
  ) => (
    <VideoTile
      key={participant.userId + (label || '')}
      participant={{
        ...participant,
        userName: label || participant.userName,
      }}
      stream={stream}
      isLocal={isLocal}
      isMirrored={isLocal && isMirroredForRemote && !participant.isScreenSharing}
      className={className}
    />
  )

  // Screen sharing focus mode layout
  if (screenSharingParticipant && !isMobile) {
    const isScreenSharerLocal = screenSharingParticipant.userId === user.id
    // Use dedicated screen share stream for remote participants (not their camera stream)
    const screenShareStream = isScreenSharerLocal 
      ? localScreenShareStream 
      : getRemoteScreenShareStream(screenSharingParticipant.userId)

    // Thumbnails: all participants except show screen sharer's camera separately
    const thumbnailParticipants = displayParticipants.map(p => {
      if (p.userId === screenSharingParticipant.userId && isScreenSharerLocal) {
        // For local screen sharer, show camera tile (not screen share)
        return { ...p, isScreenSharing: false }
      }
      return p
    })

    return (
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 p-2 gap-2">
          {/* Main screen share area */}
          <div className={cn(
            'flex-1 min-h-0 min-w-0',
            isChatOpen && 'md:mr-0'
          )}>
            <div className="w-full h-full rounded-lg overflow-hidden bg-gray-900">
              <VideoTile
                participant={{
                  ...screenSharingParticipant,
                  userName: isScreenSharerLocal ? 'Your Screen' : `${screenSharingParticipant.userName}'s Screen`,
                }}
                stream={screenShareStream}
                isLocal={isScreenSharerLocal}
                isMirrored={false}
              />
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden md:w-48 lg:w-56 xl:w-64 flex-shrink-0">
            {thumbnailParticipants.map((participant) => {
              const isLocal = participant.userId === user.id
              const stream = isLocal ? localStream : remoteStreams.get(participant.userId) || null

              return (
                <div 
                  key={participant.userId} 
                  className="flex-shrink-0 w-32 h-24 md:w-full md:h-auto md:aspect-video rounded-lg overflow-hidden"
                >
                  {renderVideoTile(
                    participant,
                    stream,
                    isLocal,
                    'h-full',
                    isLocal ? 'You' : participant.userName
                  )}
                </div>
              )
            })}
          </div>

          <ChatPanel meetId={meetId} isOpen={isChatOpen} onClose={() => toggleChat()} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto z-50">
          <ControlsBar
            meetId={meetId || null}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
            isRecording={isRecording}
            isMirrored={isMirroredForRemote}
            isPiPActive={isPiPActive}
            isPiPSupported={isPiPSupported}
            isChatOpen={isChatOpen}
            isMobile={isMobile}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onToggleScreenShare={toggleScreenShare}
            onToggleChat={toggleChat}
            onToggleMirror={toggleMirrorForRemote}
            onTogglePiP={handleTogglePiP}
            onFlipCamera={flipCamera}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onLeave={handleLeave}
            onVideoDeviceChange={changeVideoDevice}
            onAudioInputChange={changeAudioInput}
            onAudioOutputChange={changeAudioOutput}
          />
        </div>

        <InvitationModal />
      </div>
    )
  }

  // Default grid layout (no screen sharing or mobile)
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex-1 relative overflow-hidden flex min-h-0" style={{ paddingBottom: isMobile ? '160px' : '0' }}>
        <div 
          className={cn(
            'grid gap-1 w-full h-full transition-all duration-300',
            'grid-cols-1 overflow-hidden p-3',
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
                ref={isLocal ? localVideoTileRef : undefined}
                participant={participant}
                stream={stream}
                isLocal={isLocal}
                isMirrored={isLocal && isMirroredForRemote}
              />
            )
          })}
        </div>

        <ChatPanel meetId={meetId} isOpen={isChatOpen} onClose={() => toggleChat()} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto z-50" style={{ bottom: isMobile ? '20px' : '0' }}>
        <ControlsBar
          meetId={meetId || null}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          isMirrored={isMirroredForRemote}
          isPiPActive={isPiPActive}
          isPiPSupported={isPiPSupported}
          isChatOpen={isChatOpen}
          isMobile={isMobile}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleScreenShare={toggleScreenShare}
          onToggleChat={toggleChat}
          onToggleMirror={toggleMirrorForRemote}
          onTogglePiP={handleTogglePiP}
          onFlipCamera={flipCamera}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onLeave={handleLeave}
          onVideoDeviceChange={changeVideoDevice}
          onAudioInputChange={changeAudioInput}
          onAudioOutputChange={changeAudioOutput}
        />
      </div>

      <InvitationModal />
    </div>
  )
}
