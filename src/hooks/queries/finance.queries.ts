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
  GET_EXPENSE_OPTIONS,
  GET_EMPLOYEE_COST_OPTIONS,
  GET_RECURRING_EXPENSES,
  CREATE_RECURRING_EXPENSE,
  UPDATE_RECURRING_EXPENSE,
  DELETE_RECURRING_EXPENSE,
  GET_RECURRING_EMPLOYEE_COSTS,
  CREATE_RECURRING_EMPLOYEE_COST,
  UPDATE_RECURRING_EMPLOYEE_COST,
  DELETE_RECURRING_EMPLOYEE_COST,
} from '@/utils/api.routes'

export const financeKeys = {
  all: ['finance'] as const,
  summary: (startDate?: string, endDate?: string) => [...financeKeys.all, 'summary', { startDate, endDate }] as const,
  expenses: (filters?: Record<string, unknown>) => [...financeKeys.all, 'expenses', filters] as const,
  expense: (id: string) => [...financeKeys.all, 'expense', id] as const,
  employeeCosts: (filters?: Record<string, unknown>) => [...financeKeys.all, 'employeeCosts', filters] as const,
  expenseOptions: ['finance', 'expenseOptions'] as const,
  employeeCostOptions: ['finance', 'employeeCostOptions'] as const,
  recurringExpenses: (filters?: Record<string, unknown>) => [...financeKeys.all, 'recurringExpenses', filters] as const,
  recurringEmployeeCosts: (filters?: Record<string, unknown>) => [...financeKeys.all, 'recurringEmployeeCosts', filters] as const,
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: Pagination
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
  notes?: string
  effectiveDate: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type EmployeeCost = {
  id: string
  employeeId: string
  amount: number
  currency: string
  vendor?: string
  category?: string
  effectiveDate: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type ExpenseFilters = {
  startDate?: string
  endDate?: string
  category?: string
  vendor?: string
  search?: string
  page?: number
  limit?: number
}

export type EmployeeCostFilters = {
  startDate?: string
  endDate?: string
  employeeId?: string
  search?: string
  page?: number
  limit?: number
}

export type ExpenseOptions = {
  vendors: string[]
  categories: string[]
}

export type EmployeeCostOptions = {
  vendors: string[]
  categories: string[]
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly'
export type RecurringStatus = 'active' | 'paused' | 'ended'

export type RecurringExpense = {
  id: string
  amount: number
  currency: string
  vendor?: string
  category?: string
  notes?: string
  frequency: RecurringFrequency
  startDate: string
  endDate?: string
  status: RecurringStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type RecurringExpenseFilters = {
  status?: RecurringStatus
  frequency?: RecurringFrequency
  search?: string
  page?: number
  limit?: number
}

export type RecurringEmployeeCost = {
  id: string
  employeeId: string
  amount: number
  currency: string
  vendor?: string
  category?: string
  frequency: RecurringFrequency
  startDate: string
  endDate?: string
  status: RecurringStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type RecurringEmployeeCostFilters = {
  employeeId?: string
  status?: RecurringStatus
  frequency?: RecurringFrequency
  search?: string
  page?: number
  limit?: number
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
      const response = await axiosInstance.get<{ status: string; data: Expense[]; pagination: Pagination }>(
        GET_EXPENSES(filters)
      )
      return {
        data: response.data.data,
        pagination: response.data.pagination,
      } as PaginatedResponse<Expense>
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
      const response = await axiosInstance.get<{ status: string; data: EmployeeCost[]; pagination: Pagination }>(
        GET_EMPLOYEE_COSTS(filters)
      )
      return {
        data: response.data.data,
        pagination: response.data.pagination,
      } as PaginatedResponse<EmployeeCost>
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useExpenseOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: financeKeys.expenseOptions,
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: ExpenseOptions }>(GET_EXPENSE_OPTIONS())
      return response.data.data
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  })
}

export function useEmployeeCostOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: financeKeys.employeeCostOptions,
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: EmployeeCostOptions }>(GET_EMPLOYEE_COST_OPTIONS())
      return response.data.data
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  })
}

export function useRecurringExpensesQuery(filters?: RecurringExpenseFilters, enabled = true) {
  return useQuery({
    queryKey: financeKeys.recurringExpenses(filters),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: RecurringExpense[]; pagination: Pagination }>(
        GET_RECURRING_EXPENSES(filters)
      )
      return {
        data: response.data.data,
        pagination: response.data.pagination,
      } as PaginatedResponse<RecurringExpense>
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useRecurringEmployeeCostsQuery(filters?: RecurringEmployeeCostFilters, enabled = true) {
  return useQuery({
    queryKey: financeKeys.recurringEmployeeCosts(filters),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: RecurringEmployeeCost[]; pagination: Pagination }>(
        GET_RECURRING_EMPLOYEE_COSTS(filters)
      )
      return {
        data: response.data.data,
        pagination: response.data.pagination,
      } as PaginatedResponse<RecurringEmployeeCost>
    },
    enabled,
    staleTime: 2 * 60 * 1000,
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

export function useCreateRecurringExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<RecurringExpense>) => {
      const response = await axiosInstance.post<{ status: string; data: RecurringExpense }>(
        CREATE_RECURRING_EXPENSE(),
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useUpdateRecurringExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecurringExpense> }) => {
      const response = await axiosInstance.put<{ status: string; data: RecurringExpense }>(
        UPDATE_RECURRING_EXPENSE(id),
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useDeleteRecurringExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(DELETE_RECURRING_EXPENSE(id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useCreateRecurringEmployeeCostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<RecurringEmployeeCost>) => {
      const response = await axiosInstance.post<{ status: string; data: RecurringEmployeeCost }>(
        CREATE_RECURRING_EMPLOYEE_COST(),
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useUpdateRecurringEmployeeCostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecurringEmployeeCost> }) => {
      const response = await axiosInstance.put<{ status: string; data: RecurringEmployeeCost }>(
        UPDATE_RECURRING_EMPLOYEE_COST(id),
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useDeleteRecurringEmployeeCostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(DELETE_RECURRING_EMPLOYEE_COST(id))
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
