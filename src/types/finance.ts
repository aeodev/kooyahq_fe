/**
 * Finance Module Types (Frontend)
 * 
 * SECURITY NOTES:
 * - Default analytics responses do NOT include monthlySalary or hourlyRate
 * - Privileged analytics responses (for users with USERS_MANAGE) include salary/rate data
 * - The frontend should hide the "Show Rates" toggle from non-privileged users
 */

// ============================================================================
// SAFE Types (Default - No salary/rate exposure)
// ============================================================================

/**
 * Active developer in live cost tracking (SAFE)
 * No monthlySalary or hourlyRate fields
 */
export type SafeActiveDeveloper = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  projects: string[]
  activeMinutes: number
  liveCost: number
  startTime: string
  isPaused: boolean
}

/**
 * Project live cost (same for both safe and privileged)
 */
export type ProjectLiveCost = {
  project: string
  liveCost: number
  burnRate: number
  developers: number
  activeMinutes: number
}

/**
 * Live cost data (SAFE)
 */
export type SafeLiveCostData = {
  totalBurnRate: number
  totalLiveCost: number
  activeHours: number
  activeDevelopers: SafeActiveDeveloper[]
  projectCosts: ProjectLiveCost[]
  timestamp: string
}

/**
 * Developer cost summary (SAFE - no hourlyRate)
 */
export type SafeDeveloperCostSummary = {
  userId: string
  userName: string
  hours: number
  cost: number
}

/**
 * Project cost summary (SAFE)
 */
export type SafeProjectCostSummary = {
  project: string
  totalCost: number
  totalHours: number
  developers: SafeDeveloperCostSummary[]
  avgCostPerHour: number
}

/**
 * Top performer (SAFE - no hourlyRate)
 */
export type SafeTopPerformer = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  totalHours: number
  totalCost: number
  projectCount: number
  projects: string[]
}

/**
 * Overtime breakdown
 */
export type OvertimeBreakdown = {
  regular: { cost: number; hours: number }
  overtime: { cost: number; hours: number }
  overtimePercentage: number
}

/**
 * Cost summary data (SAFE)
 */
export type SafeCostSummaryData = {
  totalCost: number
  totalHours: number
  projectCosts: SafeProjectCostSummary[]
  topPerformers: SafeTopPerformer[]
  dailyCosts: Array<{ date: string; cost: number; hours: number }>
  monthlyCosts: Array<{ month: string; cost: number; hours: number }>
  overtimeBreakdown?: OvertimeBreakdown
}

// ============================================================================
// PRIVILEGED Types (Require USERS_MANAGE permission)
// ============================================================================

/**
 * Active developer with salary/rate data (PRIVILEGED)
 */
export type PrivilegedActiveDeveloper = SafeActiveDeveloper & {
  monthlySalary: number
  hourlyRate: number
}

/**
 * Developer cost summary with hourlyRate (PRIVILEGED)
 */
export type PrivilegedDeveloperCostSummary = SafeDeveloperCostSummary & {
  hourlyRate: number
}

/**
 * Project cost summary with developer rates (PRIVILEGED)
 */
export type PrivilegedProjectCostSummary = {
  project: string
  totalCost: number
  totalHours: number
  developers: PrivilegedDeveloperCostSummary[]
  avgHourlyRate: number
}

/**
 * Top performer with hourlyRate (PRIVILEGED)
 */
export type PrivilegedTopPerformer = SafeTopPerformer & {
  hourlyRate: number
}

/**
 * Live cost data with salary/rate data (PRIVILEGED)
 */
export type PrivilegedLiveCostData = {
  totalBurnRate: number
  totalLiveCost: number
  activeHours: number
  activeDevelopers: PrivilegedActiveDeveloper[]
  projectCosts: ProjectLiveCost[]
  timestamp: string
}

/**
 * Cost summary data with salary/rate data (PRIVILEGED)
 */
export type PrivilegedCostSummaryData = {
  totalCost: number
  totalHours: number
  projectCosts: PrivilegedProjectCostSummary[]
  topPerformers: PrivilegedTopPerformer[]
  dailyCosts: Array<{ date: string; cost: number; hours: number }>
  monthlyCosts: Array<{ month: string; cost: number; hours: number }>
  overtimeBreakdown?: OvertimeBreakdown
}

// ============================================================================
// Budget Types
// ============================================================================

export type Budget = {
  id: string
  project: string | null
  workspaceId?: string
  startDate: string
  endDate: string
  amount: number
  currency: string
  alertThresholds: {
    warning: number
    critical: number
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type BudgetComparison = {
  budget: Budget
  actualCost: number
  actualHours: number
  remainingBudget: number
  remainingDays: number
  utilizationPercentage: number
  alertLevel: 'ok' | 'warning' | 'critical'
  projectedCost: number
  projectedOverspend: number
}

// ============================================================================
// Expense Types
// ============================================================================

/**
 * Expense (with new fields: notes, isRecurringMonthly, endDate)
 * Note: There is NO salary/wage expense type - salary comes from user records
 */
export type Expense = {
  id: string
  amount: number
  currency: string
  category?: string
  vendor?: string
  notes?: string // Free text field (replaces description)
  effectiveDate: string
  endDate?: string
  isRecurringMonthly: boolean // Monthly recurring only
  projectId?: string
  workspaceId?: string
  metadata?: Record<string, unknown>
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Forecast and Comparison Types
// ============================================================================

export type CostForecast = {
  projectedCost: number
  projectedHours: number
  daysRemaining: number
  confidence: number
  dailyAverage: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export type PeriodComparison = {
  current: { cost: number; hours: number }
  previous: { cost: number; hours: number }
  change: { cost: number; hours: number; costPercentage: number; hoursPercentage: number }
}

// ============================================================================
// Currency Types
// ============================================================================

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

// ============================================================================
// View Mode Types
// ============================================================================

export type ViewMode = 'all' | 'single' | 'compare'

export type DateRange = {
  start: string
  end: string
}

export type LoadingState = {
  isLoading: boolean
  error: string | null
}

// ============================================================================
// Chart Data Types
// ============================================================================

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

// ============================================================================
// Legacy Type Aliases (for backward compatibility)
// These map old type names to the new safe types
// ============================================================================

// These types are deprecated - the new versions don't expose hourlyRate/monthlySalary by default
/** @deprecated Use SafeActiveDeveloper instead */
export type ActiveDeveloper = SafeActiveDeveloper

/** @deprecated Use SafeProjectCostSummary instead */
export type ProjectCostSummary = SafeProjectCostSummary

/** @deprecated Use SafeTopPerformer instead */
export type TopPerformer = SafeTopPerformer

/** @deprecated Use SafeLiveCostData instead */
export type LiveCostData = SafeLiveCostData

/** @deprecated Use SafeCostSummaryData instead */
export type CostSummaryData = SafeCostSummaryData
