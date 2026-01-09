import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { convertFromPHPSync } from '@/utils/currency-converter'
import type {
  LiveCostData,
  CostSummaryData,
  CurrencyConfig,
  CURRENCIES,
  ProjectCostSummary,
  Budget,
  BudgetComparison,
  CostForecast,
  PeriodComparison,
} from '@/types/cost-analytics'

type CostAnalyticsState = {
  // Live data
  liveData: LiveCostData | null
  liveLoading: boolean
  liveError: string | null
  lastLiveUpdate: string | null

  // Summary data
  summaryData: CostSummaryData | null
  summaryLoading: boolean
  summaryError: string | null

  // Project list
  projectList: string[]
  projectListLoading: boolean

  // Selected project detail
  selectedProject: string | null
  projectDetail: ProjectCostSummary | null
  projectDetailLoading: boolean
  projectDetailError: string | null

  // Compare mode
  compareProjects: string[]
  compareData: ProjectCostSummary[]
  compareLoading: boolean

  // Currency preference
  currency: keyof typeof CURRENCIES

  // Last updated timestamp
  lastUpdated: Date | null

  // Track if data has been loaded at least once
  hasLoadedOnce: boolean

  // Budget data
  budgets: Budget[]
  budgetsLoading: boolean
  budgetsError: string | null
  budgetComparisons: BudgetComparison[]

  // Forecast data
  forecast: CostForecast | null
  forecastLoading: boolean

  // Period comparison data
  periodComparison: PeriodComparison | null
  comparisonLoading: boolean
}

type CostAnalyticsActions = {
  // Setters for live data
  setLiveData: (data: LiveCostData | null) => void
  setLiveLoading: (loading: boolean) => void
  setLiveError: (error: string | null) => void
  
  // Setters for summary data
  setSummaryData: (data: CostSummaryData | null) => void
  setSummaryLoading: (loading: boolean) => void
  setSummaryError: (error: string | null) => void
  
  // Setters for project list
  setProjectList: (projects: string[]) => void
  setProjectListLoading: (loading: boolean) => void
  
  // Setters for project detail
  setSelectedProject: (project: string | null) => void
  setProjectDetail: (detail: ProjectCostSummary | null) => void
  setProjectDetailLoading: (loading: boolean) => void
  setProjectDetailError: (error: string | null) => void
  
  // Setters for compare mode
  setCompareProjects: (projects: string[]) => void
  setCompareData: (data: ProjectCostSummary[]) => void
  setCompareLoading: (loading: boolean) => void
  
  // Currency preference
  setCurrency: (currency: keyof typeof CURRENCIES) => void
  
  // Last updated timestamp
  setLastUpdated: (date: Date | null) => void
  
  // Budget actions
  setBudgets: (budgets: Budget[]) => void
  setBudgetsLoading: (loading: boolean) => void
  setBudgetsError: (error: string | null) => void
  setBudgetComparisons: (comparisons: BudgetComparison[]) => void

  // Forecast actions
  setForecast: (forecast: CostForecast | null) => void
  setForecastLoading: (loading: boolean) => void

  // Period comparison actions
  setPeriodComparison: (comparison: PeriodComparison | null) => void
  setComparisonLoading: (loading: boolean) => void

  // Utility actions
  clearData: () => void
  clearErrors: () => void
  markAsLoaded: () => void
}

type CostAnalyticsStore = CostAnalyticsState & CostAnalyticsActions

