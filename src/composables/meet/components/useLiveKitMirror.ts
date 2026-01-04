import { useCallback } from 'react'
import { Room, Track, LocalVideoTrack } from 'livekit-client'
import type { LiveKitRefs } from './useLiveKitState'

export function useLiveKitMirror(
  refs: LiveKitRefs,
  isScreenSharing: boolean,
  isVideoEnabled: boolean,
  userId: string | null
) {
  const cleanupMirror = useCallback(() => {
    if (refs.mirrorAnimationFrame.current) {
      cancelAnimationFrame(refs.mirrorAnimationFrame.current)
      refs.mirrorAnimationFrame.current = null
    }
    if (refs.mirrorVideo.current) {
      refs.mirrorVideo.current.srcObject = null
      refs.mirrorVideo.current = null
    }
    if (refs.mirrorCanvas.current) {
      const ctx = refs.mirrorCanvas.current.getContext('2d')
      ctx?.clearRect(
        0,
        0,
        refs.mirrorCanvas.current.width,
        refs.mirrorCanvas.current.height
      )
      refs.mirrorCanvas.current = null
    }
    refs.originalVideoTrack.current = null
  }, [refs])

  const publishMirroredTrackForRemote = useCallback(
    async (
      room: Room,
      setLocalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>,
      setIsMirroredForRemote: React.Dispatch<React.SetStateAction<boolean>>,
      setState = true
    ): Promise<boolean> => {
      if (!room || !userId) return false

      if (isScreenSharing) {
        console.warn('[LiveKit] Cannot enable mirror while screen sharing')
        return false
      }

      if (!refs.localVideoTrack.current) {
        console.warn('[LiveKit] Cannot enable mirror without an active camera track')
        return false
      }

      const sourceTrack = refs.localVideoTrack.current
      refs.originalVideoTrack.current = sourceTrack

      const video = document.createElement('video')
      video.srcObject = new MediaStream([sourceTrack.mediaStreamTrack])
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      refs.mirrorVideo.current = video

      let resolveFirstFrame: (() => void) | null = null
      const firstFramePromise = new Promise<void>((resolve, reject) => {
        resolveFirstFrame = resolve
        setTimeout(
          () => reject(new Error('Mirror first frame not drawn in time')),
          1500
        )
      })

      const settings = sourceTrack.mediaStreamTrack.getSettings()
      const width = settings.width || 1280
      const height = settings.height || 720

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      refs.mirrorCanvas.current = canvas

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('[LiveKit] Failed to get canvas context')
        return false
      }

      const ensureCanvasSize = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          return true
        }
        if (canvas.width > 0 && canvas.height > 0) {
          return true
        }
        return false
      }

      const drawFrame = () => {
        if (
          !refs.mirrorCanvas.current ||
          !refs.mirrorVideo.current ||
          !ctx
        ) {
          return
        }

        if (!ensureCanvasSize()) {
          refs.mirrorAnimationFrame.current = requestAnimationFrame(drawFrame)
          return
        }

        if (refs.mirrorVideo.current.readyState >= 2) {
          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(
            refs.mirrorVideo.current,
            -canvas.width,
            0,
            canvas.width,
            canvas.height
          )
          ctx.restore()
          if (resolveFirstFrame) {
            resolveFirstFrame()
            resolveFirstFrame = null
          }
        }

        refs.mirrorAnimationFrame.current = requestAnimationFrame(drawFrame)
      }

      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (video.readyState >= 2) {
            resolve()
          } else {
            video.addEventListener('loadeddata', () => resolve(), { once: true })
          }
        }
        checkReady()
      })

      try {
        await video.play()
      } catch (err) {
        console.warn(
          '[LiveKit] Mirror video.play() blocked (likely no gesture); continuing with canvas draw',
          err
        )
      }

      drawFrame()

      try {
        await firstFramePromise
      } catch (err) {
        console.error('[LiveKit] Mirror failed to draw first frame:', err)
        cleanupMirror()
        return false
      }

      const mirroredStream = canvas.captureStream(30)
      const mirroredVideoTrackMediaStream = mirroredStream.getVideoTracks()[0]

      if (!mirroredVideoTrackMediaStream) {
        console.error('[LiveKit] Failed to capture mirrored video track')
        cleanupMirror()
        return false
      }

      mirroredVideoTrackMediaStream.enabled = true
      const mirroredVideoTrack = new LocalVideoTrack(mirroredVideoTrackMediaStream)

      await room.localParticipant.unpublishTrack(sourceTrack, false)
      await room.localParticipant.publishTrack(mirroredVideoTrack, {
        source: Track.Source.Camera,
      })
      refs.localVideoTrack.current = mirroredVideoTrack

      setLocalStream((prev) => {
        const newStream = new MediaStream()
        newStream.addTrack(sourceTrack.mediaStreamTrack)
        if (prev) {
          const audioTracks = prev.getAudioTracks()
          audioTracks.forEach((track) => newStream.addTrack(track))
        }
        return newStream
      })

      if (setState) {
        setIsMirroredForRemote(true)
      }
      console.log('[LiveKit] Mirror enabled for remote participants')
      return true
    },
    [refs, isScreenSharing, isVideoEnabled, userId, cleanupMirror]
  )

  return {
    cleanupMirror,
    publishMirroredTrackForRemote,
  }
}

