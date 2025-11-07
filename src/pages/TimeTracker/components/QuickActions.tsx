import { Button } from '@/components/ui/button'

type QuickActionsProps = {
  isTimerRunning: boolean
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onAdd: () => void
  onEndDay: () => void
}

export function QuickActions({ isTimerRunning, isPaused, onPause, onResume, onAdd, onEndDay }: QuickActionsProps) {
  return (
    <div className="flex gap-2">
      {isTimerRunning && !isPaused && (
        <Button
          variant="outline"
          onClick={onPause}
          className="flex-1"
        >
          Pause (Lunch)
        </Button>
      )}
      {isTimerRunning && isPaused && (
        <Button
          variant="outline"
          onClick={onResume}
          className="flex-1"
        >
          Resume
        </Button>
      )}
      <Button
        variant="outline"
        onClick={onAdd}
        className="flex-1"
      >
        Add
      </Button>
      <Button
        variant="outline"
        onClick={onEndDay}
        className="flex-1"
      >
        End Day
      </Button>
    </div>
  )
}

