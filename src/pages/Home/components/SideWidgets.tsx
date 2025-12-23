import { Link } from 'react-router-dom'
import { Users, Sparkles, Megaphone, Bell, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import type { User } from '@/types/user'
import type { NewsItem } from '@/types/ai-news'
import type { Announcement } from '@/types/announcement'

interface TeamWidgetProps {
  activeUsers: User[]
  totalUsers: number
}

export function TeamWidget({ activeUsers, totalUsers }: TeamWidgetProps) {
  const displayUsers = activeUsers.slice(0, 5)
  const remaining = Math.max(0, activeUsers.length - 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4" /> Team
        </CardTitle>
        <span className="text-xs text-muted-foreground">{activeUsers.length} / {totalUsers} Online</span>
      </CardHeader>
      <CardContent className="pb-4">
        {activeUsers.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {displayUsers.map((u) => (
                <div
                  key={u.id}
                  className="h-8 w-8 rounded-full ring-2 ring-background bg-accent flex items-center justify-center text-xs font-medium relative"
                  title={u.name}
                >
                  {u.profilePic ? (
                    <img src={u.profilePic} alt={u.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    u.name.charAt(0).toUpperCase()
                  )}
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
              ))}
            </div>
            {remaining > 0 && (
              <div className="text-xs text-muted-foreground font-medium">+{remaining} more</div>
            )}
            <Link to="/presence" className="ml-auto text-xs text-primary hover:underline">
              View Map
            </Link>
          </div>
        ) : (
           <p className="text-sm text-muted-foreground">No one else is online.</p>
        )}
      </CardContent>
    </Card>
  )
}

interface NewsWidgetProps {
  news: NewsItem | null
}

export function NewsWidget({ news }: NewsWidgetProps) {
  if (!news) return null
  
  return (
    <Card className="bg-muted/30 border-none">
       <Link to="/ai-news" className="block h-full hover:bg-muted/50 transition-colors rounded-xl">
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Latest AI News
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="font-medium leading-snug line-clamp-2">
            {news.title}
          </p>
          <div className="mt-2 flex items-center text-xs text-muted-foreground">
             <span>Read more</span>
             <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

interface NotificationsWidgetProps {
    unreadCount: number
}

export function NotificationsWidget({ unreadCount }: NotificationsWidgetProps) {
    if (unreadCount === 0) return null
    
    return (
        <Link to="/notifications">
            <div className="bg-primary/10 text-primary rounded-xl p-4 flex items-center justify-between hover:bg-primary/20 transition-colors mb-4">
                <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4" />
                    <span className="font-medium text-sm">You have {unreadCount} unread notifications</span>
                </div>
                <ArrowRight className="h-4 w-4" />
            </div>
        </Link>
    )
}

