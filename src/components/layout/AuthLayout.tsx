import { type PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* Base background with subtle gradient for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      
      {/* Subtle texture pattern */}
      <div 
        className="fixed inset-0 opacity-[0.02] dark:opacity-[0.03]" 
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1px,
              hsl(var(--primary)) 1px,
              hsl(var(--primary)) 2px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 1px,
              hsl(var(--primary)) 1px,
              hsl(var(--primary)) 2px
            )
          `,
          backgroundSize: '24px 24px'
        }} 
      />
      
      {/* Confident accent glow - frames the center content with purpose */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/6 rounded-full blur-[180px] pointer-events-none" />
      
      {/* Secondary accent for depth */}
      <div className="fixed top-1/3 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/3 left-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px] pointer-events-none" />

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
      <main className="relative z-10 flex-1 overflow-y-auto flex items-center justify-center py-12 sm:py-16">
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
