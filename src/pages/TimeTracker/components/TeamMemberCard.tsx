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
    <Card className="hover:shadow-xl transition-all duration-300 max-h-[320px] flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1 overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex items-start justify-between mb-3 flex-shrink-0">
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
              <p className="font-medium text-sm">{member.name}</p>
              {member.position && (
                <p className="text-xs text-muted-foreground mt-0.5">{member.position}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${member.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-sm font-semibold">{member.todayHours}</span>
          </div>
        </div>

        {/* Active Timer - Fixed */}
        {member.activeTimer && (
          <div className="mb-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              <p className="text-sm font-bold text-primary">{member.activeTimer.duration}</p>
            </div>
            <p className="text-xs text-foreground truncate">{member.activeTimer.task}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {member.activeTimer.projects.slice(0, 2).map((project) => (
                <Badge key={project} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {project}
                </Badge>
              ))}
              {member.activeTimer.projects.length > 2 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  +{member.activeTimer.projects.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity - Scrollable */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex-shrink-0">Recent Activity</p>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {member.entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{entry.task || 'No task'}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.project}</p>
                </div>
                <p className="text-xs font-medium ml-2 flex-shrink-0">{entry.duration}</p>
              </div>
            ))}
            {member.entries.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No activity today</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



