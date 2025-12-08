import { X, Calendar, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { cn } from '@/utils/cn'
import type { Task, Assignee, Priority } from '../types'
import { getPriorityIcon, getPriorityLabel, getTaskTypeIcon } from '../index'

const PRIORITY_OPTIONS: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest']

type TaskDetailFieldsProps = {
  editedTask: Task
  users: Array<{ id: string; name: string; profilePic?: string }>
  detailsSettings: {
    fieldConfigs: Array<{ fieldName: string; isVisible: boolean; order: number }>
  } | null
  newTag: string
  setNewTag: (tag: string) => void
  datePickerOpen: 'dueDate' | 'startDate' | 'endDate' | null
  setDatePickerOpen: (date: 'dueDate' | 'startDate' | 'endDate' | null) => void
  availableTicketsForParent: Array<{ id: string; ticketKey: string; title: string; ticketType: string }>
  ticketDetailsParentKey?: string
  onUpdatePriority: (priority: Priority) => void
  onUpdateField: <K extends keyof Task>(field: K, value: Task[K]) => void
  onUpdateDate: (field: 'dueDate' | 'startDate' | 'endDate', date: Date | null) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onUpdateParent: (parentId: string | null) => void
  getAvailableParents: () => Array<{ id: string; ticketKey: string; title: string; ticketType: string }>
}

export function TaskDetailFields({
  editedTask,
  users,
  detailsSettings,
  newTag,
  setNewTag,
  datePickerOpen,
  setDatePickerOpen,
  availableTicketsForParent,
  ticketDetailsParentKey,
  onUpdatePriority,
  onUpdateField,
  onUpdateDate,
  onAddTag,
  onRemoveTag,
  onUpdateParent,
  getAvailableParents,
}: TaskDetailFieldsProps) {
  // Get visible fields sorted by order
  const getVisibleFields = () => {
    if (!detailsSettings?.fieldConfigs) {
      // Default: show all fields in default order
      return [
        { fieldName: 'priority', isVisible: true, order: 0 },
        { fieldName: 'assignee', isVisible: true, order: 1 },
        { fieldName: 'tags', isVisible: true, order: 2 },
        { fieldName: 'parent', isVisible: true, order: 3 },
        { fieldName: 'dueDate', isVisible: true, order: 4 },
        { fieldName: 'startDate', isVisible: true, order: 5 },
        { fieldName: 'endDate', isVisible: true, order: 6 },
      ]
    }
    return [...detailsSettings.fieldConfigs]
      .filter((config) => config.isVisible)
      .sort((a, b) => a.order - b.order)
  }

  const visibleFields = getVisibleFields()

  // Field components mapped by field name
  const fieldComponents: Record<string, JSX.Element> = {
    priority: (
      <div key="priority">
        <label className="text-xs text-muted-foreground block mb-1">Priority</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 -mx-2 transition-colors w-full">
              {getPriorityIcon(editedTask.priority)}
              <span className="text-sm">{getPriorityLabel(editedTask.priority)}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {PRIORITY_OPTIONS.map((p) => (
              <DropdownMenuItem
                key={p}
                onClick={() => onUpdatePriority(p)}
                className="cursor-pointer"
              >
                {getPriorityIcon(p)}
                <span className="ml-2">{getPriorityLabel(p)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    assignee: (
      <div key="assignee">
        <label className="text-xs text-muted-foreground block mb-1">Assignee</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 -mx-2 transition-colors w-full min-w-0">
              {editedTask.assignee ? (
                <>
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0',
                      editedTask.assignee.color
                    )}
                  >
                    {editedTask.assignee.initials}
                  </div>
                  <span className="text-sm truncate">{editedTask.assignee.name}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => onUpdateField('assignee', undefined)}
              className="cursor-pointer"
            >
              Unassigned
            </DropdownMenuItem>
            {users.map((userData) => {
              const initials = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              const assignee: Assignee = {
                id: userData.id,
                name: userData.name,
                initials,
                color: 'bg-cyan-500',
                avatar: userData.profilePic,
              }
              return (
                <DropdownMenuItem
                  key={userData.id}
                  onClick={() => onUpdateField('assignee', assignee)}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white mr-2',
                      assignee.color
                    )}
                  >
                    {assignee.initials}
                  </div>
                  {assignee.name}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    tags: (
      <div key="tags">
        <label className="text-xs text-muted-foreground block mb-1">Tags</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 -mx-2 transition-colors w-full text-left">
              {editedTask.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {editedTask.labels.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Add tags</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag name"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onAddTag()
                    }
                  }}
                  className="h-8 text-xs"
                />
                <Button onClick={onAddTag} size="sm" className="h-8">Add</Button>
              </div>
              {editedTask.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {editedTask.labels.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => onRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No tags added yet</p>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    parent: (
      <div key="parent">
        <label className="text-xs text-muted-foreground block mb-1">Parent</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 -mx-2 transition-colors w-full text-left">
              {editedTask.parent ? (
                <span className="text-sm">
                  {availableTicketsForParent.find((t) => t.id === editedTask.parent)?.ticketKey || 
                   ticketDetailsParentKey || 
                   'Parent'}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Add parent</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto" align="start">
            <div className="space-y-1">
              <DropdownMenuItem
                onClick={() => onUpdateParent(null)}
                className="cursor-pointer"
              >
                <span className="text-sm text-muted-foreground">Clear parent</span>
              </DropdownMenuItem>
              {getAvailableParents().length > 0 ? (
                getAvailableParents().map((parentTicket) => (
                  <DropdownMenuItem
                    key={parentTicket.id}
                    onClick={() => onUpdateParent(parentTicket.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {getTaskTypeIcon(parentTicket.ticketType)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{parentTicket.ticketKey}</div>
                        <p className="text-xs text-muted-foreground truncate">{parentTicket.title}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-4 text-center">
                  <p className="text-xs text-muted-foreground">No available parents</p>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    dueDate: (
      <div key="dueDate">
        <label className="text-xs text-muted-foreground block mb-1">Due date</label>
        <DropdownMenu open={datePickerOpen === 'dueDate'} onOpenChange={(open) => setDatePickerOpen(open ? 'dueDate' : null)}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 -mx-2 transition-colors w-full">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {editedTask.dueDate ? (
                <span className="text-sm">{editedTask.dueDate.toLocaleDateString()}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Add due date</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="p-0" align="start">
            <CalendarComponent
              selectedDate={editedTask.dueDate}
              onDateSelect={(date) => onUpdateDate('dueDate', date)}
            />
            {editedTask.dueDate && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => onUpdateDate('dueDate', null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    startDate: (
      <div key="startDate">
        <label className="text-xs text-muted-foreground block mb-1">Start date</label>
        <DropdownMenu open={datePickerOpen === 'startDate'} onOpenChange={(open) => setDatePickerOpen(open ? 'startDate' : null)}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 -mx-2 transition-colors w-full">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {editedTask.startDate ? (
                <span className="text-sm">{editedTask.startDate.toLocaleDateString()}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Add date</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="p-0" align="start">
            <CalendarComponent
              selectedDate={editedTask.startDate}
              onDateSelect={(date) => onUpdateDate('startDate', date)}
            />
            {editedTask.startDate && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => onUpdateDate('startDate', null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    endDate: (
      <div key="endDate">
        <label className="text-xs text-muted-foreground block mb-1">End date</label>
        <DropdownMenu open={datePickerOpen === 'endDate'} onOpenChange={(open) => setDatePickerOpen(open ? 'endDate' : null)}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 -mx-2 transition-colors w-full">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {editedTask.endDate ? (
                <span className="text-sm">{editedTask.endDate.toLocaleDateString()}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Add date</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="p-0" align="start">
            <CalendarComponent
              selectedDate={editedTask.endDate}
              onDateSelect={(date) => onUpdateDate('endDate', date)}
            />
            {editedTask.endDate && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => onUpdateDate('endDate', null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  }

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => fieldComponents[field.fieldName])}
    </div>
  )
}

