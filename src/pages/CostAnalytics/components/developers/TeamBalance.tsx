import { useMemo } from 'react'
import { Scale, AlertCircle, CheckCircle2, Users, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import {
  calculateTeamBalance,
  getOverloadedDevelopers,
  getUnderutilizedDevelopers,
} from '@/utils/team-balance.utils'
import { formatHours } from '@/utils/cost-analytics.utils'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface TeamBalanceProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
}

export function TeamBalance({ topPerformers, summaryData }: TeamBalanceProps) {
  const balanceMetrics = useMemo(() => {
    if (!summaryData) return null
    return calculateTeamBalance(topPerformers, summaryData)
  }, [topPerformers, summaryData])

  const overloaded = useMemo(() => {
    if (!balanceMetrics || !summaryData) return []
    return getOverloadedDevelopers(topPerformers, balanceMetrics)
  }, [topPerformers, balanceMetrics, summaryData])

  const underutilized = useMemo(() => {
    if (!balanceMetrics || !summaryData) return []
    return getUnderutilizedDevelopers(topPerformers, balanceMetrics)
  }, [topPerformers, balanceMetrics, summaryData])

  if (!summaryData || !balanceMetrics || topPerformers.length === 0) return null

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Team Balance & Health</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Insights for maintaining a healthy, balanced team
        </p>
      </div>
      <CardContent className="p-4">
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Workload Distribution */}
          <motion.div variants={staggerItem}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Workload Distribution</span>
              </div>
              {balanceMetrics.workloadDistribution.isBalanced ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Balanced
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Needs Attention
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Average: {formatHours(balanceMetrics.workloadDistribution.average)}</p>
              <p>Std Dev: {formatHours(balanceMetrics.workloadDistribution.standardDeviation)}</p>
            </div>
            {overloaded.length > 0 && (
              <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Overloaded Developers ({overloaded.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {overloaded.map((dev) => (
                    <Badge key={dev.userId} variant="secondary" className="text-xs">
                      {dev.userName} ({formatHours(dev.totalHours)})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {underutilized.length > 0 && (
              <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Underutilized Developers ({underutilized.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {underutilized.map((dev) => (
                    <Badge key={dev.userId} variant="secondary" className="text-xs">
                      {dev.userName} ({formatHours(dev.totalHours)})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Project Diversity */}
          <motion.div variants={staggerItem}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Project Diversity</span>
              </div>
              {balanceMetrics.projectDiversity.isDiverse ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Diverse
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Low Diversity
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Average projects per developer: {balanceMetrics.projectDiversity.average.toFixed(1)}</p>
              <p>
                Range: {balanceMetrics.projectDiversity.min} - {balanceMetrics.projectDiversity.max}
              </p>
            </div>
          </motion.div>

          {/* Collaboration Health */}
          <motion.div variants={staggerItem}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Collaboration Health</span>
              </div>
              {balanceMetrics.collaborationHealth.isHealthy ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Healthy
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Needs Improvement
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Average collaboration score: {balanceMetrics.collaborationHealth.averageCollaborationScore.toFixed(1)}
              </p>
              {balanceMetrics.collaborationHealth.isolatedDevelopers > 0 && (
                <p className="text-amber-600">
                  {balanceMetrics.collaborationHealth.isolatedDevelopers} developer
                  {balanceMetrics.collaborationHealth.isolatedDevelopers !== 1 ? 's' : ''} working
                  in isolation
                </p>
              )}
            </div>
          </motion.div>

          {/* Knowledge Distribution */}
          <motion.div variants={staggerItem}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Knowledge Distribution</span>
              </div>
              {balanceMetrics.knowledgeDistribution.knowledgeGaps === 0 ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Well Distributed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Knowledge Gaps
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Projects with multiple developers: {balanceMetrics.knowledgeDistribution.projectsWithMultipleDevelopers}
              </p>
              {balanceMetrics.knowledgeDistribution.knowledgeGaps > 0 && (
                <p className="text-amber-600">
                  {balanceMetrics.knowledgeDistribution.knowledgeGaps} project
                  {balanceMetrics.knowledgeDistribution.knowledgeGaps !== 1 ? 's' : ''} with single
                  developer (knowledge risk)
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  )
}
