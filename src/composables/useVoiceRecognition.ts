import { useState, useEffect, useRef, useCallback } from 'react'

// Web Speech API type definitions
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

type RecognitionState = 'idle' | 'listening' | 'processing' | 'error'

interface UseVoiceRecognitionOptions {
  onResult?: (text: string) => void
  onFinalResult?: (text: string) => void
  onError?: (error: string) => void
  continuous?: boolean
  interimResults?: boolean
}

interface UseVoiceRecognitionReturn {
  isSupported: boolean
  state: RecognitionState
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  reset: () => void
}

export function useVoiceRecognition({
  onResult,
  onFinalResult,
  onError,
  continuous = true,
  interimResults = true,
}: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
  const [state, setState] = useState<RecognitionState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  // Refs to avoid stale closures in event handlers
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const stateRef = useRef<RecognitionState>('idle')
  const shouldRestartRef = useRef(false)
  const callbacksRef = useRef({ onResult, onFinalResult, onError })

  // Keep state ref in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Keep callbacks ref in sync (avoids recreating recognition on callback changes)
  useEffect(() => {
    callbacksRef.current = { onResult, onFinalResult, onError }
  }, [onResult, onFinalResult, onError])

  // One-time initialization of speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    try {
      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setState('listening')
        stateRef.current = 'listening'
        setError(null)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0].transcript
          if (result.isFinal) {
            finalTranscript += text + ' '
          } else {
            interimTranscript += text
          }
        }

        const fullTranscript = finalTranscript || interimTranscript
        setTranscript(fullTranscript.trim())

        // Call callbacks from ref (always current)
        if (interimTranscript && callbacksRef.current.onResult) {
          callbacksRef.current.onResult(interimTranscript.trim())
        }

        if (finalTranscript && callbacksRef.current.onFinalResult) {
          callbacksRef.current.onFinalResult(finalTranscript.trim())
          setState('processing')
          stateRef.current = 'processing'
        }
      }

      recognition.onend = () => {
        // Auto-restart if we should keep listening (continuous wake word mode)
        if (shouldRestartRef.current && stateRef.current !== 'error') {
          setTimeout(() => {
            if (shouldRestartRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start()
              } catch {
                // Ignore if already started
              }
            }
          }, 100)
        } else {
          setState('idle')
          stateRef.current = 'idle'
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // 'aborted' and 'no-speech' are not real errors for continuous listening
        if (event.error === 'aborted') {
          return
        }

        if (event.error === 'no-speech') {
          // Just restart if in continuous mode
          if (shouldRestartRef.current) {
            return
          }
        }

        let errorMessage = 'Voice recognition error'
        switch (event.error) {
          case 'audio-capture':
            errorMessage = 'Microphone not found'
            break
          case 'not-allowed':
            errorMessage = 'Microphone permission denied'
            break
          case 'network':
            errorMessage = 'Network error'
            break
          default:
            errorMessage = `Recognition error: ${event.error}`
        }

        setError(errorMessage)
        setState('error')
        stateRef.current = 'error'

        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(errorMessage)
        }
      }

      recognitionRef.current = recognition
    } catch (err) {
      setIsSupported(false)
      setError('Failed to initialize voice recognition')
      setState('error')
    }

    // Cleanup on unmount
    return () => {
      shouldRestartRef.current = false
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // Ignore
        }
        recognitionRef.current = null
      }
    }
  }, [continuous, interimResults]) // Only recreate if these config options change

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Voice recognition not supported')
      setState('error')
      callbacksRef.current.onError?.('Voice recognition not supported')
      return
    }

    setTranscript('')
    setError(null)
    shouldRestartRef.current = true // Enable auto-restart

    try {
      recognitionRef.current.start()
    } catch (err) {
      // Already running - that's fine
      if (err instanceof Error && !err.message.includes('already started')) {
        setError('Failed to start voice recognition')
        setState('error')
        callbacksRef.current.onError?.('Failed to start voice recognition')
      }
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false // Disable auto-restart

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
    }

    setState('idle')
    stateRef.current = 'idle'
  }, [])

  const reset = useCallback(() => {
    stopListening()
    setTranscript('')
    setError(null)
  }, [stopListening])

  return {
    isSupported,
    state,
    transcript,
    error,
    startListening,
    stopListening,
    reset,
  }
}
