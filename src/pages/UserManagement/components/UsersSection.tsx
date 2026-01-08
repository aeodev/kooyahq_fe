import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Edit2,
  Filter,
  Loader2,
  Minus,
  Search,
  Shield,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEmployees, useUpdateEmployee, useDeleteEmployee, useCreateUser } from '@/hooks/user-management.hooks'
import type { User } from '@/types/user'
import { toast } from 'sonner'
import axiosInstance from '@/utils/axios.instance'
import { EXPORT_USERS } from '@/utils/api.routes'
import { PERMISSION_LIST, PERMISSIONS } from '@/constants/permissions'

type UsersSectionProps = {
  canViewUsers: boolean
  canManageUsers: boolean
}

const MAX_USERS_FETCH = 500
const SEARCH_DEBOUNCE_MS = 300

const STATUS_OPTIONS: Array<{ value: 'online' | 'busy' | 'away' | 'offline'; label: string }> = [
  { value: 'away', label: 'Away' },
  { value: 'busy', label: 'Busy' },
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
]

const DEFAULT_NEW_USER_PERMISSIONS = [
  PERMISSIONS.AI_NEWS_READ,
  PERMISSIONS.GALLERY_READ,
  PERMISSIONS.GAME_FULL_ACCESS,
  PERMISSIONS.MEDIA_UPLOAD,
  PERMISSIONS.MEDIA_READ,
  PERMISSIONS.MEDIA_DELETE,
  PERMISSIONS.POST_READ,
  PERMISSIONS.POST_CREATE,
  PERMISSIONS.POST_UPDATE,
  PERMISSIONS.POST_DELETE,
  PERMISSIONS.POST_COMMENT_READ,
  PERMISSIONS.POST_COMMENT_CREATE,
  PERMISSIONS.POST_COMMENT_UPDATE,
  PERMISSIONS.POST_COMMENT_DELETE,
  PERMISSIONS.POST_REACT,
  PERMISSIONS.POST_POLL_VOTE,
  PERMISSIONS.NOTIFICATION_READ,
  PERMISSIONS.NOTIFICATION_COUNT,
  PERMISSIONS.LINK_PREVIEW_FETCH,
  // Basic collaboration permissions (same as Client template)
  PERMISSIONS.MEET_FULL_ACCESS,
  PERMISSIONS.ANNOUNCEMENT_READ,
  PERMISSIONS.BOARD_VIEW,
  PERMISSIONS.CESIUM_TOKEN,
  // Note: No TIME_ENTRY, PRESENCE, or AI_ASSISTANT by default
  // Admins must explicitly assign Employee template for these
]

