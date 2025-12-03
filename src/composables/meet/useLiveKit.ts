import { useEffect, useRef, useCallback, useState } from 'react'
import { Room, RoomEvent, Track, createLocalVideoTrack, createLocalAudioTrack, LocalVideoTrack, LocalAudioTrack } from 'livekit-client'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import { fetchLiveKitToken } from '@/utils/livekit'

export function useLiveKit(
  meetId: string | null,
  initialVideoEnabled = true,
  initialAudioEnabled = true
) {
  const user = useAuthStore((state) => state.user)
  const getStore = useCallback(() => useMeetStore.getState(), [])

  // State
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled)
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [streamsUpdateCounter, setStreamsUpdateCounter] = useState(0)

  // Refs
  const roomRef = useRef<Room | null>(null)
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null)
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null)
  const screenTrackRef = useRef<LocalVideoTrack | null>(null)
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())

  // Force update for streams
  const forceUpdate = useCallback(() => setStreamsUpdateCounter((v) => v + 1), [])

  // Initialize room connection
  useEffect(() => {
    if (!meetId || !user) return

    let mounted = true

    const connectRoom = async () => {
      try {
        // Fetch token
        const { data } = await fetchLiveKitToken(meetId)
        const { token, url } = data

        // Create room
        const room = new Room()
        roomRef.current = room

        // Set up event handlers
        room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
          if (!mounted) return

          if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
            // Get or create stream for this participant
            let stream = remoteStreamsRef.current.get(participant.identity)
            if (!stream) {
              stream = new MediaStream()
              remoteStreamsRef.current.set(participant.identity, stream)
            }
            stream.addTrack(track.mediaStreamTrack)
            forceUpdate()

            // Update participant state based on track kind
            if (track.kind === Track.Kind.Video) {
              getStore().updateParticipant(participant.identity, {
                isVideoEnabled: track.mediaStreamTrack.enabled,
              })
            } else if (track.kind === Track.Kind.Audio) {
              getStore().updateParticipant(participant.identity, {
                isAudioEnabled: track.mediaStreamTrack.enabled,
              })
            }
          }
        })

        room.on(RoomEvent.TrackUnsubscribed, (_track, _publication, _participant) => {
          if (!mounted) return
          // Note: We keep the stream but remove tracks individually
          // Stream will be cleaned up when participant disconnects
          forceUpdate()
        })

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          if (!mounted || participant.identity === user.id) return
          getStore().addParticipant({
            userId: participant.identity,
            userName: participant.name || undefined,
            isVideoEnabled: false,
            isAudioEnabled: false,
            isScreenSharing: false,
          })
        })

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          if (!mounted) return
          remoteStreamsRef.current.delete(participant.identity)
          getStore().removeParticipant(participant.identity)
          forceUpdate()
        })

        room.on(RoomEvent.TrackPublished, (publication, participant) => {
          if (!mounted) return
          if (publication.source === Track.Source.ScreenShare) {
            getStore().updateParticipant(participant.identity, {
              isScreenSharing: true,
            })
            if (participant.identity === user.id) {
              setIsScreenSharing(true)
            }
          }
        })

        room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
          if (!mounted) return
          if (publication.source === Track.Source.ScreenShare) {
            getStore().updateParticipant(participant.identity, {
              isScreenSharing: false,
            })
            if (participant.identity === user.id) {
              setIsScreenSharing(false)
            }
          }
        })

        // Connect to room
        await room.connect(url, token)

        // Create and publish local tracks
        const tracks: MediaStreamTrack[] = []
        
        if (initialVideoEnabled) {
          const videoTrack = await createLocalVideoTrack({
            resolution: { width: 1280, height: 720 },
          })
          localVideoTrackRef.current = videoTrack
          await room.localParticipant.publishTrack(videoTrack)
          tracks.push(videoTrack.mediaStreamTrack)
        }

        if (initialAudioEnabled) {
          const audioTrack = await createLocalAudioTrack()
          localAudioTrackRef.current = audioTrack
          await room.localParticipant.publishTrack(audioTrack)
          tracks.push(audioTrack.mediaStreamTrack)
        }

        if (tracks.length > 0) {
          const stream = new MediaStream(tracks)
          setLocalStream(stream)
        }

        // Add self as participant
        getStore().addParticipant({
          userId: user.id,
          userName: user.name,
          profilePic: user.profilePic,
          isVideoEnabled: initialVideoEnabled,
          isAudioEnabled: initialAudioEnabled,
          isScreenSharing: false,
        })

        // Update existing participants from room
        room.remoteParticipants.forEach((participant) => {
          getStore().addParticipant({
            userId: participant.identity,
            userName: participant.name || undefined,
            isVideoEnabled: false,
            isAudioEnabled: false,
            isScreenSharing: false,
          })
        })
      } catch (error) {
        console.error('[LiveKit] Error connecting to room:', error)
      }
    }

    connectRoom()

    return () => {
      mounted = false
      cleanup()
    }
  }, [meetId, user, initialVideoEnabled, initialAudioEnabled, getStore, forceUpdate])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const room = roomRef.current
    if (!room) return

    const newEnabled = !isVideoEnabled
    setIsVideoEnabled(newEnabled)

    try {
      if (newEnabled) {
        if (!localVideoTrackRef.current) {
          const videoTrack = await createLocalVideoTrack({
            resolution: { width: 1280, height: 720 },
          })
          localVideoTrackRef.current = videoTrack
          await room.localParticipant.publishTrack(videoTrack)
          
          setLocalStream((prev) => {
            if (prev) {
              const newStream = new MediaStream(prev.getTracks())
              newStream.addTrack(videoTrack.mediaStreamTrack)
              return newStream
            }
            return new MediaStream([videoTrack.mediaStreamTrack])
          })
        } else {
          // Track exists, just enable it
          localVideoTrackRef.current.mediaStreamTrack.enabled = true
        }
      } else {
        if (localVideoTrackRef.current) {
          localVideoTrackRef.current.mediaStreamTrack.enabled = false
        }
        // Keep track published but disabled (don't unpublish)
      }

      getStore().updateParticipant(user?.id || '', { isVideoEnabled: newEnabled })
    } catch (error) {
      console.error('[LiveKit] Error toggling video:', error)
    }
  }, [isVideoEnabled, user, getStore])

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    const room = roomRef.current
    if (!room) return

    const newEnabled = !isAudioEnabled
    setIsAudioEnabled(newEnabled)

    try {
      if (newEnabled) {
        if (!localAudioTrackRef.current) {
          const audioTrack = await createLocalAudioTrack()
          localAudioTrackRef.current = audioTrack
          await room.localParticipant.publishTrack(audioTrack)
          
          setLocalStream((prev) => {
            if (prev) {
              const newStream = new MediaStream(prev.getTracks())
              newStream.addTrack(audioTrack.mediaStreamTrack)
              return newStream
            }
            return new MediaStream([audioTrack.mediaStreamTrack])
          })
        } else {
          // Track exists, just enable it
          localAudioTrackRef.current.mediaStreamTrack.enabled = true
        }
      } else {
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.mediaStreamTrack.enabled = false
        }
        // Keep track published but disabled (don't unpublish)
      }

      getStore().updateParticipant(user?.id || '', { isAudioEnabled: newEnabled })
    } catch (error) {
      console.error('[LiveKit] Error toggling audio:', error)
    }
  }, [isAudioEnabled, user, getStore])

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current
    if (!room) return

    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenTrackRef.current) {
          await room.localParticipant.unpublishTrack(screenTrackRef.current)
          screenTrackRef.current.stop()
          screenTrackRef.current = null
        }
        setIsScreenSharing(false)
        getStore().updateParticipant(user?.id || '', { isScreenSharing: false })
      } else {
        // Start screen sharing
        const screenTrack = await createLocalVideoTrack({
          resolution: { width: 1920, height: 1080 },
        })
        screenTrackRef.current = screenTrack
        await room.localParticipant.publishTrack(screenTrack, {
          source: Track.Source.ScreenShare,
        })
        setIsScreenSharing(true)
        getStore().updateParticipant(user?.id || '', { isScreenSharing: true })
      }
    } catch (error) {
      console.error('[LiveKit] Error toggling screen share:', error)
    }
  }, [isScreenSharing, user, getStore])

  // Get remote streams
  const getRemoteStreams = useCallback(() => {
    const streams: Array<{ userId: string; stream: MediaStream }> = []
    remoteStreamsRef.current.forEach((stream, userId) => {
      if (stream?.getTracks().length) {
        streams.push({ userId, stream })
      }
    })
    return streams
  }, [streamsUpdateCounter])

  // Change video device
  const changeVideoDevice = useCallback(async (deviceId: string) => {
    const room = roomRef.current
    if (!room || !localVideoTrackRef.current) return

    try {
      const newTrack = await createLocalVideoTrack({
        deviceId,
        resolution: { width: 1280, height: 720 },
      })
      
      await room.localParticipant.unpublishTrack(localVideoTrackRef.current)
      localVideoTrackRef.current.stop()
      
      localVideoTrackRef.current = newTrack
      await room.localParticipant.publishTrack(newTrack)
      
      setLocalStream((prev) => {
        if (prev) {
          const newStream = new MediaStream(prev.getTracks())
          const oldTrack = newStream.getVideoTracks()[0]
          if (oldTrack) {
            newStream.removeTrack(oldTrack)
          }
          newStream.addTrack(newTrack.mediaStreamTrack)
          return newStream
        }
        return new MediaStream([newTrack.mediaStreamTrack])
      })
    } catch (error) {
      console.error('[LiveKit] Error changing video device:', error)
    }
  }, [])

  // Change audio input device
  const changeAudioInput = useCallback(async (deviceId: string) => {
    const room = roomRef.current
    if (!room || !localAudioTrackRef.current) return

    try {
      const newTrack = await createLocalAudioTrack({ deviceId })
      
      await room.localParticipant.unpublishTrack(localAudioTrackRef.current)
      localAudioTrackRef.current.stop()
      
      localAudioTrackRef.current = newTrack
      await room.localParticipant.publishTrack(newTrack)
      
      setLocalStream((prev) => {
        if (prev) {
          const newStream = new MediaStream(prev.getTracks())
          const oldTrack = newStream.getAudioTracks()[0]
          if (oldTrack) {
            newStream.removeTrack(oldTrack)
          }
          newStream.addTrack(newTrack.mediaStreamTrack)
          return newStream
        }
        return new MediaStream([newTrack.mediaStreamTrack])
      })
    } catch (error) {
      console.error('[LiveKit] Error changing audio input:', error)
    }
  }, [])

  // Change audio output device
  const changeAudioOutput = useCallback(async (deviceId: string) => {
    // LiveKit handles audio output through HTMLAudioElement
    // This is typically handled in VideoTile component
    // For now, we'll just update the device preference
    try {
      if ('setSinkId' in HTMLAudioElement.prototype) {
        // This will be handled in VideoTile when rendering audio elements
        console.log('[LiveKit] Audio output device change requested:', deviceId)
      }
    } catch (error) {
      console.error('[LiveKit] Error changing audio output:', error)
    }
  }, [])

  // Flip camera (switch between front/back)
  const flipCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room || !localVideoTrackRef.current) return

    try {
      const currentDeviceId = localVideoTrackRef.current.mediaStreamTrack.getSettings().deviceId
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((d) => d.kind === 'videoinput')
      
      // Find next video device
      const currentIndex = videoDevices.findIndex((d) => d.deviceId === currentDeviceId)
      const nextIndex = (currentIndex + 1) % videoDevices.length
      const nextDevice = videoDevices[nextIndex]

      if (nextDevice) {
        await changeVideoDevice(nextDevice.deviceId)
      }
    } catch (error) {
      console.error('[LiveKit] Error flipping camera:', error)
    }
  }, [changeVideoDevice])

  // Cleanup
  const cleanup = useCallback(() => {
    const room = roomRef.current
    if (room) {
      room.disconnect()
      roomRef.current = null
    }

    localVideoTrackRef.current?.stop()
    localVideoTrackRef.current = null
    localAudioTrackRef.current?.stop()
    localAudioTrackRef.current = null
    screenTrackRef.current?.stop()
    screenTrackRef.current = null

    remoteStreamsRef.current.clear()
    setLocalStream(null)
  }, [])

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    getRemoteStreams,
    streamsUpdateCounter,
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
    flipCamera,
    cleanup,
  }
}

