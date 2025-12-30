import { useState, useEffect, useRef } from 'react'
import { useVoiceRecognition } from '@/composables/useVoiceRecognition'
import { useAIAssistantStore } from '@/stores/ai-assistant.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import { PERMISSIONS } from '@/constants/permissions'

const ACTIVATION_PHRASE = 'hey kooya'

/**
 * Check if the activation phrase is detected in the transcript
 */
function detectActivationPhrase(transcript: string, phrase: string): boolean {
  const normalizedTranscript = transcript.toLowerCase().trim()
  const normalizedPhrase = phrase.toLowerCase().trim()
  
  // Exact match
  if (normalizedTranscript === normalizedPhrase) return true
  
  // Contains match
  if (normalizedTranscript.includes(normalizedPhrase)) return true
  
  // Check for variations: "hey kooya", "hey koya", "hey koo ya", etc.
  const phraseWords = normalizedPhrase.split(' ')
  const transcriptWords = normalizedTranscript.split(' ')
  
  // Check if all words from phrase appear in transcript in order
  let phraseIndex = 0
  for (const word of transcriptWords) {
    if (phraseIndex < phraseWords.length) {
      const phraseWord = phraseWords[phraseIndex]
      // Check if word matches or contains the phrase word
      if (word === phraseWord || word.includes(phraseWord) || phraseWord.includes(word)) {
        phraseIndex++
      }
    }
  }
  
  // If we matched all words, consider it detected
  if (phraseIndex >= phraseWords.length) return true
  
  // Fuzzy match: check if transcript contains "hey" and something similar to "kooya"
  if (normalizedTranscript.includes('hey')) {
    const afterHey = normalizedTranscript.split('hey')[1]?.trim() || ''
    if (afterHey.length > 0) {
      // Check if it sounds like "kooya" (k followed by vowels)
      const kooyaPattern = /k[oouy]+[ay]?/i
      if (kooyaPattern.test(afterHey)) {
        return true
      }
    }
  }
  
  return false
}

