import { useEffect, useRef, useCallback, useState } from 'react'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore, type Participant } from '@/stores/meet.store'
import { RTC_CONFIG, type PeerConnection, type SignalingData, type ParticipantJoinData, type ParticipantStateData, type ExistingParticipantsData } from './types'

export function useWebRTC(
  meetId: string | null,
  initialVideoEnabled = true,
  initialAudioEnabled = true
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
  const [streamVersion, setStreamVersion] = useState(0)

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map())
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const mirroredStreamRef = useRef<MediaStream | null>(null)
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mirrorVideoRef = useRef<HTMLVideoElement | null>(null)
  const mirrorAnimationRef = useRef<number | null>(null)
  const isInitializedRef = useRef(false)

  const forceUpdate = useCallback(() => setStreamVersion((v) => v + 1), [])

  // ==================== LOCAL MEDIA ====================

  const initializeLocalStream = useCallback(async () => {
    try {
      console.log(`[WebRTC] Requesting media devices`, { video: initialVideoEnabled, audio: initialAudioEnabled })
      const stream = await navigator.mediaDevices.getUserMedia({
        video: initialVideoEnabled ? { width: 1280, height: 720 } : false,
        audio: initialAudioEnabled || !initialVideoEnabled,
      })
      console.log(`[WebRTC] Got media stream`, {
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      })
      
      if (!initialVideoEnabled) stream.getVideoTracks().forEach((t) => (t.enabled = false))
      if (!initialAudioEnabled) stream.getAudioTracks().forEach((t) => (t.enabled = false))

      localStreamRef.current = stream
      forceUpdate()

      if (user) {
        getStore().addParticipant({
          userId: user.id,
          userName: user.name,
          profilePic: user.profilePic,
          isVideoEnabled: initialVideoEnabled,
          isAudioEnabled: initialAudioEnabled,
          isScreenSharing: false,
        })
        console.log(`[WebRTC] Added self as participant`)
      }
    } catch (error) {
      console.error(`[WebRTC] Error accessing media devices:`, error)
      throw error
    }
  }, [user, initialVideoEnabled, initialAudioEnabled, getStore, forceUpdate])

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

      forceUpdate()

      // Emit state to peers
      if (socket?.connected && meetId && user) {
        socket.emit('meet:participant-state', { meetId, isVideoEnabled: newEnabled })
      }
      if (user) getStore().updateParticipant(user.id, { isVideoEnabled: newEnabled })
    } catch (error) {
      console.error('Failed to toggle video:', error)
      setIsVideoEnabled(!newEnabled) // Revert on error
    }
  }, [isVideoEnabled, socket, meetId, user, getStore, forceUpdate])

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
      forceUpdate()
    } catch (error) {
      console.error('Error changing video device:', error)
    }
  }, [forceUpdate])

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
      forceUpdate()
    } catch (error) {
      console.error('Error flipping camera:', error)
    }
  }, [forceUpdate])

  // ==================== PEER CONNECTIONS ====================

  const createPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(RTC_CONFIG)

      // Add local tracks
      const streamToUse = isMirrored && mirroredStreamRef.current ? mirroredStreamRef.current : localStreamRef.current
      streamToUse?.getTracks().forEach((track) => pc.addTrack(track, streamToUse))

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log(`[WebRTC] ontrack event for ${userId}`, {
          streams: event.streams.length,
          tracks: event.track ? { kind: event.track.kind, enabled: event.track.enabled, readyState: event.track.readyState } : null,
        })
        const [remoteStream] = event.streams
        if (!remoteStream?.getTracks().length) {
          console.warn(`[WebRTC] Remote stream has no tracks for ${userId}`)
          return
        }

        console.log(`[WebRTC] Setting remote stream for ${userId}`, {
          streamId: remoteStream.id,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
        })

        const existing = peerConnectionsRef.current.get(userId)
        if (existing?.stream?.id !== remoteStream.id) {
          peerConnectionsRef.current.set(userId, { peerConnection: pc, stream: remoteStream })
          forceUpdate()
        }
      }

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket?.connected && meetId) {
          console.log(`[WebRTC] Sending ICE candidate to ${userId}`, event.candidate.candidate?.substring(0, 50))
          socket.emit('meet:ice-candidate', {
            meetId,
            candidate: event.candidate.toJSON(),
            targetUserId: userId,
          })
        } else if (!event.candidate) {
          console.log(`[WebRTC] ICE gathering complete for ${userId}`)
        }
      }

      // Connection state
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state changed for ${userId}:`, pc.connectionState, pc.iceConnectionState)
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          getStore().removeParticipant(userId)
          peerConnectionsRef.current.delete(userId)
          forceUpdate()
        }
      }
      
      // Log ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE connection state for ${userId}:`, pc.iceConnectionState)
      }

      return pc
    },
    [socket, meetId, isMirrored, getStore, forceUpdate]
  )

  const createOffer = useCallback(
    async (userId: string, retryCount = 0) => {
      console.log(`[WebRTC] createOffer called for ${userId}`, { retryCount, hasLocalStream: !!localStreamRef.current })
      
      // Wait for local stream to be ready (max 5 retries)
      if (!localStreamRef.current) {
        if (retryCount < 5) {
          console.warn(`[WebRTC] Local stream not ready for offer to ${userId}, retrying... (${retryCount + 1}/5)`)
          setTimeout(() => createOffer(userId, retryCount + 1), 500)
        } else {
          console.error(`[WebRTC] Failed to create offer to ${userId}: local stream never became ready`)
        }
        return
      }

      const existing = peerConnectionsRef.current.get(userId)
      if (existing) {
        const state = existing.peerConnection.connectionState
        const signalingState = existing.peerConnection.signalingState
        
        // If already connected or connecting, don't create new offer
        if (state === 'connected' || state === 'connecting') {
          console.log(`[WebRTC] Connection to ${userId} already ${state}, skipping offer creation`)
          return
        }
        
        // If signaling is in progress (not stable), wait - don't interrupt
        if (signalingState !== 'stable' && state !== 'closed' && state !== 'failed') {
          console.log(`[WebRTC] Signaling in progress for ${userId}, skipping duplicate offer`, { signalingState, state })
          return
        }
        
        // Only close if truly broken
        if (state === 'closed' || state === 'failed') {
          console.log(`[WebRTC] Closing broken connection to ${userId}`)
          existing.peerConnection.close()
          peerConnectionsRef.current.delete(userId)
        } else {
          // Connection exists and is valid, don't recreate
          console.log(`[WebRTC] Valid connection exists to ${userId}, skipping offer creation`)
          return
        }
      }

      console.log(`[WebRTC] Creating peer connection and offer for ${userId}`)
      const pc = createPeerConnection(userId)
      peerConnectionsRef.current.set(userId, { peerConnection: pc, stream: null })

      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        console.log(`[WebRTC] Created offer for ${userId}`, { type: offer.type, sdpLength: offer.sdp?.length })
        await pc.setLocalDescription(offer)

        if (socket?.connected && meetId) {
          console.log(`[WebRTC] Sending offer to ${userId}`)
          socket.emit('meet:offer', {
            meetId,
            offer: { type: offer.type, sdp: offer.sdp || '' },
            targetUserId: userId,
          })
        } else {
          console.error(`[WebRTC] Cannot send offer - socket not connected or no meetId`, { socketConnected: socket?.connected, meetId })
        }
      } catch (error) {
        console.error(`[WebRTC] Error creating offer for ${userId}:`, error)
      }
    },
    [createPeerConnection, socket, meetId]
  )

  // Helper to flush pending ICE candidates after remote description is set
  const flushPendingIceCandidates = useCallback(async (userId: string) => {
    const pending = pendingIceCandidatesRef.current.get(userId)
    if (!pending || pending.length === 0) return
    
    const peerConn = peerConnectionsRef.current.get(userId)
    if (!peerConn?.peerConnection.remoteDescription) return
    
    for (const candidate of pending) {
      try {
        await peerConn.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        if (candidate.candidate) console.error('Error adding buffered ICE candidate:', error)
      }
    }
    pendingIceCandidatesRef.current.delete(userId)
  }, [])

  const handleOffer = useCallback(
    async (data: SignalingData, retryCount = 0) => {
      const { fromUserId, offer } = data
      console.log(`[WebRTC] Received offer from ${fromUserId}`, { retryCount, hasOffer: !!offer, hasLocalStream: !!localStreamRef.current })
      
      if (!offer) {
        console.warn(`[WebRTC] No offer in data from ${fromUserId}`)
        return
      }
      
      // Wait for local stream to be ready (max 5 retries)
      if (!localStreamRef.current) {
        if (retryCount < 5) {
          console.warn(`[WebRTC] Received offer but local stream not ready, retrying... (${retryCount + 1}/5)`)
          setTimeout(() => handleOffer(data, retryCount + 1), 500)
        } else {
          console.error(`[WebRTC] Failed to handle offer from ${fromUserId}: local stream never became ready`)
        }
        return
      }

      let pc = peerConnectionsRef.current.get(fromUserId)?.peerConnection
      
      // If peer connection exists, check if we should use it or recreate
      if (pc) {
        const state = pc.connectionState
        const signalingState = pc.signalingState
        
        // If connection is already established, ignore duplicate offer
        if (state === 'connected' || state === 'connecting') {
          console.log(`[WebRTC] Ignoring offer from ${fromUserId} - connection already ${state}`)
          return
        }
        
        // If signaling state is stable and connection is valid, ignore
        if (signalingState === 'stable' && state !== 'closed' && state !== 'failed') {
          console.log(`[WebRTC] Ignoring offer from ${fromUserId} - already stable`)
          return
        }
        
        // Only close if truly broken
        if (state === 'closed' || state === 'failed') {
          console.log(`[WebRTC] Closing broken connection to ${fromUserId}`)
          pc.close()
          peerConnectionsRef.current.delete(fromUserId)
          pc = undefined
        } else if (signalingState !== 'stable' && signalingState !== 'have-local-offer') {
          // If signaling is in progress but not in right state, wait
          console.log(`[WebRTC] Connection to ${fromUserId} not in right state, waiting...`, { signalingState, state })
          return
        }
      }

      // Create new connection only if needed
      if (!pc) {
        console.log(`[WebRTC] Creating new peer connection for offer from ${fromUserId}`)
        pc = createPeerConnection(fromUserId)
        peerConnectionsRef.current.set(fromUserId, { peerConnection: pc, stream: null })
      }

      try {
        // Only set remote description if signaling state allows it
        if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
          console.log(`[WebRTC] Setting remote description for offer from ${fromUserId}`)
          await pc.setRemoteDescription(new RTCSessionDescription(offer))
        } else {
          console.warn(`[WebRTC] Cannot set remote description - wrong signaling state`, { signalingState: pc.signalingState })
          return
        }
        
        // Flush any pending ICE candidates
        await flushPendingIceCandidates(fromUserId)
        
        console.log(`[WebRTC] Creating answer for ${fromUserId}`)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        if (socket?.connected && meetId) {
          console.log(`[WebRTC] Sending answer to ${fromUserId}`)
          socket.emit('meet:answer', {
            meetId,
            answer: { type: answer.type, sdp: answer.sdp || '' },
            targetUserId: fromUserId,
          })
        } else {
          console.error(`[WebRTC] Cannot send answer - socket not connected or no meetId`, { socketConnected: socket?.connected, meetId })
        }
      } catch (error) {
        console.error(`[WebRTC] Error handling offer from ${fromUserId}:`, error)
        // If error is about m-line order, close and recreate
        if (error instanceof Error && error.message.includes('m-lines')) {
          console.log(`[WebRTC] M-line order error, closing and will recreate on next offer`)
          pc.close()
          peerConnectionsRef.current.delete(fromUserId)
        }
      }
    },
    [createPeerConnection, socket, meetId, flushPendingIceCandidates]
  )

  const handleAnswer = useCallback(async (data: SignalingData) => {
    const { fromUserId, answer } = data
    console.log(`[WebRTC] Received answer from ${fromUserId}`, { hasAnswer: !!answer })
    
    if (!answer) {
      console.warn(`[WebRTC] No answer in data from ${fromUserId}`)
      return
    }

    const peerConn = peerConnectionsRef.current.get(fromUserId)
    if (!peerConn) {
      console.error(`[WebRTC] No peer connection found for answer from ${fromUserId}`)
      return
    }
    
    const signalingState = peerConn.peerConnection.signalingState
    
    // If already stable, answer was already processed (this is fine - ignore)
    if (signalingState === 'stable') {
      console.log(`[WebRTC] Answer from ${fromUserId} already processed (state is stable), ignoring`)
      return
    }
    
    if (signalingState === 'have-local-offer') {
      try {
        console.log(`[WebRTC] Setting remote description for answer from ${fromUserId}`)
        await peerConn.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        // Flush any pending ICE candidates
        await flushPendingIceCandidates(fromUserId)
        console.log(`[WebRTC] Successfully processed answer from ${fromUserId}`)
      } catch (error) {
        console.error(`[WebRTC] Error handling answer from ${fromUserId}:`, error)
      }
    } else {
      console.warn(`[WebRTC] Wrong signaling state for answer from ${fromUserId}`, { signalingState })
    }
  }, [flushPendingIceCandidates])

  const handleIceCandidate = useCallback(async (data: SignalingData) => {
    const { fromUserId, candidate } = data
    if (!candidate) {
      console.log(`[WebRTC] Received null ICE candidate from ${fromUserId} (gathering complete)`)
      return
    }

    const peerConn = peerConnectionsRef.current.get(fromUserId)
    
    // If no peer connection or no remote description yet, buffer the candidate
    if (!peerConn || !peerConn.peerConnection.remoteDescription) {
      const pending = pendingIceCandidatesRef.current.get(fromUserId) || []
      pending.push(candidate)
      pendingIceCandidatesRef.current.set(fromUserId, pending)
      console.log(`[WebRTC] Buffering ICE candidate from ${fromUserId} (${pending.length} pending)`)
      return
    }
    
    try {
      console.log(`[WebRTC] Adding ICE candidate from ${fromUserId}`, candidate.candidate?.substring(0, 50))
      await peerConn.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      if (candidate.candidate) console.error(`[WebRTC] Error adding ICE candidate from ${fromUserId}:`, error)
    }
  }, [])

  // ==================== SOCKET SIGNALING ====================

  const handleUserJoined = useCallback(
    (data: ParticipantJoinData) => {
      console.log(`[WebRTC] User joined event`, { userId: data.userId, meetId: data.meetId, myId: user?.id, myMeetId: meetId })
      
      if (data.userId === user?.id || data.meetId !== meetId) {
        console.log(`[WebRTC] Ignoring user joined - self or wrong meet`)
        return
      }

      if (!getStore().participants.has(data.userId)) {
        console.log(`[WebRTC] Adding participant ${data.userId} and creating offer`)
        getStore().addParticipant({
          userId: data.userId,
          userName: data.userName,
          profilePic: data.profilePic,
          isVideoEnabled: true,
          isAudioEnabled: true,
          isScreenSharing: false,
        })
        createOffer(data.userId)
      } else {
        console.log(`[WebRTC] Participant ${data.userId} already exists`)
      }
    },
    [user, meetId, createOffer, getStore]
  )

  const handleExistingParticipants = useCallback(
    (data: ExistingParticipantsData) => {
      console.log(`[WebRTC] Existing participants event`, { meetId: data.meetId, myMeetId: meetId, count: data.participants.length })
      
      if (data.meetId !== meetId) {
        console.log(`[WebRTC] Ignoring existing participants - wrong meet`)
        return
      }

      data.participants.forEach((p) => {
        if (p.userId !== user?.id && !getStore().participants.has(p.userId)) {
          console.log(`[WebRTC] Adding existing participant ${p.userId} and creating offer`)
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

  // Socket event listeners - MUST be set up BEFORE joining room
  useEffect(() => {
    if (!socket?.connected || !connected || !meetId) {
      console.log(`[WebRTC] Not setting up socket listeners`, { socketConnected: socket?.connected, connected, meetId })
      return
    }

    console.log(`[WebRTC] Setting up socket event listeners for meet ${meetId}`)
    socket.on('meet:offer', handleOffer)
    socket.on('meet:answer', handleAnswer)
    socket.on('meet:ice-candidate', handleIceCandidate)
    socket.on('meet:user-joined', handleUserJoined)
    socket.on('meet:existing-participants', handleExistingParticipants)
    socket.on('meet:user-left', handleUserLeft)
    socket.on('meet:participant-state-updated', handleParticipantState)

    return () => {
      console.log(`[WebRTC] Removing socket event listeners`)
      socket.off('meet:offer', handleOffer)
      socket.off('meet:answer', handleAnswer)
      socket.off('meet:ice-candidate', handleIceCandidate)
      socket.off('meet:user-joined', handleUserJoined)
      socket.off('meet:existing-participants', handleExistingParticipants)
      socket.off('meet:user-left', handleUserLeft)
      socket.off('meet:participant-state-updated', handleParticipantState)
    }
  }, [socket, connected, meetId, handleOffer, handleAnswer, handleIceCandidate, handleUserJoined, handleExistingParticipants, handleUserLeft, handleParticipantState])

  // Initialize stream FIRST, then join room (critical: stream must be ready before signaling)
  useEffect(() => {
    if (!meetId || !user || !socket?.connected) {
      console.log(`[WebRTC] Not initializing - missing requirements`, { meetId, hasUser: !!user, socketConnected: socket?.connected })
      return
    }
    
    // Prevent double initialization
    if (isInitializedRef.current) {
      console.log(`[WebRTC] Already initialized, skipping`)
      return
    }

    let mounted = true

    const init = async () => {
      try {
        console.log(`[WebRTC] Starting initialization for meet ${meetId}`)
        isInitializedRef.current = true
        await initializeLocalStream()
        console.log(`[WebRTC] Stream initialized, joining room ${meetId}`)
        if (mounted && socket.connected) {
          socket.emit('meet:join', meetId)
          console.log(`[WebRTC] Joined room ${meetId}`)
        }
      } catch (error) {
        console.error(`[WebRTC] Failed to initialize stream:`, error)
        isInitializedRef.current = false
      }
    }

    // Small delay to ensure socket listeners are set up first
    setTimeout(() => {
      init()
    }, 100)

    // Re-join on reconnect
    const handleReconnect = () => {
      console.log(`[WebRTC] Socket reconnected, rejoining room`)
      if (mounted && localStreamRef.current) {
        socket.emit('meet:join', meetId)
      }
    }
    socket.on('connect', handleReconnect)

    return () => {
      console.log(`[WebRTC] Cleaning up initialization`)
      mounted = false
      isInitializedRef.current = false
      socket.off('connect', handleReconnect)
      if (socket.connected) socket.emit('meet:leave', meetId)
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
      mirroredStreamRef.current?.getTracks().forEach((t) => t.stop())
      mirroredStreamRef.current = null
      peerConnectionsRef.current.forEach(({ peerConnection }) => peerConnection.close())
      peerConnectionsRef.current.clear()
      pendingIceCandidatesRef.current.clear()
      if (mirrorAnimationRef.current) cancelAnimationFrame(mirrorAnimationRef.current)
    }
  }, [meetId, user, socket?.connected, initializeLocalStream])

  // Cleanup function
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    mirroredStreamRef.current?.getTracks().forEach((t) => t.stop())
    mirroredStreamRef.current = null
    peerConnectionsRef.current.forEach(({ peerConnection }) => peerConnection.close())
    peerConnectionsRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    if (mirrorAnimationRef.current) cancelAnimationFrame(mirrorAnimationRef.current)
    isInitializedRef.current = false
  }, [])

  // Get remote streams
  const getRemoteStreams = useCallback(() => {
    const streams: Array<{ userId: string; stream: MediaStream }> = []
    peerConnectionsRef.current.forEach(({ stream }, userId) => {
      if (stream?.getTracks().length) streams.push({ userId, stream })
    })
    return streams
  }, [streamVersion])

  return {
    localStream: localStreamRef.current,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    getRemoteStreams,
    streamsUpdateCounter: streamVersion,
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
    flipCamera,
    cleanup,
  }
}
