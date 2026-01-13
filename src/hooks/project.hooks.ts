import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_PROJECTS, CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT } from '@/utils/api.routes'

export type Project = {
  id: string
  name: string
  emoji?: string
  iconUrl?: string
  createdAt: string
  updatedAt: string
}

export type CreateProjectInput = {
  name: string
  emoji?: string
  iconUrl?: string
}

export type UpdateProjectInput = {
  name?: string
  emoji?: string
  iconUrl?: string
}

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

export const useProjects = () => {
  const [data, setData] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchProjects = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: Project[] }>(GET_PROJECTS())
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
    fetchProjects,
  }
}

export const useCreateProject = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const createProject = useCallback(async (input: CreateProjectInput): Promise<Project | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ status: string; data: Project }>(
        CREATE_PROJECT(),
        input,
      )
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
    loading,
    error,
    createProject,
  }
}

export const useUpdateProject = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const updateProject = useCallback(
    async (id: string, updates: UpdateProjectInput): Promise<Project | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ status: string; data: Project }>(
          UPDATE_PROJECT(id),
          updates,
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
    [],
  )

  return {
    loading,
    error,
    updateProject,
  }
}

export const useDeleteProject = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    setLoading(true)

    try {
      await axiosInstance.delete(DELETE_PROJECT(id))
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
    deleteProject,
  }
}