export function HeyKooya() {
  const [isActivated, setIsActivated] = useState(false)
  const activationTimeoutRef = useRef<number | null>(null)
  const isOpen = useAIAssistantStore((s) => s.isOpen)
  const openWithVoiceRecording = useAIAssistantStore((s) => s.openWithVoiceRecording)
  const can = useAuthStore((s) => s.can)
  const hasAIAccess = can(PERMISSIONS.AI_ASSISTANT_ACCESS) || can(PERMISSIONS.SYSTEM_FULL_ACCESS)
  const heyKooyaEnabled = useUserPreferencesStore((s) => s.heyKooyaEnabled)

  const {
    isSupported,
    startListening,
    stopListening,
  } = useVoiceRecognition({
    continuous: true,
    interimResults: true,
    onResult: (text) => {
      // Only listen when AI assistant is closed
      if (isOpen) return
      
      // Check if the activation phrase is detected
      if (detectActivationPhrase(text, ACTIVATION_PHRASE)) {
        setIsActivated(true)
        
        // Clear any existing timeout
        if (activationTimeoutRef.current !== null) {
          window.clearTimeout(activationTimeoutRef.current)
        }
        
        // Reset activation after animation completes
        activationTimeoutRef.current = window.setTimeout(() => {
          setIsActivated(false)
          activationTimeoutRef.current = null
        }, 2000)
        
        // Open AI assistant with voice recording
        if (hasAIAccess) {
          openWithVoiceRecording()
        }
        
        // Stop listening when assistant opens
        stopListening()
      }
    },
  })

  // Reset activation state when AI assistant opens
  useEffect(() => {
    if (isOpen && isActivated) {
      setIsActivated(false)
      if (activationTimeoutRef.current !== null) {
        window.clearTimeout(activationTimeoutRef.current)
        activationTimeoutRef.current = null
      }
    }
  }, [isOpen, isActivated])

  // Start/stop listening based on AI assistant state and preferences
  useEffect(() => {
    if (!isSupported || !hasAIAccess || !heyKooyaEnabled) {
      stopListening()
      return
    }
    
    if (!isOpen) {
      // Start listening when assistant is closed and feature is enabled
      startListening()
    } else {
      // Stop listening when assistant is open
      stopListening()
    }
    
    return () => {
      stopListening()
      if (activationTimeoutRef.current !== null) {
        window.clearTimeout(activationTimeoutRef.current)
        activationTimeoutRef.current = null
      }
    }
  }, [isSupported, hasAIAccess, heyKooyaEnabled, isOpen, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
      if (activationTimeoutRef.current !== null) {
        window.clearTimeout(activationTimeoutRef.current)
      }
    }
  }, [stopListening])

  // Don't render if not supported, no access, or disabled in preferences
  if (!isSupported || !hasAIAccess || !heyKooyaEnabled) {
    return null
  }

  return (
    <>
      {/* Glowing edges effect */}
      {isActivated && (
        <>
          {/* Top edge glow */}
          <div
            className="fixed top-0 left-0 right-0 h-1 pointer-events-none z-[9999]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.4)',
              animation: 'glow-top 2s ease-in-out',
            }}
          />
          
          {/* Right edge glow */}
          <div
            className="fixed top-0 right-0 bottom-0 w-1 pointer-events-none z-[9999]"
            style={{
              background: 'linear-gradient(180deg, transparent, rgba(59, 130, 246, 0.8), transparent)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.4)',
              animation: 'glow-right 2s ease-in-out',
            }}
          />
          
          {/* Bottom edge glow */}
          <div
            className="fixed bottom-0 left-0 right-0 h-1 pointer-events-none z-[9999]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.4)',
              animation: 'glow-bottom 2s ease-in-out',
            }}
          />
          
          {/* Left edge glow */}
          <div
            className="fixed top-0 left-0 bottom-0 w-1 pointer-events-none z-[9999]"
            style={{
              background: 'linear-gradient(180deg, transparent, rgba(59, 130, 246, 0.8), transparent)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.4)',
              animation: 'glow-left 2s ease-in-out',
            }}
          />
          
          {/* Corner glows */}
          <div
            className="fixed top-0 left-0 w-20 h-20 pointer-events-none z-[9999]"
            style={{
              background: 'radial-gradient(circle at top left, rgba(59, 130, 246, 0.4), transparent 70%)',
              animation: 'glow-corner 2s ease-in-out',
            }}
          />
          <div
            className="fixed top-0 right-0 w-20 h-20 pointer-events-none z-[9999]"
            style={{
              background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.4), transparent 70%)',
              animation: 'glow-corner 2s ease-in-out',
            }}
          />
          <div
            className="fixed bottom-0 left-0 w-20 h-20 pointer-events-none z-[9999]"
            style={{
              background: 'radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.4), transparent 70%)',
              animation: 'glow-corner 2s ease-in-out',
            }}
          />
          <div
            className="fixed bottom-0 right-0 w-20 h-20 pointer-events-none z-[9999]"
            style={{
              background: 'radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.4), transparent 70%)',
              animation: 'glow-corner 2s ease-in-out',
            }}
          />
        </>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes glow-top {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          20% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
        
        @keyframes glow-right {
          0% {
            opacity: 0;
            transform: translateX(10px);
          }
          20% {
            opacity: 1;
            transform: translateX(0);
          }
          80% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(10px);
          }
        }
        
        @keyframes glow-bottom {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          20% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(10px);
          }
        }
        
        @keyframes glow-left {
          0% {
            opacity: 0;
            transform: translateX(-10px);
          }
          20% {
            opacity: 1;
            transform: translateX(0);
          }
          80% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-10px);
          }
        }
        
        @keyframes glow-corner {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          20% {
            opacity: 1;
            transform: scale(1);
          }
          80% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }
      `}</style>
    </>
  )
}

