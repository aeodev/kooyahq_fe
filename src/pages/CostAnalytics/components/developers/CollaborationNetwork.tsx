import { useState } from 'react'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import { CollaborationNetworkGraph } from './team/CollaborationNetworkGraph'

interface CollaborationNetworkProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
}

export function CollaborationNetwork({
  topPerformers,
  summaryData,
}: CollaborationNetworkProps) {
  if (!summaryData) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground text-center">
            Loading collaboration network...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (topPerformers.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground text-center">
            No developer data available for collaboration network
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Collaboration data requires multiple developers working on shared projects
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <CollaborationNetworkGraph topPerformers={topPerformers} summaryData={summaryData} />
  )
}
