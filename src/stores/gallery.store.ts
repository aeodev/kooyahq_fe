import { create } from 'zustand'
import type { GalleryItem, PaginationMeta } from '@/types/gallery'

interface GalleryState {
  items: GalleryItem[]
  loading: boolean
  error: string | null
  pagination: PaginationMeta | null
  lastFetched: number | null
  selectedItems: string[]

  // Actions
  setItems: (items: GalleryItem[]) => void
  addItem: (item: GalleryItem) => void
  updateItem: (item: GalleryItem) => void
  deleteItem: (itemId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setPagination: (pagination: PaginationMeta | null) => void
  toggleSelection: (itemId: string) => void
  selectAll: (itemIds: string[]) => void
  clearSelection: () => void
}

export const useGalleryStore = create<GalleryState>((set) => ({
  items: [],
  loading: false,
  error: null,
  pagination: null,
  lastFetched: null,
  selectedItems: [],

  setItems: (items) => set({ items, lastFetched: Date.now(), error: null }),

  addItem: (item) => set((state) => ({
    items: [item, ...state.items]
  })),

  updateItem: (updatedItem) => set((state) => ({
    items: state.items.map((item) => item.id === updatedItem.id ? updatedItem : item)
  })),

  deleteItem: (itemId) => set((state) => ({
    items: state.items.filter((item) => item.id !== itemId),
    selectedItems: state.selectedItems.filter((id) => id !== itemId)
  })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  setPagination: (pagination) => set({ pagination }),

  toggleSelection: (itemId) => set((state) => ({
    selectedItems: state.selectedItems.includes(itemId)
      ? state.selectedItems.filter((id) => id !== itemId)
      : [...state.selectedItems, itemId]
  })),

  selectAll: (itemIds) => set({ selectedItems: itemIds }),

  clearSelection: () => set({ selectedItems: [] }),
}))

