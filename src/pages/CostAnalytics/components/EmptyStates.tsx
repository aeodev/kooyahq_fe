import { AlertCircle, Activity, BarChart3, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Failed to load data', message, onRetry }: ErrorStateProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{message}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="text-center py-8">
      <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

interface NoDataStateProps {
  title?: string
  message?: string
  suggestion?: string
  icon?: React.ReactNode
}

export function NoDataState({
  title = 'No data available',
  message = 'No cost data available for this period',
  suggestion = 'Try selecting a different date range or check back later',
  icon,
}: NoDataStateProps) {
  // Check if icon is a React element (already rendered JSX) or a component constructor
  const renderIcon = () => {
    if (icon) {
      // If icon is already a React element (JSX), render it directly
      if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) {
        return icon
      }
      // If icon is a component constructor (function), render it with className
      if (typeof icon === 'function') {
        const IconComponent = icon
        return <IconComponent className="h-12 w-12 text-muted-foreground/50" />
      }
      // Otherwise, render it as-is (string, number, etc.)
      return icon
    }
    // Default icon
    return <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
  }
  
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="py-12 text-center">
        <div className="flex justify-center mb-4">
          {renderIcon()}
        </div>
        {title && <p className="text-sm font-medium text-foreground mb-1">{title}</p>}
        <p className="text-sm text-muted-foreground">{message}</p>
        {suggestion && <p className="text-xs text-muted-foreground mt-2 opacity-75">{suggestion}</p>}
      </CardContent>
    </Card>
  )
}
