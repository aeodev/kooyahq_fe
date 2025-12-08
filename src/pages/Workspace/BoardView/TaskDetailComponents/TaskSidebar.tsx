import { ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'
import type { Task, Column, Assignee, Priority } from '../types'
import { getPriorityIcon, getPriorityLabel } from '../index'
import { DetailsSettingsDropdown } from '../DetailsSettings/DetailsSettingsDropdown'
import { TaskDetailFields } from './TaskDetailFields'
import { GitHubBranches } from './GitHubBranches'

const PRIORITY_OPTIONS: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest']

type TaskSidebarProps = {
  editedTask: Task
  columns: Column[]
  currentColumn: Column | undefined
  users: Array<{ id: string; name: string; profilePic?: string }>
  detailsSettings: {
    fieldConfigs: Array<{ fieldName: string; isVisible: boolean; order: number }>
  } | null
  setDetailsSettings: (settings: {
    fieldConfigs: Array<{ fieldName: string; isVisible: boolean; order: number }>
  } | null) => void
  boardId?: string
  newTag: string
  setNewTag: (tag: string) => void
  datePickerOpen: 'dueDate' | 'startDate' | 'endDate' | null
  setDatePickerOpen: (date: 'dueDate' | 'startDate' | 'endDate' | null) => void
  githubBranches: Array<{ name: string; status: 'merged' | 'open' | 'closed'; pullRequestUrl?: string }>
  newBranchName: string
  setNewBranchName: (name: string) => void
  availableTicketsForParent: Array<{ id: string; ticketKey: string; title: string; ticketType: string }>
  ticketDetailsParentKey?: string
  onStatusChange: (columnId: string) => void
  onUpdatePriority: (priority: Priority) => void
  onUpdateField: <K extends keyof Task>(field: K, value: Task[K]) => void
  onUpdateDate: (field: 'dueDate' | 'startDate' | 'endDate', date: Date | null) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onUpdateParent: (parentId: string | null) => void
  onAddBranch: () => void
  onUpdateBranchStatus: (branchName: string, status: 'merged' | 'open' | 'closed') => void
  onUpdatePullRequestUrl?: (branchName: string, pullRequestUrl: string) => void
  getAvailableParents: () => Array<{ id: string; ticketKey: string; title: string; ticketType: string }>
}

export function TaskSidebar({
  editedTask,
  columns,
  currentColumn,
  users,
  detailsSettings,
  setDetailsSettings,
  boardId,
  newTag,
  setNewTag,
  datePickerOpen,
  setDatePickerOpen,
  githubBranches,
  newBranchName,
  setNewBranchName,
  availableTicketsForParent,
  ticketDetailsParentKey,
  onStatusChange,
  onUpdatePriority,
  onUpdateField,
  onUpdateDate,
  onAddTag,
  onRemoveTag,
  onUpdateParent,
  onAddBranch,
  onUpdateBranchStatus,
  onUpdatePullRequestUrl,
  getAvailableParents,
}: TaskSidebarProps) {
  return (
    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/50 bg-muted/20 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                style={{
                  backgroundColor: currentColumn?.color.replace('bg-', '').includes('slate')
                    ? 'hsl(var(--muted))'
                    : undefined,
                }}
              >
                {currentColumn?.name || 'To Do'}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {columns.map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => onStatusChange(col.id)}
                  className="cursor-pointer"
                >
                  <div className={cn('w-3 h-3 rounded-sm mr-2', col.color)} />
                  {col.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DetailsSettingsDropdown
            detailsSettings={detailsSettings}
            setDetailsSettings={setDetailsSettings}
            boardId={boardId}
          />
        </div>

        <Button variant="outline" className="w-full justify-start gap-2">
          <Sparkles className="h-4 w-4" />
          Improve Task
        </Button>

        {/* Details fields */}
        <TaskDetailFields
          editedTask={editedTask}
          users={users}
          detailsSettings={detailsSettings}
          newTag={newTag}
          setNewTag={setNewTag}
          datePickerOpen={datePickerOpen}
          setDatePickerOpen={setDatePickerOpen}
          availableTicketsForParent={availableTicketsForParent}
          ticketDetailsParentKey={ticketDetailsParentKey}
          onUpdatePriority={onUpdatePriority}
          onUpdateField={onUpdateField}
          onUpdateDate={onUpdateDate}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onUpdateParent={onUpdateParent}
          getAvailableParents={getAvailableParents}
        />

        {/* GitHub Branches - Separate section like Jira */}
        <GitHubBranches
          branches={githubBranches}
          newBranchName={newBranchName}
          setNewBranchName={setNewBranchName}
          onAddBranch={onAddBranch}
          onUpdateBranchStatus={onUpdateBranchStatus}
          onUpdatePullRequestUrl={onUpdatePullRequestUrl}
        />
      </div>
    </div>
  )
}

