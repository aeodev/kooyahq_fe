import { X, Trash2 } from 'lucide-react'

interface AIHeaderProps {
  hasMessages: boolean
  onClear: () => void
  onClose: () => void
}

export function AIHeader({ hasMessages, onClear, onClose }: AIHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
      <div>
        <h2 className="text-sm font-semibold text-foreground" id="ai-assistant-title">
          Kooya AI
        </h2>
      </div>
      <div className="flex items-center gap-1">
        {hasMessages && (
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close AI assistant"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

