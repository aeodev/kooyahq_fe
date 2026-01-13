import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2, Save, X, Trash2, Plus, Loader2, Image as ImageIcon, Smile } from 'lucide-react'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, type Project } from '@/hooks/project.hooks'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'
import { EMOJI_CATEGORIES } from '@/pages/Workspace/components/constants'
import axiosInstance from '@/utils/axios.instance'
import { UPLOAD_MEDIA } from '@/utils/api.routes'

type ProjectsSectionProps = {
  canViewProjects: boolean
  canManageProjects: boolean
}

export function ProjectsSection({ canViewProjects, canManageProjects }: ProjectsSectionProps) {
  const { data: projects, loading, error, fetchProjects } = useProjects()
  const { createProject, loading: creating } = useCreateProject()
  const { updateProject, loading: updating } = useUpdateProject()
  const { deleteProject, loading: deleting } = useDeleteProject()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editIconUrl, setEditIconUrl] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectEmoji, setNewProjectEmoji] = useState('🚀')
  const [newProjectIconUrl, setNewProjectIconUrl] = useState('')
  const [iconMode, setIconMode] = useState<'emoji' | 'image'>('emoji')
  const [editIconMode, setEditIconMode] = useState<Record<string, 'emoji' | 'image'>>({})
  const [showEmojiPicker, setShowEmojiPicker] = useState<'create' | string | null>(null)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const editImageInputRef = useRef<Record<string, HTMLInputElement | null>>({})

  const saving = creating || updating || deleting || uploadingImage

  // Load projects on mount
  useEffect(() => {
    if (canViewProjects) {
      fetchProjects()
    }
  }, [fetchProjects, canViewProjects])

  // Handle emoji picker positioning
  useEffect(() => {
    if (showEmojiPicker && emojiButtonRef.current) {
      const updatePosition = () => {
        if (emojiButtonRef.current) {
          const rect = emojiButtonRef.current.getBoundingClientRect()
          const pickerWidth = 320
          let left = rect.left
          if (left + pickerWidth > window.innerWidth - 16) {
            left = window.innerWidth - pickerWidth - 16
          }
          if (left < 16) {
            left = 16
          }
          const top = rect.bottom + 8
          setEmojiPickerPosition({ top, left })
        }
      }
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(updatePosition)
      }, 0)
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    } else {
      setEmojiPickerPosition(null)
    }
  }, [showEmojiPicker])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(null)
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showEmojiPicker])

  const handleImageUpload = async (file: File, mode: 'create' | string): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await axiosInstance.post<{ success: boolean; data: { url: string } }>(
        UPLOAD_MEDIA(),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      if (response.data.success && response.data.data.url) {
        return response.data.data.url
      }
      return null
    } catch (error: any) {
      console.error('Failed to upload image:', error)
      toast.error(error.response?.data?.message || 'Failed to upload image')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'create' | string) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const url = await handleImageUpload(file, mode)
    if (url) {
      if (mode === 'create') {
        setNewProjectIconUrl(url)
        setIconMode('image')
      } else {
        setEditIconUrl(url)
        setEditIconMode((prev) => ({ ...prev, [mode]: 'image' }))
      }
    }
    // Reset input
    e.target.value = ''
  }

  const handleAdd = async () => {
    if (!canManageProjects) return
    if (!newProjectName.trim()) return

    const trimmedName = newProjectName.trim()
    const result = await createProject({ 
      name: trimmedName,
      emoji: iconMode === 'emoji' ? (newProjectEmoji || undefined) : undefined,
      iconUrl: iconMode === 'image' ? (newProjectIconUrl || undefined) : undefined
    })
    
    if (result) {
      toast.success('Project created successfully')
      setNewProjectName('')
      setNewProjectEmoji('🚀')
      setNewProjectIconUrl('')
      setIconMode('emoji')
      setShowAddForm(false)
      fetchProjects() // Refresh list
    } else {
      toast.error('Failed to create project')
    }
  }

  const startEdit = (project: Project) => {
    if (!canManageProjects) return
    setEditingId(project.id)
    setEditName(project.name)
    setEditEmoji(project.emoji || '🚀')
    setEditIconUrl(project.iconUrl || '')
    setEditIconMode((prev) => ({
      ...prev,
      [project.id]: project.iconUrl ? 'image' : 'emoji'
    }))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditEmoji('')
    setEditIconUrl('')
  }

  const handleSave = async (projectId: string) => {
    if (!canManageProjects) return
    if (!editName.trim()) {
      cancelEdit()
      return
    }

    const trimmedName = editName.trim()
    const iconMode = editIconMode[projectId] || 'emoji'
    const result = await updateProject(projectId, { 
      name: trimmedName,
      emoji: iconMode === 'emoji' ? (editEmoji || undefined) : undefined,
      iconUrl: iconMode === 'image' ? (editIconUrl || undefined) : undefined
    })
    
    if (result) {
      toast.success('Project updated successfully')
      cancelEdit()
      fetchProjects() // Refresh list
    } else {
      toast.error('Failed to update project')
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!canManageProjects) return
    if (!confirm('Are you sure you want to delete this project?')) {
      return
    }

    const success = await deleteProject(projectId)
    
    if (success) {
      toast.success('Project deleted successfully')
      if (editingId === projectId) {
        cancelEdit()
      }
      fetchProjects() // Refresh list
    } else {
      toast.error('Failed to delete project')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canViewProjects) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">You do not have permission to view projects.</p>
        </CardContent>
      </Card>
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
          {!canManageProjects && (
            <p className="text-xs text-muted-foreground mt-1">View-only access. Editing controls are hidden.</p>
          )}
        </div>
        {!showAddForm && canManageProjects && (
          <Button onClick={() => setShowAddForm(true)} size="sm" className="flex-shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Project</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>

      {showAddForm && canManageProjects && (
        <Card className="border hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Icon</Label>
                  <div className="space-y-2">
                    <div className="flex gap-1 p-1 rounded-lg border bg-muted/30">
                      <button
                        type="button"
                        onClick={() => {
                          setIconMode('emoji')
                          setNewProjectIconUrl('')
                        }}
                        className={cn(
                          'flex-1 px-2 py-1 text-xs rounded transition-colors',
                          iconMode === 'emoji' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                        )}
                      >
                        <Smile className="h-3 w-3 mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIconMode('image')
                          setNewProjectEmoji('')
                        }}
                        className={cn(
                          'flex-1 px-2 py-1 text-xs rounded transition-colors',
                          iconMode === 'image' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                        )}
                      >
                        <ImageIcon className="h-3 w-3 mx-auto" />
                      </button>
                    </div>
                    <div className="relative">
                      {iconMode === 'emoji' ? (
                        <button
                          ref={showEmojiPicker === 'create' ? emojiButtonRef : null}
                          type="button"
                          onClick={() => setShowEmojiPicker(showEmojiPicker === 'create' ? null : 'create')}
                          className="h-10 w-10 flex items-center justify-center rounded-lg border border-input bg-background text-lg hover:bg-accent transition-colors"
                          aria-label="Pick emoji"
                        >
                          <span className="max-w-[2.5rem] truncate">{newProjectEmoji || '🚀'}</span>
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {newProjectIconUrl ? (
                            <div className="relative h-10 w-10 rounded-lg border overflow-hidden">
                              <img
                                src={newProjectIconUrl}
                                alt="Project icon"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setNewProjectIconUrl('')}
                                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:bg-destructive/90"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              className="h-10 w-10 flex items-center justify-center rounded-lg border border-input bg-background hover:bg-accent transition-colors"
                              aria-label="Upload image"
                            >
                              {uploadingImage ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ImageIcon className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageSelect(e, 'create')}
                          />
                        </div>
                      )}
                      {showEmojiPicker === 'create' && emojiPickerPosition && createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowEmojiPicker(null)}
                            aria-hidden="true"
                          />
                          <div
                            ref={emojiPickerRef}
                            className="fixed z-20 w-80 p-3 bg-popover border border-border rounded-lg shadow-xl max-h-[360px] overflow-y-auto"
                            style={{
                              top: `${emojiPickerPosition.top}px`,
                              left: `${emojiPickerPosition.left}px`,
                            }}
                          >
                            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                              <div key={category} className="mb-4 last:mb-0">
                                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{category}</p>
                                <div className="grid grid-cols-8 gap-1">
                                  {emojis.map((emo) => (
                                    <button
                                      key={emo}
                                      type="button"
                                      onClick={() => {
                                        setNewProjectEmoji(emo)
                                        setShowEmojiPicker(null)
                                      }}
                                      className={cn(
                                        'h-8 w-8 flex items-center justify-center rounded hover:bg-accent transition-colors text-lg',
                                        newProjectEmoji === emo && 'bg-primary/10 ring-2 ring-primary'
                                      )}
                                      aria-label={`Select ${emo}`}
                                    >
                                      {emo}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-project-name" className="text-sm font-medium">Project Name</Label>
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
                        setNewProjectEmoji('🚀')
                        setNewProjectIconUrl('')
                        setIconMode('emoji')
                      }
                    }}
                    autoFocus
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={!newProjectName.trim() || saving || !canManageProjects} size="sm">
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
                      setNewProjectEmoji('🚀')
                      setNewProjectIconUrl('')
                      setIconMode('emoji')
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

      {!projects || projects.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 p-12 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
            <span className="text-3xl">📁</span>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground/60">
              {canManageProjects ? 'Click "Add Project" to get started' : 'No projects available to view'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative rounded-xl border bg-card md:overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              {editingId === project.id ? (
                <div className="p-5 space-y-4">
                  {/* Edit header */}
                  <div className="flex items-center gap-2 pb-3 border-b">
                    <Edit2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Edit Project</span>
                  </div>
                  
                  {/* Icon selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Icon</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1 p-1 rounded-lg border bg-muted/30">
                        <button
                          type="button"
                          onClick={() => {
                            setEditIconMode((prev) => ({ ...prev, [project.id]: 'emoji' }))
                            setEditIconUrl('')
                          }}
                          className={cn(
                            'px-3 py-1.5 text-xs rounded transition-colors',
                            (editIconMode[project.id] || 'emoji') === 'emoji' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                          )}
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditIconMode((prev) => ({ ...prev, [project.id]: 'image' }))
                            setEditEmoji('')
                          }}
                          className={cn(
                            'px-3 py-1.5 text-xs rounded transition-colors',
                            editIconMode[project.id] === 'image' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                          )}
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="relative">
                        {(editIconMode[project.id] || 'emoji') === 'emoji' ? (
                          <button
                            ref={showEmojiPicker === project.id ? emojiButtonRef : null}
                            type="button"
                            onClick={() => setShowEmojiPicker(showEmojiPicker === project.id ? null : project.id)}
                            className="h-12 w-12 flex items-center justify-center rounded-xl border-2 border-dashed border-input bg-background text-xl hover:border-primary/50 hover:bg-accent transition-all"
                            aria-label="Pick emoji"
                          >
                            {editEmoji || '🚀'}
                          </button>
                        ) : (
                          <>
                            {editIconUrl ? (
                              <div className="relative h-12 w-12 rounded-xl border-2 overflow-hidden">
                                <img
                                  src={editIconUrl}
                                  alt="Project icon"
                                  className="h-full w-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditIconUrl('')}
                                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const input = editImageInputRef.current[project.id]
                                  if (input) input.click()
                                }}
                                className="h-12 w-12 flex items-center justify-center rounded-xl border-2 border-dashed border-input bg-background hover:border-primary/50 hover:bg-accent transition-all"
                                aria-label="Upload image"
                              >
                                {uploadingImage ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            <input
                              ref={(el) => {
                                if (el) editImageInputRef.current[project.id] = el
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageSelect(e, project.id)}
                            />
                          </>
                        )}
                        {showEmojiPicker === project.id && emojiPickerPosition && createPortal(
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowEmojiPicker(null)}
                              aria-hidden="true"
                            />
                            <div
                              ref={emojiPickerRef}
                              className="fixed z-20 w-80 p-3 bg-popover border border-border rounded-xl shadow-xl max-h-[360px] overflow-y-auto"
                              style={{
                                top: `${emojiPickerPosition.top}px`,
                                left: `${emojiPickerPosition.left}px`,
                              }}
                            >
                              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                                <div key={category} className="mb-4 last:mb-0">
                                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{category}</p>
                                  <div className="grid grid-cols-8 gap-1">
                                    {emojis.map((emo) => (
                                      <button
                                        key={emo}
                                        type="button"
                                        onClick={() => {
                                          setEditEmoji(emo)
                                          setShowEmojiPicker(null)
                                        }}
                                        className={cn(
                                          'h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-lg',
                                          editEmoji === emo && 'bg-primary/10 ring-2 ring-primary'
                                        )}
                                        aria-label={`Select ${emo}`}
                                      >
                                        {emo}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>,
                          document.body
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Name input */}
                  <div className="space-y-2">
                    <Label htmlFor={`project-name-${project.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</Label>
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
                      className="h-10"
                    />
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleSave(project.id)} disabled={!editName.trim() || saving || !canManageProjects} size="sm" className="flex-1">
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
                    <Button onClick={cancelEdit} variant="outline" size="sm" disabled={saving} className="flex-1">
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
                ) : (
                  <>
                    {/* Decorative gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Main content */}
                    <div className="relative p-5">
                      {/* Icon section */}
                      <div className="mb-4">
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
                          project.iconUrl 
                            ? "overflow-hidden ring-2 ring-border/50" 
                            : "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/10"
                        )}>
                          {project.iconUrl ? (
                            <img
                              src={project.iconUrl}
                              alt={`${project.name} icon`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">{project.emoji || '📁'}</span>
                          )}
                        </div>
                      </div>

                      {/* Project name */}
                      <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2 mb-1">
                        {project.name}
                      </h3>
                      
                      {/* Subtle project indicator */}
                      <p className="text-xs text-muted-foreground/60">Project</p>
                    </div>

                    {/* Action buttons - always visible on mobile, slide up on hover for desktop */}
                    {canManageProjects && (
                      <div className="relative md:absolute md:bottom-0 md:left-0 md:right-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-300 ease-out">
                        <div className="flex border-t bg-card/95 backdrop-blur-sm">
                          <button
                            onClick={() => startEdit(project)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-r"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
          ))}
        </div>
      )}
    </div>
  )
}
