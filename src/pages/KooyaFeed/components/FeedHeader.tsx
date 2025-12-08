import { memo } from 'react'

import { cn } from '@/utils/formatters'

interface FeedHeaderProps {
    filter: 'all' | 'media' | 'polls'
    onFilterChange: (filter: 'all' | 'media' | 'polls') => void
}

export const FeedHeader = memo(function FeedHeader({ filter, onFilterChange }: FeedHeaderProps) {
    return (
        <div className="pt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                    Feed
                </h1>
                <p className="text-muted-foreground">What's happening in your network</p>
            </div>

            <div className="flex bg-muted/50 p-1 rounded-xl">
                {(['all', 'media', 'polls'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => onFilterChange(key)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                            filter === key
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                    >
                        {key}
                    </button>
                ))}
            </div>
        </div>
    )
})
