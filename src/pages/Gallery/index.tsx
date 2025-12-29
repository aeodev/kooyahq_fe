import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { GalleryItem } from '@/types/gallery'
import { Upload, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { useGallery } from '@/hooks/gallery.hooks'
import { useGalleryQuery, useGalleryQueryActions } from '@/hooks/queries/gallery.queries'
import { GalleryUploadSection } from '@/components/gallery/GalleryUploadSection'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { ImageModal } from '@/components/gallery/ImageModal'
import { GalleryBatchActions } from '@/components/gallery/GalleryBatchActions'

export function Gallery() {
  const can = useAuthStore((state) => state.can)
  const canViewGallery = useMemo(
    () => can(PERMISSIONS.GALLERY_READ) || can(PERMISSIONS.GALLERY_FULL_ACCESS),
    [can],
  )
  const canManageGallery = useMemo(
    () =>
      canViewGallery &&
      (can(PERMISSIONS.GALLERY_FULL_ACCESS) ||
        can(PERMISSIONS.GALLERY_CREATE) ||
        can(PERMISSIONS.GALLERY_UPDATE) ||
        can(PERMISSIONS.GALLERY_DELETE) ||
        can(PERMISSIONS.GALLERY_BULK_CREATE)),
    [can, canViewGallery],
  )
  const canApproveGallery = useMemo(
    () => can(PERMISSIONS.GALLERY_APPROVE) || can(PERMISSIONS.GALLERY_FULL_ACCESS),
    [can],
  )

  const [showUploadSection, setShowUploadSection] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)

  // Query params for gallery items
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: 20,
    search: searchQuery || undefined,
  }), [currentPage, searchQuery])
  
  // Use TanStack Query for cached data fetching
  const { data: galleryData, isLoading: loading, error: queryError } = useGalleryQuery(
    canViewGallery ? queryParams : undefined
  )
  const { invalidateGallery } = useGalleryQueryActions()
  
  const items = galleryData?.items ?? []
  const pagination = galleryData?.pagination
  const error = queryError?.message ?? null

  // Keep mutations from existing hook
  const {
    selectedItems,
    createGalleryItem,
    createMultipleGalleryItems,
    updateGalleryItem,
    deleteGalleryItem,
    deleteMultipleGalleryItems,
    approveGalleryItem,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useGallery()

  const handleUpload = async (files: Array<{ file: File; title: string; description?: string }>) => {
    setUploading(true)

    try {
      if (files.length === 1) {
        const uploadFile = files[0]
        await createGalleryItem(uploadFile.file, uploadFile.title, uploadFile.description)
      } else {
        await createMultipleGalleryItems(files)
      }

      invalidateGallery()
      setShowUploadSection(false)
    } catch (err) {
      console.error('Failed to upload images:', err)
    } finally {
      setUploading(false)
    }
  }


  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    setDeletingId(id)
    try {
      await deleteGalleryItem(id)
      invalidateGallery()
    } catch (err) {
      console.error('Failed to delete gallery item:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) return

    setIsDeleting(true)
    try {
      await deleteMultipleGalleryItems(selectedItems)
      invalidateGallery()
      setSelectMode(false)
      clearSelection()
    } catch (err) {
      console.error('Failed to delete gallery items:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await approveGalleryItem(id)
      invalidateGallery()
    } catch (err) {
      console.error('Failed to approve gallery item:', err)
    }
  }

  const handleToggleSelectMode = () => {
    setSelectMode(!selectMode)
    if (selectMode) {
      clearSelection()
    }
  }

  const handleSelectAll = () => {
    selectAll(items.map((item) => item.id))
  }

  const handleEdit = useCallback((item: GalleryItem) => {
    const index = items.findIndex((i) => i.id === item.id)
    if (index !== -1) {
      setSelectedImageIndex(index)
    }
  }, [items])


  const openImageModal = (index: number) => {
    setSelectedImageIndex(index)
  }

  const closeImageModal = () => {
    setSelectedImageIndex(null)
  }

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : items.length - 1)
    } else {
      setSelectedImageIndex(selectedImageIndex < items.length - 1 ? selectedImageIndex + 1 : 0)
    }
  }, [selectedImageIndex, items.length])

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'image.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  if (!canViewGallery) {
    return null
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
          <p className="text-muted-foreground mt-1">
            {canManageGallery ? 'Manage gallery images' : 'Browse gallery images'}
          </p>
        </div>
        {canManageGallery && (
          <Button onClick={() => setShowUploadSection(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search Bar and Batch Actions */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search gallery..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setCurrentPage(1)
          }}
          className="max-w-sm"
        />
        {canManageGallery && (
          <GalleryBatchActions
            selectedCount={selectedItems.length}
            totalCount={items.length}
            selectMode={selectMode}
            onToggleSelectMode={handleToggleSelectMode}
            onSelectAll={handleSelectAll}
            onClearSelection={clearSelection}
            onDeleteSelected={handleDeleteSelected}
            isDeleting={isDeleting}
          />
        )}
      </div>

      {/* Upload Modal */}
      {canManageGallery && (
        <Dialog open={showUploadSection} onOpenChange={setShowUploadSection}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Images</DialogTitle>
              <DialogDescription>
                Drag and drop images or click to select files. You can upload multiple images at once.
              </DialogDescription>
            </DialogHeader>
            <GalleryUploadSection 
              onUpload={handleUpload} 
              uploading={uploading}
              onClose={() => setShowUploadSection(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Gallery Grid */}
      <GalleryGrid
        items={items}
        canManageGallery={canManageGallery}
        canApproveGallery={canApproveGallery}
        selectedItems={selectedItems}
        isDeleting={isDeleting}
        deletingId={deletingId}
        selectMode={selectMode}
        onImageClick={openImageModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onToggleSelection={toggleSelection}
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages || loading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Image Modal with Thumbnails */}
      {selectedImageIndex !== null && (
        <ImageModal
          items={items}
          selectedIndex={selectedImageIndex}
          canManageGallery={canManageGallery}
          onClose={closeImageModal}
          onNavigate={navigateImage}
          onSelectIndex={setSelectedImageIndex}
          onUpdate={updateGalleryItem}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      )}
    </div>
  )
}
