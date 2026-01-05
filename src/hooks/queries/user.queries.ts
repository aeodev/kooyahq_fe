import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_USERS } from '@/utils/api.routes'
import type { User } from '@/types/user'

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
}

export function useUsersQuery() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: User[] }>(GET_USERS())
      return response.data.data
    },
  })
}

export function useUserQueryActions() {
  const queryClient = useQueryClient()

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: userKeys.all })
  }

  return {
    invalidateUsers,
  }
}


