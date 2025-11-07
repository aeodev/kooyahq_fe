import axios from 'axios'
import { BASE_URL } from '@/utils/api.routes'

export const AUTH_STORAGE_KEY = 'kooyahq.auth'

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

// Get token from store state (this will be hydrated by persist middleware)
const getTokenFromStore = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null
    
    const parsed = JSON.parse(stored) as { state?: { token?: string | null }; token?: string | null }
    
    // Zustand persist format: { state: { token, user }, version: 0 }
    // Legacy format: { token, user }
    return parsed.state?.token ?? parsed.token ?? null
  } catch {
    return null
  }
}

axiosInstance.interceptors.request.use((config) => {
  const token = getTokenFromStore()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  config.headers = config.headers ?? {}
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json'
  }

  return config
})

export default axiosInstance
