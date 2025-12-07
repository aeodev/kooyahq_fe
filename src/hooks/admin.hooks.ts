import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_USERS, UPDATE_EMPLOYEE, DELETE_EMPLOYEE, GET_ADMIN_STATS } from '@/utils/api.routes'
import type { User } from '@/types/user'

export type Errors = {
  message: string | string[]
  statusCode?: number
}

function normalizeError(error: unknown): Errors {
  if (typeof error === 'string') {
    return { message: error }
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any
    const message = axiosError.response?.data?.message || axiosError.message || 'An error occurred'
    const statusCode = axiosError.response?.status

    return {
      message,
      statusCode,
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: 'An unknown error occurred' }
}

type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type EmployeesResponse = {
  data: User[]
  pagination?: PaginationMeta
}

type UseEmployeesParams = {
  page?: number
  limit?: number
  search?: string
  role?: 'admin' | 'user'
}

export const useEmployees = (params?: UseEmployeesParams) => {
  const [data, setData] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchEmployees = useCallback(async (fetchParams?: UseEmployeesParams) => {
    setError(null)
    setLoading(true)

    try {
      const queryParams = new URLSearchParams()
      const finalParams = fetchParams || params
      
      if (finalParams?.page) queryParams.append('page', finalParams.page.toString())
      if (finalParams?.limit) queryParams.append('limit', finalParams.limit.toString())
      if (finalParams?.search) queryParams.append('search', finalParams.search)
      if (finalParams?.role) queryParams.append('role', finalParams.role)

      const url = `${GET_USERS()}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await axiosInstance.get<{ status: string; data: EmployeesResponse | User[] }>(url)
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response.data.data)) {
        setData(response.data.data)
        setPagination(null)
      } else {
        const paginatedData = response.data.data as EmployeesResponse
        setData(paginatedData.data)
        setPagination(paginatedData.pagination || null)
      }
      
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return null
    } finally {
      setLoading(false)
    }
  }, [params])

  return {
    data,
    pagination,
    loading,
    error,
    fetchEmployees,
  }
}

export const useUpdateEmployee = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const updateEmployee = useCallback(
    async (id: string, updates: Partial<User>): Promise<User | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ status: string; data: User }>(
          UPDATE_EMPLOYEE(id),
          updates
        )
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    updateEmployee,
  }
}

export const useDeleteEmployee = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const deleteEmployee = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    setLoading(true)

    try {
      await axiosInstance.delete(DELETE_EMPLOYEE(id))
      return true
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    deleteEmployee,
  }
}

type AdminStats = {
  totalUsers: number
  totalAdmins: number
  totalRegularUsers: number
  totalProjects: number
  recentActivityCount: number
  newUsersThisMonth: number
}

export const useAdminStats = () => {
  const [data, setData] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchStats = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: AdminStats }>(GET_ADMIN_STATS())
      setData(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    fetchStats,
  }
}







