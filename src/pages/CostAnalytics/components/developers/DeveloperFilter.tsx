import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Users, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import type { CostSummaryData, ProjectCostSummary, LiveCostData } from '@/types/cost-analytics'

interface DeveloperFilterProps {
  summaryData: CostSummaryData | null
  projectDetail: ProjectCostSummary | null
  liveData: LiveCostData | null
  selectedDevelopers: string[]
  onDevelopersChange: (developerIds: string[]) => void
}

export function DeveloperFilter({
  summaryData,
  projectDetail,
  liveData,
  selectedDevelopers,
  onDevelopersChange,
}: DeveloperFilterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownMenuRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  // Extract unique developers from all available data sources
  const availableDevelopers = useMemo(() => {
    const developerMap = new Map<string, { id: string; name: string }>()

    // From summary data (top performers)
    summaryData?.topPerformers.forEach((performer) => {
      if (!developerMap.has(performer.userId)) {
        developerMap.set(performer.userId, {
          id: performer.userId,
          name: performer.userName,
        })
      }
    })

    // From project detail
    projectDetail?.developers.forEach((dev) => {
      if (!developerMap.has(dev.userId)) {
        developerMap.set(dev.userId, {
          id: dev.userId,
          name: dev.userName,
        })
      }
    })

    // From live data
    liveData?.activeDevelopers.forEach((dev) => {
      if (!developerMap.has(dev.userId)) {
        developerMap.set(dev.userId, {
          id: dev.userId,
          name: dev.userName,
        })
      }
    })

    return Array.from(developerMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [summaryData, projectDetail, liveData])

  // Calculate dropdown position when opened
  useEffect(() => {
    if (dropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    } else {
      setDropdownPosition(null)
    }
  }, [dropdownOpen])

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
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const handleToggleDeveloper = (developerId: string) => {
    const newSelection = selectedDevelopers.includes(developerId)
      ? selectedDevelopers.filter((id) => id !== developerId)
      : [...selectedDevelopers, developerId]
    onDevelopersChange(newSelection)
  }

  const handleClearAll = () => {
    onDevelopersChange([])
    setDropdownOpen(false)
  }

  const selectedDeveloperNames = useMemo(() => {
    return selectedDevelopers
      .map((id) => availableDevelopers.find((d) => d.id === id)?.name)
      .filter(Boolean) as string[]
  }, [selectedDevelopers, availableDevelopers])

  if (availableDevelopers.length === 0) return null

  return (
    <>
      <div className="flex-1" ref={dropdownRef}>
        <Label className="text-xs text-muted-foreground mb-2 block">Filter by Developer</Label>
        <button
          ref={buttonRef}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full h-10 px-3 text-left rounded-lg border border-border bg-background text-sm flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <span className={selectedDevelopers.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedDevelopers.length === 0
              ? 'All Developers'
              : selectedDevelopers.length === 1
                ? selectedDeveloperNames[0]
                : `${selectedDevelopers.length} developers`}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Selected Developers Badge */}
      {selectedDevelopers.length > 0 && (
        <div className="flex items-end">
          <div className="flex flex-wrap gap-2">
            {selectedDeveloperNames.slice(0, 2).map((name) => (
              <Badge key={name} variant="secondary" className="h-6">
                {name}
                <button
                  onClick={() => handleToggleDeveloper(selectedDevelopers[selectedDeveloperNames.indexOf(name)])}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedDevelopers.length > 2 && (
              <Badge variant="secondary" className="h-6">
                +{selectedDevelopers.length - 2}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Dropdown Menu Portal */}
      {dropdownOpen && dropdownPosition &&
        createPortal(
          <>
            {/* Backdrop overlay */}
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            {/* Dropdown menu */}
            <div
              ref={dropdownMenuRef}
              className="fixed z-50 rounded-lg border border-border bg-popover shadow-lg max-h-64 overflow-y-auto"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
            >
              <button
                onClick={handleClearAll}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors text-muted-foreground border-b border-border"
              >
                Clear All
              </button>
              <div className="max-h-56 overflow-y-auto">
                {availableDevelopers.map((developer) => {
                  const isSelected = selectedDevelopers.includes(developer.id)
                  return (
                    <button
                      key={developer.id}
                      onClick={() => handleToggleDeveloper(developer.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                        isSelected ? 'bg-primary/10 text-primary' : 'text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{developer.name}</span>
                        {isSelected && <span className="text-primary">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  )
}
