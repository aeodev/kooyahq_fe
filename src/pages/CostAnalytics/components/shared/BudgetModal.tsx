import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { CURRENCIES } from '@/types/cost-analytics'
import type { Budget } from '@/types/cost-analytics'

interface BudgetModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    project?: string | null
    startDate: string
    endDate: string
    amount: number
    currency: string
    alertThresholds: {
      warning: number
      critical: number
    }
  }) => Promise<void>
  budget?: Budget | null
  projectList: string[]
  isLoading?: boolean
}

export function BudgetModal({
  open,
  onClose,
  onSubmit,
  budget,
  projectList,
  isLoading = false,
}: BudgetModalProps) {
  const [project, setProject] = useState<string | null>(budget?.project ?? null)
  const [startDate, setStartDate] = useState(
    budget?.startDate ? new Date(budget.startDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    budget?.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : ''
  )
  const [amount, setAmount] = useState(budget?.amount.toString() ?? '')
  const [currency, setCurrency] = useState(budget?.currency ?? 'PHP')
  const [warningThreshold, setWarningThreshold] = useState(
    budget?.alertThresholds.warning.toString() ?? '80'
  )
  const [criticalThreshold, setCriticalThreshold] = useState(
    budget?.alertThresholds.critical.toString() ?? '100'
  )

  useEffect(() => {
    if (budget) {
      setProject(budget.project)
      setStartDate(new Date(budget.startDate).toISOString().split('T')[0])
      setEndDate(new Date(budget.endDate).toISOString().split('T')[0])
      setAmount(budget.amount.toString())
      setCurrency(budget.currency)
      setWarningThreshold(budget.alertThresholds.warning.toString())
      setCriticalThreshold(budget.alertThresholds.critical.toString())
    } else {
      setProject(null)
      setStartDate('')
      setEndDate('')
      setAmount('')
      setCurrency('PHP')
      setWarningThreshold('80')
      setCriticalThreshold('100')
    }
  }, [budget, open])

  const handleSubmit = async () => {
    if (!startDate || !endDate || !amount) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return

    const warningNum = parseFloat(warningThreshold)
    const criticalNum = parseFloat(criticalThreshold)
    if (isNaN(warningNum) || isNaN(criticalNum) || warningNum < 0 || criticalNum < 0) return

    await onSubmit({
      project,
      startDate,
      endDate,
      amount: amountNum,
      currency,
      alertThresholds: {
        warning: warningNum,
        critical: criticalNum,
      },
    })
  }

  const isValid =
    startDate &&
    endDate &&
    amount &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) > 0 &&
    new Date(startDate) < new Date(endDate)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{budget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project (optional)</Label>
            <Select
              id="project"
              value={project ?? 'all'}
              onChange={(e) => setProject(e.target.value === 'all' ? null : e.target.value)}
            >
              <option value="all">Team-wide Budget</option>
              {projectList.map((proj) => (
                <option key={proj} value={proj}>
                  {proj}
                </option>
              ))}
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {Object.entries(CURRENCIES).map(([code, config]) => (
                  <option key={code} value={code}>
                    {config.symbol} {code}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Alert Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warning">Warning Threshold (%)</Label>
              <Input
                id="warning"
                type="number"
                min="0"
                max="100"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                placeholder="80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="critical">Critical Threshold (%)</Label>
              <Input
                id="critical"
                type="number"
                min="0"
                max="100"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {budget ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
