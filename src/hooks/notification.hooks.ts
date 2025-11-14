import { useCallback, useState, useEffect } from 'react'
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

  // Listen for socket events
  useEffect(() => {
    const handleNotificationNew = (event: Event) => {
      const customEvent = event as CustomEvent<{ notification: Notification; unreadCount: number }>
      const { notification, unreadCount } = customEvent.detail
      setUnreadCount(unreadCount)
      // Add new notification to the list if it's not already there
      setNotifications((prev) => {
        if (prev.find((n) => n.id === notification.id)) {
          return prev
        }
        return [notification, ...prev]
      })
    }

    const handleNotificationRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ notificationId: string; unreadCount: number }>
      const { notificationId, unreadCount } = customEvent.detail
      setUnreadCount(unreadCount)
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
    }

    const handleNotificationAllRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ unreadCount: number }>
      const { unreadCount } = customEvent.detail
      setUnreadCount(unreadCount)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }

    window.addEventListener('notification:new', handleNotificationNew)
    window.addEventListener('notification:read', handleNotificationRead)
    window.addEventListener('notification:all-read', handleNotificationAllRead)

    return () => {
      window.removeEventListener('notification:new', handleNotificationNew)
      window.removeEventListener('notification:read', handleNotificationRead)
      window.removeEventListener('notification:all-read', handleNotificationAllRead)
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

  // Listen for socket events to update count in real-time
  useEffect(() => {
    const handleNotificationNew = (event: Event) => {
      const customEvent = event as CustomEvent<{ notification: unknown; unreadCount: number }>
      setCount(customEvent.detail.unreadCount)
    }

    const handleNotificationRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ notificationId: string; unreadCount: number }>
      setCount(customEvent.detail.unreadCount)
    }

    const handleNotificationAllRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ unreadCount: number }>
      setCount(customEvent.detail.unreadCount)
    }

    window.addEventListener('notification:new', handleNotificationNew)
    window.addEventListener('notification:read', handleNotificationRead)
    window.addEventListener('notification:all-read', handleNotificationAllRead)

    return () => {
      window.removeEventListener('notification:new', handleNotificationNew)
      window.removeEventListener('notification:read', handleNotificationRead)
      window.removeEventListener('notification:all-read', handleNotificationAllRead)
    }
  }, [])

  return {
    count,
    loading,
    fetchCount,
  }
}

