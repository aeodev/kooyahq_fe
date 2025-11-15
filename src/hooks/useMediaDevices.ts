import { useCallback, useRef } from 'react'

interface UseMediaDevicesOptions {
  localStreamRef: React.RefObject<MediaStream | null>
  peerConnectionsRef: React.RefObject<Map<string, { peerConnection: RTCPeerConnection; stream: MediaStream | null }>>
  setLocalStream: (stream: MediaStream) => void
}

export function useMediaDevices({
  localStreamRef,
  peerConnectionsRef,
  setLocalStream,
}: UseMediaDevicesOptions) {
  const deviceChangeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const replaceTrackInPeerConnections = useCallback(
    (track: MediaStreamTrack, kind: 'video' | 'audio') => {
      peerConnectionsRef.current?.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === kind)
        if (sender) {
          sender.replaceTrack(track)
        } else if (localStreamRef.current) {
          peerConnection.addTrack(track, localStreamRef.current)
        }
      })
    },
    [peerConnectionsRef, localStreamRef]
  )

  const changeVideoDevice = useCallback(
    async (deviceId: string) => {
      if (!localStreamRef.current) return

      if (deviceChangeTimerRef.current) {
        clearTimeout(deviceChangeTimerRef.current)
      }

      deviceChangeTimerRef.current = setTimeout(async () => {
        try {
          const audioTrack = localStreamRef.current?.getAudioTracks()[0]
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
            audio: audioTrack ? { deviceId: audioTrack.getSettings().deviceId } : true,
          })

          const newVideoTrack = stream.getVideoTracks()[0]
          const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0]

          if (oldVideoTrack && localStreamRef.current) {
            localStreamRef.current.removeTrack(oldVideoTrack)
            oldVideoTrack.stop()
          }

          if (localStreamRef.current && newVideoTrack) {
            localStreamRef.current.addTrack(newVideoTrack)
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
            replaceTrackInPeerConnections(newVideoTrack, 'video')
          }

          stream.getAudioTracks().forEach((track) => track.stop())
        } catch (error) {
          console.error('Error changing video device:', error)
        }
      }, 300)
    },
    [localStreamRef, setLocalStream, replaceTrackInPeerConnections]
  )

  const changeAudioInput = useCallback(
    async (deviceId: string) => {
      if (!localStreamRef.current) return

      if (deviceChangeTimerRef.current) {
        clearTimeout(deviceChangeTimerRef.current)
      }

      deviceChangeTimerRef.current = setTimeout(async () => {
        try {
          const videoTrack = localStreamRef.current?.getVideoTracks()[0]
          const stream = await navigator.mediaDevices.getUserMedia({
            video: videoTrack
              ? { deviceId: videoTrack.getSettings().deviceId, width: 1280, height: 720 }
              : false,
            audio: { deviceId: { exact: deviceId } },
          })

          const newAudioTrack = stream.getAudioTracks()[0]
          const oldAudioTrack = localStreamRef.current?.getAudioTracks()[0]

          if (oldAudioTrack && localStreamRef.current) {
            localStreamRef.current.removeTrack(oldAudioTrack)
            oldAudioTrack.stop()
          }

          if (localStreamRef.current && newAudioTrack) {
            localStreamRef.current.addTrack(newAudioTrack)
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
            replaceTrackInPeerConnections(newAudioTrack, 'audio')
          }

          stream.getVideoTracks().forEach((track) => track.stop())
        } catch (error) {
          console.error('Error changing audio input device:', error)
        }
      }, 300)
    },
    [localStreamRef, setLocalStream, replaceTrackInPeerConnections]
  )

  const changeAudioOutput = useCallback((deviceId: string) => {
    if ('setSinkId' in HTMLAudioElement.prototype) {
      document.querySelectorAll('audio, video').forEach((element) => {
        if (element instanceof HTMLAudioElement || element instanceof HTMLVideoElement) {
          ;(element as any).setSinkId(deviceId).catch((err: Error) => {
            console.error('Error setting audio output:', err)
          })
        }
      })
    }
  }, [])

  return { changeVideoDevice, changeAudioInput, changeAudioOutput }
}

