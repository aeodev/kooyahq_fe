import { Badge } from '@/components/ui/badge'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { TopPerformer, CurrencyConfig } from '@/types/cost-analytics'
import { cn } from '@/utils/cn'

interface DeveloperCardProps {
  developer: TopPerformer
  currencyConfig: CurrencyConfig
  showProjects?: boolean
  showStats?: boolean
  onClick?: () => void
  className?: string
}

export function DeveloperCard({
  developer,
  currencyConfig,
  showProjects = true,
  showStats = true,
  onClick,
  className,
}: DeveloperCardProps) {
  if (!developer) return null

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors',
        onClick ? 'cursor-pointer' : '',
        className
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      {developer.profilePic ? (
        <img
          src={developer.profilePic}
          alt={developer.userName}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary">
            {developer.userName?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
      )}

      {/* Developer Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-foreground truncate">{developer.userName || 'Unknown'}</p>
          {developer.position && (
            <Badge variant="outline" className="text-xs">
              {developer.position}
            </Badge>
          )}
        </div>

        {/* Projects List */}
        {showProjects && developer.projects && developer.projects.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {developer.projects.slice(0, 5).map((project) => (
              <Badge key={project} variant="secondary" className="text-xs px-2 py-0.5">
                {project}
              </Badge>
            ))}
            {developer.projects.length > 5 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                +{developer.projects.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{developer.projectCount || 0} project{(developer.projectCount || 0) !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{formatHours(developer.totalHours || 0)}</span>
          </div>
        )}
      </div>

      {/* Cost */}
      {showStats && (
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(developer.totalCost || 0, currencyConfig)}
          </p>
          {showStats && developer.hourlyRate !== undefined && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(developer.hourlyRate, currencyConfig)}/hr
            </p>
          )}
        </div>
      )}
    </div>
  )
}
