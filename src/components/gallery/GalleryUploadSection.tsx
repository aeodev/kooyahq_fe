import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { DEFAULT_IMAGE_FALLBACK } from '@/utils/image.utils'

type UploadFile = {
  file: File
  preview: string
  title: string
  description: string
}

type GalleryUploadSectionProps = {
  onUpload: (files: Array<{ file: File; title: string; description?: string }>) => Promise<void>
  uploading: boolean
  onClose?: () => void
}

export function GalleryUploadSection({ onUpload, uploading, onClose }: GalleryUploadSectionProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      uploadFiles.forEach((file) => URL.revokeObjectURL(file.preview))
    }
  }, [uploadFiles])

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

    setUploadFiles((prev) => [...prev, ...newFiles])
  }

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
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
    await onUpload(
      uploadFiles.map((uf) => ({
        file: uf.file,
        title: uf.title,
        description: uf.description,
      }))
    )
    // Cleanup preview URLs
    uploadFiles.forEach((file) => URL.revokeObjectURL(file.preview))
    setUploadFiles([])
    // Close modal after successful upload
    if (onClose) {
      onClose()
    }
  }

  const cancelUpload = () => {
    uploadFiles.forEach((file) => URL.revokeObjectURL(file.preview))
    setUploadFiles([])
    if (onClose) {
      onClose()
    }
  }

  if (uploadFiles.length === 0) {
    return (
      <div
        className="p-6"
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Uploading Images</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while your images are being uploaded...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className={cn(
        'space-y-4',
        uploadFiles.length > 3 && 'max-h-[600px] overflow-y-auto pr-2',
        uploading && 'opacity-50 pointer-events-none'
      )}>
        {uploadFiles.map((uploadFile, index) => (
          <div key={index} className="border border-border/50 rounded-xl bg-card/30 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="relative aspect-video bg-muted rounded-xl border border-border/50 overflow-hidden flex-shrink-0 w-48 group">
                <img
                  src={uploadFile.preview}
                  alt={uploadFile.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.onerror = null
                    target.src = DEFAULT_IMAGE_FALLBACK
                  }}
                />
                {!uploading && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeUploadFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
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
                    disabled={uploading}
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
                    disabled={uploading}
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
          className="min-w-[140px]"
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
    </div>
  )
}
