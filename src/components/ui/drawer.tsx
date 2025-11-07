import { useEffect } from 'react'
import { cn } from '@/utils/cn'

type DrawerProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  side?: 'left' | 'right'
  className?: string
}

export function Drawer({ open, onClose, children, side = 'right', className }: DrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed top-0 left-0 w-screen h-screen z-40 bg-black/50 backdrop-blur-sm transition-opacity m-0"
        style={{ marginTop: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed inset-y-0 z-50 w-full max-w-lg bg-background/95 backdrop-blur-md border-l border-border/50 shadow-xl transition-transform duration-300 ease-in-out overflow-y-auto m-0',
          side === 'right' ? 'right-0' : 'left-0',
          open ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full',
          className,
        )}
        style={{ marginTop: 0 }}
      >
        {children}
      </div>
    </>
  )
}

