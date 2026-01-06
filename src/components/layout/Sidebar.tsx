import { useEffect, useState, useCallback } from 'react'
import { type LucideIcon, ChevronLeft, ChevronDown, LogOut, Bell, Sun, Moon, Clock4, Globe, Home, LayoutGrid, Images, Sparkles, MessageSquare, Gamepad2, Users, Video, Server, Settings, Briefcase, UsersRound, Shield, FileVideo } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { cn } from '@/utils/cn'
import { useTheme } from '@/composables/useTheme'
import { useUnreadCount } from '@/hooks/notification.hooks'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS, type Permission } from '@/constants/permissions'

type NavItem = {
  name: string
  to: string
  icon: LucideIcon
  adminOnly?: boolean
  requiredPermissions?: Permission[]
  requireAllPermissions?: boolean
}

// Standalone item (always visible)
const DASHBOARD_ITEM: NavItem = { name: 'Home', to: '/', icon: Home }

// Productivity group
const PRODUCTIVITY_ITEMS: NavItem[] = [
  {
    name: 'Workspace',
    to: '/workspace',
    icon: LayoutGrid,
    requiredPermissions: [
      PERMISSIONS.BOARD_VIEW,
      PERMISSIONS.BOARD_VIEW_ALL,
      PERMISSIONS.BOARD_FULL_ACCESS,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
  {
    name: 'Time Tracker',
    to: '/time-tracker',
    icon: Clock4,
    requiredPermissions: [
      PERMISSIONS.TIME_ENTRY_READ,
      PERMISSIONS.TIME_ENTRY_FULL_ACCESS,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
  {
    name: 'Gallery',
    to: '/gallery',
    icon: Images,
    requiredPermissions: [
      PERMISSIONS.GALLERY_READ,
      PERMISSIONS.GALLERY_FULL_ACCESS,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
  {
    name: 'AI News',
    to: '/ai-news',
    icon: Sparkles,
    requiredPermissions: [
      PERMISSIONS.AI_NEWS_READ,
      PERMISSIONS.AI_NEWS_FULL_ACCESS,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
]

// Social group
const SOCIAL_ITEMS: NavItem[] = [
  {
    name: 'Presence',
    to: '/presence',
    icon: Globe,
    requiredPermissions: [PERMISSIONS.PRESENCE_READ],
  },
  {
    name: 'Feed',
    to: '/feed',
    icon: MessageSquare,
    requiredPermissions: [
      PERMISSIONS.POST_READ,
      PERMISSIONS.POST_FULL_ACCESS,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
  {
    name: 'Games',
    to: '/games',
    icon: Gamepad2,
    requiredPermissions: [
      PERMISSIONS.GAME_READ,
      PERMISSIONS.GAME_FULL_ACCESS,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
  {
    name: 'Meet',
    to: '/meet',
    icon: Video,
    requiredPermissions: [
      PERMISSIONS.MEET_TOKEN,
      PERMISSIONS.MEET_FULL_ACCESS,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
  {
    name: 'Meet Files',
    to: '/meet/files',
    icon: FileVideo,
    requiredPermissions: [
      PERMISSIONS.MEET_TOKEN,
      PERMISSIONS.MEET_FULL_ACCESS,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
]

const MANAGEMENT_ITEMS: NavItem[] = [
  {
    name: 'Server',
    to: '/server-management',
    icon: Server,
    requiredPermissions: [
      PERMISSIONS.SERVER_MANAGEMENT_VIEW,
      PERMISSIONS.SERVER_MANAGEMENT_USE,
      PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE,
      PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
      PERMISSIONS.SYSTEM_FULL_ACCESS,
    ],
  },
  {
    name: 'Users',
    to: '/user-management',
    icon: Users,
    requiredPermissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.PROJECTS_VIEW,
      PERMISSIONS.PROJECTS_MANAGE,
      PERMISSIONS.SYSTEM_LOGS,
    ],
  },
  {
    name: 'System',
    to: '/system-management',
    icon: Shield,
    requiredPermissions: [PERMISSIONS.SYSTEM_FULL_ACCESS],
  },
]

const NAV_GROUPS = [
  { key: 'productivity', label: 'Productivity', icon: Briefcase, items: PRODUCTIVITY_ITEMS },
  { key: 'social', label: 'Social', icon: UsersRound, items: SOCIAL_ITEMS },
  { key: 'management', label: 'Management', icon: Settings, items: MANAGEMENT_ITEMS },
] as const

type NavGroupKey = (typeof NAV_GROUPS)[number]['key']

// Sidebar store for state management
type SidebarState = {
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapse: () => void
  openMobile: () => void
  closeMobile: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  mobileOpen: false,
  toggleCollapse: () => set((s) => ({ collapsed: !s.collapsed })),
  openMobile: () => set({ mobileOpen: true }),
  closeMobile: () => set({ mobileOpen: false }),
}))

// Reusable NavGroup accordion component
type NavGroupProps = {
  label: string
  icon: LucideIcon
  items: NavItem[]
  isOpen: boolean
  isActive: boolean
  onToggle: () => void
  collapsed: boolean
  closeMobile: () => void
  isRouteActive: (to: string) => boolean
}

function NavGroup({ label, icon: GroupIcon, items, isOpen, isActive, onToggle, collapsed, closeMobile, isRouteActive }: NavGroupProps) {
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'group relative flex w-full items-center rounded-xl text-[14px] font-medium transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isActive
            ? 'bg-primary/10 dark:bg-primary/20 backdrop-blur-sm text-primary border border-primary/30 shadow-md'
            : 'text-muted-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:text-foreground',
          collapsed ? 'pl-[18px] pr-2 py-2.5' : 'gap-3 px-3 py-2.5',
        )}
      >
        <span
          className={cn(
            'selection-indicator absolute left-0 top-1/2 w-[2.5px] -translate-y-1/2 rounded-r-full bg-[hsl(var(--ios-selection-indicator))]',
            isActive && !collapsed ? 'h-5 opacity-100' : 'h-0 opacity-0'
          )}
        />
        <GroupIcon
          className={cn(
            'h-5 w-5 shrink-0 stroke-[1.5] transition-colors duration-150',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
          )}
          aria-hidden="true"
        />
        <span className={cn('nav-item-text flex-1 text-left', collapsed ? 'collapsed' : 'expanded')}>
          {label}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 stroke-[1.5] transition-transform duration-200',
            isOpen && 'rotate-180',
            collapsed && 'hidden'
          )}
        />
      </button>

      {/* Accordion Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen && !collapsed ? 'max-h-64 opacity-100 mt-0.5' : 'max-h-0 opacity-0'
        )}
      >
        <div className="pl-4 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon
            const itemIsActive = isRouteActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeMobile}
                className={cn(
                  'group relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-300 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  itemIsActive
                    ? 'bg-primary/10 dark:bg-primary/20 backdrop-blur-sm text-primary border border-primary/30 shadow-md'
                    : 'text-muted-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:text-foreground',
                  'gap-3 px-3 py-2',
                )}
                aria-current={itemIsActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 stroke-[1.5] transition-colors duration-150',
                    itemIsActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { count: unreadCount } = useUnreadCount()
  
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const can = useAuthStore((s) => s.can)
  const canViewNotifications =
    can(PERMISSIONS.NOTIFICATION_READ) ||
    can(PERMISSIONS.NOTIFICATION_FULL_ACCESS) ||
    can(PERMISSIONS.NOTIFICATION_COUNT)
  const hasAnyPermission = Array.isArray(user?.permissions) && user.permissions.length > 0
  
  const collapsed = useSidebarStore((s) => s.collapsed)
  const mobileOpen = useSidebarStore((s) => s.mobileOpen)
  const toggleCollapse = useSidebarStore((s) => s.toggleCollapse)
  const closeMobile = useSidebarStore((s) => s.closeMobile)

  const [imageError, setImageError] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<NavGroupKey, boolean>>({
    productivity: false,
    social: false,
    management: false,
  })

  const toggleGroup = (group: NavGroupKey) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }
  
  const firstName = user?.name.split(' ')[0] ?? user?.name ?? ''
  const initials = user?.name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') ?? ''
  const isValidProfilePic = user?.profilePic && user.profilePic !== 'undefined' && user.profilePic.trim() !== ''
  
  // Filter function for nav items based on permissions
  const filterByPermissions = (items: NavItem[]) => items.filter((item) => {
    if (item.requiredPermissions?.length) {
      return item.requireAllPermissions
        ? item.requiredPermissions.every((permission) => can(permission))
        : item.requiredPermissions.some((permission) => can(permission))
    }
    return hasAnyPermission
  })

  // Helper to check if route is active
  const isRouteActive = (to: string) => 
    to === '/' ? location.pathname === to : location.pathname === to || location.pathname.startsWith(`${to}/`)

  const sidebarGroups = NAV_GROUPS.map((group) => {
    const items = filterByPermissions(group.items)
    const isActive = items.some((item) => isRouteActive(item.to))
    return {
      ...group,
      items,
      isActive,
      isOpen: openGroups[group.key] || isActive,
    }
  }).filter((group) => group.items.length > 0)

  useEffect(() => {
    setImageError(false)
  }, [user?.profilePic])


  // Keyboard shortcut: Press 'K' to collapse sidebar when expanded
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && !collapsed) {
        const target = e.target as HTMLElement
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        if (!isInput) {
          e.preventDefault()
          toggleCollapse()
        }
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [collapsed, toggleCollapse])

  const handleNotificationClick = useCallback(() => {
    closeMobile()
    if (location.pathname === '/notifications') {
      if (window.history.length > 1) {
        navigate(-1)
      } else {
        navigate('/')
      }
    } else {
      navigate('/notifications')
    }
  }, [closeMobile, location.pathname, navigate])

  if (!user) return null

  const Content = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="relative flex items-center px-4 py-3.5 h-[52px]">
        {/* Collapsed "K" logo */}
        <div
          className={cn(
            'sidebar-icon-center absolute inset-0 flex items-center justify-center',
            collapsed ? 'collapsed' : 'expanded'
          )}
        >
          <button
            type="button"
            className="text-[22px] font-bold tracking-tight text-primary hover:opacity-80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md cursor-pointer"
            style={{ fontFamily: "'Poppins', sans-serif" }}
            onClick={toggleCollapse}
            aria-label="Expand sidebar"
          >
            K
          </button>
        </div>

        {/* Expanded brand + collapse button */}
        <div
          className={cn(
            'sidebar-content-fade flex items-center w-full',
            collapsed ? 'collapsed' : 'expanded'
          )}
        >
          <Link
            to="/"
            className="text-[20px] font-bold tracking-tight text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md flex-1"
            style={{ fontFamily: "'Poppins', sans-serif" }}
            onClick={closeMobile}
          >
            KooyaHQ
          </Link>
          <button
            type="button"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md md:flex text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary transition-all duration-150"
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className={cn(
        'h-px bg-[hsl(var(--ios-divider))] transition-[margin] duration-300 ease-out',
        collapsed ? 'mx-2' : 'mx-4'
      )} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Main navigation">
        <div className="space-y-0.5">
          {/* Dashboard - always visible */}
          {(() => {
            const Icon = DASHBOARD_ITEM.icon
            const isActive = isRouteActive(DASHBOARD_ITEM.to)
            return (
              <Link
                to={DASHBOARD_ITEM.to}
                onClick={closeMobile}
                className={cn(
                  'group relative flex items-center rounded-xl text-[14px] font-medium transition-all duration-300 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-primary/10 dark:bg-primary/20 backdrop-blur-sm text-primary border border-primary/30 shadow-md'
                    : 'text-muted-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:text-foreground',
                  collapsed ? 'pl-[18px] pr-2 py-2.5' : 'gap-3 px-3 py-2.5',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'selection-indicator absolute left-0 top-1/2 w-[2.5px] -translate-y-1/2 rounded-r-full bg-[hsl(var(--ios-selection-indicator))]',
                    isActive && !collapsed ? 'h-5 opacity-100' : 'h-0 opacity-0'
                  )}
                />
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 stroke-[1.5] transition-colors duration-150',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                  aria-hidden="true"
                />
                <span className={cn('nav-item-text', collapsed ? 'collapsed' : 'expanded')}>
                  {DASHBOARD_ITEM.name}
                </span>
              </Link>
            )
          })()}

          {/* Divider after Dashboard */}
          <div className={cn(
            'h-px bg-[hsl(var(--ios-divider))] transition-[margin] duration-300 ease-out my-2',
            collapsed ? 'mx-1' : 'mx-2'
          )} />

          {sidebarGroups.map((group) => (
            <NavGroup
              key={group.key}
              label={group.label}
              icon={group.icon}
              items={group.items}
              isOpen={group.isOpen}
              isActive={group.isActive}
              onToggle={() => toggleGroup(group.key)}
              collapsed={collapsed}
              closeMobile={closeMobile}
              isRouteActive={isRouteActive}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className={cn(
        'mt-auto mx-3 mb-3 rounded-xl backdrop-blur-sm',
        'bg-[hsl(var(--ios-footer-bg))]',
        'border border-[hsl(var(--ios-sidebar-border))]',
        'transition-[padding] duration-300 ease-out',
        collapsed ? 'px-2 py-3' : 'px-3 py-3'
      )}>
        {/* User Profile */}
        <Link
          to="/profile"
          onClick={closeMobile}
          className={cn(
            'flex items-center rounded-lg py-2 hover:bg-[hsl(var(--ios-selection-bg))] cursor-pointer transition-all duration-200 ease-out',
            collapsed ? 'justify-center px-0' : 'gap-3 px-2',
          )}
        >
          {isValidProfilePic && !imageError ? (
            <img
              key={user.profilePic}
              src={user.profilePic}
              alt={firstName}
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-[hsl(var(--ios-divider))] transition-all duration-300 ease-out"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-medium text-primary-foreground transition-all duration-300 ease-out">
              {initials || 'KH'}
            </span>
          )}
          <div className={cn('sidebar-content-fade min-w-0 flex-1', collapsed ? 'collapsed' : 'expanded')}>
            <p className="truncate text-[14px] font-semibold text-foreground whitespace-nowrap">{firstName}</p>
            <p className="truncate text-[12px] text-muted-foreground whitespace-nowrap">{user.email}</p>
          </div>
        </Link>

        {/* Divider */}
        <div className={cn('my-2 h-px bg-[hsl(var(--ios-divider))] transition-[margin] duration-300 ease-out', collapsed && 'mx-1')} />

        {/* Actions */}
        <div className={cn('flex items-center transition-all duration-300 ease-out', collapsed ? 'flex-col gap-1' : 'justify-between gap-1')}>
          {/* Theme Toggle */}
          <button
            type="button"
            className={cn(
              'flex h-8 items-center justify-center rounded-lg',
              'text-muted-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:text-foreground',
              'transition-all duration-150 ease-out hover:scale-105 active:scale-95',
              collapsed ? 'w-full' : 'w-8'
            )}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <div className="relative h-5 w-5">
              <Moon className={cn('theme-icon h-5 w-5 stroke-[1.5] absolute inset-0', isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50')} />
              <Sun className={cn('theme-icon h-5 w-5 stroke-[1.5] absolute inset-0', isDark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100')} />
            </div>
          </button>

          <div className={cn('flex items-center gap-1 transition-all duration-300 ease-out', collapsed && 'flex-col w-full')}>
            {/* Notifications */}
            {canViewNotifications && (
              <button
                type="button"
                className={cn(
                  'relative flex h-8 items-center justify-center rounded-lg',
                  'text-muted-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:text-foreground',
                  'transition-all duration-150 ease-out hover:scale-105 active:scale-95',
                  collapsed ? 'w-full' : 'w-8'
                )}
                onClick={handleNotificationClick}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 stroke-[1.5]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Log Out */}
            <button
              type="button"
              className={cn(
                'flex items-center rounded-lg py-1.5 text-[14px] font-medium text-muted-foreground',
                'hover:bg-[hsl(var(--ios-selection-bg))] hover:text-foreground transition-all duration-150 ease-out',
                collapsed ? 'w-full justify-center px-2' : 'gap-2 px-2',
              )}
              onClick={logout}
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5 stroke-[1.5] shrink-0" />
              <span className={cn('nav-item-text', collapsed ? 'collapsed' : 'expanded')}>Log out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          'sidebar-overlay fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={closeMobile}
      />

      {/* Sidebar Container */}
      <aside
        className={cn(
          'sidebar-container fixed inset-y-0 left-0 z-50 flex h-screen flex-col',
          'bg-[hsl(var(--ios-sidebar-bg))] backdrop-blur-xl',
          'border-r border-[hsl(var(--ios-sidebar-border))]',
          'md:static md:h-full md:translate-x-0 md:z-auto',
          collapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        style={{
          transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-full flex-col overflow-hidden">{Content}</div>
      </aside>
    </>
  )
}
