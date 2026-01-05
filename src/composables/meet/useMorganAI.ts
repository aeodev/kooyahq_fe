import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVoiceRecognition } from '@/composables/useVoiceRecognition'
import { useSocketStore } from '@/stores/socket.store'
import { useAIAssistantStore, subscribeToAudioResponse } from '@/stores/ai-assistant.store'
import { sendAIMessage } from '@/hooks/socket/ai-assistant.socket'

export type MorganAIState = 'idle' | 'listening' | 'processing' | 'speaking'

interface UseMorganAIOptions {
  enabled?: boolean
  wakeWord?: string
  onSpeak?: (audioBase64: string) => void | Promise<void>
}

interface UseMorganAIReturn {
  isActive: boolean
  state: MorganAIState
  transcript: string
  error: string | null
  toggle: () => void
  stopSpeaking: () => void
}

// Timeout for processing after wake word detected (ms)
const WAKE_WORD_TIMEOUT = 1500

export function useMorganAI({ enabled = false, wakeWord, onSpeak }: UseMorganAIOptions): UseMorganAIReturn {
  const [isActive, setIsActive] = useState(enabled)
  const [state, setState] = useState<MorganAIState>('idle')
  const [error, setError] = useState<string | null>(null)

  const socket = useSocketStore((s) => s.socket)
  const aiStore = useAIAssistantStore()

  const isSpeakingRef = useRef(false)
  const onSpeakRef = useRef(onSpeak)
  const isActiveRef = useRef(isActive)
  
  // Refs for timeout-based processing
  const pendingPayloadRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processedRef = useRef(false)

  // Keep refs in sync
  useEffect(() => {
    onSpeakRef.current = onSpeak
  }, [onSpeak])

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  // Normalized wake word for comparison
  const wakeWordNormalized = useMemo(
    () => wakeWord?.trim().toLowerCase() || null,
    [wakeWord]
  )

  // Process the pending payload (send to AI)
  const processPayload = useCallback((payload: string) => {
    if (processedRef.current) return
    processedRef.current = true
    
    console.log('[Morgan AI] Processing payload:', payload)
    setState('processing')
    sendAIMessage(socket, payload, aiStore.conversationId)
    
    // Clear pending state
    pendingPayloadRef.current = null
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [socket, aiStore.conversationId])

  // Extract payload from text (strips wake word)
  const extractPayload = useCallback((text: string): string | null => {
    if (!text.trim()) return null
    
    let payload = text.trim()
    
    if (wakeWordNormalized) {
      const normalized = payload.toLowerCase()
      if (!normalized.startsWith(wakeWordNormalized)) {
        return null // Wake word not found
      }
      // Strip wake word
      payload = payload.slice(wakeWordNormalized.length).trim() || payload
    }
    
    return payload
  }, [wakeWordNormalized])

  // Voice recognition
  const {
    transcript,
    startListening,
    stopListening,
    reset: resetVoice,
    error: voiceError,
  } = useVoiceRecognition({
    onResult: (text) => {
      // Check interim results for wake word
      if (!isActiveRef.current || processedRef.current) return
      
      const payload = extractPayload(text)
      if (!payload) return
      
      console.log('[Morgan AI] Wake word detected in interim:', payload)
      
      // Update pending payload
      pendingPayloadRef.current = payload
      
      // Reset timeout - wait for more speech or timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        if (pendingPayloadRef.current && !processedRef.current) {
          console.log('[Morgan AI] Timeout - processing now')
          processPayload(pendingPayloadRef.current)
        }
      }, WAKE_WORD_TIMEOUT)
    },
    onFinalResult: (text) => {
      console.log('[Morgan AI] Final result received:', text)

      if (!isActiveRef.current || !text.trim()) {
        console.log('[Morgan AI] Ignored - not active or empty text')
        return
      }

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // If already processed via timeout, skip
      if (processedRef.current) {
        console.log('[Morgan AI] Already processed via timeout')
        processedRef.current = false // Reset for next utterance
        return
      }

      const payload = extractPayload(text)
      if (!payload) {
        console.log('[Morgan AI] Wake word not detected, ignoring')
        return
      }

      console.log('[Morgan AI] Wake word detected! Payload:', payload)
      processPayload(payload)
      
      // Reset for next utterance
      setTimeout(() => {
        processedRef.current = false
      }, 500)
    },
    onError: (err) => {
      setError(err)
      setState('idle')
    },
    continuous: true,
    interimResults: true,
  })

  // Listen for audio responses from backend
  useEffect(() => {
    if (!isActive) return

    console.log('[Morgan AI] Subscribing to audio responses')

    const unsubscribe = subscribeToAudioResponse(async (payload) => {
      console.log('[Morgan AI] Audio response received:', payload.conversationId, `${payload.audio.length} bytes`)

      if (!onSpeakRef.current) {
        console.warn('[Morgan AI] No onSpeak handler, skipping playback')
        return
      }

      setState('speaking')
      isSpeakingRef.current = true

      try {
        const result = onSpeakRef.current(payload.audio)
        if (result instanceof Promise) {
          await result
        }
        console.log('[Morgan AI] Audio playback complete')
      } catch (err) {
        console.error('[Morgan AI] Speak handler failed:', err)
        setError('Failed to play audio response')
      } finally {
        isSpeakingRef.current = false
        processedRef.current = false // Ready for next command
        setState('listening')
      }
    })

    return unsubscribe
  }, [isActive])

  // Sync voice error to state
  useEffect(() => {
    if (voiceError) {
      setError(voiceError)
    }
  }, [voiceError])

  const stopSpeaking = useCallback(() => {
    isSpeakingRef.current = false
    if (isActiveRef.current) {
      setState('listening')
    } else {
      setState('idle')
    }
  }, [])

  const toggle = useCallback(() => {
    const newActive = !isActiveRef.current
    setIsActive(newActive)
    isActiveRef.current = newActive
    setError(null)
    processedRef.current = false

    if (newActive) {
      startListening()
      setState('listening')
    } else {
      stopListening()
      isSpeakingRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      resetVoice()
      setState('idle')
    }
  }, [startListening, stopListening, resetVoice])

  // Handle enabled prop changes
  useEffect(() => {
    if (enabled !== isActiveRef.current) {
      if (enabled) {
        setIsActive(true)
        isActiveRef.current = true
        processedRef.current = false
        startListening()
        setState('listening')
      } else {
        setIsActive(false)
        isActiveRef.current = false
        stopListening()
        isSpeakingRef.current = false
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        resetVoice()
        setState('idle')
      }
    }
  }, [enabled, startListening, stopListening, resetVoice])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      resetVoice()
    }
  }, [stopListening, resetVoice])

  return {
    isActive,
    state,
    transcript,
    error,
    toggle,
    stopSpeaking,
  }
}
