import { Card, CardContent } from '@/components/ui/card'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { LiveCostData, CostSummaryData, CurrencyConfig } from '@/types/cost-analytics'
import { Users, Clock, DollarSign, Briefcase } from 'lucide-react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface QuickStatsProps {
  liveData: LiveCostData | null
  summaryData: CostSummaryData | null
  currencyConfig: CurrencyConfig
  isLoading: boolean
}

export function QuickStats({
  liveData,
  summaryData,
  currencyConfig,
  isLoading,
}: QuickStatsProps) {
  const stats = [
    {
      label: 'Active Developers',
      value: liveData?.activeDevelopers.length || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Hours',
      value: summaryData ? formatHours(summaryData.totalHours) : '0h',
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Cost',
      value: summaryData ? formatCurrency(summaryData.totalCost, currencyConfig) : formatCurrency(0, currencyConfig),
      icon: DollarSign,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Total Projects',
      value: summaryData?.projectCosts.length || 0,
      icon: Briefcase,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {stats.map((stat, i) => (
        <motion.div key={stat.label} variants={staggerItem} transition={{ delay: i * 0.1, ...transitionNormal }}>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
