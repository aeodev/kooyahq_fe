import { useCallback } from 'react'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { useTimerDuration } from '@/hooks/time-entry.hooks'

export function useTimerControls() {
  const activeTimer = useTimeEntryStore((state) => state.activeTimer)
  const startTimer = useTimeEntryStore((state) => state.startTimer)
  const stopTimer = useTimeEntryStore((state) => state.stopTimer)
  const pauseTimer = useTimeEntryStore((state) => state.pauseTimer)
  const resumeTimer = useTimeEntryStore((state) => state.resumeTimer)
  const addTaskToTimer = useTimeEntryStore((state) => state.addTaskToTimer)
  const endDay = useTimeEntryStore((state) => state.endDay)
  const checkDayEndedStatus = useTimeEntryStore((state) => state.checkDayEndedStatus)
  const logManualEntry = useTimeEntryStore((state) => state.logManualEntry)
  const fetchMyEntries = useTimeEntryStore((state) => state.fetchEntries)

  const timerDuration = useTimerDuration(activeTimer)

  const handlePause = useCallback(async () => {
    if (activeTimer && !activeTimer.isPaused) {
      await pauseTimer()
    }
  }, [activeTimer, pauseTimer])

  const handleResume = useCallback(async () => {
    if (activeTimer && activeTimer.isPaused) {
      await resumeTimer()
    }
  }, [activeTimer, resumeTimer])

  const handleQuickAddTask = useCallback(async (task: string) => {
    if (!activeTimer || !task.trim()) return
    await addTaskToTimer(task.trim())
    await fetchMyEntries()
  }, [activeTimer, addTaskToTimer, fetchMyEntries])

  return {
    activeTimer,
    timerDuration,
    startTimer,
    stopTimer,
    pauseTimer: handlePause,
    resumeTimer: handleResume,
    addTaskToTimer: handleQuickAddTask,
    endDay,
    checkDayEndedStatus,
    logManualEntry,
    fetchMyEntries,
  }
}
