import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Edit2, Save, X, Loader2, Trash2, Search, Download, ChevronLeft, Filter, X as XIcon, UserPlus } from 'lucide-react'
import { useEmployees, useUpdateEmployee, useDeleteEmployee, useCreateClient } from '@/hooks/user-management.hooks'
import type { User } from '@/types/user'
import { toast } from 'sonner'
import axiosInstance from '@/utils/axios.instance'
import { EXPORT_USERS } from '@/utils/api.routes'
import { PERMISSION_LIST } from '@/constants/permissions'

type UsersSectionProps = {
  canViewUsers: boolean
  canManageUsers: boolean
}

export function UsersSection({ canViewUsers, canManageUsers }: UsersSectionProps) {
  const canExportUsers = canManageUsers
  const { data: employees, pagination, loading, error, fetchEmployees } = useEmployees()
  const { updateEmployee, loading: updating } = useUpdateEmployee()
  const { deleteEmployee } = useDeleteEmployee()
  const { createClient, loading: creatingClient } = useCreateClient()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    name: string
    email: string
    position: string
    birthday: string
    permissions: string[]
  }>({
    name: '',
    email: '',
    position: '',
    birthday: '',
    permissions: [],
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
  const [expandedPermissionGroups, setExpandedPermissionGroups] = useState<Set<string>>(new Set())

  const permissionGroups = useMemo(() => {
    const groups: Record<string, { label: string; permissions: { value: string; label: string }[] }> = {}
    PERMISSION_LIST.forEach(({ value, label }) => {
      const [prefix] = value.split(':')
      if (!groups[prefix]) {
        const friendly = prefix.replace(/-/g, ' ')
        groups[prefix] = {
          label: friendly.replace(/\b\w/g, (c) => c.toUpperCase()),
          permissions: [],
        }
      }
      groups[prefix].permissions.push({ value, label })
    })
    return Object.entries(groups).map(([key, group]) => ({ key, ...group }))
  }, [])

  useEffect(() => {
    if (!canViewUsers) return
    fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
  }, [currentPage, searchQuery, fetchEmployees, canViewUsers])

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
    if (!canManageUsers) return
    setEditingId(employee.id)
    setEditingEmployee(employee)
    setEditData({
      name: employee.name,
      email: employee.email,
      position: employee.position || '',
      birthday: employee.birthday ? employee.birthday.split('T')[0] : '',
      permissions: employee.permissions || [],
    })
    setValidationErrors({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingEmployee(null)
    setEditData({ name: '', email: '', position: '', birthday: '', permissions: [] })
    setValidationErrors({})
  }

  const handleSave = async (employeeId: string) => {
    if (!canManageUsers) return
    if (!validateForm()) {
      return
    }

    if (!editingEmployee) return

    const updates: {
      name?: string
      email?: string
      position?: string
      birthday?: string
      permissions?: string[]
    } = {}

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
    const currentPerms = Array.isArray(editingEmployee.permissions) ? editingEmployee.permissions : []
    const newPerms = Array.isArray(editData.permissions) ? editData.permissions : []
    const permsChanged =
      newPerms.length !== currentPerms.length ||
      newPerms.some((perm) => !currentPerms.includes(perm)) ||
      currentPerms.some((perm) => !newPerms.includes(perm))
    if (permsChanged) {
      updates.permissions = newPerms
    }
    if (Object.keys(updates).length === 0) {
      cancelEdit()
      return
    }

    const result = await updateEmployee(employeeId, updates)

    if (result) {
      toast.success('User updated successfully')
      cancelEdit()
      fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
    } else {
      toast.error('Failed to update user')
    }
  }

  const handleDelete = async (employeeId: string) => {
    if (!canManageUsers) return
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    setDeletingUserId(employeeId)
    try {
      const success = await deleteEmployee(employeeId)

      if (success) {
        toast.success('User deleted successfully')
        if (editingId === employeeId) {
          cancelEdit()
        }
        fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
      } else {
        toast.error('Failed to delete user')
      }
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleSelectAll = () => {
    if (!canManageUsers) return
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    if (!canManageUsers) return
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = async () => {
    if (!canManageUsers) return
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} user(s)? This action cannot be undone.`)) {
      return
    }

    setDeletingUserId('bulk')
    try {
      const promises = Array.from(selectedIds).map((id) => deleteEmployee(id))
      const results = await Promise.all(promises)
      const successCount = results.filter((r) => r).length

      if (successCount > 0) {
        toast.success(`${successCount} user(s) deleted successfully`)
        setSelectedIds(new Set())
        fetchEmployees({ page: currentPage, limit: pageSize, search: searchQuery || undefined })
      } else {
        toast.error('Failed to delete users')
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
    if (!canManageUsers) return
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

  const formatDate = (value?: string) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    return date.toLocaleDateString()
  }

  const togglePermission = (permission: string, groupPermissions: string[]) => {
    setEditData((prev) => {
      const current = new Set(prev.permissions)
      const isFullAccess = permission.endsWith(':fullAccess')
      const currentlyChecked = current.has(permission)

      if (isFullAccess) {
        if (currentlyChecked) {
          groupPermissions.forEach((perm) => current.delete(perm))
        } else {
          groupPermissions.forEach((perm) => current.add(perm))
        }
      } else {
        if (currentlyChecked) {
          current.delete(permission)
        } else {
          current.add(permission)
        }
        // If a child is unchecked, also ensure prefix fullAccess is off
        const [prefix] = permission.split(':')
        const fullAccessKey = `${prefix}:fullAccess`
        if (!currentlyChecked && current.has(fullAccessKey)) {
          // keep fullAccess if already present
        }
        if (currentlyChecked && current.has(fullAccessKey)) {
          // unchecking a child should not uncheck fullAccess automatically
        }
      }

      return { ...prev, permissions: Array.from(current) }
    })
  }

  const toggleGroup = (permissions: string[]) => {
    setEditData((prev) => {
      const current = new Set(prev.permissions)
      const hasAll = permissions.every((perm) => current.has(perm))
      if (hasAll) {
        permissions.forEach((perm) => current.delete(perm))
      } else {
        permissions.forEach((perm) => current.add(perm))
      }
      return { ...prev, permissions: Array.from(current) }
    })
  }

  const isGroupChecked = (permissions: string[]) => {
    if (!permissions.length) return false
    return permissions.every((perm) => editData.permissions.includes(perm))
  }

  const isGroupIndeterminate = (permissions: string[]) => {
    const selectedCount = permissions.filter((perm) => editData.permissions.includes(perm)).length
    return selectedCount > 0 && selectedCount < permissions.length
  }

  const toggleGroupExpanded = (key: string) => {
    setExpandedPermissionGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const saving = updating || deletingUserId !== null
  const totalPages = pagination?.totalPages || 1

  if (!canViewUsers) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">You do not have permission to view users.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground mt-1">Review user details and access levels</p>
          {!canManageUsers && (
            <p className="text-xs text-muted-foreground mt-1">View-only access. Editing controls are hidden.</p>
          )}
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
      {canManageUsers && showCreateClient && (
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
          placeholder="Search users by name, email, or position..."
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
      {selectedIds.size > 0 && canManageUsers && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm font-medium">
                {selectedIds.size} user(s) selected
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleBulkDelete}
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={saving || deletingUserId !== null || !canManageUsers}
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
                ? 'No users found matching your filters.'
                : 'No users yet.'}
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
                          placeholder="User name"
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
                          placeholder="User email"
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
                      <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="space-y-2 rounded-md border p-3">
                          {permissionGroups.map((group) => {
                            const groupPermValues = group.permissions.map((p) => p.value)
                            const checked = isGroupChecked(groupPermValues)
                            const indeterminate = isGroupIndeterminate(groupPermValues)
                            return (
                              <div key={group.key} className="space-y-1 border-b last:border-b-0 pb-2 last:pb-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      ref={(input) => {
                                        if (input) input.indeterminate = indeterminate
                                      }}
                                      onChange={() => toggleGroup(groupPermValues)}
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => toggleGroupExpanded(group.key)}
                                      className="flex items-center gap-1 text-sm font-medium"
                                    >
                                      {expandedPermissionGroups.has(group.key) ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                      {group.label}
                                    </button>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {groupPermValues.filter((p) => editData.permissions.includes(p)).length}/
                                    {groupPermValues.length}
                                  </span>
                                </div>
                                {expandedPermissionGroups.has(group.key) && (
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {group.permissions.map((perm) => (
                                      <label key={perm.value} className="flex items-center gap-2 text-sm ml-6">
                                        <input
                                          type="checkbox"
                                          checked={editData.permissions.includes(perm.value)}
                                          onChange={() => togglePermission(perm.value, groupPermValues)}
                                          className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <span>{perm.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
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
                      {canManageUsers && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(employee.id)}
                          onChange={() => handleSelectOne(employee.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-base sm:text-lg">{employee.name}</h3>
                              {employee.status && (
                                <Badge variant="outline" className="text-[11px] capitalize">
                                  {employee.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                        {employee.position && (
                          <p className="text-sm font-medium text-foreground">{employee.position}</p>
                        )}
                        {employee.bio && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{employee.bio}</p>
                        )}
                        {employee.clientCompanyId && (
                          <p className="text-xs text-muted-foreground">Client company: {employee.clientCompanyId}</p>
                        )}
                            <p className="text-xs text-muted-foreground">
                              Joined {formatDate(employee.createdAt)}
                              {employee.updatedAt ? ` • Updated ${formatDate(employee.updatedAt)}` : ''}
                            </p>
                          </div>
                          {canManageUsers && (
                            <div className="flex gap-2 flex-shrink-0">
                              <Button onClick={() => startEdit(employee)} variant="outline" size="sm">
                                <Edit2 className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                onClick={() => handleDelete(employee.id)}
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deletingUserId === employee.id}
                              >
                                {deletingUserId === employee.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Permissions</p>
                          <div className="flex flex-wrap gap-2">
                            {employee.permissions?.length ? (
                              employee.permissions.map((permission) => (
                                <Badge
                                  key={`${employee.id}-${permission}`}
                                  variant="secondary"
                                  className="text-[11px] font-normal"
                                >
                                  {permission}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No permissions assigned</span>
                            )}
                          </div>
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
                {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} users
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
          {canManageUsers && filteredEmployees.length > 0 && (
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
