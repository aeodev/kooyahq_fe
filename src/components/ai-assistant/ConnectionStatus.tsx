import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'

interface ConnectionStatusProps {
  isOffline: boolean
  onRetry?: () => void
}

export function ConnectionStatus({ isOffline, onRetry }: ConnectionStatusProps) {
  if (!isOffline) return null

  return (
    <div
      className="mx-4 mb-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs flex items-center justify-between"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Offline. Messages will be sent when connection is restored.</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 p-1 rounded hover:bg-yellow-500/20 transition-colors"
          aria-label="Retry connection"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

