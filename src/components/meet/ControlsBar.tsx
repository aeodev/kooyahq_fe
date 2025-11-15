import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, Square, LogOut, FlipHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeviceSettings } from './DeviceSettings'

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
    <div className="flex items-center justify-center gap-3 md:gap-1 sm:gap-2 p-4 md:p-2 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-50 flex-shrink-0 flex-wrap">
      <Button
        variant={isAudioEnabled ? 'default' : 'destructive'}
        size="icon"
        onClick={onToggleAudio}
        title={isAudioEnabled ? 'Mute' : 'Unmute'}
        className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md"
      >
        {isAudioEnabled ? <Mic className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />}
      </Button>

      <Button
        variant={isVideoEnabled ? 'default' : 'destructive'}
        size="icon"
        onClick={onToggleVideo}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md"
      >
        {isVideoEnabled ? <Video className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" /> : <VideoOff className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />}
      </Button>

      <Button
        variant={isScreenSharing ? 'default' : 'outline'}
        size="icon"
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md hidden sm:flex"
      >
        <Monitor className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />
      </Button>

      <Button
        variant={isMirrored ? 'default' : 'outline'}
        size="icon"
        onClick={onToggleMirror}
        title={isMirrored ? 'Disable mirror' : 'Enable mirror (flip camera)'}
        className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md hidden sm:flex"
      >
        <FlipHorizontal className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />
      </Button>

      <div className="hidden sm:block">
        <DeviceSettings
          onVideoDeviceChange={onVideoDeviceChange}
          onAudioInputChange={onAudioInputChange}
          onAudioOutputChange={onAudioOutputChange}
        />
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleChat}
        title="Toggle chat"
        className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md bg-white/90 md:bg-transparent"
      >
        <MessageSquare className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />
      </Button>

      {!isRecording ? (
        <Button
          variant="outline"
          size="icon"
          onClick={onStartRecording}
          title="Start recording"
          className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md hidden sm:flex"
        >
          <Square className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />
        </Button>
      ) : (
        <Button
          variant="destructive"
          size="icon"
          onClick={onStopRecording}
          title="Stop recording"
          className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md hidden sm:flex"
        >
          <Square className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5 fill-current" />
        </Button>
      )}

      <div className="w-px h-6 sm:h-8 bg-border mx-1 sm:mx-2 hidden sm:block" />

      <Button
        variant="destructive"
        onClick={onLeave}
        className="h-14 px-6 md:px-3 md:h-9 sm:px-6 sm:h-10 text-base md:text-sm sm:text-base rounded-full shadow-md"
      >
        <LogOut className="h-5 w-5 md:h-3 md:w-3 sm:h-4 sm:w-4 md:mr-0 sm:mr-2" />
        <span className="hidden sm:inline">Leave</span>
      </Button>
    </div>
  )
}

