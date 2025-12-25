import { useCallback } from 'react'
import { useProjectTaskStore } from '@/stores/project-task.store'

export function useProjectSelection() {
  const {
    projectTasks,
    setProjectTask,
    resetProjectTask,
    clearAll,
    getProjectTask,
    selectedProjects,
    setSelectedProjects,
    activeProject,
    setActiveProject,
  } = useProjectTaskStore()

  const handleProjectSelection = useCallback((projects: string[]) => {
    setSelectedProjects(projects)
    // Clean up tasks for deselected projects
    Object.keys(projectTasks).forEach((project) => {
      if (!projects.includes(project)) {
        resetProjectTask(project)
      }
    })
  }, [projectTasks, resetProjectTask, setSelectedProjects])

  const clearSelection = useCallback(() => {
    clearAll()
  }, [clearAll])

  return {
    selectedProjects,
    activeProject,
    projectTasks,
    setActiveProject,
    setProjectTask,
    resetProjectTask,
    getProjectTask,
    handleProjectSelection,
    clearSelection,
  }
}
