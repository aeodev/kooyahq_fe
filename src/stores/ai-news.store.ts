import { create } from 'zustand'
import axiosInstance from '@/utils/axios.instance'
import { GET_AI_NEWS } from '@/utils/api.routes'
import type { NewsItem, NewsFilter, NewsResponse } from '@/types/ai-news'

const LIMIT = 50

interface AINewsState {
  items: NewsItem[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  filter: NewsFilter
  pendingItems: NewsItem[]
  hasPendingItems: boolean
}

interface AINewsActions {
  fetchNews: (reset?: boolean) => Promise<void>
  loadMore: () => Promise<void>
  setFilter: (filter: NewsFilter) => void
  refreshBackground: () => Promise<void>
  showPendingItems: () => void
  reset: () => void
}

const initialState: AINewsState = {
  items: [],
  loading: false,
  loadingMore: false,
  error: null,
  hasMore: true,
  filter: 'all',
  pendingItems: [],
  hasPendingItems: false,
}

export const useAINewsStore = create<AINewsState & AINewsActions>((set, get) => ({
  ...initialState,

  fetchNews: async (reset = true) => {
    const { filter, loading, loadingMore } = get()
    if (loading || loadingMore) return

    set({ loading: true, error: null })
    if (reset) set({ items: [], hasMore: true })

    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: '0' })
      if (filter !== 'all') params.append('filter', filter)

      const { data } = await axiosInstance.get<NewsResponse>(`${GET_AI_NEWS()}?${params}`)

      set({
        items: data.data,
        hasMore: data.hasMore,
        loading: false,
        pendingItems: [],
        hasPendingItems: false,
      })
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to load news',
        loading: false,
      })
    }
  },

  loadMore: async () => {
    const { items, filter, hasMore, loading, loadingMore } = get()
    if (!hasMore || loading || loadingMore) return

    set({ loadingMore: true })

    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(items.length),
      })
      if (filter !== 'all') params.append('filter', filter)

      const { data } = await axiosInstance.get<NewsResponse>(`${GET_AI_NEWS()}?${params}`)

      set(state => ({
        items: [...state.items, ...data.data],
        hasMore: data.hasMore,
        loadingMore: false,
      }))
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to load more',
        loadingMore: false,
      })
    }
  },

  setFilter: (filter) => {
    if (get().filter === filter) return
    set({ filter })
    get().fetchNews(true)
  },

  refreshBackground: async () => {
    const { items, filter, loading, loadingMore } = get()
    if (loading || loadingMore || items.length === 0) return

    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: '0' })
      if (filter !== 'all') params.append('filter', filter)

      const { data } = await axiosInstance.get<NewsResponse>(`${GET_AI_NEWS()}?${params}`)

      const firstItemTime = new Date(items[0].publishedAt).getTime()
      const newItems = data.data.filter(
        (item: NewsItem) => new Date(item.publishedAt).getTime() > firstItemTime
      )

      if (newItems.length > 0) {
        set({ pendingItems: newItems, hasPendingItems: true })
      }
    } catch {
      // Silent fail for background refresh
    }
  },

  showPendingItems: () => {
    const { pendingItems } = get()
    if (pendingItems.length === 0) return

    set(state => ({
      items: [...pendingItems, ...state.items],
      pendingItems: [],
      hasPendingItems: false,
    }))
  },

  reset: () => set(initialState),
}))
