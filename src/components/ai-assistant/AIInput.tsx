import { useRef, type KeyboardEvent, useEffect } from 'react'
import { Send, Loader2, Mic } from 'lucide-react'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'
import { useVoiceRecognition } from '@/composables/useVoiceRecognition'

interface AIInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClose: () => void
  isLoading: boolean
  disabled?: boolean
}

export function AIInput({ value, onChange, onSubmit, onClose, isLoading, disabled }: AIInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingSubmitRef = useRef<string | null>(null)

  // Voice recognition
  const {
    isSupported,
    state: voiceState,
    error: voiceError,
    startListening,
    stopListening,
    reset: resetVoice,
  } = useVoiceRecognition({
    onResult: (text) => {
      onChange(text)
    },
    onFinalResult: (text) => {
      if (text.trim()) {
        onChange(text)
        stopListening()
        // Mark that we should auto-submit when value updates
        pendingSubmitRef.current = text.trim()
      } else {
        stopListening()
        resetVoice()
      }
    },
    onError: () => {
      // Error handling is done via voiceError state
    },
  })

  // Auto-submit when value matches pending submit text
  useEffect(() => {
    if (pendingSubmitRef.current && value === pendingSubmitRef.current && !isLoading && !disabled) {
      pendingSubmitRef.current = null
      // Small delay to ensure everything is ready
      setTimeout(() => {
        onSubmit()
        resetVoice()
      }, 100)
    }
  }, [value, isLoading, disabled, onSubmit, resetVoice])

  useEffect(() => {
    if (!disabled) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [disabled])

  // Cleanup voice recognition when component unmounts or disabled
  useEffect(() => {
    if (disabled || isLoading) {
      stopListening()
    }
    return () => {
      stopListening()
    }
  }, [disabled, isLoading, stopListening])

  const handleVoiceToggle = () => {
    if (voiceState === 'listening') {
      stopListening()
    } else {
      startListening()
    }
  }

  const isListening = voiceState === 'listening'
  const isVoiceDisabled = !isSupported || disabled || isLoading || !!voiceError

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="p-4 pt-0">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={AI_ASSISTANT_STRINGS.inputPlaceholder}
          disabled={isLoading || disabled}
          className="w-full h-10 pl-3 pr-20 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/60 disabled:opacity-50 transition-all"
          aria-label="AI assistant input"
          aria-describedby="ai-input-description"
        />
        <span id="ai-input-description" className="sr-only">
          {AI_ASSISTANT_STRINGS.inputDescription}
        </span>
        
        {/* Voice input button */}
        {isSupported && (
          <button
            onClick={handleVoiceToggle}
            disabled={isVoiceDisabled}
            className={`absolute right-11 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            aria-label={isListening ? AI_ASSISTANT_STRINGS.stopListening : AI_ASSISTANT_STRINGS.startListening}
            aria-pressed={isListening}
          >
            <div className="relative">
              <Mic className={`h-3.5 w-3.5 ${isListening ? 'scale-110' : ''} transition-transform`} aria-hidden="true" />
              {isListening && (
                <span className="absolute inset-0 rounded-md ring-2 ring-destructive animate-ping opacity-75" aria-hidden="true" />
              )}
            </div>
          </button>
        )}

        {/* Send button */}
        <button
          onClick={onSubmit}
          disabled={!value.trim() || isLoading || disabled}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={AI_ASSISTANT_STRINGS.sendMessage}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      
      {/* Voice status indicator */}
      {isListening && (
        <div className="mt-2 px-3 text-xs text-muted-foreground flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" aria-hidden="true" />
          <span>{AI_ASSISTANT_STRINGS.listening}</span>
        </div>
      )}
      
      {/* Voice error message */}
      {voiceError && !isListening && (
        <div className="mt-2 px-3 text-xs text-destructive">
          {voiceError}
        </div>
      )}
    </div>
  )
}

