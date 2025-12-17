import type { Socket } from 'socket.io-client'
import type { Ticket } from '@/types/board'

export const TicketSocketEvents = {
  CREATED: 'ticket:created',
  UPDATED: 'ticket:updated',
  DELETED: 'ticket:deleted',
} as const

export type TicketSocketEvent = typeof TicketSocketEvents[keyof typeof TicketSocketEvents]

export function registerTicketHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: any[]) => void>,
  callbacks: {
    onTicketCreated?: (data: { ticket: Ticket; userId: string; timestamp: string }) => void
    onTicketUpdated?: (data: { ticket: Ticket; userId: string; timestamp: string }) => void
    onTicketDeleted?: (data: { ticketId: string; boardId: string; userId: string; timestamp: string }) => void
  }
): void {
  const handleTicketCreated = (data: { ticket: Ticket; userId: string; timestamp: string }) => {
    callbacks.onTicketCreated?.(data)
  }

  const handleTicketUpdated = (data: { ticket: Ticket; userId: string; timestamp: string }) => {
    callbacks.onTicketUpdated?.(data)
  }

  const handleTicketDeleted = (data: { ticketId: string; boardId: string; userId: string; timestamp: string }) => {
    callbacks.onTicketDeleted?.(data)
  }

  socket.on(TicketSocketEvents.CREATED, handleTicketCreated)
  socket.on(TicketSocketEvents.UPDATED, handleTicketUpdated)
  socket.on(TicketSocketEvents.DELETED, handleTicketDeleted)

  eventHandlers.set(TicketSocketEvents.CREATED, handleTicketCreated)
  eventHandlers.set(TicketSocketEvents.UPDATED, handleTicketUpdated)
  eventHandlers.set(TicketSocketEvents.DELETED, handleTicketDeleted)
}


