import { useEffect, useCallback } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  createLocalVideoTrack,
  createLocalAudioTrack,
  ConnectionState,
} from 'livekit-client'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import { useSocketStore } from '@/stores/socket.store'
import { fetchLiveKitToken } from '@/utils/livekit'
import axiosInstance from '@/utils/axios.instance'
import { GET_USER_BY_ID } from '@/utils/api.routes'
import type { LiveKitRefs } from './useLiveKitState'
import { getParticipantState } from './useLiveKitParticipant'

interface UseLiveKitRoomParams {
  meetId: string | null
  initialVideoEnabled: boolean
  initialAudioEnabled: boolean
  refs: LiveKitRefs
  getDatabaseId: (liveKitId: string) => string
  setIdentityMapping: (liveKitId: string, databaseId: string) => void
  forceUpdate: () => void
  setLocalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>
  setConnectionState: React.Dispatch<React.SetStateAction<ConnectionState>>
  setIsVideoEnabled: React.Dispatch<React.SetStateAction<boolean>>
  setIsAudioEnabled: React.Dispatch<React.SetStateAction<boolean>>
  setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>
  cleanupRoom: () => void
}

interface ParticipantJoinedData {
  userId: string
  userName: string
  profilePic?: string
  liveKitIdentity?: string
}

interface LiveKitIdentityData {
  userId: string
  liveKitIdentity: string
}

