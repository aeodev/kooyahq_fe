import type { Socket } from 'socket.io-client'
import type { Ticket } from '@/types/board'

export const TicketSocketEvents = {
  MOVED: 'ticket:moved',
  UPDATED: 'ticket:updated',
  CREATED: 'ticket:created',
  DELETED: 'ticket:deleted',
} as const

export type TicketSocketEvent = typeof TicketSocketEvents[keyof typeof TicketSocketEvents]

export function registerTicketHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: any[]) => void>,
  callbacks: {
    onTicketMoved?: (data: { ticket: Ticket; boardId: string; oldColumnId: string; newColumnId: string; userId: string; timestamp: string }) => void
    onTicketUpdated?: (data: { ticket: Ticket; userId: string; timestamp: string }) => void
    onTicketCreated?: (data: { ticket: Ticket; userId: string; timestamp: string }) => void
    onTicketDeleted?: (data: { ticketId: string; boardId: string; userId: string; timestamp: string }) => void
  }
): void {
  const handleTicketMoved = (data: { ticket: Ticket; boardId: string; oldColumnId: string; newColumnId: string; userId: string; timestamp: string }) => {
    callbacks.onTicketMoved?.(data)
  }

  const handleTicketUpdated = (data: { ticket: Ticket; userId: string; timestamp: string }) => {
    callbacks.onTicketUpdated?.(data)
  }

  const handleTicketCreated = (data: { ticket: Ticket; userId: string; timestamp: string }) => {
    callbacks.onTicketCreated?.(data)
  }

  const handleTicketDeleted = (data: { ticketId: string; boardId: string; userId: string; timestamp: string }) => {
    callbacks.onTicketDeleted?.(data)
  }

  socket.on(TicketSocketEvents.MOVED, handleTicketMoved)
  socket.on(TicketSocketEvents.UPDATED, handleTicketUpdated)
  socket.on(TicketSocketEvents.CREATED, handleTicketCreated)
  socket.on(TicketSocketEvents.DELETED, handleTicketDeleted)

  eventHandlers.set(TicketSocketEvents.MOVED, handleTicketMoved)
  eventHandlers.set(TicketSocketEvents.UPDATED, handleTicketUpdated)
  eventHandlers.set(TicketSocketEvents.CREATED, handleTicketCreated)
  eventHandlers.set(TicketSocketEvents.DELETED, handleTicketDeleted)
}


