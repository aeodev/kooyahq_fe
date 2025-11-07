import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateAnnouncement } from '@/hooks/announcement.hooks'
import { X } from 'lucide-react'

interface CreateAnnouncementFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const EXPIRATION_OPTIONS = [
  { label: '8 hours', hours: 8 },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
]

export function CreateAnnouncementForm({ open, onClose, onSuccess }: CreateAnnouncementFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [duration, setDuration] = useState(EXPIRATION_OPTIONS[1].hours)
  const { createAnnouncement, loading } = useCreateAnnouncement()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required')
      return
    }

    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString()

    try {
      await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        isActive: true,
        expiresAt,
      })
      onSuccess()
      setTitle('')
      setContent('')
      setDuration(EXPIRATION_OPTIONS[1].hours)
      onClose()
    } catch (error: any) {
      alert(error.message || 'Failed to create announcement')
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="2xl">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Create Announcement</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[70vh]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="text-sm font-medium mb-2 block">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title"
                required
              />
            </div>

            <div>
              <label htmlFor="content" className="text-sm font-medium mb-2 block">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter announcement content"
                required
                className="flex min-h-[120px] w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm shadow-sm transition-all duration-300 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Expires in</p>
              <div className="grid grid-cols-3 gap-2">
                {EXPIRATION_OPTIONS.map((option) => (
                  <Button
                    key={option.hours}
                    type="button"
                    variant={duration === option.hours ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setDuration(option.hours)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Announcement hides automatically once the selected time elapses.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Create Announcement'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Modal>
  )
}
