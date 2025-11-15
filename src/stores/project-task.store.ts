import { create } from 'zustand'

type ProjectTaskState = {
  projectTasks: Map<string, string>
}

type ProjectTaskActions = {
  setProjectTask: (project: string, task: string) => void
  resetProjectTask: (project: string) => void
  clearAll: () => void
  getProjectTask: (project: string) => string | undefined
}

type ProjectTaskStore = ProjectTaskState & ProjectTaskActions

export const useProjectTaskStore = create<ProjectTaskStore>((set, get) => ({
  projectTasks: new Map(),

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

  clearAll: () => {
    set({
      projectTasks: new Map(),
    })
  },

  getProjectTask: (project: string) => {
    return get().projectTasks.get(project)
  },
}))


