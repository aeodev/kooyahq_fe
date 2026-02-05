import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { CallMode, CallStatus } from '@/types/chat-call'
import { CallVideoTile } from './CallVideoTile'

interface RemoteStream {
  userId: string
  stream: MediaStream
  name: string
}

interface ChatCallPanelProps {
  status: CallStatus
  mode: CallMode | null
  isInitiator: boolean
  callerName: string
  localStream: MediaStream | null
  remoteStreams: RemoteStream[]
  error?: string | null
  onAccept: () => void
  onReject: () => void
  onLeave: () => void
  onEnd: () => void
}

export function ChatCallPanel({
  status,
  mode,
  isInitiator,
  callerName,
  localStream,
  remoteStreams,
  error,
  onAccept,
  onReject,
  onLeave,
  onEnd,
}: ChatCallPanelProps) {
  if (status === 'idle') return null

  if (status === 'ringing_incoming') {
    return (
      <div className="mx-3 mt-3 rounded-xl border border-border/60 bg-card/90 p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Incoming call</p>
            <p className="text-xs text-muted-foreground">{callerName} is calling</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onAccept}>Accept</Button>
            <Button size="sm" variant="outline" onClick={onReject}>Decline</Button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'ringing_outgoing') {
    return (
      <div className="mx-3 mt-3 rounded-xl border border-border/60 bg-card/90 p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Calling…</p>
            <p className="text-xs text-muted-foreground">Waiting for others to join</p>
          </div>
          <Button size="sm" variant="outline" onClick={onEnd}>Cancel</Button>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-3 mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-destructive">Call failed</p>
            <p className="text-xs text-muted-foreground">{error || 'Unable to start call'}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onEnd}>Dismiss</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-3 mt-3 rounded-xl border border-border/60 bg-card/95 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {mode === 'group' ? 'Group call' : 'Call'}
          </p>
          <p className="text-xs text-muted-foreground">
            {status === 'connecting' ? 'Connecting…' : 'Live'}
          </p>
        </div>
        {(() => {
          const shouldEndForAll = isInitiator || mode === 'one_to_one'
          return (
            <Button
              size="sm"
              variant={shouldEndForAll ? 'destructive' : 'outline'}
              onClick={shouldEndForAll ? onEnd : onLeave}
            >
              {shouldEndForAll ? 'End call' : 'Leave'}
            </Button>
          )
        })()}
      </div>
      <div
        className={cn(
          'grid gap-2',
          remoteStreams.length <= 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'
        )}
      >
        <CallVideoTile
          stream={localStream}
          label="You"
          muted
          className={remoteStreams.length === 0 ? 'h-56' : 'h-40 sm:h-48'}
        />
        {remoteStreams.map((remote) => (
          <CallVideoTile
            key={remote.userId}
            stream={remote.stream}
            label={remote.name}
            className={remoteStreams.length === 0 ? 'h-56' : 'h-40 sm:h-48'}
          />
        ))}
      </div>
      {remoteStreams.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Waiting for others to connect…</p>
      )}
    </div>
  )
}
