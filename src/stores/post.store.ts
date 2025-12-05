import { create } from 'zustand'
import type { Post } from '@/types/post'

interface PostState {
    posts: Post[]
    loading: boolean
    error: string | null
    lastFetched: number | null

    // Actions
    setPosts: (posts: Post[]) => void
    addPost: (post: Post) => void
    updatePost: (post: Post) => void
    deletePost: (postId: string) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
}

export const usePostStore = create<PostState>((set) => ({
    posts: [],
    loading: false,
    error: null,
    lastFetched: null,

    setPosts: (posts) => set({ posts, lastFetched: Date.now(), error: null }),

    addPost: (post) => set((state) => ({
        posts: [post, ...state.posts]
    })),

    updatePost: (updatedPost) => set((state) => ({
        posts: state.posts.map((p) => p.id === updatedPost.id ? updatedPost : p)
    })),

    deletePost: (postId) => set((state) => ({
        posts: state.posts.filter((p) => p.id !== postId)
    })),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error })
}))
