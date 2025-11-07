import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type TeamMember = {
  id: string
  name: string
  email: string
  position?: string
  profilePic?: string
  status: 'active' | 'inactive'
  todayHours: string
  activeTimer?: {
    duration: string
    projects: string[]
    task: string
  }
  entries: Array<{
    id: string
    project: string
    task: string
    duration: string
    time: string
  }>
}

type TeamMemberCardProps = {
  member: TeamMember
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  return (
    <Card className="hover:shadow-xl transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {member.profilePic && member.profilePic !== 'undefined' && member.profilePic.trim() !== '' ? (
              <img
                src={member.profilePic}
                alt={member.name}
                className="h-10 w-10 rounded-2xl object-cover ring-2 ring-border/50 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const parent = (e.target as HTMLImageElement).parentElement
                  if (parent && !parent.querySelector('.fallback-initials')) {
                    const fallback = document.createElement('div')
                    fallback.className = 'fallback-initials h-10 w-10 rounded-2xl ring-2 ring-border/50 bg-primary/10 backdrop-blur-sm flex items-center justify-center text-sm font-medium'
                    fallback.textContent = member.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                    parent.insertBefore(fallback, e.target as HTMLImageElement)
                  }
                }}
              />
            ) : (
              <div className="h-10 w-10 rounded-2xl ring-2 ring-border/50 bg-primary/10 backdrop-blur-sm flex items-center justify-center text-sm font-medium">
                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <p className="font-medium">{member.name}</p>
              {member.position && (
                <p className="text-xs font-medium text-foreground mt-0.5">{member.position}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span className="text-sm font-semibold">{member.todayHours}</span>
          </div>
        </div>

        {member.activeTimer && (
          <div className="mb-4 p-3 rounded-xl bg-primary/5 backdrop-blur-sm border border-primary/20 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Active Timer</p>
              <p className="text-lg font-bold text-primary">{member.activeTimer.duration}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{member.activeTimer.task}</p>
            <div className="flex flex-wrap gap-1">
              {member.activeTimer.projects.map((project) => (
                <Badge key={project} variant="secondary" className="text-xs">
                  {project}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</p>
          {member.entries.slice(0, 3).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{entry.task}</p>
                <p className="text-xs text-muted-foreground">{entry.project} · {entry.time}</p>
              </div>
              <p className="text-sm font-medium ml-2">{entry.duration}</p>
            </div>
          ))}
          {member.entries.length === 0 && (
            <p className="text-xs text-muted-foreground">No activity today</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}



