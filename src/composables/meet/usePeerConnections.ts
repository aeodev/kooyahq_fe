import { useCallback, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { useMeetStore } from '@/stores/meet.store'

interface PeerConnection {
  peerConnection: RTCPeerConnection
  stream: MediaStream | null
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
}

interface UsePeerConnectionsOptions {
  socket: Socket | null
  meetId: string | null
  localStreamRef: React.RefObject<MediaStream | null>
  mirroredStreamRef: React.RefObject<MediaStream | null>
  peerConnectionsRef: React.RefObject<Map<string, PeerConnection>>
  isMirrored: boolean
  getStore: () => ReturnType<typeof useMeetStore.getState>
}

export function usePeerConnections({
  socket,
  meetId,
  localStreamRef,
  mirroredStreamRef,
  peerConnectionsRef,
  isMirrored,
  getStore,
}: UsePeerConnectionsOptions) {
  const [streamsUpdateCounter, setStreamsUpdateCounter] = useState(0)
  const signalingQueueRef = useRef<Map<string, Promise<void>>>(new Map())
  const createOfferRef = useRef<((userId: string) => Promise<void>) | null>(null)
  const reconnectPeerRef = useRef<((userId: string) => Promise<void>) | null>(null)
  const iceCandidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())

  // Queue signaling operations to prevent race conditions
  const queueSignaling = useCallback(async (userId: string, operation: () => Promise<void>) => {
    const existing = signalingQueueRef.current.get(userId)
    const task = existing
      ? existing.then(() => operation()).catch(() => operation())
      : operation()

    signalingQueueRef.current.set(userId, task)

    try {
      await task
    } finally {
      if (signalingQueueRef.current.get(userId) === task) {
        signalingQueueRef.current.delete(userId)
      }
    }
  }, [])

  // Reconnection logic with retry mechanism
  const reconnectPeer = useCallback(
    async (userId: string, attempt = 1, maxAttempts = 3) => {
      if (attempt > maxAttempts) {
        console.error(`Failed to reconnect to ${userId} after ${maxAttempts} attempts`)
        getStore().removeParticipant(userId)
        return
      }

      console.log(`Reconnection attempt ${attempt} for ${userId}`)

      const peerConn = peerConnectionsRef.current.get(userId)
      if (peerConn) {
        peerConn.peerConnection.close()
        peerConnectionsRef.current.delete(userId)
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      if (createOfferRef.current) {
        await createOfferRef.current(userId)
      }
    },
    [getStore]
  )

  reconnectPeerRef.current = reconnectPeer

  // Create peer connection for a user
  const createPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      const peerConnection = new RTCPeerConnection(RTC_CONFIG)

      // Add local stream tracks (use mirrored if enabled)
      const streamToUse = isMirrored && mirroredStreamRef.current
        ? mirroredStreamRef.current
        : localStreamRef.current

      if (streamToUse) {
        streamToUse.getTracks().forEach((track) => {
          peerConnection.addTrack(track, streamToUse)
        })
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (!remoteStream) {
          console.warn(`No remote stream in event for ${userId}`)
          return
        }

        const tracks = remoteStream.getTracks()
        
        // Validate stream has tracks before setting
        if (tracks.length === 0) {
          console.warn(`Received empty stream from ${userId}`)
          return
        }

        console.log(`Received remote stream from ${userId}`, {
          stream: remoteStream,
          streamId: remoteStream.id,
          tracks: tracks.length,
          videoTracks: tracks.filter(t => t.kind === 'video').length,
          audioTracks: tracks.filter(t => t.kind === 'audio').length,
          trackStates: tracks.map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })),
        })

        const peerConn = peerConnectionsRef.current.get(userId)
        if (peerConn) {
          // Only update if stream actually changed
          if (peerConn.stream?.id !== remoteStream.id) {
            peerConn.stream = remoteStream
            peerConnectionsRef.current.set(userId, peerConn)
            // Trigger re-render by updating counter
            setStreamsUpdateCounter((prev) => prev + 1)
          }
        } else {
          peerConnectionsRef.current.set(userId, {
            peerConnection,
            stream: remoteStream,
          })
          // Trigger re-render by updating counter
          setStreamsUpdateCounter((prev) => prev + 1)
        }

        // Listen for track changes on the remote stream
        tracks.forEach((track) => {
          track.onended = () => {
            console.log(`Track ended for ${userId}:`, track.kind, track.id)
            setStreamsUpdateCounter((prev) => prev + 1)
          }
        })

        const handleAddTrack = () => {
          console.log(`Track added to stream for ${userId}`)
          setStreamsUpdateCounter((prev) => prev + 1)
        }

        const handleRemoveTrack = () => {
          console.log(`Track removed from stream for ${userId}`)
          setStreamsUpdateCounter((prev) => prev + 1)
        }

        remoteStream.addEventListener('addtrack', handleAddTrack)
        remoteStream.addEventListener('removetrack', handleRemoveTrack)
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket?.connected && meetId) {
          socket.emit('meet:ice-candidate', {
            meetId,
            candidate: event.candidate.toJSON(),
            targetUserId: userId,
          })
        }
      }

      // Process queued ICE candidates if any
      const queuedCandidates = iceCandidateQueueRef.current.get(userId)
      if (queuedCandidates && queuedCandidates.length > 0) {
        queuedCandidates.forEach((candidate) => {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
            console.error(`Error adding queued ICE candidate for ${userId}:`, error)
          })
        })
        iceCandidateQueueRef.current.delete(userId)
      }

      // Monitor ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState
        console.log(`ICE connection state for ${userId}:`, iceState)

        if (iceState === 'failed' && createOfferRef.current) {
          createOfferRef.current(userId).catch((error) => {
            console.error(`Failed to restart ICE for ${userId}:`, error)
          })
        }
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState
        if (state === 'failed' && reconnectPeerRef.current) {
          reconnectPeerRef.current(userId).catch((error) => {
            console.error(`Failed to reconnect to ${userId}:`, error)
          })
        } else if (state === 'disconnected' || state === 'closed') {
          getStore().removeParticipant(userId)
          peerConnectionsRef.current.delete(userId)
          setStreamsUpdateCounter((prev) => prev + 1)
        }
      }

      return peerConnection
    },
    [socket, meetId, isMirrored, mirroredStreamRef, localStreamRef, getStore]
  )

  // Create offer for new participant
  const createOffer = useCallback(
    async (userId: string) => {
      await queueSignaling(userId, async () => {
        // Ensure local stream is ready before creating offer
        if (!localStreamRef.current) {
          console.warn(`Local stream not ready for ${userId}`)
          return
        }

        const existing = peerConnectionsRef.current.get(userId)
        if (existing) {
          const state = existing.peerConnection.connectionState
          if (state === 'closed' || state === 'failed' || state === 'disconnected') {
            existing.peerConnection.close()
            peerConnectionsRef.current.delete(userId)
          } else {
            if (existing.peerConnection.signalingState !== 'stable') {
              return
            }
          }
        }

        const peerConnection = createPeerConnection(userId)
        peerConnectionsRef.current.set(userId, { peerConnection, stream: null })

        try {
          if (peerConnection.signalingState === 'stable') {
            // Create offer with options to gather ICE candidates faster
            const offer = await peerConnection.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await peerConnection.setLocalDescription(offer)

            // Send offer immediately - don't wait for ICE gathering
            // ICE candidates will be sent separately as they arrive
            if (socket?.connected && meetId) {
              socket.emit('meet:offer', {
                meetId,
                offer: {
                  type: offer.type,
                  sdp: offer.sdp || '',
                },
                targetUserId: userId,
              })
            }
          } else {
            console.warn(`Cannot create offer: connection not in stable state (${peerConnection.signalingState})`)
          }
        } catch (error) {
          console.error('Error creating offer:', error)
        }
      })
    },
    [createPeerConnection, socket, meetId, queueSignaling, localStreamRef]
  )

  createOfferRef.current = createOffer

  // Handle incoming offer
  const handleOffer = useCallback(
    async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      await queueSignaling(data.fromUserId, async () => {
        const { fromUserId, offer } = data

        let peerConnection = peerConnectionsRef.current.get(fromUserId)?.peerConnection
        if (!peerConnection) {
          peerConnection = createPeerConnection(fromUserId)
          peerConnectionsRef.current.set(fromUserId, {
            peerConnection,
            stream: null,
          })
        } else {
          const state = peerConnection.connectionState
          if (state === 'closed' || state === 'failed') {
            peerConnection.close()
            peerConnection = createPeerConnection(fromUserId)
            peerConnectionsRef.current.set(fromUserId, {
              peerConnection,
              stream: null,
            })
          }
        }

        try {
          const currentState = peerConnection.signalingState

          if (currentState === 'have-local-offer') {
            peerConnection.close()
            peerConnection = createPeerConnection(fromUserId)
            peerConnectionsRef.current.set(fromUserId, {
              peerConnection,
              stream: null,
            })
          } else if (currentState !== 'stable') {
            peerConnection.close()
            peerConnection = createPeerConnection(fromUserId)
            peerConnectionsRef.current.set(fromUserId, {
              peerConnection,
              stream: null,
            })
          }

          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

          // Process queued ICE candidates after setting remote description
          const queuedCandidates = iceCandidateQueueRef.current.get(fromUserId)
          if (queuedCandidates && queuedCandidates.length > 0) {
            for (const candidate of queuedCandidates) {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
              } catch (error) {
                console.error(`Error adding queued ICE candidate for ${fromUserId}:`, error)
              }
            }
            iceCandidateQueueRef.current.delete(fromUserId)
          }

          if (peerConnection.signalingState === 'have-remote-offer') {
            // Create answer with options to gather ICE candidates faster
            const answer = await peerConnection.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await peerConnection.setLocalDescription(answer)

            // Send answer immediately - don't wait for ICE gathering
            if (socket?.connected && meetId) {
              socket.emit('meet:answer', {
                meetId,
                answer: {
                  type: answer.type,
                  sdp: answer.sdp || '',
                },
                targetUserId: fromUserId,
              })
            }
          }
        } catch (error) {
          console.error('Error handling offer:', error)
        }
      })
    },
    [createPeerConnection, socket, meetId, queueSignaling]
  )

  // Handle incoming answer
  const handleAnswer = useCallback(
    async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      await queueSignaling(data.fromUserId, async () => {
        const { fromUserId, answer } = data
        const peerConn = peerConnectionsRef.current.get(fromUserId)
        if (peerConn) {
          try {
            const currentState = peerConn.peerConnection.signalingState

            if (currentState === 'have-local-offer') {
              await peerConn.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
              
              // Process queued ICE candidates after setting remote description
              const queuedCandidates = iceCandidateQueueRef.current.get(fromUserId)
              if (queuedCandidates && queuedCandidates.length > 0) {
                for (const candidate of queuedCandidates) {
                  try {
                    await peerConn.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                  } catch (error) {
                    console.error(`Error adding queued ICE candidate for ${fromUserId}:`, error)
                  }
                }
                iceCandidateQueueRef.current.delete(fromUserId)
              }
            } else if (currentState === 'stable') {
              // Connection already established, ignore duplicate/out-of-order answer
              console.log(`Received answer for ${fromUserId} but connection is already stable, ignoring`)
            } else if (currentState === 'have-remote-offer') {
              console.warn(`Received answer while in have-remote-offer state, resetting connection`)
              peerConn.peerConnection.close()
              const newPeerConnection = createPeerConnection(fromUserId)
              peerConnectionsRef.current.set(fromUserId, {
                peerConnection: newPeerConnection,
                stream: null,
              })
            } else {
              console.warn(`Invalid signaling state for setRemoteDescription (answer): ${currentState}`)
            }
          } catch (error) {
            console.error('Error handling answer:', error)
          }
        }
      })
    },
    [createPeerConnection, queueSignaling]
  )

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
    const { fromUserId, candidate } = data
    const peerConn = peerConnectionsRef.current.get(fromUserId)
    if (peerConn) {
      try {
        const remoteDescription = peerConn.peerConnection.remoteDescription
        if (!remoteDescription) {
          // Queue ICE candidate until remote description is set
          if (!iceCandidateQueueRef.current.has(fromUserId)) {
            iceCandidateQueueRef.current.set(fromUserId, [])
          }
          iceCandidateQueueRef.current.get(fromUserId)!.push(candidate)
          return
        }
        await peerConn.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        // If error is due to invalid candidate (e.g., null candidate), ignore it
        if (candidate.candidate && candidate.candidate !== '') {
          console.error('Error adding ICE candidate:', error)
        }
      }
    } else {
      // Queue ICE candidate if peer connection doesn't exist yet
      if (!iceCandidateQueueRef.current.has(fromUserId)) {
        iceCandidateQueueRef.current.set(fromUserId, [])
      }
      iceCandidateQueueRef.current.get(fromUserId)!.push(candidate)
    }
  }, [])

  const getRemoteStreams = useCallback(() => {
    const streams: Array<{ userId: string; stream: MediaStream }> = []
    peerConnectionsRef.current.forEach(({ stream }, userId) => {
      // Validate stream exists and has tracks before including it
      if (stream && stream.getTracks().length > 0) {
        streams.push({ userId, stream })
      }
    })
    return streams
  }, [streamsUpdateCounter])

  return {
    streamsUpdateCounter,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    getRemoteStreams,
  }
}

