import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { UPLOAD_MEDIA } from '@/utils/api.routes'
import { cn } from '@/utils/cn'

interface ImageUploadButtonProps {
  onImageUploaded: (url: string, file: File) => void
  onImageSelect?: (file: File) => void
  onUploadError?: (file: File) => void
  className?: string
}

export function ImageUploadButton({ onImageUploaded, onImageSelect, onUploadError, className }: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    // Notify parent component immediately for preview
    if (onImageSelect) {
      onImageSelect(file)
    }
    
    // Upload file in background - don't show loading in button
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
        // Callback with the uploaded URL
        onImageUploaded(response.data.data.url, file)
      }
    } catch (error: any) {
      console.error('Failed to upload image:', error)
      alert(error.response?.data?.message || 'Failed to upload image')
      // Notify parent to remove failed upload
      if (onUploadError) {
        onUploadError(file)
      }
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        className={cn("h-9 w-9", className)}
        title="Upload image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
