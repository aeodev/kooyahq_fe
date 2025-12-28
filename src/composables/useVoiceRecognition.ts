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
  const [isSupported, setIsSupported] = useState<boolean>(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    
    setIsSupported(!!SpeechRecognition)
    
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = continuous
        recognition.interimResults = interimResults
        recognition.lang = 'en-US'

        // Handle recognition start
        recognition.onstart = () => {
          setState('listening')
          setError(null)
        }

        // Handle recognition results
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript
            }
          }

          const fullTranscript = finalTranscript || interimTranscript
          setTranscript(fullTranscript.trim())

          // Call callbacks
          if (interimTranscript && onResult) {
            onResult(interimTranscript.trim())
          }

          if (finalTranscript && onFinalResult) {
            onFinalResult(finalTranscript.trim())
            setState('processing')
          }
        }

        // Handle recognition end
        recognition.onend = () => {
          if (state === 'listening') {
            setState('idle')
          }
        }

        // Handle errors
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          let errorMessage = 'Voice recognition error'
          
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected'
              break
            case 'audio-capture':
              errorMessage = 'Microphone not found'
              break
            case 'not-allowed':
              errorMessage = 'Microphone permission denied'
              break
            case 'network':
              errorMessage = 'Network error'
              break
            case 'aborted':
              // User stopped manually, not an error
              setState('idle')
              return
            default:
              errorMessage = `Recognition error: ${event.error}`
          }

          setError(errorMessage)
          setState('error')
          
          if (onError) {
            onError(errorMessage)
          }
        }

        recognitionRef.current = recognition
      } catch (err) {
        setIsSupported(false)
        setError('Failed to initialize voice recognition')
        setState('error')
      }
    }
  }, [continuous, interimResults, onResult, onFinalResult, onError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore errors during cleanup
        }
        recognitionRef.current = null
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Voice recognition not supported')
      setState('error')
      if (onError) {
        onError('Voice recognition not supported')
      }
      return
    }

    try {
      setTranscript('')
      setError(null)
      recognitionRef.current.start()
    } catch (err) {
      // Recognition might already be running
      if (err instanceof Error && err.message.includes('already started')) {
        // Try to stop and restart
        try {
          recognitionRef.current.stop()
          setTimeout(() => {
            recognitionRef.current?.start()
          }, 100)
        } catch (e) {
          setError('Failed to start voice recognition')
          setState('error')
        }
      } else {
        setError('Failed to start voice recognition')
        setState('error')
        if (onError) {
          onError('Failed to start voice recognition')
        }
      }
    }
  }, [isSupported, onError])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state === 'listening') {
      try {
        recognitionRef.current.stop()
        setState('idle')
      } catch (e) {
        // Ignore errors when stopping
      }
    }
  }, [state])

  const reset = useCallback(() => {
    stopListening()
    setTranscript('')
    setError(null)
    setState('idle')
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

