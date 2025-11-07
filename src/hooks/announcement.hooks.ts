import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_ANNOUNCEMENTS,
  CREATE_ANNOUNCEMENT,
  UPDATE_ANNOUNCEMENT,
  DELETE_ANNOUNCEMENT,
} from '@/utils/api.routes'
import type { Announcement, CreateAnnouncementInput, UpdateAnnouncementInput } from '@/types/announcement'

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnnouncements = useCallback(async (onlyActive = true) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: Announcement[] }>(
        GET_ANNOUNCEMENTS(onlyActive)
      )
      setAnnouncements(response.data.data)
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch announcements'
      setError(errorMsg)
      console.error('Failed to fetch announcements:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    announcements,
    loading,
    error,
    fetchAnnouncements,
  }
}

export const useCreateAnnouncement = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAnnouncement = useCallback(async (input: CreateAnnouncementInput) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.post<{ status: string; data: Announcement }>(
        CREATE_ANNOUNCEMENT(),
        input
      )
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create announcement'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createAnnouncement,
    loading,
    error,
  }
}

export const useUpdateAnnouncement = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateAnnouncement = useCallback(async (id: string, input: UpdateAnnouncementInput) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.patch<{ status: string; data: Announcement }>(
        UPDATE_ANNOUNCEMENT(id),
        input
      )
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update announcement'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    updateAnnouncement,
    loading,
    error,
  }
}

export const useDeleteAnnouncement = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteAnnouncement = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await axiosInstance.delete(DELETE_ANNOUNCEMENT(id))
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete announcement'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    deleteAnnouncement,
    loading,
    error,
  }
}

