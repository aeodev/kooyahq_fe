import { Mic, MicOff, Video, VideoOff, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ControlsBarProps {
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  onToggleVideo: () => void
  onToggleAudio: () => void
  onLeave: () => void
}

export function ControlsBar({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onLeave,
}: ControlsBarProps) {
  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg">
      <Button
        variant={isAudioEnabled ? 'default' : 'destructive'}
        size="icon"
        onClick={onToggleAudio}
        title={isAudioEnabled ? 'Mute' : 'Unmute'}
        className="h-12 w-12 rounded-full"
      >
        {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Button>

      <Button
        variant={isVideoEnabled ? 'default' : 'destructive'}
        size="icon"
        onClick={onToggleVideo}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        className="h-12 w-12 rounded-full"
      >
        {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>

      <div className="w-px h-8 bg-border mx-2" />

      <Button
        variant="destructive"
        onClick={onLeave}
        className="h-12 px-6 rounded-full"
      >
        <LogOut className="h-5 w-5 mr-2" />
        Leave
      </Button>
    </div>
  )
}
