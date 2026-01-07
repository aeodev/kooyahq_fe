import { X, Eye, Share2, Maximize2, ArrowLeft, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'
import type { Task, Assignee } from '../types'
import { MOCK_ASSIGNEES, getTaskTypeIcon } from '../index'
import type { TicketDetailResponse, Ticket } from './types'
import { AssigneeAvatar } from '../AssigneeAvatar'

type TaskDetailHeaderProps = {
  editedTask: Task
  epicTicket: Ticket | null
  ticketDetails: TicketDetailResponse | null
  viewers: (Assignee & { viewedAgainAt?: string })[]
  linkCopied: boolean
  fullPage: boolean
  availableEpics: Ticket[]
  loadingEpics: boolean
  updatingEpic: boolean
  boardKey?: string
  isEpic?: boolean // Whether the current ticket is an epic
  onNavigateToTask?: (taskKey: string) => void
  onClose: () => void
  onBackToBoard?: () => void
  onShare: () => void
  onFullscreen: () => void
  onLoadEpics: () => void
  onSelectEpic: (epicId: string) => void
}

export function TaskDetailHeader({
  editedTask,
  epicTicket,
  ticketDetails,
  viewers,
  linkCopied,
  fullPage,
  availableEpics,
  loadingEpics,
  updatingEpic,
  boardKey,
  isEpic = false,
  onNavigateToTask,
  onClose,
  onBackToBoard,
  onShare,
  onFullscreen,
  onLoadEpics,
  onSelectEpic,
}: TaskDetailHeaderProps) {
  const handleBackToBoard = onBackToBoard || onClose
  
  // Check if ticket has rootEpicId (even if epicTicket hasn't loaded yet)
  const hasRootEpicId = ticketDetails?.ticket.rootEpicId

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 bg-muted/30">
      <div className="flex items-center gap-3 text-sm">
        {/* Back to board button */}
        {fullPage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToBoard}
            className="gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to board
          </Button>
        )}
        
        {/* Board key */}
        {boardKey && (
          <>
            <span className="font-medium text-foreground">{boardKey}</span>
            <span className="text-muted-foreground">/</span>
          </>
        )}

        {/* Epic - show epic if exists (clickable), show "Add epic" if doesn't exist */}
        {epicTicket && !isEpic ? (
          <>
            <button
              onClick={() => {
                if (onNavigateToTask && epicTicket.ticketKey) {
                  onNavigateToTask(epicTicket.ticketKey)
                }
              }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title={`Go to ${epicTicket.ticketKey}`}
            >
              {getTaskTypeIcon('epic')}
              <span className="font-medium">{epicTicket.ticketKey}</span>
            </button>
            <span className="text-muted-foreground">/</span>
          </>
        ) : hasRootEpicId && !isEpic ? (
          // Ticket has rootEpicId but epicTicket hasn't loaded yet - show loading state
          <>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {getTaskTypeIcon('epic')}
              <span className="font-medium">Loading epic...</span>
            </div>
            <span className="text-muted-foreground">/</span>
          </>
        ) : !isEpic ? (
          // No epic - show "Add epic" button
          <>
            <DropdownMenu onOpenChange={(open) => { if (open) onLoadEpics() }}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Link2 className="h-4 w-4" />
                  <span>Add epic</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto" align="start">
                {loadingEpics ? (
                  <div className="px-2 py-4 text-center">
                    <p className="text-xs text-muted-foreground">Loading epics...</p>
                  </div>
                ) : availableEpics.length > 0 ? (
                  <div className="space-y-1">
                    {availableEpics.map((epic) => (
                      <DropdownMenuItem
                        key={epic.id}
                        onClick={() => onSelectEpic(epic.id)}
                        disabled={updatingEpic}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getTaskTypeIcon('epic')}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{epic.ticketKey}</div>
                            <p className="text-xs text-muted-foreground truncate">{epic.title}</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-4 text-center">
                    <p className="text-xs text-muted-foreground">No epics available</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-muted-foreground">/</span>
          </>
        ) : null}
        
        {/* Ticket */}
        <div className="flex items-center gap-1.5">
          {getTaskTypeIcon(editedTask.type)}
          <span className="font-medium text-foreground">{editedTask.key}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Viewed by */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
              <Eye className="h-4 w-4" />
              <span className="text-xs">{viewers.length || 1}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Viewed by
            </div>
            {viewers.length > 0 ? (
              viewers.map((viewer) => (
                <DropdownMenuItem key={viewer.id} className="cursor-default">
                  <div className="flex items-center gap-2 w-full">
                    <AssigneeAvatar assignee={viewer} size="sm" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm">{viewer.name}</span>
                      {viewer.viewedAgainAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(viewer.viewedAgainAt).toLocaleDateString()} {new Date(viewer.viewedAgainAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem className="cursor-default">
                <div className="flex items-center gap-2 w-full">
                  <AssigneeAvatar assignee={MOCK_ASSIGNEES[0]} size="sm" />
                  <span className="text-sm">{MOCK_ASSIGNEES[0]?.name || 'You'}</span>
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Share button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onShare}
          title={linkCopied ? 'Link copied!' : 'Share ticket'}
        >
          <Share2 className={cn('h-4 w-4', linkCopied && 'text-green-500')} />
        </Button>

        {/* Fullscreen button - only show in modal mode */}
        {!fullPage && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onFullscreen}
            title="Open in full page"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}

        {/* Close button - only show in modal mode */}
        {!fullPage && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
