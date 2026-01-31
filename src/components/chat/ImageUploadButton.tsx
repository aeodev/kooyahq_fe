import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, X } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { UPLOAD_MEDIA } from '@/utils/api.routes'
import { cn } from '@/utils/cn'

interface ImageUploadButtonProps {
  onImageUploaded: (url: string, file: File) => void
  className?: string
}

export function ImageUploadButton({ onImageUploaded, className }: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axiosInstance.post<{ success: boolean; data: { url: string } }>(
        UPLOAD_MEDIA(),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      if (response.data.success && response.data.data.url) {
        onImageUploaded(response.data.data.url, file)
        setPreview(null)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error: any) {
      console.error('Failed to upload image:', error)
      alert(error.response?.data?.message || 'Failed to upload image')
      setPreview(null)
      setSelectedFile(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('relative', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-9 w-9"
          title="Upload image"
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}
