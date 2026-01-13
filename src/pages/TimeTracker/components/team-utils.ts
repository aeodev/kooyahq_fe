import type { TimeEntry, TaskItem } from '@/types/time-entry'
import type { User } from '@/types/user'
import { formatDuration, formatTimeRange, calculateActiveDuration, normalizeTaskText } from './utils'

export type TeamMember = {
  id: string
  name: string
  email: string
  position?: string
  profilePic?: string
  status: 'active' | 'inactive'
  todayHours: string
  activeTimer?: {
    duration: string
    projects: string[]
    task: string
    isPaused?: boolean
  }
  entries: Array<{
    id: string
    project: string
    tasks: TaskItem[]
    duration: string
    time: string
  }>
}

export type UserData = {
  id: string
  position?: string
  profilePic?: string
}

export function transformEntriesToTeamMembers(
  entries: TimeEntry[],
  users: User[],
  currentUserId: string | undefined,
  timerDuration: string,
  now: Date
): TeamMember[] {
  // Group entries by user
  const entriesMap = new Map<string, TimeEntry[]>()
  entries.forEach((entry) => {
    const existing = entriesMap.get(entry.userId) || []
    existing.push(entry)
    entriesMap.set(entry.userId, existing)
  })

  // Create team members for ALL users (not just those with entries)
  return users.map((user) => {
    const userEntries = entriesMap.get(user.id) || []
    const activeEntry = userEntries.find(e => e.isActive)
    
    const totalMinutes = userEntries.reduce((sum, e) => {
      if (e.isActive && e.startTime) {
        const start = new Date(e.startTime)
        let elapsedMs = now.getTime() - start.getTime()
        elapsedMs -= e.pausedDuration || 0
        if (e.isPaused && e.lastPausedAt) {
          elapsedMs -= now.getTime() - new Date(e.lastPausedAt).getTime()
        }
        return sum + Math.max(0, Math.floor(elapsedMs / 60000))
      }
      return sum + e.duration
    }, 0)

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      position: user.position,
      profilePic: user.profilePic,
      status: activeEntry ? ('active' as const) : ('inactive' as const),
      todayHours: formatDuration(totalMinutes),
      activeTimer: activeEntry ? {
        duration: user.id === currentUserId ? timerDuration : calculateActiveDuration(activeEntry, now),
        projects: activeEntry.projects,
        task: activeEntry.tasks[activeEntry.tasks.length - 1]?.text
          ? normalizeTaskText(activeEntry.tasks[activeEntry.tasks.length - 1].text)
          : '',
        isPaused: activeEntry.isPaused || false,
      } : undefined,
      entries: userEntries.map((e) => ({
        id: e.id,
        project: e.projects.join(', '),
        tasks: e.tasks || [],
        duration: formatDuration(e.duration),
        time: formatTimeRange(e.startTime, e.endTime, e.isPaused, e.lastPausedAt),
      })),
    }
  }).sort((a, b) => {
    // Sort: active first, then by hours worked
    if (a.status === 'active' && b.status !== 'active') return -1
    if (a.status !== 'active' && b.status === 'active') return 1
    return 0
  })
}
