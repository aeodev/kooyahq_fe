import { useState, useEffect } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import axiosInstance from '@/utils/axios.instance'
import { UPDATE_TICKET, GET_TICKET_BY_ID } from '@/utils/api.routes'
import type { TicketDetailResponse } from './types'
import { toast } from 'sonner'

type AcceptanceCriteriaSectionProps = {
  ticketDetails: TicketDetailResponse | null
  acceptanceCriteriaExpanded: boolean
  onToggleAcceptanceCriteria: () => void
}

export function AcceptanceCriteriaSection({
  ticketDetails,
  acceptanceCriteriaExpanded,
  onToggleAcceptanceCriteria,
}: AcceptanceCriteriaSectionProps) {
  const [newCriteria, setNewCriteria] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [localCriteria, setLocalCriteria] = useState(ticketDetails?.ticket.acceptanceCriteria || [])

  // Sync local criteria when ticketDetails changes
  useEffect(() => {
    if (ticketDetails?.ticket.acceptanceCriteria) {
      setLocalCriteria(ticketDetails.ticket.acceptanceCriteria)
    }
  }, [ticketDetails?.ticket.acceptanceCriteria])

  const acceptanceCriteria = localCriteria

  const handleToggleCriteria = async (criteriaId: string) => {
    if (!ticketDetails?.ticket.id || togglingId !== null) return

    // Optimistically update UI immediately
    const oldCriteria = [...acceptanceCriteria]
    const updatedCriteria = acceptanceCriteria.map((item) =>
      item.id === criteriaId ? { ...item, isCompleted: !item.isCompleted } : item
    )
    setLocalCriteria(updatedCriteria)
    setTogglingId(criteriaId)

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
    if (!newCriteria.trim() || !ticketDetails?.ticket.id || loading) return

    const newItem = {
      id: `criteria-${Date.now()}`,
      text: newCriteria.trim(),
      isCompleted: false,
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

  const handleRemoveCriteria = async (criteriaId: string) => {
    if (!ticketDetails?.ticket.id || removingId !== null) return

    // Optimistically update UI
    const oldCriteria = [...acceptanceCriteria]
    const updatedCriteria = acceptanceCriteria.filter((item) => item.id !== criteriaId)
    setLocalCriteria(updatedCriteria)
    setRemovingId(criteriaId)

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
              {acceptanceCriteria.map((criteria) => (
                <div key={criteria.id} className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleCriteria(criteria.id)}
                    disabled={togglingId !== null}
                    className={cn(
                      'flex-shrink-0 h-4 w-4 border rounded-sm flex items-center justify-center transition-colors',
                      criteria.isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50',
                      togglingId === criteria.id && 'opacity-50 cursor-wait'
                    )}
                  >
                    {togglingId === criteria.id ? (
                      <span className="text-xs">...</span>
                    ) : criteria.isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                  </button>
                  <span
                    className={cn(
                      'text-sm flex-1',
                      criteria.isCompleted && 'line-through text-muted-foreground'
                    )}
                  >
                    {criteria.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCriteria(criteria.id)}
                    disabled={removingId === criteria.id}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    {removingId === criteria.id ? '...' : '×'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {isAdding ? (
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

