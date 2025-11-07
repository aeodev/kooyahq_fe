import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { PROFILE, SIGN_IN, SIGN_UP } from '@/utils/api.routes'
import type { User } from '@/types/user'

type AuthResponse = {
  user: User
  token: string
}

type ApiEnvelope<T> = {
  status: string
  data: T
}

export type AuthError = {
  message: string | string[]
  statusCode?: number
}

function normalizeError(error: unknown): AuthError {
  if (typeof error === 'string') {
    return { message: error }
  }

  if (error && typeof error === 'object') {
    const anyError = error as Record<string, unknown>

    if ('response' in anyError && anyError.response && typeof anyError.response === 'object') {
      const response = anyError.response as Record<string, unknown>
      const data = response.data as Record<string, unknown> | undefined
      const statusCode = (response.status as number | undefined) ?? undefined

      if (data) {
        const message =
          (data.message as string | string[] | undefined) ??
          (data.error as string | undefined) ??
          'Request failed'
        return { message: message ?? 'Request failed', statusCode }
      }

      return {
        message: `Request failed with status ${statusCode ?? 'unknown'}`,
        statusCode,
      }
    }

    if ('message' in anyError && typeof anyError.message === 'string') {
      return { message: anyError.message }
    }
  }

  return { message: 'Something went wrong' }
}

export const useAuthLogin = () => {
  const [data, setData] = useState<AuthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const sendRequest = useCallback(
    async (payload: { email: string; password: string }) => {
      setLoading(true)
      setError(null)
      setData(null)

      try {
        const response = await axiosInstance.post<ApiEnvelope<AuthResponse>>(SIGN_IN(), payload)
        setData(response.data.data)
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        throw normalized
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    data,
    loading,
    error,
    sendRequest,
  }
}

export const useAuthRegister = () => {
  const [data, setData] = useState<AuthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const sendRequest = useCallback(
    async (payload: { name: string; email: string; password: string }) => {
      setLoading(true)
      setError(null)
      setData(null)

      try {
        const response = await axiosInstance.post<ApiEnvelope<AuthResponse>>(SIGN_UP(), payload)
        setData(response.data.data)
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        throw normalized
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    data,
    loading,
    error,
    sendRequest,
  }
}

export const useAuthProfile = () => {
  const [data, setData] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const sendRequest = useCallback(async () => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const response = await axiosInstance.get<ApiEnvelope<{ user: User | null }>>(PROFILE())
      const user = response.data.data?.user ?? null
      setData(user)
      return user
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    sendRequest,
  }
}
