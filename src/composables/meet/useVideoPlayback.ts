import { useEffect, useRef, useState } from 'react'

interface UseVideoPlaybackOptions {
  stream: MediaStream | null
  isMirrored?: boolean
  muted?: boolean
}

export function useVideoPlayback({ stream, isMirrored = false, muted = false }: UseVideoPlaybackOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playPromiseRef = useRef<Promise<void> | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const [hasVideoTrack, setHasVideoTrack] = useState(false)

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Handle video stream
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Cancel any pending play attempts when stream changes
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {}) // Suppress errors from cancelled promises
      playPromiseRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (stream) {
      // Only update srcObject if it's actually different
      if (video.srcObject !== stream) {
        // Pause first to avoid interruption
        video.pause()
        video.srcObject = stream
      }
      
      // Check if stream has video tracks
      const checkVideoTracks = () => {
        const videoTracks = stream.getVideoTracks()
        setHasVideoTrack(videoTracks.length > 0 && videoTracks[0]?.enabled)
      }
      
      checkVideoTracks()
      
      // Listen for track enabled/disabled changes
      const updateVideoTrack = () => {
        checkVideoTracks()
      }
      
      // Listen for track added/removed events on the stream
      const handleTrackAdded = () => {
        checkVideoTracks()
      }
      
      const handleTrackRemoved = () => {
        checkVideoTracks()
      }
      
      stream.addEventListener('addtrack', handleTrackAdded)
      stream.addEventListener('removetrack', handleTrackRemoved)
      
      // Also listen to individual track events
      const videoTracks = stream.getVideoTracks()
      videoTracks.forEach(track => {
        track.addEventListener('enabled', updateVideoTrack)
        track.addEventListener('disabled', updateVideoTrack)
      })

      // Attempt to play video with retry logic
      const attemptPlay = async (retries = 3) => {
        // Cancel any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }

        // Don't attempt if component unmounted or video not ready
        if (!isMountedRef.current || !videoRef.current) return
        
        const currentVideo = videoRef.current
        
        // Wait for video to be ready (HAVE_METADATA at minimum)
        if (currentVideo.readyState < 1) {
          if (retries > 0) {
            retryTimeoutRef.current = setTimeout(() => attemptPlay(retries), 100)
          }
          return
        }

        try {
          // Cancel previous promise if exists
          if (playPromiseRef.current) {
            playPromiseRef.current.catch(() => {})
          }
          
          playPromiseRef.current = currentVideo.play()
          await playPromiseRef.current
          playPromiseRef.current = null
        } catch (error) {
          playPromiseRef.current = null
          // AbortError is expected when stream changes - don't log it
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`Error playing video (${retries} retries left):`, error)
          }
          if (retries > 0 && isMountedRef.current) {
            retryTimeoutRef.current = setTimeout(() => attemptPlay(retries - 1), 500)
          }
        }
      }

      // Handle video readiness - wait for metadata before playing
      const handleLoadedMetadata = () => {
        if (isMountedRef.current && videoRef.current?.paused) {
          attemptPlay()
        }
      }

      const handleCanPlay = () => {
        // Video can play, ensure it's playing
        if (isMountedRef.current && videoRef.current?.paused) {
          attemptPlay()
        }
      }

      const handlePlay = () => {
        // Video started playing successfully
      }

      const handleError = (error: Event) => {
        console.error('Video element error:', error)
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('play', handlePlay)
      video.addEventListener('error', handleError)

      // If video is already ready, attempt play
      if (video.readyState >= 1) {
        attemptPlay()
      }
      
      return () => {
        stream.removeEventListener('addtrack', handleTrackAdded)
        stream.removeEventListener('removetrack', handleTrackRemoved)
        videoTracks.forEach(track => {
          track.removeEventListener('enabled', updateVideoTrack)
          track.removeEventListener('disabled', updateVideoTrack)
        })
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('error', handleError)
        
        // Cancel any pending play attempts
        if (playPromiseRef.current) {
          playPromiseRef.current.catch(() => {})
          playPromiseRef.current = null
        }
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }
      }
    } else {
      setHasVideoTrack(false)
      video.srcObject = null
    }
  }, [stream])

  return {
    videoRef,
    hasVideoTrack,
    isMirrored,
    muted,
  }
}

