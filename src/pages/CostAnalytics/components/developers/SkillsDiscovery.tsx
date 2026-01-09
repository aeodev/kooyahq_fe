import { useMemo, useState } from 'react'
import { Search, Code, Briefcase, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import {
  getDeveloperSkills,
  getAllTeamSkills,
  type DeveloperSkills,
} from '@/utils/skills-extraction.utils'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface SkillsDiscoveryProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
}

export function SkillsDiscovery({
  topPerformers,
  summaryData,
}: SkillsDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const developerSkills = useMemo(() => {
    if (!summaryData) return []
    return topPerformers.map((performer) =>
      getDeveloperSkills(performer, summaryData.projectCosts)
    )
  }, [topPerformers, summaryData])

  const allTeamSkills = useMemo(() => {
    if (!summaryData) return []
    return getAllTeamSkills(topPerformers, summaryData.projectCosts)
  }, [topPerformers, summaryData])

  const filteredDevelopers = useMemo(() => {
    if (!searchQuery.trim()) return developerSkills

    const query = searchQuery.toLowerCase()
    return developerSkills.filter(
      (ds) =>
        ds.userName.toLowerCase().includes(query) ||
        ds.technologies.some((tech) => tech.toLowerCase().includes(query)) ||
        ds.projectTypes.some((type) => type.toLowerCase().includes(query))
    )
  }, [developerSkills, searchQuery])

  const allProjects = useMemo(() => {
    if (!summaryData) return []
    return summaryData.projectCosts.map((p) => p.project)
  }, [summaryData])

  if (!summaryData || topPerformers.length === 0) return null

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Skills & Expertise Discovery</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Find developers by projects, skills, or expertise areas
        </p>
      </div>
      <CardContent className="p-4">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, position, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results */}
        {filteredDevelopers.length > 0 ? (
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {filteredDevelopers.map((ds, i) => {
              const developer = topPerformers.find((p) => p.userId === ds.userId)
              if (!developer) return null

              return (
                <motion.div
                  key={ds.userId}
                  variants={staggerItem}
                  transition={{ delay: i * 0.03, ...transitionNormal }}
                  className="p-4 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {developer?.profilePic ? (
                      <img
                        src={developer.profilePic}
                        alt={developer.userName || 'Developer'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {(developer?.userName || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-foreground">{ds.userName}</p>
                      <Badge variant="outline" className="text-xs">
                        {ds.projectCount} project{ds.projectCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Technologies */}
                    {ds.technologies.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Code className="h-3 w-3" />
                          Technologies
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ds.technologies.slice(0, 8).map((tech) => (
                            <Badge
                              key={tech}
                              variant="secondary"
                              className="text-xs px-2 py-0.5 cursor-pointer hover:bg-primary/10"
                              onClick={() => setSearchQuery(tech)}
                            >
                              {tech}
                            </Badge>
                          ))}
                          {ds.technologies.length > 8 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              +{ds.technologies.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Project Types */}
                    {ds.projectTypes.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Layers className="h-3 w-3" />
                          Project Types
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ds.projectTypes.map((type) => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="text-xs px-2 py-0.5 cursor-pointer hover:bg-primary/10"
                              onClick={() => setSearchQuery(type)}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {ds.technologies.length === 0 && ds.projectTypes.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Skills inferred from {ds.projectCount} project
                        {ds.projectCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
              )
            })}
          </motion.div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No developers found matching "{searchQuery}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching by name, position, or project name
            </p>
          </div>
        )}

        {/* Available Skills */}
        {allTeamSkills.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Team Technologies:</p>
            <div className="flex flex-wrap gap-1">
              {allTeamSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery(skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
