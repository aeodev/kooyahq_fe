import { useEffect, useState, useRef } from 'react'

interface UseActiveSpeakerOptions {
  remoteStreams: Map<string, MediaStream>
  currentUserId?: string | null
}

const AUDIO_THRESHOLD = 30 // Minimum audio level to be considered "speaking"
const SMOOTHING_TIME_CONSTANT = 0.8 // For smoothing audio level changes

export function useActiveSpeaker({ remoteStreams, currentUserId: _currentUserId }: UseActiveSpeakerOptions): string | null {
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const [analyserCount, setAnalyserCount] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; clonedTrack?: MediaStreamTrack }>>(new Map())
  const audioLevelsRef = useRef<Map<string, number>>(new Map())
  const animationFrameRef = useRef<number | null>(null)

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        // Resume AudioContext if suspended (requires user interaction)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch((error) => {
            console.warn('Failed to resume AudioContext:', error)
          })
        }
      } catch (error) {
        console.error('Failed to create AudioContext:', error)
        return
      }
    }

    return () => {
      // Cleanup analysers
      analysersRef.current.forEach(({ source, clonedTrack }) => {
        try {
          source.disconnect()
          // Stop cloned track if it exists
          if (clonedTrack) {
            clonedTrack.stop()
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
      })
      analysersRef.current.clear()
      audioLevelsRef.current.clear()

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Set up audio analysers for each remote stream
  useEffect(() => {
    const audioContext = audioContextRef.current
    if (!audioContext) return

    // Clean up old analysers for streams that no longer exist
    analysersRef.current.forEach(({ source, clonedTrack }, userId) => {
      if (!remoteStreams.has(userId)) {
        try {
          source.disconnect()
          // Stop cloned track if it exists
          if (clonedTrack) {
            clonedTrack.stop()
          }
        } catch (error) {
          // Ignore errors
        }
        analysersRef.current.delete(userId)
        audioLevelsRef.current.delete(userId)
        setAnalyserCount(analysersRef.current.size)
      }
    })

    // Create analysers for new streams
    remoteStreams.forEach((stream, userId) => {
      if (analysersRef.current.has(userId)) return

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) return

      try {
        // Resume AudioContext if suspended
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch((error) => {
            console.warn('Failed to resume AudioContext:', error)
          })
        }

        // Clone audio track to avoid interference with playback
        // This prevents the analyser from affecting the audio played in video/audio elements
        const audioTrack = audioTracks[0]
        const clonedTrack = audioTrack.clone()
        const analyserStream = new MediaStream([clonedTrack])

        const source = audioContext.createMediaStreamSource(analyserStream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT
        source.connect(analyser)

        analysersRef.current.set(userId, { analyser, source, clonedTrack })
        audioLevelsRef.current.set(userId, 0)
        setAnalyserCount(analysersRef.current.size)
      } catch (error) {
        console.error(`Failed to create analyser for ${userId}:`, error)
      }
    })

    setAnalyserCount(analysersRef.current.size)
  }, [remoteStreams])

  // Analyze audio levels and determine active speaker
  useEffect(() => {
    const audioContext = audioContextRef.current
    if (!audioContext || analyserCount === 0) {
      setActiveSpeaker(null)
      return
    }

    const dataArray = new Uint8Array(256)

    const analyzeAudio = () => {
      let maxLevel = 0
      let activeUserId: string | null = null

      analysersRef.current.forEach(({ analyser }, userId) => {
        analyser.getByteFrequencyData(dataArray)

        // Calculate average audio level
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const averageLevel = sum / dataArray.length

        // Store the level
        audioLevelsRef.current.set(userId, averageLevel)

        // Check if this is the highest level above threshold
        if (averageLevel > maxLevel && averageLevel > AUDIO_THRESHOLD) {
          maxLevel = averageLevel
          activeUserId = userId
        }
      })

      // Update active speaker if changed
      setActiveSpeaker((prev) => {
        // Only update if we have a valid active speaker or if previous was set
        if (activeUserId !== null) {
          return activeUserId
        }
        // If no one is speaking above threshold, keep previous speaker for a moment
        // This prevents rapid switching when audio levels drop briefly
        return prev
      })

      animationFrameRef.current = requestAnimationFrame(analyzeAudio)
    }

    // Start analysis
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [analyserCount])

  return activeSpeaker
}

