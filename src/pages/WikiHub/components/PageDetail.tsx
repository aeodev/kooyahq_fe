import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight,
  Edit2,
  MoreHorizontal,
  Pin,
  Star,
  Trash2,
  FileText,
  X,
  Clock,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { usePage, usePages } from '@/hooks/wiki-hub.hooks'
import { toastManager } from '@/components/ui/toast'
import { cn } from '@/utils/cn'

function extractHtmlFromRichTextDoc(content: any): string {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') {
    if (content.type === 'html' && typeof content.content === 'string') {
      return content.content
    }
    if (content.ops && Array.isArray(content.ops)) return ''
  }
  return ''
}

function formatDate(dateString: string, includeTime = false) {
  const date = new Date(dateString)
  if (includeTime) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PageDetail() {
  const { pageId } = useParams<{ pageId: string }>()
  const navigate = useNavigate()
  const { page, loading, error, fetchPage, pinPage, unpinPage, favoritePage, unfavoritePage } =
    usePage(pageId)
  const { updatePage, deletePage } = usePages(undefined)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const htmlContent = useMemo(() => {
    if (!page) return ''
    return extractHtmlFromRichTextDoc(page.content)
  }, [page])

  useEffect(() => {
    if (page) {
      setEditedTitle(page.title)
      setEditedContent(htmlContent)
    }
  }, [page, htmlContent])

  const handleSave = async () => {
    if (!page || !editedTitle.trim()) {
      toastManager.error('Title is required')
      return
    }

    setIsSaving(true)
    try {
      await updatePage(page.id, {
        title: editedTitle.trim(),
        content: { type: 'html', content: editedContent },
      })
      setIsEditing(false)
      await fetchPage()
      toastManager.success('Page saved')
    } catch (err: any) {
      toastManager.error(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (page) {
      setEditedTitle(page.title)
      setEditedContent(htmlContent)
    }
    setIsEditing(false)
  }

  const handlePin = async () => {
    if (!page) return
    try {
      if (page.isPinned) {
        await unpinPage()
        toastManager.success('Unpinned')
      } else {
        await pinPage()
        toastManager.success('Pinned')
      }
    } catch (err: any) {
      toastManager.error(err.message || 'Failed')
    }
  }

  const handleFavorite = async () => {
    if (!page) return
    try {
      if (isFavorited) {
        await unfavoritePage()
        toastManager.success('Removed from favorites')
      } else {
        await favoritePage()
        toastManager.success('Added to favorites')
      }
    } catch (err: any) {
      toastManager.error(err.message || 'Failed')
    }
  }

  const handleDelete = async () => {
    if (!page) return
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return

    try {
      await deletePage(page.id)
      toastManager.success('Page deleted')
      navigate('/wiki-hub')
    } catch (err: any) {
      toastManager.error(err.message || 'Failed to delete')
    }
  }

  const isFavorited = useMemo(() => {
    if (!page) return false
    return page.favorites.length > 0
  }, [page])

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-6 py-3">
          <div className="h-4 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse mt-8" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !page) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">Page not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error || 'This page does not exist.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/wiki-hub')}>
          Back to pages
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Breadcrumb */}
      <div className="border-b px-6 py-2.5">
        <nav className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => navigate('/wiki-hub')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Wiki Hub
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-medium truncate max-w-xs">{page.title}</span>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-2xl font-semibold h-auto py-1 px-0 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-primary"
                placeholder="Page title"
                autoFocus
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                    {page.title}
                    {page.isPinned && <Pin className="h-4 w-4 text-amber-500" />}
                    {isFavorited && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  </h1>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(page.updatedAt, true)}
                    </span>
                    {page.status === 'draft' && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Draft</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handlePin}>
                        <Pin className="h-4 w-4 mr-2" />
                        {page.isPinned ? 'Unpin' : 'Pin to top'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleFavorite}>
                        <Star className="h-4 w-4 mr-2" />
                        {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete page
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {!isEditing && (page.category || page.tags.length > 0) && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {page.category && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                  {page.category}
                </span>
              )}
              {page.tags.map((tag) => (
                <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          {isEditing ? (
            <div className="space-y-4">
              <RichTextEditor
                value={editedContent}
                onChange={setEditedContent}
                placeholder="Start writing..."
                onUploadingChange={setIsUploading}
              />

              {/* Edit Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || isUploading || !editedTitle.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:text-foreground/80 prose-a:text-primary">
              {htmlContent ? (
                <RichTextDisplay content={htmlContent} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">This page is empty.</p>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Add content
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


