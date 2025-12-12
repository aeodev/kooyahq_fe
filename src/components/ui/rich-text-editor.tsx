import { useMemo, useRef, useState, useEffect } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { cn } from '@/utils/cn'
import axiosInstance from '@/utils/axios.instance'
import { UPLOAD_MEDIA } from '@/utils/api.routes'
import { toastManager } from '@/components/ui/toast'

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onUploadingChange?: (isUploading: boolean) => void
}

export function RichTextEditor({ value, onChange, placeholder, className, autoFocus, onUploadingChange }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number; type: 'image' | 'video' } | null>(null)
  
  useEffect(() => {
    if (autoFocus) {
      const editor = quillRef.current?.getEditor()
      editor?.focus()
    }
  }, [autoFocus])
  
  // Notify parent when upload status changes
  useEffect(() => {
    onUploadingChange?.(uploading)
  }, [uploading, onUploadingChange])

  const uploadFile = async (file: File, isVideo: boolean = false): Promise<string | null> => {
    try {
      setUploading(true)
      setUploadProgress({ fileName: file.name, progress: 0, type: isVideo ? 'video' : 'image' })
      
      // Validate file size (100MB for videos, 10MB for images)
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        toastManager.error(`File size exceeds ${isVideo ? '100MB' : '10MB'} limit`)
        setUploadProgress(null)
        return null
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await axiosInstance.post<{ success: boolean; data: { url: string } }>(
        UPLOAD_MEDIA(),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              setUploadProgress(prev => prev ? { ...prev, progress: percentCompleted } : null)
            }
          },
        }
      )

      if (response.data.success && response.data.data.url) {
        setUploadProgress(null)
        return response.data.data.url
      }
      setUploadProgress(null)
      return null
    } catch (error: any) {
      console.error('Failed to upload file:', error)
      const errorMessage = error.response?.data?.message || `Failed to upload ${isVideo ? 'video' : 'image'}`
      toastManager.error(errorMessage)
      setUploadProgress(null)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleMediaUpload = async (file: File, type: 'image' | 'video') => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    const range = quill.getSelection()
    const insertIndex = range?.index ?? quill.getLength()
    
    // Create placeholder
    const placeholderSvg = type === 'image' 
      ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VcGxvYWRpbmcuLi48L3RleHQ+PC9zdmc+'
      : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VcGxvYWRpbmcgdmlkZW8uLi48L3RleHQ+PC9zdmc+'
    
    quill.insertEmbed(insertIndex, type, placeholderSvg, 'user')
    const placeholderIndex = insertIndex
    
    // Upload file
    const url = await uploadFile(file, type === 'video')
    
    if (url) {
      // Replace placeholder with actual media
      quill.deleteText(placeholderIndex, 1)
      quill.insertEmbed(placeholderIndex, type, url, 'user')
      quill.setSelection(placeholderIndex + 1, 0)
      toastManager.success(`${type === 'image' ? 'Image' : 'Video'} uploaded successfully`)
    } else {
      // Remove placeholder on error
      quill.deleteText(placeholderIndex, 1)
    }
  }

  const imageHandler = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) {
        await handleMediaUpload(file, 'image')
      }
    }
  }

  const videoHandler = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'video/*')
    input.click()

    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) {
        await handleMediaUpload(file, 'video')
      }
      // No URL fallback - only file uploads are supported
    }
  }

  // Handle paste events for images and videos
  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // Handle image paste
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            await handleMediaUpload(file, 'image')
          }
          break
        }
        
        // Handle video paste
        if (item.type.indexOf('video') !== -1) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            await handleMediaUpload(file, 'video')
          }
          break
        }
      }
    }

    const container = quill.root
    container.addEventListener('paste', handlePaste)
    
    return () => {
      container.removeEventListener('paste', handlePaste)
    }
  }, [])

  // Handle drag and drop for images and videos
  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const container = quill.root

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const range = quill.getSelection(true)
      if (!range) return

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')

        if (isImage) {
          await handleMediaUpload(file, 'image')
        } else if (isVideo) {
          await handleMediaUpload(file, 'video')
        }
      }
    }

    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('drop', handleDrop)

    return () => {
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('drop', handleDrop)
    }
  }, [])

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          // Note: Quill uses 1-indexed header levels (1=H1, 2=H2, 3=H3, false=Normal)
          // This is NOT a 0-indexed array - the values correspond to HTML header levels
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }, { align: [] }],
          ['blockquote', 'code-block', 'image', 'video', 'clean'],
        ],
        handlers: {
          image: imageHandler,
          video: videoHandler,
        },
      },
    }),
    []
  )

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'list',
    'align',
    'blockquote',
    'code-block',
    'image',
    'video',
  ]

  return (
    <div className={cn('relative border rounded-lg overflow-hidden w-full max-w-full', className)}>
      {uploading && uploadProgress && (
        <div className="absolute top-2 right-2 z-10 bg-primary/95 text-primary-foreground px-4 py-2.5 rounded-md text-sm shadow-lg min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            <span className="font-medium">Uploading {uploadProgress.type}...</span>
          </div>
          <div className="text-xs opacity-90 mb-2 truncate">{uploadProgress.fileName}</div>
          <div className="w-full bg-primary-foreground/20 rounded-full h-1.5">
            <div 
              className="bg-primary-foreground h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
          <div className="text-xs mt-1 opacity-75">{uploadProgress.progress}%</div>
        </div>
      )}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'Start typing...'}
        className="rich-text-editor"
      />
      <style>{`
        .rich-text-editor {
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
        }
        .rich-text-editor .ql-toolbar {
          order: 1;
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.5);
          padding: 0.5rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          width: 100%;
          max-width: 100%;
          overflow: visible;
        }
        .rich-text-editor .ql-container {
          order: 2;
          min-height: 150px;
          font-size: 0.875rem;
          width: 100%;
          max-width: 100%;
        }
        .rich-text-editor .ql-editor {
          min-height: 150px;
          width: 100%;
          max-width: 100%;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
        }
        .rich-text-editor .ql-toolbar .ql-formats {
          margin-right: 0.5rem;
          display: inline-flex;
          align-items: center;
        }
        .rich-text-editor .ql-container {
          border: none;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        .rich-text-editor .ql-editor {
          padding: 0.75rem;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        .rich-text-editor .ql-editor * {
          max-width: 100%;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.75rem 0;
          display: block;
        }
        .rich-text-editor .ql-editor img[src^="data:image/svg+xml"] {
          border: 2px dashed hsl(var(--border));
          min-height: 100px;
          background: hsl(var(--muted) / 0.3);
        }
        .rich-text-editor .ql-editor video,
        .rich-text-editor .ql-editor iframe {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.75rem 0;
          display: block;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--muted));
        }
        .rich-text-editor .ql-editor iframe {
          aspect-ratio: 16 / 9;
          width: 100%;
          min-height: 300px;
        }
        .rich-text-editor .ql-editor video {
          max-height: 500px;
          width: 100%;
        }
        .rich-text-editor .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .rich-text-editor .ql-fill {
          fill: hsl(var(--foreground));
        }
        .rich-text-editor .ql-picker-label {
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-picker-options {
          background: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
        }
        .rich-text-editor .ql-picker-item {
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-picker-item:hover {
          background: hsl(var(--accent));
        }
      `}</style>
    </div>
  )
}
