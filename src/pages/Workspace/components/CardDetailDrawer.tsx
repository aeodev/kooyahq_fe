import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { UserSelector, UserAvatar } from '@/components/ui/user-selector'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { useAuthStore } from '@/stores/auth.store'
import { useComments, useCreateComment, useCardActivities } from '@/hooks/board.hooks'
import { useUsers } from '@/hooks/user.hooks'
import { useBoardStore } from '@/stores/board.store'
import axiosInstance from '@/utils/axios.instance'
import { UPLOAD_CARD_ATTACHMENT, DELETE_CARD_ATTACHMENT, GET_CARD_FILE } from '@/utils/api.routes'
import { Loader2, Image as ImageIcon, X, Eye, Download, Paperclip } from 'lucide-react'
import type { Card as CardType, CardActivity } from '@/types/board'

const PRIORITY_COLORS: Record<string, string> = {
  highest: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  lowest: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
}

const ISSUE_TYPE_COLORS: Record<string, string> = {
  epic: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  story: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  task: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  bug: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

type CardDetailDrawerProps = {
  card: CardType | null
  onClose: () => void
  onUpdate: (updates: any) => Promise<void>
  onDelete: () => Promise<void>
}

export function CardDetailDrawer({ card, onClose, onUpdate, onDelete }: CardDetailDrawerProps) {
  const user = useAuthStore((state) => state.user)
  const { users } = useUsers()
  const board = useBoardStore((state) => state.currentBoard)
  const [editing, setEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [commentText, setCommentText] = useState('')
  const { data: comments, fetchComments } = useComments()
  const { createComment } = useCreateComment()
  const { data: activities, fetchActivities } = useCardActivities()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description || '')
      fetchComments(card.id)
      fetchActivities(card.id)
    }
  }, [card, fetchComments, fetchActivities])

  const handleSave = async () => {
    if (!card) return
    await onUpdate({ description: description || null })
    setEditing(false)
    fetchActivities(card.id)
  }

  const handleSaveTitle = async () => {
    if (!card) return
    await onUpdate({ title })
    setEditingTitle(false)
    fetchActivities(card.id)
  }

  const handleAddComment = async () => {
    if (!card || !commentText.trim()) return
    setLoading(true)
    const result = await createComment(card.id, commentText.trim())
    if (result) {
      setCommentText('')
      await fetchComments(card.id)
    }
    setLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !card) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      await axiosInstance.post<{ status: string; data: CardType }>(
        UPLOAD_CARD_ATTACHMENT(card.id),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      await onUpdate({})
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Refresh activities after update
      if (card) {
        fetchActivities(card.id)
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!card) return
    try {
      await axiosInstance.delete(DELETE_CARD_ATTACHMENT(card.id, attachmentId))
      await onUpdate({})
    } catch (error) {
      console.error('Failed to delete attachment:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatActivityAction = (activity: CardActivity): string => {
    switch (activity.action) {
      case 'created':
        return 'created this card'
      case 'moved':
        return `moved from "${activity.oldValue}" to "${activity.newValue}"`
      case 'assigned':
        const newAssignee = users.find((u) => u.id === activity.newValue)
        const oldAssignee = activity.oldValue ? users.find((u) => u.id === activity.oldValue) : null
        if (newAssignee) {
          return `assigned to ${newAssignee.name}`
        }
        if (oldAssignee) {
          return `unassigned ${oldAssignee.name}`
        }
        return 'changed assignee'
      case 'completed':
        return activity.newValue === 'true' ? 'marked as completed' : 'marked as incomplete'
      case 'updated':
        if (activity.field === 'title') {
          return `changed title from "${activity.oldValue}" to "${activity.newValue}"`
        }
        if (activity.field === 'priority') {
          return `changed priority from "${activity.oldValue}" to "${activity.newValue}"`
        }
        return `changed ${activity.field} from "${activity.oldValue}" to "${activity.newValue}"`
      default:
        return 'updated this card'
    }
  }

  if (!card) return null

  return (
    <Modal open={!!card} onClose={onClose} maxWidth="5xl">
      <div className="flex flex-col max-h-[90vh]">
        <div className="p-6 border-b bg-background flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="space-y-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xl font-bold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTitle()
                      }
                      if (e.key === 'Escape') {
                        setEditingTitle(false)
                        setTitle(card.title)
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveTitle}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTitle(false)
                        setTitle(card.title)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold text-foreground cursor-pointer hover:bg-muted/50 p-1.5 -m-1.5 rounded transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {card.title}
                </h1>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <select
                  value={card.issueType}
                  onChange={(e) =>
                    onUpdate({ issueType: e.target.value as 'task' | 'bug' | 'story' | 'epic' })
                  }
                  className={`h-8 px-3 rounded-md border-0 text-xs font-semibold shadow-sm ${ISSUE_TYPE_COLORS[card.issueType]}`}
                >
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="story">Story</option>
                  <option value="epic">Epic</option>
                </select>
                <select
                  value={card.priority}
                  onChange={(e) =>
                    onUpdate({ priority: e.target.value as 'lowest' | 'low' | 'medium' | 'high' | 'highest' })
                  }
                  className={`h-8 px-3 rounded-md border-0 text-xs font-semibold shadow-sm ${PRIORITY_COLORS[card.priority]}`}
                >
                  <option value="lowest">Lowest</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="highest">Highest</option>
                </select>
                {card.labels.map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
                {card.storyPoints && (
                  <Badge variant="outline" className="text-xs">
                    {card.storyPoints} pts
                  </Badge>
                )}
                {card.dueDate && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${new Date(card.dueDate) < new Date() ? 'text-red-500 border-red-500' : ''}`}
                  >
                    Due: {new Date(card.dueDate).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              ×
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-8 p-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Description
                  </h3>
                  {!editing && (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-8 text-xs font-medium">
                      Edit
                    </Button>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Add a description..."
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(false)
                          setDescription(card.description || '')
                        }}
                        className="h-8"
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} className="h-8">
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="min-h-[60px] p-4 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors w-full max-w-full"
                    onClick={() => setEditing(true)}
                  >
                    {description ? (
                      <div
                        className="text-sm leading-relaxed rich-text-display w-full max-w-full overflow-hidden"
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: description }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Click to add a description...</p>
                    )}
                  </div>
                )}
              </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Attachments
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-7 text-xs gap-1.5"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <div className="space-y-2">
                {card.attachments && card.attachments.length > 0 ? (
                  card.attachments.map((attachment, idx) => (
                    <div
                      key={attachment.filename || idx}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="flex-shrink-0">
                        {attachment.mimetype?.startsWith('image/') ? (
                          <img
                            src={attachment.url || `${axiosInstance.defaults.baseURL}${GET_CARD_FILE(attachment.filename)}`}
                            alt={attachment.originalName}
                            className="h-12 w-12 rounded object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {attachment.originalName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)} · {new Date(attachment.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={attachment.url || `${axiosInstance.defaults.baseURL}${GET_CARD_FILE(attachment.filename)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-accent rounded transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <a
                          href={attachment.url || `${axiosInstance.defaults.baseURL}${GET_CARD_FILE(attachment.filename)}`}
                          download
                          className="p-1.5 hover:bg-accent rounded transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.filename)}
                          className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg bg-muted/10">
                    No attachments yet
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                Activity
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <UserAvatar userId={user?.id} users={users} size="md" />
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                          e.preventDefault()
                          handleAddComment()
                        }
                      }}
                      className="h-10 text-sm"
                    />
                    {commentText.trim() && (
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAddComment}
                          disabled={loading}
                          size="sm"
                          className="h-8 text-xs font-medium"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            'Post'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {comments.map((comment) => {
                    const commentUser = users.find((u) => u.id === comment.userId)
                    return (
                      <div key={comment.id} className="flex gap-3">
                        <UserAvatar userId={comment.userId} users={users} size="md" />
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {commentUser?.name || (comment.userId === user?.id ? 'You' : 'User')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              at{' '}
                              {new Date(comment.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground bg-muted/40 p-3 rounded-lg leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/10">
                      No comments yet
                    </p>
                  )}
                </div>
              </div>

              {/* Activity History */}
              {activities.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    History
                  </h3>
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      const activityUser = users.find((u) => u.id === activity.userId)
                      return (
                        <div key={activity.id} className="flex gap-3 text-xs">
                          <UserAvatar userId={activity.userId} users={users} size="sm" />
                          <div className="flex-1">
                            <div className="text-muted-foreground">
                              <span className="font-semibold">{activityUser?.name || 'User'}</span>{' '}
                              {formatActivityAction(activity)}
                              <span className="ml-2 text-xs opacity-70">
                                {new Date(activity.createdAt).toLocaleDateString()} at{' '}
                                {new Date(activity.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            </div>

            <div className="space-y-6 lg:border-l lg:pl-6 pt-6 lg:pt-0 border-t lg:border-t-0">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                  Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Assignee
                    </div>
                    <UserSelector
                      value={card.assigneeId}
                      onChange={(userId) => onUpdate({ assigneeId: userId || null })}
                      placeholder="Unassigned"
                      className="h-10"
                      showClear={true}
                      allowedUserIds={
                        board
                          ? [board.ownerId, ...board.memberIds]
                          : undefined
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Status
                    </div>
                    <div className="text-sm font-semibold text-foreground">{card.columnId}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Created
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(card.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  {card.updatedAt !== card.createdAt && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Updated
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(card.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  )}
                  {card.storyPoints && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Story Points
                      </div>
                      <div className="text-sm font-semibold text-foreground">{card.storyPoints}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
                  Delete Issue
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

