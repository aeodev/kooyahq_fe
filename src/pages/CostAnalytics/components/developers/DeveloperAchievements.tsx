import { useMemo } from 'react'
import { Zap, Target, Users, Rocket, Star, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface DeveloperAchievementsProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  onDeveloperClick?: (developerId: string) => void
}

type Achievement = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  developers: TopPerformer[]
}

export function DeveloperAchievements({
  topPerformers,
  summaryData,
  onDeveloperClick,
}: DeveloperAchievementsProps) {
  const achievements = useMemo(() => {
    if (!summaryData || topPerformers.length === 0) return []

    const achievementsList: Achievement[] = []

    // Most Hours Champion
    const mostHours = topPerformers.reduce((max, current) =>
      current.totalHours > max.totalHours ? current : max
    )
    if (mostHours.totalHours > 0) {
      achievementsList.push({
        id: 'hours-champion',
        title: 'Hours Champion',
        description: 'Most hours contributed',
        icon: <Zap className="h-5 w-5" />,
        color: 'text-yellow-500',
        developers: [mostHours],
      })
    }

    // Project Master
    const mostProjects = topPerformers.reduce((max, current) =>
      current.projectCount > max.projectCount ? current : max
    )
    if (mostProjects.projectCount > 0) {
      achievementsList.push({
        id: 'project-master',
        title: 'Project Master',
        description: 'Works on the most projects',
        icon: <Target className="h-5 w-5" />,
        color: 'text-blue-500',
        developers: [mostProjects],
      })
    }

    // Collaboration Star
    const collaborationStars = topPerformers
      .map((performer) => {
        let collaborationScore = 0
        performer.projects.forEach((projectName) => {
          const project = summaryData.projectCosts.find((p) => p.project === projectName)
          if (project && project.developers.length > 1) {
            collaborationScore += project.developers.length - 1
          }
        })
        return { performer, score: collaborationScore }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)

    if (collaborationStars.length > 0) {
      achievementsList.push({
        id: 'collaboration-star',
        title: 'Collaboration Star',
        description: 'Best at working with the team',
        icon: <Users className="h-5 w-5" />,
        color: 'text-purple-500',
        developers: [collaborationStars[0].performer],
      })
    }

    // Versatile Developer (works on many different projects)
    const versatileDevelopers = topPerformers
      .filter((p) => p.projectCount >= 3)
      .sort((a, b) => b.projectCount - a.projectCount)
      .slice(0, 1)

    if (versatileDevelopers.length > 0) {
      achievementsList.push({
        id: 'versatile',
        title: 'Versatile Developer',
        description: 'Most diverse project experience',
        icon: <Rocket className="h-5 w-5" />,
        color: 'text-green-500',
        developers: versatileDevelopers,
      })
    }

    // Rising Star (high project count relative to average)
    const avgProjects = topPerformers.reduce((sum, p) => sum + p.projectCount, 0) / topPerformers.length
    const risingStars = topPerformers
      .filter((p) => p.projectCount > avgProjects * 1.5)
      .sort((a, b) => b.projectCount - a.projectCount)
      .slice(0, 1)

    if (risingStars.length > 0) {
      achievementsList.push({
        id: 'rising-star',
        title: 'Rising Star',
        description: 'Standing out with diverse contributions',
        icon: <Star className="h-5 w-5" />,
        color: 'text-pink-500',
        developers: risingStars,
      })
    }

    // Consistent Contributor (steady across many projects)
    const consistentContributors = topPerformers
      .filter((p) => p.projectCount >= 2)
      .sort((a, b) => {
        const aAvg = a.totalHours / a.projectCount
        const bAvg = b.totalHours / b.projectCount
        return bAvg - aAvg
      })
      .slice(0, 1)

    if (consistentContributors.length > 0) {
      achievementsList.push({
        id: 'consistent',
        title: 'Consistent Contributor',
        description: 'Steady contributions across projects',
        icon: <Flame className="h-5 w-5" />,
        color: 'text-orange-500',
        developers: consistentContributors,
      })
    }

    return achievementsList
  }, [topPerformers, summaryData])

  if (!summaryData || topPerformers.length === 0 || achievements.length === 0) return null

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Achievements</h3>
          <Badge variant="secondary" className="text-xs">🏆 Unlocked</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Celebrate team members who excel in different areas
        </p>
      </div>
      <CardContent className="p-4">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {achievements.map((achievement, i) => (
            <motion.div
              key={achievement.id}
              variants={staggerItem}
              transition={{ delay: i * 0.1, ...transitionNormal }}
              className="p-4 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`${achievement.color} mt-0.5`}>{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground mb-1">
                    {achievement.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {achievement.developers.map((dev) => (
                      <Badge
                        key={dev.userId}
                        variant="outline"
                        className={`text-xs cursor-pointer hover:bg-primary/10 ${onDeveloperClick ? '' : ''}`}
                        onClick={() => onDeveloperClick?.(dev.userId)}
                      >
                        {dev.userName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  )
}
