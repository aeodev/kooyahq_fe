import type { TopPerformer, CostSummaryData, CurrencyConfig } from '@/types/cost-analytics'
import { convertFromPHPSync } from './currency-converter'

/**
 * Export developer data to CSV
 */
export function exportDevelopersToCSV(
  performers: TopPerformer[],
  summaryData: CostSummaryData | null,
  currencyConfig: CurrencyConfig
): void {
  if (!summaryData || performers.length === 0) return

  const headers = [
    'Developer Name',
    'Position',
    'Email',
    'Total Cost',
    'Total Hours',
    'Hourly Rate',
    'Project Count',
    'Projects',
  ]

  const rows = performers.map((performer) => {
    const cost = convertFromPHPSync(performer.totalCost ?? 0, currencyConfig.code)
    const hourlyRate = convertFromPHPSync(performer.hourlyRate ?? 0, currencyConfig.code)

    return [
      performer.userName,
      performer.position || '',
      performer.userEmail,
      cost.toFixed(2),
      (performer.totalHours ?? 0).toFixed(2),
      hourlyRate.toFixed(2),
      (performer.projectCount ?? 0).toString(),
      performer.projects.join('; '),
    ]
  })

  const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `developers-export-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export individual developer report
 */
export function exportDeveloperReport(
  performer: TopPerformer,
  summaryData: CostSummaryData,
  currencyConfig: CurrencyConfig
): void {
  const projectBreakdown = summaryData.projectCosts
    .filter((project) => performer.projects.includes(project.project))
    .map((project) => {
      const devData = project.developers.find((d) => d.userId === performer.userId)
      return {
        project: project.project,
        hours: devData?.hours || 0,
        cost: devData?.cost || 0,
      }
    })

  const headers = ['Project', 'Hours', 'Cost']
  const rows = projectBreakdown.map((p) => {
    const cost = convertFromPHPSync(p.cost ?? 0, currencyConfig.code)
    return [p.project, (p.hours ?? 0).toFixed(2), cost.toFixed(2)]
  })

  const summary = [
    ['Developer Report'],
    ['Name', performer.userName],
    ['Position', performer.position || 'N/A'],
    ['Email', performer.userEmail],
    ['Total Cost', convertFromPHPSync(performer.totalCost ?? 0, currencyConfig.code).toFixed(2)],
    ['Total Hours', (performer.totalHours ?? 0).toFixed(2)],
    ['Hourly Rate', convertFromPHPSync(performer.hourlyRate ?? 0, currencyConfig.code).toFixed(2)],
    ['Project Count', (performer.projectCount ?? 0).toString()],
    [],
    ['Project Breakdown'],
    headers,
    ...rows,
  ]

  const csvContent = summary.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `developer-report-${performer.userName}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
