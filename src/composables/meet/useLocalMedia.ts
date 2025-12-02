import { useCallback, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'

interface UseLocalMediaOptions {
  initialVideoEnabled?: boolean
  initialAudioEnabled?: boolean
  initialStream?: MediaStream
}

export function useLocalMedia({
  initialVideoEnabled = true,
  initialAudioEnabled = true,
  initialStream,
}: UseLocalMediaOptions = {}) {
  const user = useAuthStore((state) => state.user)
  const getStore = useCallback(() => useMeetStore.getState(), [])

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled)
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled)

  const localStreamRef = useRef<MediaStream | null>(null)

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      let stream: MediaStream

      // Reuse provided stream if available
      if (initialStream) {
        stream = initialStream
        localStreamRef.current = stream
        setLocalStream(stream)

        // Ensure tracks are in correct enabled state
        if (stream.getVideoTracks().length > 0) {
          stream.getVideoTracks().forEach((track) => {
            track.enabled = initialVideoEnabled
          })
        }
        if (stream.getAudioTracks().length > 0) {
          stream.getAudioTracks().forEach((track) => {
            track.enabled = initialAudioEnabled
          })
        }
      } else {
        // Acquire new stream if not provided
        const videoEnabled = initialVideoEnabled
        const audioEnabled = initialAudioEnabled || !initialVideoEnabled

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled ? { width: 1280, height: 720 } : false,
          audio: audioEnabled,
        })
        localStreamRef.current = stream
        setLocalStream(stream)

        if (!initialVideoEnabled && stream.getVideoTracks().length > 0) {
          stream.getVideoTracks().forEach((track) => {
            track.enabled = false
          })
        }
        if (!initialAudioEnabled && stream.getAudioTracks().length > 0) {
          stream.getAudioTracks().forEach((track) => {
            track.enabled = false
          })
        }
      }

      if (user) {
        getStore().addParticipant({
          userId: user.id,
          userName: user.name,
          profilePic: user.profilePic,
          isVideoEnabled: initialVideoEnabled,
          isAudioEnabled: initialAudioEnabled,
          isScreenSharing: false,
        })
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          console.error('Camera/microphone permission denied')
          throw new Error('Camera or microphone access was denied. Please grant permissions and try again.')
        } else if (error.name === 'NotFoundError') {
          console.error('Camera/microphone device not found')
          throw new Error('No camera or microphone found. Please connect a device and try again.')
        } else if (error.name === 'NotReadableError') {
          console.error('Camera/microphone is already in use')
          throw new Error('Camera or microphone is already in use by another application.')
        } else if (error.name === 'OverconstrainedError') {
          console.error('Camera/microphone constraints cannot be satisfied')
          throw new Error('Camera or microphone settings are not supported.')
        }
      }
      console.error('Error accessing media devices:', error)
      throw error
    }
  }, [user, initialVideoEnabled, initialAudioEnabled, initialStream, getStore])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const currentValue = isVideoEnabled
    const newValue = !currentValue

    try {
      if (newValue) {
        if (!localStreamRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: 1280, height: 720 },
              audio: isAudioEnabled,
            })
            localStreamRef.current = stream
            setLocalStream(stream)

            const videoTrack = stream.getVideoTracks()[0]
            if (videoTrack) {
              // Track replacement will be handled by peer connections hook
            }
          } catch (error) {
            console.error('Error re-acquiring video:', error)
            throw error
          }
        } else {
          const videoTracks = localStreamRef.current.getVideoTracks()
          if (videoTracks.length === 0) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false,
              })
              const newVideoTrack = stream.getVideoTracks()[0]
              localStreamRef.current.addTrack(newVideoTrack)
              setLocalStream(localStreamRef.current)

              stream.getAudioTracks().forEach((track) => track.stop())
            } catch (error) {
              console.error('Error re-acquiring video track:', error)
              throw error
            }
          } else {
            videoTracks.forEach((track) => {
              track.enabled = true
            })
          }
        }
      } else {
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks()
          videoTracks.forEach((track) => {
            track.enabled = false
          })
        }
      }

      setIsVideoEnabled(newValue)
      if (user) {
        getStore().updateParticipant(user.id, { isVideoEnabled: newValue })
      }
    } catch (error) {
      console.error('Failed to toggle video:', error)
      setIsVideoEnabled(currentValue)
      // Don't throw - let UI handle the error state
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.warn('Video permission denied')
      }
    }
  }, [isVideoEnabled, isAudioEnabled, user, getStore])

  // Toggle audio
  const toggleAudio = useCallback(() => {
    try {
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks()
        const currentValue = isAudioEnabled
        const newValue = !currentValue

        audioTracks.forEach((track) => {
          track.enabled = newValue
        })

        setIsAudioEnabled(newValue)
        if (user) {
          getStore().updateParticipant(user.id, { isAudioEnabled: newValue })
        }
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error)
    }
  }, [isAudioEnabled, user, getStore])

  return {
    localStream,
    localStreamRef,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    initializeLocalStream,
    setLocalStream,
  }
}

