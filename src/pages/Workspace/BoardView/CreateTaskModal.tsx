import { useState, useEffect } from 'react'
import { X, ChevronDown, Plus, Trash2, Calendar, CheckSquare, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { cn } from '@/utils/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Column, TaskType, Priority } from './types'
import { getTaskTypeIcon, getPriorityIcon, getPriorityLabel } from './index'
import axiosInstance from '@/utils/axios.instance'
import { CREATE_TICKET, GET_TICKETS_BY_BOARD } from '@/utils/api.routes'
import type { Ticket } from '@/types/board'

type CreateTaskModalProps = {
  open: boolean
  onClose: () => void
  columns: Column[]
  selectedColumnId: string | null
  boardId: string
  boardKey: string
  assignees: Array<{ id: string; name: string; initials: string; color: string }>
  onSuccess?: () => void
}

const TASK_TYPES: TaskType[] = ['task', 'bug', 'story', 'epic', 'subtask']
const PRIORITY_OPTIONS: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest']
const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13]

type AcceptanceCriteriaItem = {
  id: string
  text: string
  completed: boolean
}

type DocumentItem = {
  id: string
  url: string
  label?: string
}

export function CreateTaskModal({
  open,
  onClose,
  columns,
  selectedColumnId,
  boardId,
  boardKey,
  assignees,
  onSuccess,
}: CreateTaskModalProps) {
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskType>('task')
  const [priority, setPriority] = useState<Priority>('medium')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [columnId, setColumnId] = useState<string>(selectedColumnId || columns[0]?.id || '')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [points, setPoints] = useState<number | null>(null)
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriteriaItem[]>([])
  const [newCriteria, setNewCriteria] = useState('')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [newDocumentUrl, setNewDocumentUrl] = useState('')
  const [newDocumentLabel, setNewDocumentLabel] = useState('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [parentTicketId, setParentTicketId] = useState<string | null>(null)
  const [rootEpicId, setRootEpicId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([])

  // Fetch tickets for parent/epic selection
  useEffect(() => {
    if (open && boardId) {
      axiosInstance.get<{ success: boolean; data: Ticket[] }>(GET_TICKETS_BY_BOARD(boardId))
        .then((response) => {
          if (response.data.success && response.data.data) {
            setAvailableTickets(response.data.data)
          }
        })
        .catch((error) => {
          console.error('Error fetching tickets:', error)
        })
    }
  }, [open, boardId])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setType('task')
      setPriority('medium')
      setAssigneeId(null)
      setColumnId(selectedColumnId || columns[0]?.id || '')
      setTags([])
      setNewTag('')
      setPoints(null)
      setAcceptanceCriteria([])
      setNewCriteria('')
      setDocuments([])
      setNewDocumentUrl('')
      setNewDocumentLabel('')
      setStartDate('')
      setEndDate('')
      setDueDate('')
      setParentTicketId(null)
      setRootEpicId(null)
    }
  }, [open, selectedColumnId, columns])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleAddCriteria = () => {
    if (newCriteria.trim()) {
      setAcceptanceCriteria([
        ...acceptanceCriteria,
        { id: `criteria-${Date.now()}`, text: newCriteria.trim(), completed: false },
      ])
      setNewCriteria('')
    }
  }

  const handleRemoveCriteria = (id: string) => {
    setAcceptanceCriteria(acceptanceCriteria.filter((c) => c.id !== id))
  }

  const handleToggleCriteria = (id: string) => {
    setAcceptanceCriteria(acceptanceCriteria.map(c => 
      c.id === id ? { ...c, completed: !c.completed } : c
    ))
  }

  const handleAddDocument = () => {
    if (newDocumentUrl.trim()) {
      setDocuments([
        ...documents,
        {
          id: `doc-${Date.now()}`,
          url: newDocumentUrl.trim(),
          label: newDocumentLabel.trim() || undefined,
        },
      ])
      setNewDocumentUrl('')
      setNewDocumentLabel('')
    }
  }

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !boardId) return

    setLoading(true)
    try {
      const payload = {
        ticketType: type,
        title: title.trim(),
        description: description || undefined,
        columnId,
        assigneeId: assigneeId || undefined,
        priority,
        tags: tags.length > 0 ? tags : undefined,
        points: points || undefined,
        acceptanceCriteria: acceptanceCriteria.length > 0 
          ? acceptanceCriteria.map(c => ({ text: c.text, completed: c.completed }))
          : undefined,
        documents: documents.length > 0 
          ? documents.map(d => ({ url: d.url, label: d.label }))
          : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        dueDate: dueDate || undefined,
        parentTicketId: parentTicketId || undefined,
        rootEpicId: rootEpicId || undefined,
      }

      const response = await axiosInstance.post(CREATE_TICKET(boardId), payload)
      
      if (response.data.success || response.data.status === 'success') {
        onSuccess?.()
        onClose()
      }
    } catch (error: any) {
      console.error('Error creating card:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedColumn = columns.find((c) => c.id === columnId)
  const selectedAssignee = assigneeId ? assignees.find((a) => a.id === assigneeId) : null
  const selectedParent = parentTicketId ? availableTickets.find((t) => t.id === parentTicketId) : null
  const selectedEpic = rootEpicId ? availableTickets.find((t) => t.id === rootEpicId && t.ticketType === 'epic') : null
  
  // Filter tickets for parent selection (epics, stories, tasks)
  const availableParents = availableTickets.filter(t => 
    t.ticketType === 'epic' || t.ticketType === 'story' || t.ticketType === 'task'
  )
  
  // Filter tickets for epic selection (only epics)
  const availableEpics = availableTickets.filter(t => t.ticketType === 'epic')

  const showParentEpicFields = type === 'subtask' || type === 'story' || type === 'task'

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-8 z-50 flex items-start justify-center overflow-hidden">
        <div
          className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-5xl max-h-full overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm">
              {getTaskTypeIcon(type)}
              <span className="font-medium">Create Issue</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="text-lg font-semibold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Description</label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Add a description..."
                />
              </div>

              {/* Acceptance Criteria */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Acceptance Criteria</label>
                {acceptanceCriteria.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {acceptanceCriteria.map((criteria) => (
                      <div key={criteria.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleCriteria(criteria.id)}
                          className="flex-shrink-0"
                        >
                          <CheckSquare
                            className={cn(
                              'h-4 w-4',
                              criteria.completed
                                ? 'text-primary fill-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                        </button>
                        <span className={cn(
                          'text-sm flex-1',
                          criteria.completed && 'line-through text-muted-foreground'
                        )}>
                          {criteria.text}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCriteria(criteria.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newCriteria}
                    onChange={(e) => setNewCriteria(e.target.value)}
                    placeholder="Add acceptance criteria"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCriteria()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCriteria}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Documents */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Documents</label>
                {documents.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm text-primary hover:underline"
                        >
                          {doc.label || doc.url}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newDocumentUrl}
                    onChange={(e) => setNewDocumentUrl(e.target.value)}
                    placeholder="Document URL"
                    className="h-9"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={newDocumentLabel}
                      onChange={(e) => setNewDocumentLabel(e.target.value)}
                      placeholder="Label (optional)"
                      className="h-9"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddDocument}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-border/50 bg-muted/20 overflow-y-auto">
              <div className="p-4 space-y-3">
                {/* Issue Type */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Issue Type</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 w-full text-left hover:bg-accent rounded px-2 py-1.5 transition-colors">
                        {getTaskTypeIcon(type)}
                        <span className="text-sm capitalize flex-1">{type}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {TASK_TYPES.map((t) => (
                        <DropdownMenuItem
                          key={t}
                          onClick={() => setType(t)}
                          className="cursor-pointer"
                        >
                          {getTaskTypeIcon(t)}
                          <span className="ml-2 capitalize">{t}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Status</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 w-full text-left hover:bg-accent rounded px-2 py-1.5 transition-colors">
                        <div className={cn('w-3 h-3 rounded-sm', selectedColumn?.color)} />
                        <span className="text-sm flex-1">{selectedColumn?.name || 'Select status'}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {columns.map((col) => (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={() => setColumnId(col.id)}
                          className="cursor-pointer"
                        >
                          <div className={cn('w-3 h-3 rounded-sm mr-2', col.color)} />
                          {col.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Priority</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 w-full text-left hover:bg-accent rounded px-2 py-1.5 transition-colors">
                        {getPriorityIcon(priority)}
                        <span className="text-sm flex-1">{getPriorityLabel(priority)}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <DropdownMenuItem
                          key={p}
                          onClick={() => setPriority(p)}
                          className="cursor-pointer"
                        >
                          {getPriorityIcon(p)}
                          <span className="ml-2">{getPriorityLabel(p)}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Assignee */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Assignee</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 w-full text-left hover:bg-accent rounded px-2 py-1.5 transition-colors">
                        {selectedAssignee ? (
                          <>
                            <div
                              className={cn(
                                'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0',
                                selectedAssignee.color
                              )}
                            >
                              {selectedAssignee.initials}
                            </div>
                            <span className="text-sm flex-1">{selectedAssignee.name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground flex-1">Unassigned</span>
                        )}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setAssigneeId(null)}
                        className="cursor-pointer"
                      >
                        Unassigned
                      </DropdownMenuItem>
                      {assignees.map((user) => (
                        <DropdownMenuItem
                          key={user.id}
                          onClick={() => setAssigneeId(user.id)}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white mr-2',
                              user.color
                            )}
                          >
                            {user.initials}
                          </div>
                          {user.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Parent (for subtasks/stories/tasks) */}
                {showParentEpicFields && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Parent</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 w-full text-left hover:bg-accent rounded px-2 py-1.5 transition-colors">
                          {selectedParent ? (
                            <span className="text-sm flex-1">{selectedParent.title}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground flex-1">None</span>
                          )}
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => setParentTicketId(null)}
                          className="cursor-pointer"
                        >
                          None
                        </DropdownMenuItem>
                        {availableParents.map((ticket) => (
                          <DropdownMenuItem
                            key={ticket.id}
                            onClick={() => setParentTicketId(ticket.id)}
                            className="cursor-pointer"
                          >
                            {getTaskTypeIcon(ticket.ticketType === 'subtask' ? 'subtask' : ticket.ticketType)}
                            <span className="ml-2">{ticket.title}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Root Epic (for subtasks/stories/tasks) */}
                {showParentEpicFields && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Root Epic</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 w-full text-left hover:bg-accent rounded px-2 py-1.5 transition-colors">
                          {selectedEpic ? (
                            <span className="text-sm flex-1">{selectedEpic.title}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground flex-1">None</span>
                          )}
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => setRootEpicId(null)}
                          className="cursor-pointer"
                        >
                          None
                        </DropdownMenuItem>
                        {availableEpics.map((ticket) => (
                          <DropdownMenuItem
                            key={ticket.id}
                            onClick={() => setRootEpicId(ticket.id)}
                            className="cursor-pointer"
                          >
                            {getTaskTypeIcon('epic')}
                            <span className="ml-2">{ticket.title}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Story Points */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Story Points</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 w-full text-left hover:bg-accent rounded px-2 py-1.5 transition-colors">
                        <span className="text-sm flex-1">{points !== null ? points : 'None'}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => setPoints(null)}
                        className="cursor-pointer"
                      >
                        None
                      </DropdownMenuItem>
                      {FIBONACCI_POINTS.map((point) => (
                        <DropdownMenuItem
                          key={point}
                          onClick={() => setPoints(point)}
                          className="cursor-pointer"
                        >
                          {point}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Tags</label>
                  <div className="space-y-2">
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent rounded text-xs"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add tag"
                        className="h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddTag} className="h-8">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border/50">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={!title.trim() || loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
