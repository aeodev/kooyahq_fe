import { useEffect, useRef, useCallback } from 'react'

interface UseMirroredStreamOptions {
  localStreamRef: React.RefObject<MediaStream | null>
  peerConnectionsRef: React.RefObject<Map<string, { peerConnection: RTCPeerConnection; stream: MediaStream | null }>>
  mirroredStreamRef: React.RefObject<MediaStream | null>
  isMirrored: boolean
  isScreenSharing: boolean
}

export function useMirroredStream({
  localStreamRef,
  peerConnectionsRef,
  mirroredStreamRef,
  isMirrored,
  isScreenSharing,
}: UseMirroredStreamOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const createMirroredStream = useCallback((sourceStream: MediaStream): MediaStream | null => {
    if (!sourceStream) return null

    const videoTrack = sourceStream.getVideoTracks()[0]
    if (!videoTrack) return null

    // Create canvas for mirroring
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const video = document.createElement('video')
    video.srcObject = sourceStream
    video.autoplay = true
    video.playsInline = true
    videoRef.current = video

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    })

    let lastFrameTime = 0
    const targetFPS = 30
    const frameDuration = 1000 / targetFPS

    const drawFrame = (timestamp: number) => {
      if (timestamp - lastFrameTime >= frameDuration) {
        if (video.readyState >= 2) {
          ctx.save()
          ctx.scale(-1, 1) // Flip horizontally
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
          ctx.restore()
        }
        lastFrameTime = timestamp
      }
      animationFrameRef.current = requestAnimationFrame(drawFrame)
    }

    video.addEventListener('play', () => {
      drawFrame(0)
    })

    canvasRef.current = canvas
    const mirroredStream = canvas.captureStream(30) // 30 fps

    // Clone audio track to avoid issues if original stream is stopped
    const audioTrack = sourceStream.getAudioTracks()[0]
    if (audioTrack) {
      mirroredStream.addTrack(audioTrack.clone())
    }

    mirroredStreamRef.current = mirroredStream

    return mirroredStream
  }, [mirroredStreamRef])

  // Update mirrored stream when mirroring state changes
  useEffect(() => {
    if (!localStreamRef.current || isScreenSharing) return

    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (!videoTrack) return

    if (isMirrored) {
      // Create and use mirrored stream
      const mirrored = createMirroredStream(localStreamRef.current)
      if (mirrored) {
        const mirroredVideoTrack = mirrored.getVideoTracks()[0]
        peerConnectionsRef.current?.forEach(({ peerConnection }) => {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
          if (sender && mirroredVideoTrack) {
            sender.replaceTrack(mirroredVideoTrack)
          }
        })
      }
    } else {
      // Use original stream
      const originalVideoTrack = localStreamRef.current.getVideoTracks()[0]
      if (originalVideoTrack) {
        peerConnectionsRef.current?.forEach(({ peerConnection }) => {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
          if (sender && originalVideoTrack) {
            sender.replaceTrack(originalVideoTrack)
          }
        })
      }

      // Cleanup mirrored stream
      if (mirroredStreamRef.current) {
        mirroredStreamRef.current.getTracks().forEach((track) => track.stop())
        mirroredStreamRef.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
        videoRef.current = null
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        canvasRef.current = null
      }
    }
  }, [isMirrored, isScreenSharing, createMirroredStream, localStreamRef, peerConnectionsRef, mirroredStreamRef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mirroredStreamRef.current?.getTracks().forEach((track) => track.stop())
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }, [])

  // No return needed - mirroredStreamRef is passed in and updated
}

