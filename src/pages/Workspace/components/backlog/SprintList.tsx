import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DroppableList } from '@/components/dnd'
import { BacklogItem } from './BacklogItem'
import { StoryPointsSummary } from './StoryPointsSummary'
import type { Sprint, Card as CardType } from '@/types/board'
import type { User } from '@/types/user'
import { MoreHorizontal, ChevronDown, ChevronRight, Calendar, Target } from 'lucide-react'

type SprintListProps = {
    sprint: Sprint
    cards: CardType[]
    users: User[]
    selectedCardIds: Set<string>
    onSelectCard: (cardId: string, selected: boolean) => void
    onCardClick: (card: CardType) => void
    onFlagToggle: (cardId: string, flagged: boolean) => void
    onMoveCard: (cardId: string, targetSprintId: string | null, targetIndex?: number) => void
    onEditSprint: (sprintId: string) => void
    onDeleteSprint: (sprintId: string) => void
    onStartSprint: (sprintId: string) => void
    onCompleteSprint: (sprintId: string) => void
}

export function SprintList({
    sprint,
    cards,
    users,
    selectedCardIds,
    onSelectCard,
    onCardClick,
    onFlagToggle,
    onMoveCard,
    onEditSprint,
    onDeleteSprint,
    onStartSprint,
    onCompleteSprint,
}: SprintListProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    const handleDrop = (cardId: string, targetIndex: number) => {
        onMoveCard(cardId, sprint.id, targetIndex)
    }

    return (
        <div className="space-y-2 bg-muted/10 rounded-lg border p-2">
            {/* Sprint Header */}
            <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>

                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{sprint.name}</h3>
                            <Badge variant={sprint.state === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                {sprint.state.toUpperCase()}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {sprint.startDate && sprint.endDate && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(sprint.startDate), 'MMM d')} - {format(new Date(sprint.endDate), 'MMM d')}
                                </span>
                            )}
                            {sprint.goal && (
                                <span className="flex items-center gap-1 truncate max-w-[200px]" title={sprint.goal}>
                                    <Target className="h-3 w-3" />
                                    {sprint.goal}
                                </span>
                            )}
                            <span>({cards.length} issues)</span>
                            <StoryPointsSummary cards={cards} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {sprint.state === 'future' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStartSprint(sprint.id)}>
                            Start Sprint
                        </Button>
                    )}
                    {sprint.state === 'active' && (
                        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onCompleteSprint(sprint.id)}>
                            Complete Sprint
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditSprint(sprint.id)}>
                                Edit Sprint
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDeleteSprint(sprint.id)}
                            >
                                Delete Sprint
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Sprint Content */}
            {isExpanded && (
                <div className="pl-4 pr-2 pb-2">
                    <DroppableList
                        id={`sprint-${sprint.id}`}
                        onDrop={handleDrop}
                        className="min-h-[50px] bg-background/50 rounded-md border border-dashed border-border/50"
                    >
                        {cards.length > 0 ? (
                            cards.map((card) => (
                                <BacklogItem
                                    key={card.id}
                                    card={card}
                                    users={users}
                                    isSelected={selectedCardIds.has(card.id)}
                                    onSelect={onSelectCard}
                                    onClick={() => onCardClick(card)}
                                    onFlagToggle={onFlagToggle}
                                    columns={[]} // Not needed for sprint list items usually, or pass board columns
                                    onMoveToColumn={() => { }} // Sprints don't have columns in backlog view
                                />
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-[50px] text-xs text-muted-foreground">
                                Drag issues here to plan sprint
                            </div>
                        )}
                    </DroppableList>
                </div>
            )}
        </div>
    )
}
