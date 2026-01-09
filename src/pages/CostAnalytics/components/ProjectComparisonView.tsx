import { GitCompare, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency, formatCompactCurrency } from '@/stores/cost-analytics.store'
import { convertFromPHPSync } from '@/utils/currency-converter'
import { getChartColor } from '@/utils/cost-analytics.utils'
import { CHART_COLORS, MAX_COMPARE_PROJECTS } from '@/constants/cost-analytics.constants'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { ProjectCostSummary, CurrencyConfig } from '@/types/cost-analytics'
import { NoDataState } from './EmptyStates'

interface ProjectComparisonViewProps {
  compareProjects: string[]
  compareData: ProjectCostSummary[]
  compareLoading: boolean
  projectList: string[]
  currencyConfig: CurrencyConfig
  onToggleCompareProject: (project: string) => void
}

export function ProjectComparisonView({
  compareProjects,
  compareData,
  compareLoading,
  projectList,
  currencyConfig,
  onToggleCompareProject,
}: ProjectComparisonViewProps) {
  return (
    <>
      {/* Compare Mode Project Selection */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <Label className="text-xs text-muted-foreground mb-2 block">
            Select projects to compare (up to {MAX_COMPARE_PROJECTS})
          </Label>
          <div className="flex flex-wrap gap-2">
            {projectList.map((project) => {
              const isSelected = compareProjects.includes(project)
              return (
                <button
                  key={project}
                  onClick={() => onToggleCompareProject(project)}
                  disabled={!isSelected && compareProjects.length >= MAX_COMPARE_PROJECTS}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {project}
                </button>
              )
            })}
          </div>
          {compareProjects.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {compareProjects.length} project{compareProjects.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Compare Mode View */}
      {compareProjects.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Project Comparison</h3>
              </div>
              {compareLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
          <CardContent className="p-4">
            {compareData.length > 0 ? (
              <div className="space-y-6">
                {/* Comparison Cards */}
                <div
                  className={`grid gap-4 ${
                    compareData.length === 2
                      ? 'grid-cols-2'
                      : compareData.length === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2 lg:grid-cols-4'
                  }`}
                >
                  {compareData.map((project, i) => (
                    <div
                      key={project.project}
                      className="p-4 rounded-lg border border-border/50 bg-background"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getChartColor(i, CHART_COLORS) }}
                        />
                        <h4 className="font-medium text-foreground truncate">{project.project}</h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Cost</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(project.totalCost, currencyConfig)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Hours</p>
                          <p className="text-sm font-medium text-foreground">
                            {formatHours(project.totalHours)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Developers</p>
                          <p className="text-sm font-medium text-foreground">
                            {project.developers.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Rate</p>
                          <p className="text-sm font-medium text-foreground">
                            {currencyConfig.symbol}
                            {convertFromPHPSync(project.avgHourlyRate, currencyConfig.code).toFixed(0)}/hr
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comparison Bar Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={compareData.map((p) => ({
                        name: p.project.length > 15 ? p.project.slice(0, 15) + '...' : p.project,
                        cost: p.totalCost,
                        hours: p.totalHours,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis
                        tickFormatter={(v) => formatCompactCurrency(v, currencyConfig)}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null
                          const data = payload[0].payload as { name: string; cost: number; hours: number }
                          return (
                            <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-sm font-medium text-foreground">{data.name}</p>
                              <p className="text-sm text-primary">
                                Cost: {formatCurrency(data.cost, currencyConfig)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Hours: {formatHours(data.hours)}
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <NoDataState message="Select projects to compare" />
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
