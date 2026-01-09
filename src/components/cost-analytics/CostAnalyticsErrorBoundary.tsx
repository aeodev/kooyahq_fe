import { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface CostAnalyticsErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface CostAnalyticsErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class CostAnalyticsErrorBoundary extends Component<
  CostAnalyticsErrorBoundaryProps,
  CostAnalyticsErrorBoundaryState
> {
  constructor(props: CostAnalyticsErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): CostAnalyticsErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Cost Analytics] Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="border-destructive/50 bg-destructive/5 max-w-md w-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">Cost Analytics Error</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Something went wrong while loading cost analytics. Please try again.
              </p>
              {this.state.error && (
                <details className="mb-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer mb-2">
                    Error Details
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset} size="sm">
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
