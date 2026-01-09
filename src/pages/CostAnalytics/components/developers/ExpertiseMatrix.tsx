import { useMemo, useState } from 'react'
import { Grid3x3, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface ExpertiseMatrixProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  currencyConfig: { symbol: string; code: string; locale: string }
}

type MatrixCell = {
  developerId: string
  developerName: string
  project: string
  hours: number
  cost: number
  intensity: number // 0-1 for color intensity
}

export function ExpertiseMatrix({
  topPerformers,
  summaryData,
  currencyConfig,
}: ExpertiseMatrixProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null)

  const matrixData = useMemo(() => {
    if (!summaryData) return []

    const cells: MatrixCell[] = []
    const maxCost = Math.max(
      ...summaryData.projectCosts.flatMap((p) => p.developers.map((d) => d.cost)),
      1
    )

    topPerformers.forEach((performer) => {
      summaryData.projectCosts.forEach((project) => {
        const devData = project.developers.find((d) => d.userId === performer.userId)
        if (devData) {
          cells.push({
            developerId: performer.userId,
            developerName: performer.userName,
            project: project.project,
            hours: devData.hours,
            cost: devData.cost,
            intensity: devData.cost / maxCost,
          })
        }
      })
    })

    return cells
  }, [topPerformers, summaryData])

  const projects = useMemo(() => {
    if (!summaryData) return []
    return summaryData.projectCosts.map((p) => p.project)
  }, [summaryData])

  const knowledgeGaps = useMemo(() => {
    if (!summaryData) return []
    return summaryData.projectCosts
      .filter((project) => project.developers.length <= 1)
      .map((p) => ({
        project: p.project,
        developers: p.developers.length,
        isSinglePoint: p.developers.length === 1,
      }))
  }, [summaryData])

  if (!summaryData || topPerformers.length === 0) return null

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Expertise Matrix</h3>
          </div>
          <div className="flex gap-2">
            {selectedProject && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedProject(null)}>
                {selectedProject} ×
              </Badge>
            )}
            {selectedDeveloper && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedDeveloper(null)}>
                {topPerformers.find((p) => p.userId === selectedDeveloper)?.userName} ×
              </Badge>
            )}
            {(selectedProject || selectedDeveloper) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedProject(null)
                setSelectedDeveloper(null)
              }}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        {/* Knowledge Gaps Alert */}
        {knowledgeGaps.length > 0 && (
          <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Knowledge Gaps Identified
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {knowledgeGaps.length} project{knowledgeGaps.length !== 1 ? 's' : ''} have{' '}
                  {knowledgeGaps.some((g) => g.isSinglePoint) ? 'single' : 'few'} developer
                  {knowledgeGaps.some((g) => g.isSinglePoint) ? '' : 's'}. Consider cross-training
                  opportunities.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header */}
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `200px repeat(${projects.length}, minmax(100px, 1fr))` }}>
              <div className="text-xs font-medium text-muted-foreground p-2">Developer</div>
              {projects.map((project) => (
                <div
                  key={project}
                  className={`text-xs font-medium text-muted-foreground p-2 text-center cursor-pointer hover:bg-muted/50 rounded ${
                    selectedProject === project ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => setSelectedProject(selectedProject === project ? null : project)}
                  title={project}
                >
                  <div className="truncate">{project}</div>
                </div>
              ))}
            </div>

            {/* Rows */}
            <motion.div
              className="space-y-1"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {topPerformers.map((performer, i) => {
                const developerCells = matrixData.filter((c) => c.developerId === performer.userId)

                return (
                  <motion.div
                    key={performer.userId}
                    variants={staggerItem}
                    transition={{ delay: i * 0.03, ...transitionNormal }}
                    className={`grid gap-2 p-2 rounded hover:bg-muted/30 transition-colors ${
                      selectedDeveloper === performer.userId ? 'bg-primary/10' : ''
                    }`}
                    style={{ gridTemplateColumns: `200px repeat(${projects.length}, minmax(100px, 1fr))` }}
                  >
                    <div
                      className="text-sm font-medium text-foreground p-1 cursor-pointer hover:bg-muted/50 rounded"
                      onClick={() => setSelectedDeveloper(selectedDeveloper === performer.userId ? null : performer.userId)}
                    >
                      {performer.userName}
                    </div>
                    {projects.map((project) => {
                      const cell = developerCells.find((c) => c.project === project)
                      const intensity = cell?.intensity || 0

                      const cellOpacity = cell ? Math.max(intensity, 0.2) : 0.1
                      const isHighContribution = intensity > 0.7
                      const isMediumContribution = intensity > 0.3 && intensity <= 0.7

                      return (
                        <div
                          key={project}
                          className={`text-center p-3 rounded-lg text-xs transition-all relative group ${
                            cell
                              ? 'cursor-pointer hover:scale-105 hover:shadow-md'
                              : 'opacity-30'
                          }`}
                          style={{
                            backgroundColor: cell
                              ? isHighContribution
                                ? `rgba(59, 130, 246, ${cellOpacity})`
                                : isMediumContribution
                                  ? `rgba(59, 130, 246, ${cellOpacity * 0.6})`
                                  : `rgba(59, 130, 246, ${cellOpacity * 0.3})`
                              : 'rgba(0, 0, 0, 0.05)',
                            color: cell && intensity > 0.5 ? 'white' : 'inherit',
                            minHeight: '60px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          title={
                            cell
                              ? `${performer.userName} - ${project}\n${formatCurrency(cell.cost, currencyConfig)} (${cell.hours.toFixed(1)}h)`
                              : 'No contribution'
                          }
                          onClick={() => {
                            if (cell) {
                              setSelectedProject(selectedProject === project ? null : project)
                            }
                          }}
                        >
                          {cell ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-sm">
                                {formatCurrency(cell.cost, currencyConfig)}
                              </div>
                              <div className={`text-[10px] ${intensity > 0.5 ? 'opacity-90' : 'opacity-70'}`}>
                                {cell.hours.toFixed(1)}h
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-lg">—</span>
                          )}
                          {/* Hover tooltip */}
                          {cell && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                              <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-lg border border-border whitespace-nowrap">
                                <div className="font-medium">{project}</div>
                                <div>{formatCurrency(cell.cost, currencyConfig)}</div>
                                <div className="text-muted-foreground">{cell.hours.toFixed(1)}h</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/20" />
              <span>Low contribution</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/60" />
              <span>Medium contribution</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span>High contribution</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
