import { Card, CardContent } from '@/components/ui/card'

export function NewsCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Avatar/Icon Skeleton */}
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-muted" />
          </div>

          {/* Content Skeleton */}
          <div className="flex-1 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
              <div className="h-4 w-4 bg-muted rounded" />
            </div>

            {/* Title skeleton */}
            <div className="space-y-2">
              <div className="h-5 w-full bg-muted rounded" />
              <div className="h-5 w-3/4 bg-muted rounded" />
            </div>

            {/* Content skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
            </div>

            {/* Tag skeleton */}
            <div className="h-6 w-16 bg-muted rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}







