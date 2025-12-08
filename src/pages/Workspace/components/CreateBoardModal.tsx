import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, LayoutGrid, Zap, Clock } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'
import { useCreateBoard } from '@/hooks/board.hooks'
import type { CreateBoardInput } from '@/types/board'
import { useEmojiPicker } from './useEmojiPicker'

type BoardType = 'kanban' | 'sprint'

type CreateBoardModalProps = {
  open: boolean
  onClose: () => void
  onCreate: (data: { name: string; key: string; type: BoardType; icon: string }) => void
  workspaceId: string
  existingKeys?: string[] // For client-side validation
}

export function CreateBoardModal({ open, onClose, onCreate, workspaceId, existingKeys = [] }: CreateBoardModalProps) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [type, setType] = useState<BoardType>('kanban')
  const [icon, setIcon] = useState('🚀')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ top: number; left: number; height: number } | null>(null)
  const [errors, setErrors] = useState<{ name?: string; key?: string }>({})
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const { createBoard, loading, error: createError } = useCreateBoard()

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

  const generateKey = (boardName: string) => {
    return boardName
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0))
      .join('')
      .slice(0, 6) || 'KEY'
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!key || key === generateKey(name)) {
      setKey(generateKey(value))
    }
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }))
    }
  }

  const handleKeyChange = (value: string) => {
    setKey(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
    if (errors.key) {
      setErrors((prev) => ({ ...prev, key: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: { name?: string; key?: string } = {}
    
    if (!name.trim()) {
      newErrors.name = 'Board name is required'
    }
    if (!key.trim()) {
      newErrors.key = 'Key is required'
    } else if (key.length < 2) {
      newErrors.key = 'Key must be at least 2 characters'
    } else if (existingKeys.includes(key.trim().toUpperCase())) {
      newErrors.key = 'A board with this key already exists'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const boardInput: CreateBoardInput & { prefix?: string; emoji?: string } = {
        name: name.trim(),
        type,
        prefix: key.trim(),
        emoji: icon,
      }
      
      const createdBoard = await createBoard(workspaceId, boardInput)
      
      if (createdBoard) {
        onCreate({ name: name.trim(), key: key.trim(), type, icon })
        handleClose()
        // Navigate to the newly created board
        const boardPrefix = createdBoard.prefix || key.trim().toUpperCase()
        navigate(`/workspace/${boardPrefix.toLowerCase()}`)
      } else {
        // Extract error message from hook error
        const errorMessage = createError?.message || 'Failed to create board'
        // Check if it's a key/prefix error
        if (errorMessage.toLowerCase().includes('key') || errorMessage.toLowerCase().includes('prefix') || errorMessage.toLowerCase().includes('deleted')) {
          setErrors({ key: errorMessage })
        } else {
          setErrors({ name: errorMessage })
        }
      }
    } catch (err: any) {
      // Extract human-readable error message
      const errorData = err?.response?.data
      const errorMessage = 
        errorData?.error?.message || 
        errorData?.message || 
        err?.message || 
        'Failed to create board'
      
      // Check if it's a key/prefix error
      const lowerMessage = errorMessage.toLowerCase()
      if (lowerMessage.includes('key') || lowerMessage.includes('prefix') || lowerMessage.includes('deleted') || lowerMessage.includes('already exists')) {
        setErrors({ key: errorMessage })
      } else {
        setErrors({ name: errorMessage })
      }
    }
  }

  const handleClose = () => {
    setName('')
    setKey('')
    setType('kanban')
    setIcon('🚀')
    setShowEmojiPicker(false)
    setErrors({})
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} maxWidth="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Create new board</h2>
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
            <Label htmlFor="board-name">Board name</Label>
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
                id="board-name"
                placeholder="e.g., Marketing Campaign"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={cn('flex-1', errors.name && 'border-destructive focus-visible:ring-destructive')}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Key */}
          <div className="space-y-2">
            <Label htmlFor="board-key">Key</Label>
            <Input
              id="board-key"
              placeholder="e.g., MKT"
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              className={cn(
                'font-mono uppercase',
                errors.key && 'border-destructive focus-visible:ring-destructive'
              )}
            />
            <p className="text-xs text-muted-foreground">
              The key is used as the prefix for all issues in this board
            </p>
            {errors.key && (
              <p className="text-sm text-destructive">{errors.key}</p>
            )}
          </div>

          {/* Board Type */}
          <div className="space-y-3">
            <Label>Board type</Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Kanban Option */}
              <button
                type="button"
                onClick={() => setType('kanban')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  type === 'kanban'
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 hover:border-border hover:bg-accent/30'
                )}
              >
                <div
                  className={cn(
                    'p-3 rounded-xl',
                    type === 'kanban' ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <LayoutGrid
                    className={cn(
                      'h-6 w-6',
                      type === 'kanban' ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      'font-medium',
                      type === 'kanban' ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    Kanban
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Continuous flow
                  </p>
                </div>
              </button>

              {/* Sprint Option - Coming Soon */}
              <div
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border/30 bg-muted/20 opacity-60 cursor-not-allowed relative overflow-hidden"
              >
                {/* Coming Soon Badge */}
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                    <Clock className="h-3 w-3" />
                    Coming soon
                  </span>
                </div>
                
                <div className="p-3 rounded-xl bg-muted/50">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">
                    Sprint
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Time-boxed iterations
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create board'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

