import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'
import { useUpdateBoard } from '@/hooks/board.hooks'
import { useEmojiPicker } from './useEmojiPicker'

type Board = {
  id: string
  name: string
  icon: string
}

type EditBoardModalProps = {
  open: boolean
  onClose: () => void
  board: Board | null
  onSave: (updatedBoard: any) => void
}

export function EditBoardModal({ open, onClose, board, onSave }: EditBoardModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🚀')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ top: number; left: number; height: number } | null>(null)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const { updateBoard, loading, error: updateError } = useUpdateBoard()

  const handleCloseEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false)
  }, [])

  const { emojiPickerRef, emojiCategories } = useEmojiPicker(
    showEmojiPicker,
    handleCloseEmojiPicker
  )

  // Calculate position for fixed emoji picker
  useEffect(() => {
    if (showEmojiPicker && emojiButtonRef.current) {
      const updatePosition = () => {
        if (emojiButtonRef.current) {
          const rect = emojiButtonRef.current.getBoundingClientRect()
          const pickerWidth = 384 // sm:w-96 = 384px
          const pickerMaxHeight = 400 // max height for the picker
          
          // Calculate left position with viewport boundaries
          let left = rect.left
          if (left + pickerWidth > window.innerWidth - 16) {
            left = window.innerWidth - pickerWidth - 16
          }
          if (left < 16) {
            left = 16
          }
          
          // Always position below the button
          const top = rect.bottom + 8
          
          // Calculate available space below
          const availableSpaceBelow = window.innerHeight - top - 16
          const actualHeight = Math.min(pickerMaxHeight, availableSpaceBelow)
          
          setEmojiPickerPosition({
            top: top,
            left: left,
            height: actualHeight,
          })
        }
      }
      
      // Small delay to ensure button is rendered and positioned
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(updatePosition)
      }, 0)
      
      // Also update on window resize
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    } else {
      setEmojiPickerPosition(null)
    }
  }, [showEmojiPicker])

  // Update form when board changes
  useEffect(() => {
    if (board) {
      setName(board.name)
      setIcon(board.icon)
      setErrors({})
    }
  }, [board])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setErrors({ name: 'Board name is required' })
      return
    }

    if (!board) return

    try {
      const updated = await updateBoard(board.id, {
        name: name.trim(),
        emoji: icon,
      } as Parameters<typeof updateBoard>[1])
      
      if (updated) {
        onSave(updated)
        handleClose()
      } else {
        const errorMessage = updateError?.message 
          ? (Array.isArray(updateError.message) ? updateError.message[0] : updateError.message)
          : 'Failed to update board'
        setErrors({ name: errorMessage })
      }
    } catch (err: any) {
      // Extract human-readable error message
      const errorData = err?.response?.data
      const errorMessage = 
        errorData?.error?.message || 
        errorData?.message || 
        err?.message || 
        'Failed to update board'
      setErrors({ name: errorMessage })
    }
  }

  const handleClose = () => {
    setName('')
    setIcon('🚀')
    setShowEmojiPicker(false)
    setErrors({})
    onClose()
  }

  if (!board) return null

  return (
    <Modal open={open} onClose={handleClose} maxWidth="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Edit board</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Board Icon & Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-board-name">Board name</Label>
            <div className="flex gap-2">
              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-10 w-10 flex items-center justify-center rounded-xl border border-input bg-background/50 hover:bg-accent transition-colors text-xl"
                  aria-label="Select emoji"
                >
                  {icon}
                </button>
              </div>
              
              {/* Emoji Picker Dropdown - Portal to escape modal overflow */}
              {showEmojiPicker &&
                emojiPickerPosition &&
                createPortal(
                  <div
                    ref={emojiPickerRef}
                    className="fixed z-[9999] w-[calc(100vw-2rem)] sm:w-96 max-w-sm p-3 bg-popover border border-border rounded-xl shadow-xl overflow-hidden flex flex-col"
                    style={{
                      top: `${emojiPickerPosition.top}px`,
                      left: `${emojiPickerPosition.left}px`,
                      height: `${emojiPickerPosition.height}px`,
                      maxHeight: `${emojiPickerPosition.height}px`,
                    }}
                  >
                    <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                      {Object.entries(emojiCategories).map(([category, emojis]) => (
                        <div key={category}>
                          <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-popover py-1 z-10">{category}</p>
                          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                            {(emojis as readonly string[]).map((emoji: string) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setIcon(emoji)
                                  setShowEmojiPicker(false)
                                }}
                                className={cn(
                                  'h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-lg flex-shrink-0',
                                  icon === emoji && 'bg-primary/10 ring-2 ring-primary'
                                )}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              
              <Input
                id="edit-board-name"
                placeholder="e.g., Marketing Campaign"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) {
                    setErrors({})
                  }
                }}
                className={cn('flex-1', errors.name && 'border-destructive focus-visible:ring-destructive')}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}