const PERMISSION_TEMPLATES: Array<{ label: string; description: string; permissions: string[] }> = [
  {
    label: 'SuperAdmin',
    description: 'System-wide access override',
    permissions: [PERMISSIONS.SYSTEM_FULL_ACCESS, PERMISSIONS.SYSTEM_LOGS],
  },
  {
    label: 'Admin',
    description: 'Manage projects, content, and system tools',
    permissions: [
      PERMISSIONS.PROJECTS_MANAGE,
      PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
      PERMISSIONS.BOARD_FULL_ACCESS,
      PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS,
      PERMISSIONS.AI_NEWS_FULL_ACCESS,
      PERMISSIONS.GALLERY_FULL_ACCESS,
      PERMISSIONS.TIME_ENTRY_FULL_ACCESS,
      PERMISSIONS.MEDIA_FULL_ACCESS,
      PERMISSIONS.POST_FULL_ACCESS,
      PERMISSIONS.NOTIFICATION_FULL_ACCESS,
      PERMISSIONS.MEET_FULL_ACCESS,
      PERMISSIONS.GAME_FULL_ACCESS,
      PERMISSIONS.PRESENCE_FULL_ACCESS,
      PERMISSIONS.NOTIFICATION_READ,
      PERMISSIONS.NOTIFICATION_COUNT,
      PERMISSIONS.LINK_PREVIEW_FETCH,
      PERMISSIONS.CESIUM_TOKEN,
      PERMISSIONS.AI_ASSISTANT_ACCESS,
    ],
  },
  {
    label: 'Employee',
    description: 'Core collaboration and delivery permissions',
    permissions: [
      PERMISSIONS.SERVER_MANAGEMENT_USE,
      PERMISSIONS.SERVER_MANAGEMENT_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.BOARD_VIEW,
      PERMISSIONS.AI_NEWS_READ,
      PERMISSIONS.GALLERY_READ,
      PERMISSIONS.GALLERY_CREATE,
      PERMISSIONS.GALLERY_BULK_CREATE,
      PERMISSIONS.MEET_FULL_ACCESS,
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.TIME_ENTRY_READ,
      PERMISSIONS.TIME_ENTRY_ANALYTICS,
      PERMISSIONS.TIME_ENTRY_CREATE,
      PERMISSIONS.TIME_ENTRY_UPDATE,
      PERMISSIONS.TIME_ENTRY_DELETE,
      PERMISSIONS.GAME_FULL_ACCESS,
      PERMISSIONS.PRESENCE_FULL_ACCESS,
      PERMISSIONS.MEDIA_UPLOAD,
      PERMISSIONS.MEDIA_READ,
      PERMISSIONS.MEDIA_DELETE,
      PERMISSIONS.POST_READ,
      PERMISSIONS.POST_CREATE,
      PERMISSIONS.POST_UPDATE,
      PERMISSIONS.POST_DELETE,
      PERMISSIONS.POST_COMMENT_READ,
      PERMISSIONS.POST_COMMENT_CREATE,
      PERMISSIONS.POST_COMMENT_UPDATE,
      PERMISSIONS.POST_COMMENT_DELETE,
      PERMISSIONS.POST_REACT,
      PERMISSIONS.POST_POLL_VOTE,
      PERMISSIONS.NOTIFICATION_READ,
      PERMISSIONS.NOTIFICATION_COUNT,
      PERMISSIONS.LINK_PREVIEW_FETCH,
      PERMISSIONS.CESIUM_TOKEN,
      PERMISSIONS.AI_ASSISTANT_ACCESS,
    ],
  },
  {
    label: 'Client',
    description: 'Client-facing access to collaboration tools',
    permissions: [
      PERMISSIONS.AI_NEWS_READ,
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.BOARD_VIEW,
      PERMISSIONS.GALLERY_READ,
      PERMISSIONS.MEET_FULL_ACCESS,
      PERMISSIONS.GAME_FULL_ACCESS,
      PERMISSIONS.MEDIA_UPLOAD,
      PERMISSIONS.MEDIA_READ,
      PERMISSIONS.MEDIA_DELETE,
      PERMISSIONS.POST_READ,
      PERMISSIONS.POST_CREATE,
      PERMISSIONS.POST_UPDATE,
      PERMISSIONS.POST_DELETE,
      PERMISSIONS.POST_COMMENT_READ,
      PERMISSIONS.POST_COMMENT_CREATE,
      PERMISSIONS.POST_COMMENT_UPDATE,
      PERMISSIONS.POST_COMMENT_DELETE,
      PERMISSIONS.POST_REACT,
      PERMISSIONS.POST_POLL_VOTE,
      PERMISSIONS.NOTIFICATION_READ,
      PERMISSIONS.NOTIFICATION_COUNT,
      PERMISSIONS.LINK_PREVIEW_FETCH,
      PERMISSIONS.CESIUM_TOKEN,
    ],
  },
  {
    label: 'N/A (Default)',
    description: 'Default permissions for newly registered users',
    permissions: DEFAULT_NEW_USER_PERMISSIONS,
  },
]

const formatDate = (value?: string) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  return date.toLocaleDateString()
}

const normalizeText = (value?: string | null) => (value || '').trim().toLowerCase()

