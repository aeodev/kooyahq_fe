import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, VideoOff, Mic, MicOff, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

export function PreJoin() {
  const { meetId } = useParams<{ meetId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Prevent navigation if user tries to access /join directly
  useEffect(() => {
    if (meetId && window.location.pathname.includes('/join')) {
      navigate(`/meet/${meetId}`, { replace: true })
    }
  }, [meetId, navigate])

  useEffect(() => {
    const initializePreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        setLocalStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error('Error accessing media devices:', error)
      }
    }

    initializePreview()

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
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
    if (meetId) {
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              <CardTitle>Ready to join?</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Check your camera and microphone before joining
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-3xl font-semibold text-primary">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                variant={isVideoEnabled ? 'default' : 'destructive'}
                size="icon"
                onClick={toggleVideo}
                className="rounded-full"
              >
                {isVideoEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant={isAudioEnabled ? 'default' : 'destructive'}
                size="icon"
                onClick={toggleAudio}
                className="rounded-full"
              >
                {isAudioEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleJoin} className="flex-1">
              Join Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

