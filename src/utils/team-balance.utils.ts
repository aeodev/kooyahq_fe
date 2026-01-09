import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'

export type TeamBalanceMetrics = {
  workloadDistribution: {
    average: number
    standardDeviation: number
    isBalanced: boolean
  }
  projectDiversity: {
    average: number
    min: number
    max: number
    isDiverse: boolean
  }
  collaborationHealth: {
    averageCollaborationScore: number
    isolatedDevelopers: number
    isHealthy: boolean
  }
  knowledgeDistribution: {
    projectsWithSingleDeveloper: number
    projectsWithMultipleDevelopers: number
    knowledgeGaps: number
  }
}

/**
 * Calculate team balance metrics
 */
export function calculateTeamBalance(
  performers: TopPerformer[],
  summaryData: CostSummaryData
): TeamBalanceMetrics {
  // Workload Distribution (based on hours)
  const workloads = performers.map((p) => p.totalHours)
  const avgWorkload = workloads.reduce((sum, w) => sum + w, 0) / workloads.length
  const variance =
    workloads.reduce((sum, w) => sum + Math.pow(w - avgWorkload, 2), 0) / workloads.length
  const stdDev = Math.sqrt(variance)
  const workloadBalanceThreshold = avgWorkload * 0.5 // 50% deviation threshold

  // Project Diversity
  const projectCounts = performers.map((p) => p.projectCount)
  const avgDiversity = projectCounts.reduce((sum, c) => sum + c, 0) / projectCounts.length
  const minDiversity = Math.min(...projectCounts)
  const maxDiversity = Math.max(...projectCounts)
  const diversityThreshold = summaryData.projectCosts.length * 0.3 // 30% of projects

  // Collaboration Health
  const collaborationScores = performers.map((performer) => {
    let collaborationCount = 0
    performer.projects.forEach((projectName) => {
      const project = summaryData.projectCosts.find((p) => p.project === projectName)
      if (project && project.developers.length > 1) {
        collaborationCount++
      }
    })
    return collaborationCount
  })
  const avgCollaborationScore =
    collaborationScores.reduce((sum, s) => sum + s, 0) / collaborationScores.length
  const isolatedDevelopers = collaborationScores.filter((s) => s === 0).length

  // Knowledge Distribution
  const projectsWithSingleDeveloper = summaryData.projectCosts.filter(
    (p) => p.developers.length === 1
  ).length
  const projectsWithMultipleDevelopers = summaryData.projectCosts.filter(
    (p) => p.developers.length > 1
  ).length

  return {
    workloadDistribution: {
      average: avgWorkload,
      standardDeviation: stdDev,
      isBalanced: stdDev < workloadBalanceThreshold,
    },
    projectDiversity: {
      average: avgDiversity,
      min: minDiversity,
      max: maxDiversity,
      isDiverse: avgDiversity >= diversityThreshold,
    },
    collaborationHealth: {
      averageCollaborationScore: avgCollaborationScore,
      isolatedDevelopers,
      isHealthy: isolatedDevelopers === 0 && avgCollaborationScore > 0,
    },
    knowledgeDistribution: {
      projectsWithSingleDeveloper,
      projectsWithMultipleDevelopers,
      knowledgeGaps: projectsWithSingleDeveloper,
    },
  }
}

/**
 * Identify overloaded developers (above average + 1 std dev)
 */
export function getOverloadedDevelopers(
  performers: TopPerformer[],
  balanceMetrics: TeamBalanceMetrics
): TopPerformer[] {
  const threshold =
    balanceMetrics.workloadDistribution.average +
    balanceMetrics.workloadDistribution.standardDeviation

  return performers.filter((p) => p.totalHours > threshold)
}

/**
 * Identify underutilized developers (below average - 1 std dev)
 */
export function getUnderutilizedDevelopers(
  performers: TopPerformer[],
  balanceMetrics: TeamBalanceMetrics
): TopPerformer[] {
  const threshold =
    balanceMetrics.workloadDistribution.average -
    balanceMetrics.workloadDistribution.standardDeviation

  return performers.filter((p) => p.totalHours < threshold)
}
