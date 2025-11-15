import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useKanbanMetrics } from '@/hooks/useKanbanMetrics'
import type { Board, Card as CardType } from '@/types/board'

type KanbanMetricsPanelProps = {
  board: Board
  cards: CardType[]
}

export function KanbanMetricsPanel({ board, cards }: KanbanMetricsPanelProps) {
  const metrics = useKanbanMetrics(board, cards)

  if (board.type !== 'kanban') return null

  return (
    <Card className="p-4 bg-muted/30">
      <CardContent className="p-0">
        <h3 className="text-sm font-semibold mb-4">Flow Metrics</h3>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Average Lead Time</div>
            <div className="text-lg font-bold">{metrics.leadTime.toFixed(1)} days</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Throughput</div>
            <div className="text-lg font-bold">{metrics.throughput.toFixed(1)} cards/week</div>
          </div>
          {Object.keys(metrics.cycleTime).length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Cycle Time by Column</div>
              <div className="space-y-1">
                {Object.entries(metrics.cycleTime).map(([column, days]) => (
                  <div key={column} className="flex justify-between text-sm">
                    <span>{column}</span>
                    <span className="font-medium">{days.toFixed(1)} days</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {metrics.bottlenecks.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Potential Bottlenecks</div>
              <div className="flex gap-1 flex-wrap">
                {metrics.bottlenecks.map((col) => (
                  <Badge key={col} variant="outline" className="text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

