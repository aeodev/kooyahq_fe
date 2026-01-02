import { useState, useCallback, useEffect, useRef } from 'react'

interface UsePictureInPictureReturn {
  isPiPActive: boolean
  isPiPSupported: boolean
  togglePiP: (videoElement?: HTMLVideoElement | null) => Promise<void>
  exitPiP: () => Promise<void>
  setVideoElement: (element: HTMLVideoElement | null) => void
  enterPiP: () => Promise<void>
}

export function usePictureInPicture(): UsePictureInPictureReturn {
  const [isPiPActive, setIsPiPActive] = useState(false)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  // Track if user has ever used PiP (required for auto-PiP to work due to browser permission)
  const hasUserTriggeredPiPRef = useRef(false)

  // Check if PiP is supported in this browser
  const isPiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document

  // Handle PiP events
  useEffect(() => {
    const handleEnterPiP = () => {
      setIsPiPActive(true)
      hasUserTriggeredPiPRef.current = true // Mark that user has triggered PiP at least once
      console.log('[PiP] Entered Picture-in-Picture mode')
    }

    const handleLeavePiP = () => {
      setIsPiPActive(false)
      console.log('[PiP] Exited Picture-in-Picture mode')
    }

    // Listen for PiP changes on any video element
    document.addEventListener('enterpictureinpicture', handleEnterPiP)
    document.addEventListener('leavepictureinpicture', handleLeavePiP)

    return () => {
      document.removeEventListener('enterpictureinpicture', handleEnterPiP)
      document.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [])

  // Auto-PiP on tab switch (visibility change)
  useEffect(() => {
    if (!isPiPSupported) return

    const handleVisibilityChange = async () => {
      const videoElement = videoElementRef.current
      if (!videoElement) return

      // Only auto-PiP if user has triggered it manually at least once (browser permission requirement)
      if (!hasUserTriggeredPiPRef.current) return

      try {
        if (document.hidden && !document.pictureInPictureElement) {
          // Tab hidden - enter PiP
          if (videoElement.readyState >= 2) {
            await videoElement.requestPictureInPicture()
            console.log('[PiP] Auto-entered PiP on tab switch')
          }
        } else if (!document.hidden && document.pictureInPictureElement) {
          // Tab visible - exit PiP
          await document.exitPictureInPicture()
          console.log('[PiP] Auto-exited PiP on tab return')
        }
      } catch (error) {
        // Silently fail for auto-PiP (user may have denied permission)
        console.log('[PiP] Auto PiP skipped:', error)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isPiPSupported])

  // Set video element for auto-PiP
  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoElementRef.current = element
  }, [])

  // Enter PiP mode (using registered video element)
  const enterPiP = useCallback(async () => {
    const videoElement = videoElementRef.current
    if (!isPiPSupported || !videoElement) {
      console.warn('[PiP] Cannot enter PiP - not supported or no video element')
      return
    }

    try {
      if (document.pictureInPictureElement) {
        // Already in PiP
        return
      }

      // Ensure video has content before requesting PiP
      if (videoElement.readyState < 2) {
        console.warn('[PiP] Video not ready yet, waiting...')
        await new Promise<void>((resolve) => {
          const handleReady = () => {
            videoElement.removeEventListener('loadeddata', handleReady)
            resolve()
          }
          videoElement.addEventListener('loadeddata', handleReady)
        })
      }

      await videoElement.requestPictureInPicture()
    } catch (error) {
      console.error('[PiP] Error entering Picture-in-Picture:', error)
    }
  }, [isPiPSupported])

  // Toggle PiP mode
  const togglePiP = useCallback(async (videoElement?: HTMLVideoElement | null) => {
    // Use provided video element or fall back to registered one
    const element = videoElement ?? videoElementRef.current

    if (!isPiPSupported) {
      console.warn('[PiP] Picture-in-Picture is not supported in this browser')
      return
    }

    if (!element) {
      console.warn('[PiP] No video element provided')
      return
    }

    try {
      if (document.pictureInPictureElement) {
        // Exit PiP if already active
        await document.exitPictureInPicture()
      } else {
        // Enter PiP mode
        // Ensure video has content before requesting PiP
        if (element.readyState < 2) {
          console.warn('[PiP] Video not ready yet, waiting...')
          await new Promise<void>((resolve) => {
            const handleReady = () => {
              element.removeEventListener('loadeddata', handleReady)
              resolve()
            }
            element.addEventListener('loadeddata', handleReady)
          })
        }
        
        await element.requestPictureInPicture()
      }
    } catch (error) {
      console.error('[PiP] Error toggling Picture-in-Picture:', error)
    }
  }, [isPiPSupported])

  // Exit PiP mode
  const exitPiP = useCallback(async () => {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture()
      } catch (error) {
        console.error('[PiP] Error exiting Picture-in-Picture:', error)
      }
    }
  }, [])

  return {
    isPiPActive,
    isPiPSupported,
    togglePiP,
    exitPiP,
    setVideoElement,
    enterPiP,
  }
}
