import { Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { OvertimeBreakdown, CurrencyConfig } from '@/types/cost-analytics'
import { motion } from 'framer-motion'
import { scaleIn, transitionNormal } from '@/utils/animations'
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface OvertimeBreakdownProps {
  breakdown: OvertimeBreakdown
  currencyConfig: CurrencyConfig
}

export function OvertimeBreakdown({ breakdown, currencyConfig }: OvertimeBreakdownProps) {
  const { regular, overtime, overtimePercentage } = breakdown

  const pieData = [
    {
      name: 'Regular',
      value: regular.cost,
      color: 'hsl(var(--primary))',
    },
    {
      name: 'Overtime',
      value: overtime.cost,
      color: 'hsl(var(--destructive))',
    },
  ].filter(item => item.value > 0)

  if (regular.cost === 0 && overtime.cost === 0) {
    return null
  }

  return (
    <motion.div variants={scaleIn} transition={transitionNormal}>
      <Card className="border-border/50 bg-card/50">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Overtime Breakdown</h3>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Pie Chart */}
            {pieData.length > 0 && (
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width={128} height={128} minWidth={0}>
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
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
                          const data = payload[0].payload as typeof pieData[0]
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
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">Regular</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(regular.cost, currencyConfig)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatHours(regular.hours)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span className="text-sm text-muted-foreground">Overtime</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(overtime.cost, currencyConfig)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatHours(overtime.hours)}
                      </p>
                    </div>
                  </div>

                  {(overtimePercentage ?? 0) > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Overtime represents {(overtimePercentage ?? 0).toFixed(1)}% of total cost
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