export const useCostAnalyticsStore = create<CostAnalyticsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      liveData: null,
      liveLoading: false,
      liveError: null,
      lastLiveUpdate: null,
      summaryData: null,
      summaryLoading: false,
      summaryError: null,
      projectList: [],
      projectListLoading: false,
      selectedProject: null,
      projectDetail: null,
      projectDetailLoading: false,
      projectDetailError: null,
      compareProjects: [],
      compareData: [],
      compareLoading: false,
      currency: 'PHP',
      lastUpdated: null,
      hasLoadedOnce: false,
      budgets: [],
      budgetsLoading: false,
      budgetsError: null,
      budgetComparisons: [],
      forecast: null,
      forecastLoading: false,
      periodComparison: null,
      comparisonLoading: false,

      // Actions - Live data setters
      setLiveData: (data) => {
        const now = new Date()
        set({
          liveData: data,
          lastLiveUpdate: data ? now.toISOString() : null,
          lastUpdated: now,
          hasLoadedOnce: data !== null ? true : get().hasLoadedOnce,
        })
      },
      setLiveLoading: (loading) => set({ liveLoading: loading }),
      setLiveError: (error) => set({ liveError: error }),

      // Actions - Summary data setters
      setSummaryData: (data) => {
        const now = new Date()
        set({
          summaryData: data,
          lastUpdated: now,
        })
      },
      setSummaryLoading: (loading) => set({ summaryLoading: loading }),
      setSummaryError: (error) => set({ summaryError: error }),

      // Actions - Project list setters
      setProjectList: (projects) => set({ projectList: projects }),
      setProjectListLoading: (loading) => set({ projectListLoading: loading }),

      // Actions - Project detail setters
      setSelectedProject: (project) => {
        set({
          selectedProject: project,
          projectDetail: project ? get().projectDetail : null,
          projectDetailError: project ? get().projectDetailError : null,
        })
      },
      setProjectDetail: (detail) => set({ projectDetail: detail }),
      setProjectDetailLoading: (loading) => set({ projectDetailLoading: loading }),
      setProjectDetailError: (error) => set({ projectDetailError: error }),

      // Actions - Compare mode setters
      setCompareProjects: (projects) => set({ compareProjects: projects }),
      setCompareData: (data) => set({ compareData: data }),
      setCompareLoading: (loading) => set({ compareLoading: loading }),

      // Actions - Currency preference
      setCurrency: (currency) => set({ currency }),

      // Actions - Last updated timestamp
      setLastUpdated: (date) => set({ lastUpdated: date }),

      // Actions - Budget setters
      setBudgets: (budgets) => set({ budgets }),
      setBudgetsLoading: (loading) => set({ budgetsLoading: loading }),
      setBudgetsError: (error) => set({ budgetsError: error }),
      setBudgetComparisons: (comparisons) => set({ budgetComparisons: comparisons }),

      // Actions - Forecast setters
      setForecast: (forecast) => set({ forecast }),
      setForecastLoading: (loading) => set({ forecastLoading: loading }),

      // Actions - Period comparison setters
      setPeriodComparison: (comparison) => set({ periodComparison: comparison }),
      setComparisonLoading: (loading) => set({ comparisonLoading: loading }),

      // Actions - Utility actions
      clearData: () => {
        set({
          liveData: null,
          summaryData: null,
          liveError: null,
          summaryError: null,
          projectDetail: null,
          compareData: [],
          forecast: null,
          periodComparison: null,
        })
      },
      clearErrors: () => {
        set({
          liveError: null,
          summaryError: null,
          projectDetailError: null,
          budgetsError: null,
        })
      },
      markAsLoaded: () => set({ hasLoadedOnce: true }),
    }),
    {
      name: 'kooyahq.cost-analytics',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currency: state.currency }),
    }
  )
)

// Helper to format currency
// Converts PHP amounts to target currency before formatting
export function formatCurrency(amount: number, currencyConfig: CurrencyConfig): string {
  // Convert from PHP to target currency
  const convertedAmount = convertFromPHPSync(amount, currencyConfig.code)
  
  return new Intl.NumberFormat(currencyConfig.locale, {
    style: 'currency',
    currency: currencyConfig.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertedAmount)
}

// Helper to format compact currency (for large numbers)
// Converts PHP amounts to target currency before formatting
export function formatCompactCurrency(amount: number, currencyConfig: CurrencyConfig): string {
  // Convert from PHP to target currency
  const convertedAmount = convertFromPHPSync(amount, currencyConfig.code)
  
  if (convertedAmount >= 1000000) {
    return `${currencyConfig.symbol}${(convertedAmount / 1000000).toFixed(2)}M`
  }
  if (convertedAmount >= 1000) {
    return `${currencyConfig.symbol}${(convertedAmount / 1000).toFixed(2)}K`
  }
  // For amounts < 1000, use formatCurrency (it will convert, but we already converted)
  // Pass original amount to avoid double conversion
  return formatCurrency(amount, currencyConfig)
}
