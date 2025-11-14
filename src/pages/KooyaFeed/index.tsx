import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import { Button } from '@/components/ui/button'
import { CommentSection } from '@/components/posts/CommentSection'
import { PostReactions } from '@/components/posts/PostReactions'
import { Image as ImageIcon, Loader2, X } from 'lucide-react'
import { usePosts } from '@/hooks/post.hooks'
import { useActiveUsers } from '@/hooks/game.hooks'
import { ActiveUsersSidebar } from '@/pages/Games/components/ActiveUsersSidebar'
import type { ActiveUser } from '@/types/game'

function PostFeedInteractions({ postId }: { postId: string }) {
  const [showComments, setShowComments] = useState(false)

  return (
    <div>
      <PostReactions 
        postId={postId} 
        onCommentClick={() => setShowComments(!showComments)} 
      />
      {showComments && <CommentSection postId={postId} />}
    </div>
  )
}

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function isValidImageUrl(url?: string): boolean {
  return !!url && url !== 'undefined' && url.trim() !== '' && !url.includes('undefined')
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function KooyaFeed() {
  const user = useAuthStore((state) => state.user)
  const socket = useSocketStore((state) => state.socket)
  const navigate = useNavigate()
  const [postContent, setPostContent] = useState('')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  const postImageInputRef = useRef<HTMLInputElement>(null)
  const { posts, loading: isLoading, fetchPosts, createPost } = usePosts()
  const { activeUsers, setActiveUsers, fetchActiveUsers } = useActiveUsers()

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
      alert('Socket not connected. Please wait a moment.')
      return
    }

    socket.emit('user:poke', { pokedUserId: userId })
  }

  const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPostImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPostImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePostImage = () => {
    setPostImage(null)
    setPostImagePreview(null)
    if (postImageInputRef.current) {
      postImageInputRef.current.value = ''
    }
  }

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postImage) return

    setIsCreating(true)
    try {
      await createPost(postContent, postImage || undefined)
      setPostContent('')
      setPostImage(null)
      setPostImagePreview(null)
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setIsCreating(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex gap-0">
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12 pr-0 md:pr-16">
      {/* Header */}
      <div className="pt-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          Feed
        </h1>
        <p className="text-muted-foreground">What's happening in your network</p>
      </div>

      {/* Create Post Section - Modern Design */}
      <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {isValidImageUrl(user.profilePic) ? (
              <img
                src={user.profilePic}
                alt={user.name}
                className="h-12 w-12 rounded-2xl object-cover flex-shrink-0 ring-2 ring-border/50"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0 ring-2 ring-border/50">
                {getUserInitials(user.name)}
              </div>
            )}
            <div className="flex-1 space-y-3">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share something with the team..."
                className="w-full min-h-[80px] p-3 border-0 rounded-xl resize-none focus:outline-none bg-background/50 placeholder:text-muted-foreground/60 text-base focus:ring-2 focus:ring-primary/20 transition-all"
                rows={3}
              />
              
              {postImagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border/50 group">
                  <button
                    onClick={handleRemovePostImage}
                    className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background flex items-center justify-center text-foreground shadow-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <img
                    src={postImagePreview}
                    alt="Preview"
                    className="w-full max-h-96 object-cover"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-4 hover:bg-accent/50 text-muted-foreground rounded-xl"
                  onClick={() => postImageInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add photo
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={isCreating || (!postContent.trim() && !postImage)}
                  className="h-9 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={postImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePostImageSelect}
          />
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-3 sm:space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <p className="text-lg font-medium mb-2">No posts yet</p>
            <p className="text-sm">Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <article 
              key={post.id} 
              className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  {isValidImageUrl(post.author.profilePic) ? (
                    <button
                      onClick={() => navigate(`/profile?userId=${post.author.id}`)}
                      className="flex-shrink-0"
                    >
                      <img
                        src={post.author.profilePic}
                        alt={post.author.name}
                        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-border/50 hover:ring-primary/50 transition-all"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/profile?userId=${post.author.id}`)}
                      className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0 ring-2 ring-border/50 hover:ring-primary/50 transition-all"
                    >
                      {getUserInitials(post.author.name)}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/profile?userId=${post.author.id}`)}
                      className="font-semibold text-base hover:text-primary transition-colors text-left block mb-1"
                    >
                      {post.author.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                  </div>
                </div>

                <div
                  className="text-base leading-relaxed rich-text-display text-foreground prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
                
                {isValidImageUrl(post.imageUrl) && (
                  <div className="rounded-xl overflow-hidden border border-border/50 ring-1 ring-border/30">
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full max-h-[500px] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
                
                <PostFeedInteractions postId={post.id} />
              </div>
            </article>
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

