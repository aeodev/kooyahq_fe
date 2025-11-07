import { type LucideIcon, ChevronLeft, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { cn } from '@/utils/cn'

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
  const brand = collapsed ? 'K' : 'KooyaHQ'

  const Content = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="relative flex items-center border-b border-border/40 px-3 sm:px-4 py-3 sm:py-4">
        {collapsed ? (
          <button
            type="button"
            className={cn(
              'truncate font-bold tracking-tight text-primary transition-all hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md text-lg sm:text-xl mx-auto cursor-pointer',
              'font-[Poppins]'
            )}
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
          >
            {brand}
          </button>
        ) : (
          <>
            <Link
              to="/"
              className={cn(
                'truncate font-bold tracking-tight text-primary transition-all hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md text-xl sm:text-2xl flex-1',
                'font-[Poppins]'
              )}
              onClick={onCloseMobile}
            >
              {brand}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 shrink-0 rounded-xl text-muted-foreground transition-all duration-300 hover:bg-accent/50 hover:text-foreground hover:shadow-md border border-transparent hover:border-border/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:flex"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 sm:space-y-1.5 overflow-y-auto px-2 sm:px-3 py-3 sm:py-4" aria-label="Main navigation">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={cn(
                'group relative flex items-center gap-2 sm:gap-3 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isActive
                  ? 'bg-primary/10 backdrop-blur-sm text-primary dark:bg-primary/20 border border-primary/30 shadow-md'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent hover:border-border/30',
                collapsed && 'justify-center px-2',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary',
                    collapsed && 'hidden',
                  )}
                />
              )}
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
                aria-hidden="true"
              />
              <span className={cn('truncate transition-opacity', collapsed && 'sr-only')}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={cn('mt-auto space-y-2 border-t border-border/40 py-3 sm:py-4', collapsed ? 'px-2' : 'px-2 sm:px-3')}>
        {/* User Profile */}
        <Link
          to="/profile"
          onClick={onCloseMobile}
          className={cn(
            'flex items-center gap-2 sm:gap-3 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 transition-all duration-300 hover:bg-accent/50 cursor-pointer border border-transparent hover:border-border/30',
            collapsed && 'justify-center px-2',
          )}
        >
          {profilePic && profilePic !== 'undefined' && profilePic.trim() !== '' ? (
            <img
              key={profilePic}
              src={profilePic}
              alt={userName}
              className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-background"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                const parent = (e.target as HTMLImageElement).parentElement
                if (parent && !parent.querySelector('.fallback-initials')) {
                  const fallback = document.createElement('span')
                  fallback.className = 'fallback-initials flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground shadow-sm ring-2 ring-background'
                  fallback.textContent = initials || 'KH'
                  parent.insertBefore(fallback, e.target as HTMLImageElement)
                }
              }}
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground shadow-sm ring-2 ring-background">
              {initials || 'KH'}
            </span>
          )}
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          ) : null}
        </Link>

        {/* Actions */}
        <div className={cn('flex items-center gap-2', collapsed && 'flex-col items-center')}>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn(
              'gap-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              collapsed ? 'h-9 w-9' : 'flex-1 justify-start',
            )}
            onClick={onLogout}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Log out</span>}
          </Button>
          {!collapsed && (
            <div onClick={onCloseMobile} className="flex-shrink-0">
              <NotificationBell />
            </div>
          )}
          <div className={cn('hidden md:flex', collapsed && 'w-full justify-center')}>
            <ThemeToggle
              className={cn('h-9 w-9', !collapsed && 'shrink-0')}
              aria-label="Toggle theme"
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 md:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
        onClick={onCloseMobile}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-60 flex h-screen flex-col border-r border-border bg-background/98 backdrop-blur-xl shadow-xl transition-all duration-300 ease-in-out md:static md:h-full md:translate-x-0 md:z-auto',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-full flex-col overflow-hidden">{Content}</div>
      </aside>
    </>
  )
}
