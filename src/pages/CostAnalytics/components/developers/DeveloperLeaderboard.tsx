import { useMemo, useState } from 'react'
import { Trophy, Medal, Award, Crown } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { isValidImageUrl, getUserInitials } from '@/utils/formatters'
import type { TopPerformer, CurrencyConfig, CostSummaryData } from '@/types/cost-analytics'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface DeveloperLeaderboardProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  currencyConfig: CurrencyConfig
  onDeveloperClick?: (developerId: string) => void
}

type LeaderboardCategory = 'contributions' | 'projects' | 'collaboration'

export function DeveloperLeaderboard({
  topPerformers,
  summaryData,
  currencyConfig,
  onDeveloperClick,
}: DeveloperLeaderboardProps) {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('contributions')
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const leaderboardData = useMemo(() => {
    if (!summaryData) return []

    switch (activeCategory) {
      case 'contributions':
        return [...topPerformers]
          .sort((a, b) => b.totalHours - a.totalHours)
          .slice(0, 10)
          .map((dev, index) => ({ ...dev, rank: index + 1 }))

      case 'projects':
        return [...topPerformers]
          .sort((a, b) => b.projectCount - a.projectCount)
          .slice(0, 10)
          .map((dev, index) => ({ ...dev, rank: index + 1 }))

      case 'collaboration':
        return topPerformers
          .map((performer) => {
            let collaborationScore = 0
            performer.projects.forEach((projectName) => {
              const project = summaryData.projectCosts.find((p) => p.project === projectName)
              if (project && project.developers.length > 1) {
                collaborationScore += project.developers.length - 1
              }
            })
            return { ...performer, collaborationScore }
          })
          .sort((a, b) => b.collaborationScore - a.collaborationScore)
          .slice(0, 10)
          .map((dev, index) => ({ ...dev, rank: index + 1 }))

      default:
        return []
    }
  }, [topPerformers, summaryData, activeCategory])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
    return <Trophy className="h-4 w-4 text-muted-foreground" />
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
    if (rank === 2) return 'bg-gray-400/20 text-gray-600 border-gray-400/30'
    if (rank === 3) return 'bg-amber-500/20 text-amber-600 border-amber-500/30'
    return 'bg-muted text-muted-foreground border-border'
  }

  const getCategoryLabel = (category: LeaderboardCategory) => {
    switch (category) {
      case 'contributions':
        return 'Most Hours'
      case 'projects':
        return 'Most Projects'
      case 'collaboration':
        return 'Best Collaborator'
    }
  }

  if (!summaryData || topPerformers.length === 0) return null

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Leaderboard</h3>
          <Badge variant="secondary" className="text-xs">Friendly Competition</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          See who's leading in different categories - all in good fun!
        </p>
      </div>
      <CardContent className="p-4">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as LeaderboardCategory)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="contributions">Most Hours</TabsTrigger>
            <TabsTrigger value="projects">Most Projects</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          </TabsList>

          <TabsContent value={activeCategory} className="mt-0">
            <motion.div
              className="space-y-2"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {leaderboardData.map((dev, i) => (
                <motion.div
                  key={dev.userId}
                  variants={staggerItem}
                  transition={{ delay: i * 0.05, ...transitionNormal }}
                  className={`flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors ${
                    onDeveloperClick ? 'cursor-pointer' : ''
                  } ${dev.rank <= 3 ? 'ring-2 ring-primary/20' : ''}`}
                  onClick={() => onDeveloperClick?.(dev.userId)}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-10 h-10">
                    {dev.rank <= 3 ? (
                      getRankIcon(dev.rank)
                    ) : (
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border ${getRankBadgeColor(dev.rank)}`}
                      >
                        {dev.rank}
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  {dev?.profilePic && isValidImageUrl(dev.profilePic) && !failedImages.has(dev.userId) ? (
                    <img
                      src={dev.profilePic}
                      alt={dev.userName || 'Developer'}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={() => {
                        setFailedImages((prev) => new Set(prev).add(dev.userId))
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {getUserInitials(dev?.userName || '?')}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{dev.userName}</p>
                      {dev.rank <= 3 && (
                        <Badge variant="outline" className="text-xs">
                          #{dev.rank}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dev.position || 'Developer'}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    {activeCategory === 'contributions' && (
                      <>
                        <p className="text-sm font-semibold text-primary">
                          {formatHours(dev.totalHours)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(dev.totalCost, currencyConfig)}
                        </p>
                      </>
                    )}
                    {activeCategory === 'projects' && (
                      <>
                        <p className="text-sm font-semibold text-primary">
                          {dev.projectCount}
                        </p>
                        <p className="text-xs text-muted-foreground">projects</p>
                      </>
                    )}
                    {activeCategory === 'collaboration' && (
                      <>
                        <p className="text-sm font-semibold text-primary">
                          {(dev as any).collaborationScore || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">connections</p>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
