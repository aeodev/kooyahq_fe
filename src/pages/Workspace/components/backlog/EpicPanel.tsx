import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Card as CardType } from '@/types/board'

type EpicPanelProps = {
  epics: CardType[]
  cardsByEpic: Record<string, CardType[]>
  selectedEpicId?: string
  onEpicSelect?: (epicId: string | undefined) => void
  onEpicClick?: (epic: CardType) => void
}

export function EpicPanel({
  epics,
  cardsByEpic,
  selectedEpicId,
  onEpicSelect,
  onEpicClick,
}: EpicPanelProps) {
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set())

  const toggleEpic = (epicId: string) => {
    const newExpanded = new Set(expandedEpics)
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId)
    } else {
      newExpanded.add(epicId)
    }
    setExpandedEpics(newExpanded)
  }

  const totalStoryPoints = (cards: CardType[]) => {
    return cards.reduce((sum, card) => sum + (card.storyPoints || 0), 0)
  }

  if (epics.length === 0) {
    return (
      <div className="p-3 border rounded-lg bg-muted/30">
        <p className="text-xs text-muted-foreground">No epics yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Epics</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEpicSelect?.(undefined)}
          className={cn(
            'h-6 text-xs',
            !selectedEpicId && 'bg-primary/10'
          )}
        >
          All
        </Button>
      </div>
      <div className="space-y-1">
        {epics.map((epic) => {
          const cards = cardsByEpic[epic.id] || []
          const isExpanded = expandedEpics.has(epic.id)
          const isSelected = selectedEpicId === epic.id
          const points = totalStoryPoints(cards)

          return (
            <div
              key={epic.id}
              className={cn(
                'border rounded-lg p-2 cursor-pointer hover:bg-muted/50 transition-colors',
                isSelected && 'bg-primary/10 border-primary/50'
              )}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleEpic(epic.id)}
                  className="flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div
                  className="flex-1 min-w-0"
                  onClick={() => {
                    onEpicSelect?.(isSelected ? undefined : epic.id)
                    onEpicClick?.(epic)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                      Epic
                    </Badge>
                    <span className="text-sm font-medium truncate">{epic.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{cards.length} items</span>
                    {points > 0 && <span>• {points} pts</span>}
                  </div>
                </div>
              </div>
              {isExpanded && cards.length > 0 && (
                <div className="mt-2 ml-6 space-y-1">
                  {cards.slice(0, 5).map((card) => (
                    <div
                      key={card.id}
                      className="text-xs text-muted-foreground truncate p-1 hover:bg-muted/30 rounded"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEpicClick?.(card)
                      }}
                    >
                      {card.title}
                    </div>
                  ))}
                  {cards.length > 5 && (
                    <div className="text-xs text-muted-foreground p-1">
                      +{cards.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}



