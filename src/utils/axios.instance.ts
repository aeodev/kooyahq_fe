import axios from 'axios'
import { BASE_URL } from '@/utils/api.routes'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/utils/auth-token'

export const AUTH_STORAGE_KEY = 'kooyahq.auth'

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken()
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

let refreshPromise: Promise<string | null> | null = null

const shouldSkipRefresh = (url?: string) => {
  if (!url) return false
  return url.includes('/auth/google') || url.includes('/auth/refresh') || url.includes('/auth/logout')
}

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ status: string; data: { token: string } }>('/auth/refresh')
      .then((response) => {
        const token = response.data.data?.token
        if (token) {
          setAccessToken(token)
          return token
        }
        clearAccessToken()
        return null
      })
      .catch(() => {
        clearAccessToken()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (status === 401 && !originalRequest?._retry && !shouldSkipRefresh(originalRequest?.url)) {
      originalRequest._retry = true
      const token = await refreshAccessToken()
      if (token) {
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${token}`
        return axiosInstance(originalRequest)
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
