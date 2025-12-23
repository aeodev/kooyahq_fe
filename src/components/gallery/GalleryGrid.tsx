import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { GalleryItem } from '@/types/gallery'
import { Image as ImageIcon, Edit2, Trash2, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'

type GalleryGridProps = {
  items: GalleryItem[]
  canManageGallery: boolean
  canApproveGallery: boolean
  selectedItems: string[]
  isDeleting: boolean
  deletingId: string | null
  selectMode: boolean
  onImageClick: (index: number) => void
  onEdit: (item: GalleryItem) => void
  onDelete: (id: string) => void
  onApprove?: (id: string) => void
  onToggleSelection: (id: string) => void
}

export function GalleryGrid({ 
  items, 
  canManageGallery,
  canApproveGallery,
  selectedItems,
  isDeleting,
  deletingId,
  selectMode,
  onImageClick, 
  onEdit, 
  onDelete,
  onApprove,
  onToggleSelection,
}: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {canManageGallery ? 'No gallery items yet. Upload images to get started.' : 'No gallery items yet.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
      isDeleting && "pointer-events-none opacity-70"
    )}>
      {items.map((item, index) => {
        const isSelected = selectedItems.includes(item.id)
        const isDeletingThis = deletingId === item.id
        
        return (
          <div
            key={item.id}
            className={cn(
              "relative group aspect-video bg-muted rounded-2xl border border-border/50 ring-1 ring-border/30 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300",
              selectMode ? "cursor-default" : "cursor-pointer",
              isSelected && selectMode && "ring-2 ring-primary border-primary shadow-xl scale-[1.02]",
              isDeletingThis && "opacity-50 pointer-events-none",
              item.status === 'pending' && "ring-2 ring-yellow-500/50"
            )}
            onClick={() => {
              if (selectMode) {
                onToggleSelection(item.id)
              } else {
                onImageClick(index)
              }
            }}
          >
            {/* Status Badge - top left (only for pending) */}
            {item.status === 'pending' && (
              <div className="absolute top-3 left-3 z-10">
                <Badge variant="secondary" className="bg-yellow-500/90 text-white">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
            )}

            {/* Selection Checkbox - top left, only visible in select mode */}
            {canManageGallery && selectMode && (
              <div 
                className="absolute top-3 left-3 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(item.id)}
                />
              </div>
            )}
            
            {/* Loading overlay when deleting */}
            {isDeletingThis && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E'
              }}
            />
            {/* Approve button - bottom right, visible on hover for pending items (approvers only) */}
            {canApproveGallery && !isDeletingThis && !selectMode && item.status === 'pending' && (
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    onApprove?.(item.id)
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            )}

            {/* Edit/Delete buttons - top right corner, visible on hover (managers only, hidden in select mode) */}
            {canManageGallery && !isDeletingThis && !selectMode && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(item)
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(item.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
