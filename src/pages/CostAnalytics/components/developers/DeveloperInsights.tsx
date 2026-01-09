import { useMemo } from 'react'
import { Sparkles, Users, TrendingUp, Award, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface DeveloperInsightsProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  onDeveloperClick?: (developerId: string) => void
}

type Insight = {
  type: 'diverse' | 'collaborator' | 'sharer' | 'growing' | 'team-player'
  developer: TopPerformer
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

export function DeveloperInsights({
  topPerformers,
  summaryData,
  onDeveloperClick,
}: DeveloperInsightsProps) {
  const insights = useMemo(() => {
    if (!summaryData || topPerformers.length === 0) return []

    const insightsList: Insight[] = []

    // Most Diverse Contributor
    const mostDiverse = topPerformers.reduce((max, current) =>
      current.projectCount > max.projectCount ? current : max
    )
    if (mostDiverse.projectCount > 1) {
      insightsList.push({
        type: 'diverse',
        developer: mostDiverse,
        title: 'Most Diverse Contributor',
        description: `Works across ${mostDiverse.projectCount} different projects, showing exceptional versatility`,
        icon: <Sparkles className="h-5 w-5" />,
        color: 'text-purple-600',
      })
    }

    // Great Collaborator (works with most team members)
    const collaborationScores = topPerformers.map((performer) => {
      let collaborationCount = 0
      performer.projects.forEach((projectName) => {
        const project = summaryData.projectCosts.find((p) => p.project === projectName)
        if (project && project.developers.length > 1) {
          collaborationCount += project.developers.length - 1 // Count other developers
        }
      })
      return { performer, score: collaborationCount }
    })
    const greatCollaborator = collaborationScores.reduce((max, current) =>
      current.score > max.score ? current : max
    )
    if (greatCollaborator.score > 0) {
      insightsList.push({
        type: 'collaborator',
        developer: greatCollaborator.performer,
        title: 'Great Collaborator',
        description: `Works closely with many team members across multiple projects`,
        icon: <Users className="h-5 w-5" />,
        color: 'text-blue-600',
      })
    }

    // Knowledge Sharer (works on projects with others)
    const knowledgeSharers = topPerformers
      .map((performer) => {
        let sharedProjectCount = 0
        performer.projects.forEach((projectName) => {
          const project = summaryData.projectCosts.find((p) => p.project === projectName)
          if (project && project.developers.length > 1) {
            sharedProjectCount++
          }
        })
        return { performer, sharedProjectCount }
      })
      .filter((item) => item.sharedProjectCount > 0)
      .sort((a, b) => b.sharedProjectCount - a.sharedProjectCount)

    if (knowledgeSharers.length > 0) {
      insightsList.push({
        type: 'sharer',
        developer: knowledgeSharers[0].performer,
        title: 'Knowledge Sharer',
        description: `Contributes to ${knowledgeSharers[0].sharedProjectCount} collaborative projects, promoting knowledge sharing`,
        icon: <Heart className="h-5 w-5" />,
        color: 'text-pink-600',
      })
    }

    // Growing Contributor (increasing project diversity over time)
    // For now, we'll use current project count as a proxy
    const growingContributor = topPerformers
      .filter((p) => p.projectCount >= 3)
      .sort((a, b) => b.projectCount - a.projectCount)[0]

    if (growingContributor) {
      insightsList.push({
        type: 'growing',
        developer: growingContributor,
        title: 'Growing Contributor',
        description: `Expanding expertise across ${growingContributor.projectCount} projects, showing continuous growth`,
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'text-green-600',
      })
    }

    // Team Player (consistent collaboration)
    const teamPlayers = topPerformers
      .map((performer) => {
        const collaborativeProjects = performer.projects.filter((projectName) => {
          const project = summaryData.projectCosts.find((p) => p.project === projectName)
          return project && project.developers.length > 1
        })
        return {
          performer,
          collaborativeRatio: collaborativeProjects.length / performer.projectCount,
        }
      })
      .filter((item) => item.collaborativeRatio >= 0.5)
      .sort((a, b) => b.collaborativeRatio - a.collaborativeRatio)

    if (teamPlayers.length > 0) {
      insightsList.push({
        type: 'team-player',
        developer: teamPlayers[0].performer,
        title: 'Team Player',
        description: `Consistently collaborates on ${Math.round(teamPlayers[0].collaborativeRatio * 100)}% of projects`,
        icon: <Award className="h-5 w-5" />,
        color: 'text-amber-600',
      })
    }

    return insightsList.slice(0, 5) // Limit to 5 insights
  }, [topPerformers, summaryData])

  if (!summaryData || topPerformers.length === 0 || insights.length === 0) return null

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Team Insights</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Celebrating positive contributions and collaboration
        </p>
      </div>
      <CardContent className="p-4">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {insights.map((insight, i) => (
            <motion.div
              key={`${insight.type}-${insight.developer.userId}`}
              variants={staggerItem}
              transition={{ delay: i * 0.1, ...transitionNormal }}
              className={`p-4 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors ${
                onDeveloperClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onDeveloperClick?.(insight.developer.userId)}
            >
              <div className="flex items-start gap-3">
                <div className={`${insight.color} mt-0.5`}>{insight.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">{insight.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {insight.developer.userName}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  )
}
