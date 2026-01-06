import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axiosInstance from '@/utils/axios.instance'
import { PROFILE, SIGN_IN_WITH_GOOGLE, AUTH_REFRESH, AUTH_LOGOUT, UPDATE_PROFILE } from '@/utils/api.routes'
import { AUTH_STORAGE_KEY } from '@/utils/axios.instance'
import { clearAccessToken, setAccessToken, subscribeAccessToken } from '@/utils/auth-token'
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
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as { response?: { data?: { message?: string | string[]; error?: string }; status?: number } }

    if (axiosError.response?.data) {
      const data = axiosError.response.data
      if (data.message) {
        if (typeof data.message === 'string') {
          return data.message
        }
        if (Array.isArray(data.message)) {
          return data.message.join(', ')
        }
      }
      if (data.error && typeof data.error === 'string') {
        return data.error
      }
    }

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

  if (error instanceof Error) {
    return error.message || fallback
  }

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
  loginWithGoogle: (credential: string) => Promise<User>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateStatus: (status: 'online' | 'busy' | 'away' | 'offline') => Promise<void>
  setLoading: (loading: boolean) => void
  can: (permission: string) => boolean
}

type AuthStore = AuthState & AuthActions

const STORAGE_KEY = AUTH_STORAGE_KEY

function prepareUser(user: User): User {
  const permissions = Array.isArray(user.permissions) ? user.permissions : []
  return {
    ...user,
    permissions,
  }
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      subscribeAccessToken((token) => {
        set((state) => ({
          token,
          user: token ? state.user : (state.isLoading ? state.user : null),
        }))
      })

      return {
        user: null,
        token: null,
        isLoading: true,

        setLoading: (loading) => set({ isLoading: loading }),

        loginWithGoogle: async (credential) => {
          try {
            const response = await axiosInstance.post<ApiEnvelope<AuthResponse>>(SIGN_IN_WITH_GOOGLE(), {
              credential,
            })
            const { user, token } = response.data.data

            const prepared = prepareUser(user)
            setAccessToken(token)
            set({ user: prepared, token, isLoading: false })
            return prepared
          } catch (error) {
            set({ isLoading: false })
            throw new Error(resolveErrorMessage(error, 'Unable to sign in with Google'))
          }
        },

        logout: async () => {
          try {
            await axiosInstance.post(AUTH_LOGOUT())
          } catch {
            // Ignore logout errors; client still clears session.
          } finally {
            clearAccessToken()
            set({ user: null, token: null, isLoading: false })
          }
        },

        refreshSession: async () => {
          try {
            const response = await axiosInstance.post<ApiEnvelope<AuthResponse>>(AUTH_REFRESH())
            const { user, token } = response.data.data
            const prepared = prepareUser(user)
            setAccessToken(token)
            set({ user: prepared, token, isLoading: false })
          } catch {
            clearAccessToken()
            set({ user: null, token: null, isLoading: false })
          }
        },

        refreshProfile: async () => {
          const { token } = get()
          if (!token) {
            set({ isLoading: false })
            return
          }

          try {
            const response = await axiosInstance.get<ApiEnvelope<{ user: User | null }>>(PROFILE())
            const user = response.data.data?.user ? prepareUser(response.data.data.user) : null

            if (user) {
              set({ user, isLoading: false })
            } else {
              await get().logout()
            }
          } catch {
            await get().logout()
          }
        },

        updateStatus: async (status: 'online' | 'busy' | 'away' | 'offline') => {
          const { user } = get()
          if (!user) return

          set({ user: { ...user, status } })

          try {
            await axiosInstance.put(UPDATE_PROFILE(), { status })
          } catch (error) {
            console.error('Failed to update status', error)
          }
        },

        can: (permission: string) => {
          const { user } = get()
          if (!user) return false
          const perms = Array.isArray(user.permissions) ? user.permissions : []
          if (perms.includes('system:fullAccess')) return true
          if (perms.includes(permission)) return true
          const targetPrefix = permission.split(':')[0]
          const prefixFull = `${targetPrefix}:fullAccess`
          return perms.includes(prefixFull)
        },
      }
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.refreshSession().finally(() => {
          state?.setLoading(false)
        })
      },
    }
  )
)
