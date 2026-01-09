import { useMemo } from 'react'
import { Target, Award, TrendingUp, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { TopPerformer, CostSummaryData, CurrencyConfig } from '@/types/cost-analytics'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface ProjectImpactProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  currencyConfig: CurrencyConfig
}

type DeveloperImpact = {
  developer: TopPerformer
  projectCount: number
  totalContributions: number
  avgContributionPerProject: number
  projectDiversity: number // Unique projects / total projects ratio
}

export function ProjectImpact({
  topPerformers,
  summaryData,
  currencyConfig,
}: ProjectImpactProps) {
  const impactData = useMemo(() => {
    if (!summaryData) return []

    return topPerformers.map((performer) => {
      const projectContributions = summaryData.projectCosts
        .filter((project) => performer.projects.includes(project.project))
        .map((project) => {
          const devData = project.developers.find((d) => d.userId === performer.userId)
          return {
            project: project.project,
            hours: devData?.hours || 0,
            cost: devData?.cost || 0,
          }
        })

      const totalContributions = projectContributions.reduce((sum, p) => sum + p.hours, 0)
      const avgContributionPerProject =
        projectContributions.length > 0 ? totalContributions / projectContributions.length : 0

      return {
        developer: performer,
        projectCount: performer.projectCount,
        totalContributions,
        avgContributionPerProject,
        projectDiversity: performer.projectCount / Math.max(summaryData.projectCosts.length, 1),
      }
    })
  }, [topPerformers, summaryData])

  if (!summaryData) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground text-center">
            Loading project impact data...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (topPerformers.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground text-center">
            No developer data available for project impact analysis
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Try selecting a different date range or check your filters
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Project Impact & Contributions</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Celebrating developer contributions to project success
        </p>
      </div>
      <CardContent className="p-4">
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {impactData.map((impact, i) => (
            <motion.div
              key={impact.developer.userId}
              variants={staggerItem}
              transition={{ delay: i * 0.05, ...transitionNormal }}
              className="p-4 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                {impact.developer?.profilePic ? (
                  <img
                    src={impact.developer.profilePic}
                    alt={impact.developer.userName || 'Developer'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {(impact.developer?.userName || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Developer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-foreground">{impact.developer.userName}</p>
                    {impact.developer.position && (
                      <Badge variant="outline" className="text-xs">
                        {impact.developer.position}
                      </Badge>
                    )}
                  </div>

                  {/* Impact Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Award className="h-3 w-3" />
                        Projects
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {impact.projectCount}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Total Hours
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatHours(impact.totalContributions)}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Users className="h-3 w-3" />
                        Avg per Project
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatHours(impact.avgContributionPerProject)}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Diversity</div>
                      <p className="text-sm font-semibold text-foreground">
                        {Math.round(impact.projectDiversity * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Projects List */}
                  {impact.developer.projects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {impact.developer.projects.map((project) => (
                        <Badge key={project} variant="secondary" className="text-xs px-2 py-0.5">
                          {project}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  )
}
