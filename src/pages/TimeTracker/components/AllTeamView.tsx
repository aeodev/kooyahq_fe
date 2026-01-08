import { Card, CardContent } from '@/components/ui/card'
import { TeamMemberCard } from './TeamMemberCard'
import { Users, Clock, Activity } from 'lucide-react'

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
    isPaused?: boolean
  }
  entries: Array<{
    id: string
    project: string
    task: string
    duration: string
    time: string
  }>
}

type AllTeamViewProps = {
  members: TeamMember[]
  totalTeamHours: string
}

export function AllTeamView({ members, totalTeamHours }: AllTeamViewProps) {
  const activeCount = members.filter(m => m.status === 'active').length
  const totalMembers = members.length

  return (
    <div className="space-y-6">
      {/* Team Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Team Total Today</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{totalTeamHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-muted/50">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold text-foreground">{totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <TeamMemberCard key={member.id} member={member} />
        ))}
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="py-12 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No team members found</p>
            <p className="text-xs text-muted-foreground mt-1">Team activity will appear here</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
