import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, VideoOff, Mic, MicOff, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'

export function PreJoin() {
  const { meetId } = useParams<{ meetId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const canJoinMeet = useMemo(
    () => can(PERMISSIONS.MEET_TOKEN) || can(PERMISSIONS.MEET_FULL_ACCESS),
    [can]
  )

  // Prevent navigation if user tries to access /join directly
  useEffect(() => {
    if (meetId && window.location.pathname.includes('/join')) {
      navigate(`/meet/${meetId}`, { replace: true })
    }
  }, [meetId, navigate])

  useEffect(() => {
    const initializePreview = async () => {
      try {
        setPermissionError(null)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        streamRef.current = stream
        setLocalStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error('Error accessing media devices:', error)
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            setPermissionError('Camera and microphone access denied. Please enable permissions in your browser settings.')
          } else if (error.name === 'NotFoundError') {
            setPermissionError('No camera or microphone found. Please connect a device and try again.')
          } else if (error.name === 'NotReadableError') {
            setPermissionError('Camera or microphone is already in use by another application.')
          } else {
            setPermissionError('Failed to access camera and microphone. Please check your device settings.')
          }
        } else {
          setPermissionError('An unexpected error occurred. Please refresh and try again.')
        }
      }
    }

    initializePreview()

    return () => {
      // Stop tracks on unmount (e.g., if user navigates away without joining)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (localStream && videoRef.current) {
      const videoTracks = localStream.getVideoTracks()
      const audioTracks = localStream.getAudioTracks()
      
      videoTracks.forEach((track) => {
        track.enabled = isVideoEnabled
      })
      audioTracks.forEach((track) => {
        track.enabled = isAudioEnabled
      })
    }
  }, [isVideoEnabled, isAudioEnabled, localStream])

  const toggleVideo = () => {
    setIsVideoEnabled((prev) => !prev)
  }

  const toggleAudio = () => {
    setIsAudioEnabled((prev) => !prev)
  }

  const handleJoin = () => {
    if (!canJoinMeet) {
      return
    }
    if (meetId) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      navigate(`/meet/${meetId}/join`, {
        state: {
          initialVideoEnabled: isVideoEnabled,
          initialAudioEnabled: isAudioEnabled,
        },
      })
    }
  }

  const handleCancel = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    navigate('/meet')
  }

  if (!meetId || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Invalid Meeting</h2>
          <p className="text-muted-foreground">Please check the meeting ID</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <CardTitle className="text-lg sm:text-xl">Ready to join?</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            Check your camera and microphone before joining
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {permissionError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              {permissionError}
            </div>
          )}
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {/* Always render video element, hide with CSS when disabled */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
            />
            {!isVideoEnabled && (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-semibold text-primary">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                variant={isVideoEnabled ? 'default' : 'destructive'}
                size="icon"
                onClick={toggleVideo}
                className="rounded-full h-10 w-10 sm:h-12 sm:w-12"
              >
                {isVideoEnabled ? (
                  <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <VideoOff className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
              <Button
                variant={isAudioEnabled ? 'default' : 'destructive'}
                size="icon"
                onClick={toggleAudio}
                className="rounded-full h-10 w-10 sm:h-12 sm:w-12"
              >
                {isAudioEnabled ? (
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleJoin} 
              className="flex-1"
              disabled={!canJoinMeet}
              title={!canJoinMeet ? "You don't have permission to join meetings" : undefined}
            >
              Join Now
            </Button>
          </div>
          {!canJoinMeet && (
            <p className="text-sm text-destructive text-center">
              You don't have permission to join meetings. Please contact an administrator.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

