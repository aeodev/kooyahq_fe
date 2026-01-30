import type {
  CostSummaryData,
  ProjectCostSummary,
  LiveCostData,
  CurrencyConfig,
} from '@/types/cost-analytics'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { convertFromPHPSync } from '@/utils/currency-converter'
import { formatHours } from './cost-analytics.utils'

/**
 * Escape CSV cell value (handles quotes and commas)
 */
function escapeCSV(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert array of arrays to CSV string
 */
function arrayToCSV(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCSV).join(',')).join('\n')
}

/**
 * Export summary data to CSV
 */
export function exportSummaryToCSV(
  summaryData: CostSummaryData,
  currencyConfig: CurrencyConfig
): string {
  const rows: (string | number)[][] = [
    ['Project', 'Total Cost', 'Total Hours', 'Developers Count', 'Avg Hourly Rate'],
  ]

  summaryData.projectCosts.forEach((project) => {
    rows.push([
      project.project,
      formatCurrency(project.totalCost ?? 0, currencyConfig),
      formatHours(project.totalHours ?? 0),
      project.developers.length,
      `${currencyConfig.symbol}${convertFromPHPSync(project.avgHourlyRate ?? 0, currencyConfig.code).toFixed(2)}/hr`,
    ])
  })

  return arrayToCSV(rows)
}

/**
 * Export project detail to CSV
 */
export function exportProjectDetailToCSV(
  projectDetail: ProjectCostSummary,
  currencyConfig: CurrencyConfig
): string {
  const rows: (string | number)[][] = [
    ['Developer', 'Hourly Rate', 'Hours', 'Cost'],
  ]

  projectDetail.developers.forEach((dev) => {
    rows.push([
      dev.userName,
      `${currencyConfig.symbol}${convertFromPHPSync(dev.hourlyRate ?? 0, currencyConfig.code).toFixed(2)}/hr`,
      formatHours(dev.hours ?? 0),
      formatCurrency(dev.cost ?? 0, currencyConfig),
    ])
  })

  // Add summary row
  rows.push([])
  rows.push([
    'Total',
    `${currencyConfig.symbol}${convertFromPHPSync(projectDetail.avgHourlyRate ?? 0, currencyConfig.code).toFixed(2)}/hr`,
    formatHours(projectDetail.totalHours ?? 0),
    formatCurrency(projectDetail.totalCost ?? 0, currencyConfig),
  ])

  return arrayToCSV(rows)
}

/**
 * Export comparison data to CSV
 */
export function exportComparisonToCSV(
  compareData: ProjectCostSummary[],
  currencyConfig: CurrencyConfig
): string {
  const rows: (string | number)[][] = [
    [
      'Project',
      'Total Cost',
      'Total Hours',
      'Developers',
      'Avg Hourly Rate',
    ],
  ]

  compareData.forEach((project) => {
    rows.push([
      project.project,
      formatCurrency(project.totalCost ?? 0, currencyConfig),
      formatHours(project.totalHours ?? 0),
      project.developers.length,
      `${currencyConfig.symbol}${convertFromPHPSync(project.avgHourlyRate ?? 0, currencyConfig.code).toFixed(2)}/hr`,
    ])
  })

  return arrayToCSV(rows)
}

/**
 * Export live cost data to CSV
 */
export function exportLiveDataToCSV(
  liveData: LiveCostData,
  currencyConfig: CurrencyConfig
): string {
  const rows: (string | number)[][] = [
    ['Developer', 'Projects', 'Hourly Rate', 'Active Time', 'Live Cost', 'Status'],
  ]

  liveData.activeDevelopers.forEach((dev) => {
    rows.push([
      dev.userName,
      dev.projects.join('; '),
      `${currencyConfig.symbol}${convertFromPHPSync(dev.hourlyRate ?? 0, currencyConfig.code).toFixed(2)}/hr`,
      formatHours((dev.activeMinutes ?? 0) / 60),
      formatCurrency(dev.liveCost ?? 0, currencyConfig),
      dev.isPaused ? 'Paused' : 'Active',
    ])
  })

  // Add summary rows
  rows.push([])
  rows.push(['Total Burn Rate', `${currencyConfig.symbol}${convertFromPHPSync(liveData.totalBurnRate ?? 0, currencyConfig.code).toFixed(2)}/hr`])
  rows.push(['Total Live Cost', formatCurrency(liveData.totalLiveCost ?? 0, currencyConfig)])
  rows.push(['Active Hours', formatHours(liveData.activeHours ?? 0)])
  rows.push(['Active Developers', liveData.activeDevelopers.length])

  return arrayToCSV(rows)
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
