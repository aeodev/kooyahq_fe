import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Smile } from 'lucide-react'
import { useEmojiPicker } from '@/pages/Workspace/components/useEmojiPicker'
import { cn } from '@/utils/cn'

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void
  className?: string
}

export function EmojiPickerButton({ onEmojiSelect, className }: EmojiPickerButtonProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const { emojiPickerRef, emojiCategories } = useEmojiPicker(showEmojiPicker, () => setShowEmojiPicker(false))

  useEffect(() => {
    if (showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect()
      const pickerHeight = 360
      const openBelow = rect.bottom + 8 + pickerHeight <= window.innerHeight - 12
      const top = openBelow ? rect.bottom + 8 : Math.max(12, rect.top - pickerHeight - 8)
      const left = Math.max(rect.left, 12)
      setEmojiPickerPosition({ top, left })
    } else {
      setEmojiPickerPosition(null)
    }
  }, [showEmojiPicker])

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji)
    setShowEmojiPicker(false)
  }

  return (
    <>
      <Button
        ref={emojiButtonRef}
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className={cn('h-9 w-9', className)}
        title="Add emoji"
      >
        <Smile className="h-4 w-4" />
      </Button>
      {showEmojiPicker && emojiPickerPosition && createPortal(
        <div
          className="fixed z-50 bg-card border border-border rounded-xl shadow-lg p-3 max-h-[360px] overflow-y-auto"
          style={{
            top: `${emojiPickerPosition.top}px`,
            left: `${emojiPickerPosition.left}px`,
            width: '320px',
          }}
          ref={emojiPickerRef}
        >
          {Object.entries(emojiCategories).map(([category, emojis]) => (
            <div key={category} className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">{category}</h4>
              <div className="grid grid-cols-8 gap-1">
                {(emojis as readonly string[]).map((emoji: string) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent transition-colors text-lg"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
