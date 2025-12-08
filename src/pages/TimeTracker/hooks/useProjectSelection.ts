import { useState, useCallback } from 'react'
import { useProjectTaskStore } from '@/stores/project-task.store'

export function useProjectSelection() {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [taskDescription, setTaskDescription] = useState('')

  const {
    projectTasks,
    setProjectTask,
    resetProjectTask,
    clearAll,
    getProjectTask,
  } = useProjectTaskStore()

  const handleProjectSelection = useCallback((projects: string[]) => {
    setSelectedProjects(projects)
    if (projects.length > 0) {
      setActiveProject(projects[0])
    } else {
      setActiveProject(null)
    }
    projectTasks.forEach((_, project) => {
      if (!projects.includes(project)) {
        resetProjectTask(project)
      }
    })
  }, [projectTasks, resetProjectTask])

  const clearSelection = useCallback(() => {
    setSelectedProjects([])
    setActiveProject(null)
    clearAll()
    setTaskDescription('')
  }, [clearAll])

  return {
    selectedProjects,
    activeProject,
    taskDescription,
    projectTasks,
    setActiveProject,
    setTaskDescription,
    setProjectTask,
    resetProjectTask,
    getProjectTask,
    handleProjectSelection,
    clearSelection,
  }
}
