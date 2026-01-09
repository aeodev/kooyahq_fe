import { useMemo } from 'react'
import { X, Calendar, Briefcase, TrendingUp, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { isValidImageUrl, getUserInitials } from '@/utils/formatters'
import type { TopPerformer, CurrencyConfig, CostSummaryData } from '@/types/cost-analytics'
import { exportDeveloperReport } from '@/utils/developer-export.utils'
import { staggerContainer, staggerItem } from '@/utils/animations'

interface DeveloperProfileProps {
  developer: TopPerformer | null
  summaryData: CostSummaryData | null
  currencyConfig: CurrencyConfig
  isOpen: boolean
  onClose: () => void
}

export function DeveloperProfile({
  developer,
  summaryData,
  currencyConfig,
  isOpen,
  onClose,
}: DeveloperProfileProps) {
  const projectBreakdown = useMemo(() => {
    if (!developer || !summaryData) return []
    
    return summaryData.projectCosts
      .filter((project) => developer.projects.includes(project.project))
      .map((project) => {
        const devData = project.developers.find((d) => d.userId === developer.userId)
        return {
          project: project.project,
          hours: devData?.hours || 0,
          cost: devData?.cost || 0,
          hourlyRate: devData?.hourlyRate || 0,
        }
      })
      .sort((a, b) => b.cost - a.cost)
  }, [developer, summaryData])

  if (!developer) return null

  return (
    <Drawer open={isOpen} onClose={onClose} side="right" className="w-full sm:max-w-2xl">
      <motion.div 
        className="p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div 
          className="flex items-center gap-4 mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {developer.profilePic && isValidImageUrl(developer.profilePic) ? (
            <motion.img
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              src={developer.profilePic}
              alt={developer.userName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const fallback = document.createElement('div')
                  fallback.className = 'w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center'
                  fallback.innerHTML = `<span class="text-2xl font-semibold text-primary">${getUserInitials(developer.userName)}</span>`
                  parent.replaceChild(fallback, target)
                }
              }}
            />
          ) : (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20"
            >
              <span className="text-2xl font-semibold text-primary">
                {getUserInitials(developer.userName)}
              </span>
            </motion.div>
          )}
          <div className="flex-1">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-semibold"
            >
              {developer.userName}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-muted-foreground"
            >
              {developer.position || 'Developer'} · {developer.projectCount} project
              {developer.projectCount !== 1 ? 's' : ''}
            </motion.p>
          </div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-6 space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          exit="initial"
        >
          {/* Key Stats */}
          <motion.div variants={staggerItem}>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  My Contributions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(developer.totalCost, currencyConfig)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatHours(developer.totalHours)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Projects</p>
                    <p className="text-lg font-semibold text-foreground">
                      {developer.projectCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Avg Rate</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(developer.hourlyRate, currencyConfig)}/hr
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projects Breakdown */}
          <motion.div variants={staggerItem}>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Projects
                </h3>
                {projectBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    {projectBreakdown.map((project) => (
                      <div
                        key={project.project}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{project.project}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatHours(project.hours)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(project.cost, currencyConfig)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(project.hourlyRate, currencyConfig)}/hr
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No project data available</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Skills & Expertise */}
          <motion.div variants={staggerItem}>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Project Diversity
                </h3>
                <div className="flex flex-wrap gap-2">
                  {developer.projects.map((project) => (
                    <Badge key={project} variant="secondary" className="px-3 py-1">
                      {project}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Working across {developer.projectCount} different project
                  {developer.projectCount !== 1 ? 's' : ''} shows diverse experience and
                  adaptability.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Export Button */}
          <motion.div variants={staggerItem}>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (summaryData) {
                  exportDeveloperReport(developer, summaryData, currencyConfig)
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export My Report
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </Drawer>
  )
}
