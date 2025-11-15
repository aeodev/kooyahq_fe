import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'

interface SignalingHandlers {
  onOffer: (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => void
  onAnswer: (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => void
  onIceCandidate: (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => void
  onUserJoined: (data: { userId: string; userName?: string; profilePic?: string; meetId: string }) => void
  onExistingParticipants: (data: { meetId: string; participants: Array<{ userId: string; userName?: string; profilePic?: string }> }) => void
  onUserLeft: (data: { userId: string; meetId: string }) => void
  onParticipantStateUpdate: (data: { userId: string; meetId: string; isVideoEnabled?: boolean; isAudioEnabled?: boolean; isScreenSharing?: boolean }) => void
}

export function useWebRTCSignaling(
  socket: Socket | null,
  connected: boolean,
  meetId: string | null,
  handlers: SignalingHandlers
) {
  useEffect(() => {
    if (!socket?.connected || !connected || !meetId) return

    const {
      onOffer,
      onAnswer,
      onIceCandidate,
      onUserJoined,
      onExistingParticipants,
      onUserLeft,
      onParticipantStateUpdate,
    } = handlers

    socket.on('meet:offer', onOffer)
    socket.on('meet:answer', onAnswer)
    socket.on('meet:ice-candidate', onIceCandidate)
    socket.on('meet:user-joined', onUserJoined)
    socket.on('meet:existing-participants', onExistingParticipants)
    socket.on('meet:user-left', onUserLeft)
    socket.on('meet:participant-state-updated', onParticipantStateUpdate)

    return () => {
      socket.off('meet:offer', onOffer)
      socket.off('meet:answer', onAnswer)
      socket.off('meet:ice-candidate', onIceCandidate)
      socket.off('meet:user-joined', onUserJoined)
      socket.off('meet:existing-participants', onExistingParticipants)
      socket.off('meet:user-left', onUserLeft)
      socket.off('meet:participant-state-updated', onParticipantStateUpdate)
    }
  }, [socket, connected, meetId, handlers])
}

