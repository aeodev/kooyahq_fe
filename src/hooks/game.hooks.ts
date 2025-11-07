import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_GAME_TYPES, GET_MY_MATCHES, GET_ACTIVE_USERS, GET_LEADERBOARD } from '@/utils/api.routes'
import type { GameTypeInfo, GameMatch, ActiveUser, GameLeaderboardEntry } from '@/types/game'

export const useGameTypes = () => {
  const [gameTypes, setGameTypes] = useState<GameTypeInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGameTypes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: GameTypeInfo[] }>(GET_GAME_TYPES())
      setGameTypes(response.data.data)
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch game types'
      setError(errorMsg)
      console.error('Failed to fetch game types:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    gameTypes,
    loading,
    error,
    fetchGameTypes,
  }
}

export const useGameMatches = () => {
  const [matches, setMatches] = useState<GameMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: GameMatch[] }>(GET_MY_MATCHES())
      setMatches(response.data.data)
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch matches'
      setError(errorMsg)
      console.error('Failed to fetch matches:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    matches,
    loading,
    error,
    fetchMatches,
  }
}

export const useActiveUsers = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: ActiveUser[] }>(GET_ACTIVE_USERS())
      setActiveUsers(response.data.data)
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch active users'
      setError(errorMsg)
      console.error('Failed to fetch active users:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    activeUsers,
    loading,
    error,
    fetchActiveUsers,
    setActiveUsers,
  }
}

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<GameLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async (gameType: string, limit?: number) => {
    setLoading(true)
    setError(null)
    try {
      if (!gameType) {
        setError('Game type is required')
        return []
      }
      const response = await axiosInstance.get<{ status: string; data: GameLeaderboardEntry[] }>(
        GET_LEADERBOARD(gameType, limit)
      )
      setLeaderboard(response.data.data)
      return response.data.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch leaderboard'
      setError(errorMsg)
      console.error('Failed to fetch leaderboard:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    leaderboard,
    loading,
    error,
    fetchLeaderboard,
  }
}

