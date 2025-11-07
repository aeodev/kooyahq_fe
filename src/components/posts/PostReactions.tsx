import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { ThumbsUp, MessageCircle, Loader2 } from 'lucide-react'
import { usePostReactions, usePostComments } from '@/hooks/post.hooks'
import type { ReactionType, ReactionCounts } from '@/types/post'

interface PostReactionsProps {
  postId: string
  onCommentClick?: () => void
}

export function PostReactions({ postId, onCommentClick }: PostReactionsProps) {
  const user = useAuthStore((state) => state.user)
  const [counts, setCounts] = useState<ReactionCounts>({
    heart: 0,
    wow: 0,
    haha: 0,
  })
  const [userReaction, setUserReaction] = useState<ReactionType | undefined>()
  const [isToggling, setIsToggling] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const reactionMenuRef = useRef<HTMLDivElement>(null)

  const { loading: isLoading, fetchReactions: fetchReactionsFromHook, toggleReaction } = usePostReactions()
  const { comments, fetchComments } = usePostComments()
  const commentCount = comments.length

  useEffect(() => {
    loadReactions()
    fetchComments(postId)
  }, [postId, user?.id])

  const loadReactions = async () => {
    const reactions = await fetchReactionsFromHook(postId)
    if (reactions && Array.isArray(reactions) && reactions.length > 0) {
      // Process reactions to get counts and user reaction
      const counts: ReactionCounts = { heart: 0, wow: 0, haha: 0 }
      let userReactionType: ReactionType | undefined
      
      reactions.forEach((reaction) => {
        if (reaction.type === 'heart') counts.heart++
        if (reaction.type === 'wow') counts.wow++
        if (reaction.type === 'haha') counts.haha++
        if (reaction.userId === user?.id) {
          userReactionType = reaction.type as ReactionType
        }
      })
      
      setCounts(counts)
      setUserReaction(userReactionType)
    } else if (reactions && typeof reactions === 'object' && 'counts' in reactions) {
      // Handle object format with counts
      const data = reactions as any
      setCounts(data.counts || { heart: 0, wow: 0, haha: 0 })
      setUserReaction(data.userReaction)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionMenuRef.current && !reactionMenuRef.current.contains(event.target as Node)) {
        setShowReactions(false)
      }
    }

    if (showReactions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showReactions])

  const handleToggle = async (type: ReactionType) => {
    if (isToggling || !user) return

    setIsToggling(true)
    setShowReactions(false)
    try {
      await toggleReaction(postId, type)
      await loadReactions()
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    } finally {
      setIsToggling(false)
    }
  }


  const handleReactionClick = () => {
    if (!user) return
    if (userReaction) {
      // Toggle off current reaction
      handleToggle(userReaction)
    } else {
      // Default to heart on quick click
      handleToggle('heart')
    }
  }

  const handleCommentClick = () => {
    fetchComments(postId)
    onCommentClick?.()
  }

  const getReactionDisplay = () => {
    if (userReaction === 'heart') {
      return { emoji: '❤️', label: 'Love', color: 'text-red-600' }
    }
    if (userReaction === 'wow') {
      return { emoji: '😮', label: 'Wow', color: 'text-yellow-600' }
    }
    if (userReaction === 'haha') {
      return { emoji: '😂', label: 'Haha', color: 'text-blue-600' }
    }
    return { emoji: null, label: 'Like', color: 'text-muted-foreground' }
  }

  const totalReactions = counts.heart + counts.wow + counts.haha
  const reactionDisplay = getReactionDisplay()

  const getTopReactions = () => {
    const reactions = [
      { type: 'heart' as const, count: counts.heart, emoji: '❤️' },
      { type: 'wow' as const, count: counts.wow, emoji: '😮' },
      { type: 'haha' as const, count: counts.haha, emoji: '😂' },
    ]
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
    
    return reactions.map((r) => r.emoji)
  }

  const topReactionEmojis = getTopReactions()

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user && totalReactions === 0) {
    return null
  }

  const getReactionCountText = () => {
    if (totalReactions === 0) return null
    if (userReaction && totalReactions > 1) {
      return `You and ${totalReactions - 1} others`
    }
    if (userReaction && totalReactions === 1) {
      return 'You'
    }
    return `${totalReactions}`
  }

  return (
    <div className="relative">
      {/* Reaction Count - Above buttons */}
      {(totalReactions > 0 || commentCount > 0) && (
        <div className="pb-2 flex items-center justify-between">
          {totalReactions > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              onClick={() => setShowReactions(true)}
            >
              {topReactionEmojis.length > 0 && (
                <span className="text-base">{topReactionEmojis.join(' ')}</span>
              )}
              {getReactionCountText()}
            </button>
          )}
          {commentCount > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
              onClick={handleCommentClick}
            >
              {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
      )}

      {/* Interaction Buttons */}
      <div className="py-1 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="relative" ref={reactionMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 text-sm hover:bg-accent transition-colors ${
                reactionDisplay.color
              }`}
              onMouseEnter={() => setShowReactions(true)}
              onClick={handleReactionClick}
              disabled={isToggling || !user}
              title={userReaction ? `Remove ${reactionDisplay.label}` : 'Like'}
            >
              {reactionDisplay.emoji ? (
                <span className="text-base">{reactionDisplay.emoji}</span>
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              <span className="ml-2">{reactionDisplay.label}</span>
            </Button>

            {/* Reaction Menu - Hidden by default, shown on hover */}
            {showReactions && user && (
              <div
                className="absolute bottom-full left-0 mb-2 bg-card/95 backdrop-blur-md border border-border/50 rounded-full px-2 py-1 flex items-center gap-1 shadow-xl z-10 ring-1 ring-border/30"
                onMouseLeave={() => setShowReactions(false)}
              >
                <button
                  onClick={() => handleToggle('heart')}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 hover:scale-125 ring-1 ring-border/20 ${
                    userReaction === 'heart' ? 'bg-red-100 dark:bg-red-900/30 shadow-md' : ''
                  }`}
                  title="Heart"
                >
                  ❤️
                </button>
                <button
                  onClick={() => handleToggle('wow')}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 hover:scale-125 ring-1 ring-border/20 ${
                    userReaction === 'wow' ? 'bg-yellow-100 dark:bg-yellow-900/30 shadow-md' : ''
                  }`}
                  title="Wow"
                >
                  😮
                </button>
                <button
                  onClick={() => handleToggle('haha')}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 hover:scale-125 ring-1 ring-border/20 ${
                    userReaction === 'haha' ? 'bg-blue-100 dark:bg-blue-900/30 shadow-md' : ''
                  }`}
                  title="Haha"
                >
                  😂
                </button>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
            onClick={handleCommentClick}
            title="Comment"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="ml-2">Comment</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