export function useLiveKitRoom({
  meetId,
  initialVideoEnabled,
  initialAudioEnabled,
  refs,
  getDatabaseId,
  setIdentityMapping,
  forceUpdate,
  setLocalStream,
  setConnectionState,
  setIsVideoEnabled,
  setIsAudioEnabled,
  setIsScreenSharing,
  cleanupRoom,
}: UseLiveKitRoomParams) {
  const user = useAuthStore((state) => state.user)
  const socket = useSocketStore((state) => state.socket)
  const getStore = useCallback(() => useMeetStore.getState(), [])

  const fetchParticipantProfilePic = useCallback(
    async (userId: string, mounted: boolean, attempt: number) => {
      if (!userId || userId === user?.id) return

      try {
        const response = await axiosInstance.get(GET_USER_BY_ID(userId))
        if (!mounted || attempt !== refs.connectAttempt.current) return

        const profilePic = response.data.data?.profilePic
        if (profilePic) {
          getStore().updateParticipant(userId, { profilePic })
        }
      } catch (error) {
        console.debug('[LiveKit] Failed to fetch profilePic for participant:', error)
      }
    },
    [user?.id, refs.connectAttempt, getStore]
  )

  useEffect(() => {
    if (!meetId || !user) {
      if (refs.room.current) {
        cleanupRoom()
      }
      return
    }

    const currentAttempt = ++refs.connectAttempt.current
    let mounted = true
    let cleanupSocket: (() => void) | undefined

    const connectRoom = async () => {
      try {
        const { data } = await fetchLiveKitToken(meetId)
        const { token, url } = data

        if (currentAttempt !== refs.connectAttempt.current || !mounted) {
          return
        }

        const room = new Room()
        refs.room.current = room

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return

          if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
            const isScreenShare = publication.source === Track.Source.ScreenShare
            const targetRef = isScreenShare
              ? refs.remoteScreenShares
              : refs.remoteStreams

            let stream = targetRef.current.get(participant.identity)
            if (!stream) {
              stream = new MediaStream()
              targetRef.current.set(participant.identity, stream)
            }
            stream.addTrack(track.mediaStreamTrack)
            forceUpdate()

            const databaseId = getDatabaseId(participant.identity)

            if (isScreenShare) {
              getStore().updateParticipant(databaseId, {
                isScreenSharing: !publication.isMuted,
              })
            } else if (track.kind === Track.Kind.Video) {
              getStore().updateParticipant(databaseId, {
                isVideoEnabled: !publication.isMuted,
              })
            } else if (track.kind === Track.Kind.Audio) {
              getStore().updateParticipant(databaseId, {
                isAudioEnabled: !publication.isMuted,
              })
            }
          }
        })

        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return

          const isScreenShare = publication.source === Track.Source.ScreenShare
          const targetRef = isScreenShare
            ? refs.remoteScreenShares
            : refs.remoteStreams

          const stream = targetRef.current.get(participant.identity)
          if (stream) {
            stream.removeTrack(track.mediaStreamTrack)
            if (stream.getTracks().length === 0) {
              targetRef.current.delete(participant.identity)
            }
          }
          forceUpdate()
        })

        room.on(RoomEvent.TrackMuted, (publication, participant) => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          const localIdentity = room.localParticipant?.identity
          if (participant.identity === localIdentity) return

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
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          const localIdentity = room.localParticipant?.identity
          if (participant.identity === localIdentity) return

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

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          const localIdentity = room.localParticipant?.identity
          if (participant.identity === localIdentity) return

          const databaseId = getDatabaseId(participant.identity)
          const state = getParticipantState(participant)
          getStore().addParticipant({
            userId: databaseId,
            userName: participant.name || undefined,
            ...state,
          })

          fetchParticipantProfilePic(databaseId, mounted, currentAttempt)
        })

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          refs.remoteStreams.current.delete(participant.identity)
          refs.remoteScreenShares.current.delete(participant.identity)
          const databaseId = getDatabaseId(participant.identity)
          getStore().removeParticipant(databaseId)
          forceUpdate()
        })

        room.on(RoomEvent.TrackPublished, (publication, participant) => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
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
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          if (publication.source === Track.Source.ScreenShare) {
            const localIdentity = room.localParticipant?.identity
            
            // For local participant, verify screen share actually stopped
            if (participant.identity === localIdentity) {
              const screenPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
              if (screenPub && !screenPub.isMuted) return // Still active, ignore
            }
            
            const databaseId = getDatabaseId(participant.identity)
            getStore().updateParticipant(databaseId, {
              isScreenSharing: false,
            })
            if (participant.identity === localIdentity) {
              setIsScreenSharing(false)
            }
          }
        })

        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          setConnectionState(state)
        })

        room.on(RoomEvent.Disconnected, () => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          refs.remoteStreams.current.clear()
          refs.remoteScreenShares.current.clear()
          forceUpdate()
        })

        room.on(RoomEvent.Reconnecting, () => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          console.log('[LiveKit] Reconnecting...')
        })

        room.on(RoomEvent.Reconnected, () => {
          if (!mounted || currentAttempt !== refs.connectAttempt.current) return
          console.log('[LiveKit] Reconnected')
        })

        await room.connect(url, token)

        if (currentAttempt !== refs.connectAttempt.current || !mounted) {
          room.disconnect()
          return
        }

        const tracks: MediaStreamTrack[] = []

        if (initialVideoEnabled) {
          try {
            const videoTrack = await createLocalVideoTrack({
              resolution: { width: 1280, height: 720 },
            })
            refs.localVideoTrack.current = videoTrack
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
            refs.localAudioTrack.current = audioTrack
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

        const localIdentity = room.localParticipant.identity
        setIdentityMapping(localIdentity, user.id)

        if (socket?.connected && meetId) {
          socket.emit('meet:livekit-identity', {
            meetId,
            userId: user.id,
            liveKitIdentity: localIdentity,
          })
        }

        getStore().addParticipant({
          userId: user.id,
          userName: user.name,
          profilePic: user.profilePic,
          isVideoEnabled: refs.localVideoTrack.current !== null,
          isAudioEnabled: refs.localAudioTrack.current !== null,
          isScreenSharing: false,
        })

        room.remoteParticipants.forEach((participant) => {
          const databaseId = getDatabaseId(participant.identity)
          const state = getParticipantState(participant)
          getStore().addParticipant({
            userId: databaseId,
            userName: participant.name || undefined,
            ...state,
          })

          fetchParticipantProfilePic(databaseId, mounted, currentAttempt)
        })

        if (socket?.connected) {
          const handleParticipantJoined = (data: ParticipantJoinedData) => {
            if (!mounted || currentAttempt !== refs.connectAttempt.current) return

            if (data.liveKitIdentity) {
              setIdentityMapping(data.liveKitIdentity, data.userId)
            }

            const existing = getStore().participants.get(data.userId)
            if (!existing) {
              getStore().addParticipant({
                userId: data.userId,
                userName: data.userName,
                profilePic: data.profilePic,
                isVideoEnabled: true,
                isAudioEnabled: true,
                isScreenSharing: false,
              })
            } else if (data.profilePic && !existing.profilePic) {
              getStore().updateParticipant(data.userId, { profilePic: data.profilePic })
            }
          }

          const handleParticipantLeft = (data: { userId: string }) => {
            if (!mounted || currentAttempt !== refs.connectAttempt.current) return
            getStore().removeParticipant(data.userId)
          }

          const handleLiveKitIdentity = (data: LiveKitIdentityData) => {
            if (!mounted || currentAttempt !== refs.connectAttempt.current) return
            setIdentityMapping(data.liveKitIdentity, data.userId)
            const existing = getStore().participants.get(data.userId)
            if (existing) {
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
      const room = refs.room.current
      if (room) {
        room.removeAllListeners()
        room.disconnect()
        refs.room.current = null
      }
    }
  }, [meetId, user?.id])
}
