import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/utils/cn'
import { PERMISSIONS } from '@/constants/permissions'

type AuthMode = 'signin' | 'signup'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export function Auth() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)

  type PermissionValue = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
  type PermissionNode = {
    label: string
    value?: PermissionValue
    description?: string
    children?: PermissionNode[]
  }

  const PERMISSION_TREE: PermissionNode[] = [
    {
      label: 'System & Admin',
      children: [
        { label: 'System Full Access', value: PERMISSIONS.SYSTEM_FULL_ACCESS, description: 'Grants every permission' },
        { label: 'Admin Full Access', value: PERMISSIONS.ADMIN_FULL_ACCESS },
        { label: 'Admin Read', value: PERMISSIONS.ADMIN_READ },
        { label: 'Admin Export', value: PERMISSIONS.ADMIN_EXPORT },
        { label: 'Admin Activity Read', value: PERMISSIONS.ADMIN_ACTIVITY_READ },
      ],
    },
    {
      label: 'Users',
      children: [
        { label: 'User Full Access', value: PERMISSIONS.USER_FULL_ACCESS },
        { label: 'Read Users', value: PERMISSIONS.USER_READ },
        { label: 'Create Users', value: PERMISSIONS.USER_CREATE },
        { label: 'Update Users', value: PERMISSIONS.USER_UPDATE },
        { label: 'Delete Users', value: PERMISSIONS.USER_DELETE },
      ],
    },
    {
      label: 'Boards',
      children: [
        { label: 'Board Full Access', value: PERMISSIONS.BOARD_FULL_ACCESS },
        { label: 'Read Boards', value: PERMISSIONS.BOARD_READ },
        { label: 'Create Boards', value: PERMISSIONS.BOARD_CREATE },
        { label: 'Update Boards', value: PERMISSIONS.BOARD_UPDATE },
        { label: 'Delete Boards', value: PERMISSIONS.BOARD_DELETE },
        { label: 'Favorite Boards', value: PERMISSIONS.BOARD_FAVORITE },
        { label: 'Board Activity Read', value: PERMISSIONS.BOARD_ACTIVITY_READ },
        { label: 'Manage Sprints', value: PERMISSIONS.SPRINT_MANAGE },
      ],
    },
    {
      label: 'Tickets',
      children: [
        { label: 'Ticket Full Access', value: PERMISSIONS.TICKET_FULL_ACCESS },
        { label: 'Read Tickets', value: PERMISSIONS.TICKET_READ },
        { label: 'Create Tickets', value: PERMISSIONS.TICKET_CREATE },
        { label: 'Update Tickets', value: PERMISSIONS.TICKET_UPDATE },
        { label: 'Delete Tickets', value: PERMISSIONS.TICKET_DELETE },
        { label: 'Rank Tickets', value: PERMISSIONS.TICKET_RANK },
        { label: 'Manage Ticket Relations', value: PERMISSIONS.TICKET_RELATION },
        { label: 'Read Ticket Comments', value: PERMISSIONS.TICKET_COMMENT_READ },
        { label: 'Create Ticket Comments', value: PERMISSIONS.TICKET_COMMENT_CREATE },
        { label: 'Update Ticket Comments', value: PERMISSIONS.TICKET_COMMENT_UPDATE },
        { label: 'Delete Ticket Comments', value: PERMISSIONS.TICKET_COMMENT_DELETE },
        { label: 'Ticket Activity Read', value: PERMISSIONS.TICKET_ACTIVITY_READ },
      ],
    },
    {
      label: 'Projects',
      children: [
        { label: 'Project Full Access', value: PERMISSIONS.PROJECT_FULL_ACCESS },
        { label: 'Read Projects', value: PERMISSIONS.PROJECT_READ },
        { label: 'Create Projects', value: PERMISSIONS.PROJECT_CREATE },
        { label: 'Update Projects', value: PERMISSIONS.PROJECT_UPDATE },
        { label: 'Delete Projects', value: PERMISSIONS.PROJECT_DELETE },
      ],
    },
    {
      label: 'Announcements',
      children: [
        { label: 'Announcement Full Access', value: PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS },
        { label: 'Read Announcements', value: PERMISSIONS.ANNOUNCEMENT_READ },
        { label: 'Create Announcements', value: PERMISSIONS.ANNOUNCEMENT_CREATE },
        { label: 'Update Announcements', value: PERMISSIONS.ANNOUNCEMENT_UPDATE },
        { label: 'Delete Announcements', value: PERMISSIONS.ANNOUNCEMENT_DELETE },
      ],
    },
    {
      label: 'AI News',
      children: [
        { label: 'AI News Full Access', value: PERMISSIONS.AI_NEWS_FULL_ACCESS },
        { label: 'Read AI News', value: PERMISSIONS.AI_NEWS_READ },
        { label: 'Refresh AI News', value: PERMISSIONS.AI_NEWS_REFRESH },
      ],
    },
    {
      label: 'Gallery & Media',
      children: [
        { label: 'Gallery Full Access', value: PERMISSIONS.GALLERY_FULL_ACCESS },
        { label: 'Read Gallery', value: PERMISSIONS.GALLERY_READ },
        { label: 'Create Gallery Items', value: PERMISSIONS.GALLERY_CREATE },
        { label: 'Bulk Create Gallery', value: PERMISSIONS.GALLERY_BULK_CREATE },
        { label: 'Update Gallery Items', value: PERMISSIONS.GALLERY_UPDATE },
        { label: 'Delete Gallery Items', value: PERMISSIONS.GALLERY_DELETE },
        { label: 'Media Full Access', value: PERMISSIONS.MEDIA_FULL_ACCESS },
        { label: 'Upload Media', value: PERMISSIONS.MEDIA_UPLOAD },
        { label: 'Read Media', value: PERMISSIONS.MEDIA_READ },
        { label: 'Delete Media', value: PERMISSIONS.MEDIA_DELETE },
      ],
    },
    {
      label: 'Posts & Reactions',
      children: [
        { label: 'Post Full Access', value: PERMISSIONS.POST_FULL_ACCESS },
        { label: 'Read Posts', value: PERMISSIONS.POST_READ },
        { label: 'Create Posts', value: PERMISSIONS.POST_CREATE },
        { label: 'Update Posts', value: PERMISSIONS.POST_UPDATE },
        { label: 'Delete Posts', value: PERMISSIONS.POST_DELETE },
        { label: 'Read Post Comments', value: PERMISSIONS.POST_COMMENT_READ },
        { label: 'Create Post Comments', value: PERMISSIONS.POST_COMMENT_CREATE },
        { label: 'Update Post Comments', value: PERMISSIONS.POST_COMMENT_UPDATE },
        { label: 'Delete Post Comments', value: PERMISSIONS.POST_COMMENT_DELETE },
        { label: 'React to Posts', value: PERMISSIONS.POST_REACT },
        { label: 'Vote in Polls', value: PERMISSIONS.POST_POLL_VOTE },
      ],
    },
    {
      label: 'Notifications & Presence',
      children: [
        { label: 'Notification Full Access', value: PERMISSIONS.NOTIFICATION_FULL_ACCESS },
        { label: 'Read Notifications', value: PERMISSIONS.NOTIFICATION_READ },
        { label: 'Notification Count', value: PERMISSIONS.NOTIFICATION_COUNT },
        { label: 'Update Notifications', value: PERMISSIONS.NOTIFICATION_UPDATE },
        { label: 'Presence Full Access', value: PERMISSIONS.PRESENCE_FULL_ACCESS },
        { label: 'Presence Read', value: PERMISSIONS.PRESENCE_READ },
        { label: 'Presence Update', value: PERMISSIONS.PRESENCE_UPDATE },
      ],
    },
    {
      label: 'Meet',
      children: [
        { label: 'Meet Full Access', value: PERMISSIONS.MEET_FULL_ACCESS },
        { label: 'Meet Token', value: PERMISSIONS.MEET_TOKEN },
      ],
    },
    {
      label: 'Time Entries',
      children: [
        { label: 'Time Entry Full Access', value: PERMISSIONS.TIME_ENTRY_FULL_ACCESS },
        { label: 'Read Time Entries', value: PERMISSIONS.TIME_ENTRY_READ },
        { label: 'Time Entry Analytics', value: PERMISSIONS.TIME_ENTRY_ANALYTICS },
        { label: 'Create Time Entries', value: PERMISSIONS.TIME_ENTRY_CREATE },
        { label: 'Update Time Entries', value: PERMISSIONS.TIME_ENTRY_UPDATE },
        { label: 'Delete Time Entries', value: PERMISSIONS.TIME_ENTRY_DELETE },
      ],
    },
    {
      label: 'Games',
      children: [
        { label: 'Game Full Access', value: PERMISSIONS.GAME_FULL_ACCESS },
        { label: 'Read Games', value: PERMISSIONS.GAME_READ },
        { label: 'Play Games', value: PERMISSIONS.GAME_PLAY },
        { label: 'Invite to Games', value: PERMISSIONS.GAME_INVITE },
        { label: 'Cleanup Games', value: PERMISSIONS.GAME_CLEANUP },
      ],
    },
    {
      label: 'Misc',
      children: [
        { label: 'Fetch Link Previews', value: PERMISSIONS.LINK_PREVIEW_FETCH },
        { label: 'Cesium Token', value: PERMISSIONS.CESIUM_TOKEN },
      ],
    },
  ]
  
  const [mode, setMode] = useState<AuthMode>('signin')
  const [formData, setFormData] = useState({ name: '', email: '', password: '', permissions: [] as string[] })
  const [uiState, setUIState] = useState({
    showPassword: false,
    emailTouched: false,
    error: null as string | null,
    isSubmitting: false,
  })

  const collectPaths = (nodes: PermissionNode[], prefix: string[] = []) => {
    const paths: string[] = []
    nodes.forEach((node) => {
      const path = [...prefix, node.label].join('>')
      paths.push(path)
      if (node.children) {
        paths.push(...collectPaths(node.children, [...prefix, node.label]))
      }
    })
    return paths
  }

  const selectedPermissions = useMemo(
    () => new Set(formData.permissions as PermissionValue[]),
    [formData.permissions],
  )
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(collectPaths(PERMISSION_TREE)),
  )

  // Validation helpers
  const isValidEmail = (email: string) => email.length === 0 || EMAIL_REGEX.test(email)
  const isValidPassword = (password: string) => password.length >= MIN_PASSWORD_LENGTH || password.length === 0
  
  const emailValid = isValidEmail(formData.email)
  const passwordValid = isValidPassword(formData.password)
  const shouldShowEmailError = uiState.emailTouched && formData.email.length > 0 && !emailValid
  
  const isFormValid = mode === 'signin'
    ? formData.email && formData.password && emailValid
    : formData.name && formData.email && formData.password && emailValid && passwordValid && formData.permissions.length > 0
  
  const isDisabled = !isFormValid || uiState.isSubmitting

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', permissions: [] })
    setUIState(prev => ({ ...prev, showPassword: false, emailTouched: false, error: null }))
  }

  const switchMode = (newMode: AuthMode) => {
    if (newMode !== mode) {
      setMode(newMode)
      resetForm()
    }
  }

  const updateField = (field: Exclude<keyof typeof formData, 'permissions'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (uiState.error) setUIState(prev => ({ ...prev, error: null }))
  }

  const getLeafValues = (node: PermissionNode): PermissionValue[] => {
    if (!node.children || node.children.length === 0) {
      return node.value ? [node.value] : []
    }
    return node.children.flatMap(getLeafValues)
  }

  const togglePermission = (value: PermissionValue) => {
    setFormData((prev) => {
      const existing = new Set(prev.permissions)
      if (existing.has(value)) {
        existing.delete(value)
      } else {
        existing.delete(PERMISSIONS.SYSTEM_FULL_ACCESS)
        existing.add(value)
      }
      // If full access selected, replace with only full access
      if (existing.has(PERMISSIONS.SYSTEM_FULL_ACCESS)) {
        return { ...prev, permissions: [PERMISSIONS.SYSTEM_FULL_ACCESS] }
      }
      return { ...prev, permissions: Array.from(existing) }
    })
  }

  const toggleNode = (node: PermissionNode) => {
    const leaves = getLeafValues(node)
    if (leaves.length === 0) return

    setFormData((prev) => {
      const selected = new Set(prev.permissions)
      const allSelected = leaves.every((leaf) => selected.has(leaf))
      if (allSelected) {
        leaves.forEach((leaf) => selected.delete(leaf))
      } else {
        selected.delete(PERMISSIONS.SYSTEM_FULL_ACCESS)
        leaves.forEach((leaf) => selected.add(leaf))
      }

      if (selected.has(PERMISSIONS.SYSTEM_FULL_ACCESS)) {
        return { ...prev, permissions: [PERMISSIONS.SYSTEM_FULL_ACCESS] }
      }
      return { ...prev, permissions: Array.from(selected) }
    })
  }

  const isNodeChecked = (node: PermissionNode, selected: Set<PermissionValue>) => {
    const leaves = getLeafValues(node)
    return leaves.length > 0 && leaves.every((leaf) => selected.has(leaf))
  }

  const isNodeIndeterminate = (node: PermissionNode, selected: Set<PermissionValue>) => {
    const leaves = getLeafValues(node)
    const someSelected = leaves.some((leaf) => selected.has(leaf))
    return someSelected && !isNodeChecked(node, selected)
  }

  const toggleGroupVisibility = (pathId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(pathId)) {
        next.delete(pathId)
      } else {
        next.add(pathId)
      }
      return next
    })
  }

  const nodeContainsSystem = (node: PermissionNode) =>
    getLeafValues(node).includes(PERMISSIONS.SYSTEM_FULL_ACCESS)

  const renderPermissionNode = (node: PermissionNode, path: string[], depth: number = 0) => {
    const pathId = path.join('>')
    const hasChildren = !!node.children && node.children.length > 0
    const checked = isNodeChecked(node, selectedPermissions)
    const indeterminate = isNodeIndeterminate(node, selectedPermissions)
    const fullSelected = selectedPermissions.has(PERMISSIONS.SYSTEM_FULL_ACCESS)
    const disablesInteraction = fullSelected && !nodeContainsSystem(node)
    const expanded = expandedGroups.has(pathId)

    const handleToggle = () => {
      if (disablesInteraction) return
      if (hasChildren) {
        toggleNode(node)
      } else if (node.value) {
        togglePermission(node.value)
      }
    }

    return (
      <div key={pathId} className={cn('space-y-1 rounded-lg px-2 py-1', depth === 0 ? 'border border-border/50 bg-background/80' : '')}>
        <div className="flex items-center justify-between">
          <label
            className={cn(
              'flex items-start gap-3 cursor-pointer transition-colors rounded-md px-1 py-1 w-full',
              checked ? 'bg-primary/10' : 'hover:bg-muted/60'
            )}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 flex-shrink-0"
              checked={checked}
              ref={(el) => {
                if (el) {
                  el.indeterminate = indeterminate
                }
              }}
              disabled={uiState.isSubmitting || disablesInteraction}
              onChange={handleToggle}
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{node.label}</div>
              {!hasChildren && (
                <div className="text-[11px] text-muted-foreground">{node.description ?? node.value ?? ''}</div>
              )}
            </div>
          </label>
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleGroupVisibility(pathId)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={expanded ? 'Collapse group' : 'Expand group'}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-180' : '')} />
            </button>
          )}
        </div>

        {hasChildren && expanded && (
          <div className="pl-5 space-y-1">
            {node.children!.map((child) => renderPermissionNode(child, [...path, child.label], depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUIState(prev => ({ ...prev, error: null, isSubmitting: true }))

    try {
      if (mode === 'signin') {
        await login({ email: formData.email, password: formData.password })
      } else {
        await register({ name: formData.name, email: formData.email, password: formData.password, permissions: formData.permissions })
      }
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : mode === 'signin' ? 'Unable to log in' : 'Unable to create account'
      setUIState(prev => ({ ...prev, error: message, isSubmitting: false }))
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-6 sm:px-8 lg:px-12 xl:px-16">
      <div className="w-full max-w-[500px] space-y-10">
        {/* Header - bold and confident */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.h1
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground"
              style={{ fontStyle: 'normal', fontFamily: 'inherit' }}
            >
              {mode === 'signin' ? 'Welcome back' : 'Get started'}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Card - larger, more substantial, confident */}
        <Card className="border-2 border-border shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] bg-card overflow-hidden relative">
          
          {/* Mode Toggle Tabs - more premium */}
          <div className="relative flex border-b border-border/60 bg-muted/30">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={cn(
                "flex-1 py-4 text-sm font-semibold transition-all duration-200 relative z-10",
                mode === 'signin' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={cn(
                "flex-1 py-4 text-sm font-semibold transition-all duration-200 relative z-10",
                mode === 'signup' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              Sign up
            </button>
            {/* Animated tab indicator - thicker and more visible */}
            <motion.div
              className="absolute bottom-0 h-[2px] bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
              initial={false}
              animate={{
                left: mode === 'signin' ? '0%' : '50%',
                width: '50%'
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          </div>

          <CardHeader className="pb-1">
            {/* Removed redundant heading - tabs already indicate mode */}
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'signin' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'signin' ? 20 : -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
                onSubmit={handleSubmit}
                noValidate
              >
                {/* Name field - only for signup */}
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                      Full name
                    </Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="John Doe"
                      className="h-12 text-base border-2 border-border/80 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all"
                      required
                      disabled={uiState.isSubmitting}
                    />
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onBlur={() => setUIState(prev => ({ ...prev, emailTouched: true }))}
                    placeholder="name@kooya.com"
                    className={cn(
                      "h-12 text-base border-2 border-border/80 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all",
                      shouldShowEmailError && "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/40"
                    )}
                    required
                    disabled={uiState.isSubmitting}
                  />
                  {shouldShowEmailError && (
                    <p className="text-xs font-medium text-destructive">
                      Please enter a valid email address
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={uiState.showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder={mode === 'signin' ? 'Enter your password' : 'Create a secure password'}
                      className={cn(
                        'h-12 text-base border-2 border-border/80 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all pr-10',
                        mode === 'signup' && !passwordValid && formData.password.length > 0 && 'border-destructive focus-visible:ring-destructive',
                      )}
                      required
                      disabled={uiState.isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setUIState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={uiState.showPassword ? 'Hide password' : 'Show password'}
                    >
                      {uiState.showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Implement forgot password flow
                        console.log('Forgot password clicked')
                      }}
                      className="text-sm font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                  {mode === 'signup' && (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        passwordValid || formData.password.length === 0
                          ? 'text-muted-foreground'
                          : 'text-destructive',
                      )}
                    >
                      {formData.password.length === 0
                        ? `Must be at least ${MIN_PASSWORD_LENGTH} characters long`
                        : formData.password.length < MIN_PASSWORD_LENGTH
                          ? `At least ${MIN_PASSWORD_LENGTH - formData.password.length} more character${MIN_PASSWORD_LENGTH - formData.password.length === 1 ? '' : 's'} required`
                          : 'Password meets requirements'}
                    </p>
                  )}
                </div>

                {mode === 'signup' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      Permissions (testing)
                    </Label>
                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 max-h-64 overflow-y-auto space-y-2">
                      {PERMISSION_TREE.map((group) => {
                        const groupChecked = isNodeChecked(group, selectedPermissions)
                        const groupIndeterminate = isNodeIndeterminate(group, selectedPermissions)
                        const expanded = expandedGroups.has(group.label)

                        return (
                          <div key={group.label} className="space-y-1 rounded-lg border border-border/50 bg-background/80 px-2 py-1.5">
                            <div className="flex items-center justify-between">
                              <label
                                className={cn(
                                  'flex items-start gap-3 cursor-pointer transition-colors rounded-md px-1 py-1',
                                  groupChecked ? 'bg-primary/10' : 'hover:bg-muted/60'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  checked={groupChecked}
                                  ref={(el) => {
                                    if (el) {
                                      el.indeterminate = groupIndeterminate
                                    }
                                  }}
                                  onChange={() => toggleNode(group)}
                                  disabled={uiState.isSubmitting}
                                />
                                <div className="text-sm font-semibold text-foreground">{group.label}</div>
                              </label>
                              <button
                                type="button"
                                onClick={() => toggleGroupVisibility(group.label)}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={expanded ? 'Collapse group' : 'Expand group'}
                              >
                                <ChevronDown className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-180' : '')} />
                              </button>
                            </div>

                            {expanded && (
                              <div className="pl-5 space-y-1">
                                {group.children?.map((child) => {
                                  const childSelected = isNodeChecked(child, selectedPermissions)
                                  const childIndeterminate = isNodeIndeterminate(child, selectedPermissions)
                                  const isFullAccess = child.value === PERMISSIONS.SYSTEM_FULL_ACCESS
                                  const fullSelected = selectedPermissions.has(PERMISSIONS.SYSTEM_FULL_ACCESS)
                                  const disabled = uiState.isSubmitting || (fullSelected && !isFullAccess)

                                  return (
                                    <label
                                      key={child.value || child.label}
                                      className={cn(
                                        'flex items-start gap-3 rounded-md border border-transparent px-2 py-1 cursor-pointer transition-colors',
                                        childSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/40'
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4"
                                        checked={childSelected}
                                        ref={(el) => {
                                          if (el) {
                                            el.indeterminate = childIndeterminate
                                          }
                                        }}
                                        disabled={disabled}
                                        onChange={() =>
                                          child.children ? toggleNode(child) : child.value && togglePermission(child.value)
                                        }
                                      />
                                      <div className="space-y-0.5">
                                        <div className="text-[13px] font-semibold text-foreground">
                                          {child.label}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                          {child.description ?? child.value ?? ''}
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select one or more permissions. Choosing “Full Access” overrides and grants all actions.
                    </p>
                  </div>
                )}

                {uiState.error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg border-2 border-destructive bg-destructive/20 px-4 py-3 text-sm text-destructive font-semibold shadow-sm"
                    role="alert"
                  >
                    {uiState.error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={isDisabled}
                  className={cn(
                    "h-12 w-full text-base font-semibold shadow-lg transition-all duration-200",
                    isDisabled 
                      ? "bg-muted text-foreground/50 cursor-not-allowed hover:scale-100 hover:shadow-lg border border-border/50" 
                      : "bg-primary hover:bg-primary/95 text-primary-foreground hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                  )}
                  size="lg"
                >
                  {uiState.isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </span>
                  ) : (
                    mode === 'signin' ? 'Sign in' : 'Create account'
                  )}
                </Button>
              </motion.form>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
