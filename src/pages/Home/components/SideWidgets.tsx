import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Ticket, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/utils/cn'
import type { Ticket as TicketType } from '@/types/board'

// Priority badge configuration with colors and labels
const PRIORITY_CONFIG: Record<string, { 
  label: string
  textColor: string
  bgColor: string
}> = {
  highest: { 
    label: 'HIGHEST',
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10'
  },
  high: { 
    label: 'HIGH',
    textColor: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10'
  },
  medium: { 
    label: 'MEDIUM',
    textColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10'
  },
  low: { 
    label: 'LOW',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10'
  },
  lowest: { 
    label: 'LOWEST',
    textColor: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-400/10'
  },
}

interface AssignedTicketsWidgetProps {
  tickets: TicketType[]
  className?: string
}

export function AssignedTicketsWidget({ tickets, className }: AssignedTicketsWidgetProps) {
  const displayTickets = tickets.slice(0, 5)

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between py-5 px-6 space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Ticket className="h-4 w-4 text-violet-500" />
          </div>
          <span>Assigned to Me</span>
          {tickets.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md tabular-nums font-bold">
              {tickets.length}
            </span>
          )}
        </CardTitle>
        <Link 
          to="/workspace/boards"
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 transition-colors"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 px-6 pb-5">
        {tickets.length > 0 ? (
          <div className="space-y-1">
            {displayTickets.map((ticket, index) => {
              const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium
              
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    to={`/workspace/${ticket.ticketKey.split('-')[0]}?selectedTask=${ticket.ticketKey}`}
                    className="group flex items-center gap-3 p-3 -mx-2 rounded-xl hover:bg-muted/40 transition-all duration-200"
                  >
                    {/* Priority badge with text label */}
                    <span className={cn(
                      "shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide",
                      priority.textColor,
                      priority.bgColor
                    )}>
                      {priority.label}
                    </span>
                    
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-mono font-bold shrink-0 uppercase tracking-wide">
                          {ticket.ticketKey}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground transition-colors">
                        {ticket.title}
                      </p>
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all shrink-0" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
              <Ticket className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No tickets assigned</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Enjoy your free time!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
