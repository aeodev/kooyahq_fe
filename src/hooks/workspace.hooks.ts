import { useState, useCallback, useEffect } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_WORKSPACES, GET_WORKSPACE_BY_ID } from '@/utils/api.routes'

export interface WorkspaceMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  members: WorkspaceMember[]
  createdAt: string
  updatedAt: string
}

interface Errors {
  message: string
  statusCode?: number
}

function normalizeError(error: unknown): Errors {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: { status?: number; data?: { message?: string } }
      message?: string
    }
    return {
      message: axiosError.response?.data?.message || axiosError.message || 'Something went wrong',
      statusCode: axiosError.response?.status,
    }
  }

  return { message: 'Something went wrong' }
}

export const useWorkspaces = () => {
  const [data, setData] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ success: boolean; data: Workspace[] }>(
        GET_WORKSPACES()
      )
      setData(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return {
    data,
    loading,
    error,
    fetchWorkspaces,
  }
}

export const useWorkspace = () => {
  const [data, setData] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchWorkspace = useCallback(async (workspaceId: string) => {
    setData(null)
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ success: boolean; data: Workspace }>(
        GET_WORKSPACE_BY_ID(workspaceId)
      )
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
    fetchWorkspace,
  }
}

