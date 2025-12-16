import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAnalytics } from '@/hooks/time-entry.hooks'
import { formatHours } from './utils'
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  Calendar,
  BarChart3,
  Activity,
  Flame,
  Target,
  Award,
  Timer,
  ChevronRight,
  Sparkles,
  Moon
} from 'lucide-react'

// Progress Ring Component
function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 8,
  color = 'hsl(var(--primary))',
  showLabel = true
}: { 
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  showLabel?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}

// Sparkline Chart Component
function SparklineChart({ 
  data, 
  height = 40
}: { 
  data: number[]
  height?: number
}) {
  if (data.length === 0) return null
  
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const width = 100
  const padding = 4
  
  const pointsArray = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2 - 4)
    return { x, y, value }
  })
  
  const points = pointsArray.map(p => `${p.x},${p.y}`).join(' ')
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`
  
  // Get last point for the indicator dot
  const lastPoint = pointsArray[pointsArray.length - 1]

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      
      {/* Area fill with gradient */}
      <polygon
        points={areaPoints}
        fill="url(#sparklineGradient)"
        className="transition-all duration-500"
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-500"
      />
      
      {/* End point indicator */}
      {lastPoint && (
        <>
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="3"
            fill="hsl(var(--primary))"
            className="transition-all duration-500"
          />
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="5"
            fill="hsl(var(--primary))"
            opacity="0.3"
            className="transition-all duration-500"
          />
        </>
      )}
    </svg>
  )
}

// Activity Heatmap Component
function ActivityHeatmap({ data }: { data: Array<{ date: string; hours: number }> }) {
  const weeks = useMemo(() => {
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const weeksArray: Array<Array<{ date: string; hours: number; dayOfWeek: number }>> = []
    let currentWeek: Array<{ date: string; hours: number; dayOfWeek: number }> = []
    
    sortedData.forEach((item) => {
      const date = new Date(item.date)
      const dayOfWeek = date.getDay()
      
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeksArray.push(currentWeek)
        currentWeek = []
      }
      
      currentWeek.push({ ...item, dayOfWeek })
    })
    
    if (currentWeek.length > 0) {
      weeksArray.push(currentWeek)
    }
    
    return weeksArray.slice(-8) // Last 8 weeks
  }, [data])

  const maxHours = Math.max(...data.map(d => d.hours), 1)

  const getIntensityClass = (hours: number) => {
    const ratio = hours / maxHours
    if (hours === 0) return 'bg-muted/30'
    if (ratio < 0.25) return 'bg-primary/20'
    if (ratio < 0.5) return 'bg-primary/40'
    if (ratio < 0.75) return 'bg-primary/60'
    return 'bg-primary/90'
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <div className="w-8 flex flex-col gap-1 text-[10px] text-muted-foreground">
          {dayLabels.map((day, i) => (
            <div key={day} className="h-3 flex items-center">{i % 2 === 1 ? day : ''}</div>
          ))}
        </div>
        <div className="flex-1 flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex-1 flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const dayData = week.find(d => d.dayOfWeek === dayIndex)
                return (
                  <div
                    key={dayIndex}
                    className={`h-3 rounded-sm transition-all duration-200 hover:ring-2 hover:ring-primary/50 cursor-pointer ${getIntensityClass(dayData?.hours || 0)}`}
                    title={dayData ? `${new Date(dayData.date).toLocaleDateString()}: ${formatHours(dayData.hours)}` : 'No data'}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          {['bg-muted/30', 'bg-primary/20', 'bg-primary/40', 'bg-primary/60', 'bg-primary/90'].map((cls) => (
            <div key={cls} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

// Bar Chart Component
function BarChart({ 
  data, 
  maxValue 
}: { 
  data: Array<{ label: string; value: number }>
  maxValue?: number 
}) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1)
  const barColors = [
    'bg-primary',
    'bg-sky-500', 
    'bg-violet-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500'
  ]
  
  return (
    <div className="space-y-2.5">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground font-medium truncate max-w-[60%]">{item.label}</span>
            <span className="text-[12px] text-muted-foreground tabular-nums">{formatHours(item.value)}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${barColors[index % barColors.length]}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  sparklineData
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  sparklineData?: number[]
}) {
  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              trend === 'up' 
                ? 'text-primary bg-primary/10' 
                : trend === 'down' 
                  ? 'text-destructive bg-destructive/10' 
                  : 'text-muted-foreground bg-muted'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-2.5 w-2.5" /> : trend === 'down' ? <TrendingDown className="h-2.5 w-2.5" /> : null}
              {trendValue}
            </div>
          )}
        </div>
        
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{title}</p>
          <p className="text-2xl font-semibold text-foreground tracking-tight leading-none">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-3 -mx-1 -mb-1">
            <SparklineChart data={sparklineData} height={40} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Leaderboard Item Component
function LeaderboardItem({
  rank,
  name,
  value,
  subtext,
  badge
}: {
  rank: number
  name: string
  value: string
  subtext?: string
  badge?: { text: string; variant: 'default' | 'secondary' | 'outline' }
}) {
  const rankStyles = {
    1: 'bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/30',
    2: 'bg-slate-400/20 text-slate-600 ring-1 ring-slate-400/30',
    3: 'bg-orange-500/20 text-orange-600 ring-1 ring-orange-500/30',
  }

  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-2.5">
        <div className={`flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold ${
          rankStyles[rank as keyof typeof rankStyles] || 'bg-muted text-muted-foreground'
        }`}>
          {rank}
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground leading-tight">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {subtext && <p className="text-[11px] text-muted-foreground">{subtext}</p>}
            {badge && (
              <Badge 
                variant={badge.variant} 
                className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30"
              >
                {badge.text}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function AnalyticsView() {
  const { data, loading, error, fetchAnalytics } = useAnalytics()
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 15)
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

  // Calculate insights
  const insights = useMemo(() => {
    if (!data) return null

    const avgHoursPerDay = data.byDay.length > 0 
      ? data.totalHours / data.byDay.length 
      : 0
    
    const avgEntriesPerDay = data.byDay.length > 0
      ? data.totalEntries / data.byDay.length
      : 0

    const mostProductiveDay = data.byDay.reduce(
      (max, day) => day.hours > (max?.hours || 0) ? day : max,
      null as { date: string; hours: number } | null
    )

    const overtimePercentage = data.totalEntries > 0
      ? (data.totalOvertimeEntries / data.totalEntries) * 100
      : 0

    const topProject = data.byProject[0]
    const topContributor = data.byUser[0]

    return {
      avgHoursPerDay,
      avgEntriesPerDay,
      mostProductiveDay,
      overtimePercentage,
      topProject,
      topContributor,
    }
  }, [data])

  // Daily hours trend for sparkline
  const dailyHoursTrend = useMemo(() => {
    if (!data) return []
    return data.byDay.slice(-14).map(d => d.hours)
  }, [data])

  // Daily entries trend for sparkline
  const dailyEntriesTrend = useMemo(() => {
    if (!data) return []
    return data.byDay.slice(-14).map(d => d.entries)
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-destructive font-medium">Error loading analytics</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            <Button onClick={handleApply} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
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
      overtimeEntries: user.overtimeEntries,
    }))
    .slice(0, 10)

  const overtimeRanks = data.byUser
    .filter((user) => user.overtimeEntries > 0)
    .sort((a, b) => b.overtimeHours - a.overtimeHours)
    .map((user, index) => ({
      rank: index + 1,
      name: user.userName,
      overtimeEntries: user.overtimeEntries,
      overtimeHours: formatHours(user.overtimeHours),
      totalEntries: user.entries,
    }))
    .slice(0, 10)

  const projectData = data.byProject.slice(0, 6).map((p) => ({
    label: p.project,
    value: p.hours,
  }))

  const totalProjectHours = data.byProject.reduce((sum, p) => sum + p.hours, 0)

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="border-border">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Date Range</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="startDate" className="text-[10px] text-muted-foreground uppercase tracking-wide">Start</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 text-[13px]"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="endDate" className="text-[10px] text-muted-foreground uppercase tracking-wide">End</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-9 text-[13px]"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleApply} size="sm" className="w-full sm:w-auto h-9">
                    <ChevronRight className="h-3.5 w-3.5 mr-0.5" />
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[
              { label: '7d', days: 7 },
              { label: '15d', days: 15 },
              { label: '30d', days: 30 },
              { label: '90d', days: 90 },
              { label: '1y', days: 365 },
            ].map(({ label, days }) => (
              <Button
                key={days}
                variant="outline"
                size="sm"
                onClick={() => quickRange(days)}
                className="h-7 px-2.5 text-[11px]"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Hours"
          value={formatHours(data.totalHours)}
          subtitle={`${insights?.avgHoursPerDay.toFixed(1)}h avg/day`}
          icon={Clock}
          sparklineData={dailyHoursTrend}
        />
        <StatCard
          title="Total Entries"
          value={data.totalEntries.toString()}
          subtitle={`${insights?.avgEntriesPerDay.toFixed(1)} avg/day`}
          icon={BarChart3}
          sparklineData={dailyEntriesTrend}
        />
        <StatCard
          title="Team Members"
          value={data.byUser.length.toString()}
          subtitle="Active contributors"
          icon={Users}
        />
        <StatCard
          title="Overtime"
          value={data.totalOvertimeEntries.toString()}
          subtitle={`${insights?.overtimePercentage.toFixed(1)}% of entries`}
          icon={Moon}
        />
      </div>

      {/* Activity Heatmap */}
      {data.byDay.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ActivityHeatmap data={data.byDay} />
          </CardContent>
        </Card>
      )}

      {/* Insights Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {insights.mostProductiveDay && (
            <Card className="border-border">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-muted">
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Best Day</p>
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {new Date(insights.mostProductiveDay.date).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {formatHours(insights.mostProductiveDay.hours)}
                </p>
              </CardContent>
            </Card>
          )}

          {insights.topProject && (
            <Card className="border-border">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-muted">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Top Project</p>
                    <p className="text-[13px] font-medium text-foreground truncate">{insights.topProject.project}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-semibold text-foreground">
                    {formatHours(insights.topProject.hours)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    · {insights.topProject.contributors} people
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {insights.topContributor && (
            <Card className="border-border">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-muted">
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Top Person</p>
                    <p className="text-[13px] font-medium text-foreground truncate">{insights.topContributor.userName}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-semibold text-foreground">
                    {formatHours(insights.topContributor.hours)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    · {insights.topContributor.entries} entries
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Two Column Layout: Leaderboard + Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most Productive */}
        {productivityRanks.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Most Productive
                <Badge variant="secondary" className="ml-auto text-[10px] h-5">Top 10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-4 pb-4">
              {productivityRanks.map((person) => (
                <LeaderboardItem
                  key={person.rank}
                  rank={person.rank}
                  name={person.name}
                  value={person.hours}
                  subtext={`${person.entries} entries`}
                  badge={person.overtimeEntries > 0 ? { 
                    text: `${person.overtimeEntries} OT`, 
                    variant: 'outline' 
                  } : undefined}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Project Distribution */}
        {projectData.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Project Hours
                <Badge variant="secondary" className="ml-auto text-[10px] h-5">Top 6</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <BarChart data={projectData} />
              
              {/* Project Distribution Visual */}
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Distribution</p>
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  {data.byProject.slice(0, 5).map((project, index) => {
                    const percentage = (project.hours / totalProjectHours) * 100
                    const colors = ['bg-primary', 'bg-sky-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500']
                    return (
                      <div
                        key={project.project}
                        className={`${colors[index]} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                        title={`${project.project}: ${formatHours(project.hours)} (${percentage.toFixed(1)}%)`}
                      />
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2.5 mt-2.5">
                  {data.byProject.slice(0, 5).map((project, index) => {
                    const colors = ['bg-primary', 'bg-sky-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500']
                    const percentage = Math.round((project.hours / totalProjectHours) * 100)
                    return (
                      <div key={project.project} className="flex items-center gap-1 text-[11px]">
                        <div className={`w-1.5 h-1.5 rounded-full ${colors[index]}`} />
                        <span className="text-muted-foreground truncate max-w-[80px]">{project.project}</span>
                        <span className="font-medium text-foreground">{percentage}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Overtime Section */}
      {overtimeRanks.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Moon className="h-4 w-4 text-amber-500" />
              Overtime Work
              <Badge className="ml-auto text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-500/30">
                {data.totalOvertimeEntries} entries
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1">
              Team members with overtime in this period
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {overtimeRanks.map((person) => (
                <div
                  key={person.rank}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-500/20 text-xs font-bold text-amber-600">
                      {person.rank}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground leading-tight">{person.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[11px] text-muted-foreground">{person.totalEntries} total</p>
                        <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                          {person.overtimeEntries} OT
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-amber-600 tabular-nums">{person.overtimeHours}</p>
                    <p className="text-[9px] text-muted-foreground">overtime</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      {data.byDay.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Daily Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
              {[...data.byDay].reverse().slice(0, 15).map((day) => {
                const date = new Date(day.date)
                const isToday = date.toDateString() === new Date().toDateString()
                const dayProgress = (day.hours / 8) * 100
                
                return (
                  <div
                    key={day.date}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      isToday 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-card hover:bg-accent/30'
                    }`}
                  >
                    <div className="w-16 flex-shrink-0">
                      <p className={`text-[13px] font-medium leading-tight ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    
                    <div className="flex-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(dayProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="w-16 text-right flex-shrink-0">
                      <p className="text-[13px] font-semibold tabular-nums leading-tight">{formatHours(day.hours)}</p>
                      <p className="text-[10px] text-muted-foreground">{day.entries} entries</p>
                    </div>

                    {isToday && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">
                        Today
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.totalEntries === 0 && (
        <Card className="border-border">
          <CardContent className="py-10 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
              <Timer className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No entries found</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Try adjusting the date range
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
