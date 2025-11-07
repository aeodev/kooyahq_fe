import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Megaphone, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useDeleteAnnouncement } from '@/hooks/announcement.hooks'
import type { Announcement } from '@/types/announcement'

interface AnnouncementCardProps {
  announcement: Announcement
  onDelete?: () => void
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

export function AnnouncementCard({ announcement, onDelete }: AnnouncementCardProps) {
  const user = useAuthStore((state) => state.user)
  const { deleteAnnouncement, loading } = useDeleteAnnouncement()

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return
    }

    try {
      await deleteAnnouncement(announcement.id)
      onDelete?.()
    } catch (error: any) {
      alert(error.message || 'Failed to delete announcement')
    }
  }

  return (
    <Card className="border-l-4 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Megaphone className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">{announcement.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(announcement.createdAt)}
            </span>
            {user?.isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="text-sm leading-relaxed rich-text-display text-foreground"
          dangerouslySetInnerHTML={{ __html: announcement.content }}
        />
      </CardContent>
    </Card>
  )
}

