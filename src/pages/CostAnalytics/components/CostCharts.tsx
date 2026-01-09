import { useState, useEffect } from 'react'
import { TrendingUp, BarChart3, BarChart as BarChartIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Line,
} from 'recharts'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { getChartColor } from '@/utils/cost-analytics.utils'
import { CHART_COLORS, MAX_PIE_CHART_ITEMS, MAX_BAR_CHART_ITEMS } from '@/constants/cost-analytics.constants'
import type { CostSummaryData, CurrencyConfig, PieChartDataItem, BarChartDataItem, TrendChartDataItem } from '@/types/cost-analytics'
import { ChartSkeleton } from './Skeletons'
import { scaleIn, staggerContainer, transitionNormal } from '@/utils/animations'
import { useCostForecast } from '@/hooks/cost-analytics/useCostForecast'
import { useCostAnalyticsContext } from '@/contexts/CostAnalyticsContext'
import { CostForecast } from './shared/CostForecast'

interface CostChartsProps {
  summaryData: CostSummaryData | null
  summaryLoading: boolean
  currencyConfig: CurrencyConfig
}

export function CostCharts({ summaryData, summaryLoading, currencyConfig }: CostChartsProps) {
  const [showForecast, setShowForecast] = useState(false)
  const { startDate, endDate, selectedProject } = useCostAnalyticsContext()
  const { forecast, fetchForecast } = useCostForecast()

  useEffect(() => {
    if (showForecast && summaryData && summaryData.dailyCosts.length > 0) {
      fetchForecast(startDate, endDate, 30, selectedProject ?? undefined)
    }
  }, [showForecast, startDate, endDate, selectedProject, summaryData, fetchForecast])

  if (summaryLoading && !summaryData) {
    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <ChartSkeleton height={240} />
          <ChartSkeleton height={240} />
        </div>
        <div className="mt-6">
          <ChartSkeleton height={256} />
        </div>
      </>
    )
  }

  if (!summaryData) return null

  // Prepare pie chart data
  const pieData: PieChartDataItem[] = summaryData.projectCosts
    .slice(0, MAX_PIE_CHART_ITEMS)
    .map((p, i) => ({
      name: p.project,
      value: p.totalCost,
      color: getChartColor(i, CHART_COLORS),
    }))

  // Prepare bar chart data
  const barData: BarChartDataItem[] = summaryData.projectCosts
    .slice(0, MAX_BAR_CHART_ITEMS)
    .map((p) => ({
      name: p.project.length > 12 ? p.project.slice(0, 12) + '...' : p.project,
      cost: p.totalCost,
      hours: p.totalHours,
    }))

  // Prepare trend data
  const trendData: TrendChartDataItem[] = summaryData.dailyCosts.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cost: d.cost,
    hours: d.hours,
  }))

  // Add forecast data to trend chart if enabled
  const chartDataWithForecast = showForecast && forecast
    ? [
        ...trendData,
        ...Array.from({ length: forecast.daysRemaining }, (_, i) => {
          const lastDate = new Date(summaryData.dailyCosts[summaryData.dailyCosts.length - 1].date)
          const forecastDate = new Date(lastDate)
          forecastDate.setDate(forecastDate.getDate() + i + 1)
          return {
            date: forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            cost: forecast.projectedCost / forecast.daysRemaining,
            hours: forecast.projectedHours / forecast.daysRemaining,
            forecast: true,
          }
        }),
      ]
    : trendData

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Charts Grid - items-stretch ensures equal height */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Cost Distribution Pie */}
        {pieData.length > 0 && (
          <motion.div variants={scaleIn} transition={transitionNormal} className="h-full">
            <Card className="border-border/50 bg-card/50 h-full flex flex-col">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Cost Distribution</h3>
                </div>
              </div>
              <CardContent className="p-4 flex-1 flex items-center">
                <div className="flex items-center gap-6 w-full">
                  {/* Pie Chart */}
                  <div className="w-48 h-48 shrink-0">
                    <ResponsiveContainer width={192} height={192} minWidth={0}>
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null
                            const data = payload[0].payload as PieChartDataItem
                            return (
                              <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-sm font-medium text-foreground">{data.name}</p>
                                <p className="text-sm text-primary">
                                  {formatCurrency(data.value, currencyConfig)}
                                </p>
                              </div>
                            )
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex-1 flex flex-col gap-2">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-muted-foreground truncate flex-1">
                          {item.name}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {Math.round((item.value / summaryData.totalCost) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Project Performance Bar Chart */}
        {barData.length > 0 && (
          <motion.div variants={scaleIn} transition={transitionNormal} className="h-full">
            <Card className="border-border/50 bg-card/50 h-full flex flex-col">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Project Performance</h3>
                </div>
              </div>
              <CardContent className="p-4 flex-1">
                <div className="h-full w-full min-h-[200px]">
                  <ResponsiveContainer width="100%" height={200} minWidth={0}>
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCurrency(v, currencyConfig)}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null
                          const data = payload[0].payload as BarChartDataItem
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
                      <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Cost Trends */}
      {trendData.length > 0 && (
        <motion.div variants={scaleIn} transition={transitionNormal} className="mt-6">
          <Card className="border-border/50 bg-card/50">
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Cost Trends</h3>
              </div>
              <Button
                variant={showForecast ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowForecast(!showForecast)}
                className="gap-2"
              >
                <BarChartIcon className="h-4 w-4" />
                {showForecast ? 'Hide Forecast' : 'Show Forecast'}
              </Button>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="h-64 min-h-[256px] w-full">
              <ResponsiveContainer width="100%" height={256} minWidth={0}>
                <AreaChart data={chartDataWithForecast}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v, currencyConfig)}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.[0]) return null
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-sm font-medium text-foreground mb-1">{label}</p>
                          <p className="text-sm text-primary">
                            Cost: {formatCurrency(payload[0].value as number, currencyConfig)}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCost)"
                  />
                  {showForecast && (
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {showForecast && forecast && (
              <div className="mt-4">
                <CostForecast forecast={forecast} currencyConfig={currencyConfig} />
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
