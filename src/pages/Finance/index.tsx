import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, DollarSign, TrendingUp, Users, Plus, Loader2 } from 'lucide-react'
import { useFinanceSummaryQuery, useExpensesQuery, useEmployeeCostsQuery, useCreateExpenseMutation, useDeleteExpenseMutation, useCreateEmployeeCostMutation, useDeleteEmployeeCostMutation, type Expense, type EmployeeCost } from '@/hooks/queries/finance.queries'
import { useUsersQuery } from '@/hooks/queries/user.queries'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { CURRENCIES } from '@/types/cost-analytics'

export function Finance() {
  const can = useAuthStore((state) => state.can)
  const canEdit = can(PERMISSIONS.FINANCE_EDIT) || can(PERMISSIONS.FINANCE_FULL_ACCESS)
  const canManageEmployeeCosts = can(PERMISSIONS.FINANCE_MANAGE_EMPLOYEE_COSTS) || can(PERMISSIONS.FINANCE_FULL_ACCESS)

  // Date range state (default to last 15 days)
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const defaultStartDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 15)
    return date.toISOString().split('T')[0]
  }, [])

  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(today)
  const [activeTab, setActiveTab] = useState<'summary' | 'expenses' | 'employee-costs'>('summary')
  const [currency, setCurrency] = useState<keyof typeof CURRENCIES>('PHP')

  // Queries
  const { data: summary, isLoading: summaryLoading } = useFinanceSummaryQuery(startDate, endDate)
  const { data: expenses = [], isLoading: expensesLoading } = useExpensesQuery({ startDate, endDate })
  const { data: employeeCosts = [], isLoading: employeeCostsLoading } = useEmployeeCostsQuery({ startDate, endDate })
  const { data: users = [] } = useUsersQuery()

  // Mutations
  const createExpenseMutation = useCreateExpenseMutation()
  const deleteExpenseMutation = useDeleteExpenseMutation()
  const createEmployeeCostMutation = useCreateEmployeeCostMutation()
  const deleteEmployeeCostMutation = useDeleteEmployeeCostMutation()

  const currencyConfig = CURRENCIES[currency]

  // Quick range buttons
  const quickRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const isLoading = summaryLoading || expensesLoading || employeeCostsLoading

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="text-muted-foreground mt-1">Track expenses and employee costs</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Date Range</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="startDate" className="text-xs">Start</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="endDate" className="text-xs">End</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => quickRange(7)}>Last 7 days</Button>
                <Button variant="outline" size="sm" onClick={() => quickRange(15)}>Last 15 days</Button>
                <Button variant="outline" size="sm" onClick={() => quickRange(30)}>Last 30 days</Button>
                <Button variant="outline" size="sm" onClick={() => quickRange(90)}>Last 90 days</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalOutflow, currencyConfig)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Expenses: {formatCurrency(summary.totalExpenses, currencyConfig)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalExpenses, currencyConfig)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.topCategories.length} categories
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employee Costs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalEmployeeCosts, currencyConfig)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {employeeCosts.length} entries
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="employee-costs">Employee Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : summary ? (
            <>
              {/* Top Categories */}
              {summary.topCategories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.topCategories.map((cat) => (
                        <div key={cat.category} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm font-medium">{cat.category || 'Uncategorized'}</span>
                          <span className="text-sm font-semibold">{formatCurrency(cat.cost, currencyConfig)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Vendors */}
              {summary.topVendors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Vendors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.topVendors.map((vendor) => (
                        <div key={vendor.vendor} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm font-medium">{vendor.vendor}</span>
                          <span className="text-sm font-semibold">{formatCurrency(vendor.cost, currencyConfig)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {canEdit && (
            <Card>
              <CardContent className="pt-6">
                <ExpenseForm onSubmit={(data) => createExpenseMutation.mutate(data)} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expenses found</p>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{expense.vendor || 'No vendor'}</span>
                          {expense.category && (
                            <span className="text-xs px-2 py-0.5 bg-muted rounded">{expense.category}</span>
                          )}
                        </div>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground mt-1">{expense.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(expense.effectiveDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold">{formatCurrency(expense.amount, currencyConfig)}</span>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteExpenseMutation.mutate(expense.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee-costs" className="space-y-4">
          {canManageEmployeeCosts && (
            <Card>
              <CardContent className="pt-6">
                <EmployeeCostForm
                  users={users}
                  onSubmit={(data) => createEmployeeCostMutation.mutate(data)}
                />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employee Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {employeeCostsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : employeeCosts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No employee costs found</p>
              ) : (
                <div className="space-y-2">
                  {employeeCosts.map((cost) => {
                    const user = users.find((u) => u.id === cost.employeeId)
                    return (
                      <div key={cost.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{user?.name || 'Unknown'}</span>
                            <span className="text-xs px-2 py-0.5 bg-muted rounded">{cost.costType}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(cost.effectiveDate).toLocaleDateString()}
                            {cost.endDate && ` - ${new Date(cost.endDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-semibold">{formatCurrency(cost.amount, currencyConfig)}</span>
                          {canManageEmployeeCosts && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEmployeeCostMutation.mutate(cost.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Simple Expense Form Component
function ExpenseForm({ onSubmit }: { onSubmit: (data: Partial<Expense>) => void }) {
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [metadata, setMetadata] = useState<Array<{ key: string; value: string }>>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !effectiveDate) return

    const metadataObj: Record<string, unknown> = {}
    metadata.forEach(({ key, value }) => {
      if (key && value) {
        metadataObj[key] = value
      }
    })

    onSubmit({
      amount: parseFloat(amount),
      vendor: vendor || undefined,
      category: category || undefined,
      description: description || undefined,
      effectiveDate: new Date(effectiveDate),
      metadata: Object.keys(metadataObj).length > 0 ? metadataObj : undefined,
    })

    // Reset form
    setAmount('')
    setVendor('')
    setCategory('')
    setDescription('')
    setEffectiveDate(new Date().toISOString().split('T')[0])
    setMetadata([])
  }

  const addMetadataField = () => {
    setMetadata([...metadata, { key: '', value: '' }])
  }

  const updateMetadata = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...metadata]
    updated[index] = { ...updated[index], [field]: value }
    setMetadata(updated)
  }

  const removeMetadataField = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Add Expense</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveDate">Date *</Label>
          <Input
            id="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input
            id="vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Metadata (Key-Value)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addMetadataField}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {metadata.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Key"
              value={item.key}
              onChange={(e) => updateMetadata(index, 'key', e.target.value)}
            />
            <Input
              placeholder="Value"
              value={item.value}
              onChange={(e) => updateMetadata(index, 'value', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeMetadataField(index)}
            >
              ×
            </Button>
          </div>
        ))}
      </div>
      <Button type="submit" className="w-full">Create Expense</Button>
    </form>
  )
}

// Simple Employee Cost Form Component
function EmployeeCostForm({
  users,
  onSubmit,
}: {
  users: Array<{ id: string; name: string }>
  onSubmit: (data: Partial<EmployeeCost>) => void
}) {
  const [employeeId, setEmployeeId] = useState('')
  const [costType, setCostType] = useState<'salary' | 'subscription' | 'item' | 'other'>('salary')
  const [amount, setAmount] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !amount || !effectiveDate) return

    onSubmit({
      employeeId,
      costType,
      amount: parseFloat(amount),
      effectiveDate: new Date(effectiveDate),
      endDate: endDate ? new Date(endDate) : undefined,
    })

    // Reset form
    setEmployeeId('')
    setCostType('salary')
    setAmount('')
    setEffectiveDate(new Date().toISOString().split('T')[0])
    setEndDate('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Add Employee Cost</h3>
      </div>
      <div className="space-y-2">
        <Label htmlFor="employeeId">Employee *</Label>
        <select
          id="employeeId"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        >
          <option value="">Select employee...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="costType">Cost Type *</Label>
          <select
            id="costType"
            value={costType}
            onChange={(e) => setCostType(e.target.value as typeof costType)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="salary">Salary</option>
            <option value="subscription">Subscription</option>
            <option value="item">Item</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="effectiveDate">Effective Date *</Label>
          <Input
            id="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date (optional)</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={effectiveDate}
          />
        </div>
      </div>
      <Button type="submit" className="w-full">Create Employee Cost</Button>
    </form>
  )
}
