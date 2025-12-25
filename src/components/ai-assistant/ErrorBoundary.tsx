import { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class AIAssistantErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AI Assistant] Error caught by boundary:', error, errorInfo)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">{AI_ASSISTANT_STRINGS.errorTitle}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {AI_ASSISTANT_STRINGS.errorMessage}
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-muted-foreground cursor-pointer mb-2">
                  {AI_ASSISTANT_STRINGS.errorDetails}
                </summary>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {AI_ASSISTANT_STRINGS.tryAgain}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                {AI_ASSISTANT_STRINGS.refreshPage}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

