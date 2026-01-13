export type TaskItem = {
  text: string
  addedAt: string
  duration: number
}

export type TimeEntry = {
  id: string
  userId: string
  userName: string
  userEmail: string
  projects: string[]
  tasks: TaskItem[]
  duration: number // in minutes
  startTime: string | null
  endTime: string | null
  isActive: boolean
  isPaused: boolean
  pausedDuration: number
  lastPausedAt: string | null
  isOvertime: boolean
  canEdit: boolean
  createdAt: string
  updatedAt: string
}

export type StartTimerInput = {
  projects: string[]
  task: string
  isOvertime?: boolean
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
  isOvertime?: boolean
}

export type AddTaskInput = {
  task: string
}

export type WorkspaceSummaryTicket = {
  ticketKey: string
  title: string
  project: string
  status: string
  priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
}
