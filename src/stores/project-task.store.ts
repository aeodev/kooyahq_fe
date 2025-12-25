import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type ProjectTaskState = {
  projectTasks: Record<string, string>
  selectedProjects: string[]
  activeProject: string | null
  _hasHydrated: boolean
}

type ProjectTaskActions = {
  setProjectTask: (project: string, task: string) => void
  resetProjectTask: (project: string) => void
  clearAll: () => void
  getProjectTask: (project: string) => string | undefined
  setSelectedProjects: (projects: string[]) => void
  setActiveProject: (project: string | null) => void
  setHasHydrated: (state: boolean) => void
}

type ProjectTaskStore = ProjectTaskState & ProjectTaskActions

export const useProjectTaskStore = create<ProjectTaskStore>()(
  persist(
    (set, get) => ({
      projectTasks: {},
      selectedProjects: [],
      activeProject: null,
      _hasHydrated: false,

      setProjectTask: (project: string, task: string) => {
        set((state) => ({
          projectTasks: { ...state.projectTasks, [project]: task }
        }))
      },

      resetProjectTask: (project: string) => {
        set((state) => {
          const { [project]: _, ...rest } = state.projectTasks
          return { projectTasks: rest }
        })
      },

      clearAll: () => {
        set({
          projectTasks: {},
          selectedProjects: [],
          activeProject: null,
        })
      },

      getProjectTask: (project: string) => {
        return get().projectTasks[project]
      },

      setSelectedProjects: (projects: string[]) => {
        set({ 
          selectedProjects: projects,
          activeProject: projects.length > 0 ? projects[0] : null
        })
      },

      setActiveProject: (project: string | null) => {
        set({ activeProject: project })
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'kooyahq.project-selection',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
