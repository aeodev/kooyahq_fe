import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import { Loader2 } from 'lucide-react'
import { usePosts } from '@/hooks/post.hooks'
import { useActiveUsers } from '@/hooks/game.hooks'
import { ActiveUsersSidebar } from '@/pages/Games/components/ActiveUsersSidebar'
import type { ActiveUser } from '@/types/game'
import { FeedHeader } from './components/FeedHeader'
import { CreatePostCard } from './components/CreatePostCard'
import { PostCard } from './components/PostCard'
import { toast } from 'sonner'

export function KooyaFeed() {
  const user = useAuthStore((state) => state.user)
  const socket = useSocketStore((state) => state.socket)
  const { posts, loading: isLoading, fetchPosts, createPost, deletePost, updatePost, votePoll } = usePosts()
  const { activeUsers, setActiveUsers, fetchActiveUsers } = useActiveUsers()
  const [filter, setFilter] = useState<'all' | 'media' | 'polls'>('all')

  const filteredPosts = posts.filter(post => {
    if (filter === 'media') return Boolean(post.imageUrl && post.imageUrl.length > 0)
    if (filter === 'polls') return Boolean(post.poll && post.poll.options && post.poll.options.length > 0)
    return true
  })

  useEffect(() => {
    if (user) {
      fetchPosts()
      fetchActiveUsers()
    }
  }, [user, fetchPosts, fetchActiveUsers])

  useEffect(() => {
    // Listen for active users updates via socket
    if (socket?.connected) {
      socket.on('game:active-users', (data: { users: ActiveUser[] }) => {
        setActiveUsers(data.users)
      })

      return () => {
        socket.off('game:active-users')
      }
    }
  }, [socket, setActiveUsers])

  const handlePoke = (userId: string) => {
    if (!socket?.connected) {
      toast.error('Socket not connected. Please wait a moment.')
      return
    }

    socket.emit('user:poke', { pokedUserId: userId })
    toast.success('Poked user!')
  }

  const handleCreatePost = async (content: string, image?: File, poll?: any) => {
    await createPost(content, image, poll)
  }

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId)
  }

  const handleUpdatePost = async (postId: string, content: string) => {
    await updatePost(postId, content)
  }

  const handleVotePost = async (postId: string, optionIndex: number) => {
    await votePoll(postId, optionIndex)
  }

  if (!user) return null

  return (
    <div className="flex gap-0">
      <div className="flex-1 w-full max-w-4xl mx-auto space-y-6 pb-12 pr-0 md:pr-16">
          <FeedHeader filter={filter} onFilterChange={setFilter} />

          <CreatePostCard user={user} onCreatePost={handleCreatePost} />

          {/* Posts Feed */}
          <div className="space-y-3 sm:space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
                <p className="text-lg font-medium mb-2">No posts found</p>
                <p className="text-sm">Try changing your filter</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handleDeletePost}
                  onUpdate={handleUpdatePost}
                  onVote={handleVotePost}
                />
              ))
            )}
          </div>
        </div>

        {/* Active Users Sidebar */}
        <ActiveUsersSidebar
          activeUsers={activeUsers}
          currentUserId={user?.id}
          onPoke={handlePoke}
        />
      </div>
  )
}
