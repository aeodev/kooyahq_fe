import { useCallback } from 'react'
import {
  Room,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
} from 'livekit-client'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import type { LiveKitRefs } from './useLiveKitState'

interface UseLiveKitTogglesParams {
  refs: LiveKitRefs
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  isMirroredForRemote: boolean
  setLocalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>
  setIsVideoEnabled: React.Dispatch<React.SetStateAction<boolean>>
  setIsAudioEnabled: React.Dispatch<React.SetStateAction<boolean>>
  setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>
  setIsMirroredForRemote: React.Dispatch<React.SetStateAction<boolean>>
  cleanupMirror: () => void
  publishMirroredTrackForRemote: (
    room: Room,
    setLocalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>,
    setIsMirroredForRemote: React.Dispatch<React.SetStateAction<boolean>>,
    setState?: boolean
  ) => Promise<boolean>
}

export function useLiveKitToggles({
  refs,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isMirroredForRemote,
  setLocalStream,
  setIsVideoEnabled,
  setIsAudioEnabled,
  setIsScreenSharing,
  setIsMirroredForRemote,
  cleanupMirror,
  publishMirroredTrackForRemote,
}: UseLiveKitTogglesParams) {
  const user = useAuthStore((state) => state.user)
  const getStore = useCallback(() => useMeetStore.getState(), [])

  const toggleVideo = useCallback(async () => {
    const room = refs.room.current
    if (!room || !user) return

    const prev = isVideoEnabled
    const next = !prev

    try {
      await room.localParticipant.setCameraEnabled(next)
      setIsVideoEnabled(next)

      getStore().updateParticipant(user.id, { isVideoEnabled: next })

      if (next) {
        const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
        if (camPub?.track) {
          refs.localVideoTrack.current = camPub.track as LocalVideoTrack
          setLocalStream((prevStream) => {
            const s = new MediaStream(prevStream?.getTracks() || [])
            s.getVideoTracks().forEach((t) => {
              s.removeTrack(t)
            })
            s.addTrack(camPub.track!.mediaStreamTrack)
            return s
          })
          if (isMirroredForRemote) {
            await publishMirroredTrackForRemote(
              room,
              setLocalStream,
              setIsMirroredForRemote,
              false
            )
          }
        }
      } else {
        if (isMirroredForRemote) {
          cleanupMirror()
        }
        refs.localVideoTrack.current = null
        setLocalStream((prevStream) => {
          if (!prevStream) return null
          const s = new MediaStream(prevStream.getTracks())
          s.getVideoTracks().forEach((t) => {
            s.removeTrack(t)
          })
          return s.getTracks().length ? s : null
        })
      }
    } catch (error) {
      console.error('[LiveKit] Error toggling video:', error)
      setIsVideoEnabled(prev)
    }
  }, [
    refs,
    isVideoEnabled,
    isMirroredForRemote,
    user,
    setIsVideoEnabled,
    setLocalStream,
    setIsMirroredForRemote,
    cleanupMirror,
    publishMirroredTrackForRemote,
    getStore,
  ])

  const toggleAudio = useCallback(async () => {
    const room = refs.room.current
    if (!room || !user) return

    const prev = isAudioEnabled
    const next = !prev

    try {
      await room.localParticipant.setMicrophoneEnabled(next)
      setIsAudioEnabled(next)

      getStore().updateParticipant(user.id, { isAudioEnabled: next })

      if (next) {
        const micPub = room.localParticipant.getTrackPublication(
          Track.Source.Microphone
        )
        if (micPub?.track) {
          refs.localAudioTrack.current = micPub.track as LocalAudioTrack
          setLocalStream((prevStream) => {
            const s = new MediaStream(prevStream?.getTracks() || [])
            s.getAudioTracks().forEach((t) => s.removeTrack(t))
            s.addTrack(micPub.track!.mediaStreamTrack)
            return s
          })
        }
      } else {
        refs.localAudioTrack.current = null
        setLocalStream((prevStream) => {
          if (!prevStream) return null
          const s = new MediaStream(prevStream.getTracks())
          s.getAudioTracks().forEach((t) => s.removeTrack(t))
          return s.getTracks().length ? s : null
        })
      }
    } catch (error) {
      console.error('[LiveKit] Error toggling audio:', error)
      setIsAudioEnabled(prev)
    }
  }, [
    refs,
    isAudioEnabled,
    user,
    setIsAudioEnabled,
    setLocalStream,
    getStore,
  ])

  const toggleScreenShare = useCallback(async () => {
    const room = refs.room.current
    if (!room || !user) return

    const prev = isScreenSharing
    const next = !prev

    try {
      await room.localParticipant.setScreenShareEnabled(next)
      setIsScreenSharing(next)

      getStore().updateParticipant(user.id, { isScreenSharing: next })
    } catch (error) {
      console.error('[LiveKit] Screen share error:', error)
    }
  }, [refs, isScreenSharing, user, setIsScreenSharing, getStore])

  const toggleMirrorForRemote = useCallback(async () => {
    const room = refs.room.current
    if (!room || !user) return

    if (isScreenSharing) {
      console.warn('[LiveKit] Cannot toggle mirror while screen sharing')
      return
    }

    if (!isVideoEnabled || !refs.localVideoTrack.current) {
      console.warn('[LiveKit] Cannot toggle mirror while camera is disabled')
      return
    }

    const next = !isMirroredForRemote

    try {
      if (next) {
        const success = await publishMirroredTrackForRemote(
          room,
          setLocalStream,
          setIsMirroredForRemote,
          true
        )
        if (!success) return
      } else {
        cleanupMirror()

        let cameraTrack: LocalVideoTrack | null = null
        const currentPub = room.localParticipant.getTrackPublication(
          Track.Source.Camera
        )

        if (currentPub?.track) {
          await room.localParticipant.unpublishTrack(currentPub.track)
        }

        if (isVideoEnabled) {
          const originalTrack = refs.originalVideoTrack.current

          if (
            originalTrack &&
            originalTrack.mediaStreamTrack.readyState === 'live'
          ) {
            cameraTrack = originalTrack
          } else {
            try {
              cameraTrack = await createLocalVideoTrack({
                resolution: { width: 1280, height: 720 },
              })
            } catch (error) {
              console.error(
                '[LiveKit] Failed to create camera track when disabling mirror:',
                error
              )
              setIsMirroredForRemote(false)
              return
            }
          }

          await room.localParticipant.publishTrack(cameraTrack)
          refs.localVideoTrack.current = cameraTrack

          setLocalStream((prev) => {
            const newStream = new MediaStream()
            newStream.addTrack(cameraTrack!.mediaStreamTrack)
            if (prev) {
              const audioTracks = prev.getAudioTracks()
              audioTracks.forEach((track) => newStream.addTrack(track))
            }
            return newStream
          })
        } else {
          refs.localVideoTrack.current = null
        }

        setIsMirroredForRemote(false)
        console.log('[LiveKit] Mirror disabled, camera track restored')
      }
    } catch (error) {
      console.error('[LiveKit] Error toggling mirror:', error)
      cleanupMirror()
    }
  }, [
    refs,
    isMirroredForRemote,
    isVideoEnabled,
    isScreenSharing,
    user,
    setIsMirroredForRemote,
    setLocalStream,
    cleanupMirror,
    publishMirroredTrackForRemote,
  ])

  return {
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleMirrorForRemote,
  }
}

