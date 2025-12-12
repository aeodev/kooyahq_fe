import { Button } from '@/components/ui/button'

type QuickActionsProps = {
  isTimerRunning: boolean
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onAdd: () => void
  onEndDay: () => void
  showEndDay?: boolean
  disabled?: boolean
  disableAdd?: boolean
  disableEndDay?: boolean
}

export function QuickActions({
  isTimerRunning,
  isPaused,
  onPause,
  onResume,
  onAdd,
  onEndDay,
  showEndDay = true,
  disabled = false,
  disableAdd = false,
  disableEndDay = false,
}: QuickActionsProps) {
  return (
    <div className="flex gap-3">
      {isTimerRunning && !isPaused && (
        <Button
          variant="outline"
          onClick={onPause}
          disabled={disabled}
          className="flex-1 h-11 text-sm font-medium border-border/60 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
        >
          Pause (Lunch)
        </Button>
      )}
      {isTimerRunning && isPaused && (
        <Button
          variant="outline"
          onClick={onResume}
          disabled={disabled}
          className="flex-1 h-11 text-sm font-medium border-border/60 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
        >
          Resume
        </Button>
      )}
      <Button
        variant="outline"
        onClick={onAdd}
        disabled={disabled || disableAdd}
        className="flex-1 h-11 text-sm font-medium border-border/60 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
      >
        Add
      </Button>
      {showEndDay && (
        <Button
          variant="outline"
          onClick={onEndDay}
          disabled={disabled || disableEndDay}
          className="flex-1 h-11 text-sm font-medium border-border/60 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
        >
          End Day
        </Button>
      )}
    </div>
  )
}
