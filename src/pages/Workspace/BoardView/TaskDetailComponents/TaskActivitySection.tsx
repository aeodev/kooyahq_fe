import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'
import { getUserInitials, isValidImageUrl } from '@/utils/formatters'
import { richTextDocToHtml, hasRichTextContent } from '@/utils/rich-text'
import type { TicketDetailResponse } from './types'

type UserSummary = {
  id: string
  name: string
  profilePic?: string
}

type TaskActivitySectionProps = {
  ticketDetails: TicketDetailResponse | null
  loading: boolean
  activityTab: 'all' | 'comments' | 'history'
  onTabChange: (tab: 'all' | 'comments' | 'history') => void
  onAddComment: (comment: string) => Promise<boolean> | boolean
  canComment: boolean
  users: UserSummary[]
  currentUser?: UserSummary | null
}

type CommentEditorProps = {
  ticketId?: string
  onAddComment: (comment: string) => Promise<boolean> | boolean
  canComment: boolean
  currentUser?: UserSummary | null
}

type UserAvatarProps = {
  user?: UserSummary | null
  size?: 'sm' | 'md'
  className?: string
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const formatActivityTimestamp = (dateStr: string): string => {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const absolute = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return `${formatRelativeTime(dateStr)} | ${absolute}`
}

const sortByCreatedAtDesc = <T extends { createdAt: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    return bTime - aTime
  })

function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [user?.profilePic])

  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
  }

  if (user && isValidImageUrl(user.profilePic) && !imageFailed) {
    return (
      <img
        src={user.profilePic}
        alt={user.name}
        className={cn(
          'rounded-full object-cover ring-1 ring-border/50 flex-shrink-0',
          sizeClasses[size],
          className
        )}
        onError={() => setImageFailed(true)}
      />
    )
  }

  const initials = getUserInitials(user?.name || '?')
  return (
    <div
      className={cn(
        'rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium ring-1 ring-border/50 flex-shrink-0',
        sizeClasses[size],
        className
      )}
      title={user?.name || 'Unknown user'}
    >
      {initials}
    </div>
  )
}

