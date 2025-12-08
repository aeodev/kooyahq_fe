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

    // Set fallback dimensions (default to 1280x720)
    // These will be updated when video metadata loads
    canvas.width = 1280
    canvas.height = 720

    const video = document.createElement('video')
    video.srcObject = sourceStream
    video.autoplay = true
    video.playsInline = true
    videoRef.current = video

    // Update canvas dimensions when video metadata loads
    const handleLoadedMetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    
    // Also try to get dimensions from track settings as fallback
    const trackSettings = videoTrack.getSettings()
    if (trackSettings.width && trackSettings.height) {
      canvas.width = trackSettings.width
      canvas.height = trackSettings.height
    }

    let lastFrameTime = 0
    const targetFPS = 30
    const frameDuration = 1000 / targetFPS

    const drawFrame = (timestamp: number) => {
      if (timestamp - lastFrameTime >= frameDuration) {
        // Validate canvas has valid dimensions before drawing
        if (canvas.width > 0 && canvas.height > 0 && video.readyState >= 2) {
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
      // Ensure canvas dimensions are set before starting to draw
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
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
    if (!localStreamRef.current || isScreenSharing) {
      // Pause animation when screen sharing or no stream
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (!videoTrack || !videoTrack.enabled) {
      // Pause animation when video disabled
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

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
      // Use original stream (only if video is enabled)
      const originalVideoTrack = localStreamRef.current.getVideoTracks()[0]
      if (originalVideoTrack && originalVideoTrack.enabled) {
        peerConnectionsRef.current?.forEach(({ peerConnection }) => {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
          if (sender && originalVideoTrack) {
            sender.replaceTrack(originalVideoTrack)
          }
        })
      } else if (!originalVideoTrack || !originalVideoTrack.enabled) {
        // Video is disabled - send null to peer connections
        peerConnectionsRef.current?.forEach(({ peerConnection }) => {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video')
          if (sender) {
            sender.replaceTrack(null)
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