export function UsersSection({ canViewUsers, canManageUsers }: UsersSectionProps) {
  const canExportUsers = canManageUsers
  const { data: employees, loading, error, fetchEmployees } = useEmployees()
  const { updateEmployee, loading: updating } = useUpdateEmployee()
  const { deleteEmployee } = useDeleteEmployee()
  const { createUser, loading: creatingUser } = useCreateUser()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [positionFilter, setPositionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'busy' | 'away' | 'offline'>('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserData, setCreateUserData] = useState<{
    name: string
    email: string
    position: string
    birthday: string
    monthlySalary: string
    permissions: string[]
  }>({
    name: '',
    email: '',
    position: '',
    birthday: '',
    monthlySalary: '',
    permissions: DEFAULT_NEW_USER_PERMISSIONS,
  })
  const [createValidationErrors, setCreateValidationErrors] = useState<Record<string, string>>({})
  const [createPermissionSearch, setCreatePermissionSearch] = useState('')

  const [editingEmployee, setEditingEmployee] = useState<User | null>(null)
  const [editData, setEditData] = useState<{
    name: string
    email: string
    position: string
    birthday: string
    monthlySalary: string
    permissions: string[]
  }>({
    name: '',
    email: '',
    position: '',
    birthday: '',
    monthlySalary: '',
    permissions: [],
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [expandedPermissionGroups, setExpandedPermissionGroups] = useState<Set<string>>(new Set())
  const [permissionSearch, setPermissionSearch] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<{ mode: 'single' | 'bulk'; user?: User | null } | null>(null)

  const permissionGroups = useMemo(() => {
    const groups: Record<string, { label: string; permissions: { value: string; label: string }[] }> = {}
    PERMISSION_LIST.forEach(({ value, label }) => {
      const [prefix] = value.split(':')
      if (!groups[prefix]) {
        const friendly = prefix.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ')
        groups[prefix] = {
          label: friendly.replace(/\b\w/g, (c) => c.toUpperCase()),
          permissions: [],
        }
      }
      groups[prefix].permissions.push({ value, label })
    })
    return Object.entries(groups)
      .map(([key, group]) => ({
        key,
        ...group,
        permissions: group.permissions.sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  const permissionGroupMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    permissionGroups.forEach((group) => {
      map[group.key] = group.permissions.map((p) => p.value)
    })
    return map
  }, [permissionGroups])

  const permissionLookup = useMemo(() => new Set<string>(PERMISSION_LIST.map((p) => p.value)), [])

  useEffect(() => {
    if (!canViewUsers) return
    fetchEmployees({ page: 1, limit: MAX_USERS_FETCH })
  }, [fetchEmployees, canViewUsers])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(normalizeText(searchInput)), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  const positionOptions = useMemo(() => {
    const unique = new Set(
      employees
        .map((emp) => emp.position)
        .filter((value): value is string => !!value && value.trim().length > 0)
    )
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b))]
  }, [employees])

  const filteredEmployees = useMemo(() => {
    let list = [...employees]

    if (debouncedSearch) {
      list = list.filter((emp) => {
        const searchTarget = `${normalizeText(emp.name)} ${normalizeText(emp.email)} ${normalizeText(emp.position)}`
        return searchTarget.includes(debouncedSearch)
      })
    }

    if (positionFilter !== 'all') {
      list = list.filter((emp) => normalizeText(emp.position) === normalizeText(positionFilter))
    }

    if (statusFilter !== 'all') {
      list = list.filter((emp) => emp.status === statusFilter)
    }

    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter)
      list = list.filter((emp) => {
        const createdAt = new Date(emp.createdAt)
        return createdAt >= fromDate
      })
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter)
      toDate.setHours(23, 59, 59, 999)
      list = list.filter((emp) => {
        const createdAt = new Date(emp.createdAt)
        return createdAt <= toDate
      })
    }

    return list.sort((a, b) => {
      const nameA = normalizeText(a.name) || normalizeText(a.email)
      const nameB = normalizeText(b.name) || normalizeText(b.email)
      return nameA.localeCompare(nameB)
    })
  }, [employees, debouncedSearch, positionFilter, statusFilter, dateFromFilter, dateToFilter])

  const validateUserForm = (): boolean => {
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

  const validateCreateUserForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!createUserData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!createUserData.email.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(createUserData.email)) {
        errors.email = 'Invalid email format'
      }
    }

    if (createUserData.birthday) {
      const birthdayDate = new Date(createUserData.birthday)
      const today = new Date()
      if (birthdayDate > today) {
        errors.birthday = 'Birthday cannot be in the future'
      }
    }

    setCreateValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const applyPermissionDependencies = (updated: Set<string>, permission: string, checked: boolean) => {
    const [prefix, action] = permission.split(':')
    const groupPerms = permissionGroupMap[prefix] || []

    if (checked) {
      updated.add(permission)
      if (action === 'fullAccess') {
        groupPerms.forEach((perm) => updated.add(perm))
      }
      if ((action === 'manage' || action === 'update') && permissionLookup.has(`${prefix}:view`)) {
        updated.add(`${prefix}:view`)
      }
    } else {
      updated.delete(permission)
      if (action === 'view') {
        Array.from(updated).forEach((perm) => {
          if (perm.startsWith(`${prefix}:`) && (perm.endsWith('manage') || perm.endsWith('update') || perm.endsWith('fullAccess'))) {
            updated.delete(perm)
          }
        })
      }
      if (action === 'fullAccess') {
        groupPerms.forEach((perm) => updated.delete(perm))
      }
    }
  }

  const normalizePermissionsWithDependencies = (perms: string[]) => {
    const updated = new Set<string>()
    perms.forEach((perm) => applyPermissionDependencies(updated, perm, true))
    return Array.from(updated)
  }

  const getDefaultCreatePermissions = () => normalizePermissionsWithDependencies(DEFAULT_NEW_USER_PERMISSIONS)

  const togglePermission = (permission: string) => {
    setEditData((prev) => {
      const updated = new Set(prev.permissions)
      const shouldCheck = !updated.has(permission)
      applyPermissionDependencies(updated, permission, shouldCheck)
      return { ...prev, permissions: Array.from(updated) }
    })
  }

  const toggleGroup = (permissions: string[]) => {
    setEditData((prev) => {
      const updated = new Set(prev.permissions)
      const hasAll = permissions.every((perm) => updated.has(perm))
      permissions.forEach((perm) => {
        applyPermissionDependencies(updated, perm, !hasAll)
      })
      return { ...prev, permissions: Array.from(updated) }
    })
  }

  const toggleCreatePermission = (permission: string) => {
    setCreateUserData((prev) => {
      const updated = new Set(prev.permissions)
      const shouldCheck = !updated.has(permission)
      applyPermissionDependencies(updated, permission, shouldCheck)
      return { ...prev, permissions: Array.from(updated) }
    })
  }

  const toggleCreateGroup = (permissions: string[]) => {
    setCreateUserData((prev) => {
      const updated = new Set(prev.permissions)
      const hasAll = permissions.every((perm) => updated.has(perm))
      permissions.forEach((perm) => {
        applyPermissionDependencies(updated, perm, !hasAll)
      })
      return { ...prev, permissions: Array.from(updated) }
    })
  }

  const isGroupChecked = (permissions: string[], sourcePermissions: string[] = editData.permissions) =>
    permissions.length > 0 && permissions.every((perm) => sourcePermissions.includes(perm))
  const isGroupIndeterminate = (permissions: string[], sourcePermissions: string[] = editData.permissions) => {
    const selectedCount = permissions.filter((perm) => sourcePermissions.includes(perm)).length
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

  const handleSelectAll = () => {
    if (!canManageUsers) return
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredEmployees.map((emp) => emp.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    if (!canManageUsers) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openEditModal = (employee: User) => {
    if (!canManageUsers) return
    setEditingEmployee(employee)
    setEditData({
      name: employee.name,
      email: employee.email,
      position: employee.position || '',
      birthday: employee.birthday ? employee.birthday.split('T')[0] : '',
      monthlySalary: employee.monthlySalary?.toString() || '',
      permissions: employee.permissions || [],
    })
    setValidationErrors({})
    setExpandedPermissionGroups(new Set())
    setPermissionSearch('')
  }

  const closeEditModal = () => {
    setEditingEmployee(null)
    setEditData({ name: '', email: '', position: '', birthday: '', monthlySalary: '', permissions: [] })
    setValidationErrors({})
  }

  const handleSave = async () => {
    if (!canManageUsers || !editingEmployee) return
    if (!validateUserForm()) return

    const updates: {
      name?: string
      email?: string
      position?: string
      birthday?: string
      monthlySalary?: number
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
    const currentBirthday = editingEmployee.birthday ? editingEmployee.birthday.split('T')[0] : ''
    if (editData.birthday !== currentBirthday) {
      updates.birthday = editData.birthday ? editData.birthday : undefined
    }
    // Handle monthly salary update
    const newSalary = editData.monthlySalary ? parseFloat(editData.monthlySalary) : 0
    const currentSalary = editingEmployee.monthlySalary || 0
    if (newSalary !== currentSalary) {
      updates.monthlySalary = newSalary
    }
    const currentPerms = Array.isArray(editingEmployee.permissions) ? editingEmployee.permissions : []
    const newPerms = Array.isArray(editData.permissions) ? editData.permissions : []
    const normalizedPerms = normalizePermissionsWithDependencies(newPerms)
    const normalizedCurrentPerms = normalizePermissionsWithDependencies(currentPerms)
    const permsChanged =
      normalizedPerms.length !== normalizedCurrentPerms.length ||
      normalizedPerms.some((perm) => !normalizedCurrentPerms.includes(perm)) ||
      normalizedCurrentPerms.some((perm) => !normalizedPerms.includes(perm))
    if (permsChanged) {
      updates.permissions = normalizedPerms
    }
    if (Object.keys(updates).length === 0) {
      closeEditModal()
      return
    }

    const result = await updateEmployee(editingEmployee.id, updates)
    if (result) {
      toast.success('User updated successfully')
      closeEditModal()
      fetchEmployees({ page: 1, limit: MAX_USERS_FETCH })
    } else {
      toast.error('Failed to update user')
    }
  }

  const handleDelete = async (employeeId: string) => {
    if (!canManageUsers) return
    setDeletingUserId(employeeId)
    try {
      const success = await deleteEmployee(employeeId)
      if (success) {
        toast.success('User deleted successfully')
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(employeeId)
          return next
        })
        fetchEmployees({ page: 1, limit: MAX_USERS_FETCH })
      } else {
        toast.error('Failed to delete user')
      }
    } finally {
      setDeletingUserId(null)
      setConfirmDelete(null)
    }
  }

  const handleBulkDelete = async () => {
    if (!canManageUsers || selectedIds.size === 0) return
    setDeletingUserId('bulk')
    try {
      const promises = Array.from(selectedIds).map((id) => deleteEmployee(id))
      const results = await Promise.all(promises)
      const successCount = results.filter((r) => r).length
      if (successCount > 0) {
        toast.success(`${successCount} user(s) deleted successfully`)
        setSelectedIds(new Set())
        fetchEmployees({ page: 1, limit: MAX_USERS_FETCH })
      } else {
        toast.error('Failed to delete users')
      }
    } finally {
      setDeletingUserId(null)
      setConfirmDelete(null)
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
    } catch (error) {
      console.error('Failed to export users', error)
      toast.error('Failed to export users')
    }
  }

  const resetCreateUserForm = () => {
    setShowCreateUserModal(false)
    setCreateUserData({
      name: '',
      email: '',
      position: '',
      birthday: '',
      monthlySalary: '',
      permissions: getDefaultCreatePermissions(),
    })
    setCreateValidationErrors({})
    setCreatePermissionSearch('')
    setExpandedPermissionGroups(new Set())
  }

  const handleCreateUser = async () => {
    if (!canManageUsers) return
    if (!validateCreateUserForm()) return

    const normalizedPerms = normalizePermissionsWithDependencies(createUserData.permissions)
    const monthlySalary = createUserData.monthlySalary ? parseFloat(createUserData.monthlySalary) : undefined
    const result = await createUser({
      name: createUserData.name.trim(),
      email: createUserData.email.trim(),
      position: createUserData.position.trim() || undefined,
      birthday: createUserData.birthday || undefined,
      monthlySalary,
      permissions: normalizedPerms,
    })

    if (result) {
      toast.success('User created successfully')
      resetCreateUserForm()
      fetchEmployees({ page: 1, limit: MAX_USERS_FETCH })
    } else {
      toast.error('Failed to create user')
    }
  }

  const clearFilters = () => {
    setPositionFilter('all')
    setStatusFilter('all')
    setDateFromFilter('')
    setDateToFilter('')
  }

  const saving = updating || deletingUserId !== null

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground mt-1">Minimal table view for user access and roles</p>
          {!canManageUsers && (
            <p className="text-xs text-muted-foreground mt-1">View-only access. Editing controls are hidden.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canExportUsers && (
            <>
              <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button onClick={() => handleExport('json')} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
            </>
          )}
          {canManageUsers && (
            <Button
              onClick={() => {
                setCreateUserData({
                  name: '',
                  email: '',
                  position: '',
                  birthday: '',
                  monthlySalary: '',
                  permissions: getDefaultCreatePermissions(),
                })
                setCreateValidationErrors({})
                setCreatePermissionSearch('')
                setExpandedPermissionGroups(new Set())
                setShowCreateUserModal(true)
              }}
              size="sm"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Register User
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or position"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((prev) => !prev)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          {(positionFilter !== 'all' || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position-filter">Position</Label>
                <select
                  id="position-filter"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {positionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All positions' : option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'online' | 'busy' | 'away' | 'offline')
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All statuses</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-from">Created from</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">Created to</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              If you set only a start date, results show from that date forward. If you set only an end date, results show up to that date.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedIds.size > 0 && canManageUsers && (
        <Card className="border-primary/60 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-medium">{selectedIds.size} user(s) selected</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete({ mode: 'bulk' })}
                  disabled={deletingUserId !== null}
                >
                  {deletingUserId === 'bulk' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete selected
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={deletingUserId !== null}>
                  Clear selection
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
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                Showing {filteredEmployees.length} user{filteredEmployees.length === 1 ? '' : 's'}
              </p>
              {canManageUsers && filteredEmployees.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="cursor-pointer" onClick={handleSelectAll}>
                    Select all
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                    {canManageUsers && <th className="py-2 pr-3 font-medium"> </th>}
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Position</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Created</th>
                    <th className="py-2 pr-3 font-medium">Permissions</th>
                    {canManageUsers && <th className="py-2 pl-2 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={canManageUsers ? 8 : 6} className="py-6 text-center text-muted-foreground">
                        {debouncedSearch || positionFilter !== 'all' || statusFilter !== 'all' || dateFromFilter || dateToFilter
                          ? 'No users match your filters.'
                          : 'No users yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="border-b last:border-0">
                        {canManageUsers && (
                          <td className="py-3 pr-3 align-top">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={selectedIds.has(employee.id)}
                              onChange={() => handleSelectOne(employee.id)}
                            />
                          </td>
                        )}
                        <td className="py-3 pr-3 align-top">
                          <div className="flex flex-col">
                            <span className="font-medium">{employee.name}</span>
                            <span className="text-xs text-muted-foreground">ID: {employee.id}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 align-top text-muted-foreground">{employee.email}</td>
                        <td className="py-3 pr-3 align-top">{employee.position || '—'}</td>
                        <td className="py-3 pr-3 align-top">
                          {employee.status ? (
                            <Badge variant="outline" className="capitalize">
                              {employee.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-3 align-top text-muted-foreground">{formatDate(employee.createdAt)}</td>
                        <td className="py-3 pr-3 align-top">
                          {employee.permissions?.length ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-[11px]">
                                {employee.permissions.length} perm{employee.permissions.length === 1 ? '' : 's'}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate max-w-[160px]" title={employee.permissions.join(', ')}>
                                {employee.permissions.slice(0, 2).join(', ')}
                                {employee.permissions.length > 2 ? '…' : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                        {canManageUsers && (
                          <td className="py-3 pl-2 align-top text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditModal(employee)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmDelete({ mode: 'single', user: employee })}
                                disabled={deletingUserId === employee.id}
                              >
                                {deletingUserId === employee.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create User Modal */}
      <Modal open={showCreateUserModal} onClose={resetCreateUserForm} maxWidth="5xl" className="max-h-[90vh]">
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Create User</h3>
              <p className="text-sm text-muted-foreground">Set profile and permissions</p>
            </div>
            <Button variant="ghost" size="icon" onClick={resetCreateUserForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={createUserData.name}
                  onChange={(e) => {
                    setCreateUserData({ ...createUserData, name: e.target.value })
                    if (createValidationErrors.name) setCreateValidationErrors((prev) => ({ ...prev, name: '' }))
                  }}
                  className={createValidationErrors.name ? 'border-destructive' : ''}
                />
                {createValidationErrors.name && <p className="text-xs text-destructive">{createValidationErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createUserData.email}
                  onChange={(e) => {
                    setCreateUserData({ ...createUserData, email: e.target.value })
                    if (createValidationErrors.email) setCreateValidationErrors((prev) => ({ ...prev, email: '' }))
                  }}
                  className={createValidationErrors.email ? 'border-destructive' : ''}
                />
                {createValidationErrors.email && <p className="text-xs text-destructive">{createValidationErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-position">Position</Label>
                <Input
                  id="create-position"
                  value={createUserData.position}
                  onChange={(e) => setCreateUserData({ ...createUserData, position: e.target.value })}
                  placeholder="e.g., Product Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-birthday">Birthday</Label>
                <Input
                  id="create-birthday"
                  type="date"
                  value={createUserData.birthday}
                  onChange={(e) => {
                    setCreateUserData({ ...createUserData, birthday: e.target.value })
                    if (createValidationErrors.birthday) setCreateValidationErrors((prev) => ({ ...prev, birthday: '' }))
                  }}
                  className={createValidationErrors.birthday ? 'border-destructive' : ''}
                />
                {createValidationErrors.birthday && <p className="text-xs text-destructive">{createValidationErrors.birthday}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-monthlySalary">Monthly Salary</Label>
                <Input
                  id="create-monthlySalary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={createUserData.monthlySalary}
                  onChange={(e) => setCreateUserData({ ...createUserData, monthlySalary: e.target.value })}
                  placeholder="e.g., 50000"
                />
                <p className="text-xs text-muted-foreground">Used for cost analytics (hourly rate = salary / 160hrs)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Manage/update permissions automatically keep the matching view permission on.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-4">
                {/* Role Templates */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Quick Templates</Label>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {PERMISSION_TEMPLATES.map((template) => (
                      <button
                        key={template.label}
                        type="button"
                        onClick={() => {
                          const normalized = normalizePermissionsWithDependencies(template.permissions)
                          setCreateUserData((prev) => ({
                            ...prev,
                            permissions: normalized,
                          }))
                        }}
                        className="px-2.5 py-2 text-xs font-medium rounded-lg border border-border/50 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-200"
                      >
                        {template.label.replace(' (Default)', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={createPermissionSearch}
                    onChange={(e) => setCreatePermissionSearch(e.target.value)}
                    placeholder="Filter permissions..."
                    className="pl-9 h-9 text-sm bg-muted/20 border-border/50 w-full focus-visible:ring-1 focus-visible:ring-offset-0"
                  />
                </div>

                {/* Permission Groups */}
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {permissionGroups
                    .filter((group) => {
                      if (!createPermissionSearch.trim()) return true
                      const query = normalizeText(createPermissionSearch)
                      return (
                        normalizeText(group.label).includes(query) ||
                        group.permissions.some((perm) => normalizeText(perm.label).includes(query))
                      )
                    })
                    .map((group) => {
                      const groupPermValues = group.permissions.map((p) => p.value)
                      const checked = isGroupChecked(groupPermValues, createUserData.permissions)
                      const indeterminate = isGroupIndeterminate(groupPermValues, createUserData.permissions)
                      const expanded = expandedPermissionGroups.has(group.key)
                      const groupSelectedCount = groupPermValues.filter((p) => createUserData.permissions.includes(p)).length
                      const progress = (groupSelectedCount / groupPermValues.length) * 100

                      return (
                        <div
                          key={group.key}
                          className={`rounded-lg border transition-all duration-200 ${
                            checked
                              ? 'border-primary/40 bg-primary/5'
                              : indeterminate
                                ? 'border-amber-500/30 bg-amber-500/5'
                                : 'border-border/40 bg-muted/10 hover:bg-muted/20'
                          }`}
                        >
                          <div
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                            onClick={() => toggleGroupExpanded(group.key)}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCreateGroup(groupPermValues)
                              }}
                              className={`flex items-center justify-center h-5 w-5 rounded border-2 transition-all duration-200 ${
                                checked
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : indeterminate
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                              }`}
                            >
                              {checked && <Check className="h-3 w-3" />}
                              {indeterminate && !checked && <Minus className="h-3 w-3" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">{group.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground tabular-nums">
                                    {groupSelectedCount}/{groupPermValues.length}
                                  </span>
                                  {expanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="mt-1.5 h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                                <div
                                  className={`h-full w-full origin-left rounded-full transition-transform duration-200 ease-out ${
                                    checked ? 'bg-primary' : indeterminate ? 'bg-amber-500' : 'bg-muted-foreground/20'
                                  }`}
                                  style={{ transform: `scaleX(${progress / 100})` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Expanded permissions */}
                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                              expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {group.permissions.map((perm) => {
                                  const isChecked = createUserData.permissions.includes(perm.value)
                                  return (
                                    <label
                                      key={perm.value}
                                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-150 ${
                                        isChecked
                                          ? 'bg-primary/10 text-primary'
                                          : 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => toggleCreatePermission(perm.value)}
                                        className="h-4 w-4 rounded border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                      />
                                      <span className="text-xs font-medium truncate">{perm.label}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetCreateUserForm}
              disabled={creatingUser}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={creatingUser}>
              {creatingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create user'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editingEmployee} onClose={closeEditModal} maxWidth="5xl" className="max-h-[90vh]">
        {editingEmployee && (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Edit {editingEmployee.name}</h3>
                <p className="text-sm text-muted-foreground">Update profile details and permissions</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={closeEditModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editData.name}
                    onChange={(e) => {
                      setEditData({ ...editData, name: e.target.value })
                      if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    className={validationErrors.name ? 'border-destructive' : ''}
                  />
                  {validationErrors.name && <p className="text-xs text-destructive">{validationErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editData.email}
                    onChange={(e) => {
                      setEditData({ ...editData, email: e.target.value })
                      if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: '' }))
                    }}
                    className={validationErrors.email ? 'border-destructive' : ''}
                  />
                  {validationErrors.email && <p className="text-xs text-destructive">{validationErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-position">Position</Label>
                  <Input
                    id="edit-position"
                    value={editData.position}
                    onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                    placeholder="e.g., Product Manager"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-birthday">Birthday</Label>
                  <Input
                    id="edit-birthday"
                    type="date"
                    value={editData.birthday}
                    onChange={(e) => {
                      setEditData({ ...editData, birthday: e.target.value })
                      if (validationErrors.birthday) setValidationErrors((prev) => ({ ...prev, birthday: '' }))
                    }}
                    className={validationErrors.birthday ? 'border-destructive' : ''}
                  />
                  {validationErrors.birthday && <p className="text-xs text-destructive">{validationErrors.birthday}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-monthlySalary">Monthly Salary</Label>
                  <Input
                    id="edit-monthlySalary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.monthlySalary}
                    onChange={(e) => setEditData({ ...editData, monthlySalary: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                  <p className="text-xs text-muted-foreground">Used for cost analytics (hourly rate = salary / 160hrs)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Manage/update permissions automatically keep the matching view permission on.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Role Templates */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Quick Templates</Label>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {PERMISSION_TEMPLATES.map((template) => (
                      <button
                        key={template.label}
                        type="button"
                        onClick={() => {
                          const normalized = normalizePermissionsWithDependencies(template.permissions)
                          setEditData((prev) => ({
                            ...prev,
                            permissions: normalized,
                          }))
                        }}
                        className="px-2.5 py-2 text-xs font-medium rounded-lg border border-border/50 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-200"
                      >
                        {template.label.replace(' (Default)', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    placeholder="Filter permissions..."
                    className="pl-9 h-9 text-sm bg-muted/20 border-border/50 w-full focus-visible:ring-1 focus-visible:ring-offset-0"
                  />
                </div>

                {/* Permission Groups */}
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {permissionGroups
                    .filter((group) => {
                      if (!permissionSearch.trim()) return true
                      const query = normalizeText(permissionSearch)
                      return (
                        normalizeText(group.label).includes(query) ||
                        group.permissions.some((perm) => normalizeText(perm.label).includes(query))
                      )
                    })
                    .map((group) => {
                      const groupPermValues = group.permissions.map((p) => p.value)
                      const checked = isGroupChecked(groupPermValues)
                      const indeterminate = isGroupIndeterminate(groupPermValues)
                      const expanded = expandedPermissionGroups.has(group.key)
                      const groupSelectedCount = groupPermValues.filter((p) => editData.permissions.includes(p)).length
                      const progress = (groupSelectedCount / groupPermValues.length) * 100

                      return (
                        <div
                          key={group.key}
                          className={`rounded-lg border transition-all duration-200 ${
                            checked
                              ? 'border-primary/40 bg-primary/5'
                              : indeterminate
                                ? 'border-amber-500/30 bg-amber-500/5'
                                : 'border-border/40 bg-muted/10 hover:bg-muted/20'
                          }`}
                        >
                          <div
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                            onClick={() => toggleGroupExpanded(group.key)}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleGroup(groupPermValues)
                              }}
                              className={`flex items-center justify-center h-5 w-5 rounded border-2 transition-all duration-200 ${
                                checked
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : indeterminate
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                              }`}
                            >
                              {checked && <Check className="h-3 w-3" />}
                              {indeterminate && !checked && <Minus className="h-3 w-3" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">{group.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground tabular-nums">
                                    {groupSelectedCount}/{groupPermValues.length}
                                  </span>
                                  {expanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="mt-1.5 h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                                <div
                                  className={`h-full w-full origin-left rounded-full transition-transform duration-200 ease-out ${
                                    checked ? 'bg-primary' : indeterminate ? 'bg-amber-500' : 'bg-muted-foreground/20'
                                  }`}
                                  style={{ transform: `scaleX(${progress / 100})` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Expanded permissions */}
                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                              expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {group.permissions.map((perm) => {
                                  const isChecked = editData.permissions.includes(perm.value)
                                  return (
                                    <label
                                      key={perm.value}
                                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-150 ${
                                        isChecked
                                          ? 'bg-primary/10 text-primary'
                                          : 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => togglePermission(perm.value)}
                                        className="h-4 w-4 rounded border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                      />
                                      <span className="text-xs font-medium truncate">{perm.label}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEditModal} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="sm">
        {confirmDelete && (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Delete user{confirmDelete.mode === 'bulk' ? 's' : ''}?</h3>
                <p className="text-sm text-muted-foreground">
                  {confirmDelete.mode === 'bulk'
                    ? `This will delete ${selectedIds.size} selected user(s).`
                    : `This will delete ${confirmDelete.user?.name || 'this user'}.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deletingUserId !== null}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  confirmDelete.mode === 'bulk'
                    ? handleBulkDelete()
                    : confirmDelete.user
                      ? handleDelete(confirmDelete.user.id)
                      : undefined
                }
                disabled={deletingUserId !== null}
              >
                {deletingUserId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
