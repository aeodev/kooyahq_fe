import { useMemo, useState, useEffect, type PropsWithChildren } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Clock4, Globe, Home, LayoutGrid, Images, Sparkles, MessageSquare, Gamepad2, Menu, Users } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/layout/Sidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/utils/cn'

type AppLayoutProps = PropsWithChildren<{
  className?: string
}>

export function AppLayout({ children, className }: AppLayoutProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const firstName = user?.name.split(' ')[0] ?? null
  const initials =
    user?.name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') ?? ''
  
  // Debug: log user profilePic
  if (user?.profilePic) {
    console.log('AppLayout - User profilePic:', user.profilePic)
  }
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Keyboard shortcut: Press 'K' to toggle sidebar when expanded
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only toggle if sidebar is expanded and 'K' is pressed (not in input/textarea)
      if (e.key.toLowerCase() === 'k' && !collapsed) {
        const target = e.target as HTMLElement
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        
        if (!isInput) {
          e.preventDefault()
          setCollapsed(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [collapsed])

  const navigation = useMemo(
    () => {
      const nav = [
        { name: 'Dashboard', to: '/', icon: Home },
        { name: 'Workspace', to: '/workspace', icon: LayoutGrid },
        { name: 'Presence', to: '/presence', icon: Globe },
        { name: 'Time Tracker', to: '/time-tracker', icon: Clock4 },
        { name: 'Gallery', to: '/gallery', icon: Images, adminOnly: true },
        { name: 'AI News', to: '/ai-news', icon: Sparkles },
        { name: 'Feed', to: '/feed', icon: MessageSquare },
        { name: 'Games', to: '/games', icon: Gamepad2 },
        { name: 'Employees', to: '/admin/employees', icon: Users, adminOnly: true },
      ]
      
      // Filter admin-only items if user is not admin
      return nav.filter((item) => !item.adminOnly || user?.isAdmin)
    },
    [user?.isAdmin],
  )

  if (!user) {
    return (
      <div className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}>
        <header className="border-b border-border">
          <div className="mx-auto flex h-14 sm:h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link to="/" className="text-base sm:text-lg font-semibold tracking-tight text-primary font-[Poppins]">
              KooyaHQ
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button asChild variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                <Link to="/signup">Sign up</Link>
              </Button>
              <ThemeToggle className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:py-8 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>

        <footer className="border-t border-border px-4 py-3 sm:py-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 text-xs sm:text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} KooyaHQ</span>
            <span className="font-medium text-primary">Ship work that matters.</span>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className={cn('flex h-screen bg-background text-foreground', className)}>
      <Sidebar
        navigation={navigation}
        pathname={location.pathname}
        userName={firstName ?? user.name}
        userEmail={user.email}
        initials={initials}
        profilePic={user.profilePic}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={logout}
      />

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="text-lg font-semibold tracking-tight text-primary font-[Poppins]">
            KooyaHQ
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle className="h-9 w-9" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 sm:py-6 md:px-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <footer className="border-t border-border px-4 py-3 sm:py-4">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 text-xs sm:text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} KooyaHQ</span>
            <span className="font-medium text-primary">Ship work that matters.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
