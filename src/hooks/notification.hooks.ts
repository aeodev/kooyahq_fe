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
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
      
      // Trigger custom event for NotificationBell to refresh
      window.dispatchEvent(new CustomEvent('notification:marked-read'))
      
      // Update server
      await axiosInstance.put(MARK_NOTIFICATION_READ(id))
      return true
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err)
      // Revert optimistic update on error
      const notification = notifications.find((n) => n.id === id)
      if (notification) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)))
        setUnreadCount((prev) => prev + 1)
      }
      return false
    }
  }, [notifications])

  const markAllAsRead = useCallback(async () => {
    // Store previous state for potential rollback
    let previousNotifications: Notification[] = []
    let previousUnreadCount = 0
    
    try {
      // Optimistic update
      setNotifications((prev) => {
        previousNotifications = [...prev]
        return prev.map((n) => ({ ...n, read: true }))
      })
      setUnreadCount((prev) => {
        previousUnreadCount = prev
        return 0
      })
      
      // Trigger custom event for NotificationBell to refresh
      window.dispatchEvent(new CustomEvent('notification:marked-read'))
      
      // Update server
      await axiosInstance.put(MARK_ALL_NOTIFICATIONS_READ())
      return true
    } catch (err: any) {
      console.error('Failed to mark all as read:', err)
      // Revert optimistic update on error
      setNotifications(previousNotifications)
      setUnreadCount(previousUnreadCount)
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

