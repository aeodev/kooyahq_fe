import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_UNREAD_COUNT } from '@/utils/api.routes'

export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
}

export function useUnreadCountQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: { count: number } }>(GET_UNREAD_COUNT())
      return response.data.data.count
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - notifications need fresher data
  })
}

export function useNotificationQueryActions() {
  const queryClient = useQueryClient()

  const invalidateUnreadCount = () => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
  }

  const setUnreadCount = (count: number) => {
    queryClient.setQueryData(notificationKeys.unreadCount(), count)
  }

  return {
    invalidateUnreadCount,
    setUnreadCount,
  }
}

