import { useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'
import { Volume2 } from 'lucide-react'

interface CallVideoTileProps {
  stream: MediaStream | null
  label: string
  muted?: boolean
  isVideoEnabled?: boolean
  isSpeaking?: boolean
  className?: string
}

export function CallVideoTile({
  stream,
  label,
  muted = false,
  isVideoEnabled,
  isSpeaking,
  className,
}: CallVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.srcObject = stream
  }, [stream])

  const hasVideo = (() => {
    if (typeof isVideoEnabled === 'boolean') return isVideoEnabled
    if (!stream) return false
    return stream.getVideoTracks().some((track) => track.enabled)
  })()

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-muted/60 border border-border/50',
        isSpeaking && 'ring-2 ring-primary/60',
        className
      )}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/40 text-xs text-muted-foreground">
          Camera off
        </div>
      )}
      <div className="absolute left-2 bottom-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white">
        {label}
        {isSpeaking && <Volume2 className="h-3 w-3 text-primary animate-pulse" />}
      </div>
    </div>
  )
}
