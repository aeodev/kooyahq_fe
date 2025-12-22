import { Button } from '@/components/ui/button'
import { Trash2, X, Loader2, CheckSquare2, Square, CheckCheck } from 'lucide-react'
import { cn } from '@/utils/cn'

type GalleryBatchActionsProps = {
  selectedCount: number
  totalCount: number
  selectMode: boolean
  onToggleSelectMode: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  onDeleteSelected: () => void
  isDeleting?: boolean
}

export function GalleryBatchActions({
  selectedCount,
  totalCount,
  selectMode,
  onToggleSelectMode,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  isDeleting = false,
}: GalleryBatchActionsProps) {
  if (!selectMode) {
    return (
      <Button 
        variant="outline" 
        size="icon"
        onClick={onToggleSelectMode}
        className="h-9 w-9 rounded-lg border-border/50 hover:bg-muted/80 transition-all"
        title="Select items"
      >
        <CheckSquare2 className="h-4 w-4" />
      </Button>
    )
  }

  const allSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm">
      {/* Selection count badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/30">
        <span className="text-xs font-semibold text-muted-foreground">
          {selectedCount}
        </span>
        <span className="text-xs text-muted-foreground/70">/</span>
        <span className="text-xs text-muted-foreground/70">{totalCount}</span>
      </div>

      <div className="h-4 w-px bg-border/50" />

      {/* Select All */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSelectAll}
        className={cn(
          "h-8 w-8 rounded-lg transition-all",
          allSelected 
            ? "bg-primary/10 text-primary hover:bg-primary/20" 
            : "hover:bg-muted"
        )}
        title="Select all"
      >
        <CheckCheck className="h-4 w-4" />
      </Button>

      {/* Clear Selection */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        disabled={selectedCount === 0}
        className="h-8 w-8 rounded-lg hover:bg-muted transition-all disabled:opacity-40"
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Delete Selected */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDeleteSelected}
        disabled={selectedCount === 0 || isDeleting}
        className={cn(
          "h-8 w-8 rounded-lg transition-all",
          selectedCount > 0
            ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
            : "opacity-40"
        )}
        title="Delete selected"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>

      <div className="h-4 w-px bg-border/50" />

      {/* Cancel Select Mode */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSelectMode}
        className="h-8 w-8 rounded-lg hover:bg-muted transition-all"
        title="Cancel selection"
      >
        <Square className="h-4 w-4" />
      </Button>
    </div>
  )
}

