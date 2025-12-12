import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import axiosInstance from '@/utils/axios.instance'
import { GET_GALLERY_ITEMS, CREATE_GALLERY_ITEM, CREATE_GALLERY_MULTIPLE, UPDATE_GALLERY_ITEM, DELETE_GALLERY_ITEM } from '@/utils/api.routes'
import type { GalleryItem, UpdateGalleryItemInput } from '@/types/gallery'
import { cn } from '@/utils/cn'
import { Upload, X, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, Edit2, Trash2, Download } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'

type UploadFile = {
  file: File
  preview: string
  title: string
  description: string
}

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
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUploadSection, setShowUploadSection] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ title: '', description: '' })
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!canViewGallery) return
    fetchItems()
  }, [canViewGallery])

  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: GalleryItem[] }>(GET_GALLERY_ITEMS())
      setItems(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load gallery items')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newFiles: UploadFile[] = []
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file)
        const title = file.name.replace(/\.[^/.]+$/, '')
        newFiles.push({ file, preview, title, description: '' })
      }
    })

    // Unified upload - handle both single and multiple
    setUploadFiles((prev) => [...prev, ...newFiles])
    setShowUploadSection(true)
  }

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      if (newFiles.length === 0) {
        setShowUploadSection(false)
      }
      return newFiles
    })
  }

  const updateUploadFile = (index: number, field: 'title' | 'description', value: string) => {
    setUploadFiles((prev) => {
      const newFiles = [...prev]
      newFiles[index] = { ...newFiles[index], [field]: value }
      return newFiles
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return

    setUploading(true)
    setError(null)

    try {
      // Use single upload endpoint for 1 image, multiple for more
      if (uploadFiles.length === 1) {
        const uploadFile = uploadFiles[0]
        const formData = new FormData()
        formData.append('image', uploadFile.file)
        formData.append('title', uploadFile.title || uploadFile.file.name)
        if (uploadFile.description) {
          formData.append('description', uploadFile.description)
        }

        await axiosInstance.post(CREATE_GALLERY_ITEM(), formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        const formData = new FormData()
        uploadFiles.forEach((uploadFile, index) => {
          formData.append('images', uploadFile.file)
          formData.append(`title-${index}`, uploadFile.title || uploadFile.file.name)
          if (uploadFile.description) {
            formData.append(`description-${index}`, uploadFile.description)
          }
        })

        await axiosInstance.post(CREATE_GALLERY_MULTIPLE(), formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      setUploadFiles([])
      setShowUploadSection(false)
      await fetchItems()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (item: GalleryItem) => {
    setEditingId(item.id)
    setEditData({ title: item.title, description: item.description || '' })
  }

  const handleUpdate = async () => {
    if (!editingId) return

    try {
      const updates: UpdateGalleryItemInput = {
        title: editData.title,
        description: editData.description,
      }
      await axiosInstance.put(UPDATE_GALLERY_ITEM(editingId), updates)
      setEditingId(null)
      setEditData({ title: '', description: '' })
      await fetchItems()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update gallery item')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await axiosInstance.delete(DELETE_GALLERY_ITEM(id))
      await fetchItems()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete gallery item')
    }
  }

  const cancelUpload = () => {
    uploadFiles.forEach((file) => URL.revokeObjectURL(file.preview))
    setUploadFiles([])
    setShowUploadSection(false)
    setError(null)
  }

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index)
  }

  const closeImageModal = () => {
    setSelectedImageIndex(null)
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : items.length - 1)
    } else {
      setSelectedImageIndex(selectedImageIndex < items.length - 1 ? selectedImageIndex + 1 : 0)
    }
  }

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex !== null) {
        if (e.key === 'Escape') closeImageModal()
        if (e.key === 'ArrowLeft') navigateImage('prev')
        if (e.key === 'ArrowRight') navigateImage('next')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImageIndex])

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

  const selectedImage = selectedImageIndex !== null ? items[selectedImageIndex] : null

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
          <Button onClick={() => setShowUploadSection(!showUploadSection)}>
            <Upload className="h-4 w-4 mr-2" />
            {showUploadSection ? 'Hide Upload' : 'Upload Image'}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Upload Section - Hidden by default, shown when button clicked */}
      {canManageGallery && showUploadSection && (
        <Card>
          {uploadFiles.length === 0 ? (
            <CardContent
              className="p-12"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className={cn(
                'border-2 border-dashed rounded-lg p-12 transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              )}>
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <div className={cn(
                    'rounded-full p-6 transition-colors',
                    isDragging ? 'bg-primary/10' : 'bg-muted',
                  )}>
                    <Upload className={cn('h-10 w-10', isDragging ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {isDragging ? 'Drop images here' : 'Drag and drop images here'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to select files (supports multiple images)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Select Images
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {uploadFiles.length === 1 ? 'Upload Image' : `Upload ${uploadFiles.length} Images`}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Review and edit details for all images before uploading
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={cancelUpload} disabled={uploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unified list view for all upload files - no stacking */}
                <div className={cn(
                  'space-y-4',
                  uploadFiles.length > 3 && 'max-h-[600px] overflow-y-auto pr-2'
                )}>
                  {uploadFiles.map((uploadFile, index) => (
                    <div key={index} className="border border-border/50 rounded-xl bg-card/30 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="relative aspect-video bg-muted rounded-xl border border-border/50 overflow-hidden flex-shrink-0 w-48 group">
                          <img
                            src={uploadFile.preview}
                            alt={uploadFile.title}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeUploadFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label htmlFor={`title-${index}`}>Title</Label>
                            <Input
                              id={`title-${index}`}
                              value={uploadFile.title}
                              onChange={(e) => updateUploadFile(index, 'title', e.target.value)}
                              placeholder="Image title"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`description-${index}`}>Description (optional)</Label>
                            <Input
                              id={`description-${index}`}
                              value={uploadFile.description}
                              onChange={(e) => updateUploadFile(index, 'description', e.target.value)}
                              placeholder="Image description"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || uploadFiles.some((f) => !f.title.trim())}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {uploadFiles.length === 1 ? 'Image' : `${uploadFiles.length} Images`}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={cancelUpload} disabled={uploading}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      )}

      {/* Gallery Grid */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {canManageGallery ? 'No gallery items yet. Upload images to get started.' : 'No gallery items yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <div key={item.id} className="relative group cursor-pointer aspect-video bg-muted rounded-2xl border border-border/50 ring-1 ring-border/30 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300" onClick={() => openImageModal(index)}>
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E'
                }}
              />
              {/* Edit/Delete buttons - top right corner, visible on hover (managers only) */}
              {canManageGallery && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(item)
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
                      handleDelete(item.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Modal with Thumbnails */}
      {selectedImage && selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 m-0"
          style={{ margin: 0, marginTop: 0 }}
          onClick={closeImageModal}
        >
          {/* Top buttons - Close and Download */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                handleDownload(selectedImage.imageUrl, selectedImage.filename)
              }}
              title="Download image"
            >
              <Download className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={closeImageModal}
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
                  onClick={(e) => { e.stopPropagation(); navigateImage('prev') }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); navigateImage('next') }}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null)
                          setEditData({ title: '', description: '' })
                        }}
                      >
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
                          handleDelete(selectedImage.id)
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
                  {selectedImageIndex + 1} of {items.length} • Added {new Date(selectedImage.createdAt).toLocaleDateString()}
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
                      setSelectedImageIndex(index)
                    }}
                    className={cn(
                      'flex-shrink-0 relative overflow-hidden rounded-md border-2 transition-all',
                      index === selectedImageIndex
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
                    {index === selectedImageIndex && (
                      <div className="absolute inset-0 bg-white/20 border-2 border-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
