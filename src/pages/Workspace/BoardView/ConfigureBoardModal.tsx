import { useState, useEffect, useRef, useMemo } from 'react'
import { X, GripVertical, Plus, Trash2, LayoutGrid, List, Settings, Columns, AlertTriangle, ListChecks, Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/utils/cn'
import type { Column } from './types'
import type { Board as ApiBoardType } from '@/types/board'
import { useUpdateBoard } from '@/hooks/board.hooks'
import { DraggableFieldConfigItem } from './DetailsSettings/DraggableFieldConfigItem'
import { toast } from 'sonner'
import type { User } from '@/types/user'
import axiosInstance from '@/utils/axios.instance'
import { GET_USERS } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'

type ConfigureBoardModalProps = {
  open: boolean
  onClose: () => void
  board: ApiBoardType | null
  columns: Column[]
  onSave: (updatedBoard: ApiBoardType | null) => void
}

// Predefined color categories (like emoji categories)
const COLOR_CATEGORIES = {
  'Neutrals': [
    { name: 'Slate', hex: '#94a3b8' },
    { name: 'Gray', hex: '#9ca3af' },
    { name: 'Zinc', hex: '#a1a1aa' },
    { name: 'Stone', hex: '#a8a29e' },
  ],
  'Warm': [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Rose', hex: '#f43f5e' },
  ],
  'Cool': [
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Sky', hex: '#0ea5e9' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Teal', hex: '#14b8a6' },
    { name: 'Indigo', hex: '#6366f1' },
  ],
  'Green': [
    { name: 'Lime', hex: '#84cc16' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Emerald', hex: '#10b981' },
  ],
  'Purple': [
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Fuchsia', hex: '#d946ef' },
    { name: 'Pink', hex: '#ec4899' },
  ],
}

// Helper to convert hex to Tailwind class format
const hexToColorClass = (hex: string) => `bg-[${hex}]`

// Common emojis for board icons
const EMOJI_CATEGORIES = {
  'Popular': ['🚀', '⭐', '🎯', '💡', '🔥', '✨', '💎', '🏆'],
  'Work': ['📋', '📊', '📈', '💼', '🗂️', '📁', '📝', '✅'],
  'Tech': ['💻', '🖥️', '📱', '⚙️', '🔧', '🛠️', '🔌', '💾'],
  'Design': ['🎨', '🖌️', '✏️', '📐', '🎭', '🌈', '🎬', '📷'],
  'Communication': ['💬', '📢', '📣', '📧', '📩', '🔔', '📞', '🗣️'],
  'Nature': ['🌱', '🌿', '🌸', '🌻', '🍀', '🌲', '🌊', '⛰️'],
  'Objects': ['🎁', '🎪', '🎮', '🎲', '🧩', '🔮', '💰', '🔑'],
  'Symbols': ['❤️', '💜', '💙', '💚', '🧡', '⚡', '🌟', '💫'],
}

type SettingsSection = 'general' | 'columns' | 'details' | 'members'

type FieldConfig = {
  fieldName: string
  isVisible: boolean
  order: number
}

export function ConfigureBoardModal({
  open,
  onClose,
  board,
  columns,
  onSave,
}: ConfigureBoardModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🚀')
  const [defaultView, setDefaultView] = useState<'board' | 'list' | 'timeline'>('board')
  const [showSwimlanes, setShowSwimlanes] = useState(false)
  const [editedColumns, setEditedColumns] = useState<Column[]>([])
  const [columnMetadata, setColumnMetadata] = useState<Record<string, { isDoneColumn: boolean }>>({})
  const [columnErrors, setColumnErrors] = useState<Record<string, string>>({})
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
  const [customColorValue, setCustomColorValue] = useState<string>('#3b82f6')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [deleteColumnIndex, setDeleteColumnIndex] = useState<number | null>(null)
  const [detailsSettings, setDetailsSettings] = useState<{ fieldConfigs: FieldConfig[] } | null>(null)
  const [detailsDraggedIndex, setDetailsDraggedIndex] = useState<number | null>(null)
  const [memberList, setMemberList] = useState<Array<{ userId: string; role: 'admin' | 'member' | 'viewer'; joinedAt?: string }>>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const { updateBoard, loading } = useUpdateBoard()
  const currentUserId = useAuthStore((state) => state.user?.id)

  // Initialize form data when modal opens (only once per open)
  const prevOpenRef = useRef(false)
  const prevBoardIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Only initialize when modal first opens or board changes
    const isOpening = open && !prevOpenRef.current
    const boardChanged = board?.id && board.id !== prevBoardIdRef.current
    
    if ((isOpening || boardChanged) && board) {
      setName(board.name || '')
      setDescription(board.description || '')
      setEmoji(board.emoji || '🚀')
      setDefaultView(board.settings?.defaultView || 'board')
      setShowSwimlanes(board.settings?.showSwimlanes || false)
      // Initialize columns from props only when modal opens
      if (isOpening) {
        setEditedColumns([...columns])
      }
      
      // Initialize column metadata from backend columns
      const metadata: Record<string, { isDoneColumn: boolean }> = {}
      if (board.columns && Array.isArray(board.columns)) {
        board.columns.forEach((col) => {
          if (typeof col === 'object' && col !== null && 'id' in col) {
            metadata[col.id] = { isDoneColumn: col.isDoneColumn || false }
          }
        })
      }
      setColumnMetadata(metadata)
      
      // Initialize details settings
      if (board.settings?.ticketDetailsSettings) {
        setDetailsSettings(board.settings.ticketDetailsSettings)
      } else {
        // Default settings
        setDetailsSettings({
          fieldConfigs: [
            { fieldName: 'priority', isVisible: true, order: 0 },
            { fieldName: 'assignee', isVisible: true, order: 1 },
            { fieldName: 'tags', isVisible: true, order: 2 },
            { fieldName: 'parent', isVisible: true, order: 3 },
            { fieldName: 'dueDate', isVisible: true, order: 4 },
            { fieldName: 'startDate', isVisible: true, order: 5 },
            { fieldName: 'endDate', isVisible: true, order: 6 },
          ],
        })
      }

      // Initialize members (creator always present)
      const initialMembers = board.members && board.members.length > 0
        ? board.members.map((m) => ({
            userId: m.userId,
            role: m.role,
            joinedAt: m.joinedAt,
          }))
        : [{ userId: board.createdBy, role: 'admin' as const, joinedAt: new Date().toISOString() }]
      setMemberList(initialMembers)
      setMemberSearch('')
      
      prevBoardIdRef.current = board.id
    }
    
    prevOpenRef.current = open
    
    // Reset when modal closes
    if (!open) {
      prevBoardIdRef.current = null
      setMemberSearch('')
    }
  }, [open, board?.id]) // Only depend on open state and board ID

  // Load users for member management when the members tab is active
  useEffect(() => {
    if (!open || activeSection !== 'members') return
    const loadUsers = async () => {
      setLoadingUsers(true)
      try {
        const response = await axiosInstance.get<{ status: string; data: User[] }>(GET_USERS())
        if (response.data?.data) {
          setAvailableUsers(response.data.data)
        }
      } catch (error) {
        console.error('Failed to load users for board members', error)
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [open, activeSection])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    
    if (dragNodeRef.current) {
      e.dataTransfer.setDragImage(dragNodeRef.current, 0, 0)
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newColumns = [...editedColumns]
    const [draggedColumn] = newColumns.splice(draggedIndex, 1)
    newColumns.splice(dropIndex, 0, draggedColumn)
    setEditedColumns(newColumns)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Get a random color from predefined colors
  const getRandomColor = (): string => {
    const allColors = Object.values(COLOR_CATEGORIES).flat()
    const randomColor = allColors[Math.floor(Math.random() * allColors.length)]
    return hexToColorClass(randomColor.hex)
  }

  const handleAddColumn = () => {
    // Generate a unique name
    let columnName = 'New Column'
    let counter = 1
    while (editedColumns.some(col => col.name.toLowerCase() === columnName.toLowerCase())) {
      columnName = `New Column ${counter}`
      counter++
    }

    const newColumn: Column = {
      id: `column-${Date.now()}`,
      name: columnName,
      color: getRandomColor(),
      tasks: [],
    }
    setEditedColumns([...editedColumns, newColumn])
  }

  const handleRemoveColumn = (index: number) => {
    setDeleteColumnIndex(index)
  }

  const handleConfirmDeleteColumn = () => {
    if (deleteColumnIndex === null) return
    
    setEditedColumns(editedColumns.filter((_, i) => i !== deleteColumnIndex))
    setDeleteColumnIndex(null)
  }

  const handleUpdateColumn = (index: number, updates: Partial<Column>) => {
    // Always allow the update (for backspace/editing) - update state first
    const updatedColumns = editedColumns.map((col, i) => (i === index ? { ...col, ...updates } : col))
    setEditedColumns(updatedColumns)
    
    // Validate column name uniqueness after update (for error display only)
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim()
      const columnId = updatedColumns[index].id
      
      if (!trimmedName) {
        // Empty name is invalid
        setColumnErrors((prev) => ({ ...prev, [columnId]: 'Column name is required' }))
      } else {
        const isDuplicate = updatedColumns.some(
          (col, i) => i !== index && col.name.toLowerCase() === trimmedName.toLowerCase()
        )
        
        if (isDuplicate) {
          // Show error for duplicate name
          setColumnErrors((prev) => ({ ...prev, [columnId]: 'Column name already exists' }))
        } else {
          // Clear error if name is valid
          setColumnErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[columnId]
            return newErrors
          })
        }
      }
    }
  }

  // Get column metadata
  const getColumnMetadata = (columnId: string) => {
    return columnMetadata[columnId] || { isDoneColumn: false }
  }

  // Update column metadata
  const updateColumnMetadata = (columnId: string, updates: { isDoneColumn?: boolean }) => {
    setColumnMetadata((prev) => ({
      ...prev,
      [columnId]: { ...prev[columnId], ...updates },
    }))
  }

  // Compute validation status in real-time
  const hasValidationErrors = useMemo(() => {
    return Object.keys(columnErrors).length > 0
  }, [columnErrors])

  const filteredUsers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    const currentIds = new Set(memberList.map((m) => m.userId))
    return availableUsers.filter((user) => {
      if (currentIds.has(user.id)) return false
      if (user.id === currentUserId) return false
      if (!query) return true
      return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    })
  }, [availableUsers, memberList, memberSearch, currentUserId])

  const handleAddMember = (user: User) => {
    if (user.id === currentUserId) return
    setMemberList((prev) => {
      if (prev.some((m) => m.userId === user.id)) return prev
      return [
        ...prev,
        { userId: user.id, role: 'member', joinedAt: new Date().toISOString() },
      ]
    })
  }

  const handleRemoveMember = (userId: string) => {
    if (board?.createdBy === userId) return
    setMemberList((prev) => prev.filter((member) => member.userId !== userId))
  }

  const handleUpdateMemberRole = (userId: string, role: 'admin' | 'member' | 'viewer') => {
    setMemberList((prev) =>
      prev.map((member) => (member.userId === userId ? { ...member, role } : member)),
    )
  }

  const handleSave = async () => {
    if (!board) return

    // Validate all column names before saving
    const columnNameErrors: Record<string, string> = {}
    editedColumns.forEach((col, index) => {
      const trimmedName = col.name.trim()
      if (!trimmedName) {
        columnNameErrors[col.id] = 'Column name is required'
      } else {
        const isDuplicate = editedColumns.some(
          (otherCol, otherIndex) => 
            otherIndex !== index && 
            otherCol.name.toLowerCase() === trimmedName.toLowerCase()
        )
        if (isDuplicate) {
          columnNameErrors[col.id] = 'Column name already exists'
        }
      }
    })

    if (Object.keys(columnNameErrors).length > 0) {
      setColumnErrors(columnNameErrors)
      // Switch to columns section if there are errors
      setActiveSection('columns')
      return
    }

    try {
      // Convert columns to backend format
      const backendColumns = editedColumns.map((col, index) => {
        const metadata = getColumnMetadata(col.id)
        // Extract hex color from Tailwind class or use direct hex value
        let hexColor: string | undefined = undefined
        
        if (col.color.startsWith('#')) {
          // Already a hex color
          hexColor = col.color
        } else if (col.color.startsWith('bg-[') && col.color.includes(']')) {
          // Extract hex from bg-[#hex] format
          const hexMatch = col.color.match(/bg-\[([^\]]+)\]/)
          if (hexMatch && hexMatch[1]) {
            hexColor = hexMatch[1]
          }
        }
        
        return {
          id: col.id,
          name: col.name,
          order: index,
          hexColor,
          isDoneColumn: metadata.isDoneColumn,
        }
      })

      // Update board via API (this will emit socket events)
      const updated = await updateBoard(board.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        emoji,
        settings: {
          defaultView,
          showSwimlanes,
          ...(detailsSettings && { ticketDetailsSettings: detailsSettings }),
          githubAutomation: board?.settings?.githubAutomation || { rules: [] },
        },
        columns: backendColumns,
      } as any)

      // Call onSave callback with the full updated board (like EditBoardModal pattern)
      if (updated) {
        onSave(updated)
        onClose()
      } else {
        console.error('Failed to update board')
      }
    } catch (error) {
      console.error('Failed to save board settings:', error)
      // Error handling is done by the hook
    }
  }

  const handleSaveMembers = async () => {
    if (!board) return
    try {
      const payload = memberList.map((member) => ({
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
      }))
      const updated = await updateBoard(board.id, { members: payload } as any)
      if (updated) {
        setMemberList(
          updated.members.map((member) => ({
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
          })),
        )
        onSave(updated)
        toast.success('Members updated')
      } else {
        toast.error('Failed to update members')
      }
    } catch (error) {
      console.error('Failed to update members:', error)
      toast.error('Failed to update members')
    }
  }

  if (!board) return null

  return (
    <Modal open={open} onClose={onClose} maxWidth="4xl">
      <div className="flex h-[600px]">
        {/* Jira-style Sidebar Navigation */}
        <div className="w-16 sm:w-64 border-r border-border bg-muted/30 flex-shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-center sm:justify-start">
            <Settings className="h-5 w-5 text-muted-foreground sm:hidden" />
            <h2 className="hidden sm:block text-lg font-semibold text-foreground">Board settings</h2>
          </div>
          <nav className="p-2 space-y-1">
            <button
              onClick={() => setActiveSection('general')}
              className={cn(
                'w-full flex items-center justify-center sm:justify-start gap-0 sm:gap-3 px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors',
                activeSection === 'general'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-label="General"
              title="General"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </button>
            <button
              onClick={() => setActiveSection('columns')}
              className={cn(
                'w-full flex items-center justify-center sm:justify-start gap-0 sm:gap-3 px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors',
                activeSection === 'columns'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-label="Columns"
              title="Columns"
            >
              <Columns className="h-4 w-4" />
              <span className="hidden sm:inline">Columns</span>
            </button>
            <button
              onClick={() => setActiveSection('details')}
              className={cn(
                'w-full flex items-center justify-center sm:justify-start gap-0 sm:gap-3 px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors',
                activeSection === 'details'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-label="Details"
              title="Details"
            >
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </button>
            <button
              onClick={() => setActiveSection('members')}
              className={cn(
                'w-full flex items-center justify-center sm:justify-start gap-0 sm:gap-3 px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors',
                activeSection === 'members'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-label="Members"
              title="Members"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {activeSection === 'general'
                  ? 'General settings'
                  : activeSection === 'columns'
                  ? 'Column settings'
                  : activeSection === 'members'
                  ? 'Members'
                  : 'Details settings'}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeSection === 'general'
                  ? 'Configure board name, icon, description, and view preferences'
                  : activeSection === 'columns'
                  ? 'Manage columns, their order, colors, and done column settings'
                  : activeSection === 'members'
                  ? 'Invite teammates to this board, adjust roles, or remove access'
                  : 'Choose which fields to display in ticket details and arrange their order'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {activeSection === 'general' && (
              <div className="space-y-6 max-w-2xl">
                {/* Board Name */}
                <div className="space-y-2">
                  <Label htmlFor="board-name">Board name</Label>
                  <Input
                    id="board-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter board name"
                    className="w-full"
                  />
                </div>

                {/* Board Icon */}
                <div className="space-y-2">
                  <Label>Board icon</Label>
                  <div className="relative">
                    <button
                      ref={emojiButtonRef}
                      type="button"
                      onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                      className="h-12 w-12 flex items-center justify-center rounded-lg border border-input bg-background text-2xl hover:bg-accent transition-colors"
                    >
                      {emoji}
                    </button>
                    
                    {emojiPickerOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setEmojiPickerOpen(false)}
                        />
                        <div className="absolute top-full left-0 mt-2 z-20 w-96 p-3 bg-popover border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto">
                          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                            <div key={category} className="mb-4 last:mb-0">
                              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                                {category}
                              </p>
                              <div className="grid grid-cols-8 gap-1">
                                {emojis.map((emo) => (
                                  <button
                                    key={emo}
                                    type="button"
                                    onClick={() => {
                                      setEmoji(emo)
                                      setEmojiPickerOpen(false)
                                    }}
                                    className={cn(
                                      'h-8 w-8 flex items-center justify-center rounded hover:bg-accent transition-colors text-lg',
                                      emoji === emo && 'bg-primary/10 ring-2 ring-primary'
                                    )}
                                  >
                                    {emo}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Board Key (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="board-key">Board key</Label>
                  <Input
                    id="board-key"
                    value={board.prefix}
                    disabled
                    className="w-full bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    The board key cannot be changed after creation
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="board-description">Description</Label>
                  <textarea
                    id="board-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description to help your team understand this board"
                    className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>

                {/* Default View */}
                <div className="space-y-3">
                  <Label>Default view</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDefaultView('board')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all',
                        defaultView === 'board'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-accent'
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="text-sm font-medium">Board</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultView('list')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all',
                        defaultView === 'list'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-accent'
                      )}
                    >
                      <List className="h-4 w-4" />
                      <span className="text-sm font-medium">List</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose the default view when opening this board
                  </p>
                </div>

                {/* Show Swimlanes */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div>
                    <Label htmlFor="show-swimlanes" className="text-sm font-medium">
                      Show swimlanes
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Group tickets by assignee or epic
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSwimlanes(!showSwimlanes)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      showSwimlanes ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        showSwimlanes ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'members' && (
              <div className="space-y-6 max-w-3xl">
                <div className="space-y-2">
                  <Label>Current members</Label>
                  <div className="space-y-3">
                    {memberList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members yet.</p>
                    ) : (
                      memberList.map((member) => {
                        const user = availableUsers.find((u) => u.id === member.userId)
                        const isCreator = board.createdBy === member.userId
                        const joined = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : undefined
                        return (
                          <div
                            key={member.userId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 bg-background"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {user?.name || 'Unknown user'}
                                {isCreator && <span className="ml-2 text-[11px] text-muted-foreground">(creator)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">{user?.email || member.userId}</p>
                              {joined && <p className="text-[11px] text-muted-foreground mt-0.5">Joined {joined}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.userId, e.target.value as any)}
                                disabled={loading || isCreator}
                                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={loading || isCreator}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Add members</Label>
                  <Input
                    placeholder="Search by name or email"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <div className="rounded-lg border border-border/70 max-h-60 overflow-y-auto divide-y divide-border/70 bg-muted/40">
                    {loadingUsers ? (
                      <div className="p-3 text-sm text-muted-foreground">Loading people…</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No people found</div>
                    ) : (
                      filteredUsers.slice(0, 12).map((user) => (
                        <div key={user.id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddMember(user)}
                            disabled={loading}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveMembers} disabled={loading}>
                    {loading ? 'Saving...' : 'Save members'}
                  </Button>
                </div>
              </div>
            )}

            {activeSection === 'columns' && (
              <div className="space-y-3 max-w-3xl">
                {editedColumns.map((column, index) => {
                  const metadata = getColumnMetadata(column.id)
                  return (
                    <div
                      key={column.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      ref={draggedIndex === index ? dragNodeRef : null}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border border-border bg-card transition-all',
                        draggedIndex === index && 'opacity-50 scale-[0.98]',
                        dragOverIndex === index && 'border-primary border-dashed bg-accent/30',
                        'hover:bg-accent/30'
                      )}
                    >
                      {/* Drag handle */}
                      <div className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted rounded transition-colors">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Color picker */}
                      <div className="relative">
                        <button
                          ref={colorPickerOpen === column.id ? colorButtonRef : null}
                          type="button"
                          onClick={() => {
                            const isOpening = colorPickerOpen !== column.id
                            setColorPickerOpen(isOpening ? column.id : null)
                            if (isOpening) {
                              // Extract current hex color for custom picker
                              const currentHex = column.color.startsWith('#') 
                                ? column.color 
                                : column.color.match(/bg-\[([^\]]+)\]/)?.[1] || '#3b82f6'
                              setCustomColorValue(currentHex)
                            }
                          }}
                          className={cn(
                            'w-8 h-8 rounded-md transition-all hover:scale-110 border-2',
                            column.color,
                            column.color.startsWith('bg-[') 
                              ? 'border-border/50' 
                              : 'border-border/30',
                            'shadow-sm'
                          )}
                          style={
                            column.color.startsWith('bg-[') 
                              ? { 
                                  backgroundColor: column.color.match(/bg-\[([^\]]+)\]/)?.[1] || undefined,
                                  borderColor: 'rgba(0,0,0,0.1)'
                                }
                              : undefined
                          }
                          title="Change color"
                        />
                        
                        {colorPickerOpen === column.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => {
                                setColorPickerOpen(null)
                              }}
                            />
                            <div className="absolute top-full left-0 mt-2 z-20 w-80 p-3 bg-popover border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto">
                              <div className="space-y-3">
                                {/* Predefined Colors by Category */}
                                {Object.entries(COLOR_CATEGORIES).map(([category, colors]) => (
                                  <div key={category} className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground px-1">
                                      {category}
                                    </p>
                                    <div className="grid grid-cols-5 gap-1.5">
                                      {colors.map((color) => {
                                        const colorClass = hexToColorClass(color.hex)
                                        const isSelected = column.color === colorClass || 
                                          (column.color.startsWith('bg-[') && 
                                           column.color.match(/bg-\[([^\]]+)\]/)?.[1] === color.hex)
                                        return (
                                          <button
                                            key={color.hex}
                                            type="button"
                                            onClick={() => {
                                              handleUpdateColumn(index, { color: colorClass })
                                              setColorPickerOpen(null)
                                            }}
                                            className={cn(
                                              'w-8 h-8 rounded-md transition-all hover:scale-110 border-2 shadow-sm',
                                              isSelected 
                                                ? 'ring-2 ring-primary ring-offset-1 border-primary/50' 
                                                : 'border-border/50 hover:border-border'
                                            )}
                                            style={{ backgroundColor: color.hex }}
                                            title={color.name}
                                          />
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Custom Color Picker */}
                                <div className="space-y-2 pt-2 border-t border-border">
                                  <p className="text-xs font-medium text-muted-foreground px-1">
                                    Custom
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={customColorValue}
                                      onChange={(e) => {
                                        setCustomColorValue(e.target.value)
                                        handleUpdateColumn(index, { color: hexToColorClass(e.target.value) })
                                      }}
                                      className="w-12 h-8 rounded-md border border-border cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={customColorValue}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                          setCustomColorValue(value)
                                          if (value.length === 7) {
                                            handleUpdateColumn(index, { color: hexToColorClass(value) })
                                          }
                                        }
                                      }}
                                      placeholder="#3b82f6"
                                      className="flex-1 h-8 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateColumn(index, { color: hexToColorClass(customColorValue) })
                                        setColorPickerOpen(null)
                                      }}
                                      className="px-3 h-8 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Column name */}
                      <div className="flex-1">
                        <Input
                          value={column.name}
                          onChange={(e) => handleUpdateColumn(index, { name: e.target.value })}
                          className={cn(
                            'h-9 text-sm',
                            columnErrors[column.id] && 'border-destructive focus-visible:ring-destructive'
                          )}
                          placeholder="Column name"
                        />
                        {columnErrors[column.id] && (
                          <p className="text-xs text-destructive mt-1">{columnErrors[column.id]}</p>
                        )}
                      </div>

                      {/* Done column toggle */}
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/50 bg-muted/30">
                        <input
                          type="checkbox"
                          id={`done-${column.id}`}
                          checked={metadata.isDoneColumn}
                          onChange={(e) => {
                            updateColumnMetadata(column.id, { isDoneColumn: e.target.checked })
                          }}
                          className="h-4 w-4 rounded border-input cursor-pointer"
                        />
                        <Label htmlFor={`done-${column.id}`} className="text-xs text-muted-foreground cursor-pointer">
                          Done
                        </Label>
                      </div>

                      {/* Task count */}
                      <div className="px-2 py-1 rounded-md bg-muted/30 border border-border/50">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {column.tasks.length} task{column.tasks.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(index)}
                        className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors border border-transparent hover:border-destructive/20"
                        title="Delete column"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}

                {/* Add column button */}
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent/30 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Add column</span>
                </button>
              </div>
            )}

            {activeSection === 'details' && (
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Configure Details Fields</div>
                  <div className="text-xs text-muted-foreground">
                    Choose which fields to display and arrange their order.
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                    {detailsSettings?.fieldConfigs
                      ? [...detailsSettings.fieldConfigs].sort((a, b) => a.order - b.order).map((config, index) => (
                          <DraggableFieldConfigItem
                            key={config.fieldName}
                            config={config}
                            index={index}
                            isDragging={detailsDraggedIndex === index}
                            onToggleVisibility={(fieldName, isVisible) => {
                              if (detailsSettings) {
                                const updated = {
                                  ...detailsSettings,
                                  fieldConfigs: detailsSettings.fieldConfigs.map((fc) =>
                                    fc.fieldName === fieldName ? { ...fc, isVisible } : fc
                                  ),
                                }
                                setDetailsSettings(updated)
                              }
                            }}
                            onDragStart={(e, index) => {
                              setDetailsDraggedIndex(index)
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/html', index.toString())
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e, dropIndex) => {
                              e.preventDefault()
                              if (detailsDraggedIndex === null || detailsDraggedIndex === dropIndex || !detailsSettings) return

                              const updated = { ...detailsSettings }
                              const sortedConfigs = [...updated.fieldConfigs].sort((a, b) => a.order - b.order)
                              const draggedItem = sortedConfigs[detailsDraggedIndex]

                              sortedConfigs.splice(detailsDraggedIndex, 1)
                              sortedConfigs.splice(dropIndex, 0, draggedItem)

                              sortedConfigs.forEach((config, index) => {
                                config.order = index
                              })

                              updated.fieldConfigs = sortedConfigs
                              setDetailsSettings(updated)
                              setDetailsDraggedIndex(null)
                            }}
                            onDragEnd={() => setDetailsDraggedIndex(null)}
                          />
                        ))
                      : null}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const defaultSettings = {
                          fieldConfigs: [
                            { fieldName: 'priority', isVisible: true, order: 0 },
                            { fieldName: 'assignee', isVisible: true, order: 1 },
                            { fieldName: 'tags', isVisible: true, order: 2 },
                            { fieldName: 'parent', isVisible: true, order: 3 },
                            { fieldName: 'dueDate', isVisible: true, order: 4 },
                            { fieldName: 'startDate', isVisible: true, order: 5 },
                            { fieldName: 'endDate', isVisible: true, order: 6 },
                          ],
                        }
                        setDetailsSettings(defaultSettings)
                        toast.success('Settings reset to defaults')
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || hasValidationErrors}
              title={hasValidationErrors ? 'Please fix column name errors before saving' : undefined}
            >
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Column Confirmation Modal */}
      {deleteColumnIndex !== null && (
        <Modal open={deleteColumnIndex !== null} onClose={() => setDeleteColumnIndex(null)} maxWidth="sm">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Delete column</h2>
              </div>
              <button
                onClick={() => setDeleteColumnIndex(null)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 mb-6">
              {editedColumns[deleteColumnIndex]?.tasks.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete <span className="font-semibold text-foreground">"{editedColumns[deleteColumnIndex]?.name}"</span>?
                  </p>
                  <p className="text-sm text-destructive">
                    This column contains <span className="font-semibold">{editedColumns[deleteColumnIndex]?.tasks.length} task{editedColumns[deleteColumnIndex]?.tasks.length !== 1 ? 's' : ''}</span>. 
                    These tasks will need to be moved to another column or they may be lost.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{editedColumns[deleteColumnIndex]?.name}"</span>?
                </p>
              )}
              <p className="text-sm text-destructive">
                This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDeleteColumnIndex(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeleteColumn}
              >
                Delete column
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
