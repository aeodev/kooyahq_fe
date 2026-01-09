import type { ProjectCostSummary, TopPerformer } from '@/types/cost-analytics'

/**
 * Common technology keywords that might appear in project names
 */
const TECH_KEYWORDS = [
  // Frontend
  'react',
  'vue',
  'angular',
  'next',
  'nuxt',
  'svelte',
  'typescript',
  'javascript',
  'html',
  'css',
  'tailwind',
  'bootstrap',
  'sass',
  'scss',
  // Backend
  'node',
  'express',
  'nestjs',
  'python',
  'django',
  'flask',
  'fastapi',
  'java',
  'spring',
  'php',
  'laravel',
  'ruby',
  'rails',
  'go',
  'golang',
  'rust',
  // Database
  'postgres',
  'postgresql',
  'mysql',
  'mongodb',
  'redis',
  'sqlite',
  // Cloud/DevOps
  'aws',
  'azure',
  'gcp',
  'docker',
  'kubernetes',
  'terraform',
  'ci/cd',
  // Mobile
  'react-native',
  'flutter',
  'ios',
  'android',
  'swift',
  'kotlin',
  // Other
  'api',
  'graphql',
  'rest',
  'microservices',
  'serverless',
]

/**
 * Extract potential skills from project name
 */
export function extractSkillsFromProjectName(projectName: string): string[] {
  const lowerName = projectName.toLowerCase()
  const skills: string[] = []

  TECH_KEYWORDS.forEach((keyword) => {
    if (lowerName.includes(keyword)) {
      // Capitalize first letter
      const skill = keyword.charAt(0).toUpperCase() + keyword.slice(1)
      if (!skills.includes(skill)) {
        skills.push(skill)
      }
    }
  })

  return skills
}

/**
 * Infer project type from name
 */
export function inferProjectType(projectName: string): string[] {
  const lowerName = projectName.toLowerCase()
  const types: string[] = []

  if (lowerName.includes('frontend') || lowerName.includes('client') || lowerName.includes('web')) {
    types.push('Frontend')
  }
  if (lowerName.includes('backend') || lowerName.includes('server') || lowerName.includes('api')) {
    types.push('Backend')
  }
  if (lowerName.includes('mobile') || lowerName.includes('app')) {
    types.push('Mobile')
  }
  if (lowerName.includes('fullstack') || lowerName.includes('full-stack')) {
    types.push('Full-stack')
  }
  if (lowerName.includes('admin') || lowerName.includes('dashboard')) {
    types.push('Admin/Dashboard')
  }
  if (lowerName.includes('ecommerce') || lowerName.includes('e-commerce') || lowerName.includes('shop')) {
    types.push('E-commerce')
  }

  return types.length > 0 ? types : ['General']
}

/**
 * Get developer skills based on projects they worked on
 */
export type DeveloperSkills = {
  userId: string
  userName: string
  technologies: string[]
  projectTypes: string[]
  projectCount: number
}

export function getDeveloperSkills(
  performer: TopPerformer,
  projectCosts: ProjectCostSummary[]
): DeveloperSkills {
  const technologies = new Set<string>()
  const projectTypes = new Set<string>()

  performer.projects.forEach((projectName) => {
    const project = projectCosts.find((p) => p.project === projectName)
    if (project) {
      // Extract skills from project name
      const skills = extractSkillsFromProjectName(project.project)
      skills.forEach((skill) => technologies.add(skill))

      // Infer project type
      const types = inferProjectType(project.project)
      types.forEach((type) => projectTypes.add(type))
    }
  })

  return {
    userId: performer.userId,
    userName: performer.userName,
    technologies: Array.from(technologies).sort(),
    projectTypes: Array.from(projectTypes).sort(),
    projectCount: performer.projectCount,
  }
}

/**
 * Get all unique skills across team
 */
export function getAllTeamSkills(
  performers: TopPerformer[],
  projectCosts: ProjectCostSummary[]
): string[] {
  const allSkills = new Set<string>()

  performers.forEach((performer) => {
    const skills = getDeveloperSkills(performer, projectCosts)
    skills.technologies.forEach((skill) => allSkills.add(skill))
  })

  return Array.from(allSkills).sort()
}
