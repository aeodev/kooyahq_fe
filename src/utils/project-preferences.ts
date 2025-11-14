const STORAGE_KEY = 'kooyahq.last-used-projects'

export function getLastUsedProjects(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const projects = JSON.parse(stored) as string[]
    return Array.isArray(projects) ? projects : []
  } catch {
    return []
  }
}

export function saveLastUsedProjects(projects: string[]): void {
  if (typeof window === 'undefined') return
  
  try {
    const projectsArray = Array.isArray(projects) ? projects : []
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsArray))
  } catch {
    // Silently fail if localStorage is not available
  }
}