function CommentEditor({ ticketId, onAddComment, canComment, currentUser }: CommentEditorProps) {
  const [isCommentEditorOpen, setIsCommentEditorOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const previousTicketIdRef = useRef<string | undefined>(undefined)

  // Reset draft when switching to a different ticket
  useEffect(() => {
    if (previousTicketIdRef.current && ticketId && previousTicketIdRef.current !== ticketId) {
      setNewComment('')
      setIsCommentEditorOpen(false)
    }
    previousTicketIdRef.current = ticketId
  }, [ticketId])

  if (!canComment) return null

  return (
    <div className="flex gap-3 mb-4">
      <UserAvatar user={currentUser} />
      <div className="flex-1">
        {isCommentEditorOpen ? (
          <>
            <RichTextEditor
              value={newComment}
              onChange={setNewComment}
              placeholder="Add a comment..."
              className="min-h-[80px]"
              autoFocus
              onUploadingChange={setIsUploading}
            />
            <div className="flex items-center gap-2 mt-2">
              {newComment && (
                <Button
                  size="sm"
                  onClick={async () => {
                    const didAdd = await onAddComment(newComment)
                    if (didAdd) {
                      setNewComment('')
                      setIsCommentEditorOpen(false)
                    }
                  }}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Save'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCommentEditorOpen(false)
                  setNewComment('')
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
            {isUploading && (
              <p className="text-xs text-muted-foreground mt-1">
                Please wait for uploads to complete before saving
              </p>
            )}
          </>
        ) : (
          <button
            onClick={() => setIsCommentEditorOpen(true)}
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground border border-border/50 rounded-lg hover:border-border hover:bg-accent/30 transition-colors"
          >
            Add a comment...
          </button>
        )}
      </div>
    </div>
  )
}

export function TaskActivitySection({
  ticketDetails,
  loading,
  activityTab,
  onTabChange,
  onAddComment,
  canComment,
  users,
  currentUser,
}: TaskActivitySectionProps) {
  const resolveUser = (userId?: string | null): UserSummary | null => {
    if (!userId) return null
    return users.find((user) => user.id === userId) || (currentUser?.id === userId ? currentUser : null)
  }

  const sortedComments = sortByCreatedAtDesc(ticketDetails?.comments ?? [])
  const sortedHistory = sortByCreatedAtDesc(ticketDetails?.history ?? [])

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">Activity</h3>
      
      {/* Activity tabs */}
      <div className="flex items-center gap-1 mb-4">
        {(['all', 'comments', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors capitalize',
              activityTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Comment input */}
      <CommentEditor
        ticketId={ticketDetails?.ticket.id}
        onAddComment={onAddComment}
        canComment={canComment}
        currentUser={currentUser}
      />

      {/* Activity content based on tab */}
      {activityTab === 'comments' && (
        <>
          {/* Comments list */}
          {sortedComments.length > 0 ? (
            <div className="divide-y divide-border/60">
              {sortedComments.map((comment) => {
                const commentAuthor = resolveUser(comment.userId)
                const commentAuthorName = commentAuthor?.name || 'Unknown user'
                return (
                  <div key={comment.id} className="flex gap-3 py-4">
                    <UserAvatar user={commentAuthor} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{commentAuthorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatActivityTimestamp(comment.createdAt)}
                        </span>
                      </div>
                        <div className="text-sm">
                          {(() => {
                          const htmlContent = richTextDocToHtml(comment.content)
                          return hasRichTextContent(comment.content) ? (
                            <RichTextDisplay content={htmlContent} />
                          ) : (
                            <p className="text-muted-foreground italic">Empty comment</p>
                          )
                          })()}
                        </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No comments yet</p>
          )}
        </>
      )}

      {activityTab === 'history' && (
        <>
          {/* History list */}
          {sortedHistory.length > 0 ? (
            <div className="divide-y divide-border/60">
              {sortedHistory.map((activity) => {
                const actor = resolveUser(activity.actorId)
                const actorName = actor?.name || 'Unknown user'
                return (
                  <div key={activity.id} className="flex gap-3 py-3">
                    <UserAvatar user={actor} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{actorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatActivityTimestamp(activity.createdAt)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {activity.actionType}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {activity.changes.map((change, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground">
                            {change.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No history yet</p>
          )}
        </>
      )}

      {activityTab === 'all' && (
        <div>
          {(() => {
            const allActivity = [
              ...sortedComments.map((comment) => ({
                type: 'comment' as const,
                createdAt: comment.createdAt,
                comment,
              })),
              ...sortedHistory.map((activity) => ({
                type: 'history' as const,
                createdAt: activity.createdAt,
                activity,
              })),
            ].sort((a, b) => {
              const aTime = new Date(a.createdAt).getTime()
              const bTime = new Date(b.createdAt).getTime()
              return bTime - aTime
            })

            if (allActivity.length === 0) return null

            return (
              <div className="divide-y divide-border/60">
                {allActivity.map((item) => {
                  if (item.type === 'comment') {
                    const commentAuthor = resolveUser(item.comment.userId)
                    const commentAuthorName = commentAuthor?.name || 'Unknown user'
                    return (
                      <div key={`comment-${item.comment.id}`} className="flex gap-3 py-4">
                        <UserAvatar user={commentAuthor} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{commentAuthorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatActivityTimestamp(item.comment.createdAt)}
                            </span>
                          </div>
                          <div className="text-sm">
                            {(() => {
                              const htmlContent = richTextDocToHtml(item.comment.content)
                              return hasRichTextContent(item.comment.content) ? (
                                <RichTextDisplay content={htmlContent} />
                              ) : (
                                <p className="text-muted-foreground italic">Empty comment</p>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  const actor = resolveUser(item.activity.actorId)
                  const actorName = actor?.name || 'Unknown user'
                  return (
                    <div key={`history-${item.activity.id}`} className="flex gap-3 py-3">
                      <UserAvatar user={actor} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{actorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatActivityTimestamp(item.activity.createdAt)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.activity.actionType}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {item.activity.changes.map((change, idx) => (
                            <p key={idx} className="text-sm text-muted-foreground">
                              {change.text}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
