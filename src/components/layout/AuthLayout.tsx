import { type PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { cn } from '@/utils/cn'

type AuthLayoutProps = PropsWithChildren<{
  align?: 'center' | 'top'
}>

export function AuthLayout({ children, align = 'center' }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* Deep layered gradient base */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_100%,hsl(var(--primary)/0.08),transparent_40%)]" />
      
      {/* Animated floating orbs */}
      <div className="fixed top-[10%] left-[15%] w-72 h-72 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="fixed bottom-[20%] right-[10%] w-96 h-96 rounded-full bg-gradient-to-tl from-primary/15 to-transparent blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '12s', animationDelay: '2s' }} />
      <div className="fixed top-[60%] left-[60%] w-48 h-48 rounded-full bg-primary/10 blur-2xl animate-pulse pointer-events-none" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      
      {/* Geometric pattern overlay - diagonal lines */}
      <div 
        className="fixed inset-0 opacity-[0.015] dark:opacity-[0.025]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              hsl(var(--primary)),
              hsl(var(--primary)) 1px,
              transparent 1px,
              transparent 60px
            )
          `,
        }}
      />
      
      {/* Dot grid pattern */}
      <div 
        className="fixed inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at center, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      
      {/* Accent corner shapes */}
      <div className="fixed -top-32 -right-32 w-96 h-96 border border-primary/10 rounded-full pointer-events-none" />
      <div className="fixed -top-16 -right-16 w-64 h-64 border border-primary/5 rounded-full pointer-events-none" />
      <div className="fixed -bottom-24 -left-24 w-80 h-80 border border-primary/10 rounded-full pointer-events-none" />
      
      {/* Floating angular shapes */}
      <div className="fixed top-[25%] right-[8%] w-24 h-24 border-l-2 border-t-2 border-primary/15 rotate-12 pointer-events-none" />
      <div className="fixed bottom-[30%] left-[5%] w-32 h-32 border-r-2 border-b-2 border-primary/10 -rotate-12 pointer-events-none" />

      {/* Header with better branding */}
      <header className="relative z-10 border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 sm:h-18 w-full items-center justify-between px-8 sm:px-12 lg:px-16 xl:px-20">
          <Link 
            to="/" 
            className="text-xl sm:text-2xl font-bold tracking-tight text-primary font-[Poppins] hover:opacity-80 transition-opacity relative group"
          >
            <span className="relative z-10">KooyaHQ</span>
            <span className="absolute inset-0 bg-primary/10 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle className="h-9 w-9 sm:h-10 sm:w-10 hover:scale-105 transition-transform" />
          </div>
        </div>
      </header>

      {/* Main content with better vertical centering */}
      <main
        className={cn(
          'relative z-10 flex-1 overflow-y-auto flex py-12 sm:py-16',
          align === 'center' ? 'items-center justify-center' : 'items-start justify-start',
        )}
      >
        {children}
      </main>

      {/* Footer - minimal, no marketing fluff */}
      <footer className="relative z-10 border-t border-border/50 bg-background/60 backdrop-blur-md mt-auto">
        <div className="mx-auto w-full py-4 sm:py-5 px-8 sm:px-12 lg:px-16 xl:px-20">
          <div className="flex items-center justify-center text-xs sm:text-sm text-muted-foreground">
            <span className="whitespace-nowrap">© {new Date().getFullYear()} KooyaHQ</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
