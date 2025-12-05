import type { TimeEntry } from '@/types/time-entry'

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime) return ''
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return `${formatTime(start)} - ${formatTime(end)}`
}

export function calculateActiveDuration(entry: TimeEntry, now: Date): string {
  if (!entry.isActive || !entry.startTime) {
    return '00:00'
  }

  const start = new Date(entry.startTime)

  // Calculate total elapsed time
  let elapsedMs = now.getTime() - start.getTime()

  // Subtract paused duration (accumulated paused time)
  const pausedMs = entry.pausedDuration || 0
  elapsedMs -= pausedMs

  // If currently paused, subtract current pause time
  if (entry.isPaused && entry.lastPausedAt) {
    const currentPauseMs = now.getTime() - new Date(entry.lastPausedAt).getTime()
    elapsedMs -= currentPauseMs
  }

  // Calculate seconds
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  // Format duration
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`
  }
  if (h > 0) {
    return `${h}h`
  }
  return `${m}m`
}
