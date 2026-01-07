import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { Button } from '@/components/ui/button'
import { Trash2, Edit2, Loader2 } from 'lucide-react'
import { usePostComments } from '@/hooks/post.hooks'
import { getInitialsFallback } from '@/utils/image.utils'
import type { PostComment } from '@/types/post'

interface CommentItemProps {
  comment: PostComment
  onUpdate: (comment: PostComment) => void
  onDelete: (commentId: string) => void
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

export function CommentItem({ comment, onUpdate, onDelete }: CommentItemProps) {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { updateComment, deleteComment } = usePostComments()

  const isOwner = user?.id === comment.userId
  const canUpdate =
    isOwner && (can(PERMISSIONS.POST_COMMENT_UPDATE) || can(PERMISSIONS.POST_FULL_ACCESS))
  const canDelete =
    isOwner && (can(PERMISSIONS.POST_COMMENT_DELETE) || can(PERMISSIONS.POST_FULL_ACCESS))

  const handleUpdate = async () => {
    if (!canUpdate) return
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false)
      return
    }

    setIsUpdating(true)
    try {
      const updated = await updateComment(comment.id, editContent.trim())
      onUpdate(updated)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update comment:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete) return
    if (!confirm('Delete this comment?')) return

    setIsDeleting(true)
    try {
      await deleteComment(comment.id)
      onDelete(comment.id)
    } catch (error) {
      console.error('Failed to delete comment:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex gap-2 py-1.5 group">
      {isValidImageUrl(comment.author.profilePic) ? (
        <img
          src={comment.author.profilePic}
          alt={comment.author.name}
          className="h-6 w-6 rounded-xl ring-1 ring-border/50 object-cover flex-shrink-0"
          onError={(e) => {
            const target = e.currentTarget
            target.onerror = null
            target.src = getInitialsFallback(comment.author.name)
          }}
        />
      ) : (
        <div className="h-6 w-6 rounded-xl ring-1 ring-border/50 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-[10px] font-bold text-primary-foreground flex-shrink-0">
          {getUserInitials(comment.author.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-border/50 rounded-xl bg-background/50 backdrop-blur-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm transition-all duration-300"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpdate} disabled={isUpdating} className="h-7 px-2 text-xs">
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving
                  </>
                ) : (
                  'Save'
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 px-2 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm mr-1.5">{comment.author.name}</span>
                  <span className="text-sm text-foreground rich-text-display">{comment.content}</span>
                </div>
              {canUpdate || canDelete ? (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canUpdate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setIsEditing(true)}
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-0">{formatDate(comment.createdAt)}</p>
          </>
        )}
      </div>
    </div>
  )
}
