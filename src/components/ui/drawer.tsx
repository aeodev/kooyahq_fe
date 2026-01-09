import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-0 left-0 w-screen h-screen z-40 bg-black/50 backdrop-blur-sm m-0"
            style={{ marginTop: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ 
              opacity: 0,
              x: side === 'right' ? '100%' : '-100%',
            }}
            animate={{ 
              opacity: 1,
              x: 0,
            }}
            exit={{ 
              opacity: 0,
              x: side === 'right' ? '100%' : '-100%',
            }}
            transition={{ 
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            className={cn(
              'fixed inset-y-0 z-50 w-full max-w-lg bg-background/95 backdrop-blur-md border-l border-border/50 shadow-xl overflow-y-auto m-0',
              side === 'right' ? 'right-0' : 'left-0',
              className,
            )}
            style={{ marginTop: 0 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

