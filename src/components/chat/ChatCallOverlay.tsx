import { Button } from '@/components/ui/button'
import { CallVideoTile } from '@/components/chat/CallVideoTile'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/utils/cn'
import { useChatCallContext } from '@/contexts/chat-call.context'
import { useChatConversationsStore } from '@/stores/chat-conversations.store'
import { useAuthStore } from '@/stores/auth.store'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mic, MicOff, PhoneOff, Video, VideoOff, SwitchCamera, MessageSquareText } from 'lucide-react'

export function ChatCallOverlay() {
  const {
    status,
    callSession,
    participants,
    localStream,
    remoteStreams,
    error,
    isMuted,
    isVideoEnabled,
    canSwitchCamera,
    isInitiator,
    mode,
    media,
    speakingByUserId,
    callDurationLabel,
    acceptCall,
    rejectCall,
    leaveCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    isOverlayOpen,
    closeOverlay,
  } = useChatCallContext()

  const { conversations, setActiveConversation } = useChatConversationsStore()
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const location = useLocation()

  if (!callSession || status === 'idle' || !isOverlayOpen) return null

  const conversation = conversations.find((conv) => conv.id === callSession.roomId)
  const conversationName = conversation
    ? conversation.type === 'group'
      ? conversation.name || 'Group call'
      : conversation.participants.find((p) => p.id !== callSession.initiatorId)?.name || 'Direct call'
    : 'Call'

  const initiatorName = conversation?.participants.find((p) => p.id === callSession.initiatorId)?.name || 'Someone'
  const isAudioOnly = media === 'audio'

  const participantMeta = new Map(
    conversation?.participants.map((participant) => [participant.id, participant]) || []
  )

  const activeParticipants = participants.filter((participant) => participant.status !== 'left')

  const primaryParticipantId = (() => {
    if (!conversation) return null
    if (conversation.type === 'direct') {
      return conversation.participants.find((p) => p.id !== user?.id)?.id || null
    }

    const speakingIds = activeParticipants
      .map((participant) => participant.userId)
      .filter((participantId) => speakingByUserId[participantId])

    const nonSelfSpeaking = speakingIds.find((participantId) => participantId !== user?.id)
    if (nonSelfSpeaking) return nonSelfSpeaking

    const initiator = conversation.participants.find((p) => p.id === callSession.initiatorId)?.id
    if (initiator && initiator !== user?.id) return initiator

    return activeParticipants.find((participant) => participant.userId !== user?.id)?.userId || null
  })()

  const primaryMeta = primaryParticipantId ? participantMeta.get(primaryParticipantId) : undefined
  const primaryIsSpeaking = primaryParticipantId ? Boolean(speakingByUserId[primaryParticipantId]) : false

  const handleBackToChat = () => {
    setActiveConversation(callSession.roomId)
    if (location.pathname !== '/chat') {
      navigate('/chat')
    }
    closeOverlay()
  }

  const renderRingingState = () => {
    if (status === 'ringing_incoming') {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
          <div>
            <p className="text-lg font-semibold">Incoming call</p>
            <p className="text-sm text-white/70">{initiatorName} is calling</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" onClick={acceptCall}>Accept</Button>
            <Button size="lg" variant="outline" onClick={rejectCall}>Decline</Button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
        <div>
          <p className="text-lg font-semibold">Calling…</p>
          <p className="text-sm text-white/70">Waiting for others to join</p>
        </div>
        <Button size="lg" variant="outline" onClick={endCall}>Cancel</Button>
      </div>
    )
  }

  const renderErrorState = () => (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-lg font-semibold">Call failed</p>
      <p className="text-sm text-white/70">{error || 'Unable to start call'}</p>
      <Button size="lg" variant="outline" onClick={endCall}>Dismiss</Button>
    </div>
  )

  const showRemoteGrid = remoteStreams.length > 0
  const gridClassName = showRemoteGrid
    ? remoteStreams.length === 1
      ? 'grid-cols-1'
      : remoteStreams.length <= 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-1'

  const singleRemote = remoteStreams.length === 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-semibold">{conversationName}</p>
          <p className="text-xs text-white/60">
            {status === 'connecting'
              ? 'Connecting…'
              : status === 'active'
                ? `Live · ${callDurationLabel}`
                : 'Ringing'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBackToChat}
            className="text-white hover:bg-white/10"
          >
            <MessageSquareText className="mr-2 h-4 w-4" />
            Back to chat
          </Button>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 sm:px-6">
        {status === 'ringing_incoming' || status === 'ringing_outgoing' ? (
          renderRingingState()
        ) : status === 'failed' ? (
          renderErrorState()
        ) : isAudioOnly ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="relative">
              {primaryIsSpeaking && (
                <span className="absolute inset-0 rounded-full ring-2 ring-primary/70 animate-ping" />
              )}
              <Avatar
                name={primaryMeta?.name || conversationName}
                src={primaryMeta?.profilePic}
                size="xl"
                className={cn(
                  'relative h-24 w-24 text-lg border border-white/10 bg-white/5 text-white',
                  primaryIsSpeaking && 'ring-2 ring-primary/70'
                )}
                fallbackClassName="text-white"
              />
            </div>
            <div>
              <p className="text-lg font-semibold">Audio call</p>
              <p className="text-sm text-white/70">
                {status === 'active' ? `Live · ${callDurationLabel}` : 'Connecting…'}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            <div className={cn('grid h-full gap-3', gridClassName)}>
              {showRemoteGrid ? (
                remoteStreams.map((remote) => (
                  <CallVideoTile
                    key={remote.userId}
                    stream={remote.stream}
                    label={remote.name}
                    isSpeaking={Boolean(speakingByUserId[remote.userId])}
                    className={cn(
                      singleRemote ? 'h-full min-h-[280px]' : 'h-[calc((100vh-220px)/2)] min-h-[180px]'
                    )}
                  />
                ))
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/70">
                  Waiting for others to connect…
                </div>
              )}
            </div>
            <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-40 sm:h-52">
              <CallVideoTile
                stream={localStream}
                label="You"
                muted
                isVideoEnabled={isVideoEnabled}
                isSpeaking={Boolean(speakingByUserId[user?.id || 'local'])}
              />
            </div>
          </div>
        )}
      </div>

      {(status === 'connecting' || status === 'active') && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-neutral-950 px-4 py-4">
          <Button
            size="icon"
            variant={isMuted ? 'destructive' : 'outline'}
            className="h-12 w-12 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {!isAudioOnly && (
            <Button
              size="icon"
              variant={isVideoEnabled ? 'outline' : 'destructive'}
              className="h-12 w-12 rounded-full"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          )}
          {!isAudioOnly && canSwitchCamera && (
            <Button
              size="icon"
              variant="outline"
              className="h-12 w-12 rounded-full"
              onClick={switchCamera}
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="destructive"
            className="h-12 w-12 rounded-full"
            onClick={isInitiator || mode === 'one_to_one' ? endCall : leaveCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  )
}
