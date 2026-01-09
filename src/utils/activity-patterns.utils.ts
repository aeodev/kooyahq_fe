import type { TimeEntry } from '@/types/time-entry'

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export type WeeklyPattern = {
  day: DayOfWeek
  activity: number // Total hours for that day
  count: number // Number of entries
}

export type HourlyPattern = {
  hour: number
  totalHours: number
  count: number
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Calculate weekly activity pattern from time entries
 */
export function calculateWeeklyPattern(timeEntries: TimeEntry[]): WeeklyPattern[] {
  const dayMap = new Map<DayOfWeek, { hours: number; count: number }>()

  // Initialize all days
  DAYS_OF_WEEK.forEach((day) => {
    dayMap.set(day, { hours: 0, count: 0 })
  })

  timeEntries.forEach((entry) => {
    if (!entry.startTime) return

    const date = new Date(entry.startTime)
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayName = DAYS_OF_WEEK[dayOfWeek === 0 ? 6 : dayOfWeek - 1] // Convert to Mon-Sun

    const hours = entry.duration / 60 // Convert minutes to hours
    const current = dayMap.get(dayName) || { hours: 0, count: 0 }
    dayMap.set(dayName, {
      hours: current.hours + hours,
      count: current.count + 1,
    })
  })

  return DAYS_OF_WEEK.map((day) => {
    const data = dayMap.get(day) || { hours: 0, count: 0 }
    return {
      day,
      activity: data.hours,
      count: data.count,
    }
  })
}

/**
 * Calculate hourly activity pattern from time entries
 */
export function calculateHourlyPattern(timeEntries: TimeEntry[]): HourlyPattern[] {
  const hourMap = new Map<number, { hours: number; count: number }>()

  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourMap.set(i, { hours: 0, count: 0 })
  }

  timeEntries.forEach((entry) => {
    if (!entry.startTime) return

    const date = new Date(entry.startTime)
    const hour = date.getHours()
    const hours = entry.duration / 60 // Convert minutes to hours

    const current = hourMap.get(hour) || { hours: 0, count: 0 }
    hourMap.set(hour, {
      hours: current.hours + hours,
      count: current.count + 1,
    })
  })

  return Array.from({ length: 24 }, (_, i) => {
    const data = hourMap.get(i) || { hours: 0, count: 0 }
    return {
      hour: i,
      totalHours: data.hours,
      count: data.count,
    }
  })
}

/**
 * Get percentage for visualization (0-100)
 */
export function getActivityPercentage(value: number, max: number): number {
  if (max === 0) return 0
  return Math.min((value / max) * 100, 100)
}
