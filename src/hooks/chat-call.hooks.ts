import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import type { ConversationWithParticipants } from '@/types/chat'
import type {
  CallMode,
  CallParticipant,
  CallSessionPayload,
  CallStatus,
} from '@/types/chat-call'

type RemoteStream = {
  userId: string
  stream: MediaStream
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function getIceServers(): RTCIceServer[] {
  const turnUrls = import.meta.env.VITE_TURN_URLS as string | undefined
  if (!turnUrls) return DEFAULT_ICE_SERVERS

  const urls = turnUrls.split(',').map((url) => url.trim()).filter(Boolean)
  if (urls.length === 0) return DEFAULT_ICE_SERVERS

  const username = import.meta.env.VITE_TURN_USERNAME as string | undefined
  const credential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined

  return [
    ...DEFAULT_ICE_SERVERS,
    {
      urls,
      username,
      credential,
    },
  ]
}

function isOfferer(localId: string, remoteId: string): boolean {
  return localId < remoteId
}

export function useChatCall(conversation: ConversationWithParticipants | null) {
  const socket = useSocketStore((state) => state.socket)
  const user = useAuthStore((state) => state.user)

  const [status, setStatus] = useState<CallStatus>('idle')
  const [callSession, setCallSession] = useState<CallSessionPayload | null>(null)
  const [participants, setParticipants] = useState<CallParticipant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user')
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)
  const [speakingByUserId, setSpeakingByUserId] = useState<Record<string, boolean>>({})
  const [callDurationSeconds, setCallDurationSeconds] = useState(0)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const callSessionRef = useRef<CallSessionPayload | null>(null)
  const statusRef = useRef<CallStatus>('idle')
  const mountedRef = useRef(true)
  const cameraFacingRef = useRef<'user' | 'environment'>('user')
  const callMediaRef = useRef<'audio' | 'video'>('video')
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserMapRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; data: Uint8Array<ArrayBuffer> }>>(new Map())
  const speakingMapRef = useRef<Map<string, boolean>>(new Map())
  const lastSpokeAtRef = useRef<Map<string, number>>(new Map())
  const monitorRef = useRef<number | null>(null)
  const localSpeakingKeyRef = useRef<string | null>(null)
  const callStartedAtRef = useRef<number | null>(null)

  const SPEAKING_THRESHOLD = 0.03
  const SPEAKING_HOLD_MS = 350

  useEffect(() => {
    callSessionRef.current = callSession
  }, [callSession])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    cameraFacingRef.current = cameraFacing
  }, [cameraFacing])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (status === 'active') {
      if (!callStartedAtRef.current) {
        callStartedAtRef.current = Date.now()
      }
    } else {
      callStartedAtRef.current = null
      setCallDurationSeconds(0)
    }
  }, [status])

  useEffect(() => {
    if (status !== 'active' || !callStartedAtRef.current) return

    const interval = setInterval(() => {
      const startedAt = callStartedAtRef.current
      if (!startedAt) return
      setCallDurationSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    const detectSwitchCamera = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        setCanSwitchCamera(false)
        return
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices.filter((device) => device.kind === 'videoinput')
        setCanSwitchCamera(videoInputs.length > 1)
      } catch (err) {
        console.warn('Failed to enumerate devices:', err)
        setCanSwitchCamera(false)
      }
    }

    detectSwitchCamera()
  }, [])

  const participantLookup = useMemo(() => {
    const map = new Map<string, { name: string; profilePic?: string }>()
    conversation?.participants.forEach((participant) => {
      map.set(participant.id, { name: participant.name, profilePic: participant.profilePic })
    })
    return map
  }, [conversation?.participants])

  const formatDuration = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const paddedMinutes = String(minutes).padStart(2, '0')
    const paddedSeconds = String(seconds).padStart(2, '0')

    if (hours > 0) {
      return `${hours}:${paddedMinutes}:${paddedSeconds}`
    }
    return `${paddedMinutes}:${paddedSeconds}`
  }, [])

  const updateRemoteStreamsState = useCallback(() => {
    const streams = Array.from(remoteStreamsRef.current.entries()).map(([userId, stream]) => ({
      userId,
      stream,
    }))
    setRemoteStreams(streams)
  }, [])

  const stopSpeakingMonitor = useCallback(() => {
    if (monitorRef.current) {
      cancelAnimationFrame(monitorRef.current)
      monitorRef.current = null
    }
  }, [])

  const startSpeakingMonitor = useCallback(() => {
    if (monitorRef.current) return

    const loop = () => {
      const now = performance.now()
      let changed = false

      analyserMapRef.current.forEach((entry, key) => {
        entry.analyser.getByteTimeDomainData(entry.data)
        let sum = 0
        for (let i = 0; i < entry.data.length; i += 1) {
          const v = (entry.data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / entry.data.length)

        if (rms > SPEAKING_THRESHOLD) {
          lastSpokeAtRef.current.set(key, now)
        }

        const lastSpokeAt = lastSpokeAtRef.current.get(key) || 0
        const isSpeaking = now - lastSpokeAt < SPEAKING_HOLD_MS

        if (speakingMapRef.current.get(key) !== isSpeaking) {
          speakingMapRef.current.set(key, isSpeaking)
          changed = true
        }
      })

      if (changed) {
        setSpeakingByUserId(Object.fromEntries(speakingMapRef.current))
      }

      monitorRef.current = requestAnimationFrame(loop)
    }

    monitorRef.current = requestAnimationFrame(loop)
  }, [SPEAKING_HOLD_MS, SPEAKING_THRESHOLD])

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume()
      } catch (err) {
        console.warn('Failed to resume audio context:', err)
      }
    }

    return audioContextRef.current
  }, [])

  const registerSpeakingAnalyser = useCallback(async (key: string, stream: MediaStream) => {
    if (analyserMapRef.current.has(key)) return
    if (!stream.getAudioTracks().length) return

    const context = await ensureAudioContext()
    const audioStream = new MediaStream(stream.getAudioTracks())
    const source = context.createMediaStreamSource(audioStream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)

    const data = new Uint8Array(new ArrayBuffer(analyser.fftSize))
    analyserMapRef.current.set(key, { analyser, source, data })
    startSpeakingMonitor()
  }, [ensureAudioContext, startSpeakingMonitor])

  const unregisterSpeakingAnalyser = useCallback((key: string) => {
    const entry = analyserMapRef.current.get(key)
    if (!entry) return

    entry.source.disconnect()
    entry.analyser.disconnect()
    analyserMapRef.current.delete(key)
    lastSpokeAtRef.current.delete(key)
    speakingMapRef.current.delete(key)
    setSpeakingByUserId(Object.fromEntries(speakingMapRef.current))

    if (analyserMapRef.current.size === 0) {
      stopSpeakingMonitor()
    }
  }, [stopSpeakingMonitor])

  const cleanupPeer = useCallback(
    (userId: string) => {
      const pc = peerConnectionsRef.current.get(userId)
      if (pc) {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onconnectionstatechange = null
        pc.close()
        peerConnectionsRef.current.delete(userId)
      }

      const stream = remoteStreamsRef.current.get(userId)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        remoteStreamsRef.current.delete(userId)
        updateRemoteStreamsState()
      }

      unregisterSpeakingAnalyser(userId)
    },
    [unregisterSpeakingAnalyser, updateRemoteStreamsState]
  )

  const cleanupCall = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => {
      pc.close()
    })
    peerConnectionsRef.current.clear()

    remoteStreamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop())
    })
    remoteStreamsRef.current.clear()
    setRemoteStreams([])

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    if (localSpeakingKeyRef.current) {
      unregisterSpeakingAnalyser(localSpeakingKeyRef.current)
      localSpeakingKeyRef.current = null
    }

    Array.from(analyserMapRef.current.keys()).forEach((key) => {
      unregisterSpeakingAnalyser(key)
    })

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }

    setParticipants([])
    setCallSession(null)
    setStatus('idle')
    setError(null)
    setIsMuted(false)
    setIsVideoEnabled(true)
    setCameraFacing('user')
    callMediaRef.current = 'video'
    setSpeakingByUserId({})
  }, [])

  const attachLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    const existingKinds = new Set(pc.getSenders().map((sender) => sender.track?.kind))
    stream.getTracks().forEach((track) => {
      if (!existingKinds.has(track.kind)) {
        pc.addTrack(track, stream)
      }
    })
  }, [])

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current
    try {
      const wantsVideo = callMediaRef.current === 'video'
      const stream = await navigator.mediaDevices.getUserMedia({
        video: wantsVideo ? { facingMode: { ideal: cameraFacingRef.current } } : false,
        audio: true,
      })
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return null
      }

      localStreamRef.current = stream
      setLocalStream(stream)
      const audioTrack = stream.getAudioTracks()[0]
      const videoTrack = stream.getVideoTracks()[0]
      setIsMuted(Boolean(audioTrack && !audioTrack.enabled))
      setIsVideoEnabled(Boolean(videoTrack ? videoTrack.enabled : false))

      const speakingKey = user?.id || 'local'
      localSpeakingKeyRef.current = speakingKey
      registerSpeakingAnalyser(speakingKey, stream)

      peerConnectionsRef.current.forEach((pc) => {
        attachLocalTracks(pc, stream)
      })

      return stream
    } catch (err) {
      console.error('Failed to access media devices:', err)
      if (mountedRef.current) {
        setError('Camera or microphone access failed')
        setStatus('failed')
      }
      return null
    }
  }, [attachLocalTracks, registerSpeakingAnalyser, user?.id])

  const createPeerConnection = useCallback(
    async (remoteUserId: string) => {
      const existing = peerConnectionsRef.current.get(remoteUserId)
      if (existing) return existing

      const pc = new RTCPeerConnection({ iceServers: getIceServers() })
      peerConnectionsRef.current.set(remoteUserId, pc)

      pc.onicecandidate = (event) => {
        const session = callSessionRef.current
        if (!event.candidate || !socket || !session) return
        socket.emit('call:ice', {
          callId: session.callId,
          toUserId: remoteUserId,
          candidate: event.candidate,
        })
      }

      pc.ontrack = (event) => {
        const existingStream = remoteStreamsRef.current.get(remoteUserId) || new MediaStream()
        event.streams[0]?.getTracks().forEach((track) => {
          if (!existingStream.getTracks().find((existingTrack) => existingTrack.id === track.id)) {
            existingStream.addTrack(track)
          }
        })
        remoteStreamsRef.current.set(remoteUserId, existingStream)
        updateRemoteStreamsState()
        registerSpeakingAnalyser(remoteUserId, existingStream)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          cleanupPeer(remoteUserId)
        }
      }

      const stream = await ensureLocalStream()
      if (stream) {
        attachLocalTracks(pc, stream)
      }

      return pc
    },
    [attachLocalTracks, cleanupPeer, ensureLocalStream, registerSpeakingAnalyser, socket, updateRemoteStreamsState]
  )

  const sendOffer = useCallback(
    async (remoteUserId: string) => {
      const session = callSessionRef.current
      if (!session || !socket) return

      const pc = await createPeerConnection(remoteUserId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('call:offer', {
        callId: session.callId,
        toUserId: remoteUserId,
        sdp: offer.sdp,
      })
    },
    [createPeerConnection, socket]
  )

  const syncPeers = useCallback(async () => {
    if (!user?.id || !callSessionRef.current) return
    if (!['connecting', 'active', 'ringing_outgoing', 'ringing_incoming'].includes(statusRef.current)) return

    const connectedParticipants = participants.filter(
      (participant) => participant.status === 'connected' && participant.userId !== user.id
    )

    for (const participant of connectedParticipants) {
      if (!peerConnectionsRef.current.has(participant.userId)) {
        await createPeerConnection(participant.userId)
        if (isOfferer(user.id, participant.userId)) {
          await sendOffer(participant.userId)
        }
      }
    }
  }, [createPeerConnection, participants, sendOffer, user?.id])

  const toggleMute = useCallback(async () => {
    const stream = localStreamRef.current || (await ensureLocalStream())
    if (!stream) return
    const audioTrack = stream.getAudioTracks()[0]
    if (!audioTrack) return
    audioTrack.enabled = !audioTrack.enabled
    setIsMuted(!audioTrack.enabled)
  }, [ensureLocalStream])

  const toggleVideo = useCallback(async () => {
    if (callMediaRef.current === 'audio') return
    const stream = localStreamRef.current || (await ensureLocalStream())
    if (!stream) return
    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) return
    videoTrack.enabled = !videoTrack.enabled
    setIsVideoEnabled(videoTrack.enabled)
  }, [ensureLocalStream])

  const switchCamera = useCallback(async () => {
    if (!canSwitchCamera) return
    if (callMediaRef.current === 'audio') return
    if (!navigator?.mediaDevices?.getUserMedia) return

    const stream = localStreamRef.current || (await ensureLocalStream())
    if (!stream) return

    const nextFacing = cameraFacingRef.current === 'user' ? 'environment' : 'user'

    let newStream: MediaStream | null = null
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: nextFacing } },
        audio: false,
      })
    } catch (err) {
      console.warn('Exact facingMode failed, falling back to ideal:', err)
      newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing } },
        audio: false,
      })
    }

    const newVideoTrack = newStream.getVideoTracks()[0]
    if (!newVideoTrack) return

    newVideoTrack.enabled = isVideoEnabled

    const audioTracks = stream.getAudioTracks()
    stream.getVideoTracks().forEach((track) => {
      track.stop()
      stream.removeTrack(track)
    })

    stream.addTrack(newVideoTrack)

    peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
      if (sender) {
        sender.replaceTrack(newVideoTrack)
      } else {
        pc.addTrack(newVideoTrack, stream)
      }
    })

    const updatedStream = new MediaStream([...audioTracks, newVideoTrack])
    localStreamRef.current = updatedStream
    setLocalStream(updatedStream)
    setCameraFacing(nextFacing)
  }, [canSwitchCamera, ensureLocalStream, isVideoEnabled])

  useEffect(() => {
    if (remoteStreams.length > 0 && statusRef.current === 'connecting') {
      setStatus('active')
    }
  }, [remoteStreams.length])

  useEffect(() => {
    syncPeers()
  }, [participants, syncPeers])

  const startCall = useCallback((media: 'audio' | 'video' = 'video') => {
    if (!socket || !conversation?.id) {
      setError('Open a conversation to start a call.')
      return
    }
    if (statusRef.current !== 'idle') return

    callMediaRef.current = media
    setIsVideoEnabled(media === 'video')
    setStatus('ringing_outgoing')
    socket.emit('call:start', { conversationId: conversation.id, media })
  }, [conversation?.id, socket])

  const acceptCall = useCallback(async () => {
    const session = callSessionRef.current
    if (!socket || !session) return

    setStatus('connecting')
    await ensureLocalStream()
    socket.emit('call:accept', { callId: session.callId })
  }, [ensureLocalStream, socket])

  const rejectCall = useCallback(() => {
    const session = callSessionRef.current
    if (!socket || !session) return

    socket.emit('call:reject', { callId: session.callId })
    cleanupCall()
  }, [cleanupCall, socket])

  const leaveCall = useCallback(() => {
    const session = callSessionRef.current
    if (!socket || !session) return

    setStatus('ending')
    socket.emit('call:leave', { callId: session.callId })
    cleanupCall()
  }, [cleanupCall, socket])

  const endCall = useCallback(() => {
    const session = callSessionRef.current
    if (!socket || !session) return

    setStatus('ending')
    socket.emit('call:end', { callId: session.callId })
    cleanupCall()
  }, [cleanupCall, socket])

  useEffect(() => {
    if (!socket) return

    const handleCallStarted = (payload: CallSessionPayload) => {
      if (conversation && payload.roomId !== conversation.id) return
      callMediaRef.current = payload.media ?? 'video'
      setIsVideoEnabled(payload.media !== 'audio')
      setCallSession(payload)
      setParticipants(payload.participants)
      setStatus('ringing_outgoing')
      setError(null)
    }

    const handleCallRing = (payload: CallSessionPayload) => {
      if (statusRef.current !== 'idle') return
      callMediaRef.current = payload.media ?? 'video'
      setIsVideoEnabled(payload.media !== 'audio')
      setCallSession(payload)
      setParticipants(payload.participants)
      setStatus('ringing_incoming')
      setError(null)
    }

    const handleCallParticipants = (payload: { callId: string; participants: CallParticipant[] }) => {
      const session = callSessionRef.current
      if (!session || payload.callId !== session.callId) return
      setParticipants(payload.participants)
    }

    const handleCallJoin = (payload: { callId: string; userId: string }) => {
      const session = callSessionRef.current
      if (!session || payload.callId !== session.callId) return

      setParticipants((current) =>
        current.map((participant) =>
          participant.userId === payload.userId
            ? { ...participant, status: 'connected' }
            : participant
        )
      )

      if (statusRef.current === 'ringing_outgoing' || statusRef.current === 'ringing_incoming') {
        setStatus('connecting')
      }
    }

    const handleCallLeave = (payload: { callId: string; userId: string }) => {
      const session = callSessionRef.current
      if (!session || payload.callId !== session.callId) return

      cleanupPeer(payload.userId)
      setParticipants((current) =>
        current.map((participant) =>
          participant.userId === payload.userId
            ? { ...participant, status: 'left' }
            : participant
        )
      )
    }

    const handleCallEnd = (payload: { callId: string }) => {
      const session = callSessionRef.current
      if (!session || payload.callId !== session.callId) return
      cleanupCall()
    }

    const handleCallAlreadyActive = (payload: CallSessionPayload) => {
      if (conversation && payload.roomId !== conversation.id) return
      callMediaRef.current = payload.media ?? 'video'
      setIsVideoEnabled(payload.media !== 'audio')
      setCallSession(payload)
      setParticipants(payload.participants)
      setError('A call is already active in this conversation.')
      setStatus('ringing_incoming')
    }

    const handleCallReject = (payload: { callId: string; userId: string }) => {
      const session = callSessionRef.current
      if (!session || payload.callId !== session.callId) return

      setParticipants((current) =>
        current.map((participant) =>
          participant.userId === payload.userId
            ? { ...participant, status: 'left' }
            : participant
        )
      )
    }

    const handleCallOffer = async (payload: { callId: string; fromUserId: string; sdp: string }) => {
      const session = callSessionRef.current
      if (!session || payload.callId !== session.callId) return

      const pc = await createPeerConnection(payload.fromUserId)
      await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('call:answer', {
        callId: session.callId,
        toUserId: payload.fromUserId,
        sdp: answer.sdp,
      })
    }

    const handleCallAnswer = async (payload: { callId: string; fromUserId: string; sdp: string }) => {
      const session = callSessionRef.current
      if (!session || payload.callId !== session.callId) return

      const pc = peerConnectionsRef.current.get(payload.fromUserId)
      if (!pc) return
      await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp })
    }

    const handleCallIce = async (payload: { callId: string; fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const session = callSessionRef.current
      if (!session || payload.callId !== session.callId) return

      const pc = peerConnectionsRef.current.get(payload.fromUserId)
      if (!pc) return
      await pc.addIceCandidate(payload.candidate)
    }

    const handleCallError = (payload: { message: string }) => {
      setError(payload.message || 'Call error')
      setStatus('failed')
    }

    socket.on('call:started', handleCallStarted)
    socket.on('call:ring', handleCallRing)
    socket.on('call:participants', handleCallParticipants)
    socket.on('call:join', handleCallJoin)
    socket.on('call:leave', handleCallLeave)
    socket.on('call:end', handleCallEnd)
    socket.on('call:timeout', handleCallEnd)
    socket.on('call:offer', handleCallOffer)
    socket.on('call:answer', handleCallAnswer)
    socket.on('call:ice', handleCallIce)
    socket.on('call:error', handleCallError)
    socket.on('call:already-active', handleCallAlreadyActive)
    socket.on('call:reject', handleCallReject)

    return () => {
      socket.off('call:started', handleCallStarted)
      socket.off('call:ring', handleCallRing)
      socket.off('call:participants', handleCallParticipants)
      socket.off('call:join', handleCallJoin)
      socket.off('call:leave', handleCallLeave)
      socket.off('call:end', handleCallEnd)
      socket.off('call:timeout', handleCallEnd)
      socket.off('call:offer', handleCallOffer)
      socket.off('call:answer', handleCallAnswer)
      socket.off('call:ice', handleCallIce)
      socket.off('call:error', handleCallError)
      socket.off('call:already-active', handleCallAlreadyActive)
      socket.off('call:reject', handleCallReject)
    }
  }, [cleanupCall, cleanupPeer, conversation, createPeerConnection, socket])

  const isInitiator = callSession?.initiatorId === user?.id
  const mode: CallMode | null = callSession?.mode || null

  const remoteStreamsWithMeta = useMemo(() => {
    return remoteStreams.map((entry) => ({
      ...entry,
      name: participantLookup.get(entry.userId)?.name || 'Participant',
    }))
  }, [participantLookup, remoteStreams])

  const media = callSession?.media ?? callMediaRef.current
  const callDurationLabel = formatDuration(callDurationSeconds)

  return {
    status,
    callSession,
    participants,
    localStream,
    remoteStreams: remoteStreamsWithMeta,
    error,
    isMuted,
    isVideoEnabled,
    cameraFacing,
    canSwitchCamera,
    isInitiator,
    mode,
    media,
    speakingByUserId,
    callDurationSeconds,
    callDurationLabel,
    startCall,
    acceptCall,
    rejectCall,
    leaveCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  }
}
