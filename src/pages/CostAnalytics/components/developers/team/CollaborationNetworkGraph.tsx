import { useMemo, useState, useRef, useEffect } from 'react'
import { Network } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import {
  calculateDeveloperConnections,
  type DeveloperConnection,
} from '@/utils/developer-collaboration.utils'
import { motion } from 'framer-motion'

interface CollaborationNetworkGraphProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
}

type Node = {
  id: string
  label: string
  x: number
  y: number
  size: number
}

type Edge = {
  from: string
  to: string
  strength: number
}

export function CollaborationNetworkGraph({
  topPerformers,
  summaryData,
}: CollaborationNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph')

  const connections = useMemo(() => {
    if (!summaryData) return []
    return calculateDeveloperConnections(topPerformers, summaryData.projectCosts)
  }, [topPerformers, summaryData])

  // Calculate node positions using force-directed layout simulation
  const { nodes, edges } = useMemo(() => {
    if (!summaryData || topPerformers.length === 0) return { nodes: [], edges: [] }

    const nodeMap = new Map<string, Node>()
    const edgeList: Edge[] = []

    // Create nodes
    topPerformers.forEach((performer, index) => {
      const connectionCount = connections.filter(
        (c) => c.developer1 === performer.userId || c.developer2 === performer.userId
      ).length

      nodeMap.set(performer.userId, {
        id: performer.userId,
        label: performer.userName,
        x: 0,
        y: 0,
        size: Math.max(connectionCount * 2 + 20, 30),
      })
    })

    // Create edges
    connections.forEach((connection) => {
      edgeList.push({
        from: connection.developer1,
        to: connection.developer2,
        strength: connection.connectionStrength,
      })
    })

    // Simple circular layout
    const centerX = 250
    const centerY = 200
    const radius = 150
    const angleStep = (2 * Math.PI) / nodeMap.size

    let angle = 0
    nodeMap.forEach((node) => {
      node.x = centerX + radius * Math.cos(angle)
      node.y = centerY + radius * Math.sin(angle)
      angle += angleStep
    })

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    }
  }, [topPerformers, connections, summaryData])

  const filteredEdges = useMemo(() => {
    if (!selectedNode) return edges
    return edges.filter(
      (e) => e.from === selectedNode || e.to === selectedNode
    )
  }, [edges, selectedNode])

  if (!summaryData || topPerformers.length === 0) return null

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Collaboration Network</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'graph' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('graph')}
            >
              Graph
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        {viewMode === 'graph' ? (
          <div className="relative">
            <svg
              ref={svgRef}
              width="100%"
              height="400"
              viewBox="0 0 500 400"
              className="border border-border/50 rounded-lg bg-background"
            >
              {/* Edges */}
              {filteredEdges.map((edge, i) => {
                const fromNode = nodes.find((n) => n.id === edge.from)
                const toNode = nodes.find((n) => n.id === edge.to)
                if (!fromNode || !toNode) return null

                const isHighlighted =
                  selectedNode && (edge.from === selectedNode || edge.to === selectedNode)

                return (
                  <line
                    key={`${edge.from}-${edge.to}-${i}`}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={isHighlighted ? 'rgb(59, 130, 246)' : 'rgba(100, 100, 100, 0.3)'}
                    strokeWidth={edge.strength * 2 + 1}
                    className="transition-all"
                  />
                )
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const performer = topPerformers.find((p) => p.userId === node.id)
                const isSelected = selectedNode === node.id
                const isConnected =
                  selectedNode &&
                  filteredEdges.some(
                    (e) => (e.from === node.id || e.to === node.id) && e.from !== e.to
                  )

                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size / 2}
                      fill={isSelected ? 'rgb(59, 130, 246)' : isConnected ? 'rgb(59, 130, 246, 0.5)' : 'rgb(100, 100, 100, 0.2)'}
                      stroke={isSelected ? 'rgb(59, 130, 246)' : 'rgb(100, 100, 100)'}
                      strokeWidth={isSelected ? 3 : 1}
                      className="cursor-pointer transition-all hover:opacity-80"
                      onClick={() => setSelectedNode(isSelected ? null : node.id)}
                    />
                    <text
                      x={node.x}
                      y={node.y + node.size / 2 + 15}
                      textAnchor="middle"
                      fontSize="12"
                      fill="currentColor"
                      className="pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                )
              })}
            </svg>

            {selectedNode && (
              <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/10">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    Selected:{' '}
                    {topPerformers.find((p) => p.userId === selectedNode)?.userName}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              <p>Click nodes to highlight connections. Line thickness represents collaboration strength.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((connection, i) => {
              const dev1 = topPerformers.find((p) => p.userId === connection.developer1)
              const dev2 = topPerformers.find((p) => p.userId === connection.developer2)
              if (!dev1 || !dev2) return null

              return (
                <div
                  key={`${connection.developer1}-${connection.developer2}`}
                  className="p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Network className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {dev1.userName} ↔ {dev2.userName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {connection.connectionStrength} shared project
                          {connection.connectionStrength !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {connection.sharedProjects.slice(0, 3).map((project) => (
                        <Badge key={project} variant="secondary" className="text-xs">
                          {project}
                        </Badge>
                      ))}
                      {connection.sharedProjects.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{connection.sharedProjects.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
