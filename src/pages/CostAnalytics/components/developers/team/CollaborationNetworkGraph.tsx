import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { Network } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ForceGraph2D from 'react-force-graph-2d'
import type { TopPerformer, CostSummaryData } from '@/types/cost-analytics'
import { calculateDeveloperConnections } from '@/utils/developer-collaboration.utils'
import { getUserInitials, isValidImageUrl } from '@/utils/formatters'

interface CollaborationNetworkGraphProps {
  topPerformers: TopPerformer[]
  summaryData: CostSummaryData | null
}

type GraphNode = {
  id: string
  name: string
  userId: string
  profilePic?: string
  connectionCount: number
  size: number
  x?: number
  y?: number
}

type GraphLink = {
  source: string | GraphNode
  target: string | GraphNode
  value: number
  strength: number
}

const getNodeId = (node: string | GraphNode) => (typeof node === 'string' ? node : node.id)

export function CollaborationNetworkGraph({
  topPerformers,
  summaryData,
}: CollaborationNetworkGraphProps) {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph')
  const [isLayoutReady, setIsLayoutReady] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 900 })
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(rect.width, 1000),
          height: Math.max(900, rect.height || 900),
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const connections = useMemo(() => {
    if (!summaryData) return []
    return calculateDeveloperConnections(topPerformers)
  }, [topPerformers, summaryData])

  // Transform data for react-force-graph-2d
  const { nodes, links } = useMemo(() => {
    if (!summaryData || topPerformers.length === 0) return { nodes: [], links: [] }

    const nodeMap = new Map<string, GraphNode>()
    const linkList: GraphLink[] = []

    // Create nodes
    topPerformers.forEach((performer) => {
      const connectionCount = connections.filter(
        (c) => c.developer1 === performer.userId || c.developer2 === performer.userId
      ).length

      nodeMap.set(performer.userId, {
        id: performer.userId,
        name: performer.userName,
        userId: performer.userId,
        profilePic: performer.profilePic,
        connectionCount,
        size: Math.max(connectionCount * 2 + 20, 24),
      })
    })

    // Create links
    connections.forEach((connection) => {
      linkList.push({
        source: connection.developer1,
        target: connection.developer2,
        value: connection.connectionStrength,
        strength: connection.connectionStrength,
      })
    })

    return {
      nodes: Array.from(nodeMap.values()),
      links: linkList,
    }
  }, [topPerformers, connections, summaryData])

  // Preload profile images
  useEffect(() => {
    nodes.forEach((node) => {
      if (node.profilePic && isValidImageUrl(node.profilePic) && !imageCache.current.has(node.profilePic)) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          imageCache.current.set(node.profilePic!, img)
        }
        img.src = node.profilePic
      }
    })
  }, [nodes])

  // Filter links based on selected node
  const filteredLinks = useMemo(() => {
    if (!selectedNode) return links
    return links.filter((link) => {
      const sourceId = getNodeId(link.source)
      const targetId = getNodeId(link.target)
      return sourceId === selectedNode || targetId === selectedNode
    })
  }, [links, selectedNode])

  useEffect(() => {
    if (!graphRef.current) return

    const linkForce = graphRef.current.d3Force?.('link')
    if (linkForce?.distance) {
      linkForce.distance((link: GraphLink) => {
        const sourceId = getNodeId(link.source)
        const targetId = getNodeId(link.target)
        const sourceNode = nodes.find((n) => n.id === sourceId)
        const targetNode = nodes.find((n) => n.id === targetId)
        const baseDistance = 400
        const sizeFactor = (sourceNode?.size || 40) + (targetNode?.size || 40)
        return baseDistance + sizeFactor
      })
    }

    const chargeForce = graphRef.current.d3Force?.('charge')
    if (chargeForce?.strength) {
      chargeForce.strength(-1200)
    }
  }, [nodes, filteredLinks])

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(selectedNode === node.id ? null : node.id)
  }, [selectedNode])

  // Helper to draw initials
  const drawInitials = (ctx: CanvasRenderingContext2D, name: string, x: number, y: number, radius: number) => {
    const initials = getUserInitials(name)
    ctx.fillStyle = 'rgb(59, 130, 246)'
    ctx.font = `${Math.max(radius * 0.6, 10)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials, x, y)
  }

  // Custom node rendering with profile pics/initials
  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D) => {
    const isSelected = selectedNode === node.id
    const isConnected = selectedNode && filteredLinks.some((link) => {
      const sourceId = getNodeId(link.source)
      const targetId = getNodeId(link.target)
      return (sourceId === node.id || targetId === node.id) && sourceId !== targetId
    })

    const radius = node.size
    const x = node.x || 0
    const y = node.y || 0

    // Node circle background
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false)
    
    if (isSelected) {
      ctx.fillStyle = 'rgb(59, 130, 246)'
      ctx.strokeStyle = 'rgb(59, 130, 246)'
      ctx.lineWidth = 3
    } else if (isConnected) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'
      ctx.strokeStyle = 'rgb(59, 130, 246)'
      ctx.lineWidth = 2
    } else {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.2)'
      ctx.strokeStyle = 'rgb(100, 100, 100)'
      ctx.lineWidth = 1
    }
    
    ctx.fill()
    ctx.stroke()

    // Profile picture or initials
    if (node.profilePic && isValidImageUrl(node.profilePic)) {
      const cachedImg = imageCache.current.get(node.profilePic)
      if (cachedImg && cachedImg.complete) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, radius - 2, 0, 2 * Math.PI)
        ctx.clip()
        ctx.drawImage(cachedImg, x - radius + 2, y - radius + 2, (radius - 2) * 2, (radius - 2) * 2)
        ctx.restore()
      } else {
        // Fallback to initials if image not loaded
        drawInitials(ctx, node.name, x, y, radius)
      }
    } else {
      drawInitials(ctx, node.name, x, y, radius)
    }
  }, [selectedNode, filteredLinks])

  // Handle layout completion
  const handleEngineStop = useCallback(() => {
    setIsLayoutReady(true)
  }, [])

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
            <div ref={containerRef} className="border border-border/50 rounded-lg bg-background overflow-hidden min-h-[900px]">
              <ForceGraph2D
                ref={graphRef}
                graphData={{ nodes, links: filteredLinks }}
                nodeLabel={(node: GraphNode) => {
                  const connectionInfo = connections
                    .filter(c => c.developer1 === node.userId || c.developer2 === node.userId)
                    .map(c => {
                      const otherId = c.developer1 === node.userId ? c.developer2 : c.developer1
                      const other = topPerformers.find(p => p.userId === otherId)
                      return `${other?.userName || 'Unknown'} (${c.connectionStrength} project${c.connectionStrength !== 1 ? 's' : ''})`
                    })
                    .join('\n')
                  
                  return `${node.name}\n\nConnections:\n${connectionInfo || 'No connections'}`
                }}
                nodeRelSize={6}
                nodeVal={(node: GraphNode) => node.size}
                nodeCanvasObjectMode={() => 'replace'}
                nodeCanvasObject={paintNode}
                linkWidth={(link: GraphLink) => link.strength * 2 + 1}
                linkColor={(link: GraphLink) => {
                  const sourceId = getNodeId(link.source)
                  const targetId = getNodeId(link.target)
                  if (selectedNode && (sourceId === selectedNode || targetId === selectedNode)) {
                    return 'rgb(59, 130, 246)'
                  }
                  return 'rgba(100, 100, 100, 0.3)'
                }}
                linkLabel={(link: GraphLink) => {
                  const sourceId = getNodeId(link.source)
                  const targetId = getNodeId(link.target)
                  const connection = connections.find(
                    c => (c.developer1 === sourceId && c.developer2 === targetId) ||
                         (c.developer1 === targetId && c.developer2 === sourceId)
                  )
                  return connection 
                    ? `${link.strength} shared project${link.strength !== 1 ? 's' : ''}`
                    : ''
                }}
                linkCurvature={0.2}
                linkDirectionalArrowLength={0}
                onNodeClick={handleNodeClick}
                enableNodeDrag={false}
                cooldownTicks={150}
                onEngineStop={handleEngineStop}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor="transparent"
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.4}
                warmupTicks={30}
              />
              {/* Separate SVG layer for labels with proper collision detection */}
              {isLayoutReady && (() => {
                // Sort nodes by Y position (top to bottom) for proper collision detection
                const sortedNodes = [...nodes]
                  .filter(n => n.x && n.y)
                  .sort((a, b) => (a.y || 0) - (b.y || 0))
                
                // Track label positions to avoid overlaps
                const labelPositions: Array<{ x: number; y: number; width: number }> = []
                const labelWidth = 140
                const labelHeight = 40
                const minSpacing = 55
                
                return (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    width={dimensions.width}
                    height={dimensions.height}
                    style={{ overflow: 'visible' }}
                  >
                    {sortedNodes.map((node) => {
                      const radius = node.size
                      const baseX = node.x!
                      const baseY = node.y! + radius + 60
                      
                      // Find conflicts with existing labels
                      let labelY = baseY
                      const conflicts = labelPositions.filter(pos => {
                        const horizontalOverlap = Math.abs(pos.x - baseX) < labelWidth / 2 + 10
                        const verticalOverlap = Math.abs(pos.y - baseY) < minSpacing
                        return horizontalOverlap && verticalOverlap
                      })
                      
                      if (conflicts.length > 0) {
                        // Position below the lowest conflicting label
                        const lowestConflict = conflicts.reduce((lowest, pos) => 
                          pos.y > lowest.y ? pos : lowest, conflicts[0]
                        )
                        labelY = lowestConflict.y + minSpacing
                      }
                      
                      // Store this label position
                      labelPositions.push({
                        x: baseX,
                        y: labelY,
                        width: labelWidth
                      })
                      
                      return (
                        <g key={node.id}>
                          {/* Background rectangle for label */}
                          <rect
                            x={baseX - labelWidth / 2}
                            y={labelY - 3}
                            width={labelWidth}
                            height={labelHeight}
                            fill="rgba(255, 255, 255, 0.95)"
                            stroke="rgba(200, 200, 200, 0.3)"
                            strokeWidth="1"
                            rx="4"
                          />
                          {/* Name */}
                          <text
                            x={baseX}
                            y={labelY + 14}
                            textAnchor="middle"
                            fontSize="13"
                            fontWeight="bold"
                            fill="rgb(50, 50, 50)"
                          >
                            {node.name}
                          </text>
                          {/* Connection count */}
                          <text
                            x={baseX}
                            y={labelY + 30}
                            textAnchor="middle"
                            fontSize="11"
                            fill="rgb(100, 100, 100)"
                          >
                            {node.connectionCount} connection{node.connectionCount !== 1 ? 's' : ''}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                )
              })()}
            </div>

            {selectedNode && (() => {
              const selectedPerformer = topPerformers.find((p) => p.userId === selectedNode)
              const selectedConnections = connections.filter(
                (c) => c.developer1 === selectedNode || c.developer2 === selectedNode
              )
              
              return (
                <div className="mt-4 p-4 rounded-lg border border-primary/30 bg-primary/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="secondary" className="mb-2">
                        Selected: {selectedPerformer?.userName}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {selectedPerformer?.position || 'Developer'} · {selectedConnections.length} collaboration{selectedConnections.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
                      Clear
                    </Button>
                  </div>
                  {selectedConnections.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Connected developers:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedConnections.map((conn) => {
                          const otherId = conn.developer1 === selectedNode ? conn.developer2 : conn.developer1
                          const otherDev = topPerformers.find((p) => p.userId === otherId)
                          return (
                            <Badge key={otherId} variant="outline" className="text-xs">
                              {otherDev?.userName || 'Unknown'} ({conn.connectionStrength} project{conn.connectionStrength !== 1 ? 's' : ''})
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <p>💡 <strong>Tip:</strong> Click nodes to highlight connections and see collaboration details.</p>
              <p>• Line thickness indicates collaboration strength (number of shared projects)</p>
              <p>• Node size reflects total number of connections</p>
              <p>• Hover over nodes or links for more information</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((connection) => {
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
