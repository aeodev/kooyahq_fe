import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface MediaDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

interface DeviceSettingsProps {
  onVideoDeviceChange: (deviceId: string) => void
  onAudioInputChange: (deviceId: string) => void
  onAudioOutputChange: (deviceId: string) => void
}

export function DeviceSettings({
  onVideoDeviceChange,
  onAudioInputChange,
  onAudioOutputChange,
}: DeviceSettingsProps) {
  const [devices, setDevices] = useState<MediaDevice[]>([])
  const [selectedVideo, setSelectedVideo] = useState<string>('')
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('')
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('')

  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        
        const deviceList = await navigator.mediaDevices.enumerateDevices()
        const mediaDevices: MediaDevice[] = deviceList.map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Unknown ${device.kind}`,
          kind: device.kind,
        }))
        
        setDevices(mediaDevices)
        
        // Set defaults
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

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices)
    }
  }, [])

  const videoDevices = devices.filter((d) => d.kind === 'videoinput')
  const audioInputDevices = devices.filter((d) => d.kind === 'audioinput')
  const audioOutputDevices = devices.filter((d) => d.kind === 'audiooutput')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" title="Device settings">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Video Camera</DropdownMenuLabel>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


