import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { CommentItem } from './CommentItem'
import { Send, Loader2 } from 'lucide-react'
import { usePostComments } from '@/hooks/post.hooks'
import type { PostComment } from '@/types/post'
import { getUserInitials, isValidImageUrl } from '@/utils/formatters'
import { toast } from 'sonner'

interface CommentSectionProps {
  postId: string
  isExpanded?: boolean
}

export function CommentSection({ postId, isExpanded = true }: CommentSectionProps) {
  const user = useAuthStore((state) => state.user)
  const [commentContent, setCommentContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    comments,
    loading: isLoading,
    fetchComments,
    createComment,
  } = usePostComments()

  useEffect(() => {
    fetchComments(postId)
  }, [postId, fetchComments])

  const handleSubmit = async () => {
    if (!commentContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await createComment(postId, commentContent.trim())
      setCommentContent('')
      toast.success('Comment added!')
    } catch (error) {
      console.error('Failed to create comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = (_updatedComment: PostComment) => {
    // Comment updated via hook's state management
  }

  const handleDelete = (_commentId: string) => {
    // Comment deleted via hook's state management
  }

  if (!user) return null

  if (!isExpanded) return null

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-start gap-2">
        {isValidImageUrl(user.profilePic) ? (
          <img
            src={user.profilePic}
            alt={user.name}
            className="h-6 w-6 rounded-xl ring-1 ring-border/50 object-cover flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="h-6 w-6 rounded-xl ring-1 ring-border/50 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-[10px] font-bold text-primary-foreground flex-shrink-0">
            {getUserInitials(user.name)}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder={`Comment as ${user.name.split(' ')[0]}...`}
              className="flex-1 px-2 py-1.5 text-sm border-0 border-b border-border focus:outline-none focus:border-primary bg-transparent placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            {commentContent.trim() && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSubmit}
                disabled={!commentContent.trim() || isSubmitting}
                className="h-8 px-2 text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? null : (
        <div className="space-y-0">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

