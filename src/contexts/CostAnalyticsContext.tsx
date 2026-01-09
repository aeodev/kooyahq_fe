import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getDateRange } from '@/utils/date'
import type { ViewMode } from '@/types/cost-analytics'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'

interface CostAnalyticsContextValue {
  // Date range
  startDate: string
  endDate: string
  setStartDate: (date: string) => void
  setEndDate: (date: string) => void
  quickRange: (days: number) => void

  // View mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Developer filters
  selectedDevelopers: string[]
  setSelectedDevelopers: (developers: string[]) => void

  // Active tab
  activeTab: 'projects' | 'developers'
  setActiveTab: (tab: 'projects' | 'developers') => void

  // Store state (read-only access)
  selectedProject: string | null
  compareProjects: string[]
}

const CostAnalyticsContext = createContext<CostAnalyticsContextValue | undefined>(undefined)

interface CostAnalyticsProviderProps {
  children: ReactNode
}

export function CostAnalyticsProvider({ children }: CostAnalyticsProviderProps) {
  const [startDate, setStartDate] = useState(() => {
    const { start } = getDateRange(30)
    return start
  })
  const [endDate, setEndDate] = useState(() => {
    const { end } = getDateRange(0)
    return end
  })
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'projects' | 'developers'>('projects')

  // Get store state for read-only access
  const selectedProject = useCostAnalyticsStore((state) => state.selectedProject)
  const compareProjects = useCostAnalyticsStore((state) => state.compareProjects)

  const quickRange = useCallback((days: number) => {
    const range = getDateRange(days)
    setStartDate(range.start)
    setEndDate(range.end)
  }, [])

  const value: CostAnalyticsContextValue = {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    quickRange,
    viewMode,
    setViewMode,
    selectedDevelopers,
    setSelectedDevelopers,
    activeTab,
    setActiveTab,
    selectedProject,
    compareProjects,
  }

  return <CostAnalyticsContext.Provider value={value}>{children}</CostAnalyticsContext.Provider>
}

export function useCostAnalyticsContext() {
  const context = useContext(CostAnalyticsContext)
  if (context === undefined) {
    throw new Error('useCostAnalyticsContext must be used within CostAnalyticsProvider')
  }
  return context
}
