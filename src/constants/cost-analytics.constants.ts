// Chart display limits
export const MAX_PIE_CHART_ITEMS = 6
export const MAX_BAR_CHART_ITEMS = 8
export const MAX_COMPARE_PROJECTS = 4

// Polling intervals
export const LIVE_DATA_POLL_INTERVAL = 10000 // 10 seconds

// Debounce delays
export const DATE_DEBOUNCE_MS = 500

// Chart color palette
export const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(160, 60%, 45%)',
  'hsl(200, 60%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(30, 80%, 55%)',
  'hsl(350, 60%, 50%)',
] as const

// Date range presets (in days)
export const DATE_RANGE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
] as const
