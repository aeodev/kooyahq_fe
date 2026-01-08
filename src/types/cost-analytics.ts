export type ActiveDeveloper = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  projects: string[]
  monthlySalary: number
  hourlyRate: number
  activeMinutes: number
  liveCost: number
  startTime: string
  isPaused: boolean
}

export type ProjectLiveCost = {
  project: string
  liveCost: number
  burnRate: number
  developers: number
  activeMinutes: number
}

export type LiveCostData = {
  totalBurnRate: number
  totalLiveCost: number
  activeHours: number
  activeDevelopers: ActiveDeveloper[]
  projectCosts: ProjectLiveCost[]
  timestamp: string
}

export type ProjectCostSummary = {
  project: string
  totalCost: number
  totalHours: number
  developers: Array<{
    userId: string
    userName: string
    hours: number
    cost: number
    hourlyRate: number
  }>
  avgHourlyRate: number
}

export type TopPerformer = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  totalHours: number
  totalCost: number
  hourlyRate: number
  projectCount: number
  projects: string[]
}

export type CostSummaryData = {
  totalCost: number
  totalHours: number
  projectCosts: ProjectCostSummary[]
  topPerformers: TopPerformer[]
  dailyCosts: Array<{
    date: string
    cost: number
    hours: number
  }>
  monthlyCosts: Array<{
    month: string
    cost: number
    hours: number
  }>
}

export type CurrencyConfig = {
  symbol: string
  code: string
  locale: string
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  PHP: { symbol: '₱', code: 'PHP', locale: 'en-PH' },
  USD: { symbol: '$', code: 'USD', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', locale: 'de-DE' },
}

// View mode types
export type ViewMode = 'all' | 'single' | 'compare'

// Date range type
export type DateRange = {
  start: string
  end: string
}

// Loading state type
export type LoadingState = {
  isLoading: boolean
  error: string | null
}

// Chart data types
export type PieChartDataItem = {
  name: string
  value: number
  color: string
}

export type BarChartDataItem = {
  name: string
  cost: number
  hours: number
}

export type TrendChartDataItem = {
  date: string
  cost: number
  hours: number
}
