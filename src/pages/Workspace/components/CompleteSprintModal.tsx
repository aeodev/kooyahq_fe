import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Sprint, Card } from '@/types/board'

type CompleteSprintModalProps = {
    isOpen: boolean
    onClose: () => void
    sprint: Sprint | null
    cards: Card[]
    onComplete: (sprintId: string, moveToSprintId: string | null) => Promise<void>
    availableSprints: Sprint[]
}

export function CompleteSprintModal({
    isOpen,
    onClose,
    sprint,
    cards,
    onComplete,
    availableSprints
}: CompleteSprintModalProps) {
    const [moveTo, setMoveTo] = useState<string>('backlog')
    const [loading, setLoading] = useState(false)

    const completedCards = cards.filter(c => c.completed)
    const incompleteCards = cards.filter(c => !c.completed)
    const futureSprints = availableSprints.filter(s => s.state === 'future' && s.id !== sprint?.id)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sprint) return

        setLoading(true)
        try {
            const targetSprintId = moveTo === 'backlog' ? null : moveTo
            await onComplete(sprint.id, targetSprintId)
            onClose()
        } catch (error) {
            console.error('Failed to complete sprint:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Complete Sprint: {sprint?.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                            This sprint contains:
                        </p>
                        <ul className="list-disc list-inside text-sm font-medium">
                            <li>{completedCards.length} completed issues</li>
                            <li>{incompleteCards.length} incomplete issues</li>
                        </ul>
                    </div>

                    {incompleteCards.length > 0 && (
                        <div className="space-y-3">
                            <Label>Move incomplete issues to:</Label>
                            <RadioGroup value={moveTo} onValueChange={setMoveTo}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="backlog" id="backlog" />
                                    <Label htmlFor="backlog">Backlog</Label>
                                </div>
                                {futureSprints.map(s => (
                                    <div key={s.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={s.id} id={s.id} />
                                        <Label htmlFor={s.id}>{s.name}</Label>
                                    </div>
                                ))}
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="new_sprint" id="new_sprint" disabled />
                                    <Label htmlFor="new_sprint" className="text-muted-foreground">New Sprint (Coming Soon)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Completing...' : 'Complete Sprint'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
