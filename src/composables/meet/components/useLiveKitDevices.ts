import { useCallback } from 'react'
import {
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client'
import type { LiveKitRefs } from './useLiveKitState'

export function useLiveKitDevices(
  refs: LiveKitRefs,
  isVideoEnabled: boolean,
  isAudioEnabled: boolean,
  setLocalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>
) {
  const changeVideoDevice = useCallback(
    async (deviceId: string) => {
      const room = refs.room.current
      if (!room) return

      if (!isVideoEnabled || !refs.localVideoTrack.current) {
        console.warn('[LiveKit] Cannot change video device while camera is disabled')
        return
      }

      try {
        const newTrack = await createLocalVideoTrack({
          deviceId,
          resolution: { width: 1280, height: 720 },
        })

        await room.localParticipant.unpublishTrack(refs.localVideoTrack.current)
        refs.localVideoTrack.current.stop()

        refs.localVideoTrack.current = newTrack
        await room.localParticipant.publishTrack(newTrack)

        setLocalStream((prev) => {
          if (prev) {
            const newStream = new MediaStream(prev.getTracks())
            const oldTrack = newStream.getVideoTracks()[0]
            if (oldTrack) {
              newStream.removeTrack(oldTrack)
            }
            newStream.addTrack(newTrack.mediaStreamTrack)
            return newStream
          }
          return new MediaStream([newTrack.mediaStreamTrack])
        })
      } catch (error) {
        console.error('[LiveKit] Error changing video device:', error)
      }
    },
    [refs, isVideoEnabled, setLocalStream]
  )

  const changeAudioInput = useCallback(
    async (deviceId: string) => {
      const room = refs.room.current
      if (!room) return

      if (!isAudioEnabled || !refs.localAudioTrack.current) {
        console.warn(
          '[LiveKit] Cannot change audio device while microphone is disabled'
        )
        return
      }

      try {
        const newTrack = await createLocalAudioTrack({ deviceId })

        await room.localParticipant.unpublishTrack(refs.localAudioTrack.current)
        refs.localAudioTrack.current.stop()

        refs.localAudioTrack.current = newTrack
        await room.localParticipant.publishTrack(newTrack)

        setLocalStream((prev) => {
          if (prev) {
            const newStream = new MediaStream(prev.getTracks())
            const oldTrack = newStream.getAudioTracks()[0]
            if (oldTrack) {
              newStream.removeTrack(oldTrack)
            }
            newStream.addTrack(newTrack.mediaStreamTrack)
            return newStream
          }
          return new MediaStream([newTrack.mediaStreamTrack])
        })
      } catch (error) {
        console.error('[LiveKit] Error changing audio input:', error)
      }
    },
    [refs, isAudioEnabled, setLocalStream]
  )

  const changeAudioOutput = useCallback(async (deviceId: string) => {
    try {
      if ('setSinkId' in HTMLAudioElement.prototype) {
        console.log('[LiveKit] Audio output device change requested:', deviceId)
      }
    } catch (error) {
      console.error('[LiveKit] Error changing audio output:', error)
    }
  }, [])

  const flipCamera = useCallback(async () => {
    const room = refs.room.current
    if (!room) return

    if (!isVideoEnabled || !refs.localVideoTrack.current) {
      console.warn('[LiveKit] Cannot flip camera while camera is disabled')
      return
    }

    try {
      const currentDeviceId =
        refs.localVideoTrack.current.mediaStreamTrack.getSettings().deviceId
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((d) => d.kind === 'videoinput')

      const currentIndex = videoDevices.findIndex(
        (d) => d.deviceId === currentDeviceId
      )
      const nextIndex = (currentIndex + 1) % videoDevices.length
      const nextDevice = videoDevices[nextIndex]

      if (nextDevice) {
        await changeVideoDevice(nextDevice.deviceId)
      }
    } catch (error) {
      console.error('[LiveKit] Error flipping camera:', error)
    }
  }, [refs, isVideoEnabled, changeVideoDevice])

  return {
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
    flipCamera,
  }
}

