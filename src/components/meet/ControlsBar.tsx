import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, LogOut, FlipHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MoreMenu } from './MoreMenu'

interface ControlsBarProps {
  meetId: string | null
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  isRecording: boolean
  isMirrored: boolean
  isChatOpen?: boolean
  isMobile?: boolean
  onToggleVideo: () => void
  onToggleAudio: () => void
  onToggleScreenShare: () => void
  onToggleChat: () => void
  onToggleMirror: () => void
  onFlipCamera?: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onLeave: () => void
  onVideoDeviceChange: (deviceId: string) => void
  onAudioInputChange: (deviceId: string) => void
  onAudioOutputChange: (deviceId: string) => void
}

export function ControlsBar({
  meetId,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isRecording,
  isMirrored,
  isChatOpen = false,
  isMobile = false,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleChat,
  onToggleMirror,
  onFlipCamera,
  onStartRecording,
  onStopRecording,
  onLeave,
  onVideoDeviceChange,
  onAudioInputChange,
  onAudioOutputChange,
}: ControlsBarProps) {
  // On mobile, hide call controls when chat is open to prevent overlap with chat input
  const hideCallControlsOnMobile = isMobile && isChatOpen
  
  // On mobile, use flipCamera; on desktop, use toggleMirror
  const handleFlip = () => {
    if (isMobile && onFlipCamera) {
      onFlipCamera()
    } else {
      onToggleMirror()
    }
  }

  return (
    <div className="flex items-center justify-center gap-3 md:gap-1 sm:gap-2 p-4 md:p-2 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-50 flex-shrink-0 flex-wrap">
      {/* 3-dot More Menu - left side */}
      {!hideCallControlsOnMobile && (
        <MoreMenu
          meetId={meetId}
          isRecording={isRecording}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onVideoDeviceChange={onVideoDeviceChange}
          onAudioInputChange={onAudioInputChange}
          onAudioOutputChange={onAudioOutputChange}
        />
      )}

      {!hideCallControlsOnMobile && (
        <div className="w-px h-6 sm:h-8 bg-border mx-1 sm:mx-2 hidden sm:block" />
      )}

      {/* Audio toggle */}
      {!hideCallControlsOnMobile && (
        <Button
          variant={isAudioEnabled ? 'default' : 'destructive'}
          size="icon"
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
          className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md"
        >
          {isAudioEnabled ? <Mic className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />}
        </Button>
      )}

      {/* Video toggle */}
      {!hideCallControlsOnMobile && (
        <Button
          variant={isVideoEnabled ? 'default' : 'destructive'}
          size="icon"
          onClick={onToggleVideo}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md"
        >
          {isVideoEnabled ? <Video className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" /> : <VideoOff className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />}
        </Button>
      )}

      {/* Screen share */}
      <Button
        variant={isScreenSharing ? 'default' : 'outline'}
        size="icon"
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md hidden sm:flex"
      >
        <Monitor className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />
      </Button>

      {/* Flip/Mirror camera */}
      <Button
        variant={isMirrored ? 'default' : 'outline'}
        size="icon"
        onClick={handleFlip}
        title={isMobile ? 'Flip camera' : (isMirrored ? 'Disable mirror' : 'Enable mirror (flip camera)')}
        className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md"
      >
        <FlipHorizontal className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />
      </Button>

      {/* Chat toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleChat}
        title="Toggle chat"
        className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
      >
        <MessageSquare className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5 text-white" />
      </Button>

      {!hideCallControlsOnMobile && (
        <div className="w-px h-6 sm:h-8 bg-border mx-1 sm:mx-2 hidden sm:block" />
      )}

      {/* Leave button */}
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
