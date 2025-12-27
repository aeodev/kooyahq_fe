import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_GAME_TYPES, GET_MY_MATCHES, GET_ACTIVE_USERS } from '@/utils/api.routes'
import type { GameTypeInfo, GameMatch, ActiveUser } from '@/types/game'

export const gameKeys = {
  all: ['games'] as const,
  types: () => [...gameKeys.all, 'types'] as const,
  matches: () => [...gameKeys.all, 'matches'] as const,
  activeUsers: () => [...gameKeys.all, 'activeUsers'] as const,
}

export function useGameTypesQuery() {
  return useQuery({
    queryKey: gameKeys.types(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: GameTypeInfo[] }>(GET_GAME_TYPES())
      return response.data.data
    },
  })
}

export function useGameMatchesQuery() {
  return useQuery({
    queryKey: gameKeys.matches(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: GameMatch[] }>(GET_MY_MATCHES())
      return response.data.data
    },
  })
}

export function useActiveUsersQuery() {
  return useQuery({
    queryKey: gameKeys.activeUsers(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: ActiveUser[] }>(GET_ACTIVE_USERS())
      return response.data.data
    },
    // Active users can change frequently, use shorter stale time
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useGameQueryActions() {
  const queryClient = useQueryClient()

  const setActiveUsers = (users: ActiveUser[]) => {
    queryClient.setQueryData<ActiveUser[]>(gameKeys.activeUsers(), users)
  }

  const invalidateMatches = () => {
    queryClient.invalidateQueries({ queryKey: gameKeys.matches() })
  }

  return {
    setActiveUsers,
    invalidateMatches,
  }
}

