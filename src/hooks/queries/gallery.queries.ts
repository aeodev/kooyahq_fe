import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_GALLERY_ITEMS } from '@/utils/api.routes'
import type { GalleryItem, GallerySearchParams } from '@/types/gallery'

export const galleryKeys = {
  all: ['gallery'] as const,
  list: (params?: GallerySearchParams) => [...galleryKeys.all, 'list', params] as const,
}

type GalleryResponse = {
  status: string
  data: GalleryItem[] | { data: GalleryItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
}

export function useGalleryQuery(params?: GallerySearchParams) {
  return useQuery({
    queryKey: galleryKeys.list(params),
    queryFn: async () => {
      const response = await axiosInstance.get<GalleryResponse>(GET_GALLERY_ITEMS(params))
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response.data.data)) {
        return { items: response.data.data, pagination: null }
      } else {
        const paginatedData = response.data.data as { data: GalleryItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
        return { items: paginatedData.data, pagination: paginatedData.pagination }
      }
    },
    enabled: params !== undefined, // Only run when params are provided
  })
}

export function useGalleryQueryActions() {
  const queryClient = useQueryClient()

  const invalidateGallery = () => {
    queryClient.invalidateQueries({ queryKey: galleryKeys.all })
  }

  const addItemToCache = (item: GalleryItem, params?: GallerySearchParams) => {
    queryClient.setQueryData<{ items: GalleryItem[]; pagination: unknown }>(
      galleryKeys.list(params),
      (old) => {
        if (!old) return { items: [item], pagination: null }
        return { ...old, items: [item, ...old.items] }
      }
    )
  }

  const removeItemFromCache = (itemId: string) => {
    queryClient.setQueriesData<{ items: GalleryItem[]; pagination: unknown }>(
      { queryKey: galleryKeys.all },
      (old) => {
        if (!old) return old
        return { ...old, items: old.items.filter((item) => item.id !== itemId) }
      }
    )
  }

  return {
    invalidateGallery,
    addItemToCache,
    removeItemFromCache,
  }
}

