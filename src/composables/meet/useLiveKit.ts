import { useEffect, useRef, useCallback, useState } from 'react'
import { Room, RoomEvent, Track, createLocalVideoTrack, createLocalAudioTrack, LocalVideoTrack, LocalAudioTrack, ConnectionState, RemoteParticipant } from 'livekit-client'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import { useSocketStore } from '@/stores/socket.store'
import { fetchLiveKitToken } from '@/utils/livekit'

export function useLiveKit(
  meetId: string | null,
  initialVideoEnabled = true,
  initialAudioEnabled = true
) {
  const user = useAuthStore((state) => state.user)
  const socket = useSocketStore((state) => state.socket)
  const getStore = useCallback(() => useMeetStore.getState(), [])

  // State
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled)
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isMirroredForRemote, setIsMirroredForRemote] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [streamsUpdateCounter, setStreamsUpdateCounter] = useState(0)
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)

  // Refs
  const roomRef = useRef<Room | null>(null)
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null)
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null)
  const originalVideoTrackRef = useRef<LocalVideoTrack | null>(null) // Store original track when mirroring
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const remoteScreenSharesRef = useRef<Map<string, MediaStream>>(new Map()) // Separate screen share streams
  const connectAttemptRef = useRef(0) // For race condition protection
  // Identity mapping: LiveKit ID -> Database ID
  const identityMapRef = useRef<Map<string, string>>(new Map())
  // Store initial values in refs so cleanup can access them
  const initialVideoRef = useRef(initialVideoEnabled)
  const initialAudioRef = useRef(initialAudioEnabled)
  // Mirror canvas refs
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mirrorVideoRef = useRef<HTMLVideoElement | null>(null)
  const mirrorAnimationFrameRef = useRef<number | null>(null)

  // Update refs when initial values change
  useEffect(() => {
    initialVideoRef.current = initialVideoEnabled
    initialAudioRef.current = initialAudioEnabled
  }, [initialVideoEnabled, initialAudioEnabled])

  // Force update for streams
  const forceUpdate = useCallback(() => setStreamsUpdateCounter((v) => v + 1), [])

  // Identity mapping helpers
  const setIdentityMapping = useCallback((liveKitId: string, databaseId: string) => {
    identityMapRef.current.set(liveKitId, databaseId)
  }, [])

  const getDatabaseId = useCallback((liveKitId: string): string => {
    return identityMapRef.current.get(liveKitId) || liveKitId // Fallback to LiveKit ID if no mapping
  }, [])

  const getLiveKitId = useCallback((databaseId: string): string | undefined => {
    for (const [liveKitId, dbId] of identityMapRef.current.entries()) {
      if (dbId === databaseId) return liveKitId
    }
    return undefined
  }, [])

  // Helper to read initial state from participant's publications
  const getParticipantState = (participant: RemoteParticipant) => {
    let isVideoEnabled = false
    let isAudioEnabled = false
    let isScreenSharing = false

    participant.trackPublications.forEach((pub) => {
      if (pub.source === Track.Source.Camera && !pub.isMuted) {
        isVideoEnabled = true
      }
      if (pub.source === Track.Source.Microphone && !pub.isMuted) {
        isAudioEnabled = true
      }
      // Screen share should also check mute state
      if (pub.source === Track.Source.ScreenShare && !pub.isMuted) {
        isScreenSharing = true
      }
    })

    return { isVideoEnabled, isAudioEnabled, isScreenSharing }
  }

  // Helper to cleanup mirror resources
  const cleanupMirror = useCallback(() => {
    if (mirrorAnimationFrameRef.current) {
      cancelAnimationFrame(mirrorAnimationFrameRef.current)
      mirrorAnimationFrameRef.current = null
    }
    if (mirrorVideoRef.current) {
      mirrorVideoRef.current.srcObject = null
      mirrorVideoRef.current = null
    }
    if (mirrorCanvasRef.current) {
      const ctx = mirrorCanvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, mirrorCanvasRef.current.width, mirrorCanvasRef.current.height)
      mirrorCanvasRef.current = null
    }
    originalVideoTrackRef.current = null
  }, [])

  // Cleanup function - defined BEFORE the useEffect that uses it
  const cleanupRoom = useCallback(() => {
    // Invalidate any inflight connection attempts
    connectAttemptRef.current += 1

    const room = roomRef.current
    if (room) {
      // Remove all listeners before disconnecting
      room.removeAllListeners()
      room.disconnect()
      roomRef.current = null
    }

    localVideoTrackRef.current?.stop()
    localVideoTrackRef.current = null
    localAudioTrackRef.current?.stop()
    localAudioTrackRef.current = null

    // Cleanup mirror resources
    cleanupMirror()

    remoteStreamsRef.current.clear()
    remoteScreenSharesRef.current.clear() // Also clear screen shares
    identityMapRef.current.clear()
    setLocalStream(null)
    setConnectionState(ConnectionState.Disconnected)

    // Reset UI state to initial values
    setIsVideoEnabled(initialVideoRef.current)
    setIsAudioEnabled(initialAudioRef.current)
    setIsScreenSharing(false)
    setIsMirroredForRemote(false)

    // Reset the meet store (clear participants)
    getStore().reset()
  }, [getStore, cleanupMirror])

  // Initialize room connection
  useEffect(() => {
    // If meetId or user becomes null, cleanup only if we were connected
    if (!meetId || !user) {
      if (roomRef.current) {
        cleanupRoom()
      }
      return
    }

    // Increment attempt counter for race condition protection
    const currentAttempt = ++connectAttemptRef.current
    let mounted = true
    let cleanupSocket: (() => void) | undefined

    const connectRoom = async () => {
      try {
        // Fetch token
        const { data } = await fetchLiveKitToken(meetId)
        const { token, url } = data

        // Check if this attempt is still valid (no newer attempt started)
        if (currentAttempt !== connectAttemptRef.current || !mounted) {
          return
        }

        // Create room
        const room = new Room()
        roomRef.current = room

        // --- Event Handlers ---

        // Track subscribed (remote participant's track becomes available)
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return

          if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
            // Route screen share tracks to separate ref
            const isScreenShare = publication.source === Track.Source.ScreenShare
            const targetRef = isScreenShare ? remoteScreenSharesRef : remoteStreamsRef

            // Get or create stream for this participant
            let stream = targetRef.current.get(participant.identity)
            if (!stream) {
              stream = new MediaStream()
              targetRef.current.set(participant.identity, stream)
            }
            stream.addTrack(track.mediaStreamTrack)
            forceUpdate()

            // Update participant state using publication mute state (more reliable than track.enabled)
            if (isScreenShare) {
              const databaseId = getDatabaseId(participant.identity)
              getStore().updateParticipant(databaseId, {
                isScreenSharing: !publication.isMuted,
              })
            } else if (track.kind === Track.Kind.Video) {
              const databaseId = getDatabaseId(participant.identity)
              getStore().updateParticipant(databaseId, {
                isVideoEnabled: !publication.isMuted,
              })
            } else if (track.kind === Track.Kind.Audio) {
              const databaseId = getDatabaseId(participant.identity)
              getStore().updateParticipant(databaseId, {
                isAudioEnabled: !publication.isMuted,
              })
            }
          }
        })

        // Track unsubscribed - properly remove tracks from stream
        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return

          // Determine which ref to clean up from based on track source
          const isScreenShare = publication.source === Track.Source.ScreenShare
          const targetRef = isScreenShare ? remoteScreenSharesRef : remoteStreamsRef

          const stream = targetRef.current.get(participant.identity)
          if (stream) {
            stream.removeTrack(track.mediaStreamTrack)
            // Clean up empty streams
            if (stream.getTracks().length === 0) {
              targetRef.current.delete(participant.identity)
            }
          }
          forceUpdate()
        })

        // Track muted/unmuted - use publication state for accurate remote mute status
        room.on(RoomEvent.TrackMuted, (publication, participant) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          const localIdentity = room.localParticipant?.identity
          if (participant.identity === localIdentity) return // Skip self

          const databaseId = getDatabaseId(participant.identity)
          if (publication.kind === Track.Kind.Video) {
            getStore().updateParticipant(databaseId, { isVideoEnabled: false })
          } else if (publication.kind === Track.Kind.Audio) {
            getStore().updateParticipant(databaseId, { isAudioEnabled: false })
          }
          if (publication.source === Track.Source.ScreenShare) {
            getStore().updateParticipant(databaseId, { isScreenSharing: false })
          }
        })

        room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          const localIdentity = room.localParticipant?.identity
          if (participant.identity === localIdentity) return // Skip self

          const databaseId = getDatabaseId(participant.identity)
          if (publication.kind === Track.Kind.Video) {
            getStore().updateParticipant(databaseId, { isVideoEnabled: true })
          } else if (publication.kind === Track.Kind.Audio) {
            getStore().updateParticipant(databaseId, { isAudioEnabled: true })
          }
          if (publication.source === Track.Source.ScreenShare) {
            getStore().updateParticipant(databaseId, { isScreenSharing: true })
          }
        })

        // Participant connected - handle real-time connections
        // Note: Initial participants are handled via socket events for proper identity mapping
        room.on(RoomEvent.ParticipantConnected, (participant) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          const localIdentity = room.localParticipant?.identity
          if (participant.identity === localIdentity) return // Skip self

          // For now, add with LiveKit identity - socket events will update with proper mapping
          // This ensures we don't miss participants if socket events fail
          const databaseId = getDatabaseId(participant.identity)
          const state = getParticipantState(participant)
          getStore().addParticipant({
            userId: databaseId,
            userName: participant.name || undefined,
            ...state,
          })
        })

        // Participant disconnected
        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          remoteStreamsRef.current.delete(participant.identity)
          remoteScreenSharesRef.current.delete(participant.identity) // Also clean up screen share
          const databaseId = getDatabaseId(participant.identity)
          getStore().removeParticipant(databaseId)
          forceUpdate()
        })

        // Screen share tracking
        room.on(RoomEvent.TrackPublished, (publication, participant) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          if (publication.source === Track.Source.ScreenShare) {
            const localIdentity = room.localParticipant?.identity
            const databaseId = getDatabaseId(participant.identity)
            getStore().updateParticipant(databaseId, {
              isScreenSharing: true,
            })
            if (participant.identity === localIdentity) {
              setIsScreenSharing(true)
            }
          }
        })

        room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          if (publication.source === Track.Source.ScreenShare) {
            const localIdentity = room.localParticipant?.identity
            const databaseId = getDatabaseId(participant.identity)
            getStore().updateParticipant(databaseId, {
              isScreenSharing: false,
            })
            if (participant.identity === localIdentity) {
              setIsScreenSharing(false)
            }
          }
        })

        // Connection state handlers
        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          setConnectionState(state)
        })

        room.on(RoomEvent.Disconnected, () => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          // Clear remote streams on disconnect (don't reset store here - let cleanupRoom handle it)
          remoteStreamsRef.current.clear()
          remoteScreenSharesRef.current.clear() // Also clear screen shares
          forceUpdate()
        })

        room.on(RoomEvent.Reconnecting, () => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          console.log('[LiveKit] Reconnecting...')
        })

        room.on(RoomEvent.Reconnected, () => {
          if (!mounted || currentAttempt !== connectAttemptRef.current) return
          console.log('[LiveKit] Reconnected')
        })

        // Connect to room
        await room.connect(url, token)

        // Check again after async operation
        if (currentAttempt !== connectAttemptRef.current || !mounted) {
          room.disconnect()
          return
        }

        // Create and publish local tracks
        const tracks: MediaStreamTrack[] = []

        if (initialVideoEnabled) {
          try {
            const videoTrack = await createLocalVideoTrack({
              resolution: { width: 1280, height: 720 },
            })
            localVideoTrackRef.current = videoTrack
            await room.localParticipant.publishTrack(videoTrack)
            tracks.push(videoTrack.mediaStreamTrack)
          } catch (error) {
            console.error('[LiveKit] Failed to create video track:', error)
            setIsVideoEnabled(false)
          }
        }

        if (initialAudioEnabled) {
          try {
            const audioTrack = await createLocalAudioTrack()
            localAudioTrackRef.current = audioTrack
            await room.localParticipant.publishTrack(audioTrack)
            tracks.push(audioTrack.mediaStreamTrack)
          } catch (error) {
            console.error('[LiveKit] Failed to create audio track:', error)
            setIsAudioEnabled(false)
          }
        }

        if (tracks.length > 0) {
          const stream = new MediaStream(tracks)
          setLocalStream(stream)
        }

        // Set up identity mapping for local participant
        const localIdentity = room.localParticipant.identity
        setIdentityMapping(localIdentity, user.id)

        // Broadcast LiveKit identity mapping to other participants
        if (socket?.connected && meetId) {
          socket.emit('meet:livekit-identity', {
            meetId,
            userId: user.id,
            liveKitIdentity: localIdentity,
          })
        }

        // Add self as participant using database user ID
        getStore().addParticipant({
          userId: user.id, // Always use database ID
          userName: user.name,
          profilePic: user.profilePic,
          isVideoEnabled: localVideoTrackRef.current !== null,
          isAudioEnabled: localAudioTrackRef.current !== null,
          isScreenSharing: false,
        })

        // Add existing remote participants with their current state
        // Note: These will be updated with proper identity mapping via socket events
        room.remoteParticipants.forEach((participant) => {
          const databaseId = getDatabaseId(participant.identity)
          const state = getParticipantState(participant)
          getStore().addParticipant({
            userId: databaseId,
            userName: participant.name || undefined,
            ...state,
          })
        })

        // Set up socket event handlers for participant synchronization
        if (socket?.connected) {
          const handleParticipantJoined = (data: { userId: string; userName: string; liveKitIdentity?: string }) => {
            if (!mounted || currentAttempt !== connectAttemptRef.current) return

            // Update identity mapping if LiveKit identity is provided
            if (data.liveKitIdentity) {
              setIdentityMapping(data.liveKitIdentity, data.userId)
            }

            // Update or add participant with correct database ID
            const existing = getStore().participants.get(data.userId)
            if (!existing) {
              getStore().addParticipant({
                userId: data.userId,
                userName: data.userName,
                isVideoEnabled: true, // Default state, will be updated by LiveKit events
                isAudioEnabled: true,
                isScreenSharing: false,
              })
            }
          }

          const handleParticipantLeft = (data: { userId: string }) => {
            if (!mounted || currentAttempt !== connectAttemptRef.current) return
            getStore().removeParticipant(data.userId)
          }

          const handleLiveKitIdentity = (data: { userId: string; liveKitIdentity: string }) => {
            if (!mounted || currentAttempt !== connectAttemptRef.current) return
            setIdentityMapping(data.liveKitIdentity, data.userId)
            // Update participant if they exist (in case they were added without proper mapping)
            const existing = getStore().participants.get(data.userId)
            if (existing) {
              // Force a re-render by updating the participant (identity mapping may have changed stream lookup)
              getStore().updateParticipant(data.userId, {})
            }
          }

          socket.on('meet:participant-joined', handleParticipantJoined)
          socket.on('meet:participant-left', handleParticipantLeft)
          socket.on('meet:livekit-identity', handleLiveKitIdentity)

          cleanupSocket = () => {
            socket.off('meet:participant-joined', handleParticipantJoined)
            socket.off('meet:participant-left', handleParticipantLeft)
            socket.off('meet:livekit-identity', handleLiveKitIdentity)
          }
        }
      } catch (error) {
        console.error('[LiveKit] Error connecting to room:', error)
      }
    }

    connectRoom()

    return () => {
      mounted = false
      cleanupSocket?.()
      cleanupRoom()
    }
  }, [meetId, user, initialVideoEnabled, initialAudioEnabled, getStore, forceUpdate, cleanupRoom])

  // Toggle video using LiveKit's API
  const toggleVideo = useCallback(async () => {
    const room = roomRef.current
    if (!room || !user) return

    const prev = isVideoEnabled
    const next = !prev

    try {
      await room.localParticipant.setCameraEnabled(next)
      setIsVideoEnabled(next)

      getStore().updateParticipant(user.id, { isVideoEnabled: next })

      if (next) {
        // Enabling - get the new track and add to stream
        const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
        if (camPub?.track) {
          localVideoTrackRef.current = camPub.track as LocalVideoTrack
          setLocalStream((prevStream) => {
            const s = new MediaStream(prevStream?.getTracks() || [])
            s.getVideoTracks().forEach(t => s.removeTrack(t))
            s.addTrack(camPub.track!.mediaStreamTrack)
            return s
          })
        }
      } else {
        // Disabling - remove video track from stream and clear ref
        localVideoTrackRef.current = null
        setLocalStream((prevStream) => {
          if (!prevStream) return null
          const s = new MediaStream(prevStream.getTracks())
          s.getVideoTracks().forEach(t => s.removeTrack(t))
          return s.getTracks().length ? s : null
        })
      }
    } catch (error) {
      console.error('[LiveKit] Error toggling video:', error)
      // Revert state on error
      setIsVideoEnabled(prev)
    }
  }, [isVideoEnabled, getStore])

  // Toggle audio using LiveKit's API
  const toggleAudio = useCallback(async () => {
    const room = roomRef.current
    if (!room || !user) return

    const prev = isAudioEnabled
    const next = !prev

    try {
      await room.localParticipant.setMicrophoneEnabled(next)
      setIsAudioEnabled(next)

      getStore().updateParticipant(user.id, { isAudioEnabled: next })

      if (next) {
        // Enabling - get the new track and add to stream
        const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
        if (micPub?.track) {
          localAudioTrackRef.current = micPub.track as LocalAudioTrack
          setLocalStream((prevStream) => {
            const s = new MediaStream(prevStream?.getTracks() || [])
            s.getAudioTracks().forEach(t => s.removeTrack(t))
            s.addTrack(micPub.track!.mediaStreamTrack)
            return s
          })
        }
      } else {
        // Disabling - remove audio track from stream and clear ref
        localAudioTrackRef.current = null
        setLocalStream((prevStream) => {
          if (!prevStream) return null
          const s = new MediaStream(prevStream.getTracks())
          s.getAudioTracks().forEach(t => s.removeTrack(t))
          return s.getTracks().length ? s : null
        })
      }
    } catch (error) {
      console.error('[LiveKit] Error toggling audio:', error)
      // Revert state on error
      setIsAudioEnabled(prev)
    }
  }, [isAudioEnabled, getStore])

  // Toggle screen share using LiveKit's native API
  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current
    if (!room || !user) return

    const prev = isScreenSharing
    const next = !prev

    try {
      await room.localParticipant.setScreenShareEnabled(next)
      setIsScreenSharing(next)

      getStore().updateParticipant(user.id, { isScreenSharing: next })
    } catch (error) {
      // User cancelled the screen share dialog or permission denied
      console.error('[LiveKit] Screen share error:', error)
      // State wasn't updated yet if it failed, no revert needed
    }
  }, [isScreenSharing, getStore])

  // Toggle mirror for remote participants - actually flips the video stream sent to others
  const toggleMirrorForRemote = useCallback(async () => {
    const room = roomRef.current
    if (!room || !user) return

    // Cannot mirror while screen sharing or if video is disabled
    if (isScreenSharing) {
      console.warn('[LiveKit] Cannot toggle mirror while screen sharing')
      return
    }

    if (!isVideoEnabled || !localVideoTrackRef.current) {
      console.warn('[LiveKit] Cannot toggle mirror while camera is disabled')
      return
    }

    const next = !isMirroredForRemote

    try {
      if (next) {
        // Enable mirroring: create canvas-based mirrored stream
        const sourceTrack = localVideoTrackRef.current

        // Store original track for restoration later
        originalVideoTrackRef.current = sourceTrack

        // Create hidden video element to capture from
        const video = document.createElement('video')
        video.srcObject = new MediaStream([sourceTrack.mediaStreamTrack])
        video.autoplay = true
        video.playsInline = true
        video.muted = true
        mirrorVideoRef.current = video

        // Get video dimensions from track settings
        const settings = sourceTrack.mediaStreamTrack.getSettings()
        const width = settings.width || 1280
        const height = settings.height || 720

        // Create canvas for mirroring
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        mirrorCanvasRef.current = canvas

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          console.error('[LiveKit] Failed to get canvas context')
          return
        }

        // Start drawing mirrored frames
        const drawFrame = () => {
          if (!mirrorCanvasRef.current || !mirrorVideoRef.current || !ctx) {
            return
          }
          
          if (mirrorVideoRef.current.readyState >= 2) {
            ctx.save()
            ctx.scale(-1, 1) // Flip horizontally
            ctx.drawImage(mirrorVideoRef.current, -canvas.width, 0, canvas.width, canvas.height)
            ctx.restore()
          }
          
          mirrorAnimationFrameRef.current = requestAnimationFrame(drawFrame)
        }

        // Wait for video to be ready, then start drawing and publish
        await new Promise<void>((resolve) => {
          const checkReady = () => {
            if (video.readyState >= 2) {
              resolve()
            } else {
              video.addEventListener('loadeddata', () => resolve(), { once: true })
            }
          }
          checkReady()
        })

        drawFrame()

        // Capture mirrored stream from canvas
        const mirroredStream = canvas.captureStream(30)
        const mirroredVideoTrack = mirroredStream.getVideoTracks()[0]

        if (!mirroredVideoTrack) {
          console.error('[LiveKit] Failed to capture mirrored video track')
          cleanupMirror()
          return
        }

        // Unpublish original track and publish mirrored one
        await room.localParticipant.unpublishTrack(sourceTrack)
        await room.localParticipant.publishTrack(mirroredVideoTrack)

        // Update local stream display
        setLocalStream((prev) => {
          if (prev) {
            const newStream = new MediaStream(prev.getTracks())
            const oldTrack = newStream.getVideoTracks()[0]
            if (oldTrack) {
              newStream.removeTrack(oldTrack)
            }
            newStream.addTrack(mirroredVideoTrack)
            return newStream
          }
          return new MediaStream([mirroredVideoTrack])
        })

        setIsMirroredForRemote(true)
        console.log('[LiveKit] Mirror enabled for remote participants')
      } else {
        // Disable mirroring: restore original track
        const originalTrack = originalVideoTrackRef.current
        if (!originalTrack) {
          console.error('[LiveKit] No original track to restore')
          cleanupMirror()
          setIsMirroredForRemote(false)
          return
        }

        // Get current mirrored track publication
        const currentPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
        if (currentPub?.track) {
          await room.localParticipant.unpublishTrack(currentPub.track)
        }

        // Republish original track
        await room.localParticipant.publishTrack(originalTrack)
        localVideoTrackRef.current = originalTrack

        // Update local stream display
        setLocalStream((prev) => {
          if (prev) {
            const newStream = new MediaStream(prev.getTracks())
            const oldTrack = newStream.getVideoTracks()[0]
            if (oldTrack) {
              newStream.removeTrack(oldTrack)
            }
            newStream.addTrack(originalTrack.mediaStreamTrack)
            return newStream
          }
          return new MediaStream([originalTrack.mediaStreamTrack])
        })

        // Cleanup mirror resources
        cleanupMirror()
        setIsMirroredForRemote(false)
        console.log('[LiveKit] Mirror disabled, original track restored')
      }
    } catch (error) {
      console.error('[LiveKit] Error toggling mirror:', error)
      // Attempt cleanup on error
      cleanupMirror()
    }
  }, [isMirroredForRemote, isVideoEnabled, isScreenSharing, cleanupMirror])

  // Get remote streams mapped to database IDs (camera/audio only, not screen share)
  const getRemoteStreams = useCallback(() => {
    const streams: Array<{ userId: string; stream: MediaStream }> = []
    remoteStreamsRef.current.forEach((stream, liveKitId) => {
      if (stream?.getTracks().length) {
        const databaseId = getDatabaseId(liveKitId)
        streams.push({ userId: databaseId, stream })
      }
    })
    return streams
  }, [getDatabaseId])

  // Get remote screen share stream for a specific user
  const getRemoteScreenShareStream = useCallback((userId: string): MediaStream | null => {
    // Find the LiveKit identity for this database ID
    const liveKitId = getLiveKitId(userId)
    if (liveKitId) {
      const stream = remoteScreenSharesRef.current.get(liveKitId)
      if (stream?.getTracks().length) {
        return stream
      }
    }
    // Fallback: try direct lookup with userId (might be same as LiveKit ID)
    const directStream = remoteScreenSharesRef.current.get(userId)
    if (directStream?.getTracks().length) {
      return directStream
    }
    return null
  }, [getLiveKitId])

  // Change video device - respects current enable state
  const changeVideoDevice = useCallback(async (deviceId: string) => {
    const room = roomRef.current
    if (!room) return
    
    // Only allow device change if video is currently enabled
    if (!isVideoEnabled || !localVideoTrackRef.current) {
      console.warn('[LiveKit] Cannot change video device while camera is disabled')
      return
    }

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
  }, [isVideoEnabled])

  // Change audio input device - respects current enable state
  const changeAudioInput = useCallback(async (deviceId: string) => {
    const room = roomRef.current
    if (!room) return
    
    // Only allow device change if audio is currently enabled
    if (!isAudioEnabled || !localAudioTrackRef.current) {
      console.warn('[LiveKit] Cannot change audio device while microphone is disabled')
      return
    }

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
  }, [isAudioEnabled])

  // Change audio output device
  const changeAudioOutput = useCallback(async (deviceId: string) => {
    // LiveKit handles audio output through HTMLAudioElement
    // This is typically handled in VideoTile component
    try {
      if ('setSinkId' in HTMLAudioElement.prototype) {
        console.log('[LiveKit] Audio output device change requested:', deviceId)
      }
    } catch (error) {
      console.error('[LiveKit] Error changing audio output:', error)
    }
  }, [])

  // Flip camera (switch between front/back) - respects current enable state
  const flipCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    
    if (!isVideoEnabled || !localVideoTrackRef.current) {
      console.warn('[LiveKit] Cannot flip camera while camera is disabled')
      return
    }

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
  }, [isVideoEnabled, changeVideoDevice])

  // Get local screen share stream (separate from camera)
  const getLocalScreenShareStream = useCallback((): MediaStream | null => {
    const room = roomRef.current
    if (!room || !isScreenSharing) return null

    const screenPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
    if (screenPub?.track) {
      return new MediaStream([screenPub.track.mediaStreamTrack])
    }
    return null
  }, [isScreenSharing])

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isMirroredForRemote,
    connectionState,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleMirrorForRemote,
    getRemoteStreams,
    getRemoteScreenShareStream,
    getLocalScreenShareStream,
    streamsUpdateCounter,
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
    flipCamera,
    cleanup: cleanupRoom,
    // Identity mapping helpers (for debugging/advanced use)
    getDatabaseId,
    getLiveKitId,
  }
}
