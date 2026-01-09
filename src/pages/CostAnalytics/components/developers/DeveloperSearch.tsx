import { useState, useMemo } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface DeveloperSearchProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  onSelectDeveloper?: (developerId: string) => void
}

type FilterState = {
  project: string | null
  minProjects: number | null
  maxProjects: number | null
}

export function DeveloperSearch({
  topPerformers,
  summaryData,
  onSelectDeveloper,
}: DeveloperSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    project: null,
    minProjects: null,
    maxProjects: null,
  })

  const availableProjects = useMemo(() => {
    if (!summaryData) return []
    return summaryData.projectCosts.map((p) => p.project)
  }, [summaryData])

  const filteredDevelopers = useMemo(() => {
    let filtered = topPerformers

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (dev) =>
          dev.userName.toLowerCase().includes(query) ||
          dev.position?.toLowerCase().includes(query) ||
          dev.userEmail.toLowerCase().includes(query) ||
          dev.projects.some((p) => p.toLowerCase().includes(query))
      )
    }

    // Project filter
    if (filters.project) {
      filtered = filtered.filter((dev) => dev.projects.includes(filters.project!))
    }

    // Project count filters
    if (filters.minProjects !== null) {
      filtered = filtered.filter((dev) => dev.projectCount >= filters.minProjects!)
    }
    if (filters.maxProjects !== null) {
      filtered = filtered.filter((dev) => dev.projectCount <= filters.maxProjects!)
    }

    return filtered
  }, [topPerformers, searchQuery, filters])

  const activeFiltersCount =
    (filters.project ? 1 : 0) +
    (filters.minProjects !== null ? 1 : 0) +
    (filters.maxProjects !== null ? 1 : 0)

  const clearFilters = () => {
    setFilters({
      project: null,
      minProjects: null,
      maxProjects: null,
    })
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Find Developers</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Search and filter to find the right developer for your project
        </p>
      </div>
      <CardContent className="p-4">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, position, email, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3 w-3 mr-2" />
                Filter by Project
                {filters.project && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.project}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3 w-3 mr-2" />
                Project Count
                {(filters.minProjects !== null || filters.maxProjects !== null) && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.minProjects !== null ? filters.minProjects : '0'}-{filters.maxProjects !== null ? filters.maxProjects : '∞'}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilters({ ...filters, minProjects: null, maxProjects: null })}>
                Any
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilters({ ...filters, minProjects: 1, maxProjects: 2 })}>
                1-2 projects
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilters({ ...filters, minProjects: 3, maxProjects: 5 })}>
                3-5 projects
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilters({ ...filters, minProjects: 6, maxProjects: null })}>
                6+ projects
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
              <X className="h-3 w-3 mr-1" />
              Clear ({activeFiltersCount})
            </Button>
          )}
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.project && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({ ...filters, project: null })}>
                Project: {filters.project} ×
              </Badge>
            )}
            {filters.minProjects !== null && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({ ...filters, minProjects: null })}>
                Min: {filters.minProjects} ×
              </Badge>
            )}
            {filters.maxProjects !== null && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilters({ ...filters, maxProjects: null })}>
                Max: {filters.maxProjects} ×
              </Badge>
            )}
          </div>
        )}

        {/* Results */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Found {filteredDevelopers.length} developer{filteredDevelopers.length !== 1 ? 's' : ''}
          </p>
          {filteredDevelopers.length > 0 ? (
            <motion.div
              className="space-y-2"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {filteredDevelopers.map((developer, i) => (
                <motion.div
                  key={developer.userId}
                  variants={staggerItem}
                  transition={{ delay: i * 0.03, ...transitionNormal }}
                  className={`p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors ${
                    onSelectDeveloper ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onSelectDeveloper?.(developer.userId)}
                >
                  <div className="flex items-center gap-3">
                    {developer?.profilePic ? (
                      <img
                        src={developer.profilePic}
                        alt={developer.userName || 'Developer'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {(developer?.userName || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {developer.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {developer.position || 'Developer'} · {developer.projectCount} project
                        {developer.projectCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {developer.projects.slice(0, 3).map((project) => (
                        <Badge key={project} variant="secondary" className="text-xs">
                          {project}
                        </Badge>
                      ))}
                      {developer.projects.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{developer.projects.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No developers found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
