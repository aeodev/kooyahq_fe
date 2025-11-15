import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserSelector } from '@/components/ui/user-selector'
import type { Board } from '@/types/board'
type CreateIssueModalProps = {
  open: boolean
  onClose: () => void
  onCreate: (input: {
    title: string
    description?: string
    issueType: 'task' | 'bug' | 'story' | 'epic'
    priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
    labels?: string[]
    storyPoints?: number
    dueDate?: string
    assigneeId?: string
    columnId: string
  }) => Promise<void>
  boardColumns: string[]
  defaultColumn?: string
  board?: Board | null
}

export function CreateIssueModal({
  open,
  onClose,
  onCreate,
  boardColumns,
  defaultColumn,
  board,
}: CreateIssueModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    issueType: 'task' as 'task' | 'bug' | 'story' | 'epic',
    priority: 'medium' as 'lowest' | 'low' | 'medium' | 'high' | 'highest',
    labels: [] as string[],
    storyPoints: undefined as number | undefined,
    dueDate: undefined as string | undefined,
    assigneeId: undefined as string | undefined,
    columnId: defaultColumn || boardColumns[0] || '',
  })
  const [newLabel, setNewLabel] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!form.title.trim() || !form.columnId) return
    setLoading(true)
    await onCreate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      issueType: form.issueType,
      priority: form.priority,
      labels: form.labels.length > 0 ? form.labels : undefined,
      storyPoints: form.storyPoints,
      dueDate: form.dueDate,
      assigneeId: form.assigneeId,
      columnId: form.columnId,
    })
    setLoading(false)
    handleClose()
  }

  const handleClose = () => {
    setForm({
      title: '',
      description: '',
      issueType: 'task',
      priority: 'medium',
      labels: [],
      storyPoints: undefined,
      dueDate: undefined,
      assigneeId: undefined,
      columnId: defaultColumn || boardColumns[0] || '',
    })
    setNewLabel('')
    onClose()
  }

  const addLabel = () => {
    if (newLabel.trim() && !form.labels.includes(newLabel.trim())) {
      setForm({ ...form, labels: [...form.labels, newLabel.trim()] })
      setNewLabel('')
    }
  }

  const removeLabel = (label: string) => {
    setForm({ ...form, labels: form.labels.filter((l) => l !== label) })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Create Issue</h2>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Issue Type *</label>
            <select
              value={form.issueType}
              onChange={(e) => setForm({ ...form, issueType: e.target.value as any })}
              className="w-full h-10 border rounded px-3 bg-background"
            >
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="story">Story</option>
              <option value="epic">Epic</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Column *</label>
            <select
              value={form.columnId}
              onChange={(e) => setForm({ ...form, columnId: e.target.value })}
              className="w-full h-10 border rounded px-3 bg-background"
            >
              {boardColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Title *</label>
            <Input
              placeholder="Enter issue title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-10"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              placeholder="Enter description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full min-h-[100px] border rounded p-3 resize-y bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full h-10 border rounded px-3 bg-background"
              >
                <option value="lowest">Lowest</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="highest">Highest</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Story Points</label>
              <Input
                type="number"
                placeholder="0"
                value={form.storyPoints || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    storyPoints: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-10"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Due Date</label>
            <Input
              type="date"
              value={form.dueDate || ''}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value || undefined })}
              className="h-10"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Assignee</label>
            <UserSelector
              value={form.assigneeId}
              onChange={(userId) => setForm({ ...form, assigneeId: userId })}
              placeholder="Unassigned"
              allowedUserIds={
                board
                  ? [board.ownerId, ...board.memberIds]
                  : undefined
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Labels</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addLabel()
                  }
                }}
                className="flex-1"
              />
              <Button onClick={addLabel}>Add</Button>
            </div>
            {form.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.labels.map((label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => removeLabel(label)}
                  >
                    {label} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleCreate} disabled={!form.title.trim() || loading} className="flex-1">
              Create Issue
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

