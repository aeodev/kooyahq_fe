import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface GameLayoutProps {
  title: string
  onClose: () => void
  badge?: ReactNode
  headerRight?: ReactNode
  bodyClassName?: string
  contentClassName?: string
  children: ReactNode
}

export function GameLayout({
  title,
  onClose,
  badge,
  headerRight,
  bodyClassName,
  contentClassName,
  children,
}: GameLayoutProps) {
  const bodyClasses = bodyClassName ?? 'flex-1 flex items-center justify-center p-4'
  const contentClasses = contentClassName ?? 'w-full max-w-2xl'

  return (
    <div className="min-h-[85vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-card/50">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{title}</h1>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back to games">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className={bodyClasses}>
        <div className={contentClasses}>{children}</div>
      </div>
    </div>
  )
}
