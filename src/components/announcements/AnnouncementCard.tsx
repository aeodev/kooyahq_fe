import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Megaphone, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useDeleteAnnouncement } from '@/hooks/announcement.hooks'
import { PERMISSIONS } from '@/constants/permissions'
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
  const can = useAuthStore((state) => state.can)
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
    <Card className="relative overflow-hidden border border-border/30 bg-card/40 dark:bg-card/25 backdrop-blur-xl shadow-lg shadow-black/[0.03] dark:shadow-black/20">
      {/* Accent gradient */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.4) 100%)' }}
      />
      
      <CardHeader className="pb-3 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="font-bold text-lg text-foreground leading-tight">{announcement.title}</h3>
              <span className="text-xs text-muted-foreground font-medium">
                {formatDate(announcement.createdAt)}
              </span>
            </div>
          </div>
          
          {(can(PERMISSIONS.ANNOUNCEMENT_DELETE) || can(PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS)) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-6">
        <div
          className="text-sm leading-relaxed rich-text-display text-foreground/80"
          dangerouslySetInnerHTML={{ __html: announcement.content }}
        />
      </CardContent>
    </Card>
  )
}
