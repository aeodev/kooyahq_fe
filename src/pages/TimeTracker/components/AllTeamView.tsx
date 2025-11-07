import { Card, CardContent } from '@/components/ui/card'
import { TeamMemberCard } from './TeamMemberCard'

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

type AllTeamViewProps = {
  members: TeamMember[]
  totalTeamHours: string
}

export function AllTeamView({ members, totalTeamHours }: AllTeamViewProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Team Total Today</p>
            <p className="text-2xl font-bold">{totalTeamHours}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Active Members</p>
            <p className="text-2xl font-bold">{members.filter(m => m.status === 'active').length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <TeamMemberCard key={member.id} member={member} />
        ))}
      </div>

      {members.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No team members found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

