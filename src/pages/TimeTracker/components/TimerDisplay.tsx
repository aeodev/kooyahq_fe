import { useTimerDuration } from '@/hooks/time-entry.hooks'
import type { TimeEntry } from '@/types/time-entry'

type TimerDisplayProps = {
  activeTimer: TimeEntry | null
  className?: string
}

export function TimerDisplay({ activeTimer, className = '' }: TimerDisplayProps) {
  const duration = useTimerDuration(activeTimer)
  return <span className={className}>{duration}</span>
}
