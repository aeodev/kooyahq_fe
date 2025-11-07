import { useCallback, useState, useEffect } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_USERS } from '@/utils/api.routes'
import type { User } from '@/types/user'

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: User[] }>(GET_USERS())
      setUsers(response.data.data)
      return response.data.data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, loading, error, fetchUsers }
}

