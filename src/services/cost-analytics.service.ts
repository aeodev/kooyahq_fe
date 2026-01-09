import axiosInstance from '@/utils/axios.instance'
import { GET_LIVE_COST, GET_COST_SUMMARY, GET_PROJECT_LIST, GET_PROJECT_DETAIL } from '@/utils/api.routes'
import { normalizeError } from '@/utils/error'
import type { LiveCostData, CostSummaryData, ProjectCostSummary } from '@/types/cost-analytics'

/**
 * Service layer for Cost Analytics API calls
 * Handles all API communication - no state management
 */

export interface CostAnalyticsServiceError {
  message: string
  originalError: unknown
}

/**
 * Fetch live cost data (active timers with burn rates)
 */
export async function fetchLiveData(): Promise<LiveCostData> {
  try {
    const response = await axiosInstance.get<{ status: string; data: LiveCostData }>(
      GET_LIVE_COST()
    )
    return response.data.data
  } catch (err) {
    const normalized = normalizeError(err)
    const message = Array.isArray(normalized.message)
      ? normalized.message.join(', ')
      : normalized.message || 'Failed to fetch live cost data'
    throw { message, originalError: err } as CostAnalyticsServiceError
  }
}

/**
 * Fetch cost summary for date range
 */
export async function fetchSummaryData(
  startDate: string,
  endDate: string
): Promise<CostSummaryData> {
  try {
    const response = await axiosInstance.get<{ status: string; data: CostSummaryData }>(
      GET_COST_SUMMARY(startDate, endDate)
    )
    return response.data.data
  } catch (err) {
    const normalized = normalizeError(err)
    const message = Array.isArray(normalized.message)
      ? normalized.message.join(', ')
      : normalized.message || `Failed to fetch cost summary for ${startDate} to ${endDate}`
    throw { message, originalError: err } as CostAnalyticsServiceError
  }
}

/**
 * Fetch list of all projects
 */
export async function fetchProjectList(): Promise<string[]> {
  try {
    const response = await axiosInstance.get<{ status: string; data: string[] }>(
      GET_PROJECT_LIST()
    )
    return response.data.data
  } catch (err) {
    const normalized = normalizeError(err)
    const message = Array.isArray(normalized.message)
      ? normalized.message.join(', ')
      : normalized.message || 'Failed to fetch project list'
    throw { message, originalError: err } as CostAnalyticsServiceError
  }
}

/**
 * Fetch project detail for a specific project
 */
export async function fetchProjectDetail(
  projectName: string,
  startDate: string,
  endDate: string
): Promise<ProjectCostSummary> {
  try {
    const response = await axiosInstance.get<{ status: string; data: ProjectCostSummary }>(
      GET_PROJECT_DETAIL(projectName, startDate, endDate)
    )
    return response.data.data
  } catch (err) {
    const normalized = normalizeError(err)
    const message = Array.isArray(normalized.message)
      ? normalized.message.join(', ')
      : normalized.message || `Failed to fetch details for project "${projectName}"`
    throw { message, originalError: err } as CostAnalyticsServiceError
  }
}

/**
 * Fetch comparison data for multiple projects
 */
export async function fetchCompareData(
  projects: string[],
  startDate: string,
  endDate: string
): Promise<ProjectCostSummary[]> {
  if (projects.length === 0) {
    return []
  }

  try {
    const results = await Promise.all(
      projects.map(async (projectName) => {
        const response = await axiosInstance.get<{ status: string; data: ProjectCostSummary }>(
          GET_PROJECT_DETAIL(projectName, startDate, endDate)
        )
        return response.data.data
      })
    )
    return results.filter(Boolean)
  } catch (err) {
    const normalized = normalizeError(err)
    const message = Array.isArray(normalized.message)
      ? normalized.message.join(', ')
      : normalized.message || 'Failed to fetch comparison data'
    // For comparison, we might want partial results, so we log but don't throw
    // Individual project failures will be handled by the calling code
    console.error('[Cost Analytics] Failed to fetch compare data:', err)
    throw { message, originalError: err } as CostAnalyticsServiceError
  }
}
