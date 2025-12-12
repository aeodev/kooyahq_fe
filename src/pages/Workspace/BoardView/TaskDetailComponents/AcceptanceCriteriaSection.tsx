import { useState, useEffect } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import axiosInstance from '@/utils/axios.instance'
import { UPDATE_TICKET } from '@/utils/api.routes'
import type { TicketDetailResponse } from './types'
import { toast } from 'sonner'
import type { Ticket } from '@/types/board'

type AcceptanceCriteriaItem = Ticket['acceptanceCriteria'][number]

type AcceptanceCriteriaSectionProps = {
  ticketDetails: TicketDetailResponse | null
  acceptanceCriteriaExpanded: boolean
  onToggleAcceptanceCriteria: () => void
  canUpdate: boolean
}

export function AcceptanceCriteriaSection({
  ticketDetails,
  acceptanceCriteriaExpanded,
  onToggleAcceptanceCriteria,
  canUpdate,
}: AcceptanceCriteriaSectionProps) {
  const [newCriteria, setNewCriteria] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [localCriteria, setLocalCriteria] = useState<AcceptanceCriteriaItem[]>(
    ticketDetails?.ticket.acceptanceCriteria || []
  )

  // Sync local criteria when ticketDetails changes
  useEffect(() => {
    if (ticketDetails?.ticket.acceptanceCriteria) {
      setLocalCriteria(ticketDetails.ticket.acceptanceCriteria)
    }
  }, [ticketDetails?.ticket.acceptanceCriteria])

  const acceptanceCriteria = localCriteria

  const handleToggleCriteria = async (index: number) => {
    if (!ticketDetails?.ticket.id || togglingId !== null || !canUpdate) return

    // Optimistically update UI immediately
    const oldCriteria = [...acceptanceCriteria]
    const updatedCriteria = acceptanceCriteria.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    )
    setLocalCriteria(updatedCriteria)
    setTogglingId(String(index))

    try {
      const response = await axiosInstance.put<{ success: boolean }>(UPDATE_TICKET(ticketDetails.ticket.id), {
        data: { acceptanceCriteria: updatedCriteria },
      })
      if (!response.data.success) {
        // Revert on error
        setLocalCriteria(oldCriteria)
        toast.error('Failed to update acceptance criteria')
      }
    } catch (error) {
      // Revert on error
      setLocalCriteria(oldCriteria)
      toast.error('Failed to update acceptance criteria')
    } finally {
      setTogglingId(null)
    }
  }

  const handleAddCriteria = async () => {
    if (!newCriteria.trim() || !ticketDetails?.ticket.id || loading || !canUpdate) return

    const newItem: AcceptanceCriteriaItem = {
      text: newCriteria.trim(),
      completed: false,
    }

    // Optimistically update UI
    const updatedCriteria = [...acceptanceCriteria, newItem]
    setLocalCriteria(updatedCriteria)
    const criteriaText = newCriteria.trim()
    setNewCriteria('')
    setIsAdding(false)
    setLoading(true)

    try {
      const response = await axiosInstance.put<{ success: boolean }>(UPDATE_TICKET(ticketDetails.ticket.id), {
        data: { acceptanceCriteria: updatedCriteria },
      })
      if (!response.data.success) {
        // Revert on error
        setLocalCriteria(acceptanceCriteria)
        setNewCriteria(criteriaText)
        setIsAdding(true)
        toast.error('Failed to add acceptance criteria')
      }
    } catch (error) {
      // Revert on error
      setLocalCriteria(acceptanceCriteria)
      setNewCriteria(criteriaText)
      setIsAdding(true)
      toast.error('Failed to add acceptance criteria')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCriteria = async (index: number) => {
    if (!ticketDetails?.ticket.id || removingId !== null || !canUpdate) return

    // Optimistically update UI
    const oldCriteria = [...acceptanceCriteria]
    const updatedCriteria = acceptanceCriteria.filter((_, i) => i !== index)
    setLocalCriteria(updatedCriteria)
    setRemovingId(String(index))

    try {
      const response = await axiosInstance.put<{ success: boolean }>(UPDATE_TICKET(ticketDetails.ticket.id), {
        data: { acceptanceCriteria: updatedCriteria },
      })
      if (!response.data.success) {
        // Revert on error
        setLocalCriteria(oldCriteria)
        toast.error('Failed to remove acceptance criteria')
      }
    } catch (error) {
      // Revert on error
      setLocalCriteria(oldCriteria)
      toast.error('Failed to remove acceptance criteria')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div>
      <button
        onClick={onToggleAcceptanceCriteria}
        className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform',
            acceptanceCriteriaExpanded && 'rotate-90'
          )}
        />
        Acceptance Criteria
      </button>
      {acceptanceCriteriaExpanded && (
        <div className="ml-6 space-y-2">
          {acceptanceCriteria.length > 0 && (
            <div className="space-y-2">
              {acceptanceCriteria.map((criteria, index) => (
                <div key={`${criteria.text}-${index}`} className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleCriteria(index)}
                    disabled={togglingId !== null || !canUpdate}
                    className={cn(
                      'flex-shrink-0 h-4 w-4 border rounded-sm flex items-center justify-center transition-colors',
                      criteria.completed
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50',
                      togglingId === String(index) && 'opacity-50 cursor-wait'
                    )}
                  >
                    {togglingId === String(index) ? (
                      <span className="text-xs">...</span>
                    ) : criteria.completed ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                  </button>
                  <span
                    className={cn(
                      'text-sm flex-1',
                      criteria.completed && 'line-through text-muted-foreground'
                    )}
                  >
                    {criteria.text}
                  </span>
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCriteria(index)}
                      disabled={removingId === String(index)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      {removingId === String(index) ? '...' : '×'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {canUpdate && isAdding ? (
            <div className="flex gap-2">
              <Input
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                placeholder="Enter acceptance criteria..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCriteria()
                  } else if (e.key === 'Escape') {
                    setIsAdding(false)
                    setNewCriteria('')
                  }
                }}
                autoFocus
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddCriteria} disabled={loading}>
                {loading ? 'Adding...' : 'Add'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false)
                  setNewCriteria('')
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add acceptance criteria
            </button>
          )}
        </div>
      )}
    </div>
  )
}
