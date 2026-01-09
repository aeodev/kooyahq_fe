import { useState, useEffect } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CollapsibleSection } from '../developers/shared/CollapsibleSection'
import { BudgetCard } from './BudgetCard'
import { BudgetModal } from './BudgetModal'
import { useBudgetManagement } from '@/hooks/cost-analytics/useBudgetManagement'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import type { Budget, CurrencyConfig } from '@/types/cost-analytics'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface BudgetTrackingProps {
  currencyConfig: CurrencyConfig
  projectList: string[]
  selectedProject?: string | null
}

export function BudgetTracking({ currencyConfig, projectList, selectedProject }: BudgetTrackingProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  
  const {
    budgets,
    budgetsLoading,
    budgetComparisons,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    fetchBudgetComparisons,
  } = useBudgetManagement()

  const selectedProjectFromStore = useCostAnalyticsStore((state) => state.selectedProject)
  const effectiveProject = selectedProject ?? selectedProjectFromStore

  useEffect(() => {
    const loadBudgetsAndComparisons = async () => {
      await fetchBudgets(effectiveProject)
      // Always fetch comparisons after budgets are loaded (even if empty, to clear stale data)
      await fetchBudgetComparisons()
    }
    loadBudgetsAndComparisons()
  }, [effectiveProject, fetchBudgets, fetchBudgetComparisons])

  const handleCreate = async (data: {
    project?: string | null
    startDate: string
    endDate: string
    amount: number
    currency: string
    alertThresholds: { warning: number; critical: number }
  }) => {
    const result = await createBudget(data)
    if (result) {
      setIsModalOpen(false)
    }
  }

  const handleEdit = async (budget: Budget) => {
    setEditingBudget(budget)
    setIsModalOpen(true)
  }

  const handleUpdate = async (data: {
    project?: string | null
    startDate: string
    endDate: string
    amount: number
    currency: string
    alertThresholds: { warning: number; critical: number }
  }) => {
    if (!editingBudget) return
    const result = await updateBudget(editingBudget.id, data)
    if (result) {
      setIsModalOpen(false)
      setEditingBudget(null)
    }
  }

  const handleDelete = async (budgetId: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      await deleteBudget(budgetId)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingBudget(null)
  }

  // Filter comparisons to show only active budgets
  const activeComparisons = budgetComparisons.filter(
    (comp) => comp.remainingDays > 0 || comp.utilizationPercentage < 100
  )

  return (
    <>
      <CollapsibleSection
        title="Budget Tracking"
        description="Monitor budgets and track spending"
        defaultExpanded={false}
        storageKey="budget-tracking"
      >
        <div className="space-y-4">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {budgetComparisons.some((c) => c.alertLevel !== 'ok') && (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
              <p className="text-sm text-muted-foreground">
                {activeComparisons.length} active budget{activeComparisons.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingBudget(null)
                setIsModalOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Budget
            </Button>
          </div>

          {/* Budget Cards */}
          {budgetsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : activeComparisons.length > 0 && (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {activeComparisons.map((comparison) => (
                <motion.div key={comparison.budget.id} variants={staggerItem} transition={transitionNormal}>
                  <BudgetCard
                    comparison={comparison}
                    currencyConfig={currencyConfig}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </CollapsibleSection>

      {/* Budget Modal */}
      <BudgetModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={editingBudget ? handleUpdate : handleCreate}
        budget={editingBudget}
        projectList={projectList}
        isLoading={budgetsLoading}
      />
    </>
  )
}
