import { useState, useCallback } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { CREATE_MATCH, UPDATE_MATCH, GET_MY_ACTIVE_MATCHES, GET_MATCH } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import type { GameMatch, GameType } from '@/types/game'

interface CreateMatchOptions {
  gameType: GameType
  players: string[]
  status?: 'in-progress'
  metadata?: Record<string, unknown>
}

interface UpdateMatchOptions {
  status?: 'in-progress' | 'completed'
  winner?: string
  scores?: Record<string, number>
  metadata?: Record<string, unknown>
  startedAt?: string
  endedAt?: string
}

export function useGameMatch() {
  const user = useAuthStore((state) => state.user)
  const [match, setMatch] = useState<GameMatch | null>(null)
  const [loading, setLoading] = useState(false)

  const findOrCreateMatch = useCallback(
    async (options: CreateMatchOptions): Promise<GameMatch | null> => {
      if (!user) return null

      const { gameType, players, status = 'in-progress', metadata = {} } = options

      try {
        setLoading(true)

        // Sort player IDs to ensure consistent match lookup
        const sortedPlayers = [...players].sort()

        // First, check for existing active match between these players
        try {
          const activeMatchesResponse = await axiosInstance.get(GET_MY_ACTIVE_MATCHES())
          const activeMatches = activeMatchesResponse.data.data || []

          // Find match with both players
          const existingMatch = activeMatches.find((m: GameMatch) => {
            const matchPlayers = (m.players || []).sort()
            return (
              matchPlayers.length === sortedPlayers.length &&
              matchPlayers.every((p, i) => p === sortedPlayers[i]) &&
              m.gameType === gameType &&
              m.status === 'in-progress'
            )
          })

          if (existingMatch) {
            // Found existing match - join it
            setMatch(existingMatch)

            return existingMatch
          }
        } catch (error) {
          console.error('Failed to fetch active matches:', error)
          // Continue to create new match
        }

        // No existing match found - create a new one
        const response = await axiosInstance.post(CREATE_MATCH(), {
          gameType,
          players: sortedPlayers,
          status,
          metadata,
          startedAt: new Date().toISOString(),
        })
        const createdMatch = response.data.data
        setMatch(createdMatch)
        return createdMatch
      } catch (error) {
        console.error('Failed to find or create match:', error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  const createMatch = useCallback(
    async (options: CreateMatchOptions): Promise<GameMatch | null> => {
      if (!user) return null

      const { gameType, players, status = 'in-progress', metadata = {} } = options

      try {
        setLoading(true)
        const response = await axiosInstance.post(CREATE_MATCH(), {
          gameType,
          players,
          status,
          metadata,
          startedAt: new Date().toISOString(),
        })
        const createdMatch = response.data.data
        setMatch(createdMatch)
        return createdMatch
      } catch (error) {
        console.error('Failed to create match:', error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  const updateMatch = useCallback(
    async (matchId: string, options: UpdateMatchOptions): Promise<GameMatch | null> => {
      if (!user) return null

      try {
        const response = await axiosInstance.patch(UPDATE_MATCH(matchId), options)
        const updatedMatch = response.data.data
        setMatch((prev) => (prev?.id === matchId ? updatedMatch : prev))
        return updatedMatch
      } catch (error) {
        console.error('Failed to update match:', error)
        return null
      }
    },
    [user]
  )

  const completeMatch = useCallback(
    async (
      matchId: string,
      winnerId?: string,
      scores?: Record<string, number>,
      metadata?: Record<string, unknown>
    ): Promise<GameMatch | null> => {
      return updateMatch(matchId, {
        status: 'completed',
        winner: winnerId,
        scores,
        metadata,
        endedAt: new Date().toISOString(),
      })
    },
    [updateMatch]
  )

  const clearMatch = useCallback(() => {
    setMatch(null)
  }, [])

  const refreshCurrentMatch = useCallback(async (): Promise<GameMatch | null> => {
    if (!match?.id) return null
    try {
      const response = await axiosInstance.get<{ status: string; data: GameMatch }>(GET_MATCH(match.id))
      const refreshed = response.data.data
      setMatch(refreshed)
      return refreshed
    } catch (error: any) {
      console.error('Failed to refresh match:', error)
      return null
    }
  }, [match?.id])

  return {
    match,
    loading,
    findOrCreateMatch,
    createMatch,
    updateMatch,
    completeMatch,
    clearMatch,
    setMatch,
    refreshCurrentMatch,
  }
}



