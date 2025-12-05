import { useCallback, useState, useEffect } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_USERS } from '@/utils/api.routes'
import type { User } from '@/types/user'

export type TeamUserData = {
  id: string
  position?: string
  profilePic?: string
}

export const useTeamUsers = () => {
  const [users, setUsers] = useState<TeamUserData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.get<{ status: string; data: User[] }>(GET_USERS())
      setUsers(response.data.data.map((u) => ({ 
        id: u.id, 
        position: u.position, 
        profilePic: u.profilePic 
      })))
    } catch {
      // Silently fail - position is optional
    } finally {
      setLoading(false)
    }
  }, [])

  return { users, loading, fetchUsers }
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.get<{ status: string; data: User[] }>(GET_USERS())
      setUsers(response.data.data)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, loading, fetchUsers }
}
