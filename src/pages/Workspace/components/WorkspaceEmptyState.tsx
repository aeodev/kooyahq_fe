import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type WorkspaceEmptyStateProps = {
  onSelectKanban?: () => void
  onSelectSprint?: () => void
}

export function WorkspaceEmptyState({
  onSelectKanban,
  onSelectSprint,
}: WorkspaceEmptyStateProps) {
  return (
    <Card className="border-dashed bg-card/40">
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Create your first board</h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            Choose the view that fits the way your team works. You can add color labels, columns,
            and integrations later—it all starts with one board.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <h3 className="text-sm font-semibold text-foreground">Kanban board</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag cards across columns, add color labels, and keep priorities visible at a glance.
            </p>
            <Button size="sm" className="mt-4" onClick={onSelectKanban}>
              Use Kanban
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <h3 className="text-sm font-semibold text-foreground">Sprint board</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan sprint backlog, set point estimates, and track commitments through to review.
            </p>
            <Button size="sm" className="mt-4" onClick={onSelectSprint}>
              Use Sprint
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
