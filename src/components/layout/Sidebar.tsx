import { type LucideIcon, ChevronLeft, LogOut, Bell, Sun, Moon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useState, useEffect } from 'react'
import { useTheme } from '@/composables/useTheme'
import { useUnreadCount } from '@/hooks/notification.hooks'
import { useNavigate, useLocation } from 'react-router-dom'

type NavItem = {
  name: string
  to: string
  icon: LucideIcon
  adminOnly?: boolean
}

type SidebarProps = {
  navigation: NavItem[]
  pathname: string
  userName: string
  userEmail: string
  initials: string
  profilePic?: string
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  onLogout: () => void
}

export function Sidebar({
  navigation,
  pathname,
  userName,
  userEmail,
  initials,
  profilePic,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onLogout,
}: SidebarProps) {
  const [imageError, setImageError] = useState(false)
  const isValidProfilePic = profilePic && profilePic !== 'undefined' && profilePic.trim() !== ''
  const { isDark, toggleTheme } = useTheme()
  const { count: unreadCount } = useUnreadCount()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setImageError(false)
  }, [profilePic])

  const handleNotificationClick = () => {
    onCloseMobile()
    if (location.pathname === '/notifications') {
      if (window.history.length > 1) {
        navigate(-1)
      } else {
        navigate('/')
      }
    } else {
      navigate('/notifications')
    }
  }

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
            onClick={onToggleCollapse}
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
            onClick={onCloseMobile}
          >
            KooyaHQ
          </Link>
          <button
            type="button"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md md:flex text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary transition-all duration-150"
            onClick={onToggleCollapse}
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
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={cn(
                  'group relative flex items-center rounded-xl text-[14px] font-medium transition-all duration-300 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-primary/10 dark:bg-primary/20 backdrop-blur-sm text-primary border border-primary/30 shadow-md'
                    : 'text-muted-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:text-foreground',
                  // Keep icons on the left - use padding to visually center them when collapsed
                  collapsed ? 'pl-[18px] pr-2 py-2.5' : 'gap-3 px-3 py-2.5',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Selection indicator */}
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
                <span
                  className={cn(
                    'nav-item-text',
                    collapsed ? 'collapsed' : 'expanded'
                  )}
                >
                  {item.name}
                </span>
              </Link>
            )
          })}
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
          onClick={onCloseMobile}
          className={cn(
            'flex items-center rounded-lg py-2 hover:bg-[hsl(var(--ios-selection-bg))] cursor-pointer transition-all duration-200 ease-out',
            // Keep avatar on the left - use padding to visually center when collapsed
            collapsed ? 'justify-center px-0' : 'gap-3 px-2',
          )}
        >
          {isValidProfilePic && !imageError ? (
            <img
              key={profilePic}
              src={profilePic}
              alt={userName}
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-[hsl(var(--ios-divider))] transition-all duration-300 ease-out"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-medium text-primary-foreground transition-all duration-300 ease-out">
              {initials || 'KH'}
            </span>
          )}
          <div
            className={cn(
              'sidebar-content-fade min-w-0 flex-1',
              collapsed ? 'collapsed' : 'expanded'
            )}
          >
            <p className="truncate text-[14px] font-semibold text-foreground whitespace-nowrap">{userName}</p>
            <p className="truncate text-[12px] text-muted-foreground whitespace-nowrap">{userEmail}</p>
          </div>
        </Link>

        {/* Divider */}
        <div className={cn(
          'my-2 h-px bg-[hsl(var(--ios-divider))] transition-[margin] duration-300 ease-out',
          collapsed && 'mx-1'
        )} />

        {/* Actions */}
        <div className={cn(
          'flex items-center transition-all duration-300 ease-out',
          collapsed ? 'flex-col gap-1' : 'justify-between gap-1'
        )}>
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
              <Moon
                className={cn(
                  'theme-icon h-5 w-5 stroke-[1.5] absolute inset-0',
                  isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
                )}
              />
              <Sun
                className={cn(
                  'theme-icon h-5 w-5 stroke-[1.5] absolute inset-0',
                  isDark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                )}
              />
            </div>
          </button>

          <div className={cn(
            'flex items-center gap-1 transition-all duration-300 ease-out',
            collapsed && 'flex-col w-full'
          )}>
            {/* Notifications */}
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

            {/* Log Out */}
            <button
              type="button"
              className={cn(
                'flex items-center rounded-lg py-1.5 text-[14px] font-medium text-muted-foreground',
                'hover:bg-[hsl(var(--ios-selection-bg))] hover:text-foreground transition-all duration-150 ease-out',
                // Keep icon on the left - use padding to visually center when collapsed
                collapsed ? 'w-full justify-center px-2' : 'gap-2 px-2',
              )}
              onClick={onLogout}
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5 stroke-[1.5] shrink-0" />
              <span
                className={cn(
                  'nav-item-text',
                  collapsed ? 'collapsed' : 'expanded'
                )}
              >
                Log out
              </span>
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
        onClick={onCloseMobile}
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
