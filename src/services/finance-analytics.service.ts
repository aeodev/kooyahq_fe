/**
 * Finance Analytics Service
 * 
 * This service provides access to cost analytics data.
 * 
 * SECURITY NOTES:
 * - Default methods return SAFE data (no salary/rate)
 * - Privileged methods (ending in 'Privileged') return full data
 * - Privileged methods should only be called if user has USERS_MANAGE permission
 */

import { api } from './api'
import type {
  SafeLiveCostData,
  SafeCostSummaryData,
  SafeProjectCostSummary,
  PrivilegedLiveCostData,
  PrivilegedCostSummaryData,
  PrivilegedProjectCostSummary,
  CostForecast,
  PeriodComparison,
} from '@/types/finance'

// ============================================================================
// SAFE (Default) Methods - No salary/rate exposure
// ============================================================================

/**
 * Get live cost data (SAFE - no salary/rate)
 */
export async function getLiveCostData(): Promise<SafeLiveCostData> {
  const response = await api.get<{ status: string; data: SafeLiveCostData }>('/finance/analytics/live')
  return response.data.data
}

/**
 * Get cost summary (SAFE - no salary/rate)
 */
export async function getCostSummary(
  startDate?: string,
  endDate?: string
): Promise<SafeCostSummaryData> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  
  const url = `/finance/analytics/summary${params.toString() ? `?${params.toString()}` : ''}`
  const response = await api.get<{ status: string; data: SafeCostSummaryData }>(url)
  return response.data.data
}

/**
 * Get project detail (SAFE - no salary/rate)
 */
export async function getProjectDetail(
  projectName: string,
  startDate?: string,
  endDate?: string
): Promise<SafeProjectCostSummary | null> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  
  const url = `/finance/analytics/project/${encodeURIComponent(projectName)}${params.toString() ? `?${params.toString()}` : ''}`
  const response = await api.get<{ status: string; data: SafeProjectCostSummary }>(url)
  return response.data.data
}

/**
 * Get all project names
 */
export async function getProjectList(): Promise<string[]> {
  const response = await api.get<{ status: string; data: string[] }>('/finance/analytics/projects')
  return response.data.data
}

/**
 * Get cost forecast
 */
export async function getCostForecast(
  startDate?: string,
  endDate?: string,
  days?: number,
  project?: string | null
): Promise<CostForecast> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (days) params.append('days', days.toString())
  if (project) params.append('project', project)
  
  const url = `/finance/analytics/forecast${params.toString() ? `?${params.toString()}` : ''}`
  const response = await api.get<{ status: string; data: CostForecast }>(url)
  return response.data.data
}

/**
 * Get period comparison
 */
export async function getPeriodComparison(
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string,
  project?: string | null
): Promise<PeriodComparison> {
  const params = new URLSearchParams({
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
  })
  if (project) params.append('project', project)
  
  const response = await api.get<{ status: string; data: PeriodComparison }>(
    `/finance/analytics/compare?${params.toString()}`
  )
  return response.data.data
}

// ============================================================================
// PRIVILEGED Methods - Include salary/rate (require USERS_MANAGE)
// ============================================================================

/**
 * Get live cost data with salary/rate data (PRIVILEGED)
 * 
 * SECURITY: Only call this if user has USERS_MANAGE permission
 */
export async function getLiveCostDataPrivileged(): Promise<PrivilegedLiveCostData> {
  const response = await api.get<{ status: string; data: PrivilegedLiveCostData }>(
    '/finance/analytics/live/privileged'
  )
  return response.data.data
}

/**
 * Get cost summary with salary/rate data (PRIVILEGED)
 * 
 * SECURITY: Only call this if user has USERS_MANAGE permission
 */
export async function getCostSummaryPrivileged(
  startDate?: string,
  endDate?: string
): Promise<PrivilegedCostSummaryData> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  
  const url = `/finance/analytics/summary/privileged${params.toString() ? `?${params.toString()}` : ''}`
  const response = await api.get<{ status: string; data: PrivilegedCostSummaryData }>(url)
  return response.data.data
}

/**
 * Get project detail with salary/rate data (PRIVILEGED)
 * 
 * SECURITY: Only call this if user has USERS_MANAGE permission
 */
export async function getProjectDetailPrivileged(
  projectName: string,
  startDate?: string,
  endDate?: string
): Promise<PrivilegedProjectCostSummary | null> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  
  const url = `/finance/analytics/project/${encodeURIComponent(projectName)}/privileged${params.toString() ? `?${params.toString()}` : ''}`
  const response = await api.get<{ status: string; data: PrivilegedProjectCostSummary }>(url)
  return response.data.data
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user can access privileged analytics
 */
export function canAccessPrivilegedAnalytics(permissions: string[]): boolean {
  return (
    permissions.includes('users:manage') ||
    permissions.includes('system:fullAccess')
  )
}
