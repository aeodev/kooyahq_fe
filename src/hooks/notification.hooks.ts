import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_NOTIFICATIONS, MARK_NOTIFICATION_READ, MARK_ALL_NOTIFICATIONS_READ, GET_UNREAD_COUNT } from '@/utils/api.routes'
import type { Notification } from '@/types/post'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async (showUnreadOnly = false) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get(GET_NOTIFICATIONS(showUnreadOnly))
      const data = response.data.data
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
      return data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch notifications'
      setError(errorMsg)
      console.error('Failed to fetch notifications:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await axiosInstance.put(MARK_NOTIFICATION_READ(id))
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
      return true
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err)
      return false
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await axiosInstance.put(MARK_ALL_NOTIFICATIONS_READ())
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      return true
    } catch (err: any) {
      console.error('Failed to mark all as read:', err)
      return false
    }
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  }
}

export const useUnreadCount = () => {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchCount = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.get(GET_UNREAD_COUNT())
      setCount(response.data.data.count || 0)
      return response.data.data.count || 0
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
      return 0
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    count,
    loading,
    fetchCount,
  }
}

