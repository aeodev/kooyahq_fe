import { type PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Sidebar, useSidebarStore } from '@/components/layout/Sidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { cn } from '@/utils/cn'

type DashboardLayoutProps = PropsWithChildren<{
  className?: string
}>

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const openMobile = useSidebarStore((s) => s.openMobile)

  return (
    <div className={cn('flex h-screen bg-background text-foreground', className)}>
      <Sidebar />

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={openMobile}
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

        <footer className="border-t border-border bg-background">
          <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="whitespace-nowrap">© {new Date().getFullYear()} KooyaHQ</span>
              <span className="font-medium text-primary whitespace-nowrap">Ship work that matters.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
