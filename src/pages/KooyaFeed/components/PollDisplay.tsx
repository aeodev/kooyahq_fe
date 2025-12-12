import { useMemo, useOptimistic, useTransition } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/formatters'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import type { Post } from '@/types/post'
import { PERMISSIONS } from '@/constants/permissions'

interface PollDisplayProps {
    post: Post
    onVote: (postId: string, optionIndex: number) => Promise<void>
}

export function PollDisplay({ post, onVote }: PollDisplayProps) {
    const user = useAuthStore((state) => state.user)
    const can = useAuthStore((state) => state.can)
    const [_, startTransition] = useTransition()
    const canVote = can(PERMISSIONS.POST_POLL_VOTE) || can(PERMISSIONS.POST_FULL_ACCESS)

    if (!post.poll) return null

    // Optimistic UI for voting
    const [optimisticPoll, updateOptimisticPoll] = useOptimistic(
        post.poll,
        (state, optionIndex: number) => {
            const newState = { ...state, options: [...state.options] }
            // Remove user from all options
            newState.options = newState.options.map(opt => ({
                ...opt,
                votes: opt.votes.filter(id => id !== user?.id)
            }))
            // Add user to selected option
            if (user) {
                // Ensure array exists (fix potential undefined if backend returns partial)
                if (!newState.options[optionIndex].votes) newState.options[optionIndex].votes = []
                newState.options[optionIndex].votes = [...newState.options[optionIndex].votes, user.id]
            }
            return newState
        }
    )

    const totalVotes = useMemo(() => {
        return optimisticPoll.options.reduce((acc, opt) => acc + (opt.votes ? opt.votes.length : 0), 0)
    }, [optimisticPoll])

    const handleVote = (index: number) => {
        if (!user || !canVote) return

        startTransition(async () => {
            updateOptimisticPoll(index)
            try {
                await onVote(post.id, index)
            } catch (error) {
                toast.error('Failed to vote')
            }
        })
    }

    return (
        <div className="mt-3 space-y-3">
            <div className="mb-2">
                <h3 className="font-medium text-base">{optimisticPoll.question}</h3>
            </div>

            <div className="space-y-2">
                {optimisticPoll.options.map((option, index) => {
                    const voteCount = option.votes.length
                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
                    const hasVoted = user ? option.votes.includes(user.id) : false

                    return (
                        <button
                            key={index}
                            onClick={() => handleVote(index)}
                            className="relative w-full text-left group"
                            disabled={!user || !canVote}
                        >
                            {/* Progress Bar Background */}
                            <div className="absolute inset-0 rounded-lg bg-secondary/50 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className={cn(
                                        "h-full transition-colors",
                                        hasVoted ? "bg-primary/20" : "bg-primary/10"
                                    )}
                                />
                            </div>

                            {/* Content */}
                            <div className="relative p-3 flex items-center justify-between text-sm font-medium z-10">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                                        hasVoted
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-muted-foreground/30 group-hover:border-primary/50"
                                    )}>
                                        {hasVoted && <Check className="w-3 h-3" />}
                                    </div>
                                    <span>{option.text}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                    {hasVoted && <span>{percentage}%</span>}
                                    <span>({voteCount} votes)</span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>

            <div className="text-xs text-muted-foreground pt-1">
                {totalVotes} total votes • {optimisticPoll.endDate ? `Ends ${new Date(optimisticPoll.endDate).toLocaleDateString()}` : 'Poll'}
            </div>
        </div>
    )
}
