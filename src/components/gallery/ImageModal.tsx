import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GalleryItem, UpdateGalleryItemInput } from '@/types/gallery'
import { cn } from '@/utils/cn'
import { ChevronLeft, ChevronRight, Edit2, Trash2, Download, X } from 'lucide-react'

type ImageModalProps = {
  items: GalleryItem[]
  selectedIndex: number
  canManageGallery: boolean
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
  onSelectIndex: (index: number) => void
  onUpdate: (id: string, updates: UpdateGalleryItemInput) => Promise<void>
  onDelete: (id: string) => void
  onDownload: (imageUrl: string, filename: string) => void
}

export function ImageModal({
  items,
  selectedIndex,
  canManageGallery,
  onClose,
  onNavigate,
  onSelectIndex,
  onUpdate,
  onDelete,
  onDownload,
}: ImageModalProps) {
  const selectedImage = items[selectedIndex]
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ title: '', description: '' })

  const handleEdit = useCallback((item: GalleryItem) => {
    setEditingId(item.id)
    setEditData({ title: item.title, description: item.description || '' })
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!editingId) return
    await onUpdate(editingId, {
      title: editData.title,
      description: editData.description,
    })
    setEditingId(null)
    setEditData({ title: '', description: '' })
  }, [editingId, editData, onUpdate])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditData({ title: '', description: '' })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex !== null) {
        if (e.key === 'Escape') onClose()
        if (e.key === 'ArrowLeft') onNavigate('prev')
        if (e.key === 'ArrowRight') onNavigate('next')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, onClose, onNavigate])

  if (!selectedImage) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 m-0"
      style={{ margin: 0, marginTop: 0 }}
      onClick={onClose}
    >
      {/* Top buttons - Close and Download */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            onDownload(selectedImage.imageUrl, selectedImage.filename)
          }}
          title="Download image"
        >
          <Download className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main image area */}
      <div className="flex-1 flex items-center justify-center relative">
        {items.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                onNavigate('prev')
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                onNavigate('next')
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        <div className="flex flex-col items-center max-h-full px-4" onClick={(e) => e.stopPropagation()}>
          {/* Edit form for managers */}
          {canManageGallery && editingId === selectedImage.id ? (
            <Card className="w-full max-w-md mb-4 bg-background/95 backdrop-blur-md">
              <CardHeader>
                <CardTitle>Edit Image Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    placeholder="Title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Description"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleUpdate}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <img
            src={selectedImage.imageUrl}
            alt={selectedImage.title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E'
            }}
          />
          <div className="mt-4 text-center text-white max-w-2xl">
            <div className="flex items-center justify-center gap-4 mb-2">
              {canManageGallery && editingId !== selectedImage.id && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(selectedImage)
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-red-500/20 hover:bg-red-500/30 text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(selectedImage.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
            <h3 className="text-2xl font-bold mb-2">{selectedImage.title}</h3>
            {selectedImage.description && (
              <p className="text-white/80 mb-2">{selectedImage.description}</p>
            )}
            <p className="text-sm text-white/60">
              {selectedIndex + 1} of {items.length} • Added {new Date(selectedImage.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {items.length > 1 && (
        <div className="border-t border-white/20 pt-4 mt-auto">
          <div className="flex gap-2 justify-center overflow-x-auto pb-2 max-w-full" onClick={(e) => e.stopPropagation()}>
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectIndex(index)
                }}
                className={cn(
                  'flex-shrink-0 relative overflow-hidden rounded-md border-2 transition-all',
                  index === selectedIndex
                    ? 'border-white scale-110'
                    : 'border-white/30 hover:border-white/60 opacity-70 hover:opacity-100'
                )}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-20 h-20 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ddd" width="80" height="80"/%3E%3C/svg%3E'
                  }}
                />
                {index === selectedIndex && (
                  <div className="absolute inset-0 bg-white/20 border-2 border-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

