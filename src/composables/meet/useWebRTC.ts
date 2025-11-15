import { useEffect, useRef, useCallback, useState } from 'react'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore, type Participant } from '@/stores/meet.store'
import { useWebRTCSignaling } from './useWebRTCSignaling'
import { useMediaDevices } from './useMediaDevices'
import { useMirroredStream } from './useMirroredStream'
import { useRecording } from './useRecording'
import { usePeerConnections } from './usePeerConnections'

export function useWebRTC(meetId: string | null, initialVideoEnabled = true, initialAudioEnabled = true) {
  const socket = useSocketStore((state) => state.socket)
  const connected = useSocketStore((state) => state.connected)
  const user = useAuthStore((state) => state.user)
  const isMirrored = useMeetStore((state) => state.isMirrored)

  const getStore = useCallback(() => useMeetStore.getState(), [])

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled)
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const videoEnabled = initialVideoEnabled
      const audioEnabled = initialAudioEnabled || !initialVideoEnabled

      const stream = await navigator.mediaDevices.getUserMedia({
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
    }
  }, [user, initialVideoEnabled, initialAudioEnabled, getStore])

  // Create shared refs
  const peerConnectionsRef = useRef<Map<string, { peerConnection: RTCPeerConnection; stream: MediaStream | null }>>(new Map())
  const mirroredStreamRef = useRef<MediaStream | null>(null)

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
      queueMicrotask(() => {
        getStore().removeParticipant(data.userId)
      })
      const peerConn = peerConnectionsRef.current.get(data.userId)
      if (peerConn) {
        peerConn.peerConnection.close()
        peerConnectionsRef.current.delete(data.userId)
      }
    },
    [meetId, getStore, peerConnectionsRef]
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
          queueMicrotask(() => {
            getStore().removeParticipant(userId)
          })
        }
      })
      peerConnectionsRef.current.clear()
    }

    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('disconnect', handleDisconnect)
    }
  }, [socket, user, getStore, peerConnectionsRef])

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
  }, [meetId, user, initializeLocalStream, peerConnectionsRef])

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
              peerConnectionsRef.current.forEach(({ peerConnection }) => {
                const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
                if (sender) {
                  sender.replaceTrack(videoTrack)
                } else {
                  peerConnection.addTrack(videoTrack, stream)
                }
              })
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
              // Keep the same stream reference to avoid interrupting video playback
              setLocalStream(localStreamRef.current)

              peerConnectionsRef.current.forEach(({ peerConnection }) => {
                const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
                if (sender) {
                  sender.replaceTrack(newVideoTrack)
                } else {
                  peerConnection.addTrack(newVideoTrack, localStreamRef.current!)
                }
              })

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
        if (socket?.connected && meetId) {
          socket.emit('meet:participant-state', {
            meetId,
            isVideoEnabled: newValue,
          })
        }
      }
    } catch (error) {
      console.error('Failed to toggle video:', error)
      setIsVideoEnabled(currentValue)
    }
  }, [isVideoEnabled, isAudioEnabled, user, socket, meetId, getStore, peerConnectionsRef])

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
          if (socket?.connected && meetId) {
            socket.emit('meet:participant-state', {
              meetId,
              isAudioEnabled: newValue,
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error)
    }
  }, [isAudioEnabled, user, socket, meetId, getStore])

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        screenStreamRef.current?.getTracks().forEach((track) => track.stop())
        screenStreamRef.current = null

        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0]
          peerConnectionsRef.current.forEach(({ peerConnection }) => {
            const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack)
            }
          })
        }

        setIsScreenSharing(false)
        if (user) {
          getStore().updateParticipant(user.id, { isScreenSharing: false })
          if (socket?.connected && meetId) {
            socket.emit('meet:participant-state', {
              meetId,
              isScreenSharing: false,
            })
          }
        }
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        screenStreamRef.current = screenStream

        const videoTrack = screenStream.getVideoTracks()[0]
        peerConnectionsRef.current.forEach(({ peerConnection }) => {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
          if (sender) {
            sender.replaceTrack(videoTrack)
          }
        })

        setIsScreenSharing(true)
        if (user) {
          getStore().updateParticipant(user.id, { isScreenSharing: true })
          if (socket?.connected && meetId) {
            socket.emit('meet:participant-state', {
              meetId,
              isScreenSharing: true,
            })
          }
        }

        videoTrack.onended = () => {
          toggleScreenShare()
        }
      }
    } catch (error) {
      console.error('Error accessing screen share:', error)
      if (!isScreenSharing) {
        setIsScreenSharing(false)
      }
    }
  }, [isScreenSharing, user, socket, meetId, getStore, peerConnectionsRef])

  // Use media devices hook
  const { changeVideoDevice, changeAudioInput, changeAudioOutput, flipCamera } = useMediaDevices({
    localStreamRef,
    peerConnectionsRef,
    setLocalStream,
  })

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
  }
}

