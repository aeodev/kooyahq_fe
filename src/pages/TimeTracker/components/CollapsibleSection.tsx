import { useState } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown } from 'lucide-react'

type CollapsibleSectionProps = {
  title: string
  icon: React.ElementType
  defaultOpen?: boolean
  badge?: ReactNode
  children: ReactNode
}

export function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  badge,
  children
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <CardContent className="p-4 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

