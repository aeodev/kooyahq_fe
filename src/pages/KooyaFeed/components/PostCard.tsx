import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommentSection } from '@/components/posts/CommentSection'
import { PostReactions } from '@/components/posts/PostReactions'
import { PollDisplay } from './PollDisplay'
import { getUserInitials, isValidImageUrl, formatDate } from '@/utils/formatters'
import { DEFAULT_IMAGE_FALLBACK, getInitialsFallback } from '@/utils/image.utils'
import { useAuthStore } from '@/stores/auth.store'
import { MoreHorizontal, Pencil, Trash2, X, Check } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { Post } from '@/types/post'
import { PERMISSIONS } from '@/constants/permissions'

interface PostCardProps {
    post: Post
    onDelete: (postId: string) => Promise<void>
    onUpdate: (postId: string, content: string) => Promise<void>
    onVote: (postId: string, optionIndex: number) => Promise<void>
}

export function PostCard({ post, onDelete, onUpdate, onVote }: PostCardProps) {
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    const can = useAuthStore((state) => state.can)
    const [showComments, setShowComments] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(post.content)

    const isAuthor = user?.id === post.author.id
    const canEditPost = isAuthor && (can(PERMISSIONS.POST_UPDATE) || can(PERMISSIONS.POST_FULL_ACCESS))
    const canDeletePost = isAuthor && (can(PERMISSIONS.POST_DELETE) || can(PERMISSIONS.POST_FULL_ACCESS))

    const handleProfileClick = () => {
        navigate(`/profile?userId=${post.author.id}`)
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return

        setIsDeleting(true)
        try {
            await onDelete(post.id)
            toast.success('Post deleted')
        } catch (error) {
            toast.error('Failed to delete post')
            setIsDeleting(false)
        }
    }

    const handleEdit = () => {
        setIsEditing(true)
        setEditContent(post.content)
    }

    const handleSaveEdit = async () => {
        // Allow empty content if there is an image or poll
        if (!editContent.trim() && !post.imageUrl && !post.poll) return

        if (editContent === post.content) {
            setIsEditing(false)
            return
        }

        try {
            await onUpdate(post.id, editContent)
            setIsEditing(false)
            toast.success('Post updated')
        } catch (error) {
            toast.error('Failed to update post')
        }
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
        setEditContent(post.content)
    }

    if (isDeleting) {
        return null // Optimistically hide or show loading state
    }

    return (
        <article className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        {isValidImageUrl(post.author.profilePic) ? (
                            <button onClick={handleProfileClick} className="flex-shrink-0">
                                <img
                                    src={post.author.profilePic}
                                    alt={post.author.name}
                                    className="h-12 w-12 rounded-2xl object-cover ring-2 ring-border/50 hover:ring-primary/50 transition-all"
                                    onError={(e) => {
                                        const target = e.currentTarget
                                        target.onerror = null
                                        target.src = getInitialsFallback(post.author.name)
                                    }}
                                />
                            </button>
                        ) : (
                            <button
                                onClick={handleProfileClick}
                                className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0 ring-2 ring-border/50 hover:ring-primary/50 transition-all"
                            >
                                {getUserInitials(post.author.name)}
                            </button>
                        )}
                        <div className="flex-1 min-w-0">
                            <button
                                onClick={handleProfileClick}
                                className="font-semibold text-base hover:text-primary transition-colors text-left block mb-1 truncate w-full"
                            >
                                {post.author.name}
                            </button>
                            <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                        </div>
                    </div>

                    {(canEditPost || canDeletePost) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {canEditPost && (
                                    <DropdownMenuItem onClick={handleEdit}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {canDeletePost && (
                                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <div
                    className="text-base leading-relaxed rich-text-display text-foreground prose prose-sm dark:prose-invert max-w-none break-words"
                >
                    {isEditing ? (
                        <div className="space-y-2">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[100px] bg-background/50"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                    <X className="w-4 h-4 mr-1" /> Cancel
                                </Button>
                                <Button size="sm" onClick={handleSaveEdit}>
                                    <Check className="w-4 h-4 mr-1" /> Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    )}
                </div>

                {isValidImageUrl(post.imageUrl) && (
                    <div className="rounded-xl overflow-hidden border border-border ring-1 ring-border/30">
                        <img
                            src={post.imageUrl}
                            alt="Post"
                            className="w-full max-h-[500px] object-cover"
                            onError={(e) => {
                                const target = e.currentTarget
                                target.onerror = null
                                target.src = DEFAULT_IMAGE_FALLBACK
                            }}
                        />
                    </div>
                )}

                {post.poll && post.poll.options && post.poll.options.length > 0 && <PollDisplay post={post} onVote={onVote} />}

                <div>
                    <PostReactions
                        postId={post.id}
                        onCommentClick={() => setShowComments(!showComments)}
                    />
                    {showComments && <CommentSection postId={post.id} />}
                </div>
            </div>
        </article>
    )
}
