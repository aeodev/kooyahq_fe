import { useCallback } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_COST_FORECAST } from '@/utils/api.routes'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import type { CostForecast } from '@/types/cost-analytics'
import { normalizeError } from '@/utils/error'

export function useCostForecast() {
  const {
    forecast,
    forecastLoading,
    setForecast,
    setForecastLoading,
  } = useCostAnalyticsStore()

  const fetchForecast = useCallback(async (
    startDate: string,
    endDate: string,
    days: number = 30,
    project?: string | null
  ): Promise<CostForecast | null> => {
    setForecastLoading(true)
    try {
      const response = await axiosInstance.get<{ status: string; data: CostForecast }>(
        GET_COST_FORECAST(startDate, endDate, days, project)
      )
      setForecast(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      console.error('Failed to fetch forecast:', normalized.message)
      return null
    } finally {
      setForecastLoading(false)
    }
  }, [setForecast, setForecastLoading])

  return {
    forecast,
    forecastLoading,
    fetchForecast,
  }
}
