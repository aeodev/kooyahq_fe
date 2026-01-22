import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_FINANCE_SUMMARY,
  GET_EXPENSES,
  GET_EXPENSE,
  CREATE_EXPENSE,
  UPDATE_EXPENSE,
  DELETE_EXPENSE,
  GET_EMPLOYEE_COSTS,
  CREATE_EMPLOYEE_COST,
  UPDATE_EMPLOYEE_COST,
  DELETE_EMPLOYEE_COST,
} from '@/utils/api.routes'

export const financeKeys = {
  all: ['finance'] as const,
  summary: (startDate?: string, endDate?: string) => [...financeKeys.all, 'summary', { startDate, endDate }] as const,
  expenses: (filters?: Record<string, unknown>) => [...financeKeys.all, 'expenses', filters] as const,
  expense: (id: string) => [...financeKeys.all, 'expense', id] as const,
  employeeCosts: (filters?: Record<string, unknown>) => [...financeKeys.all, 'employeeCosts', filters] as const,
}

export type FinanceSummary = {
  totalExpenses: number
  totalEmployeeCosts: number
  totalOutflow: number
  dailyCosts: Array<{ date: string; cost: number }>
  monthlyCosts: Array<{ month: string; cost: number }>
  topCategories: Array<{ category: string; cost: number }>
  topVendors: Array<{ vendor: string; cost: number }>
}

export type Expense = {
  id: string
  amount: number
  currency: string
  category?: string
  vendor?: string
  description?: string
  effectiveDate: string
  isRecurring: boolean
  recurrence?: 'monthly' | 'yearly'
  employeeId?: string
  metadata?: Record<string, unknown>
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type EmployeeCost = {
  id: string
  employeeId: string
  costType: 'salary' | 'subscription' | 'item' | 'other'
  amount: number
  currency: string
  effectiveDate: string
  endDate?: string
  metadata?: Record<string, unknown>
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type ExpenseFilters = {
  startDate?: string
  endDate?: string
  category?: string
  vendor?: string
  employeeId?: string
  search?: string
}

export type EmployeeCostFilters = {
  startDate?: string
  endDate?: string
  employeeId?: string
  costType?: 'salary' | 'subscription' | 'item' | 'other'
}

export function useFinanceSummaryQuery(startDate?: string, endDate?: string, enabled = true) {
  return useQuery({
    queryKey: financeKeys.summary(startDate, endDate),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: FinanceSummary }>(
        GET_FINANCE_SUMMARY(startDate, endDate)
      )
      return response.data.data
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useExpensesQuery(filters?: ExpenseFilters, enabled = true) {
  return useQuery({
    queryKey: financeKeys.expenses(filters),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: Expense[] }>(
        GET_EXPENSES(filters)
      )
      return response.data.data
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useExpenseQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: financeKeys.expense(id),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: Expense }>(GET_EXPENSE(id))
      return response.data.data
    },
    enabled,
  })
}

export function useEmployeeCostsQuery(filters?: EmployeeCostFilters, enabled = true) {
  return useQuery({
    queryKey: financeKeys.employeeCosts(filters),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: EmployeeCost[] }>(
        GET_EMPLOYEE_COSTS(filters)
      )
      return response.data.data
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Mutations
export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Expense>) => {
      const response = await axiosInstance.post<{ status: string; data: Expense }>(
        CREATE_EXPENSE(),
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Expense> }) => {
      const response = await axiosInstance.put<{ status: string; data: Expense }>(
        UPDATE_EXPENSE(id),
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(DELETE_EXPENSE(id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useCreateEmployeeCostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<EmployeeCost>) => {
      const response = await axiosInstance.post<{ status: string; data: EmployeeCost }>(
        CREATE_EMPLOYEE_COST(),
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useUpdateEmployeeCostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmployeeCost> }) => {
      const response = await axiosInstance.put<{ status: string; data: EmployeeCost }>(
        UPDATE_EMPLOYEE_COST(id),
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useDeleteEmployeeCostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(DELETE_EMPLOYEE_COST(id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}
