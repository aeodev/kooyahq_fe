import { Button } from '@/components/ui/button'
import { useChatCallContext } from '@/contexts/chat-call.context'
import { useChatConversationsStore } from '@/stores/chat-conversations.store'
import { cn } from '@/utils/cn'
import { PhoneCall, PhoneOff } from 'lucide-react'

export function ChatCallMiniBar() {
  const {
    status,
    callSession,
    isOverlayOpen,
    openOverlay,
    acceptCall,
    rejectCall,
    endCall,
    leaveCall,
    isInitiator,
    mode,
    media,
  } = useChatCallContext()
  const { conversations } = useChatConversationsStore()

  if (!callSession || status === 'idle' || status === 'failed' || isOverlayOpen) return null

  const conversation = conversations.find((conv) => conv.id === callSession.roomId)
  const initiatorName = conversation?.participants.find((p) => p.id === callSession.initiatorId)?.name || 'Someone'

  const mediaLabel = media === 'audio' ? 'Audio call' : 'Video call'
  const label = status === 'ringing_incoming'
    ? `Incoming ${mediaLabel.toLowerCase()} from ${initiatorName}`
    : status === 'ringing_outgoing'
    ? `${mediaLabel}…`
    : `${mediaLabel} in progress`

  const shouldEndForAll = isInitiator || mode === 'one_to_one'

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[92%] -translate-x-1/2 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-lg sm:w-[420px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <PhoneCall className="h-4 w-4 text-primary" />
          <span>{label}</span>
        </div>
        <div className={cn('flex items-center gap-2', status.startsWith('ringing') ? 'justify-between' : '')}>
          {status === 'ringing_incoming' ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  openOverlay()
                  acceptCall()
                }}
              >
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={rejectCall}>Decline</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={openOverlay}>Open call</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={shouldEndForAll ? endCall : leaveCall}
              >
                <PhoneOff className="mr-1 h-4 w-4" />
                {shouldEndForAll ? 'End' : 'Leave'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
