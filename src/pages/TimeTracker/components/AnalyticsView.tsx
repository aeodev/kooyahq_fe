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
  ChevronDown,
  Moon
} from 'lucide-react'

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  defaultOpen = true,
  children
}: {
  title: string
  icon: React.ElementType
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-base font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </Card>
  )
}

// Progress Ring Component
function ProgressRing({ 
  progress, 
  size = 72, 
  strokeWidth = 6,
}: { 
  progress: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference
  const gradientId = `ring-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(16, 185, 129)" />
            <stop offset="100%" stopColor="rgb(20, 184, 166)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground tabular-nums">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

// Sparkline Chart
function SparklineChart({ data, height = 40 }: { data: number[]; height?: number }) {
  if (data.length === 0) return null
  
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const width = 100
  const padding = 4
  
  const pointsArray = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2 - 4)
    return { x, y }
  })
  
  const points = pointsArray.map(p => `${p.x},${p.y}`).join(' ')
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`
  const gradientId = `sparkline-${Math.random().toString(36).substr(2, 9)}`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke="rgb(16, 185, 129)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Activity Heatmap
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
    
    if (currentWeek.length > 0) weeksArray.push(currentWeek)
    return weeksArray.slice(-8)
  }, [data])

  const maxHours = Math.max(...data.map(d => d.hours), 1)

  const getIntensityClass = (hours: number) => {
    const ratio = hours / maxHours
    if (hours === 0) return 'bg-muted/30'
    if (ratio < 0.25) return 'bg-emerald-500/20'
    if (ratio < 0.5) return 'bg-emerald-500/40'
    if (ratio < 0.75) return 'bg-emerald-500/60'
    return 'bg-emerald-500/90'
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <div className="w-6 flex flex-col gap-1 text-xs text-muted-foreground">
          {dayLabels.map((day, i) => (
            <div key={i} className="h-4 flex items-center justify-center">{day}</div>
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
                    className={`h-4 rounded transition-all duration-200 hover:ring-2 hover:ring-primary/50 cursor-pointer ${getIntensityClass(dayData?.hours || 0)}`}
                    title={dayData ? `${new Date(dayData.date).toLocaleDateString()}: ${formatHours(dayData.hours)}` : 'No data'}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {['bg-muted/30', 'bg-emerald-500/20', 'bg-emerald-500/40', 'bg-emerald-500/60', 'bg-emerald-500/90'].map((cls) => (
            <div key={cls} className={`w-4 h-4 rounded ${cls}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

// Bar Chart
function BarChart({ data, maxValue }: { data: Array<{ label: string; value: number }>; maxValue?: number }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1)
  const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground font-medium truncate max-w-[60%]">{item.label}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{formatHours(item.value)}</span>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${colors[index % colors.length]}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Stat Card
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend === 'up' ? 'text-emerald-600 bg-emerald-500/10' : 
              trend === 'down' ? 'text-red-600 bg-red-500/10' : 
              'text-muted-foreground bg-muted'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-4 -mx-1 -mb-1">
            <SparklineChart data={sparklineData} height={40} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Leaderboard Item
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
  badge?: { text: string }
}) {
  const rankStyles: Record<number, string> = {
    1: 'bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/30',
    2: 'bg-slate-400/20 text-slate-600 ring-1 ring-slate-400/30',
    3: 'bg-orange-500/20 text-orange-600 ring-1 ring-orange-500/30',
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center h-8 w-8 rounded-lg text-sm font-bold ${
          rankStyles[rank] || 'bg-muted text-muted-foreground'
        }`}>
          {rank}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
            {badge && (
              <Badge className="text-xs px-2 py-0 bg-amber-500/10 text-amber-600 border-0">
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
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (startDate && endDate) fetchAnalytics(startDate, endDate)
  }, [startDate, endDate, fetchAnalytics])

  const handleApply = () => {
    if (startDate && endDate && startDate <= endDate) fetchAnalytics(startDate, endDate)
  }

  const quickRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const insights = useMemo(() => {
    if (!data) return null
    return {
      avgHoursPerDay: data.byDay.length > 0 ? data.totalHours / data.byDay.length : 0,
      avgEntriesPerDay: data.byDay.length > 0 ? data.totalEntries / data.byDay.length : 0,
      mostProductiveDay: data.byDay.reduce((max, day) => day.hours > (max?.hours || 0) ? day : max, null as { date: string; hours: number } | null),
      overtimePercentage: data.totalEntries > 0 ? (data.totalOvertimeEntries / data.totalEntries) * 100 : 0,
      topProject: data.byProject[0],
      topContributor: data.byUser[0],
    }
  }, [data])

  const dailyHoursTrend = useMemo(() => data?.byDay.slice(-14).map(d => d.hours) || [], [data])
  const dailyEntriesTrend = useMemo(() => data?.byDay.slice(-14).map(d => d.entries) || [], [data])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="max-w-md border-red-500/50 bg-red-500/5">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-red-600">Error loading analytics</p>
            <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
            <Button onClick={handleApply} variant="outline" size="sm" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const productivityRanks = data.byUser.map((user, index) => ({
    rank: index + 1,
    name: user.userName,
    hours: formatHours(user.hours),
    entries: user.entries,
    overtimeEntries: user.overtimeEntries,
  })).slice(0, 10)

  const overtimeRanks = data.byUser
    .filter(user => user.overtimeEntries > 0)
    .sort((a, b) => b.overtimeHours - a.overtimeHours)
    .map((user, index) => ({
      rank: index + 1,
      name: user.userName,
      overtimeEntries: user.overtimeEntries,
      overtimeHours: formatHours(user.overtimeHours),
      totalEntries: user.entries,
    })).slice(0, 10)

  const projectData = data.byProject.slice(0, 6).map(p => ({ label: p.project, value: p.hours }))
  const totalProjectHours = data.byProject.reduce((sum, p) => sum + p.hours, 0)

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Date Range</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="startDate" className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="endDate" className="text-xs text-muted-foreground">End</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleApply} size="sm" className="h-10 px-4 gap-1">
                    <ChevronRight className="h-4 w-4" />
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
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
                className="h-8 px-4 text-xs"
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

      {/* Activity Heatmap - Collapsible */}
      {data.byDay.length > 0 && (
        <CollapsibleSection title="Activity Overview" icon={Activity} defaultOpen={true}>
          <ActivityHeatmap data={data.byDay} />
        </CollapsibleSection>
      )}

      {/* Insights Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.mostProductiveDay && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best Day</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(insights.mostProductiveDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {formatHours(insights.mostProductiveDay.hours)}
                </p>
              </CardContent>
            </Card>
          )}

          {insights.topProject && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Top Project</p>
                    <p className="text-sm font-medium text-foreground truncate">{insights.topProject.project}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{formatHours(insights.topProject.hours)}</p>
                  <p className="text-xs text-muted-foreground">· {insights.topProject.contributors} people</p>
                </div>
              </CardContent>
            </Card>
          )}

          {insights.topContributor && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Top Person</p>
                    <p className="text-sm font-medium text-foreground truncate">{insights.topContributor.userName}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{formatHours(insights.topContributor.hours)}</p>
                  <p className="text-xs text-muted-foreground">· {insights.topContributor.entries} entries</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Leaderboard + Projects - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {productivityRanks.length > 0 && (
          <CollapsibleSection 
            title="Most Productive" 
            icon={Target} 
            badge={<Badge variant="secondary" className="text-xs ml-2">Top 10</Badge>}
          >
            <div className="space-y-2">
              {productivityRanks.map((person) => (
                <LeaderboardItem
                  key={person.rank}
                  rank={person.rank}
                  name={person.name}
                  value={person.hours}
                  subtext={`${person.entries} entries`}
                  badge={person.overtimeEntries > 0 ? { text: `${person.overtimeEntries} OT` } : undefined}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {projectData.length > 0 && (
          <CollapsibleSection 
            title="Project Hours" 
            icon={Briefcase} 
            badge={<Badge variant="secondary" className="text-xs ml-2">Top 6</Badge>}
          >
            <BarChart data={projectData} />
            
            {/* Distribution */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Distribution</p>
              <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
                {data.byProject.slice(0, 5).map((project, index) => {
                  const percentage = (project.hours / totalProjectHours) * 100
                  const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500']
                  return (
                    <div
                      key={project.project}
                      className={`${colors[index]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                      title={`${project.project}: ${formatHours(project.hours)}`}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                {data.byProject.slice(0, 5).map((project, index) => {
                  const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500']
                  const percentage = Math.round((project.hours / totalProjectHours) * 100)
                  return (
                    <div key={project.project} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${colors[index]}`} />
                      <span className="text-muted-foreground truncate max-w-[100px]">{project.project}</span>
                      <span className="font-medium text-foreground">{percentage}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Overtime Section */}
      {overtimeRanks.length > 0 && (
        <CollapsibleSection 
          title="Overtime Work" 
          icon={Moon} 
          badge={<Badge className="text-xs ml-2 bg-amber-500/10 text-amber-600 border-0">{data.totalOvertimeEntries} entries</Badge>}
          defaultOpen={false}
        >
          <p className="text-xs text-muted-foreground mb-4">Team members with overtime in this period</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {overtimeRanks.map((person) => (
              <div
                key={person.rank}
                className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/20 text-sm font-bold text-amber-600">
                    {person.rank}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{person.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{person.totalEntries} total</p>
                      <Badge className="text-xs px-2 py-0 bg-amber-500/10 text-amber-600 border-0">
                        {person.overtimeEntries} OT
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-amber-600 tabular-nums">{person.overtimeHours}</p>
                  <p className="text-xs text-muted-foreground">overtime</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Daily Breakdown */}
      {data.byDay.length > 0 && (
        <CollapsibleSection title="Daily Breakdown" icon={Calendar} defaultOpen={false}>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {[...data.byDay].reverse().slice(0, 15).map((day) => {
              const date = new Date(day.date)
              const isToday = date.toDateString() === new Date().toDateString()
              const dayProgress = (day.hours / 8) * 100
              
              return (
                <div
                  key={day.date}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    isToday ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:bg-accent/30'
                  }`}
                >
                  <div className="w-16 flex-shrink-0">
                    <p className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  
                  <div className="flex-1">
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${Math.min(dayProgress, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="w-20 text-right flex-shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatHours(day.hours)}</p>
                    <p className="text-xs text-muted-foreground">{day.entries} entries</p>
                  </div>

                  {isToday && (
                    <Badge variant="secondary" className="text-xs">Today</Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {data.totalEntries === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-12 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Timer className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No entries found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting the date range</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
