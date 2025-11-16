import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './button'

interface CalendarProps {
  className?: string
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  markedDates?: Set<string> // Set of dates in YYYY-MM-DD format
}

export function Calendar({ className, selectedDate, onDateSelect, markedDates }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const selected = selectedDate ? new Date(selectedDate) : null
  if (selected) {
    selected.setHours(0, 0, 0, 0)
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const isToday = (day: number): boolean => {
    const date = new Date(year, month, day)
    return date.getTime() === today.getTime()
  }

  const isSelected = (day: number): boolean => {
    if (!selected) return false
    const date = new Date(year, month, day)
    return date.getTime() === selected.getTime()
  }

  const isMarked = (day: number): boolean => {
    if (!markedDates) return false
    const date = new Date(year, month, day)
    return markedDates.has(formatDateKey(date))
  }

  const handleDateClick = (day: number) => {
    if (onDateSelect) {
      const date = new Date(year, month, day)
      onDateSelect(date)
    }
  }

  const days = []
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-9" />)
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isTodayDate = isToday(day)
    const isSelectedDate = isSelected(day)
    const isMarkedDate = isMarked(day)
    
    days.push(
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        className={cn(
          'h-9 w-9 rounded-md text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          isTodayDate && 'bg-primary text-primary-foreground font-semibold',
          isSelectedDate && !isTodayDate && 'bg-accent text-accent-foreground',
          isMarkedDate && !isTodayDate && !isSelectedDate && 'bg-muted/50',
          !isTodayDate && !isSelectedDate && 'text-foreground'
        )}
      >
        {day}
      </button>
    )
  }

  return (
    <div className={cn('p-3', className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-7 w-7"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">
            {monthNames[month]} {year}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="h-7 text-xs"
          >
            Today
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          className="h-7 w-7"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="h-9 flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  )
}

