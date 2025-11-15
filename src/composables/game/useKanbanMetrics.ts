import { useState, useEffect } from 'react'
import type { Card as CardType, Board } from '@/types/board'

export type KanbanMetrics = {
  cycleTime: Record<string, number> // columnId -> avg days
  leadTime: number // avg days from creation to done
  throughput: number // cards completed per week
  bottlenecks: string[] // column IDs with longest cycle time
}

export function useKanbanMetrics(board: Board | null, cards: CardType[]) {
  const [metrics, setMetrics] = useState<KanbanMetrics>({
    cycleTime: {},
    leadTime: 0,
    throughput: 0,
    bottlenecks: [],
  })

  useEffect(() => {
    if (!board || !cards.length || board.type !== 'kanban') {
      setMetrics({ cycleTime: {}, leadTime: 0, throughput: 0, bottlenecks: [] })
      return
    }

    // Calculate cycle time per column (simplified - using updatedAt)
    const cycleTimes: Record<string, number[]> = {}
    const doneColumn = board.columns.find(col => col.toLowerCase().includes('done')) || board.columns[board.columns.length - 1]
    
    cards.forEach(card => {
      if (card.columnId === doneColumn && card.updatedAt) {
        const created = new Date(card.createdAt)
        const done = new Date(card.updatedAt)
        const days = (done.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        
        if (!cycleTimes[doneColumn]) cycleTimes[doneColumn] = []
        cycleTimes[doneColumn].push(days)
      }
    })

    // Calculate averages
    const avgCycleTime: Record<string, number> = {}
    Object.entries(cycleTimes).forEach(([col, times]) => {
      avgCycleTime[col] = times.length > 0 
        ? times.reduce((a, b) => a + b, 0) / times.length 
        : 0
    })

    // Lead time (creation to done)
    const doneCards = cards.filter(c => c.columnId === doneColumn)
    const leadTimes = doneCards
      .filter(c => c.updatedAt)
      .map(c => {
        const created = new Date(c.createdAt)
        const done = new Date(c.updatedAt!)
        return (done.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      })
    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0

    // Throughput (cards completed in last 4 weeks)
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const recentDone = doneCards.filter(c => {
      if (!c.updatedAt) return false
      return new Date(c.updatedAt) >= fourWeeksAgo
    })
    const throughput = recentDone.length / 4 // per week

    // Bottlenecks (top 2 slowest columns)
    const bottlenecks = Object.entries(avgCycleTime)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([column]) => column)

    setMetrics({
      cycleTime: avgCycleTime,
      leadTime: avgLeadTime,
      throughput,
      bottlenecks,
    })
  }, [board, cards])

  return metrics
}


