import { useEffect, useRef, useCallback } from 'react'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'

interface MoveData {
  index?: number
  player?: string | 'X' | 'O' | null
  [key: string]: unknown
}

export interface GameMoveEvent {
  userId: string
  gameId: string
  move: MoveData
  timestamp?: string
}

interface UseMultiplayerGameOptions {
  gameId: string | null | undefined
  enabled: boolean
  onMoveReceived?: (data: GameMoveEvent) => void
  onStateRequested?: (gameId: string) => void
}

export function useMultiplayerGame({
  gameId,
  enabled,
  onMoveReceived,
  onStateRequested,
}: UseMultiplayerGameOptions) {
  const socket = useSocketStore((state) => state.socket)
  const user = useAuthStore((state) => state.user)
  const gameIdRef = useRef<string | null>(null)
  const isConnectedRef = useRef(false)

  // Join/leave game room
  useEffect(() => {
    if (!enabled || !gameId || !socket?.connected || !user) {
      return
    }

    gameIdRef.current = gameId
    isConnectedRef.current = true

    // Join game room
    socket.emit('game:join', gameId)

    return () => {
      if (gameIdRef.current) {
        socket.emit('game:leave', gameIdRef.current)
      }
      gameIdRef.current = null
      isConnectedRef.current = false
    }
  }, [enabled, gameId, socket, user])

  // Listen for move updates
  useEffect(() => {
    if (!enabled || !socket?.connected || !gameId || !onMoveReceived) {
      return
    }

    const handleMoveUpdate = (data: GameMoveEvent) => {
      // Ignore moves from self
      if (data.userId === user?.id || data.gameId !== gameId) {
        return
      }
      onMoveReceived(data)
    }

    socket.on('game:move-update', handleMoveUpdate)

    return () => {
      socket.off('game:move-update', handleMoveUpdate)
    }
  }, [enabled, socket, gameId, user?.id, onMoveReceived])

  // Listen for state requests
  useEffect(() => {
    if (!enabled || !socket?.connected || !gameId || !onStateRequested) {
      return
    }

    const handleStateRequest = (gameId: string) => {
      onStateRequested(gameId)
    }

    socket.on('game:state-requested', handleStateRequest)

    return () => {
      socket.off('game:state-requested', handleStateRequest)
    }
  }, [enabled, socket, gameId, onStateRequested])

  const sendMove = useCallback(
    (move: MoveData) => {
      if (!socket?.connected || !gameId || !isConnectedRef.current) {
        return false
      }

      socket.emit('game:move', {
        gameId,
        move,
      })
      return true
    },
    [socket, gameId]
  )

  const requestState = useCallback(
    (targetGameId: string) => {
      if (!socket?.connected) {
        return false
      }

      socket.emit('game:request-state', targetGameId)
      return true
    },
    [socket]
  )

  const isConnected = socket?.connected && isConnectedRef.current && enabled

  return {
    isConnected,
    sendMove,
    requestState,
  }
}

