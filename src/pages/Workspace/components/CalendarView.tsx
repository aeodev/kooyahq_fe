import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isPast, addMonths, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Card } from '@/types/board'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

type CalendarViewProps = {
  cards: Card[]
  onCardClick: (card: Card) => void
}

export function CalendarView({ cards, onCardClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const cardsByDate = useMemo(() => {
    const map: Record<string, Card[]> = {}
    cards.forEach((card) => {
      if (card.dueDate) {
        const dateKey = format(new Date(card.dueDate), 'yyyy-MM-dd')
        if (!map[dateKey]) map[dateKey] = []
        map[dateKey].push(card)
      }
    })
    return map
  }, [cards])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get first day of week for the month start
  const firstDayOfWeek = monthStart.getDay()
  const emptyDays = Array(firstDayOfWeek).fill(null)

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="h-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={goToNextMonth} className="h-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} className="h-8">
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month start */}
          {emptyDays.map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[100px] border-r border-b bg-muted/20" />
          ))}

          {/* Days in month */}
          {daysInMonth.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayCards = cardsByDate[dateKey] || []
            const isCurrentDay = isToday(day)
            const isPastDay = isPast(day) && !isCurrentDay
            const overdueCards = dayCards.filter((card) => isPastDay && !card.completed)

            return (
              <div
                key={dateKey}
                className={cn(
                  'min-h-[100px] border-r border-b p-2 space-y-1 overflow-y-auto',
                  isCurrentDay && 'bg-primary/10',
                  isPastDay && !isCurrentDay && 'bg-muted/30 opacity-60'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCurrentDay && 'text-primary font-bold',
                      isPastDay && !isCurrentDay && 'text-muted-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {overdueCards.length > 0 && (
                    <Badge variant="default" className="h-5 px-1.5 text-xs bg-destructive text-destructive-foreground border-destructive">
                      {overdueCards.length}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {dayCards.slice(0, 3).map((card) => (
                    <div
                      key={card.id}
                      onClick={() => onCardClick(card)}
                      className={cn(
                        'text-xs p-1.5 rounded cursor-pointer hover:bg-accent transition-colors truncate',
                        card.completed && 'line-through opacity-60',
                        isPastDay && !card.completed && 'bg-destructive/20 border border-destructive/30'
                      )}
                      title={card.title}
                    >
                      {card.title}
                    </div>
                  ))}
                  {dayCards.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1.5">
                      +{dayCards.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary/10 rounded" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-destructive/20 border border-destructive/30 rounded" />
          <span>Overdue</span>
        </div>
      </div>
    </div>
  )
}

