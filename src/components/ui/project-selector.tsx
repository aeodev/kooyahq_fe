import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getLastUsedProjects } from '@/utils/project-preferences'

type ProjectSelectorProps = {
  projects: string[]
  selectedProjects: string[]
  onSelectionChange: (projects: string[]) => void
  placeholder?: string
  className?: string
  showRecentFirst?: boolean
}

export function ProjectSelector({
  projects,
  selectedProjects,
  onSelectionChange,
  placeholder = 'Select projects...',
  className,
  showRecentFirst = true,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const recentProjects = showRecentFirst ? getLastUsedProjects() : []
  const availableProjects = showRecentFirst
    ? [...recentProjects.filter((p) => projects.includes(p)), ...projects.filter((p) => !recentProjects.includes(p))]
    : projects

  const filteredProjects = search.trim()
    ? availableProjects.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : availableProjects

  const toggleProject = (project: string) => {
    if (selectedProjects.includes(project)) {
      onSelectionChange(selectedProjects.filter((p) => p !== project))
    } else {
      onSelectionChange([...selectedProjects, project])
    }
    setSearch('')
  }

  const removeProject = (project: string) => {
    onSelectionChange(selectedProjects.filter((p) => p !== project))
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <div className="space-y-2">
        {selectedProjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedProjects.map((project) => (
              <Badge key={project} variant="secondary" className="flex items-center gap-1 pr-1">
                <span>{project}</span>
                <button
                  type="button"
                  onClick={() => removeProject(project)}
                  className="ml-1 rounded-full hover:bg-secondary/80 p-0.5"
                  aria-label={`Remove ${project}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(!open)}
          className={cn('w-full justify-start', selectedProjects.length === 0 && 'text-muted-foreground')}
        >
          {selectedProjects.length > 0 ? (
            <span className="text-muted-foreground">Add more projects...</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-auto p-1">
            {filteredProjects.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">No projects found</div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = selectedProjects.includes(project)
                const isRecent = recentProjects.includes(project) && !search.trim()
                return (
                  <button
                    key={project}
                    type="button"
                    onClick={() => toggleProject(project)}
                    className={cn(
                      'w-full px-2 py-1.5 text-left text-sm rounded hover:bg-accent transition-colors',
                      isSelected && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{project}</span>
                      {isRecent && !search.trim() && (
                        <span className="text-xs text-muted-foreground ml-2">Recent</span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

