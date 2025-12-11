import { useState, useEffect } from 'react'
import { X, FileText } from 'lucide-react'
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
      setError('Page title is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const axiosInstance = (await import('@/utils/axios.instance')).default
      const { CREATE_PAGE, CREATE_PAGE_FROM_TEMPLATE } = await import('@/utils/api.routes')

      let response
      if (selectedTemplate) {
        // Create from template
        response = await axiosInstance.post(CREATE_PAGE_FROM_TEMPLATE(selectedTemplate), {
          workspaceId,
          title: title.trim(),
        })
      } else {
        // Create blank page
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
      } else {
        navigate(`/wiki-hub/${newPage.id}`)
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to create page'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setSelectedTemplate(null)
    setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} maxWidth="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Create new page</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Page Title */}
          <div className="space-y-2">
            <Label htmlFor="page-title">Page title</Label>
            <Input
              id="page-title"
              placeholder="e.g., Company Onboarding Guide"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              className={cn(error && 'border-destructive focus-visible:ring-destructive')}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div className="space-y-3">
              <Label>Template (optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    selectedTemplate === null
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-border hover:bg-accent/30'
                  )}
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Blank Page</p>
                    <p className="text-xs text-muted-foreground">Start from scratch</p>
                  </div>
                </button>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-border hover:bg-accent/30'
                    )}
                  >
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{template.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Creating...' : 'Create page'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
