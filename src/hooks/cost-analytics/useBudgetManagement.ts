import { useCallback } from 'react'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_BUDGETS,
  CREATE_BUDGET,
  UPDATE_BUDGET,
  DELETE_BUDGET,
  GET_ALL_BUDGET_COMPARISONS,
} from '@/utils/api.routes'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import type { Budget, BudgetComparison } from '@/types/cost-analytics'
import { normalizeError } from '@/utils/error'

type CreateBudgetInputFrontend = {
  project?: string | null
  startDate: string
  endDate: string
  amount: number
  currency?: string
  alertThresholds?: {
    warning?: number
    critical?: number
  }
}

type UpdateBudgetInputFrontend = {
  project?: string | null
  startDate?: string
  endDate?: string
  amount?: number
  currency?: string
  alertThresholds?: {
    warning?: number
    critical?: number
  }
}

export function useBudgetManagement() {
  const {
    budgets,
    budgetsLoading,
    budgetsError,
    budgetComparisons,
    setBudgets,
    setBudgetsLoading,
    setBudgetsError,
    setBudgetComparisons,
  } = useCostAnalyticsStore()

  const fetchBudgets = useCallback(async (project?: string | null) => {
    setBudgetsLoading(true)
    setBudgetsError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: Budget[] }>(
        GET_BUDGETS(project)
      )
      setBudgets(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      const message = Array.isArray(normalized.message)
        ? normalized.message.join(', ')
        : normalized.message
      setBudgetsError(message)
      return []
    } finally {
      setBudgetsLoading(false)
    }
  }, [setBudgets, setBudgetsLoading, setBudgetsError])

  const fetchBudgetComparisons = useCallback(async () => {
    try {
      const response = await axiosInstance.get<{ status: string; data: BudgetComparison[] }>(
        GET_ALL_BUDGET_COMPARISONS()
      )
      setBudgetComparisons(response.data.data)
      return response.data.data
    } catch (err) {
      console.error('Failed to fetch budget comparisons:', err)
      return []
    }
  }, [setBudgetComparisons])

  const createBudget = useCallback(async (input: CreateBudgetInputFrontend): Promise<Budget | null> => {
    setBudgetsLoading(true)
    setBudgetsError(null)
    try {
      const response = await axiosInstance.post<{ status: string; data: Budget }>(
        CREATE_BUDGET(),
        input
      )
      const newBudget = response.data.data
      const updatedBudgets = [...budgets, newBudget]
      setBudgets(updatedBudgets)
      // Fetch comparisons after creating budget
      await fetchBudgetComparisons()
      return newBudget
    } catch (err) {
      const normalized = normalizeError(err)
      const message = Array.isArray(normalized.message)
        ? normalized.message.join(', ')
        : normalized.message
      setBudgetsError(message)
      return null
    } finally {
      setBudgetsLoading(false)
    }
  }, [budgets, setBudgets, setBudgetsLoading, setBudgetsError, fetchBudgetComparisons])

  const updateBudget = useCallback(async (id: string, input: UpdateBudgetInputFrontend): Promise<Budget | null> => {
    setBudgetsLoading(true)
    setBudgetsError(null)
    try {
      const response = await axiosInstance.put<{ status: string; data: Budget }>(
        UPDATE_BUDGET(id),
        input
      )
      const updatedBudget = response.data.data
      setBudgets(budgets.map(b => b.id === id ? updatedBudget : b))
      // Fetch comparisons after updating budget
      await fetchBudgetComparisons()
      return updatedBudget
    } catch (err) {
      const normalized = normalizeError(err)
      const message = Array.isArray(normalized.message)
        ? normalized.message.join(', ')
        : normalized.message
      setBudgetsError(message)
      return null
    } finally {
      setBudgetsLoading(false)
    }
  }, [budgets, setBudgets, setBudgetsLoading, setBudgetsError, fetchBudgetComparisons])

  const deleteBudget = useCallback(async (id: string): Promise<boolean> => {
    setBudgetsLoading(true)
    setBudgetsError(null)
    try {
      await axiosInstance.delete(DELETE_BUDGET(id))
      setBudgets(budgets.filter(b => b.id !== id))
      // Fetch comparisons after deleting budget
      await fetchBudgetComparisons()
      return true
    } catch (err) {
      const normalized = normalizeError(err)
      const message = Array.isArray(normalized.message)
        ? normalized.message.join(', ')
        : normalized.message
      setBudgetsError(message)
      return false
    } finally {
      setBudgetsLoading(false)
    }
  }, [budgets, setBudgets, setBudgetsLoading, setBudgetsError, fetchBudgetComparisons])

  return {
    budgets,
    budgetsLoading,
    budgetsError,
    budgetComparisons,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    fetchBudgetComparisons,
  }
}
