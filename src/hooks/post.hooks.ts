import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_ALL_POSTS,
  CREATE_PROFILE_POST,
  UPDATE_POST,
  DELETE_POST,
  GET_POST_REACTIONS,
  GET_POST_COMMENTS,
  CREATE_POST_COMMENT,
  UPDATE_POST_COMMENT,
  DELETE_POST_COMMENT,
  TOGGLE_POST_REACTION,
  GET_PROFILE_POSTS,
} from '@/utils/api.routes'
import type { Post, PostReaction, PostComment } from '@/types/post'

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get(GET_ALL_POSTS())
      const data = response.data.data || []
      setPosts(data)
      return data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch posts'
      setError(errorMsg)
      console.error('Failed to fetch posts:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createPost = useCallback(async (content: string, image?: File) => {
    try {
      const formData = new FormData()
      formData.append('content', content.trim() || '')
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

  const updatePost = useCallback(async (postId: string, content: string, image?: File) => {
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

  const deletePost = useCallback(async (postId: string) => {
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
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
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

  return {
    posts,
    loading,
    error,
    fetchProfilePosts,
  }
}

export const usePostReactions = () => {
  const [reactions, setReactions] = useState<PostReaction[]>([])
  const [loading, setLoading] = useState(false)

  const fetchReactions = useCallback(async (postId: string) => {
    setLoading(true)
    try {
      const response = await axiosInstance.get(GET_POST_REACTIONS(postId))
      const data = response.data.data
      // Handle both array format and object format
      if (Array.isArray(data)) {
        setReactions(data)
        return data
      } else if (data?.reactions) {
        setReactions(data.reactions)
        return data.reactions
      }
      return []
    } catch (err) {
      console.error('Failed to fetch reactions:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleReaction = useCallback(async (postId: string, type: string) => {
    try {
      await axiosInstance.post(TOGGLE_POST_REACTION(postId), { type })
      // Refetch to get updated state
      await fetchReactions(postId)
      return true
    } catch (err) {
      console.error('Failed to toggle reaction:', err)
      return false
    }
  }, [fetchReactions])

  return {
    reactions,
    loading,
    fetchReactions,
    toggleReaction,
  }
}

export const usePostComments = () => {
  const [comments, setComments] = useState<PostComment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchComments = useCallback(async (postId: string) => {
    setLoading(true)
    try {
      const response = await axiosInstance.get(GET_POST_COMMENTS(postId))
      const data = response.data.data || []
      setComments(data)
      return data
    } catch (err) {
      console.error('Failed to fetch comments:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createComment = useCallback(async (postId: string, content: string) => {
    try {
      const response = await axiosInstance.post(CREATE_POST_COMMENT(postId), {
        content,
      })
      const newComment = response.data.data
      setComments((prev) => [...prev, newComment])
      return newComment
    } catch (err) {
      console.error('Failed to create comment:', err)
      throw err
    }
  }, [])

  const updateComment = useCallback(async (commentId: string, content: string) => {
    try {
      const response = await axiosInstance.put(UPDATE_POST_COMMENT(commentId), {
        content,
      })
      const updatedComment = response.data.data
      setComments((prev) => prev.map((c) => (c.id === commentId ? updatedComment : c)))
      return updatedComment
    } catch (err) {
      console.error('Failed to update comment:', err)
      throw err
    }
  }, [])

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await axiosInstance.delete(DELETE_POST_COMMENT(commentId))
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      return true
    } catch (err) {
      console.error('Failed to delete comment:', err)
      throw err
    }
  }, [])

  return {
    comments,
    loading,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
  }
}

