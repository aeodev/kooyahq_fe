import { useState, useEffect } from 'react'
import { X, FileText, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'
import { useTemplates, type Template } from '@/hooks/wiki-hub.hooks'
import { useNavigate } from 'react-router-dom'

type CreatePageModalProps = {
  open: boolean
  onClose: () => void
  workspaceId: string
  onCreate?: (pageId: string) => void
}

export function CreatePageModal({ open, onClose, workspaceId, onCreate }: CreatePageModalProps) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { templates, loading: templatesLoading } = useTemplates(workspaceId)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setSelectedTemplate(null)
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const axiosInstance = (await import('@/utils/axios.instance')).default
      const { CREATE_PAGE, CREATE_PAGE_FROM_TEMPLATE } = await import('@/utils/api.routes')

      let response
      if (selectedTemplate) {
        response = await axiosInstance.post(CREATE_PAGE_FROM_TEMPLATE(selectedTemplate), {
          workspaceId,
          title: title.trim(),
        })
      } else {
        response = await axiosInstance.post(CREATE_PAGE(), {
          workspaceId,
          title: title.trim(),
          content: { type: 'html', content: '' },
          status: 'published',
        })
      }

      const newPage = response.data.data
      onClose()

      if (onCreate) {
        onCreate(newPage.id)
      }
      navigate(`/wiki-hub/${newPage.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create page')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="sm">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-foreground">Create page</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="page-title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="page-title"
              placeholder="Enter page title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              className={cn('h-9', error && 'border-destructive focus-visible:ring-destructive')}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Template</Label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {/* Blank option */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded text-left text-sm transition-colors',
                    selectedTemplate === null
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">Blank page</span>
                  </div>
                  {selectedTemplate === null && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>

                {/* Templates */}
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded text-left text-sm transition-colors',
                      selectedTemplate === template.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{template.category}</span>
                    </div>
                    {selectedTemplate === template.id && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-muted/30">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading || !title.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
