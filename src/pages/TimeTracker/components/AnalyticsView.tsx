import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAnalytics } from '@/hooks/time-entry.hooks'

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`
  }
  if (h > 0) {
    return `${h}h`
  }
  return `${m}m`
}

export function AnalyticsView() {
  const { data, loading, error, fetchAnalytics } = useAnalytics()
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics(startDate, endDate)
    }
  }, [startDate, endDate, fetchAnalytics])

  const handleApply = () => {
    if (startDate && endDate && startDate <= endDate) {
      fetchAnalytics(startDate, endDate)
    }
  }

  const quickRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">Error loading analytics: {error.message}</p>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const productivityRanks = data.byUser
    .map((user, index) => ({
      rank: index + 1,
      name: user.userName,
      hours: formatHours(user.hours),
      entries: user.entries,
    }))
    .slice(0, 10)

  const projectRanks = data.byProject
    .map((project, index) => ({
      rank: index + 1,
      project: project.project,
      totalHours: formatHours(project.hours),
      contributors: project.contributors,
    }))
    .slice(0, 10)

  const totalProjectHours = data.byProject.reduce((sum, p) => sum + p.hours, 0)
  const topProjects = data.byProject
    .slice(0, 4)
    .map((project) => ({
      project: project.project,
      hours: formatHours(project.hours),
      percentage: totalProjectHours > 0 ? Math.round((project.hours / totalProjectHours) * 100) : 0,
    }))

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApply} size="sm">
                Apply
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => quickRange(7)}>
              Last 7 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickRange(30)}>
              Last 30 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickRange(90)}>
              Last 90 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickRange(365)}>
              Last year
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
            <p className="text-2xl font-bold">{formatHours(data.totalHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
            <p className="text-2xl font-bold">{data.totalEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Billable Hours</p>
            <p className="text-2xl font-bold">{formatHours(data.billableHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Internal Hours</p>
            <p className="text-2xl font-bold">{formatHours(data.internalHours)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Productive */}
      {productivityRanks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Productive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productivityRanks.map((person) => (
                <div
                  key={person.rank}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-xl ring-1 ring-border/30 bg-primary/10 backdrop-blur-sm text-sm font-bold">
                      {person.rank}
                    </div>
                    <div>
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.entries} entries</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold">{person.hours}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Hours Ranking */}
      {projectRanks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Hours Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectRanks.map((project) => (
                <div
                  key={project.rank}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-xl ring-1 ring-border/30 bg-primary/10 backdrop-blur-sm text-sm font-bold">
                      {project.rank}
                    </div>
                    <div>
                      <p className="font-medium">{project.project}</p>
                      <p className="text-xs text-muted-foreground">{project.contributors} contributors</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold">{project.totalHours}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Projects Distribution */}
      {topProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Projects Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProjects.map((item) => (
                <div key={item.project}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.project}</p>
                      <Badge variant="outline" className="text-xs">
                        {item.hours}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.percentage}%</p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.totalEntries === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No time entries found for the selected date range.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
