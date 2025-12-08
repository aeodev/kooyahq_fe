import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import axiosInstance from '@/utils/axios.instance'
import { CREATE_TICKET } from '@/utils/api.routes'
import type { Task, Column } from '../types'
import type { TicketDetailResponse } from './types'
import { getTaskTypeIcon, getPriorityIcon, getPriorityLabel } from '../index'

type TaskSubtasksSectionProps = {
  editedTask: Task
  subtasksExpanded: boolean
  subtasksProgress: number
  ticketDetails: TicketDetailResponse | null
  boardId?: string
  columns: Column[]
  onToggleSubtasks: () => void
  onRefreshTicket: () => void
  onNavigateToTask?: (taskKey: string) => void
}

export function TaskSubtasksSection({
  editedTask,
  subtasksExpanded,
  subtasksProgress,
  ticketDetails,
  boardId,
  columns,
  onToggleSubtasks,
  onRefreshTicket,
  onNavigateToTask,
}: TaskSubtasksSectionProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !boardId || !ticketDetails?.ticket.id) return

    setIsCreating(true)
    try {
      const payload = {
        ticketType: 'subtask' as const,
        title: newSubtaskTitle.trim(),
        parentTicketId: ticketDetails.ticket.id,
        rootEpicId: ticketDetails.ticket.rootEpicId || undefined,
        columnId: ticketDetails.ticket.columnId,
        priority: 'medium' as const,
      }

      await axiosInstance.post(CREATE_TICKET(boardId), payload)
      setNewSubtaskTitle('')
      setIsAddingSubtask(false)
      onRefreshTicket()
    } catch (error) {
      console.error('Error creating subtask:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div>
      <button
        onClick={onToggleSubtasks}
        className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 w-full"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform',
            subtasksExpanded && 'rotate-90'
          )}
        />
        Subtasks
        <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              setIsAddingSubtask(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </button>
      {subtasksExpanded && (
        <div className="ml-6">
          {/* Get actual subtasks from ticketDetails (children with ticketType === 'subtask') */}
          {(() => {
            const actualSubtasks = ticketDetails?.relatedTickets.children.filter(
              (child) => child.ticketType === 'subtask'
            ) || []
            
            // Use editedTask.subtasks for progress calculation if available, otherwise calculate from actualSubtasks
            const subtasksForProgress = editedTask.subtasks.length > 0 ? editedTask.subtasks : actualSubtasks.map(s => ({
              id: s.id,
              key: s.ticketKey,
              title: s.title,
              priority: s.priority,
              status: 'todo', // Default status
              assignee: undefined,
            }))
            const subtasksDone = subtasksForProgress.filter((s) => s.status === 'done').length
            const progress = subtasksForProgress.length > 0 
              ? Math.round((subtasksDone / subtasksForProgress.length) * 100) 
              : 0

            if (actualSubtasks.length > 0) {
              return (
              <div className="space-y-2">
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {progress}% Done
                  </span>
                </div>
                
                {/* Subtasks table */}
                <div className="border border-border/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Work</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Priority</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Assignee</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actualSubtasks.map((subtask) => (
                        <tr 
                          key={subtask.id} 
                          className="border-t border-border/30 hover:bg-accent/30 cursor-pointer"
                          onClick={() => onNavigateToTask?.(subtask.ticketKey)}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {getTaskTypeIcon('subtask')}
                              <span className="text-muted-foreground">{subtask.ticketKey}</span>
                              <span className="text-foreground">{subtask.title}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {getPriorityIcon(subtask.priority)}
                              <span>{getPriorityLabel(subtask.priority)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {/* Assignee would need to be fetched from users list */}
                            <span className="text-xs text-muted-foreground">-</span>
                          </td>
                          <td className="px-3 py-2">
                            {(() => {
                              const column = columns.find((col) => col.id === subtask.columnId)
                              const columnName = column?.name || subtask.columnId || 'Unknown'
                              return (
                                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                                  {columnName}
                                </Badge>
                              )
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )
            }
            
            if (editedTask.subtasks.length > 0) {
              return (
                <div className="space-y-2">
                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${subtasksProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {subtasksProgress}% Done
                    </span>
                  </div>
                  
                  {/* Subtasks table */}
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Work</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Priority</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Assignee</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editedTask.subtasks.map((subtask) => (
                          <tr 
                            key={subtask.id} 
                            className="border-t border-border/30 hover:bg-accent/30 cursor-pointer"
                            onClick={() => onNavigateToTask?.(subtask.key)}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {getTaskTypeIcon('subtask')}
                                <span className="text-muted-foreground">{subtask.key}</span>
                                <span className="text-foreground">{subtask.title}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {getPriorityIcon(subtask.priority)}
                                <span>{getPriorityLabel(subtask.priority)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {subtask.assignee && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={cn(
                                      'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0',
                                      subtask.assignee.color
                                    )}
                                  >
                                    {subtask.assignee.initials}
                                  </div>
                                  <span className="truncate">{subtask.assignee.name}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                                {subtask.status.toUpperCase()}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
            
            return null
          })()}
          {isAddingSubtask ? (
            <div className="flex gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Enter subtask title..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSubtask()
                  } else if (e.key === 'Escape') {
                    setIsAddingSubtask(false)
                    setNewSubtaskTitle('')
                  }
                }}
                autoFocus
                className="flex-1"
                disabled={isCreating}
              />
              <Button size="sm" onClick={handleAddSubtask} disabled={isCreating}>
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddingSubtask(false)
                  setNewSubtaskTitle('')
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
            </div>
          ) : !isAddingSubtask && (ticketDetails?.relatedTickets.children.filter(c => c.ticketType === 'subtask').length || 0) === 0 && editedTask.subtasks.length === 0 ? (
            <button
              onClick={() => setIsAddingSubtask(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add subtask
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

