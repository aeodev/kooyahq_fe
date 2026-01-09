import { useCallback } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_PERIOD_COMPARISON } from '@/utils/api.routes'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import type { PeriodComparison } from '@/types/cost-analytics'
import { normalizeError } from '@/utils/error'

export function usePeriodComparison() {
  const {
    periodComparison,
    comparisonLoading,
    setPeriodComparison,
    setComparisonLoading,
  } = useCostAnalyticsStore()

  const comparePeriods = useCallback(async (
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
    project?: string | null
  ): Promise<PeriodComparison | null> => {
    setComparisonLoading(true)
    try {
      const response = await axiosInstance.get<{ status: string; data: PeriodComparison }>(
        GET_PERIOD_COMPARISON(currentStart, currentEnd, previousStart, previousEnd, project)
      )
      setPeriodComparison(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      console.error('Failed to compare periods:', normalized.message)
      return null
    } finally {
      setComparisonLoading(false)
    }
  }, [setPeriodComparison, setComparisonLoading])

  return {
    periodComparison,
    comparisonLoading,
    comparePeriods,
  }
}
