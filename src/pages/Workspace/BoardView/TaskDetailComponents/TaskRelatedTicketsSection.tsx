import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { TicketDetailResponse } from './types'
import { getTaskTypeIcon } from '../index'

type TaskRelatedTicketsSectionProps = {
  relatedTickets: TicketDetailResponse['relatedTickets'] | null
  onNavigateToTask?: (ticketKey: string) => void
}

export function TaskRelatedTicketsSection({
  relatedTickets,
  onNavigateToTask,
}: TaskRelatedTicketsSectionProps) {
  const [expanded, setExpanded] = useState(true)

  if (!relatedTickets) return null

  // Filter out subtasks from children - subtasks should only appear in Subtasks section
  const nonSubtaskChildren = relatedTickets.children.filter((child) => child.ticketType !== 'subtask')
  const hasRelatedTickets = 
    relatedTickets.parent || 
    nonSubtaskChildren.length > 0 || 
    relatedTickets.siblings.length > 0 || 
    relatedTickets.epicTickets.length > 0

  if (!hasRelatedTickets) return null

  const handleTicketClick = (ticketKey: string) => {
    if (onNavigateToTask) {
      onNavigateToTask(ticketKey)
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform',
            expanded && 'rotate-90'
          )}
        />
        Related Tickets
      </button>
      {expanded && (
        <div className="ml-6 space-y-3">
          {/* Parent */}
          {relatedTickets.parent && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Parent</p>
              <button
                onClick={() => handleTicketClick(relatedTickets.parent!.ticketKey)}
                className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
              >
                {getTaskTypeIcon(relatedTickets.parent.ticketType)}
                <span className="text-sm font-medium text-primary hover:underline">
                  {relatedTickets.parent.ticketKey}
                </span>
                <span className="text-sm text-foreground">{relatedTickets.parent.title}</span>
              </button>
            </div>
          )}

          {/* Children (excluding subtasks) */}
          {nonSubtaskChildren.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Children ({nonSubtaskChildren.length})</p>
              <div className="space-y-1">
                {nonSubtaskChildren.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleTicketClick(child.ticketKey)}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                  >
                    {getTaskTypeIcon(child.ticketType)}
                    <span className="text-sm font-medium text-primary hover:underline">
                      {child.ticketKey}
                    </span>
                    <span className="text-sm text-foreground">{child.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Siblings */}
          {relatedTickets.siblings.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Siblings ({relatedTickets.siblings.length})</p>
              <div className="space-y-1">
                {relatedTickets.siblings.map((sibling) => (
                  <button
                    key={sibling.id}
                    onClick={() => handleTicketClick(sibling.ticketKey)}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                  >
                    {getTaskTypeIcon(sibling.ticketType)}
                    <span className="text-sm font-medium text-primary hover:underline">
                      {sibling.ticketKey}
                    </span>
                    <span className="text-sm text-foreground">{sibling.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Epic Tickets */}
          {relatedTickets.epicTickets.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Epic Tickets ({relatedTickets.epicTickets.length})</p>
              <div className="space-y-1">
                {relatedTickets.epicTickets.map((epicTicket) => (
                  <button
                    key={epicTicket.id}
                    onClick={() => handleTicketClick(epicTicket.ticketKey)}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                  >
                    {getTaskTypeIcon('epic')}
                    <span className="text-sm font-medium text-primary hover:underline">
                      {epicTicket.ticketKey}
                    </span>
                    <span className="text-sm text-foreground">{epicTicket.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

