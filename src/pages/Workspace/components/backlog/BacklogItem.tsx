import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DraggableCard } from '@/components/dnd'
import { UserAvatar } from '@/components/ui/user-selector'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'
import type { Card as CardType } from '@/types/board'
import { GripVertical, Flag, ArrowRight } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  highest: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  lowest: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
}

const ISSUE_TYPE_COLORS: Record<string, string> = {
  epic: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  story: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  task: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  bug: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

function stripHtml(html: string): string {
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

type BacklogItemProps = {
  card: CardType
  epic?: CardType
  users: Array<{ id: string; name?: string; email?: string; profilePic?: string }>
  isSelected?: boolean
  onSelect?: (cardId: string, selected: boolean) => void
  onClick?: () => void
  onFlagToggle?: (cardId: string, flagged: boolean) => void
  columns?: string[]
  onMoveToColumn?: (cardId: string, columnId: string) => void
}

export function BacklogItem({
  card,
  epic,
  users,
  isSelected = false,
  onSelect,
  onClick,
  onFlagToggle,
  columns = [],
  onMoveToColumn,
}: BacklogItemProps) {
  const assignee = users.find((u) => u.id === card.assigneeId)

  // Filter out "Backlog" column and current column
  const availableColumns = columns.filter((col) => col !== 'Backlog' && col !== card.columnId)

  const handleFlagClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFlagToggle?.(card.id, !card.flagged)
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.(card.id, !isSelected)
  }

  const handleMoveClick = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation()
    onMoveToColumn?.(card.id, columnId)
  }

  return (
    <DraggableCard id={card.id} onDragEnd={() => {}}>
      <Card
        className={cn(
          'p-3 hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm border-border/50 cursor-pointer rounded-xl group',
          card.completed && 'opacity-60',
          isSelected && 'ring-2 ring-primary'
        )}
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <div className="flex items-center gap-1 flex-shrink-0 pt-1">
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
              {onSelect && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  onClick={handleCheckboxClick}
                  className="mt-0.5"
                />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              {/* Title, flag, and move button */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    card.completed ? 'text-muted-foreground line-through' : ''
                  )}>
                    {card.title}
                  </p>
                  {card.description && (
                    <p className={cn(
                      'text-xs text-muted-foreground line-clamp-2 mt-1',
                      card.completed && 'opacity-70'
                    )}>
                      {stripHtml(card.description)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onFlagToggle && (
                    <button
                      onClick={handleFlagClick}
                      className={cn(
                        'flex-shrink-0 p-1 rounded hover:bg-muted transition-colors',
                        card.flagged && 'text-yellow-500'
                      )}
                      title={card.flagged ? 'Unflag' : 'Flag'}
                    >
                      <Flag className={cn('h-4 w-4', card.flagged ? 'fill-current' : '')} />
                    </button>
                  )}
                  {onMoveToColumn && availableColumns.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                        title="Move to Sprint"
                      >
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {availableColumns.map((column) => (
                          <DropdownMenuItem
                            key={column}
                            onClick={(e) => handleMoveClick(e, column)}
                            className="cursor-pointer"
                          >
                            Move to {column}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Epic indicator */}
              {epic && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                    {epic.title}
                  </Badge>
                </div>
              )}

              {/* Badges and metadata */}
              <div className="flex flex-wrap gap-1 items-center">
                <Badge variant="outline" className={`text-[10px] ${ISSUE_TYPE_COLORS[card.issueType]}`}>
                  {card.issueType}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[card.priority]}`}>
                  {card.priority}
                </Badge>
                {card.labels.slice(0, 2).map((label) => (
                  <Badge key={label} variant="outline" className="text-[10px] px-1.5 py-0.5 bg-muted/50 border-border/60">
                    {label}
                  </Badge>
                ))}
                {card.labels.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{card.labels.length - 2}</span>
                )}
                {card.storyPoints && (
                  <Badge variant="outline" className="text-[10px]">
                    {card.storyPoints} pts
                  </Badge>
                )}
                {card.dueDate && new Date(card.dueDate) < new Date() && (
                  <span className="text-[10px] text-red-500">⚠</span>
                )}
                {assignee && (
                  <UserAvatar userId={card.assigneeId!} users={users as import('@/types/user').User[]} size="sm" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DraggableCard>
  )
}

