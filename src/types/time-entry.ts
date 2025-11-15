export type TimeEntry = {
  id: string
  userId: string
  userName: string
  userEmail: string
  projects: string[]
  task: string
  duration: number // in minutes
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
}

export type UpdateTimeEntryInput = {
  projects?: string[]
  task?: string
  duration?: number
}

export type ManualEntryInput = {
  projects: string[]
  task: string
  duration: number // in minutes
  startTime?: string
  endTime?: string
}

