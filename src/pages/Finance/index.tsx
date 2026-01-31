import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, DollarSign, TrendingUp, Users, Plus, Loader2, BarChart3 } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  useFinanceSummaryQuery,
  useExpensesQuery,
  useEmployeeCostsQuery,
  useExpenseOptionsQuery,
  useEmployeeCostOptionsQuery,
  useRecurringExpensesQuery,
  useRecurringEmployeeCostsQuery,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useCreateEmployeeCostMutation,
  useDeleteEmployeeCostMutation,
  useCreateRecurringExpenseMutation,
  useUpdateRecurringExpenseMutation,
  useCreateRecurringEmployeeCostMutation,
  useUpdateRecurringEmployeeCostMutation,
  type Expense,
  type EmployeeCost,
  type RecurringExpense,
  type RecurringEmployeeCost,
} from '@/hooks/queries/finance.queries'
import { useUsersQuery } from '@/hooks/queries/user.queries'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { fetchSummaryData } from '@/services/cost-analytics.service'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { CURRENCIES } from '@/types/cost-analytics'
import { formatHours, getChartColor } from '@/utils/cost-analytics.utils'
import { CHART_COLORS, MAX_PIE_CHART_ITEMS } from '@/constants/cost-analytics.constants'

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
  const [expenseSearch, setExpenseSearch] = useState('')
  const [expensePage, setExpensePage] = useState(1)
  const [employeeCostSearch, setEmployeeCostSearch] = useState('')
  const [employeeCostPage, setEmployeeCostPage] = useState(1)
  const [recurringExpensePage, setRecurringExpensePage] = useState(1)
  const [recurringEmployeeCostPage, setRecurringEmployeeCostPage] = useState(1)
  const expenseLimit = 10
  const employeeCostLimit = 10
  const recurringExpenseLimit = 10
  const recurringEmployeeCostLimit = 10

  // Queries
  const { data: summary, isLoading: summaryLoading } = useFinanceSummaryQuery(startDate, endDate)
  const { data: expensesResponse, isLoading: expensesLoading } = useExpensesQuery({ startDate, endDate, search: expenseSearch, page: expensePage, limit: expenseLimit })
  const { data: employeeCostsResponse, isLoading: employeeCostsLoading } = useEmployeeCostsQuery({ startDate, endDate, search: employeeCostSearch, page: employeeCostPage, limit: employeeCostLimit })
  const { data: recurringExpensesResponse, isLoading: recurringExpensesLoading } = useRecurringExpensesQuery({ search: expenseSearch, page: recurringExpensePage, limit: recurringExpenseLimit })
  const { data: recurringEmployeeCostsResponse, isLoading: recurringEmployeeCostsLoading } = useRecurringEmployeeCostsQuery({ search: employeeCostSearch, page: recurringEmployeeCostPage, limit: recurringEmployeeCostLimit })
  const { data: expenseOptions } = useExpenseOptionsQuery()
  const { data: employeeCostOptions } = useEmployeeCostOptionsQuery()
  const { data: users = [] } = useUsersQuery()
  const { data: costSummary, isLoading: costSummaryLoading } = useQuery({
    queryKey: ['finance', 'costSummary', { startDate, endDate }],
    queryFn: () => fetchSummaryData(startDate, endDate),
    enabled: activeTab === 'summary',
    staleTime: 2 * 60 * 1000,
  })
  const expenses = expensesResponse?.data ?? []
  const expensesPagination = expensesResponse?.pagination
  const employeeCosts = employeeCostsResponse?.data ?? []
  const employeeCostsPagination = employeeCostsResponse?.pagination
  const recurringExpenses = recurringExpensesResponse?.data ?? []
  const recurringExpensesPagination = recurringExpensesResponse?.pagination
  const recurringEmployeeCosts = recurringEmployeeCostsResponse?.data ?? []
  const recurringEmployeeCostsPagination = recurringEmployeeCostsResponse?.pagination
  const categoryOptions = expenseOptions?.categories ?? []
  const vendorOptions = expenseOptions?.vendors ?? []
  const employeeVendorOptions = employeeCostOptions?.vendors ?? []
  const employeeCategoryOptions = employeeCostOptions?.categories ?? []

  // Mutations
  const createExpenseMutation = useCreateExpenseMutation()
  const deleteExpenseMutation = useDeleteExpenseMutation()
  const createEmployeeCostMutation = useCreateEmployeeCostMutation()
  const deleteEmployeeCostMutation = useDeleteEmployeeCostMutation()
  const createRecurringExpenseMutation = useCreateRecurringExpenseMutation()
  const updateRecurringExpenseMutation = useUpdateRecurringExpenseMutation()
  const createRecurringEmployeeCostMutation = useCreateRecurringEmployeeCostMutation()
  const updateRecurringEmployeeCostMutation = useUpdateRecurringEmployeeCostMutation()

  const currencyConfig = CURRENCIES[currency]
  const recurringExpenseTotal = recurringExpensesPagination?.total ?? recurringExpenses.length
  const recurringEmployeeCostTotal = recurringEmployeeCostsPagination?.total ?? recurringEmployeeCosts.length
  const oneOffExpenseTotal = expensesPagination?.total ?? expenses.length
  const oneOffEmployeeCostTotal = employeeCostsPagination?.total ?? employeeCosts.length

  const salaryStats = useMemo(() => {
    const entries = users
      .filter((user) => typeof user.monthlySalary === 'number' && (user.monthlySalary ?? 0) > 0)
      .sort((a, b) => (b.monthlySalary ?? 0) - (a.monthlySalary ?? 0))
    const total = entries.reduce((sum, user) => sum + (user.monthlySalary ?? 0), 0)
    const average = entries.length > 0 ? total / entries.length : 0
    return { entries, total, average }
  }, [users])

  const dailyOutflowData = useMemo(() => {
    if (!summary) return []
    return summary.dailyCosts.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      outflow: item.cost,
    }))
  }, [summary])

  const monthlyOutflowData = useMemo(() => {
    if (!summary) return []
    return summary.monthlyCosts.map((item) => {
      const [year, month] = item.month.split('-')
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      return {
        month: label,
        outflow: item.cost,
      }
    })
  }, [summary])

  const categoryPieData = useMemo(() => {
    if (!summary) return []
    return summary.topCategories
      .slice(0, MAX_PIE_CHART_ITEMS)
      .map((item, index) => ({
        name: item.category || 'Uncategorized',
        value: item.cost,
        color: getChartColor(index, CHART_COLORS),
      }))
  }, [summary])

  const vendorPieData = useMemo(() => {
    if (!summary) return []
    return summary.topVendors
      .slice(0, MAX_PIE_CHART_ITEMS)
      .map((item, index) => ({
        name: item.vendor || 'Unknown',
        value: item.cost,
        color: getChartColor(index, CHART_COLORS),
      }))
  }, [summary])

  const projectPieData = useMemo(() => {
    if (!costSummary) return []
    return costSummary.projectCosts
      .slice(0, MAX_PIE_CHART_ITEMS)
      .map((project, index) => ({
        name: project.project,
        value: project.totalCost,
        color: getChartColor(index, CHART_COLORS),
      }))
  }, [costSummary])

  const employeeAllocations = useMemo(() => {
    if (!costSummary) return []
    const map = new Map<string, {
      userId: string
      userName: string
      totalHours: number
      totalCost: number
      projects: Array<{ name: string; hours: number; cost: number }>
    }>()

    costSummary.projectCosts.forEach((project) => {
      project.developers.forEach((developer) => {
        const entry = map.get(developer.userId) ?? {
          userId: developer.userId,
          userName: developer.userName,
          totalHours: 0,
          totalCost: 0,
          projects: [],
        }
        entry.totalHours += developer.hours
        entry.totalCost += developer.cost
        const projectEntry = entry.projects.find((p) => p.name === project.project)
        if (projectEntry) {
          projectEntry.hours += developer.hours
          projectEntry.cost += developer.cost
        } else {
          entry.projects.push({ name: project.project, hours: developer.hours, cost: developer.cost })
        }
        map.set(developer.userId, entry)
      })
    })

    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        projects: entry.projects.sort((a, b) => b.hours - a.hours),
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
  }, [costSummary])

  const summaryHighlights = useMemo(() => {
    const topCategory = summary?.topCategories?.[0]
    const topVendor = summary?.topVendors?.[0]
    const topProject = costSummary?.projectCosts?.[0]
    const topEmployee = employeeAllocations[0]
    return { topCategory, topVendor, topProject, topEmployee }
  }, [summary, costSummary, employeeAllocations])

  // Quick range buttons
  const quickRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const summaryBusy = summaryLoading || costSummaryLoading

  useEffect(() => {
    setExpensePage(1)
    setRecurringExpensePage(1)
  }, [startDate, endDate, expenseSearch])

  useEffect(() => {
    setEmployeeCostPage(1)
    setRecurringEmployeeCostPage(1)
  }, [startDate, endDate, employeeCostSearch])

  const sortedRecurringExpenses = useMemo(() => {
    const statusRank: Record<string, number> = { active: 0, paused: 1, ended: 2 }
    return [...recurringExpenses].sort((a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9))
  }, [recurringExpenses])

  const sortedRecurringEmployeeCosts = useMemo(() => {
    const statusRank: Record<string, number> = { active: 0, paused: 1, ended: 2 }
    return [...recurringEmployeeCosts].sort((a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9))
  }, [recurringEmployeeCosts])

  const statusBadgeClass = (status: string) => {
    if (status === 'active') return 'border-emerald-200 bg-emerald-100 text-emerald-700'
    if (status === 'paused') return 'border-amber-200 bg-amber-100 text-amber-700'
    return 'border-slate-200 bg-slate-100 text-slate-600'
  }

  const handleEndRecurringExpense = (item: RecurringExpense) => {
    if (!window.confirm('End this recurring payment? This stops future charges.')) return
    updateRecurringExpenseMutation.mutate({
      id: item.id,
      data: {
        status: 'ended',
        endDate: new Date().toISOString(),
      },
    })
  }

  const handleEndRecurringEmployeeCost = (item: RecurringEmployeeCost) => {
    if (!window.confirm('End this recurring employee cost? This stops future charges.')) return
    updateRecurringEmployeeCostMutation.mutate({
      id: item.id,
      data: {
        status: 'ended',
        endDate: new Date().toISOString(),
      },
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="text-muted-foreground mt-1">Track expenses and employee costs</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="employee-costs">Employee Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="endDate" className="text-xs">End</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 text-sm"
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
                <div className="w-full sm:w-56 space-y-2">
                  <Label htmlFor="currency" className="text-xs">Currency</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as keyof typeof CURRENCIES)}
                    className={selectClassName}
                  >
                    {Object.entries(CURRENCIES).map(([code, config]) => (
                      <option key={code} value={code}>
                        {code} • {config.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {summaryBusy ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : summary ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalOutflow, currencyConfig)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Cash outflow for selected dates</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalExpenses, currencyConfig)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{oneOffExpenseTotal} one-off • {recurringExpenseTotal} recurring</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Employee Costs</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalEmployeeCosts, currencyConfig)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{oneOffEmployeeCostTotal} one-off • {recurringEmployeeCostTotal} recurring</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Payroll (Monthly)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(salaryStats.total, currencyConfig)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{salaryStats.entries.length} employees with salary</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tracked Labor Cost</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {costSummary ? formatCurrency(costSummary.totalCost, currencyConfig) : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Approx from time tracking</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tracked Hours</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {costSummary ? formatHours(costSummary.totalHours) : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">From active time logs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Daily Outflow</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary.dailyCosts.length > 0
                        ? formatCurrency(summary.totalOutflow / summary.dailyCosts.length, currencyConfig)
                        : formatCurrency(0, currencyConfig)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Cash + employee costs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Salary Average</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(salaryStats.average, currencyConfig)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Monthly average salary</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Top Category</p>
                      <p className="text-sm font-semibold">{summaryHighlights.topCategory?.category || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {summaryHighlights.topCategory ? formatCurrency(summaryHighlights.topCategory.cost, currencyConfig) : 'No data'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Top Vendor</p>
                      <p className="text-sm font-semibold">{summaryHighlights.topVendor?.vendor || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {summaryHighlights.topVendor ? formatCurrency(summaryHighlights.topVendor.cost, currencyConfig) : 'No data'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Top Tracked Project</p>
                      <p className="text-sm font-semibold">{summaryHighlights.topProject?.project || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {summaryHighlights.topProject ? formatCurrency(summaryHighlights.topProject.totalCost, currencyConfig) : 'No tracked data'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Top Tracked Contributor</p>
                      <p className="text-sm font-semibold">{summaryHighlights.topEmployee?.userName || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {summaryHighlights.topEmployee
                          ? `${formatHours(summaryHighlights.topEmployee.totalHours)} • ${formatCurrency(summaryHighlights.topEmployee.totalCost, currencyConfig)}`
                          : 'No tracked data'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Outflow Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyOutflowData.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No daily outflow data yet</p>
                    ) : (
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dailyOutflowData}>
                            <defs>
                              <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(value) => formatCurrency(Number(value), currencyConfig)} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value), currencyConfig)} />
                            <Area type="monotone" dataKey="outflow" stroke="hsl(var(--primary))" fill="url(#outflowGradient)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Outflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthlyOutflowData.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No monthly data yet</p>
                    ) : (
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyOutflowData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(value) => formatCurrency(Number(value), currencyConfig)} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value), currencyConfig)} />
                            <Bar dataKey="outflow" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Expense Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoryPieData.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No category data yet</p>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="h-48 w-full lg:w-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie data={categoryPieData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
                                {categoryPieData.map((entry, index) => (
                                  <Cell key={`cat-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(Number(value), currencyConfig)} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2">
                          {categoryPieData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span>{item.name}</span>
                              </div>
                              <span className="font-medium">{formatCurrency(item.value, currencyConfig)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Vendors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vendorPieData.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No vendor data yet</p>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="h-48 w-full lg:w-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie data={vendorPieData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
                                {vendorPieData.map((entry, index) => (
                                  <Cell key={`ven-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(Number(value), currencyConfig)} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2">
                          {vendorPieData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span>{item.name}</span>
                              </div>
                              <span className="font-medium">{formatCurrency(item.value, currencyConfig)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Project Labor Mix (Tracked)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!costSummary || projectPieData.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No tracked project cost data</p>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="h-48 w-full lg:w-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie data={projectPieData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
                                {projectPieData.map((entry, index) => (
                                  <Cell key={`proj-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(Number(value), currencyConfig)} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2">
                          {projectPieData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span>{item.name}</span>
                              </div>
                              <span className="font-medium">{formatCurrency(item.value, currencyConfig)}</span>
                            </div>
                          ))}
                          <p className="text-xs text-muted-foreground">Approximate based on logged hours per project.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employee Allocation (Tracked)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!costSummary || employeeAllocations.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No tracked employee allocation yet</p>
                    ) : (
                      <div className="space-y-3">
                        {employeeAllocations.slice(0, 6).map((entry) => (
                          <div key={entry.userId} className="rounded-md border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">{entry.userName}</p>
                                <p className="text-xs text-muted-foreground">{formatHours(entry.totalHours)} • {entry.projects.length} projects</p>
                              </div>
                              <div className="text-sm font-semibold">{formatCurrency(entry.totalCost, currencyConfig)}</div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.projects.slice(0, 3).map((project) => (
                                <span key={project.name} className="text-xs rounded-full bg-muted px-2 py-0.5">
                                  {project.name}: {formatHours(project.hours)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">Approximate totals from tracked time entries.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Salary Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  {salaryStats.entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No salary data recorded</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {salaryStats.entries.slice(0, 6).map((user) => (
                        <div key={user.id} className="rounded-md border p-3">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.position || 'Employee'}</p>
                          <p className="text-sm font-semibold mt-2">
                            {formatCurrency(user.monthlySalary ?? 0, currencyConfig)} / month
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">No finance summary available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">Search Expenses</p>
                  <p className="text-xs text-muted-foreground">Vendor, category, and notes are searchable.</p>
                </div>
                <div className="w-full md:w-64">
                  <Input
                    className="h-9 text-sm"
                    placeholder="Search expenses..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Record Expenses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <details className="group rounded-md border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Add recurring expense</summary>
                  <div className="mt-4">
                    <RecurringExpenseForm
                      categories={categoryOptions}
                      vendors={vendorOptions}
                      onSubmit={(data) => createRecurringExpenseMutation.mutate(data)}
                    />
                  </div>
                </details>
                <details className="group rounded-md border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Add one-off expense</summary>
                  <div className="mt-4">
                    <ExpenseForm
                      categories={categoryOptions}
                      vendors={vendorOptions}
                      onSubmit={(data) => createExpenseMutation.mutate(data)}
                    />
                  </div>
                </details>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Expense Ledger</CardTitle>
                <p className="text-xs text-muted-foreground">Click an entry to view details.</p>
              </div>
              <span className="text-xs text-muted-foreground">{oneOffExpenseTotal} one-off • {recurringExpenseTotal} recurring</span>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Recurring Payments</h4>
                    <Badge variant="outline" className="rounded-full">{recurringExpenseTotal}</Badge>
                  </div>
                </div>
                {recurringExpensesLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sortedRecurringExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recurring payments found</p>
                ) : (
                  <div className="space-y-2">
                    {sortedRecurringExpenses.map((recurring) => (
                      <details key={recurring.id} className="group rounded-md border p-2">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 list-none rounded-md p-2 hover:bg-muted/50">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{recurring.vendor || 'No vendor'}</span>
                              {recurring.category && (
                                <Badge variant="secondary" className="rounded-full">{recurring.category}</Badge>
                              )}
                              <Badge variant="outline" className="rounded-full">{recurring.frequency}</Badge>
                              <Badge variant="outline" className={statusBadgeClass(recurring.status)}>{recurring.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Start {new Date(recurring.startDate).toLocaleDateString()}
                              {recurring.endDate && ` • End ${new Date(recurring.endDate).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{formatCurrency(recurring.amount, currencyConfig)}</span>
                            {canEdit && recurring.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  handleEndRecurringExpense(recurring)
                                }}
                              >
                                End
                              </Button>
                            )}
                          </div>
                        </summary>
                        {recurring.notes && (
                          <div className="mt-2 text-xs text-muted-foreground">{recurring.notes}</div>
                        )}
                      </details>
                    ))}
                  </div>
                )}
                {recurringExpensesPagination && recurringExpensesPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Page {recurringExpensesPagination.page} of {recurringExpensesPagination.totalPages} • {recurringExpensesPagination.total} items
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={recurringExpensePage <= 1}
                        onClick={() => setRecurringExpensePage((prev) => Math.max(1, prev - 1))}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={recurringExpensePage >= recurringExpensesPagination.totalPages}
                        onClick={() => setRecurringExpensePage((prev) => prev + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">One-off Expenses</h4>
                    <Badge variant="outline" className="rounded-full">{oneOffExpenseTotal}</Badge>
                  </div>
                </div>
                {expensesLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No expenses found</p>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <details key={expense.id} className="group rounded-md border p-2">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 list-none rounded-md p-2 hover:bg-muted/50">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{expense.vendor || 'No vendor'}</span>
                              {expense.category && (
                                <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{expense.category}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(expense.effectiveDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{formatCurrency(expense.amount, currencyConfig)}</span>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  deleteExpenseMutation.mutate(expense.id)
                                }}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </summary>
                        {expense.notes && (
                          <div className="mt-2 text-xs text-muted-foreground">{expense.notes}</div>
                        )}
                      </details>
                    ))}
                  </div>
                )}
                {expensesPagination && expensesPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Page {expensesPagination.page} of {expensesPagination.totalPages} • {expensesPagination.total} items
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={expensePage <= 1}
                        onClick={() => setExpensePage((prev) => Math.max(1, prev - 1))}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={expensePage >= expensesPagination.totalPages}
                        onClick={() => setExpensePage((prev) => prev + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee-costs" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">Search Employee Costs</p>
                  <p className="text-xs text-muted-foreground">Search by vendor or category.</p>
                </div>
                <div className="w-full md:w-64">
                  <Input
                    className="h-9 text-sm"
                    placeholder="Search employee costs..."
                    value={employeeCostSearch}
                    onChange={(e) => setEmployeeCostSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {canManageEmployeeCosts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Record Employee Costs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <details className="group rounded-md border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Add recurring employee cost</summary>
                  <div className="mt-4">
                    <RecurringEmployeeCostForm
                      users={users}
                      vendors={employeeVendorOptions}
                      categories={employeeCategoryOptions}
                      onSubmit={(data) => createRecurringEmployeeCostMutation.mutate(data)}
                    />
                  </div>
                </details>
                <details className="group rounded-md border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Add one-off employee cost</summary>
                  <div className="mt-4">
                    <EmployeeCostForm
                      users={users}
                      vendors={employeeVendorOptions}
                      categories={employeeCategoryOptions}
                      onSubmit={(data) => createEmployeeCostMutation.mutate(data)}
                    />
                  </div>
                </details>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Employee Cost Ledger</CardTitle>
                <p className="text-xs text-muted-foreground">Click an entry to view details.</p>
              </div>
              <span className="text-xs text-muted-foreground">{oneOffEmployeeCostTotal} one-off • {recurringEmployeeCostTotal} recurring</span>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Recurring Employee Costs</h4>
                    <Badge variant="outline" className="rounded-full">{recurringEmployeeCostTotal}</Badge>
                  </div>
                </div>
                {recurringEmployeeCostsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sortedRecurringEmployeeCosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recurring employee costs found</p>
                ) : (
                  <div className="space-y-2">
                    {sortedRecurringEmployeeCosts.map((recurring) => {
                      const user = users.find((u) => u.id === recurring.employeeId)
                      return (
                        <details key={recurring.id} className="group rounded-md border p-2">
                          <summary className="flex cursor-pointer items-center justify-between gap-3 list-none rounded-md p-2 hover:bg-muted/50">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{user?.name || 'Unknown'}</span>
                                {recurring.vendor && (
                                  <Badge variant="secondary" className="rounded-full">{recurring.vendor}</Badge>
                                )}
                                {recurring.category && (
                                  <Badge variant="secondary" className="rounded-full">{recurring.category}</Badge>
                                )}
                                <Badge variant="outline" className="rounded-full">{recurring.frequency}</Badge>
                                <Badge variant="outline" className={statusBadgeClass(recurring.status)}>{recurring.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Start {new Date(recurring.startDate).toLocaleDateString()}
                                {recurring.endDate && ` • End ${new Date(recurring.endDate).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold">{formatCurrency(recurring.amount, currencyConfig)}</span>
                              {canManageEmployeeCosts && recurring.status === 'active' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleEndRecurringEmployeeCost(recurring)
                                  }}
                                >
                                  End
                                </Button>
                              )}
                            </div>
                          </summary>
                        </details>
                      )
                    })}
                  </div>
                )}
                {recurringEmployeeCostsPagination && recurringEmployeeCostsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Page {recurringEmployeeCostsPagination.page} of {recurringEmployeeCostsPagination.totalPages} • {recurringEmployeeCostsPagination.total} items
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={recurringEmployeeCostPage <= 1}
                        onClick={() => setRecurringEmployeeCostPage((prev) => Math.max(1, prev - 1))}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={recurringEmployeeCostPage >= recurringEmployeeCostsPagination.totalPages}
                        onClick={() => setRecurringEmployeeCostPage((prev) => prev + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">One-off Employee Costs</h4>
                    <Badge variant="outline" className="rounded-full">{oneOffEmployeeCostTotal}</Badge>
                  </div>
                </div>
                {employeeCostsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : employeeCosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No employee costs found</p>
                ) : (
                  <div className="space-y-2">
                    {employeeCosts.map((cost) => {
                      const user = users.find((u) => u.id === cost.employeeId)
                      return (
                        <details key={cost.id} className="group rounded-md border p-2">
                          <summary className="flex cursor-pointer items-center justify-between gap-3 list-none rounded-md p-2 hover:bg-muted/50">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{user?.name || 'Unknown'}</span>
                                {cost.vendor && (
                                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{cost.vendor}</span>
                                )}
                                {cost.category && (
                                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{cost.category}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(cost.effectiveDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold">{formatCurrency(cost.amount, currencyConfig)}</span>
                              {canManageEmployeeCosts && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    deleteEmployeeCostMutation.mutate(cost.id)
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </summary>
                        </details>
                      )
                    })}
                  </div>
                )}
                {employeeCostsPagination && employeeCostsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Page {employeeCostsPagination.page} of {employeeCostsPagination.totalPages} • {employeeCostsPagination.total} items
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={employeeCostPage <= 1}
                        onClick={() => setEmployeeCostPage((prev) => Math.max(1, prev - 1))}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={employeeCostPage >= employeeCostsPagination.totalPages}
                        onClick={() => setEmployeeCostPage((prev) => prev + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

function RecurringExpenseForm({
  categories,
  vendors,
  onSubmit,
}: {
  categories: string[]
  vendors: string[]
  onSubmit: (data: Partial<RecurringExpense>) => void
}) {
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [frequency, setFrequency] = useState<RecurringExpense['frequency']>('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !startDate) return

    onSubmit({
      amount: parseFloat(amount),
      vendor: vendor || undefined,
      category: category || undefined,
      notes: notes || undefined,
      frequency,
      startDate: new Date(startDate),
    })

    setAmount('')
    setVendor('')
    setCategory('')
    setNotes('')
    setFrequency('monthly')
    setStartDate(new Date().toISOString().split('T')[0])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Recurring Expense</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="recurring-amount" className="text-xs">Amount *</Label>
          <Input
            id="recurring-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-frequency" className="text-xs">Frequency *</Label>
          <select
            id="recurring-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringExpense['frequency'])}
            className={selectClassName}
            required
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-start-date" className="text-xs">Start Date *</Label>
          <Input
            id="recurring-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-vendor" className="text-xs">Vendor</Label>
          <Input
            id="recurring-vendor"
            list="recurring-expense-vendor-options"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="h-9 text-sm"
          />
          {vendors.length > 0 && (
            <datalist id="recurring-expense-vendor-options">
              {vendors.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-category" className="text-xs">Category</Label>
          <Input
            id="recurring-category"
            list="recurring-expense-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 text-sm"
          />
          {categories.length > 0 && (
            <datalist id="recurring-expense-category-options">
              {categories.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor="recurring-notes" className="text-xs">Notes</Label>
          <Input
            id="recurring-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>
      <Button type="submit" className="w-full">Save Recurring Expense</Button>
    </form>
  )
}

function RecurringEmployeeCostForm({
  users,
  vendors,
  categories,
  onSubmit,
}: {
  users: Array<{ id: string; name: string }>
  vendors: string[]
  categories: string[]
  onSubmit: (data: Partial<RecurringEmployeeCost>) => void
}) {
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')
  const [frequency, setFrequency] = useState<RecurringEmployeeCost['frequency']>('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !amount || !startDate) return

    onSubmit({
      employeeId,
      amount: parseFloat(amount),
      vendor: vendor || undefined,
      category: category || undefined,
      frequency,
      startDate: new Date(startDate),
    })

    setEmployeeId('')
    setAmount('')
    setVendor('')
    setCategory('')
    setFrequency('monthly')
    setStartDate(new Date().toISOString().split('T')[0])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Recurring Employee Cost</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="recurring-employee" className="text-xs">Employee *</Label>
          <select
            id="recurring-employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className={selectClassName}
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
        <div className="space-y-2">
          <Label htmlFor="recurring-employee-amount" className="text-xs">Amount *</Label>
          <Input
            id="recurring-employee-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-employee-frequency" className="text-xs">Frequency *</Label>
          <select
            id="recurring-employee-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringEmployeeCost['frequency'])}
            className={selectClassName}
            required
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-employee-start-date" className="text-xs">Start Date *</Label>
          <Input
            id="recurring-employee-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-employee-vendor" className="text-xs">Vendor</Label>
          <Input
            id="recurring-employee-vendor"
            list="recurring-employee-cost-vendor-options"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="h-9 text-sm"
          />
          {vendors.length > 0 && (
            <datalist id="recurring-employee-cost-vendor-options">
              {vendors.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-employee-category" className="text-xs">Category</Label>
          <Input
            id="recurring-employee-category"
            list="recurring-employee-cost-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 text-sm"
          />
          {categories.length > 0 && (
            <datalist id="recurring-employee-cost-category-options">
              {categories.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
      </div>
      <Button type="submit" className="w-full">Save Recurring Employee Cost</Button>
    </form>
  )
}

// Simple Expense Form Component
function ExpenseForm({
  categories,
  vendors,
  onSubmit,
}: {
  categories: string[]
  vendors: string[]
  onSubmit: (data: Partial<Expense>) => void
}) {
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !effectiveDate) return

    onSubmit({
      amount: parseFloat(amount),
      vendor: vendor || undefined,
      category: category || undefined,
      notes: description || undefined,
      effectiveDate: new Date(effectiveDate),
    })

    // Reset form
    setAmount('')
    setVendor('')
    setCategory('')
    setDescription('')
    setEffectiveDate(new Date().toISOString().split('T')[0])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4" />
        <h3 className="text-sm font-semibold">One-off Expense</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-xs">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveDate" className="text-xs">Date *</Label>
          <Input
            id="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendor" className="text-xs">Vendor</Label>
          <Input
            id="vendor"
            list="expense-vendor-options"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="h-9 text-sm"
          />
          {vendors.length > 0 && (
            <datalist id="expense-vendor-options">
              {vendors.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="text-xs">Category</Label>
          <Input
            id="category"
            list="expense-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 text-sm"
          />
          {categories.length > 0 && (
            <datalist id="expense-category-options">
              {categories.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs">Notes</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-9 text-sm"
        />
      </div>
      <Button type="submit" className="w-full">Save Expense</Button>
    </form>
  )
}

// Simple Employee Cost Form Component
function EmployeeCostForm({
  users,
  vendors,
  categories,
  onSubmit,
}: {
  users: Array<{ id: string; name: string }>
  vendors: string[]
  categories: string[]
  onSubmit: (data: Partial<EmployeeCost>) => void
}) {
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !amount || !effectiveDate) return

    onSubmit({
      employeeId,
      amount: parseFloat(amount),
      vendor: vendor || undefined,
      category: category || undefined,
      effectiveDate: new Date(effectiveDate),
    })

    // Reset form
    setEmployeeId('')
    setAmount('')
    setVendor('')
    setCategory('')
    setEffectiveDate(new Date().toISOString().split('T')[0])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4" />
        <h3 className="text-sm font-semibold">One-off Employee Cost</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="employeeId" className="text-xs">Employee *</Label>
          <select
            id="employeeId"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className={selectClassName}
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
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-xs">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveDate" className="text-xs">Date Paid *</Label>
          <Input
            id="effectiveDate"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendor" className="text-xs">Vendor</Label>
          <Input
            id="vendor"
            list="employee-cost-vendor-options"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="h-9 text-sm"
          />
          {vendors.length > 0 && (
            <datalist id="employee-cost-vendor-options">
              {vendors.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="text-xs">Category</Label>
          <Input
            id="category"
            list="employee-cost-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 text-sm"
          />
          {categories.length > 0 && (
            <datalist id="employee-cost-category-options">
              {categories.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
      </div>
      <Button type="submit" className="w-full">Save Employee Cost</Button>
    </form>
  )
}
