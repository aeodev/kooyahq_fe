/**
 * Format hours into a human-readable string
 * @param hours - Number of hours (can be fractional)
 * @returns Formatted string like "2h 30m" or "45m"
 */
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/**
 * Get chart color by index (cycles through available colors)
 * @param index - Index of the item
 * @param colors - Array of color values
 * @returns Color value
 */
export function getChartColor(index: number, colors: readonly string[]): string {
  return colors[index % colors.length]
}

/**
 * Filter cost data by selected developer IDs
 */
import type { CostSummaryData, ProjectCostSummary } from '@/types/cost-analytics'

export function filterSummaryDataByDevelopers(
  data: CostSummaryData,
  developerIds: string[]
): CostSummaryData {
  if (developerIds.length === 0) return data

  // Filter project costs
  const filteredProjectCosts = data.projectCosts
    .map((project) => {
      const filteredDevelopers = project.developers.filter((dev) =>
        developerIds.includes(dev.userId)
      )

      if (filteredDevelopers.length === 0) return null

      const filteredHours = filteredDevelopers.reduce((sum, dev) => sum + dev.hours, 0)
      const filteredCost = filteredDevelopers.reduce((sum, dev) => sum + dev.cost, 0)
      const avgHourlyRate =
        filteredHours > 0 ? filteredCost / filteredHours : project.avgHourlyRate

      return {
        ...project,
        developers: filteredDevelopers,
        totalHours: filteredHours,
        totalCost: filteredCost,
        avgHourlyRate,
      }
    })
    .filter((p): p is ProjectCostSummary => p !== null)

  // Filter top performers
  const filteredTopPerformers = data.topPerformers.filter((performer) =>
    developerIds.includes(performer.userId)
  )

  // Recalculate totals
  const totalCost = filteredProjectCosts.reduce((sum, p) => sum + p.totalCost, 0)
  const totalHours = filteredProjectCosts.reduce((sum, p) => sum + p.totalHours, 0)

  return {
    ...data,
    projectCosts: filteredProjectCosts,
    topPerformers: filteredTopPerformers,
    totalCost,
    totalHours,
  }
}
