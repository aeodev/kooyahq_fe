import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axiosInstance from '@/utils/axios.instance'
import { GET_LIVE_COST, GET_COST_SUMMARY, GET_PROJECT_LIST, GET_PROJECT_DETAIL } from '@/utils/api.routes'
import { normalizeError } from '@/utils/error'
import type { LiveCostData, CostSummaryData, CurrencyConfig, CURRENCIES, ProjectCostSummary } from '@/types/cost-analytics'

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
}

type CostAnalyticsActions = {
  fetchLiveData: () => Promise<void>
  fetchSummaryData: (startDate: string, endDate: string) => Promise<void>
  fetchProjectList: () => Promise<void>
  fetchProjectDetail: (projectName: string, startDate: string, endDate: string) => Promise<void>
  setSelectedProject: (project: string | null) => void
  setCompareProjects: (projects: string[]) => void
  fetchCompareData: (projects: string[], startDate: string, endDate: string) => Promise<void>
  setCurrency: (currency: keyof typeof CURRENCIES) => void
  updateLiveData: (data: LiveCostData) => void
  clearData: () => void
  retryFailedRequest: (type: 'live' | 'summary' | 'projectList' | 'projectDetail') => Promise<void>
  clearErrors: () => void
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

      // Actions
      fetchLiveData: async () => {
        set({ liveLoading: true, liveError: null })
        try {
          const response = await axiosInstance.get<{ status: string; data: LiveCostData }>(
            GET_LIVE_COST()
          )
          set({
            liveData: response.data.data,
            liveLoading: false,
            lastLiveUpdate: new Date().toISOString(),
          })
        } catch (err) {
          const normalized = normalizeError(err)
          const message = Array.isArray(normalized.message)
            ? normalized.message.join(', ')
            : normalized.message || 'Failed to fetch live cost data'
          console.error('[Cost Analytics] Failed to fetch live data:', err)
          set({ liveError: message, liveLoading: false })
        }
      },

      fetchSummaryData: async (startDate: string, endDate: string) => {
        set({ summaryLoading: true, summaryError: null })
        try {
          const response = await axiosInstance.get<{ status: string; data: CostSummaryData }>(
            GET_COST_SUMMARY(startDate, endDate)
          )
          set({
            summaryData: response.data.data,
            summaryLoading: false,
          })
        } catch (err) {
          const normalized = normalizeError(err)
          const message = Array.isArray(normalized.message)
            ? normalized.message.join(', ')
            : normalized.message || `Failed to fetch cost summary for ${startDate} to ${endDate}`
          console.error('[Cost Analytics] Failed to fetch summary data:', err)
          set({ summaryError: message, summaryLoading: false })
        }
      },

      fetchProjectList: async () => {
        set({ projectListLoading: true })
        try {
          const response = await axiosInstance.get<{ status: string; data: string[] }>(
            GET_PROJECT_LIST()
          )
          set({ projectList: response.data.data, projectListLoading: false })
        } catch (err) {
          const normalized = normalizeError(err)
          const message = Array.isArray(normalized.message)
            ? normalized.message.join(', ')
            : normalized.message || 'Failed to fetch project list'
          console.error('[Cost Analytics] Failed to fetch project list:', err)
          set({ projectListLoading: false })
          // Note: We don't set an error state here to avoid breaking the UI
          // The error is logged for debugging purposes
        }
      },

      fetchProjectDetail: async (projectName: string, startDate: string, endDate: string) => {
        set({ projectDetailLoading: true, projectDetailError: null })
        try {
          const response = await axiosInstance.get<{ status: string; data: ProjectCostSummary }>(
            GET_PROJECT_DETAIL(projectName, startDate, endDate)
          )
          set({
            projectDetail: response.data.data,
            projectDetailLoading: false,
          })
        } catch (err) {
          const normalized = normalizeError(err)
          const message = Array.isArray(normalized.message)
            ? normalized.message.join(', ')
            : normalized.message || `Failed to fetch details for project "${projectName}"`
          console.error(`[Cost Analytics] Failed to fetch project detail for ${projectName}:`, err)
          set({ projectDetailError: message, projectDetailLoading: false, projectDetail: null })
        }
      },

      setSelectedProject: (project) => {
        set({ selectedProject: project, projectDetail: null, projectDetailError: null })
      },

      setCompareProjects: (projects) => {
        set({ compareProjects: projects })
      },

      fetchCompareData: async (projects: string[], startDate: string, endDate: string) => {
        if (projects.length === 0) {
          set({ compareData: [] })
          return
        }
        
        set({ compareLoading: true })
        try {
          const results = await Promise.all(
            projects.map(async (projectName) => {
              const response = await axiosInstance.get<{ status: string; data: ProjectCostSummary }>(
                GET_PROJECT_DETAIL(projectName, startDate, endDate)
              )
              return response.data.data
            })
          )
          set({ compareData: results.filter(Boolean), compareLoading: false })
        } catch (err) {
          const normalized = normalizeError(err)
          const message = Array.isArray(normalized.message)
            ? normalized.message.join(', ')
            : normalized.message || 'Failed to fetch comparison data'
          console.error('[Cost Analytics] Failed to fetch compare data:', err)
          set({ compareLoading: false })
          // Note: We don't set an error state here to avoid breaking the UI
          // Partial results may still be useful
        }
      },

      setCurrency: (currency) => {
        set({ currency })
      },

      updateLiveData: (data) => {
        set({ liveData: data, lastLiveUpdate: new Date().toISOString() })
      },

      clearData: () => {
        set({
          liveData: null,
          summaryData: null,
          liveError: null,
          summaryError: null,
          projectDetail: null,
          compareData: [],
        })
      },

      retryFailedRequest: async (type) => {
        const state = get()
        switch (type) {
          case 'live':
            if (state.liveError) {
              await state.fetchLiveData()
            }
            break
          case 'summary':
            if (state.summaryError && state.summaryData) {
              // We need dates to retry summary - this should be handled by the component
              console.warn('[Cost Analytics] Cannot retry summary without date range')
            }
            break
          case 'projectList':
            await state.fetchProjectList()
            break
          case 'projectDetail':
            if (state.selectedProject && state.projectDetailError) {
              // We need dates to retry - this should be handled by the component
              console.warn('[Cost Analytics] Cannot retry project detail without date range')
            }
            break
        }
      },

      clearErrors: () => {
        set({
          liveError: null,
          summaryError: null,
          projectDetailError: null,
        })
      },
    }),
    {
      name: 'kooyahq.cost-analytics',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currency: state.currency }),
    }
  )
)

// Helper to format currency
export function formatCurrency(amount: number, currencyConfig: CurrencyConfig): string {
  return new Intl.NumberFormat(currencyConfig.locale, {
    style: 'currency',
    currency: currencyConfig.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Helper to format compact currency (for large numbers)
export function formatCompactCurrency(amount: number, currencyConfig: CurrencyConfig): string {
  if (amount >= 1000000) {
    return `${currencyConfig.symbol}${(amount / 1000000).toFixed(2)}M`
  }
  if (amount >= 1000) {
    return `${currencyConfig.symbol}${(amount / 1000).toFixed(2)}K`
  }
  return formatCurrency(amount, currencyConfig)
}
