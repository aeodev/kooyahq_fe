import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axiosInstance from '@/utils/axios.instance'
import { PROFILE, SIGN_IN, SIGN_UP, UPDATE_PROFILE } from '@/utils/api.routes'
import { AUTH_STORAGE_KEY } from '@/utils/axios.instance'
import type { User } from '@/types/user'

type AuthResponse = {
  user: User
  token: string
}

type ApiEnvelope<T> = {
  status: string
  data: T
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  // Handle axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as { response?: { data?: { message?: string | string[]; error?: string }; status?: number } }

    if (axiosError.response?.data) {
      const data = axiosError.response.data
      // Check for message field
      if (data.message) {
        if (typeof data.message === 'string') {
          return data.message
        }
        if (Array.isArray(data.message)) {
          return data.message.join(', ')
        }
      }
      // Check for error field (alternative)
      if (data.error && typeof data.error === 'string') {
        return data.error
      }
    }

    // If no message but we have a status code, return generic message
    if (axiosError.response?.status === 401) {
      return 'Invalid credentials'
    }
    if (axiosError.response?.status === 404) {
      return 'Not found'
    }
    if (axiosError.response?.status === 403) {
      return 'Access denied'
    }
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message || fallback
  }

  // Handle objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string | string[] }).message
    if (typeof message === 'string') {
      return message
    }
    if (Array.isArray(message)) {
      return message.join(', ')
    }
  }

  return fallback
}

type AuthState = {
  user: User | null
  token: string | null
  isLoading: boolean
}

type AuthActions = {
  login: (payload: { email: string; password: string }) => Promise<User>
  register: (payload: { name: string; email: string; password: string }) => Promise<User>
  logout: () => void
  refreshProfile: () => Promise<void>
  updateStatus: (status: 'online' | 'busy' | 'away' | 'offline') => Promise<void>
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

const STORAGE_KEY = AUTH_STORAGE_KEY

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,

      setLoading: (loading) => set({ isLoading: loading }),

      login: async (payload) => {
        try {
          const response = await axiosInstance.post<ApiEnvelope<AuthResponse>>(SIGN_IN(), payload)
          const { user, token } = response.data.data

          set({ user, token, isLoading: false })
          return user
        } catch (error) {
          set({ isLoading: false })
          throw new Error(resolveErrorMessage(error, 'Unable to sign in'))
        }
      },

      register: async (payload) => {
        try {
          const response = await axiosInstance.post<ApiEnvelope<AuthResponse>>(SIGN_UP(), payload)
          const { user, token } = response.data.data

          set({ user, token, isLoading: false })
          return user
        } catch (error) {
          set({ isLoading: false })
          throw new Error(resolveErrorMessage(error, 'Unable to create account'))
        }
      },

      logout: () => {
        set({ user: null, token: null, isLoading: false })
      },

      refreshProfile: async () => {
        const { token } = get()
        if (!token) {
          set({ isLoading: false })
          return
        }

        try {
          const response = await axiosInstance.get<ApiEnvelope<{ user: User | null }>>(PROFILE())
          const user = response.data.data?.user ?? null

          if (user) {
            set({ user, isLoading: false })
          } else {
            get().logout()
          }
        } catch {
          get().logout()
        }
      },

      updateStatus: async (status: 'online' | 'busy' | 'away' | 'offline') => {
        const { user } = get()
        if (!user) return

        // Optimistic update
        set({ user: { ...user, status } })

        try {
          await axiosInstance.put(UPDATE_PROFILE(), { status })
        } catch (error) {
          // Revert if failed (optional, but good practice)
          // For status, silent fail is usually okay, but we can verify later
          console.error('Failed to update status', error)
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        // Hydrate on mount
        if (state?.token) {
          // Refresh profile to get fresh user data
          state.refreshProfile().finally(() => {
            state.setLoading(false)
          })
        } else {
          state?.setLoading(false)
        }
      },
    }
  )
)

