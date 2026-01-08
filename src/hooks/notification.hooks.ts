import { useCallback, useState, useEffect } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_NOTIFICATIONS, MARK_NOTIFICATION_READ, MARK_ALL_NOTIFICATIONS_READ, GET_UNREAD_COUNT } from '@/utils/api.routes'
import type { Notification } from '@/types/post'

const DEFAULT_PAGE_SIZE = 20

type FetchNotificationsOptions = {
  unreadOnly?: boolean
  page?: number
  limit?: number
  append?: boolean
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchNotifications = useCallback(async (options: boolean | FetchNotificationsOptions = false) => {
    const resolvedOptions = typeof options === 'boolean' ? { unreadOnly: options } : options ?? {}
    const unreadOnly = resolvedOptions.unreadOnly ?? false
    const nextPage = resolvedOptions.page ?? 1
    const nextLimit = resolvedOptions.limit ?? DEFAULT_PAGE_SIZE
    const append = resolvedOptions.append ?? false

    const shouldSetLoading = !append
    if (shouldSetLoading) {
      setLoading(true)
    }
    setError(null)
    try {
      const response = await axiosInstance.get(
        GET_NOTIFICATIONS({ unreadOnly, page: nextPage, limit: nextLimit })
      )
      const data = response.data.data || {}
      const nextNotifications = data.notifications || []
      const nextUnreadCount = data.unreadCount || 0
      const responsePage = typeof data.page === 'number' ? data.page : nextPage
      const responseLimit = typeof data.limit === 'number' ? data.limit : nextLimit
      const responseTotal = typeof data.total === 'number' ? data.total : nextNotifications.length
      const responseHasMore =
        typeof data.hasMore === 'boolean'
          ? data.hasMore
          : responsePage * responseLimit < responseTotal

      setNotifications((prev) => {
        if (!append) {
          return nextNotifications
        }
        if (nextNotifications.length === 0) {
          return prev
        }
        const merged = [...prev]
        const indexById = new Map(merged.map((notification, index) => [notification.id, index]))
        nextNotifications.forEach((notification: Notification) => {
          const existingIndex = indexById.get(notification.id)
          if (existingIndex === undefined) {
            merged.push(notification)
            indexById.set(notification.id, merged.length - 1)
          } else {
            merged[existingIndex] = notification
          }
        })
        return merged
      })
      setUnreadCount(nextUnreadCount)
      setPage(responsePage)
      setLimit(responseLimit)
      setTotal(responseTotal)
      setHasMore(responseHasMore)
      return data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch notifications'
      setError(errorMsg)
      console.error('Failed to fetch notifications:', err)
      return null
    } finally {
      if (shouldSetLoading) {
        setLoading(false)
      }
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
      let didAdd = false
      setNotifications((prev) => {
        if (prev.find((n) => n.id === notification.id)) {
          return prev
        }
        didAdd = true
        return [notification, ...prev]
      })
      if (didAdd) {
        setTotal((prev) => prev + 1)
      }
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
    page,
    limit,
    total,
    hasMore,
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
