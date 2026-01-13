import type { TimeEntry } from '@/types/time-entry'

const WORKSPACE_TICKET_PREFIX = '[Workspace Ticket] '
const WORKSPACE_TICKET_PREFIX_TRIMMED = WORKSPACE_TICKET_PREFIX.trim()
const PLACEHOLDER_TASKS = new Set(['started working'])

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export function formatTimeRange(
  startTime: string | null, 
  endTime: string | null,
  isPaused?: boolean,
  lastPausedAt?: string | null
): string {
  if (!startTime) return ''
  const start = new Date(startTime)
  
  // For paused timers, use lastPausedAt as end time instead of current time
  let end: Date
  if (isPaused && lastPausedAt) {
    end = new Date(lastPausedAt)
  } else if (endTime) {
    end = new Date(endTime)
  } else {
    end = new Date() // Active timer uses current time
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return `${formatTime(start)} - ${formatTime(end)}`
}


export function calculateEntryDurationMinutes(entry: TimeEntry, now?: Date): number {
  if (!entry.isActive || !entry.startTime) {
    return entry.duration
  }

  const start = new Date(entry.startTime)
  const currentTime = now || new Date()

  let elapsedMs = currentTime.getTime() - start.getTime()

  elapsedMs -= entry.pausedDuration || 0

  if (entry.isPaused && entry.lastPausedAt) {
    const currentPauseMs = currentTime.getTime() - new Date(entry.lastPausedAt).getTime()
    elapsedMs -= currentPauseMs
  }

  return Math.max(0, Math.floor(elapsedMs / 60000))
}

export function calculateActiveDuration(entry: TimeEntry, now: Date): string {
  if (!entry.isActive || !entry.startTime) {
    return '00:00'
  }

  const durationMinutes = calculateEntryDurationMinutes(entry, now)

  // Calculate seconds for display
  const totalSeconds = durationMinutes * 60
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  // Format duration
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function normalizeTaskText(text: string): string {
  if (text.startsWith(WORKSPACE_TICKET_PREFIX)) {
    return text.slice(WORKSPACE_TICKET_PREFIX.length)
  }
  if (text.startsWith(WORKSPACE_TICKET_PREFIX_TRIMMED)) {
    return text.slice(WORKSPACE_TICKET_PREFIX_TRIMMED.length).trimStart()
  }
  return text
}

export function isWorkspaceTicketTask(text: string): boolean {
  const normalized = text.trim()
  return normalized.startsWith(WORKSPACE_TICKET_PREFIX) || normalized.startsWith(WORKSPACE_TICKET_PREFIX_TRIMMED)
}

export function isActualTaskText(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) return false
  if (isWorkspaceTicketTask(normalized)) return false
  return !PLACEHOLDER_TASKS.has(normalized.toLowerCase())
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
