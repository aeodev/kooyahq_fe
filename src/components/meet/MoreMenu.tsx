import { useState, useEffect } from 'react'
import { MoreVertical, Settings, Bot, Square, UserPlus, Loader2, PictureInPicture2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMorganAI } from '@/composables/meet/useMorganAI'
import { useUsers } from '@/hooks/user.hooks'
import { useMeetInvitations } from '@/composables/meet/useMeetInvitations'
import { useAuthStore } from '@/stores/auth.store'

interface MediaDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

interface MoreMenuProps {
  meetId: string | null
  isRecording: boolean
  isPiPActive?: boolean
  isPiPSupported?: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onTogglePiP?: () => void
  onVideoDeviceChange: (deviceId: string) => void
  onAudioInputChange: (deviceId: string) => void
  onAudioOutputChange: (deviceId: string) => void
}

export function MoreMenu({
  meetId,
  isRecording,
  isPiPActive = false,
  isPiPSupported = false,
  onStartRecording,
  onStopRecording,
  onTogglePiP,
  onVideoDeviceChange,
  onAudioInputChange,
  onAudioOutputChange,
}: MoreMenuProps) {
  // Device settings state
  const [devices, setDevices] = useState<MediaDevice[]>([])
  const [selectedVideo, setSelectedVideo] = useState<string>('')
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('')
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('')

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState<string | null>(null)
  const { users, loading: usersLoading, fetchUsers } = useUsers()
  const { sendInvitation } = useMeetInvitations()
  const currentUser = useAuthStore((state) => state.user)

  // Morgan AI
  const { isActive: morganActive, state: morganState, toggle: toggleMorgan } = useMorganAI({ enabled: false })

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        const deviceList = await navigator.mediaDevices.enumerateDevices()
        const mediaDevices: MediaDevice[] = deviceList.map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Unknown ${device.kind}`,
          kind: device.kind,
        }))
        setDevices(mediaDevices)

        const defaultVideo = mediaDevices.find((d) => d.kind === 'videoinput')
        const defaultAudioInput = mediaDevices.find((d) => d.kind === 'audioinput')
        const defaultAudioOutput = mediaDevices.find((d) => d.kind === 'audiooutput')

        if (defaultVideo) setSelectedVideo(defaultVideo.deviceId)
        if (defaultAudioInput) setSelectedAudioInput(defaultAudioInput.deviceId)
        if (defaultAudioOutput) setSelectedAudioOutput(defaultAudioOutput.deviceId)
      } catch (error) {
        console.error('Error loading devices:', error)
      }
    }

    loadDevices()
    navigator.mediaDevices.addEventListener('devicechange', loadDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices)
    }
  }, [])

  const videoDevices = devices.filter((d) => d.kind === 'videoinput')
  const audioInputDevices = devices.filter((d) => d.kind === 'audioinput')
  const audioOutputDevices = devices.filter((d) => d.kind === 'audiooutput')

  const handleOpenInvite = () => {
    setInviteOpen(true)
    if (users.length === 0) {
      fetchUsers()
    }
  }

  const handleInvite = (userId: string) => {
    if (!meetId) return
    setInviting(userId)
    sendInvitation(meetId, userId)
    setTimeout(() => {
      setInviting(null)
      setInviteOpen(false)
      setSearch('')
    }, 1000)
  }

  const filteredUsers = users.filter((user) => {
    if (user.id === currentUser?.id) return false
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    )
  })

  const isMorganProcessing = morganState === 'processing' || morganState === 'speaking'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            title="More options"
            className="h-14 w-14 md:h-9 md:w-9 sm:h-10 sm:w-10 rounded-full shadow-md"
          >
            <MoreVertical className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Device Settings Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Settings className="mr-2 h-4 w-4" />
              Device Settings
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuLabel>Camera</DropdownMenuLabel>
              {videoDevices.map((device) => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => {
                    setSelectedVideo(device.deviceId)
                    onVideoDeviceChange(device.deviceId)
                  }}
                  className={selectedVideo === device.deviceId ? 'bg-accent' : ''}
                >
                  {device.label}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Microphone</DropdownMenuLabel>
              {audioInputDevices.map((device) => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => {
                    setSelectedAudioInput(device.deviceId)
                    onAudioInputChange(device.deviceId)
                  }}
                  className={selectedAudioInput === device.deviceId ? 'bg-accent' : ''}
                >
                  {device.label}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Speaker</DropdownMenuLabel>
              {audioOutputDevices.map((device) => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => {
                    setSelectedAudioOutput(device.deviceId)
                    onAudioOutputChange(device.deviceId)
                  }}
                  className={selectedAudioOutput === device.deviceId ? 'bg-accent' : ''}
                >
                  {device.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Morgan AI */}
          <DropdownMenuItem onClick={toggleMorgan} disabled={isMorganProcessing}>
            {isMorganProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bot className="mr-2 h-4 w-4" />
            )}
            {morganActive ? 'Disable Morgan AI' : 'Enable Morgan AI'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Picture-in-Picture */}
          {isPiPSupported && onTogglePiP && (
            <DropdownMenuItem onClick={onTogglePiP}>
              <PictureInPicture2 className="mr-2 h-4 w-4" />
              {isPiPActive ? 'Exit picture-in-picture' : 'Open picture-in-picture'}
              {isPiPActive && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          )}

          {/* Recording */}
          <DropdownMenuItem onClick={isRecording ? onStopRecording : onStartRecording}>
            <Square className={`mr-2 h-4 w-4 ${isRecording ? 'fill-red-500 text-red-500' : ''}`} />
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Invite */}
          <DropdownMenuItem onClick={handleOpenInvite}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Meeting</DialogTitle>
            <DialogDescription>
              Select a user to invite to this meeting
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <div className="max-h-64 overflow-y-auto space-y-2">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No users found
              </p>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleInvite(user.id)}
                  disabled={inviting === user.id}
                  className="w-full p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left flex items-center gap-3 disabled:opacity-50"
                >
                  {user.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt={user.name || 'User'}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {(user.name || user.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  {inviting === user.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

