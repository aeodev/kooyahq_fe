import { create } from 'zustand'

type ProjectTaskState = {
  projectTasks: Map<string, string>
  visitedProjects: Set<string>
}

type ProjectTaskActions = {
  setProjectTask: (project: string, task: string) => void
  resetProjectTask: (project: string) => void
  markProjectVisited: (project: string) => void
  clearAll: () => void
  getProjectTask: (project: string) => string | undefined
  isProjectVisited: (project: string) => boolean
}

type ProjectTaskStore = ProjectTaskState & ProjectTaskActions

export const useProjectTaskStore = create<ProjectTaskStore>((set, get) => ({
  projectTasks: new Map(),
  visitedProjects: new Set(),

  setProjectTask: (project: string, task: string) => {
    set((state) => {
      const newTasks = new Map(state.projectTasks)
      newTasks.set(project, task)
      return { projectTasks: newTasks }
    })
  },

  resetProjectTask: (project: string) => {
    set((state) => {
      const newTasks = new Map(state.projectTasks)
      newTasks.delete(project)
      return { projectTasks: newTasks }
    })
  },

  markProjectVisited: (project: string) => {
    set((state) => {
      const newVisited = new Set(state.visitedProjects)
      newVisited.add(project)
      return { visitedProjects: newVisited }
    })
  },

  clearAll: () => {
    set({
      projectTasks: new Map(),
      visitedProjects: new Set(),
    })
  },

  getProjectTask: (project: string) => {
    return get().projectTasks.get(project)
  },

  isProjectVisited: (project: string) => {
    return get().visitedProjects.has(project)
  },
}))

