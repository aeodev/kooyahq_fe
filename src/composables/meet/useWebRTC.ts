import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'

export function useWebRTC(meetId: string | null) {
  const socket = useSocketStore((state) => state.socket)
  const user = useAuthStore((state) => state.user)
  const { addParticipant, removeParticipant, updateParticipant } = useMeetStore()

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)
  const audioTrackRef = useRef<MediaStreamTrack | null>(null)

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      localStreamRef.current = stream
      videoTrackRef.current = stream.getVideoTracks()[0]
      audioTrackRef.current = stream.getAudioTracks()[0]
      setLocalStream(stream)
      
      if (socket && meetId && user) {
        socket.emit('meet:join', {
          meetId,
          userId: user.id,
          userName: user.name,
          profilePic: user.profilePic,
        })
      }
    } catch (error) {
      console.error('Error accessing media devices:', error)
    }
  }, [socket, meetId, user])

  // Create peer connection
  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    // Add local tracks to peer
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current!)
      })
    }

    // Handle remote stream
    peer.ontrack = (event) => {
      const [remoteStream] = event.streams
      setRemoteStreams((prev) => {
        const updated = new Map(prev)
        updated.set(userId, remoteStream)
        return updated
      })
    }

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('meet:ice-candidate', {
          meetId,
          targetUserId: userId,
          candidate: event.candidate,
        })
      }
    }

    peersRef.current.set(userId, peer)
    return peer
  }, [socket, meetId])

  // Handle offer
  const handleOffer = useCallback(async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
    const peer = createPeerConnection(data.fromUserId)
    await peer.setRemoteDescription(new RTCSessionDescription(data.offer))
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)

    if (socket) {
      socket.emit('meet:answer', {
        meetId,
        targetUserId: data.fromUserId,
        answer,
      })
    }
  }, [socket, meetId, createPeerConnection])

  // Handle answer
  const handleAnswer = useCallback(async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
    const peer = peersRef.current.get(data.fromUserId)
    if (peer) {
      await peer.setRemoteDescription(new RTCSessionDescription(data.answer))
    }
  }, [])

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
    const peer = peersRef.current.get(data.fromUserId)
    if (peer && data.candidate) {
      await peer.addIceCandidate(new RTCIceCandidate(data.candidate))
    }
  }, [])

  // Create offer for new participant
  const createOffer = useCallback(async (userId: string) => {
    const peer = createPeerConnection(userId)
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)

    if (socket) {
      socket.emit('meet:offer', {
        meetId,
        targetUserId: userId,
        offer,
      })
    }
  }, [socket, meetId, createPeerConnection])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (videoTrackRef.current) {
      const enabled = !videoTrackRef.current.enabled
      videoTrackRef.current.enabled = enabled
      setIsVideoEnabled(enabled)
      
      if (socket && meetId && user) {
        socket.emit('meet:video-toggle', { meetId, enabled })
        updateParticipant(user.id, { isVideoEnabled: enabled })
      }
    }
  }, [socket, meetId, user, updateParticipant])

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (audioTrackRef.current) {
      const enabled = !audioTrackRef.current.enabled
      audioTrackRef.current.enabled = enabled
      setIsAudioEnabled(enabled)
      
      if (socket && meetId && user) {
        socket.emit('meet:audio-toggle', { meetId, enabled })
        updateParticipant(user.id, { isAudioEnabled: enabled })
      }
    }
  }, [socket, meetId, user, updateParticipant])

  // Cleanup
  const cleanup = useCallback(() => {
    // Stop local tracks immediately
    const stream = localStreamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
      localStreamRef.current = null
    }
    
    // Stop individual track refs
    if (videoTrackRef.current) {
      videoTrackRef.current.stop()
      videoTrackRef.current = null
    }
    if (audioTrackRef.current) {
      audioTrackRef.current.stop()
      audioTrackRef.current = null
    }
    
    setLocalStream(null)

    // Close all peer connections
    peersRef.current.forEach((peer) => {
      try {
        peer.close()
      } catch (error) {
        console.error('Error closing peer connection:', error)
      }
    })
    peersRef.current.clear()

    // Clear remote streams
    setRemoteStreams(new Map())
  }, [])

  // Initialize on mount
  useEffect(() => {
    if (meetId && socket?.connected && user) {
      initializeLocalStream()
    } else {
      // If meetId becomes null or socket disconnects, cleanup immediately
      cleanup()
    }
  }, [meetId, socket?.connected, user, initializeLocalStream, cleanup])

  // Cleanup synchronously on unmount or when meetId becomes null
  useLayoutEffect(() => {
    return () => {
      // This runs synchronously before browser paints, ensuring immediate cleanup
      cleanup()
    }
  }, [cleanup])

  // Cleanup on page unload/navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [cleanup])

  // Socket event handlers
  useEffect(() => {
    if (!socket || !meetId) return

    const handleParticipantJoined = async (data: { userId: string; userName?: string; profilePic?: string }) => {
      if (data.userId !== user?.id) {
        addParticipant({
          userId: data.userId,
          userName: data.userName,
          profilePic: data.profilePic,
          isVideoEnabled: true,
          isAudioEnabled: true,
          isScreenSharing: false,
        })
        await createOffer(data.userId)
      }
    }

    const handleParticipantLeft = (data: { userId: string }) => {
      const peer = peersRef.current.get(data.userId)
      if (peer) {
        peer.close()
        peersRef.current.delete(data.userId)
      }
      setRemoteStreams((prev) => {
        const updated = new Map(prev)
        updated.delete(data.userId)
        return updated
      })
      removeParticipant(data.userId)
    }

    const handleVideoToggle = (data: { userId: string; enabled: boolean }) => {
      if (data.userId !== user?.id) {
        updateParticipant(data.userId, { isVideoEnabled: data.enabled })
      }
    }

    const handleAudioToggle = (data: { userId: string; enabled: boolean }) => {
      if (data.userId !== user?.id) {
        updateParticipant(data.userId, { isAudioEnabled: data.enabled })
      }
    }

    socket.on('meet:participant-joined', handleParticipantJoined)
    socket.on('meet:participant-left', handleParticipantLeft)
    socket.on('meet:offer', handleOffer)
    socket.on('meet:answer', handleAnswer)
    socket.on('meet:ice-candidate', handleIceCandidate)
    socket.on('meet:video-toggle', handleVideoToggle)
    socket.on('meet:audio-toggle', handleAudioToggle)

    return () => {
      socket.off('meet:participant-joined', handleParticipantJoined)
      socket.off('meet:participant-left', handleParticipantLeft)
      socket.off('meet:offer', handleOffer)
      socket.off('meet:answer', handleAnswer)
      socket.off('meet:ice-candidate', handleIceCandidate)
      socket.off('meet:video-toggle', handleVideoToggle)
      socket.off('meet:audio-toggle', handleAudioToggle)
    }
  }, [socket, meetId, user, addParticipant, removeParticipant, updateParticipant, createOffer, handleOffer, handleAnswer, handleIceCandidate])

  return {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    cleanup,
  }
}

