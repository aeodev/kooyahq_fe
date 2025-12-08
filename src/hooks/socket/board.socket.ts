import type { Socket } from 'socket.io-client'
import type { Board } from '@/types/board'

export const BoardSocketEvents = {
  CREATED: 'board:created',
  UPDATED: 'board:updated',
  DELETED: 'board:deleted',
  FAVORITE_TOGGLED: 'board:favorite-toggled',
} as const

export type BoardSocketEvent = typeof BoardSocketEvents[keyof typeof BoardSocketEvents]

export function registerBoardHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: any[]) => void>,
  callbacks: {
    onBoardCreated?: (data: { board: Board; userId: string; timestamp: string }) => void
    onBoardUpdated?: (data: { board: Board; userId: string; timestamp: string }) => void
    onBoardDeleted?: (data: { boardId: string; userId: string; timestamp: string }) => void
    onBoardFavoriteToggled?: (data: { boardId: string; userId: string; isFavorite: boolean; timestamp: string }) => void
  }
): void {
  const handleBoardCreated = (data: { board: Board; userId: string; timestamp: string }) => {
    callbacks.onBoardCreated?.(data)
  }

  const handleBoardUpdated = (data: { board: Board; userId: string; timestamp: string }) => {
    callbacks.onBoardUpdated?.(data)
  }

  const handleBoardDeleted = (data: { boardId: string; userId: string; timestamp: string }) => {
    callbacks.onBoardDeleted?.(data)
  }

  const handleBoardFavoriteToggled = (data: { boardId: string; userId: string; isFavorite: boolean; timestamp: string }) => {
    callbacks.onBoardFavoriteToggled?.(data)
  }

  socket.on(BoardSocketEvents.CREATED, handleBoardCreated)
  socket.on(BoardSocketEvents.UPDATED, handleBoardUpdated)
  socket.on(BoardSocketEvents.DELETED, handleBoardDeleted)
  socket.on(BoardSocketEvents.FAVORITE_TOGGLED, handleBoardFavoriteToggled)

  eventHandlers.set(BoardSocketEvents.CREATED, handleBoardCreated)
  eventHandlers.set(BoardSocketEvents.UPDATED, handleBoardUpdated)
  eventHandlers.set(BoardSocketEvents.DELETED, handleBoardDeleted)
  eventHandlers.set(BoardSocketEvents.FAVORITE_TOGGLED, handleBoardFavoriteToggled)
}

