import type { TopPerformer, ProjectCostSummary, CostSummaryData } from '@/types/cost-analytics'

export type DeveloperContribution = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  totalCost: number
  totalHours: number
  projectCount: number
  projects: string[]
  collaborationScore: number // Number of projects worked with others
  avgCostPerProject: number
}

/**
 * Calculate collaboration score for a developer
 * Collaboration score = number of projects where developer worked with others
 */
export function calculateCollaborationScore(
  developer: TopPerformer,
  projectCosts: ProjectCostSummary[]
): number {
  let collaborationCount = 0
  
  developer.projects.forEach((projectName) => {
    const project = projectCosts.find((p) => p.project === projectName)
    if (project && project.developers.length > 1) {
      collaborationCount++
    }
  })
  
  return collaborationCount
}

/**
 * Transform TopPerformer data to DeveloperContribution
 */
export function transformToContributions(
  performers: TopPerformer[],
  projectCosts: ProjectCostSummary[]
): DeveloperContribution[] {
  return performers.map((performer) => {
    const collaborationScore = calculateCollaborationScore(performer, projectCosts)
    const avgCostPerProject =
      performer.projectCount > 0 ? performer.totalCost / performer.projectCount : 0

    return {
      userId: performer.userId,
      userName: performer.userName,
      userEmail: performer.userEmail,
      profilePic: performer.profilePic,
      position: performer.position,
      totalCost: performer.totalCost,
      totalHours: performer.totalHours,
      projectCount: performer.projectCount,
      projects: performer.projects,
      collaborationScore,
      avgCostPerProject,
    }
  })
}

/**
 * Sort contributions by various criteria (for display, not ranking)
 */
export type SortOption = 'name' | 'projects' | 'contributions' | 'collaboration'

export function sortContributions(
  contributions: DeveloperContribution[],
  sortBy: SortOption
): DeveloperContribution[] {
  const sorted = [...contributions]

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.userName.localeCompare(b.userName))
    case 'projects':
      return sorted.sort((a, b) => b.projectCount - a.projectCount)
    case 'contributions':
      return sorted.sort((a, b) => b.totalHours - a.totalHours)
    case 'collaboration':
      return sorted.sort((a, b) => b.collaborationScore - a.collaborationScore)
    default:
      return sorted
  }
}
