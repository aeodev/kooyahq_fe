import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, Square, LogOut, FlipHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeviceSettings } from './DeviceSettings'
import { cn } from '@/utils/cn'

interface ControlsBarProps {
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  isRecording: boolean
  isMirrored: boolean
  onToggleVideo: () => void
  onToggleAudio: () => void
  onToggleScreenShare: () => void
  onToggleChat: () => void
  onToggleMirror: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onLeave: () => void
  onVideoDeviceChange: (deviceId: string) => void
  onAudioInputChange: (deviceId: string) => void
  onAudioOutputChange: (deviceId: string) => void
}

export function ControlsBar({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isRecording,
  isMirrored,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleChat,
  onToggleMirror,
  onStartRecording,
  onStopRecording,
  onLeave,
  onVideoDeviceChange,
  onAudioInputChange,
  onAudioOutputChange,
}: ControlsBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-2 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-50 flex-shrink-0">
      <Button
        variant={isAudioEnabled ? 'default' : 'destructive'}
        size="icon"
        onClick={onToggleAudio}
        title={isAudioEnabled ? 'Mute' : 'Unmute'}
      >
        {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Button>

      <Button
        variant={isVideoEnabled ? 'default' : 'destructive'}
        size="icon"
        onClick={onToggleVideo}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>

      <Button
        variant={isScreenSharing ? 'default' : 'outline'}
        size="icon"
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
      >
        <Monitor className="h-5 w-5" />
      </Button>

      <Button
        variant={isMirrored ? 'default' : 'outline'}
        size="icon"
        onClick={onToggleMirror}
        title={isMirrored ? 'Disable mirror' : 'Enable mirror (flip camera)'}
      >
        <FlipHorizontal className="h-5 w-5" />
      </Button>

      <DeviceSettings
        onVideoDeviceChange={onVideoDeviceChange}
        onAudioInputChange={onAudioInputChange}
        onAudioOutputChange={onAudioOutputChange}
      />

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleChat}
        title="Toggle chat"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {!isRecording ? (
        <Button
          variant="outline"
          size="icon"
          onClick={onStartRecording}
          title="Start recording"
        >
          <Square className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          variant="destructive"
          size="icon"
          onClick={onStopRecording}
          title="Stop recording"
        >
          <Square className="h-5 w-5 fill-current" />
        </Button>
      )}

      <div className="w-px h-8 bg-border mx-2" />

      <Button
        variant="destructive"
        onClick={onLeave}
        className="px-6"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Leave
      </Button>
    </div>
  )
}

