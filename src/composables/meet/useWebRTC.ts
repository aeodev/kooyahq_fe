import { useEffect, useRef, useCallback } from 'react'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore, type Participant } from '@/stores/meet.store'
import { useWebRTCSignaling } from './useWebRTCSignaling'
import { useMediaDevices } from './useMediaDevices'
import { useMirroredStream } from './useMirroredStream'
import { useRecording } from './useRecording'
import { usePeerConnections } from './usePeerConnections'
import { useLocalMedia } from './useLocalMedia'
import { useScreenShare } from './useScreenShare'

export function useWebRTC(meetId: string | null, initialVideoEnabled = true, initialAudioEnabled = true, initialStream?: MediaStream) {
  const socket = useSocketStore((state) => state.socket)
  const connected = useSocketStore((state) => state.connected)
  const user = useAuthStore((state) => state.user)
  const isMirrored = useMeetStore((state) => state.isMirrored)

  const getStore = useCallback(() => useMeetStore.getState(), [])

  // Use local media hook
  const {
    localStream,
    localStreamRef,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo: baseToggleVideo,
    toggleAudio: baseToggleAudio,
    initializeLocalStream,
    setLocalStream,
  } = useLocalMedia({
    initialVideoEnabled,
    initialAudioEnabled,
    initialStream,
  })

  // Create shared refs for peer connections
  const peerConnectionsRef = useRef<Map<string, { peerConnection: RTCPeerConnection; stream: MediaStream | null }>>(new Map())
  const mirroredStreamRef = useRef<MediaStream | null>(null)

  // Use screen share hook
  const { isScreenSharing, screenStreamRef, toggleScreenShare: baseToggleScreenShare } = useScreenShare({
    localStreamRef,
    peerConnectionsRef,
    socket,
    meetId,
  })


  // Use mirrored stream hook
  useMirroredStream({
    localStreamRef,
    peerConnectionsRef,
    mirroredStreamRef,
    isMirrored,
    isScreenSharing,
  })

  // Use peer connections hook
  const {
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    getRemoteStreams,
    streamsUpdateCounter,
  } = usePeerConnections({
    socket,
    meetId,
    localStreamRef,
    mirroredStreamRef,
    peerConnectionsRef,
    isMirrored,
    getStore,
  })

  // Use recording hook
  const { isRecording, startRecording, stopRecording } = useRecording({
    localStreamRef,
  })

  // Handle user joined
  const handleUserJoined = useCallback(
    (data: { userId: string; userName?: string; profilePic?: string; meetId: string }) => {
      if (data.userId === user?.id || data.meetId !== meetId) return

      const participants = useMeetStore.getState().participants
      if (participants.has(data.userId)) {
        getStore().updateParticipant(data.userId, { userName: data.userName, profilePic: data.profilePic })
      } else {
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
    (data: { meetId: string; participants: Array<{ userId: string; userName?: string; profilePic?: string }> }) => {
      if (data.meetId !== meetId) return

      const participants = useMeetStore.getState().participants
      data.participants.forEach((participant) => {
        if (participant.userId !== user?.id) {
          if (participants.has(participant.userId)) {
            getStore().updateParticipant(participant.userId, { userName: participant.userName, profilePic: participant.profilePic })
          } else {
            getStore().addParticipant({
              userId: participant.userId,
              userName: participant.userName,
              profilePic: participant.profilePic,
              isVideoEnabled: true,
              isAudioEnabled: true,
              isScreenSharing: false,
            })
            createOffer(participant.userId)
          }
        }
      })
    },
    [user, meetId, createOffer, getStore]
  )

  // Handle user left
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

  // Handle participant state updates from other users
  const handleParticipantStateUpdate = useCallback(
    (data: { userId: string; meetId: string; isVideoEnabled?: boolean; isAudioEnabled?: boolean; isScreenSharing?: boolean }) => {
      if (data.meetId !== meetId || data.userId === user?.id) return

      const updates: Partial<Participant> = {}
      if (data.isVideoEnabled !== undefined) {
        updates.isVideoEnabled = data.isVideoEnabled
      }
      if (data.isAudioEnabled !== undefined) {
        updates.isAudioEnabled = data.isAudioEnabled
      }
      if (data.isScreenSharing !== undefined) {
        updates.isScreenSharing = data.isScreenSharing
      }

      if (Object.keys(updates).length > 0) {
        getStore().updateParticipant(data.userId, updates)
      }
    },
    [meetId, user, getStore]
  )

  // Use WebRTC signaling hook
  useWebRTCSignaling(socket, connected, meetId, {
    onOffer: handleOffer,
    onAnswer: handleAnswer,
    onIceCandidate: handleIceCandidate,
    onUserJoined: handleUserJoined,
    onExistingParticipants: handleExistingParticipants,
    onUserLeft: handleUserLeft,
    onParticipantStateUpdate: handleParticipantStateUpdate,
  })

  // Join meet room and handle reconnection
  useEffect(() => {
    if (!meetId || !connected || !socket || !user) return

    const joinRoom = () => {
      if (socket.connected && meetId) {
        socket.emit('meet:join', meetId)
      }
    }

    joinRoom()

    const handleReconnect = () => {
      joinRoom()
    }

    socket.on('connect', handleReconnect)

    return () => {
      socket.off('connect', handleReconnect)
      if (socket.connected) {
        socket.emit('meet:leave', meetId)
      }
    }
  }, [meetId, connected, socket, user])

  // Handle socket disconnect
  useEffect(() => {
    if (!socket) return

    const handleDisconnect = () => {
      peerConnectionsRef.current.forEach(({ peerConnection }, userId) => {
        if (userId !== user?.id) {
          peerConnection.close()
          getStore().removeParticipant(userId)
        }
      })
      peerConnectionsRef.current.clear()
    }

    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('disconnect', handleDisconnect)
    }
  }, [socket, user, getStore])

  // Initialize local stream on mount
  useEffect(() => {
    if (meetId && user) {
      initializeLocalStream()
    }

    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      screenStreamRef.current?.getTracks().forEach((track) => track.stop())
      peerConnectionsRef.current.forEach(({ peerConnection }) => {
        peerConnection.close()
      })
      peerConnectionsRef.current.clear()
    }
  }, [meetId, user, initializeLocalStream])

  // Toggle video with peer connection sync
  const toggleVideo = useCallback(async () => {
    try {
      // Get current state before toggle
      const wasVideoEnabled = isVideoEnabled
      const willBeVideoEnabled = !wasVideoEnabled
      
      await baseToggleVideo()
      
      // Wait a tick to ensure state and track enabled state are updated
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Sync with peer connections - use the NEW state
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        
        if (willBeVideoEnabled && videoTrack && videoTrack.enabled) {
          // Video is being turned ON - use mirrored track if mirroring is enabled, otherwise use original
          const trackToUse = isMirrored && mirroredStreamRef.current
            ? mirroredStreamRef.current.getVideoTracks()[0]
            : videoTrack
          
          if (trackToUse) {
            peerConnectionsRef.current.forEach(({ peerConnection }) => {
              const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
              if (sender) {
                sender.replaceTrack(trackToUse)
              } else if (localStreamRef.current) {
                // Use the stream that contains the track
                const streamToUse = isMirrored && mirroredStreamRef.current
                  ? mirroredStreamRef.current
                  : localStreamRef.current
                peerConnection.addTrack(trackToUse, streamToUse)
              }
            })
          }
        } else if (!willBeVideoEnabled) {
          // Video is being turned OFF - send null track to peers
          peerConnectionsRef.current.forEach(({ peerConnection }) => {
            const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
            if (sender) {
              // Replace with null to stop sending video
              sender.replaceTrack(null)
            }
          })
        }
      }

      // Emit state update with CORRECT new value
      if (socket?.connected && meetId && user) {
        socket.emit('meet:participant-state', {
          meetId,
          isVideoEnabled: willBeVideoEnabled,
        })
      }
    } catch (error) {
      console.error('Failed to toggle video:', error)
    }
  }, [baseToggleVideo, isVideoEnabled, isMirrored, socket, meetId, user, mirroredStreamRef])

  // Toggle audio with peer connection sync
  const toggleAudio = useCallback(() => {
    try {
      baseToggleAudio()

      // Emit state update
      if (socket?.connected && meetId && user) {
        socket.emit('meet:participant-state', {
          meetId,
          isAudioEnabled: !isAudioEnabled,
        })
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error)
    }
  }, [baseToggleAudio, isAudioEnabled, socket, meetId, user])

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    await baseToggleScreenShare()
  }, [baseToggleScreenShare])

  // Use media devices hook
  const { changeVideoDevice, changeAudioInput, changeAudioOutput, flipCamera } = useMediaDevices({
    localStreamRef,
    peerConnectionsRef,
    setLocalStream,
  })

  // Cleanup function to stop all tracks and close connections
  const cleanup = useCallback(() => {
    // Stop local stream tracks
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    setLocalStream(null)

    // Stop screen share tracks
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current = null

    // Close all peer connections
    peerConnectionsRef.current.forEach(({ peerConnection }) => {
      peerConnection.close()
    })
    peerConnectionsRef.current.clear()
  }, [setLocalStream])

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isRecording,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    startRecording,
    stopRecording,
    getRemoteStreams,
    streamsUpdateCounter,
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
    flipCamera,
    cleanup,
  }
}

