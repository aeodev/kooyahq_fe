import type { TopPerformer, ProjectCostSummary } from '@/types/cost-analytics'

export type CollaborationNode = {
  id: string
  label: string
  type: 'developer' | 'project'
  size?: number
}

export type CollaborationEdge = {
  from: string
  to: string
  value: number // Number of shared projects or hours
  projects: string[]
}

export type CollaborationGraph = {
  nodes: CollaborationNode[]
  edges: CollaborationEdge[]
}

/**
 * Build collaboration network graph
 * Nodes: Developers and Projects
 * Edges: Connections between developers and projects
 */
export function buildCollaborationGraph(
  performers: TopPerformer[],
  projectCosts: ProjectCostSummary[]
): CollaborationGraph {
  const nodes: CollaborationNode[] = []
  const edges: CollaborationEdge[] = []

  // Add developer nodes
  performers.forEach((performer) => {
    nodes.push({
      id: `dev-${performer.userId}`,
      label: performer.userName,
      type: 'developer',
      size: performer.totalHours,
    })
  })

  // Add project nodes
  projectCosts.forEach((project) => {
    nodes.push({
      id: `proj-${project.project}`,
      label: project.project,
      type: 'project',
      size: project.totalHours,
    })
  })

  // Add edges (developer -> project)
  performers.forEach((performer) => {
    performer.projects.forEach((projectName) => {
      const project = projectCosts.find((p) => p.project === projectName)
      if (project) {
        const devData = project.developers.find((d) => d.userId === performer.userId)
        if (devData) {
          edges.push({
            from: `dev-${performer.userId}`,
            to: `proj-${projectName}`,
            value: devData.hours,
            projects: [projectName],
          })
        }
      }
    })
  })

  return { nodes, edges }
}

/**
 * Calculate collaboration connections between developers
 * Returns pairs of developers who worked on the same projects
 */
export type DeveloperConnection = {
  developer1: string
  developer2: string
  sharedProjects: string[]
  connectionStrength: number // Number of shared projects
}

export function calculateDeveloperConnections(
  performers: TopPerformer[]
): DeveloperConnection[] {
  const connections: DeveloperConnection[] = []

  for (let i = 0; i < performers.length; i++) {
    for (let j = i + 1; j < performers.length; j++) {
      const dev1 = performers[i]
      const dev2 = performers[j]

      // Find shared projects
      const sharedProjects = dev1.projects.filter((p) => dev2.projects.includes(p))

      if (sharedProjects.length > 0) {
        connections.push({
          developer1: dev1.userId,
          developer2: dev2.userId,
          sharedProjects,
          connectionStrength: sharedProjects.length,
        })
      }
    }
  }

  return connections.sort((a, b) => b.connectionStrength - a.connectionStrength)
}

/**
 * Get project clusters (groups of developers working on same projects)
 */
export type ProjectCluster = {
  project: string
  developers: string[]
  developerNames: string[]
  totalDevelopers: number
}

export function getProjectClusters(
  projectCosts: ProjectCostSummary[]
): ProjectCluster[] {
  return projectCosts.map((project) => ({
    project: project.project,
    developers: project.developers.map((d) => d.userId),
    developerNames: project.developers.map((d) => d.userName),
    totalDevelopers: project.developers.length,
  }))
}
