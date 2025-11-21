import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Sprint } from '@/types/board'

type StartSprintModalProps = {
    isOpen: boolean
    onClose: () => void
    sprint: Sprint | null
    onStart: (sprintId: string, data: { name: string; goal: string; startDate: string; endDate: string }) => Promise<void>
}

export function StartSprintModal({ isOpen, onClose, sprint, onStart }: StartSprintModalProps) {
    const [name, setName] = useState('')
    const [goal, setGoal] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (sprint && isOpen) {
            setName(sprint.name)
            setGoal(sprint.goal || '')
            // Default to today and 2 weeks from now
            const start = new Date()
            const end = new Date()
            end.setDate(end.getDate() + 14)

            setStartDate(start.toISOString().split('T')[0])
            setEndDate(end.toISOString().split('T')[0])
        }
    }, [sprint, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sprint) return

        setLoading(true)
        try {
            await onStart(sprint.id, {
                name,
                goal,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
            })
            onClose()
        } catch (error) {
            console.error('Failed to start sprint:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Start Sprint</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Sprint Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Sprint Name"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="goal">Sprint Goal</Label>
                        <Textarea
                            id="goal"
                            value={goal}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoal(e.target.value)}
                            placeholder="What is the goal of this sprint?"
                            className="resize-none"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Starting...' : 'Start'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
