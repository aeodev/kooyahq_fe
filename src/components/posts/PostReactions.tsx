import { useOptimistic, useTransition, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Heart, PartyPopper, Smile } from 'lucide-react'
import { usePostReactions, usePostComments } from '@/hooks/post.hooks'
import type { ReactionType, ReactionCounts } from '@/types/post'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import { cn } from '@/utils/formatters'

interface PostReactionsProps {
  postId: string
  onCommentClick?: () => void
}

export function PostReactions({ postId, onCommentClick }: PostReactionsProps) {
  const user = useAuthStore((state) => state.user)
  const { reactions: fetchedReactions, fetchReactions, toggleReaction } = usePostReactions()
  const { comments, fetchComments } = usePostComments()
  const [_, startTransition] = useTransition()

  useEffect(() => {
    fetchReactions(postId)
    fetchComments(postId)
  }, [postId, fetchReactions, fetchComments])

  // React 19 useOptimistic
  const [optimisticReactions, addOptimisticReaction] = useOptimistic(
    fetchedReactions,
    (state, newReaction: { type: ReactionType, userId: string }) => {
      const existingIndex = state.findIndex(r => r.userId === newReaction.userId)
      if (existingIndex !== -1) {
        // User already reacted
        const existing = state[existingIndex]
        if (existing.type === newReaction.type) {
          // Toggle off: remove the reaction
          return state.filter((_, i) => i !== existingIndex)
        } else {
          // Change reaction type
          const newState = [...state]
          newState[existingIndex] = { ...existing, type: newReaction.type }
          return newState
        }
      } else {
        // Add new reaction
        return [...state, {
          id: 'temp-' + Date.now(),
          postId,
          userId: newReaction.userId,
          type: newReaction.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      }
    }
  )

  const counts: ReactionCounts = useMemo(() => {
    const counts = { heart: 0, wow: 0, haha: 0, userReaction: undefined as ReactionType | undefined }
    optimisticReactions.forEach((r) => {
      if (r.type === 'heart') counts.heart++
      else if (r.type === 'wow') counts.wow++
      else if (r.type === 'haha') counts.haha++

      if (user && r.userId === user.id) {
        counts.userReaction = r.type
      }
    })
    return counts
  }, [optimisticReactions, user])

  const handleToggle = (type: ReactionType) => {
    if (!user) return

    startTransition(async () => {
      addOptimisticReaction({ type, userId: user.id })
      try {
        await toggleReaction(postId, type)
      } catch (error) {
        console.error('Failed to toggle reaction', error)
        toast.error('Failed to update reaction')
      }
    })
  }

  const getReactionIcon = (type: ReactionType) => {
    switch (type) {
      case 'heart': return <Heart className="h-4 w-4 fill-current" />
      case 'wow': return <PartyPopper className="h-4 w-4" />
      case 'haha': return <Smile className="h-4 w-4" />
    }
  }

  const getReactionColor = (type: ReactionType) => {
    switch (type) {
      case 'heart': return 'text-red-500 bg-red-50 dark:bg-red-950/30'
      case 'wow': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
      case 'haha': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
    }
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <div className="flex items-center gap-1">
        {(['heart', 'wow', 'haha'] as ReactionType[]).map((type) => {
          const isActive = counts.userReaction === type
          return (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(type)}
              className={cn(
                "h-8 px-2 rounded-full transition-all hover:scale-110",
                isActive ? getReactionColor(type) : "hover:bg-muted text-muted-foreground"
              )}
            >
              {getReactionIcon(type)}
              {counts[type] > 0 && <span className="ml-1.5 text-xs font-medium">{counts[type]}</span>}
            </Button>
          )
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 text-muted-foreground hover:text-foreground rounded-full"
        onClick={onCommentClick}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        <span className="text-xs font-medium">
          {comments.length > 0 ? `${comments.length} Comments` : 'Comment'}
        </span>
      </Button>
    </div>
  )
}
