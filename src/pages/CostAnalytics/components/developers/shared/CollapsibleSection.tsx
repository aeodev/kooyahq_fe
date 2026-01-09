import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface CollapsibleSectionProps {
  title: string
  description?: string
  defaultExpanded?: boolean
  storageKey?: string
  children: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  description,
  defaultExpanded = false,
  storageKey,
  children,
  className,
}: CollapsibleSectionProps) {
  const getStoredState = (): boolean => {
    if (!storageKey) return defaultExpanded
    try {
      const stored = localStorage.getItem(`collapsible.${storageKey}`)
      return stored !== null ? stored === 'true' : defaultExpanded
    } catch {
      return defaultExpanded
    }
  }

  const [isExpanded, setIsExpanded] = useState(getStoredState)

  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(`collapsible.${storageKey}`, String(isExpanded))
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [isExpanded, storageKey])

  const toggle = () => setIsExpanded(!isExpanded)

  return (
    <div className={cn('space-y-2', className)}>
      <Button
        variant="ghost"
        onClick={toggle}
        className="w-full justify-between p-0 h-auto hover:bg-transparent"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <span className="text-xs text-muted-foreground hidden sm:inline">{description}</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
