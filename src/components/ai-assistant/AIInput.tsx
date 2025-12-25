import { useRef, KeyboardEvent, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'

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

  useEffect(() => {
    if (!disabled) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [disabled])

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
          className="w-full h-10 pl-3 pr-10 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/60 disabled:opacity-50 transition-all"
          aria-label="AI assistant input"
          aria-describedby="ai-input-description"
        />
        <span id="ai-input-description" className="sr-only">
          {AI_ASSISTANT_STRINGS.inputDescription}
        </span>
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
    </div>
  )
}

