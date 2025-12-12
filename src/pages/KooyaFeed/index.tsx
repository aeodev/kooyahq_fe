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
import { PERMISSIONS } from '@/constants/permissions'

export function KooyaFeed() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const socket = useSocketStore((state) => state.socket)
  const { posts, loading: isLoading, fetchPosts, createPost, deletePost, updatePost, votePoll } = usePosts()
  const { activeUsers, setActiveUsers, fetchActiveUsers } = useActiveUsers()
  const [filter, setFilter] = useState<'all' | 'media' | 'polls'>('all')
  const canReadPosts = can(PERMISSIONS.POST_READ) || can(PERMISSIONS.POST_FULL_ACCESS)
  const canCreatePosts = can(PERMISSIONS.POST_CREATE) || can(PERMISSIONS.POST_FULL_ACCESS)
  const canUpdatePosts = can(PERMISSIONS.POST_UPDATE) || can(PERMISSIONS.POST_FULL_ACCESS)
  const canDeletePosts = can(PERMISSIONS.POST_DELETE) || can(PERMISSIONS.POST_FULL_ACCESS)
  const canReadGames = can(PERMISSIONS.GAME_READ) || can(PERMISSIONS.GAME_FULL_ACCESS)
  const canVotePoll = can(PERMISSIONS.POST_POLL_VOTE) || can(PERMISSIONS.POST_FULL_ACCESS)

  const filteredPosts = posts.filter(post => {
    if (filter === 'media') return Boolean(post.imageUrl && post.imageUrl.length > 0)
    if (filter === 'polls') return Boolean(post.poll && post.poll.options && post.poll.options.length > 0)
    return true
  })

  useEffect(() => {
    if (user && canReadPosts) {
      fetchPosts()
      if (canReadGames) {
        fetchActiveUsers()
      }
    }
  }, [user, fetchPosts, fetchActiveUsers, canReadPosts, canReadGames])

  useEffect(() => {
    // Listen for active users updates via socket
    if (socket?.connected && canReadGames) {
      socket.on('game:active-users', (data: { users: ActiveUser[] }) => {
        setActiveUsers(data.users)
      })

      return () => {
        socket.off('game:active-users')
      }
    }
  }, [socket, setActiveUsers, canReadGames])

  const handlePoke = (userId: string) => {
    if (!canReadGames) return
    if (!socket?.connected) {
      toast.error('Socket not connected. Please wait a moment.')
      return
    }

    socket.emit('user:poke', { pokedUserId: userId })
    toast.success('Poked user!')
  }

  const handleCreatePost = async (content: string, image?: File, poll?: any) => {
    if (!canCreatePosts) return
    await createPost(content, image, poll)
  }

  const handleDeletePost = async (postId: string) => {
    if (!canDeletePosts) return
    await deletePost(postId)
  }

  const handleUpdatePost = async (postId: string, content: string) => {
    if (!canUpdatePosts) return
    await updatePost(postId, content)
  }

  const handleVotePost = async (postId: string, optionIndex: number) => {
    if (!canVotePoll) return
    await votePoll(postId, optionIndex)
  }

  if (!user || !canReadPosts) return null

  return (
    <div className="flex gap-0">
      <div className="flex-1 w-full max-w-4xl mx-auto space-y-6 pb-12 pr-0 md:pr-16">
          <FeedHeader filter={filter} onFilterChange={setFilter} />

          {canCreatePosts && <CreatePostCard user={user} onCreatePost={handleCreatePost} />}

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
        {canReadGames && (
          <ActiveUsersSidebar
            activeUsers={activeUsers}
            currentUserId={user?.id}
            onPoke={handlePoke}
          />
        )}
      </div>
  )
}
