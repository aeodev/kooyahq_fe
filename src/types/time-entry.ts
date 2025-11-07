export type TimeEntryStatus = 'Billable' | 'Internal'

export type TimeEntry = {
  id: string
  userId: string
  userName: string
  userEmail: string
  projects: string[]
  task: string
  duration: number // in minutes
  status: TimeEntryStatus
  startTime: string | null
  endTime: string | null
  isActive: boolean
  isPaused: boolean
  pausedDuration: number
  lastPausedAt: string | null
  canEdit: boolean
  createdAt: string
  updatedAt: string
}

export type StartTimerInput = {
  projects: string[]
  task: string
  status?: TimeEntryStatus
}

export type UpdateTimeEntryInput = {
  projects?: string[]
  task?: string
  duration?: number
  status?: TimeEntryStatus
}

export type ManualEntryInput = {
  projects: string[]
  task: string
  duration: number // in minutes
  status?: TimeEntryStatus
  startTime?: string
  endTime?: string
}

