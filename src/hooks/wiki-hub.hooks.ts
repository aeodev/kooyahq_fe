import { useState, useCallback, useEffect } from 'react'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_PAGES,
  GET_PAGE,
  CREATE_PAGE,
  UPDATE_PAGE,
  DELETE_PAGE,
  SEARCH_PAGES,
  GET_TEMPLATES,
  GET_FAVORITES,
  PIN_PAGE,
  UNPIN_PAGE,
  FAVORITE_PAGE,
  UNFAVORITE_PAGE,
} from '@/utils/api.routes'

export interface Page {
  id: string
  workspaceId: string
  title: string
  content: Record<string, any>
  authorId: string
  parentPageId?: string
  status: 'draft' | 'published'
  templateId?: string
  tags: string[]
  category?: string
  isPinned: boolean
  favorites: Array<{
    userId: string
    favoritedAt: string
  }>
  linkedTicketIds: string[]
  linkedProjectIds: string[]
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  name: string
  workspaceId?: string
  fieldsStructure: Record<string, any>
  defaultContent: Record<string, any>
  category: 'sop' | 'meeting' | 'project' | 'bug' | 'strategy'
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

export const usePages = (workspaceId: string | undefined) => {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPages = useCallback(async () => {
    if (!workspaceId) {
      setPages([])
      return []
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axiosInstance.get<ApiResponse<Page[]>>(GET_PAGES(workspaceId))
      setPages(response.data.data)
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to fetch pages'
      setError(errorMsg)
      console.error('Failed to fetch pages:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (workspaceId) {
      fetchPages()
    }
  }, [workspaceId, fetchPages])

  const createPage = useCallback(async (data: {
    workspaceId: string
    title: string
    content?: Record<string, any>
    parentPageId?: string
    status?: 'draft' | 'published'
    templateId?: string
    tags?: string[]
    category?: string
  }) => {
    try {
      const response = await axiosInstance.post<ApiResponse<Page>>(CREATE_PAGE(), data)
      const newPage = response.data.data
      setPages((prev) => [newPage, ...prev])
      return newPage
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to create page'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const updatePage = useCallback(async (pageId: string, updates: {
    title?: string
    content?: Record<string, any>
    status?: 'draft' | 'published'
    tags?: string[]
    category?: string
  }) => {
    try {
      const response = await axiosInstance.put<ApiResponse<Page>>(UPDATE_PAGE(pageId), updates)
      const updatedPage = response.data.data
      setPages((prev) => prev.map((p) => (p.id === pageId ? updatedPage : p)))
      return updatedPage
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to update page'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const deletePage = useCallback(async (pageId: string) => {
    try {
      await axiosInstance.delete(DELETE_PAGE(pageId))
      setPages((prev) => prev.filter((p) => p.id !== pageId))
      return true
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to delete page'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const searchPages = useCallback(async (query: string) => {
    if (!workspaceId || !query.trim()) {
      await fetchPages()
      return []
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axiosInstance.get<ApiResponse<Page[]>>(SEARCH_PAGES(workspaceId, query))
      const results = response.data.data
      setPages(results)
      return results
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to search pages'
      setError(errorMsg)
      return []
    } finally {
      setLoading(false)
    }
  }, [workspaceId, fetchPages])

  return {
    pages,
    loading,
    error,
    fetchPages,
    createPage,
    updatePage,
    deletePage,
    searchPages,
  }
}

export const useTemplates = (workspaceId?: string) => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axiosInstance.get<ApiResponse<Template[]>>(GET_TEMPLATES(workspaceId))
      setTemplates(response.data.data)
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to fetch templates'
      setError(errorMsg)
      console.error('Failed to fetch templates:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    loading,
    error,
    fetchTemplates,
  }
}

export const usePage = (pageId: string | undefined) => {
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async () => {
    if (!pageId) {
      setPage(null)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axiosInstance.get<ApiResponse<Page>>(GET_PAGE(pageId))
      setPage(response.data.data)
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to fetch page'
      setError(errorMsg)
      console.error('Failed to fetch page:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    if (pageId) {
      fetchPage()
    }
  }, [pageId, fetchPage])

  const pinPage = useCallback(async () => {
    if (!pageId) return
    try {
      await axiosInstance.post(PIN_PAGE(pageId))
      await fetchPage()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to pin page'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [pageId, fetchPage])

  const unpinPage = useCallback(async () => {
    if (!pageId) return
    try {
      await axiosInstance.post(UNPIN_PAGE(pageId))
      await fetchPage()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to unpin page'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [pageId, fetchPage])

  const favoritePage = useCallback(async () => {
    if (!pageId) return
    try {
      await axiosInstance.post(FAVORITE_PAGE(pageId))
      await fetchPage()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to favorite page'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [pageId, fetchPage])

  const unfavoritePage = useCallback(async () => {
    if (!pageId) return
    try {
      await axiosInstance.post(UNFAVORITE_PAGE(pageId))
      await fetchPage()
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to unfavorite page'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [pageId, fetchPage])

  return {
    page,
    loading,
    error,
    fetchPage,
    pinPage,
    unpinPage,
    favoritePage,
    unfavoritePage,
  }
}
