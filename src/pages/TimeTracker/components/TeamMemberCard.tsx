import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TeamMember } from './team-utils'
import { formatDuration, normalizeTaskText, isWorkspaceTicketTask } from './utils'

type TeamMemberCardProps = {
  member: TeamMember
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  const isActive = member.status === 'active'
  
  return (
    <Card className={`
      border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden
      hover:shadow-lg hover:border-border transition-all duration-300
      h-[340px] flex flex-col
      ${isActive ? 'ring-1 ring-emerald-500/20' : ''}
    `}>
      <CardContent className="p-4 flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            {member.profilePic && member.profilePic !== 'undefined' && member.profilePic.trim() !== '' ? (
              <img
                src={member.profilePic}
                alt={member.name}
                className={`h-10 w-10 rounded-full object-cover ring-2 ${isActive ? 'ring-emerald-500/50' : 'ring-border/50'}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const parent = (e.target as HTMLImageElement).parentElement
                  if (parent && !parent.querySelector('.fallback-initials')) {
                    const fallback = document.createElement('div')
                    fallback.className = `fallback-initials h-10 w-10 rounded-full ring-2 ${isActive ? 'ring-emerald-500/50' : 'ring-border/50'} bg-primary/10 flex items-center justify-center text-sm font-semibold`
                    fallback.textContent = member.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                    parent.insertBefore(fallback, e.target as HTMLImageElement)
                  }
                }}
              />
            ) : (
              <div className={`h-10 w-10 rounded-full ring-2 ${isActive ? 'ring-emerald-500/50' : 'ring-border/50'} bg-primary/10 flex items-center justify-center text-sm font-semibold`}>
                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-foreground">{member.name}</p>
              {member.position && (
                <p className="text-xs text-muted-foreground">{member.position}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-muted-foreground/30'}`} />
            <span className="text-base font-bold text-foreground tabular-nums">{member.todayHours}</span>
          </div>
        </div>

        {/* Active Timer */}
        {member.activeTimer && (
          <div className={`mb-4 rounded-lg border flex-shrink-0 overflow-hidden ${
            member.activeTimer.isPaused 
              ? 'bg-yellow-500/5 border-yellow-500/20' 
              : 'bg-emerald-500/5 border-emerald-500/20'
          }`}>
            {/* Header Bar */}
            <div className={`px-3 py-2 border-b flex items-center justify-between ${
               member.activeTimer.isPaused 
                 ? 'bg-yellow-500/10 border-yellow-500/20' 
                 : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  member.activeTimer.isPaused 
                    ? 'bg-yellow-500' 
                    : 'bg-emerald-500 animate-pulse'
                }`} />
                <p className={`text-xs font-medium ${
                  member.activeTimer.isPaused 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {member.activeTimer.isPaused ? 'Paused' : 'Recording'}
                </p>
              </div>
              <p className={`text-base font-bold tabular-nums ${
                member.activeTimer.isPaused 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {member.activeTimer.duration}
              </p>
            </div>

            {/* Content Body */}
            <div className="p-3 space-y-3">
              {/* Task Description with Border */}
               <div className={`border rounded-md px-3 py-2 ${
                 member.activeTimer.isPaused
                   ? 'bg-yellow-500/5 border-yellow-500/20'
                   : 'bg-emerald-500/5 border-emerald-500/20'
               }`}>
                 <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Current Task</p>
                 <p className="text-sm font-medium text-foreground truncate">{member.activeTimer.task}</p>
               </div>

              {/* Projects */}
              <div className="flex flex-wrap gap-2">
                {member.activeTimer.projects.slice(0, 2).map((project) => (
                  <Badge 
                    key={project} 
                    className={`text-xs px-2 py-0 border-0 ${
                      member.activeTimer?.isPaused
                        ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {project}
                  </Badge>
                ))}
                {member.activeTimer.projects.length > 2 && (
                  <Badge className={`text-xs px-2 py-0 border-0 ${
                    member.activeTimer?.isPaused
                      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    +{member.activeTimer.projects.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <p className="text-xs text-muted-foreground font-medium mb-2 flex-shrink-0">Recent Activity</p>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {member.entries.map((entry) => (
              <div 
                key={entry.id} 
                className="py-2 px-2 rounded-lg hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-xs text-muted-foreground">{entry.project}</p>
                    {entry.tasks.length > 0 ? (
                      <div className="space-y-1">
                        {entry.tasks.map((task, index) => {
                          const isWorkspaceTask = isWorkspaceTicketTask(task.text)
                          return (
                            <div key={`${task.addedAt}-${index}`} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isWorkspaceTask && (
                                  <Badge className="text-[9px] py-0 px-1.5 bg-primary/10 text-primary border-0">
                                    Workspace
                                  </Badge>
                                )}
                                <span className="text-sm text-foreground truncate">
                                  {normalizeTaskText(task.text)}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {formatDuration(task.duration)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No tasks recorded</p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground ml-4 flex-shrink-0 tabular-nums">{entry.duration}</p>
                </div>
              </div>
            ))}
            {member.entries.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground">No activity today</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
