import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_ANNOUNCEMENTS } from '@/utils/api.routes'
import type { Announcement } from '@/types/announcement'

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

