import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_ANNOUNCEMENTS } from '@/utils/api.routes'

type Announcement = {
  id: string
  title: string
  content: string
  priority: 'low' | 'medium' | 'high'
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (onlyActive?: boolean) => [...announcementKeys.all, { onlyActive }] as const,
}

export function useAnnouncementsQuery(onlyActive = true) {
  return useQuery({
    queryKey: announcementKeys.list(onlyActive),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: Announcement[] }>(
        GET_ANNOUNCEMENTS(onlyActive)
      )
      return response.data.data
    },
  })
}

export function useAnnouncementQueryActions() {
  const queryClient = useQueryClient()

  const invalidateAnnouncements = () => {
    queryClient.invalidateQueries({ queryKey: announcementKeys.all })
  }

  return {
    invalidateAnnouncements,
  }
}

