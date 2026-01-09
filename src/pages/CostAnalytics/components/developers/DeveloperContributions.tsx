import { useState, useMemo } from 'react'
import { Users, ArrowUpDown, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  transformToContributions,
  sortContributions,
  type SortOption,
} from '@/utils/developer-contributions.utils'
import type { TopPerformer, CurrencyConfig, CostSummaryData } from '@/types/cost-analytics'
import { DeveloperCard } from './shared/DeveloperCard'
import { ContributionsSkeleton } from '../Skeletons'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface DeveloperContributionsProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  isLoading?: boolean
  currencyConfig: CurrencyConfig
  onDeveloperClick?: (developerId: string) => void
}

export function DeveloperContributions({
  topPerformers,
  summaryData,
  isLoading,
  currencyConfig,
  onDeveloperClick,
}: DeveloperContributionsProps) {
  const [sortBy, setSortBy] = useState<SortOption>('contributions')

  const contributions = useMemo(() => {
    if (!summaryData || topPerformers.length === 0) return []
    const transformed = transformToContributions(topPerformers, summaryData.projectCosts)
    return sortContributions(transformed, sortBy)
  }, [topPerformers, summaryData, sortBy])

  if (isLoading) {
    return <ContributionsSkeleton />
  }

  if (!topPerformers || topPerformers.length === 0) return null

  const sortLabels: Record<SortOption, string> = {
    name: 'Name',
    projects: 'Projects',
    contributions: 'Contributions',
    collaboration: 'Collaboration',
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Team Contributions</h3>
            <Badge variant="secondary">{contributions.length} developers</Badge>
            {contributions.length > 0 && (
              <Badge variant="outline" className="text-xs ml-auto">
                Top: {contributions[0]?.userName}
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <ArrowUpDown className="h-3 w-3 mr-2" />
                Sort: {sortLabels[sortBy]}
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('name')}>Sort by Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('projects')}>
                Sort by Projects
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('contributions')}>
                Sort by Contributions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('collaboration')}>
                Sort by Collaboration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardContent className="p-4">
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {contributions.map((contribution, i) => {
            const developer = topPerformers.find((p) => p.userId === contribution.userId)
            if (!developer) {
              console.warn(`Developer not found for userId: ${contribution.userId}`)
              return null
            }

            return (
              <motion.div
                key={contribution.userId}
                variants={staggerItem}
                transition={{ delay: i * 0.03, ...transitionNormal }}
              >
                <DeveloperCard
                  developer={developer}
                  currencyConfig={currencyConfig}
                  showProjects={true}
                  showStats={true}
                  onClick={() => onDeveloperClick?.(contribution.userId)}
                />
              </motion.div>
            )
          })}
        </motion.div>
      </CardContent>
    </Card>
  )
}
