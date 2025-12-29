import { useState, useEffect, useRef, useCallback } from 'react'
import { useVoiceRecognition } from '@/composables/useVoiceRecognition'
import { useSocketStore } from '@/stores/socket.store'
import { useAIAssistantStore } from '@/stores/ai-assistant.store'
import { sendAIMessage } from '@/hooks/socket/ai-assistant.socket'
import { AIAssistantSocketEvents } from '@/stores/ai-assistant.store'

type MorganAIState = 'idle' | 'listening' | 'processing' | 'speaking'

interface UseMorganAIOptions {
  enabled?: boolean
}

interface UseMorganAIReturn {
  isActive: boolean
  state: MorganAIState
  transcript: string
  error: string | null
  toggle: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
}

export function useMorganAI({ enabled = false }: UseMorganAIOptions): UseMorganAIReturn {
  const [isActive, setIsActive] = useState(enabled)
  const [state, setState] = useState<MorganAIState>('idle')
  const [error, setError] = useState<string | null>(null)
  const socket = useSocketStore((state) => state.socket)
  const aiStore = useAIAssistantStore()
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSpeakingRef = useRef(false)

  // Text-to-speech function
  const speak = useCallback((text: string) => {
    if (isSpeakingRef.current) {
      window.speechSynthesis.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 0.8
    utterance.lang = 'en-US'

    utterance.onstart = () => {
      isSpeakingRef.current = true
      setState('speaking')
    }

    utterance.onend = () => {
      isSpeakingRef.current = false
      setState('idle')
      synthesisRef.current = null
    }

    utterance.onerror = (event) => {
      console.error('[Morgan AI] Speech synthesis error:', event)
      isSpeakingRef.current = false
      setState('idle')
      setError('Failed to speak response')
    }

    synthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  // Handle AI responses and convert to speech
  useEffect(() => {
    if (!isActive || !socket) return

    const handleAIResponse = (data: { conversationId: string; content: string; isComplete: boolean }) => {
      if (data.isComplete && data.content) {
        setState('speaking')
        speak(data.content)
      }
    }

    const handleStreamEnd = () => {
      setState((currentState) => {
        if (currentState === 'processing') {
          return 'idle'
        }
        return currentState
      })
    }

    socket.on(AIAssistantSocketEvents.RESPONSE, handleAIResponse)
    socket.on(AIAssistantSocketEvents.STREAM_END, handleStreamEnd)

    return () => {
      socket.off(AIAssistantSocketEvents.RESPONSE, handleAIResponse)
      socket.off(AIAssistantSocketEvents.STREAM_END, handleStreamEnd)
    }
  }, [isActive, socket, speak])

  const stopSpeaking = useCallback(() => {
    if (isSpeakingRef.current) {
      window.speechSynthesis.cancel()
      isSpeakingRef.current = false
      setState('idle')
    }
  }, [])

  // Voice recognition for user input
  const {
    transcript,
    startListening,
    stopListening,
    reset: resetVoice,
    state: voiceState,
    error: voiceError,
  } = useVoiceRecognition({
    onFinalResult: (text) => {
      if (!isActive || !text.trim()) return
      
      setState('processing')
      // Send to AI assistant
      sendAIMessage(socket, text, aiStore.conversationId)
    },
    continuous: true,
    interimResults: true,
  })

  // Update state based on voice recognition
  useEffect(() => {
    if (voiceState === 'listening' && state !== 'speaking') {
      setState('listening')
    } else if (voiceState === 'processing' && state !== 'speaking') {
      setState('processing')
    } else if (voiceState === 'error') {
      setError(voiceError || 'Voice recognition error')
      setState('idle')
    }
  }, [voiceState, voiceError, state])

  // Toggle Morgan AI on/off
  const toggle = useCallback(() => {
    const newActive = !isActive
    setIsActive(newActive)
    setError(null)

    if (newActive) {
      startListening()
      setState('listening')
    } else {
      stopListening()
      stopSpeaking()
      resetVoice()
      setState('idle')
    }
  }, [isActive, startListening, stopListening, stopSpeaking, resetVoice])

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled !== isActive) {
      if (enabled) {
        setIsActive(true)
        startListening()
        setState('listening')
      } else {
        setIsActive(false)
        stopListening()
        stopSpeaking()
        resetVoice()
        setState('idle')
      }
    }
  }, [enabled, isActive, startListening, stopListening, stopSpeaking, resetVoice])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
      stopSpeaking()
      resetVoice()
    }
  }, [stopListening, stopSpeaking, resetVoice])

  return {
    isActive,
    state,
    transcript,
    error,
    toggle,
    speak,
    stopSpeaking,
  }
}

