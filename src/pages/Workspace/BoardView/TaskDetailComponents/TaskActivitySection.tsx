import { useState, useEffect } from 'react'
import { Settings2, MessageSquare, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'
import { richTextDocToHtml, hasRichTextContent } from '@/utils/rich-text'
import type { TicketDetailResponse } from './types'
import { MOCK_ASSIGNEES } from '../index'

type TaskActivitySectionProps = {
  ticketDetails: TicketDetailResponse | null
  loading: boolean
  activityTab: 'all' | 'comments' | 'history'
  newComment: string
  onTabChange: (tab: 'all' | 'comments' | 'history') => void
  onCommentChange: (comment: string) => void
  onAddComment: () => void
  canComment: boolean
}

export function TaskActivitySection({
  ticketDetails,
  loading,
  activityTab,
  newComment,
  onTabChange,
  onCommentChange,
  onAddComment,
  canComment,
}: TaskActivitySectionProps) {
  const [isCommentEditorOpen, setIsCommentEditorOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Close editor when comment is cleared externally
  useEffect(() => {
    if (!newComment.trim() && isCommentEditorOpen) {
      setIsCommentEditorOpen(false)
    }
  }, [newComment, isCommentEditorOpen])

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
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
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
      {canComment && (
      <div className="flex gap-3 mb-4">
        <div className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs text-white font-medium flex-shrink-0">
          SL
        </div>
        <div className="flex-1">
          {isCommentEditorOpen ? (
            <>
              <RichTextEditor
                value={newComment}
                onChange={onCommentChange}
                placeholder="Add a comment..."
                className="min-h-[80px]"
                autoFocus
                onUploadingChange={setIsUploading}
              />
              <div className="flex items-center gap-2 mt-2">
                {newComment && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onAddComment()
                      setIsCommentEditorOpen(false)
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
                    onCommentChange('')
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
      )}

      {/* Activity content based on tab */}
      {activityTab === 'comments' && (
        <>
          {/* Comments list */}
          {ticketDetails?.comments && ticketDetails.comments.length > 0 ? (
            <div className="space-y-4">
              {ticketDetails.comments.map((comment) => {
                const commentAuthor = MOCK_ASSIGNEES.find((a) => a.id === comment.userId) || MOCK_ASSIGNEES[0]
                return (
                  <div key={comment.id} className="flex gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0',
                        commentAuthor.color
                      )}
                    >
                      {commentAuthor.initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{commentAuthor.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
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
          {ticketDetails?.history && ticketDetails.history.length > 0 ? (
            <div className="space-y-3">
              {ticketDetails.history.map((activity) => {
                const actor = MOCK_ASSIGNEES.find((a) => a.id === activity.actorId) || MOCK_ASSIGNEES[0]
                return (
                  <div key={activity.id} className="flex gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0',
                        actor.color
                      )}
                    >
                      {actor.initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{actor.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString()}
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
        <div className="space-y-4">
          {/* Show both comments and history */}
          {ticketDetails?.comments && ticketDetails.comments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Comments</h4>
              </div>
              <div className="space-y-4 ml-6">
                {ticketDetails.comments.map((comment) => {
                  const commentAuthor = MOCK_ASSIGNEES.find((a) => a.id === comment.userId) || MOCK_ASSIGNEES[0]
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0',
                          commentAuthor.color
                        )}
                      >
                        {commentAuthor.initials}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{commentAuthor.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
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
            </div>
          )}

          {ticketDetails?.history && ticketDetails.history.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">History</h4>
              </div>
              <div className="space-y-3 ml-6">
                {ticketDetails.history.map((activity) => {
                  const actor = MOCK_ASSIGNEES.find((a) => a.id === activity.actorId) || MOCK_ASSIGNEES[0]
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0',
                          actor.color
                        )}
                      >
                        {actor.initials}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{actor.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleDateString()}
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
