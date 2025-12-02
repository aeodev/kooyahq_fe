import { useEffect, useRef, useCallback, useState } from 'react'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore, type Participant } from '@/stores/meet.store'
import { RTC_CONFIG, type PeerConnection, type SignalingData, type ParticipantJoinData, type ParticipantStateData, type ExistingParticipantsData } from './types'

export function useWebRTC(
  meetId: string | null,
  initialVideoEnabled = true,
  initialAudioEnabled = true,
  initialStream?: MediaStream
) {
  const socket = useSocketStore((state) => state.socket)
  const connected = useSocketStore((state) => state.connected)
  const user = useAuthStore((state) => state.user)
  const isMirrored = useMeetStore((state) => state.isMirrored)
  const getStore = useCallback(() => useMeetStore.getState(), [])

  // State
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled)
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreamsVersion, setRemoteStreamsVersion] = useState(0)

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map())
  const mirroredStreamRef = useRef<MediaStream | null>(null)
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mirrorVideoRef = useRef<HTMLVideoElement | null>(null)
  const mirrorAnimationRef = useRef<number | null>(null)

  // Update both ref and state when stream changes
  const updateLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream
    setLocalStream(stream)
  }, [])
  
  // Trigger re-render when remote streams change
  const updateRemoteStreams = useCallback(() => setRemoteStreamsVersion((v) => v + 1), [])

  // ==================== LOCAL MEDIA ====================

  const initializeLocalStream = useCallback(async () => {
    try {
      let stream: MediaStream

      if (initialStream) {
        stream = initialStream
        stream.getVideoTracks().forEach((t) => (t.enabled = initialVideoEnabled))
        stream.getAudioTracks().forEach((t) => (t.enabled = initialAudioEnabled))
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: initialVideoEnabled ? { width: 1280, height: 720 } : false,
          audio: initialAudioEnabled || !initialVideoEnabled,
        })
        if (!initialVideoEnabled) stream.getVideoTracks().forEach((t) => (t.enabled = false))
        if (!initialAudioEnabled) stream.getAudioTracks().forEach((t) => (t.enabled = false))
      }

      updateLocalStream(stream)

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
      console.error('Error accessing media devices:', error)
      throw error
    }
  }, [user, initialVideoEnabled, initialAudioEnabled, initialStream, getStore, updateLocalStream])

  // ==================== TOGGLES ====================

  const toggleVideo = useCallback(async () => {
    const newEnabled = !isVideoEnabled
    setIsVideoEnabled(newEnabled)

    try {
      if (newEnabled) {
        // Re-acquire video if no tracks exist
        if (!localStreamRef.current?.getVideoTracks().length) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: false,
          })
          const newTrack = stream.getVideoTracks()[0]
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(newTrack)
          } else {
            localStreamRef.current = stream
          }
        } else {
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = true))
        }
      } else {
        localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false))
      }

      // Update peer connections immediately
      const track = newEnabled ? localStreamRef.current?.getVideoTracks()[0] : null
      peerConnectionsRef.current.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) {
          sender.replaceTrack(track ?? null).catch(console.error)
        }
      })

      // Trigger re-render with updated stream state
      setLocalStream(localStreamRef.current)

      // Emit state to peers
      if (socket?.connected && meetId && user) {
        socket.emit('meet:participant-state', { meetId, isVideoEnabled: newEnabled })
      }
      if (user) getStore().updateParticipant(user.id, { isVideoEnabled: newEnabled })
    } catch (error) {
      console.error('Failed to toggle video:', error)
      setIsVideoEnabled(!newEnabled) // Revert on error
    }
  }, [isVideoEnabled, socket, meetId, user, getStore])

  const toggleAudio = useCallback(() => {
    const newEnabled = !isAudioEnabled
    setIsAudioEnabled(newEnabled)

    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = newEnabled))

    // Emit state to peers
    if (socket?.connected && meetId && user) {
      socket.emit('meet:participant-state', { meetId, isAudioEnabled: newEnabled })
    }
    if (user) getStore().updateParticipant(user.id, { isAudioEnabled: newEnabled })
  }, [isAudioEnabled, socket, meetId, user, getStore])

  // ==================== SCREEN SHARING ====================

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        screenStreamRef.current?.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null

        // Restore camera track
        const videoTrack = localStreamRef.current?.getVideoTracks()[0]
        peerConnectionsRef.current.forEach(({ peerConnection }) => {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
          if (sender && videoTrack) sender.replaceTrack(videoTrack)
        })

        setIsScreenSharing(false)
        if (user) {
          getStore().updateParticipant(user.id, { isScreenSharing: false })
          socket?.emit('meet:participant-state', { meetId, isScreenSharing: false })
        }
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        if (!screenStream.getVideoTracks().length) return

        screenStreamRef.current = screenStream
        const screenTrack = screenStream.getVideoTracks()[0]

        peerConnectionsRef.current.forEach(({ peerConnection }) => {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        })

        setIsScreenSharing(true)
        if (user) {
          getStore().updateParticipant(user.id, { isScreenSharing: true })
          socket?.emit('meet:participant-state', { meetId, isScreenSharing: true })
        }

        // Handle browser stop
        screenTrack.onended = () => {
          screenStreamRef.current?.getTracks().forEach((t) => t.stop())
          screenStreamRef.current = null
          const videoTrack = localStreamRef.current?.getVideoTracks()[0]
          peerConnectionsRef.current.forEach(({ peerConnection }) => {
            const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
            if (sender && videoTrack) sender.replaceTrack(videoTrack)
          })
          setIsScreenSharing(false)
          if (user) {
            getStore().updateParticipant(user.id, { isScreenSharing: false })
            socket?.emit('meet:participant-state', { meetId, isScreenSharing: false })
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'NotAllowedError') {
        console.error('Error toggling screen share:', error)
      }
    }
  }, [isScreenSharing, user, socket, meetId, getStore])

  // ==================== MIRRORING ====================

  const createMirroredStream = useCallback((source: MediaStream): MediaStream | null => {
    const videoTrack = source.getVideoTracks()[0]
    if (!videoTrack) return null

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = 1280
    canvas.height = 720

    const video = document.createElement('video')
    video.srcObject = source
    video.autoplay = true
    video.playsInline = true
    mirrorVideoRef.current = video

    const settings = videoTrack.getSettings()
    if (settings.width && settings.height) {
      canvas.width = settings.width
      canvas.height = settings.height
    }

    video.onloadedmetadata = () => {
      if (video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
    }

    let lastTime = 0
    const drawFrame = (timestamp: number) => {
      if (timestamp - lastTime >= 33) {
        // ~30fps
        if (canvas.width > 0 && video.readyState >= 2) {
          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
          ctx.restore()
        }
        lastTime = timestamp
      }
      mirrorAnimationRef.current = requestAnimationFrame(drawFrame)
    }

    video.onplay = () => drawFrame(0)
    mirrorCanvasRef.current = canvas

    const mirrored = canvas.captureStream(30)
    const audioTrack = source.getAudioTracks()[0]
    if (audioTrack) mirrored.addTrack(audioTrack.clone())

    mirroredStreamRef.current = mirrored
    return mirrored
  }, [])

  // Apply mirroring to peer connections
  useEffect(() => {
    if (!localStreamRef.current || isScreenSharing) return

    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (!videoTrack?.enabled) return

    if (isMirrored) {
      const mirrored = createMirroredStream(localStreamRef.current)
      if (mirrored) {
        const mirroredTrack = mirrored.getVideoTracks()[0]
        peerConnectionsRef.current.forEach(({ peerConnection }) => {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
          if (sender && mirroredTrack) sender.replaceTrack(mirroredTrack)
        })
      }
    } else {
      peerConnectionsRef.current.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && videoTrack) sender.replaceTrack(videoTrack)
      })
      // Cleanup mirroring
      mirroredStreamRef.current?.getTracks().forEach((t) => t.stop())
      mirroredStreamRef.current = null
      if (mirrorAnimationRef.current) cancelAnimationFrame(mirrorAnimationRef.current)
    }
  }, [isMirrored, isScreenSharing, createMirroredStream])

  // ==================== DEVICE SWITCHING ====================

  const changeVideoDevice = useCallback(async (deviceId: string) => {
    if (!localStreamRef.current) return
    try {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
        audio: audioTrack ? { deviceId: audioTrack.getSettings().deviceId } : true,
      })

      const newTrack = stream.getVideoTracks()[0]
      const oldTrack = localStreamRef.current.getVideoTracks()[0]

      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack)
        oldTrack.stop()
      }
      localStreamRef.current.addTrack(newTrack)

      peerConnectionsRef.current.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(newTrack)
        else if (localStreamRef.current) peerConnection.addTrack(newTrack, localStreamRef.current)
      })

      stream.getAudioTracks().forEach((t) => t.stop())
      setLocalStream(localStreamRef.current)
    } catch (error) {
      console.error('Error changing video device:', error)
    }
  }, [])

  const changeAudioInput = useCallback(async (deviceId: string) => {
    if (!localStreamRef.current) return
    try {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoTrack ? { deviceId: videoTrack.getSettings().deviceId, width: 1280, height: 720 } : false,
        audio: { deviceId: { exact: deviceId } },
      })

      const newTrack = stream.getAudioTracks()[0]
      const oldTrack = localStreamRef.current.getAudioTracks()[0]

      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack)
        oldTrack.stop()
      }
      localStreamRef.current.addTrack(newTrack)

      peerConnectionsRef.current.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'audio')
        if (sender) sender.replaceTrack(newTrack)
        else if (localStreamRef.current) peerConnection.addTrack(newTrack, localStreamRef.current)
      })

      stream.getVideoTracks().forEach((t) => t.stop())
    } catch (error) {
      console.error('Error changing audio input:', error)
    }
  }, [])

  const changeAudioOutput = useCallback((deviceId: string) => {
    if ('setSinkId' in HTMLAudioElement.prototype) {
      document.querySelectorAll('audio, video').forEach((el) => {
        (el as HTMLAudioElement).setSinkId?.(deviceId).catch(console.error)
      })
    }
  }, [])

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return
    try {
      const current = localStreamRef.current.getVideoTracks()[0]
      if (!current) return

      const facingMode = current.getSettings().facingMode === 'user' ? 'environment' : 'user'
      const audioTrack = localStreamRef.current.getAudioTracks()[0]

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: 1280, height: 720 },
        audio: audioTrack ? { deviceId: audioTrack.getSettings().deviceId } : true,
      })

      const newTrack = stream.getVideoTracks()[0]
      localStreamRef.current.removeTrack(current)
      current.stop()
      localStreamRef.current.addTrack(newTrack)

      peerConnectionsRef.current.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(newTrack)
      })

      stream.getAudioTracks().forEach((t) => t.stop())
      setLocalStream(localStreamRef.current)
    } catch (error) {
      console.error('Error flipping camera:', error)
    }
  }, [])

  // ==================== PEER CONNECTIONS ====================

  const createPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(RTC_CONFIG)

      // Add local tracks
      const streamToUse = isMirrored && mirroredStreamRef.current ? mirroredStreamRef.current : localStreamRef.current
      streamToUse?.getTracks().forEach((track) => pc.addTrack(track, streamToUse))

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (!remoteStream?.getTracks().length) return

        const existing = peerConnectionsRef.current.get(userId)
        if (existing?.stream?.id !== remoteStream.id) {
          peerConnectionsRef.current.set(userId, { peerConnection: pc, stream: remoteStream })
          updateRemoteStreams()
        }
      }

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket?.connected && meetId) {
          socket.emit('meet:ice-candidate', {
            meetId,
            candidate: event.candidate.toJSON(),
            targetUserId: userId,
          })
        }
      }

      // Connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          getStore().removeParticipant(userId)
          peerConnectionsRef.current.delete(userId)
          updateRemoteStreams()
        }
      }

      return pc
    },
    [socket, meetId, isMirrored, getStore, updateRemoteStreams]
  )

  const createOffer = useCallback(
    async (userId: string) => {
      if (!localStreamRef.current) return

      const existing = peerConnectionsRef.current.get(userId)
      if (existing) {
        const state = existing.peerConnection.connectionState
        if (state !== 'closed' && state !== 'failed' && existing.peerConnection.signalingState !== 'stable') return
        existing.peerConnection.close()
        peerConnectionsRef.current.delete(userId)
      }

      const pc = createPeerConnection(userId)
      peerConnectionsRef.current.set(userId, { peerConnection: pc, stream: null })

      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        await pc.setLocalDescription(offer)

        if (socket?.connected && meetId) {
          socket.emit('meet:offer', {
            meetId,
            offer: { type: offer.type, sdp: offer.sdp || '' },
            targetUserId: userId,
          })
        }
      } catch (error) {
        console.error('Error creating offer:', error)
      }
    },
    [createPeerConnection, socket, meetId]
  )

  const handleOffer = useCallback(
    async (data: SignalingData) => {
      const { fromUserId, offer } = data
      if (!offer) return

      let pc = peerConnectionsRef.current.get(fromUserId)?.peerConnection
      if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        pc = createPeerConnection(fromUserId)
        peerConnectionsRef.current.set(fromUserId, { peerConnection: pc, stream: null })
      }

      try {
        if (pc.signalingState !== 'stable') {
          pc.close()
          pc = createPeerConnection(fromUserId)
          peerConnectionsRef.current.set(fromUserId, { peerConnection: pc, stream: null })
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        if (socket?.connected && meetId) {
          socket.emit('meet:answer', {
            meetId,
            answer: { type: answer.type, sdp: answer.sdp || '' },
            targetUserId: fromUserId,
          })
        }
      } catch (error) {
        console.error('Error handling offer:', error)
      }
    },
    [createPeerConnection, socket, meetId]
  )

  const handleAnswer = useCallback(async (data: SignalingData) => {
    const { fromUserId, answer } = data
    if (!answer) return

    const peerConn = peerConnectionsRef.current.get(fromUserId)
    if (peerConn?.peerConnection.signalingState === 'have-local-offer') {
      try {
        await peerConn.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (error) {
        console.error('Error handling answer:', error)
      }
    }
  }, [])

  const handleIceCandidate = useCallback(async (data: SignalingData) => {
    const { fromUserId, candidate } = data
    if (!candidate) return

    const peerConn = peerConnectionsRef.current.get(fromUserId)
    if (peerConn?.peerConnection.remoteDescription) {
      try {
        await peerConn.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        if (candidate.candidate) console.error('Error adding ICE candidate:', error)
      }
    }
  }, [])

  // ==================== SOCKET SIGNALING ====================

  const handleUserJoined = useCallback(
    (data: ParticipantJoinData) => {
      if (data.userId === user?.id || data.meetId !== meetId) return

      if (!getStore().participants.has(data.userId)) {
        getStore().addParticipant({
          userId: data.userId,
          userName: data.userName,
          profilePic: data.profilePic,
          isVideoEnabled: true,
          isAudioEnabled: true,
          isScreenSharing: false,
        })
        createOffer(data.userId)
      }
    },
    [user, meetId, createOffer, getStore]
  )

  const handleExistingParticipants = useCallback(
    (data: ExistingParticipantsData) => {
      if (data.meetId !== meetId) return

      data.participants.forEach((p) => {
        if (p.userId !== user?.id && !getStore().participants.has(p.userId)) {
          getStore().addParticipant({
            userId: p.userId,
            userName: p.userName,
            profilePic: p.profilePic,
            isVideoEnabled: true,
            isAudioEnabled: true,
            isScreenSharing: false,
          })
          createOffer(p.userId)
        }
      })
    },
    [user, meetId, createOffer, getStore]
  )

  const handleUserLeft = useCallback(
    (data: { userId: string; meetId: string }) => {
      if (data.meetId !== meetId) return
      getStore().removeParticipant(data.userId)
      const peerConn = peerConnectionsRef.current.get(data.userId)
      if (peerConn) {
        peerConn.peerConnection.close()
        peerConnectionsRef.current.delete(data.userId)
      }
    },
    [meetId, getStore]
  )

  const handleParticipantState = useCallback(
    (data: ParticipantStateData) => {
      if (data.meetId !== meetId || data.userId === user?.id) return
      const updates: Partial<Participant> = {}
      if (data.isVideoEnabled !== undefined) updates.isVideoEnabled = data.isVideoEnabled
      if (data.isAudioEnabled !== undefined) updates.isAudioEnabled = data.isAudioEnabled
      if (data.isScreenSharing !== undefined) updates.isScreenSharing = data.isScreenSharing
      if (Object.keys(updates).length) getStore().updateParticipant(data.userId, updates)
    },
    [meetId, user, getStore]
  )

  // Socket event listeners
  useEffect(() => {
    if (!socket?.connected || !connected || !meetId) return

    socket.on('meet:offer', handleOffer)
    socket.on('meet:answer', handleAnswer)
    socket.on('meet:ice-candidate', handleIceCandidate)
    socket.on('meet:user-joined', handleUserJoined)
    socket.on('meet:existing-participants', handleExistingParticipants)
    socket.on('meet:user-left', handleUserLeft)
    socket.on('meet:participant-state-updated', handleParticipantState)

    return () => {
      socket.off('meet:offer', handleOffer)
      socket.off('meet:answer', handleAnswer)
      socket.off('meet:ice-candidate', handleIceCandidate)
      socket.off('meet:user-joined', handleUserJoined)
      socket.off('meet:existing-participants', handleExistingParticipants)
      socket.off('meet:user-left', handleUserLeft)
      socket.off('meet:participant-state-updated', handleParticipantState)
    }
  }, [socket, connected, meetId, handleOffer, handleAnswer, handleIceCandidate, handleUserJoined, handleExistingParticipants, handleUserLeft, handleParticipantState])

  // Join room
  useEffect(() => {
    if (!meetId || !connected || !socket || !user) return

    socket.emit('meet:join', meetId)
    socket.on('connect', () => socket.emit('meet:join', meetId))

    return () => {
      socket.off('connect')
      if (socket.connected) socket.emit('meet:leave', meetId)
    }
  }, [meetId, connected, socket, user])

  // Initialize stream
  useEffect(() => {
    if (meetId && user) {
      initializeLocalStream()
    }

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      mirroredStreamRef.current?.getTracks().forEach((t) => t.stop())
      peerConnectionsRef.current.forEach(({ peerConnection }) => peerConnection.close())
      peerConnectionsRef.current.clear()
      if (mirrorAnimationRef.current) cancelAnimationFrame(mirrorAnimationRef.current)
    }
  }, [meetId, user, initializeLocalStream])

  // Cleanup function
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    mirroredStreamRef.current?.getTracks().forEach((t) => t.stop())
    peerConnectionsRef.current.forEach(({ peerConnection }) => peerConnection.close())
    peerConnectionsRef.current.clear()
    if (mirrorAnimationRef.current) cancelAnimationFrame(mirrorAnimationRef.current)
  }, [])

  // Get remote streams
  const getRemoteStreams = useCallback(() => {
    const streams: Array<{ userId: string; stream: MediaStream }> = []
    peerConnectionsRef.current.forEach(({ stream }, userId) => {
      if (stream?.getTracks().length) streams.push({ userId, stream })
    })
    return streams
  }, [remoteStreamsVersion])

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    getRemoteStreams,
    streamsUpdateCounter: remoteStreamsVersion,
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
    flipCamera,
    cleanup,
  }
}
