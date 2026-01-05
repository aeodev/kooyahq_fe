import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_PROJECTS } from '@/utils/api.routes'

type Project = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
}

export function useProjectsQuery(enabled = true) {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: Project[] }>(GET_PROJECTS())
      return response.data.data
    },
    enabled,
  })
}

export function useProjectQueryActions() {
  const queryClient = useQueryClient()

  const invalidateProjects = () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }

  return {
    invalidateProjects,
  }
}


