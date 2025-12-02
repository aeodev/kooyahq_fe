import { useEffect, useRef } from 'react'

interface UseAudioPlaybackOptions {
  stream: MediaStream | null
  muted?: boolean
}

export function useAudioPlayback({ stream, muted = false }: UseAudioPlaybackOptions) {
  const audioRef = useRef<HTMLAudioElement>(null)

  // Handle audio stream
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (stream) {
      // Cleanup previous stream
      if (audio.srcObject && audio.srcObject !== stream) {
        audio.srcObject = null
      }

      // Set audio stream
      audio.srcObject = stream
      audio.muted = muted

      // Attempt to play audio
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Only log non-abort errors
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Error playing audio:', error)
          }
        })
      }
    } else {
      audio.srcObject = null
    }
  }, [stream, muted])

  return {
    audioRef,
  }
}

