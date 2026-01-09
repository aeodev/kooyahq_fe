import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, GitCompare, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ViewMode } from '@/types/cost-analytics'

interface ProjectFilterProps {
  projectList: string[]
  projectListLoading: boolean
  selectedProject: string | null
  viewMode: ViewMode
  compareProjects: string[]
  onSelectProject: (project: string) => void
  onClearProject: () => void
  onEnterCompareMode: () => void
  onExitCompareMode: () => void
}

export function ProjectFilter({
  projectList,
  projectListLoading,
  selectedProject,
  viewMode,
  compareProjects,
  onSelectProject,
  onClearProject,
  onEnterCompareMode,
  onExitCompareMode,
}: ProjectFilterProps) {
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownMenuRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  // Calculate dropdown position when opened
  useEffect(() => {
    if (projectDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    } else {
      setDropdownPosition(null)
    }
  }, [projectDropdownOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(target)
      ) {
        setProjectDropdownOpen(false)
      }
    }

    if (projectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [projectDropdownOpen])

  const handleSelectProject = (project: string) => {
    onSelectProject(project)
    setProjectDropdownOpen(false)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Project Selector */}
        <div className="flex-1 min-w-0" ref={dropdownRef}>
          <button
            ref={buttonRef}
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="w-full h-10 px-3 text-left rounded-lg border border-border bg-background text-sm flex items-center justify-between hover:bg-muted/30 transition-colors"
            disabled={viewMode === 'compare'}
          >
            <span className={selectedProject ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedProject || 'All Projects'}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${projectDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Compare Mode Toggle - Inline */}
        {viewMode === 'compare' ? (
          <Button variant="outline" size="sm" onClick={onExitCompareMode} className="h-10 shrink-0">
            <X className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onEnterCompareMode}
            className="h-10 shrink-0"
            disabled={projectList.length < 2}
            title="Compare Projects"
          >
            <GitCompare className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dropdown Menu Portal */}
      {projectDropdownOpen && dropdownPosition &&
        createPortal(
          <>
            {/* Backdrop overlay */}
            <div className="fixed inset-0 z-40" onClick={() => setProjectDropdownOpen(false)} />
            {/* Dropdown menu */}
            <div
              ref={dropdownMenuRef}
              className="fixed z-50 rounded-lg border border-border bg-popover shadow-lg max-h-64 overflow-y-auto"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  onClearProject()
                  setProjectDropdownOpen(false)
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                  !selectedProject ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                All Projects
              </button>
              {projectListLoading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
              ) : projectList.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No projects available</div>
              ) : (
                projectList.map((project) => (
                  <button
                    key={project}
                    onClick={() => handleSelectProject(project)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                      selectedProject === project ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    {project}
                  </button>
                ))
              )}
            </div>
          </>,
          document.body
        )}
    </>
  )
}
