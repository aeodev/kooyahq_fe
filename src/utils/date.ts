export function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return new Date(dateStr).toLocaleDateString()
}

const readableDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function formatReadableDate(date: Date | string | number | null | undefined): string {
  if (!date) return ''
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  return readableDateFormatter.format(value)
}

/**
 * Get date range for a specified number of days from today
 * @param days - Number of days to go back from today
 * @returns Object with start and end dates in ISO format (YYYY-MM-DD)
 */
export function getDateRange(days: number): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

/**
 * Format a date for API consumption (YYYY-MM-DD)
 * @param date - Date object or ISO string
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateForAPI(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided to formatDateForAPI')
  }
  return dateObj.toISOString().split('T')[0]
}

/**
 * Parse an API date string into a Date object
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object
 */
export function parseAPIDate(dateString: string): Date {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }
  return date
}

/**
 * Validate that a date range is valid (start <= end)
 * @param start - Start date string (YYYY-MM-DD)
 * @param end - End date string (YYYY-MM-DD)
 * @returns True if valid, false otherwise
 */
export function isValidDateRange(start: string, end: string): boolean {
  try {
    const startDate = parseAPIDate(start)
    const endDate = parseAPIDate(end)
    return startDate <= endDate
  } catch {
    return false
  }
}

