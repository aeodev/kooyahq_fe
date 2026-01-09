import { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'

interface DeveloperFiltersProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  onFilterChange: (filters: DeveloperFilters) => void
}

export type DeveloperFilters = {
  search: string
  project: string | null
  minProjects: number | null
  maxProjects: number | null
}

export function DeveloperFiltersComponent({
  topPerformers,
  summaryData,
  onFilterChange,
}: DeveloperFiltersProps) {
  const [filters, setFilters] = useState<DeveloperFilters>({
    search: '',
    project: null,
    minProjects: null,
    maxProjects: null,
  })

  // Load filters from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('developer-filters')
      if (stored) {
        const parsed = JSON.parse(stored)
        setFilters(parsed)
      }
    } catch {
      // Ignore
    }
  }, [])

  // Save filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('developer-filters', JSON.stringify(filters))
    } catch {
      // Ignore
    }
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const availableProjects = summaryData?.projectCosts.map((p) => p.project) || []

  const activeFiltersCount = filters.project ? 1 : 0

  const clearFilters = () => {
    setFilters({
      search: '',
      project: null,
      minProjects: null,
      maxProjects: null,
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search developers..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Project Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-3 w-3 mr-2" />
            Project
            {filters.project && (
              <Badge variant="secondary" className="ml-2">
                {filters.project}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setFilters({ ...filters, project: null })}>
            All Projects
          </DropdownMenuItem>
          {availableProjects.map((project) => (
            <DropdownMenuItem
              key={project}
              onClick={() => setFilters({ ...filters, project })}
            >
              {project}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-3 w-3 mr-1" />
          Clear ({activeFiltersCount})
        </Button>
      )}

      {/* Active Filter Badges */}
      {filters.project && (
        <Badge
          variant="secondary"
          className="cursor-pointer"
          onClick={() => setFilters({ ...filters, project: null })}
        >
          Project: {filters.project} ×
        </Badge>
      )}
    </div>
  )
}
