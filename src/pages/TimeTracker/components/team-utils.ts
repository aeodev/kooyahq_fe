import type { TimeEntry } from '@/types/time-entry'
import { formatDuration, formatTimeRange, calculateActiveDuration } from './utils'

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
  }
  entries: Array<{
    id: string
    project: string
    task: string
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
  users: UserData[],
  currentUserId: string | undefined,
  timerDuration: string,
  now: Date
): TeamMember[] {
  const membersMap = new Map<string, TimeEntry[]>()
  entries.forEach((entry) => {
    const existing = membersMap.get(entry.userId) || []
    existing.push(entry)
    membersMap.set(entry.userId, existing)
  })

  return Array.from(membersMap.entries()).map(([userId, userEntries]) => {
    const firstEntry = userEntries[0]
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

    const userData = users.find((u) => u.id === userId)

    return {
      id: userId,
      name: firstEntry.userName,
      email: firstEntry.userEmail,
      position: userData?.position,
      profilePic: userData?.profilePic,
      status: activeEntry ? ('active' as const) : ('inactive' as const),
      todayHours: formatDuration(totalMinutes),
      activeTimer: activeEntry ? {
        duration: userId === currentUserId ? timerDuration : calculateActiveDuration(activeEntry, now),
        projects: activeEntry.projects,
        task: activeEntry.tasks[activeEntry.tasks.length - 1]?.text || '',
      } : undefined,
      entries: userEntries.slice(0, 3).map((e) => ({
        id: e.id,
        project: e.projects.join(', '),
        task: e.tasks[e.tasks.length - 1]?.text || '',
        duration: formatDuration(e.duration),
        time: formatTimeRange(e.startTime, e.endTime),
      })),
    }
  })
}
