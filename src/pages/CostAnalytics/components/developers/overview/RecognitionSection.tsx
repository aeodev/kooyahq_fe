import { useMemo, useState } from 'react'
import { Trophy, Medal, Award, Crown, Sparkles, Users, Zap, Target, Rocket } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { TopPerformer, CurrencyConfig, CostSummaryData } from '@/types/cost-analytics'
import { CollapsibleSection } from '../shared/CollapsibleSection'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface RecognitionSectionProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
  currencyConfig: CurrencyConfig
  onDeveloperClick?: (developerId: string) => void
}

type LeaderboardCategory = 'contributions' | 'projects' | 'collaboration'

type Achievement = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  developers: TopPerformer[]
}

export function RecognitionSection({
  topPerformers,
  summaryData,
  currencyConfig,
  onDeveloperClick,
}: RecognitionSectionProps) {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('contributions')

  const leaderboardData = useMemo(() => {
    if (!summaryData) return []

    switch (activeCategory) {
      case 'contributions':
        return [...topPerformers]
          .sort((a, b) => b.totalHours - a.totalHours)
          .slice(0, 10)
          .map((dev, index) => {
            // Find the original developer to ensure we have all properties including profilePic
            const originalDev = topPerformers.find((p) => p.userId === dev.userId) || dev
            return { 
              ...originalDev, 
              rank: index + 1,
            }
          })

      case 'projects':
        return [...topPerformers]
          .sort((a, b) => b.projectCount - a.projectCount)
          .slice(0, 10)
          .map((dev, index) => {
            // Find the original developer to ensure we have all properties including profilePic
            const originalDev = topPerformers.find((p) => p.userId === dev.userId) || dev
            return { 
              ...originalDev, 
              rank: index + 1,
            }
          })

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
            return { 
              ...performer, 
              collaborationScore,
            }
          })
          .sort((a, b) => b.collaborationScore - a.collaborationScore)
          .slice(0, 10)
          .map((dev, index) => {
            // Find the original developer to ensure we have all properties including profilePic
            const originalDev = topPerformers.find((p) => p.userId === dev.userId) || dev
            return { 
              ...originalDev, 
              rank: index + 1,
              collaborationScore: (dev as any).collaborationScore,
            }
          })

      default:
        return []
    }
  }, [topPerformers, summaryData, activeCategory])

  const achievements = useMemo(() => {
    if (!summaryData || topPerformers.length === 0) return []

    const achievementsList: Achievement[] = []

    // Most Hours Champion
    const mostHours = topPerformers.reduce((max, current) =>
      current.totalHours > max.totalHours ? current : max
    )
    if (mostHours.totalHours > 0) {
      achievementsList.push({
        id: 'hours-champion',
        title: 'Hours Champion',
        description: 'Most hours contributed',
        icon: <Zap className="h-5 w-5" />,
        color: 'text-yellow-500',
        developers: [mostHours],
      })
    }

    // Project Master
    const mostProjects = topPerformers.reduce((max, current) =>
      current.projectCount > max.projectCount ? current : max
    )
    if (mostProjects.projectCount > 0) {
      achievementsList.push({
        id: 'project-master',
        title: 'Project Master',
        description: 'Works on the most projects',
        icon: <Target className="h-5 w-5" />,
        color: 'text-blue-500',
        developers: [mostProjects],
      })
    }

    // Collaboration Star
    const collaborationStars = topPerformers
      .map((performer) => {
        let collaborationScore = 0
        performer.projects.forEach((projectName) => {
          const project = summaryData.projectCosts.find((p) => p.project === projectName)
          if (project && project.developers.length > 1) {
            collaborationScore += project.developers.length - 1
          }
        })
        return { performer, score: collaborationScore }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)

    if (collaborationStars.length > 0) {
      achievementsList.push({
        id: 'collaboration-star',
        title: 'Collaboration Star',
        description: 'Best at working with the team',
        icon: <Users className="h-5 w-5" />,
        color: 'text-purple-500',
        developers: [collaborationStars[0].performer],
      })
    }

    // Versatile Developer
    const versatileDevelopers = topPerformers
      .filter((p) => p.projectCount >= 3)
      .sort((a, b) => b.projectCount - a.projectCount)
      .slice(0, 1)

    if (versatileDevelopers.length > 0) {
      achievementsList.push({
        id: 'versatile',
        title: 'Versatile Developer',
        description: 'Most diverse project experience',
        icon: <Rocket className="h-5 w-5" />,
        color: 'text-green-500',
        developers: versatileDevelopers,
      })
    }

    // Most Diverse Contributor
    const mostDiverse = topPerformers.reduce((max, current) =>
      current.projectCount > max.projectCount ? current : max
    )
    if (mostDiverse.projectCount > 1) {
      achievementsList.push({
        id: 'diverse',
        title: 'Most Diverse Contributor',
        description: `Works across ${mostDiverse.projectCount} different projects`,
        icon: <Sparkles className="h-5 w-5" />,
        color: 'text-pink-500',
        developers: [mostDiverse],
      })
    }

    return achievementsList.slice(0, 6)
  }, [topPerformers, summaryData])

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

  if (!summaryData || topPerformers.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Leaderboard */}
      <CollapsibleSection
        title="Leaderboard"
        description="Top performers in different categories"
        defaultExpanded={true}
        storageKey="developer-leaderboard"
      >
        <Card className="border-border/50 bg-card/50">
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

                      {dev?.profilePic ? (
                        <img
                          src={dev.profilePic}
                          alt={dev.userName || 'Developer'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {(dev?.userName || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{dev.userName}</p>
                          {dev.rank <= 3 && (
                            <Badge variant="outline" className="text-xs">
                              #{dev.rank}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{dev.position || 'Developer'}</p>
                      </div>

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
                            <p className="text-sm font-semibold text-primary">{dev.projectCount}</p>
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
      </CollapsibleSection>

      {/* Achievements */}
      <CollapsibleSection
        title="Achievements"
        description="Team members who excel in different areas"
        defaultExpanded={false}
        storageKey="developer-achievements"
      >
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {achievements.map((achievement, i) => (
                <motion.div
                  key={achievement.id}
                  variants={staggerItem}
                  transition={{ delay: i * 0.1, ...transitionNormal }}
                  className="p-4 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`${achievement.color} mt-0.5`}>{achievement.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {achievement.developers.map((dev) => (
                          <Badge
                            key={dev.userId}
                            variant="outline"
                            className={`text-xs cursor-pointer hover:bg-primary/10 ${
                              onDeveloperClick ? '' : ''
                            }`}
                            onClick={() => onDeveloperClick?.(dev.userId)}
                          >
                            {dev.userName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </CollapsibleSection>
    </div>
  )
}
