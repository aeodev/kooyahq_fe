import { useCallback } from 'react'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_GALLERY_ITEMS,
  CREATE_GALLERY_ITEM,
  CREATE_GALLERY_MULTIPLE,
  UPDATE_GALLERY_ITEM,
  DELETE_GALLERY_ITEM,
  DELETE_GALLERY_ITEMS_BATCH,
} from '@/utils/api.routes'
import type { GalleryItem, UpdateGalleryItemInput, GallerySearchParams } from '@/types/gallery'
import { useGalleryStore } from '@/stores/gallery.store'

export const useGallery = () => {
  const {
    items,
    loading,
    error,
    pagination,
    selectedItems,
    setItems,
    addItem,
    updateItem,
    deleteItem,
    setLoading,
    setError,
    setPagination,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useGalleryStore()

  const fetchGalleryItems = useCallback(async (params?: GallerySearchParams) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: GalleryItem[] | { data: GalleryItem[]; pagination: any } }>(GET_GALLERY_ITEMS(params))
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response.data.data)) {
        setItems(response.data.data)
        setPagination(null)
        return response.data.data
      } else {
        const paginatedData = response.data.data as { data: GalleryItem[]; pagination: any }
        setItems(paginatedData.data)
        setPagination(paginatedData.pagination)
        return paginatedData.data
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch gallery items'
      setError(errorMsg)
      console.error('Failed to fetch gallery items:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [setItems, setLoading, setError, setPagination])

  const createGalleryItem = useCallback(async (file: File, title: string, description?: string) => {
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''))
      if (description) {
        formData.append('description', description)
      }

      const response = await axiosInstance.post(CREATE_GALLERY_ITEM(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const newItem = response.data.data
      addItem(newItem)
      return newItem
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create gallery item'
      console.error('Failed to create gallery item:', err)
      throw new Error(errorMsg)
    }
  }, [addItem])

  const createMultipleGalleryItems = useCallback(async (files: Array<{ file: File; title: string; description?: string }>) => {
    try {
      const formData = new FormData()
      files.forEach((uploadFile, index) => {
        formData.append('images', uploadFile.file)
        formData.append(`title-${index}`, uploadFile.title || uploadFile.file.name.replace(/\.[^/.]+$/, ''))
        if (uploadFile.description) {
          formData.append(`description-${index}`, uploadFile.description)
        }
      })

      const response = await axiosInstance.post(CREATE_GALLERY_MULTIPLE(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const newItems = response.data.data || []
      newItems.forEach((item: GalleryItem) => addItem(item))
      return newItems
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create gallery items'
      console.error('Failed to create gallery items:', err)
      throw new Error(errorMsg)
    }
  }, [addItem])

  const updateGalleryItem = useCallback(async (id: string, updates: UpdateGalleryItemInput) => {
    try {
      const response = await axiosInstance.put(UPDATE_GALLERY_ITEM(id), updates)
      const updatedItem = response.data.data
      updateItem(updatedItem)
      return updatedItem
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update gallery item'
      console.error('Failed to update gallery item:', err)
      throw new Error(errorMsg)
    }
  }, [updateItem])

  const deleteGalleryItem = useCallback(async (id: string) => {
    try {
      await axiosInstance.delete(DELETE_GALLERY_ITEM(id))
      deleteItem(id)
      return true
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete gallery item'
      console.error('Failed to delete gallery item:', err)
      throw new Error(errorMsg)
    }
  }, [deleteItem])

  const deleteMultipleGalleryItems = useCallback(async (ids: string[]) => {
    try {
      await axiosInstance.delete(DELETE_GALLERY_ITEMS_BATCH(), { data: { ids } })
      ids.forEach((id) => deleteItem(id))
      clearSelection()
      return true
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete gallery items'
      console.error('Failed to delete gallery items:', err)
      throw new Error(errorMsg)
    }
  }, [deleteItem, clearSelection])

  return {
    items,
    loading,
    error,
    pagination,
    selectedItems,
    fetchGalleryItems,
    createGalleryItem,
    createMultipleGalleryItems,
    updateGalleryItem,
    deleteGalleryItem,
    deleteMultipleGalleryItems,
    toggleSelection,
    selectAll,
    clearSelection,
  }
}

