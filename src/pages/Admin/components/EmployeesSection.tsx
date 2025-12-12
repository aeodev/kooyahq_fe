import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2, Save, X, Loader2, Trash2, Search, Download, ChevronLeft, ChevronRight, Filter, X as XIcon, UserPlus } from 'lucide-react'
import { useEmployees, useUpdateEmployee, useDeleteEmployee, useCreateClient } from '@/hooks/admin.hooks'
import type { User } from '@/types/user'
import { toast } from 'sonner'
import axiosInstance from '@/utils/axios.instance'
import { EXPORT_USERS } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'

export function EmployeesSection() {
  const can = useAuthStore((state) => state.can)
  const canReadUsers = can(PERMISSIONS.USER_READ) || can(PERMISSIONS.USER_FULL_ACCESS)
  const canUpdateUsers = can(PERMISSIONS.USER_UPDATE) || can(PERMISSIONS.USER_FULL_ACCESS)
  const canDeleteUsers = can(PERMISSIONS.USER_DELETE) || can(PERMISSIONS.USER_FULL_ACCESS)
  const canExportUsers = can(PERMISSIONS.ADMIN_EXPORT) || can(PERMISSIONS.ADMIN_FULL_ACCESS)
  const { data: employees, pagination, loading, error, fetchEmployees } = useEmployees()
  const { updateEmployee, loading: updating } = useUpdateEmployee()
  const { deleteEmployee } = useDeleteEmployee()
  const { createClient, loading: creatingClient } = useCreateClient()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ name: string; email: string; position: string; birthday: string }>({
    name: '',
    email: '',
    position: '',
    birthday: '',
  })
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [positionFilter, setPositionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'busy' | 'away' | 'offline'>('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    password: '',
    clientCompanyId: '',
  })
  const [clientFormErrors, setClientFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!canReadUsers) return
    fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
  }, [currentPage, searchQuery, fetchEmployees, canReadUsers])

  // Filter employees based on filters
  const filteredEmployees = useMemo(() => {
    let filtered = employees

    if (positionFilter) {
      const query = positionFilter.toLowerCase()
      filtered = filtered.filter((emp) => emp.position?.toLowerCase().includes(query))
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((emp) => emp.status === statusFilter)
    }

    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter)
      filtered = filtered.filter((emp) => {
        const createdAt = new Date(emp.createdAt)
        return createdAt >= fromDate
      })
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((emp) => {
        const createdAt = new Date(emp.createdAt)
        return createdAt <= toDate
      })
    }

    return filtered
  }, [employees, positionFilter, statusFilter, dateFromFilter, dateToFilter])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!editData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!editData.email.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(editData.email)) {
        errors.email = 'Invalid email format'
      }
    }

    if (editData.birthday) {
      const birthdayDate = new Date(editData.birthday)
      const today = new Date()
      if (birthdayDate > today) {
        errors.birthday = 'Birthday cannot be in the future'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const startEdit = (employee: User) => {
    if (!canUpdateUsers) return
    setEditingId(employee.id)
    setEditingEmployee(employee)
    setEditData({
      name: employee.name,
      email: employee.email,
      position: employee.position || '',
      birthday: employee.birthday ? employee.birthday.split('T')[0] : '',
    })
    setValidationErrors({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingEmployee(null)
    setEditData({ name: '', email: '', position: '', birthday: '' })
    setValidationErrors({})
  }

  const handleSave = async (employeeId: string) => {
    if (!canUpdateUsers) return
    if (!validateForm()) {
      return
    }

    if (!editingEmployee) return

    const updates: { name?: string; email?: string; position?: string; birthday?: string } = {}

    if (editData.name.trim() !== editingEmployee.name) {
      updates.name = editData.name.trim()
    }
    if (editData.email.trim() !== editingEmployee.email) {
      updates.email = editData.email.trim()
    }
    if (editData.position.trim() !== (editingEmployee.position || '')) {
      updates.position = editData.position.trim() || undefined
    }
    const currentBirthday = editingEmployee.birthday
    const currentBirthdayDate = currentBirthday ? currentBirthday.split('T')[0] : ''
    if (editData.birthday !== currentBirthdayDate) {
      updates.birthday = editData.birthday ? editData.birthday : undefined
    }
    if (Object.keys(updates).length === 0) {
      cancelEdit()
      return
    }

    const result = await updateEmployee(employeeId, updates)

    if (result) {
      toast.success('Employee updated successfully')
      cancelEdit()
      fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
    } else {
      toast.error('Failed to update employee')
    }
  }

  const handleDelete = async (employeeId: string) => {
    if (!canDeleteUsers) return
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return
    }

    setDeletingUserId(employeeId)
    try {
      const success = await deleteEmployee(employeeId)

      if (success) {
        toast.success('Employee deleted successfully')
        if (editingId === employeeId) {
          cancelEdit()
        }
        fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
      } else {
        toast.error('Failed to delete employee')
      }
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleSelectAll = () => {
    if (!canDeleteUsers) return
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    if (!canDeleteUsers) return
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = async () => {
    if (!canDeleteUsers) return
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} employee(s)? This action cannot be undone.`)) {
      return
    }

    setDeletingUserId('bulk')
    try {
      const promises = Array.from(selectedIds).map((id) => deleteEmployee(id))
      const results = await Promise.all(promises)
      const successCount = results.filter((r) => r).length

      if (successCount > 0) {
        toast.success(`${successCount} employee(s) deleted successfully`)
        setSelectedIds(new Set())
        fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
      } else {
        toast.error('Failed to delete employees')
      }
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    if (!canExportUsers) return
    try {
      const response = await axiosInstance.get(EXPORT_USERS(format), {
        responseType: format === 'csv' ? 'blob' : 'json',
      })

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'users.csv')
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } else {
        const dataStr = JSON.stringify(response.data.data, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'users.json')
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      }

      toast.success(`Users exported as ${format.toUpperCase()}`)
    } catch (err: any) {
      toast.error('Failed to export users')
    }
  }

  const clearFilters = () => {
    setPositionFilter('')
    setStatusFilter('all')
    setDateFromFilter('')
    setDateToFilter('')
  }

  const validateClientForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!clientForm.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!clientForm.email.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(clientForm.email)) {
        errors.email = 'Invalid email format'
      }
    }

    if (!clientForm.password) {
      errors.password = 'Password is required'
    } else if (clientForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    }

    setClientFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateClient = async () => {
    if (!validateClientForm()) {
      return
    }

    const result = await createClient({
      name: clientForm.name.trim(),
      email: clientForm.email.trim(),
      password: clientForm.password,
      clientCompanyId: clientForm.clientCompanyId.trim() || undefined,
    })

    if (result) {
      toast.success('Client created successfully')
      setShowCreateClient(false)
      setClientForm({ name: '', email: '', password: '', clientCompanyId: '' })
      setClientFormErrors({})
      fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
    } else {
      toast.error('Failed to create client')
    }
  }

  const saving = updating || deletingUserId !== null
  const totalPages = pagination?.totalPages || 1

  if (!canReadUsers) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">You do not have permission to view employees.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Employees</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage employee details and positions</p>
        </div>
        {canExportUsers && (
          <div className="flex gap-2">
            <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <Button onClick={() => handleExport('json')} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export JSON</span>
              <span className="sm:hidden">JSON</span>
            </Button>
          </div>
        )}
      </div>

      {/* Create Client Modal */}
      {showCreateClient && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create Client</h3>
                <Button onClick={() => {
                  setShowCreateClient(false)
                  setClientForm({ name: '', email: '', password: '', clientCompanyId: '' })
                  setClientFormErrors({})
                }} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Name *</Label>
                  <Input
                    id="client-name"
                    value={clientForm.name}
                    onChange={(e) => {
                      setClientForm({ ...clientForm, name: e.target.value })
                      if (clientFormErrors.name) {
                        setClientFormErrors({ ...clientFormErrors, name: '' })
                      }
                    }}
                    placeholder="Client name"
                    className={clientFormErrors.name ? 'border-destructive' : ''}
                  />
                  {clientFormErrors.name && (
                    <p className="text-xs text-destructive">{clientFormErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email *</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => {
                      setClientForm({ ...clientForm, email: e.target.value })
                      if (clientFormErrors.email) {
                        setClientFormErrors({ ...clientFormErrors, email: '' })
                      }
                    }}
                    placeholder="client@example.com"
                    className={clientFormErrors.email ? 'border-destructive' : ''}
                  />
                  {clientFormErrors.email && (
                    <p className="text-xs text-destructive">{clientFormErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Password *</Label>
                  <Input
                    id="client-password"
                    type="password"
                    value={clientForm.password}
                    onChange={(e) => {
                      setClientForm({ ...clientForm, password: e.target.value })
                      if (clientFormErrors.password) {
                        setClientFormErrors({ ...clientFormErrors, password: '' })
                      }
                    }}
                    placeholder="Minimum 8 characters"
                    className={clientFormErrors.password ? 'border-destructive' : ''}
                  />
                  {clientFormErrors.password && (
                    <p className="text-xs text-destructive">{clientFormErrors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-company">Company ID (Optional)</Label>
                  <Input
                    id="client-company"
                    value={clientForm.clientCompanyId}
                    onChange={(e) => setClientForm({ ...clientForm, clientCompanyId: e.target.value })}
                    placeholder="Company identifier"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateClient} disabled={creatingClient} size="sm">
                    {creatingClient ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Client
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCreateClient(false)
                      setClientForm({ name: '', email: '', password: '', clientCompanyId: '' })
                      setClientFormErrors({})
                    }}
                    variant="outline"
                    size="sm"
                    disabled={creatingClient}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search employees by name, email, or position..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setCurrentPage(1)
          }}
          className="pl-10"
        />
      </div>

      {/* Advanced Filters */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          size="sm"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        {(positionFilter || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
          <Button onClick={clearFilters} variant="ghost" size="sm">
            <XIcon className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position-filter">Position</Label>
                <Input
                  id="position-filter"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  placeholder="Filter by position"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="away">Away</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-from">Date From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">Date To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm font-medium">
                {selectedIds.size} employee(s) selected
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleBulkDelete}
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={saving || deletingUserId !== null || !canDeleteUsers}
                >
                  {deletingUserId !== null ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {typeof error.message === 'string' ? error.message : error.message.join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery || positionFilter || statusFilter !== 'all' || dateFromFilter || dateToFilter
                ? 'No employees found matching your filters.'
                : 'No employees yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id}>
                <CardContent className="pt-6">
                  {editingId === employee.id ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${employee.id}`}>Name *</Label>
                        <Input
                          id={`name-${employee.id}`}
                          value={editData.name}
                          onChange={(e) => {
                            setEditData({ ...editData, name: e.target.value })
                            if (validationErrors.name) {
                              setValidationErrors({ ...validationErrors, name: '' })
                            }
                          }}
                          placeholder="Employee name"
                          className={validationErrors.name ? 'border-destructive' : ''}
                        />
                        {validationErrors.name && (
                          <p className="text-xs text-destructive">{validationErrors.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`email-${employee.id}`}>Email *</Label>
                        <Input
                          id={`email-${employee.id}`}
                          type="email"
                          value={editData.email}
                          onChange={(e) => {
                            setEditData({ ...editData, email: e.target.value })
                            if (validationErrors.email) {
                              setValidationErrors({ ...validationErrors, email: '' })
                            }
                          }}
                          placeholder="Employee email"
                          className={validationErrors.email ? 'border-destructive' : ''}
                        />
                        {validationErrors.email && (
                          <p className="text-xs text-destructive">{validationErrors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`position-${employee.id}`}>Position</Label>
                        <Input
                          id={`position-${employee.id}`}
                          value={editData.position}
                          onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                          placeholder="e.g., Software Engineer, Product Manager"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`birthday-${employee.id}`}>Birthday</Label>
                        <Input
                          id={`birthday-${employee.id}`}
                          type="date"
                          value={editData.birthday}
                          onChange={(e) => {
                            setEditData({ ...editData, birthday: e.target.value })
                            if (validationErrors.birthday) {
                              setValidationErrors({ ...validationErrors, birthday: '' })
                            }
                          }}
                          className={validationErrors.birthday ? 'border-destructive' : ''}
                        />
                        {validationErrors.birthday && (
                          <p className="text-xs text-destructive">{validationErrors.birthday}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSave(employee.id)} disabled={saving} size="sm">
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button onClick={cancelEdit} variant="outline" size="sm" disabled={saving}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(employee.id)}
                        onChange={() => handleSelectOne(employee.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        disabled={!canDeleteUsers}
                      />
                      <div className="flex-1 flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg">{employee.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                          {employee.position && (
                            <p className="text-sm font-medium text-foreground">{employee.position}</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button onClick={() => startEdit(employee)} variant="outline" size="sm" disabled={!canUpdateUsers}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            onClick={() => handleDelete(employee.id)}
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingUserId === employee.id || !canDeleteUsers}
                          >
                            {deletingUserId === employee.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1}-
                {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} employees
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                  variant="outline"
                  size="sm"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Select All */}
          {filteredEmployees.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label className="text-sm text-muted-foreground cursor-pointer">
                Select all ({filteredEmployees.length})
              </Label>
            </div>
          )}
        </>
      )}
    </div>
  )
}
