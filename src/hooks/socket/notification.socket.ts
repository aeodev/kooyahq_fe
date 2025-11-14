import type { Socket } from 'socket.io-client'

/**
 * Register socket handlers for notification module
 * Called when socket connects
 */
export function registerNotificationHandlers(socket: Socket, eventHandlers: Map<string, (...args: any[]) => void>): void {
  const handleNotificationNew = (data: { notification: unknown; unreadCount: number }) => {
    window.dispatchEvent(new CustomEvent('notification:new', { detail: data }))
  }

  const handleNotificationRead = (data: { notificationId: string; unreadCount: number }) => {
    window.dispatchEvent(new CustomEvent('notification:read', { detail: data }))
  }

  const handleNotificationAllRead = (data: { unreadCount: number }) => {
    window.dispatchEvent(new CustomEvent('notification:all-read', { detail: data }))
  }

  socket.on('notification:new', handleNotificationNew)
  socket.on('notification:read', handleNotificationRead)
  socket.on('notification:all-read', handleNotificationAllRead)

  eventHandlers.set('notification:new', handleNotificationNew)
  eventHandlers.set('notification:read', handleNotificationRead)
  eventHandlers.set('notification:all-read', handleNotificationAllRead)
}

