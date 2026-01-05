import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_ASSIGNED_TICKETS } from '@/utils/api.routes'
import type { Ticket } from '@/types/board'

export const ticketKeys = {
  all: ['tickets'] as const,
  assigned: () => [...ticketKeys.all, 'assigned'] as const,
}

export function useAssignedTicketsQuery(enabled = true) {
  return useQuery({
    queryKey: ticketKeys.assigned(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(GET_ASSIGNED_TICKETS())
      return response.data.data || []
    },
    enabled,
  })
}

export function useTicketQueryActions() {
  const queryClient = useQueryClient()

  const invalidateAssignedTickets = () => {
    queryClient.invalidateQueries({ queryKey: ticketKeys.assigned() })
  }

  return {
    invalidateAssignedTickets,
  }
}


