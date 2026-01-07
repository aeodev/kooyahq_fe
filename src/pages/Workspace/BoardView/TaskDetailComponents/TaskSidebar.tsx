import { ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Task, Column } from '../types'
import { TaskDetailFields } from './TaskDetailFields'
import { GitHubBranches } from './GitHubBranches'
import type { TicketDetailResponse, GithubStatus } from './types'

type TaskSidebarProps = {
  editedTask: Task
  ticketDetails: TicketDetailResponse | null
  columns: Column[]
  currentColumn: Column | undefined
  users: Array<{ id: string; name: string; profilePic?: string }>
  detailsSettings: {
    fieldConfigs: Array<{ fieldName: string; isVisible: boolean; order: number }>
  } | null
  newTag: string
  setNewTag: (tag: string) => void
  datePickerOpen: 'dueDate' | 'startDate' | 'endDate' | null
  setDatePickerOpen: (date: 'dueDate' | 'startDate' | 'endDate' | null) => void
  githubBranches: Array<{ name: string; status: GithubStatus; pullRequestUrl?: string }>
  newBranchName: string
  setNewBranchName: (name: string) => void
  availableTicketsForParent: Array<{ id: string; ticketKey: string; title: string; ticketType: string }>
  availableTags: string[]
  onFilterByTag?: (tag: string) => void
  onStatusChange: (columnId: string) => void
  onUpdatePriority: (priority: Task['priority']) => void
  onUpdateField: <K extends keyof Task>(field: K, value: Task[K]) => void
  onUpdateDate: (field: 'dueDate' | 'startDate' | 'endDate', date: Date | null) => void
  onAddTag: (tag?: string) => void
  onRemoveTag: (tag: string) => void
  onUpdateParent: (parentId: string | null) => void
  getAvailableParents: () => Array<{ id: string; ticketKey: string; title: string; ticketType: string }>
  onNavigateToTask?: (taskKey: string) => void
  onAddBranch: () => void
  onUpdateBranchStatus: (branchName: string, status: GithubStatus) => void
  onUpdatePullRequestUrl?: (branchName: string, pullRequestUrl: string) => void
}

export function TaskSidebar({
  editedTask,
  ticketDetails,
  columns,
  currentColumn,
  users,
  detailsSettings,
  newTag,
  setNewTag,
  datePickerOpen,
  setDatePickerOpen,
  githubBranches,
  newBranchName,
  setNewBranchName,
  availableTicketsForParent,
  availableTags,
  onFilterByTag,
  onStatusChange,
  onUpdatePriority,
  onUpdateField,
  onUpdateDate,
  onAddTag,
  onRemoveTag,
  onUpdateParent,
  getAvailableParents,
  onNavigateToTask,
  onAddBranch,
  onUpdateBranchStatus,
  onUpdatePullRequestUrl,
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
              >
                {currentColumn && (() => {
                  // Extract hex color from Tailwind class or use as-is
                  const getHexColor = (colorClass: string): string | undefined => {
                    if (colorClass.startsWith('#')) {
                      return colorClass
                    }
                    if (colorClass.startsWith('bg-[')) {
                      const match = colorClass.match(/bg-\[([^\]]+)\]/)
                      return match?.[1] || undefined
                    }
                    // Map common Tailwind colors to hex
                    const tailwindColorMap: Record<string, string> = {
                      'bg-blue-500': '#3b82f6',
                      'bg-green-500': '#22c55e',
                      'bg-red-500': '#ef4444',
                      'bg-yellow-500': '#eab308',
                      'bg-purple-500': '#a855f7',
                      'bg-pink-500': '#ec4899',
                      'bg-indigo-500': '#6366f1',
                      'bg-cyan-500': '#06b6d4',
                      'bg-teal-500': '#14b8a6',
                      'bg-orange-500': '#f97316',
                      'bg-amber-500': '#f59e0b',
                      'bg-slate-400': '#94a3b8',
                      'bg-slate-500': '#64748b',
                    }
                    return tailwindColorMap[colorClass] || undefined
                  }
                  
                  const hexColor = getHexColor(currentColumn.color)
                  
                  return (
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={hexColor ? { backgroundColor: hexColor } : undefined}
                    />
                  )
                })()}
                {currentColumn?.name || 'To Do'}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {columns.map((col) => {
                // Extract hex color from Tailwind class or use as-is
                const getHexColor = (colorClass: string): string | undefined => {
                  if (colorClass.startsWith('#')) {
                    return colorClass
                  }
                  if (colorClass.startsWith('bg-[')) {
                    const match = colorClass.match(/bg-\[([^\]]+)\]/)
                    return match?.[1] || undefined
                  }
                  // Map common Tailwind colors to hex
                  const tailwindColorMap: Record<string, string> = {
                    'bg-blue-500': '#3b82f6',
                    'bg-green-500': '#22c55e',
                    'bg-red-500': '#ef4444',
                    'bg-yellow-500': '#eab308',
                    'bg-purple-500': '#a855f7',
                    'bg-pink-500': '#ec4899',
                    'bg-indigo-500': '#6366f1',
                    'bg-cyan-500': '#06b6d4',
                    'bg-teal-500': '#14b8a6',
                    'bg-orange-500': '#f97316',
                    'bg-amber-500': '#f59e0b',
                    'bg-slate-400': '#94a3b8',
                    'bg-slate-500': '#64748b',
                  }
                  return tailwindColorMap[colorClass] || undefined
                }
                
                const hexColor = getHexColor(col.color)
                
                return (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={() => onStatusChange(col.id)}
                    className="cursor-pointer"
                  >
                    <div 
                      className="w-3 h-3 rounded-sm mr-2 flex-shrink-0"
                      style={hexColor ? { backgroundColor: hexColor } : undefined}
                    />
                    {col.name}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button variant="outline" className="w-full justify-start gap-2">
          <Sparkles className="h-4 w-4" />
          Improve Task
        </Button>

        {/* Details fields */}
        <TaskDetailFields
          editedTask={editedTask}
          ticketDetails={ticketDetails}
          users={users}
          detailsSettings={detailsSettings}
          newTag={newTag}
          setNewTag={setNewTag}
          datePickerOpen={datePickerOpen}
          setDatePickerOpen={setDatePickerOpen}
          availableTicketsForParent={availableTicketsForParent}
          availableTags={availableTags}
          onFilterByTag={onFilterByTag}
          onUpdatePriority={onUpdatePriority}
          onUpdateField={onUpdateField}
          onUpdateDate={onUpdateDate}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onUpdateParent={onUpdateParent}
          getAvailableParents={getAvailableParents}
          onNavigateToTask={onNavigateToTask}
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
