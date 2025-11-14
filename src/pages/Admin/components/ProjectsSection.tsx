import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2, Save, X, Trash2, Plus, Loader2 } from 'lucide-react'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, type Project } from '@/hooks/project.hooks'

export function ProjectsSection() {
  const { data: projects, loading, error, fetchProjects } = useProjects()
  const { createProject, loading: creating } = useCreateProject()
  const { updateProject, loading: updating } = useUpdateProject()
  const { deleteProject, loading: deleting } = useDeleteProject()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const saving = creating || updating || deleting

  // Load projects on mount
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleAdd = async () => {
    if (!newProjectName.trim()) return

    const trimmedName = newProjectName.trim()
    const result = await createProject({ name: trimmedName })
    
    if (result) {
      setNewProjectName('')
      setShowAddForm(false)
      fetchProjects() // Refresh list
    }
  }

  const startEdit = (project: Project) => {
    setEditingId(project.id)
    setEditName(project.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleSave = async (projectId: string) => {
    if (!editName.trim()) {
      cancelEdit()
      return
    }

    const trimmedName = editName.trim()
    const result = await updateProject(projectId, { name: trimmedName })
    
    if (result) {
      cancelEdit()
      fetchProjects() // Refresh list
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return
    }

    const success = await deleteProject(projectId)
    
    if (success) {
      if (editingId === projectId) {
        cancelEdit()
      }
      fetchProjects() // Refresh list
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            {typeof error.message === 'string' ? error.message : error.message.join(', ')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your project list</p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} size="sm" className="flex-shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Project</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-project-name">Project Name</Label>
                <Input
                  id="new-project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAdd()
                    } else if (e.key === 'Escape') {
                      setShowAddForm(false)
                      setNewProjectName('')
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={!newProjectName.trim() || saving} size="sm">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewProjectName('')
                  }}
                  variant="outline"
                  size="sm"
                  disabled={saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {!projects || projects.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center py-8">No projects yet. Add your first project above.</p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="pt-6">
                {editingId === project.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`project-name-${project.id}`}>Project Name</Label>
                      <Input
                        id={`project-name-${project.id}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter project name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSave(project.id)
                          } else if (e.key === 'Escape') {
                            cancelEdit()
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleSave(project.id)} disabled={!editName.trim() || saving} size="sm">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm" disabled={saving}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold text-base sm:text-lg flex-1">{project.name}</h3>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button onClick={() => startEdit(project)} variant="outline" size="sm">
                        <Edit2 className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        onClick={() => handleDelete(project.id)}
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

