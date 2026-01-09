import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TopPerformer, CostSummaryData, CurrencyConfig } from '@/types/cost-analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { formatHours } from '@/utils/cost-analytics.utils'
import { CollapsibleSection } from '../shared/CollapsibleSection'

interface DeveloperTrendsProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  currencyConfig: CurrencyConfig
}

export function DeveloperTrends({
  topPerformers,
  summaryData,
  currencyConfig,
}: DeveloperTrendsProps) {
  // For now, we'll use monthly data from summaryData
  // In a full implementation, this would fetch time-series data from API
  const monthlyTrends = useMemo(() => {
    if (!summaryData?.monthlyCosts) return []
    return summaryData.monthlyCosts.map((month) => ({
      month: month.month,
      cost: month.cost,
      hours: month.hours,
    }))
  }, [summaryData])

  const dailyTrends = useMemo(() => {
    if (!summaryData?.dailyCosts) return []
    return summaryData.dailyCosts.slice(-30).map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cost: day.cost,
      hours: day.hours,
    }))
  }, [summaryData])

  if (!summaryData || topPerformers.length === 0) return null

  return (
    <CollapsibleSection
      title="Trends"
      description="Developer metrics over time"
      defaultExpanded={false}
      storageKey="developer-trends"
    >
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">Daily (30 days)</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="mt-4">
              {monthlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => formatCurrency(value, currencyConfig)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined, name?: string) => {
                        const label = name === 'cost' ? 'Cost' : 'Hours'
                        if (typeof value !== 'number') {
                          return ['-', label]
                        }
                        if (name === 'cost') {
                          return [formatCurrency(value, currencyConfig), label]
                        }
                        return [formatHours(value), label]
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Cost"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      name="Hours"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No monthly trend data available
                </p>
              )}
            </TabsContent>

            <TabsContent value="daily" className="mt-4">
              {dailyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => formatCurrency(value, currencyConfig)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | undefined, name?: string) => {
                        const label = name === 'cost' ? 'Cost' : 'Hours'
                        if (typeof value !== 'number') {
                          return ['-', label]
                        }
                        if (name === 'cost') {
                          return [formatCurrency(value, currencyConfig), label]
                        }
                        return [formatHours(value), label]
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Cost"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      name="Hours"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No daily trend data available
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </CollapsibleSection>
  )
}
