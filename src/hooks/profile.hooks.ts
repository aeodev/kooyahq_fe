import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_PROFILE, GET_USER_BY_ID, GET_PROFILE_POSTS, UPDATE_PROFILE, CREATE_PROFILE_POST, UPDATE_POST, DELETE_POST } from '@/utils/api.routes'
import type { Post } from '@/types/post'

interface ProfileData {
  profilePic?: string
  banner?: string
  bio?: string
}

interface UserProfile {
  id: string
  name: string
  email: string
  profilePic?: string
  banner?: string
  bio?: string
}

export const useProfile = () => {
  const [profileData, setProfileData] = useState<ProfileData>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get(GET_PROFILE())
      const userData = response.data.data
      const data = {
        profilePic: userData?.profilePic || undefined,
        banner: userData?.banner || undefined,
        bio: userData?.bio || undefined,
      }
      setProfileData(data)
      return data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch profile'
      setError(errorMsg)
      console.error('Failed to fetch profile:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (file: File, type: 'profilePic' | 'banner') => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append(type, file)

      const response = await axiosInstance.put(UPDATE_PROFILE(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const updatedUser = response.data.data
      const updatedUrl = updatedUser[type]
      
      setProfileData((prev) => ({
        ...prev,
        [type]: updatedUrl,
      }))
      return updatedUser
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || `Failed to update ${type}`
      setError(errorMsg)
      console.error(`Failed to update ${type}:`, err)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateBio = useCallback(async (bio: string) => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('bio', bio)

      const response = await axiosInstance.put(UPDATE_PROFILE(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const updatedUser = response.data.data
      
      setProfileData((prev) => ({
        ...prev,
        bio: updatedUser.bio,
      }))
      return updatedUser
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update bio'
      setError(errorMsg)
      console.error('Failed to update bio:', err)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    profileData,
    loading,
    error,
    fetchProfile,
    updateProfile,
    updateBio,
    setProfileData,
  }
}

export const useUserProfile = () => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserProfile = useCallback(async (userId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get(GET_USER_BY_ID(userId))
      const userData = response.data.data
      const profile: UserProfile = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        profilePic: userData.profilePic,
        banner: userData.banner,
        bio: userData.bio,
      }
      setUser(profile)
      return profile
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch user profile'
      setError(errorMsg)
      console.error('Failed to fetch user profile:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    loading,
    error,
    fetchUserProfile,
  }
}

export const useProfilePosts = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfilePosts = useCallback(async (includeDrafts = false) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get(`${GET_PROFILE_POSTS()}?includeDrafts=${includeDrafts}`)
      const data = response.data.data || []
      setPosts(data)
      return data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch profile posts'
      setError(errorMsg)
      console.error('Failed to fetch profile posts:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createProfilePost = useCallback(async (content: string, image?: File, draft = false) => {
    try {
      const formData = new FormData()
      formData.append('content', content.trim() || '')
      formData.append('draft', String(draft))
      if (image) {
        formData.append('image', image)
      }

      const response = await axiosInstance.post(CREATE_PROFILE_POST(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const newPost = response.data.data
      setPosts((prev) => [newPost, ...prev])
      return newPost
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create post'
      console.error('Failed to create post:', err)
      throw new Error(errorMsg)
    }
  }, [])

  const updateProfilePost = useCallback(async (postId: string, content: string, image?: File) => {
    try {
      const formData = new FormData()
      formData.append('content', content.trim() || '')
      if (image) {
        formData.append('image', image)
      }

      const response = await axiosInstance.put(UPDATE_POST(postId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const updatedPost = response.data.data
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)))
      return updatedPost
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update post'
      console.error('Failed to update post:', err)
      throw new Error(errorMsg)
    }
  }, [])

  const deleteProfilePost = useCallback(async (postId: string) => {
    try {
      await axiosInstance.delete(DELETE_POST(postId))
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      return true
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete post'
      console.error('Failed to delete post:', err)
      throw new Error(errorMsg)
    }
  }, [])

  return {
    posts,
    loading,
    error,
    fetchProfilePosts,
    createProfilePost,
    updateProfilePost,
    deleteProfilePost,
  }
}

