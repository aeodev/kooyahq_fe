import { useCallback, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'

interface UseScreenShareOptions {
  localStreamRef: React.RefObject<MediaStream | null>
  peerConnectionsRef: React.RefObject<Map<string, { peerConnection: RTCPeerConnection; stream: MediaStream | null }>>
  socket: any
  meetId: string | null
}

export function useScreenShare({
  localStreamRef,
  peerConnectionsRef,
  socket,
  meetId,
}: UseScreenShareOptions) {
  const user = useAuthStore((state) => state.user)
  const getStore = useCallback(() => useMeetStore.getState(), [])

  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const screenStreamRef = useRef<MediaStream | null>(null)

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        screenStreamRef.current?.getTracks().forEach((track) => track.stop())
        screenStreamRef.current = null

        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0]
          peerConnectionsRef.current?.forEach(({ peerConnection }) => {
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
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        
        // Check if stream is still valid
        if (!screenStream || screenStream.getVideoTracks().length === 0) {
          return
        }
        
        screenStreamRef.current = screenStream

        const videoTrack = screenStream.getVideoTracks()[0]
        if (!videoTrack) {
          screenStream.getTracks().forEach((track) => track.stop())
          return
        }

        peerConnectionsRef.current?.forEach(({ peerConnection }) => {
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
          // User stopped sharing via browser UI
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop())
            screenStreamRef.current = null
          }
          
          if (localStreamRef.current) {
            const localVideoTrack = localStreamRef.current.getVideoTracks()[0]
            peerConnectionsRef.current?.forEach(({ peerConnection }) => {
              const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
              if (sender && localVideoTrack) {
                sender.replaceTrack(localVideoTrack)
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
        }
      }
    } catch (error) {
      // Handle permission denied - user just didn't grant permission
      if (error instanceof Error && error.name === 'NotAllowedError') {
        // User denied permission - ensure state is consistent
        if (!isScreenSharing) {
          setIsScreenSharing(false)
        }
        console.info('Screen sharing permission denied by user')
        return
      }
      
      // Handle invalid state - might be race condition
      if (error instanceof Error && error.name === 'AbortError') {
        // Reset state if we were trying to start
        if (!isScreenSharing) {
          setIsScreenSharing(false)
        }
        console.warn('Screen sharing aborted')
        return
      }
      
      // Handle device not available
      if (error instanceof Error && error.name === 'NotFoundError') {
        console.error('Screen sharing device not available')
        if (!isScreenSharing) {
          setIsScreenSharing(false)
        }
        return
      }
      
      // Log other errors
      console.error('Error accessing screen share:', error)
      // Ensure state consistency
      if (!isScreenSharing) {
        setIsScreenSharing(false)
      }
    }
  }, [isScreenSharing, user, socket, meetId, getStore, peerConnectionsRef, localStreamRef])

  return {
    isScreenSharing,
    screenStreamRef,
    toggleScreenShare,
  }
}

