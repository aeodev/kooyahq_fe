import type { Socket } from 'socket.io-client'

/**
 * Register socket handlers for announcement module
 * Called when socket connects
 */
export function registerAnnouncementHandlers(socket: Socket, eventHandlers: Map<string, (...args: any[]) => void>): void {
  const handleAnnouncementCreated = (data: { announcement: unknown; timestamp: string }) => {
    // Dispatch custom event that hooks can listen to
    window.dispatchEvent(new CustomEvent('announcement:created', { detail: data }))
  }

  socket.on('announcement:created', handleAnnouncementCreated)

  eventHandlers.set('announcement:created', handleAnnouncementCreated)
}


