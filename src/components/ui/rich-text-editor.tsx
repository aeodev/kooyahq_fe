import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import ReactQuill, { Quill } from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import type { Blot } from 'parchment'
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

type ResizableEmbed = {
  node: HTMLElement
  index: number
  type: 'image' | 'video'
  ratio: number
  sizePercent: number
  maxWidth: number
}

const isParchmentBlot = (value: unknown): value is Blot => {
  return !!value && typeof value === 'object' && 'domNode' in value
}

const isResizableEmbed = (node: HTMLElement) => {
  return node.tagName === 'IMG' || node.tagName === 'IFRAME' || node.tagName === 'VIDEO'
}

const getEmbedRatio = (node: HTMLElement) => {
  if (node instanceof HTMLImageElement && node.naturalWidth && node.naturalHeight) {
    return node.naturalHeight / node.naturalWidth
  }
  if (node instanceof HTMLVideoElement && node.videoWidth && node.videoHeight) {
    return node.videoHeight / node.videoWidth
  }

  const widthAttr = Number(node.getAttribute('width'))
  const heightAttr = Number(node.getAttribute('height'))
  const width = widthAttr || node.clientWidth || 1
  const height = heightAttr || node.clientHeight || Math.round(width * 9 / 16)

  return height / width
}

const getEmbedMeta = (node: HTMLElement, quill: Quill): ResizableEmbed | null => {
  if (!isResizableEmbed(node)) return null

  const blot = Quill.find(node)
  if (!blot || blot === quill || !isParchmentBlot(blot)) return null

  const index = quill.getIndex(blot)
  const containerWidth = Math.max(quill.root.clientWidth || node.clientWidth || 1, 1)
  const ratio = getEmbedRatio(node)
  const isImage = node.tagName === 'IMG'
  const naturalWidth = node instanceof HTMLImageElement ? node.naturalWidth : 0
  const maxWidth = isImage && naturalWidth ? Math.min(containerWidth, naturalWidth) : containerWidth
  const attributeWidth = Number(node.getAttribute('width'))
  const currentWidth = Math.min(attributeWidth || node.clientWidth || maxWidth, maxWidth)
  const sizePercent = Math.min(100, Math.max(25, Math.round((currentWidth / maxWidth) * 100)))

  return {
    node,
    index,
    type: isImage ? 'image' : 'video',
    ratio,
    sizePercent,
    maxWidth,
  }
}

const findEmbedFromEvent = (event: MouseEvent, root: HTMLElement): HTMLElement | null => {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  for (const entry of path) {
    if (entry instanceof HTMLElement && isResizableEmbed(entry)) {
      return entry
    }
  }

  const { clientX, clientY } = event
  const embeds = root.querySelectorAll('img, iframe, video')
  for (const embed of embeds) {
    const rect = embed.getBoundingClientRect()
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return embed as HTMLElement
    }
  }

  return null
}

export function RichTextEditor({ value, onChange, placeholder, className, autoFocus, onUploadingChange }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const isResizingRef = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number; type: 'image' | 'video' } | null>(null)
  const [activeEmbed, setActiveEmbed] = useState<ResizableEmbed | null>(null)
  const [overlayStyle, setOverlayStyle] = useState<CSSProperties | null>(null)
  
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

  const getScrollContainer = (node: HTMLElement | null) => {
    let current = node?.parentElement
    while (current) {
      const style = window.getComputedStyle(current)
      const overflowY = style.overflowY
      if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
        return current
      }
      current = current.parentElement
    }
    return window
  }

  const freezeScroll = () => {
    const scrollContainer = getScrollContainer(containerRef.current)
    const scrollTop = scrollContainer instanceof Window ? window.scrollY : scrollContainer.scrollTop
    return () => {
      if (scrollContainer instanceof Window) {
        window.scrollTo({ top: scrollTop })
      } else {
        scrollContainer.scrollTop = scrollTop
      }
    }
  }

  const updateOverlayPosition = () => {
    if (isResizingRef.current) return
    const container = containerRef.current
    const overlay = overlayRef.current
    const embedNode = activeEmbed?.node
    if (!container || !overlay || !embedNode) return

    const containerRect = container.getBoundingClientRect()
    const embedRect = embedNode.getBoundingClientRect()
    const overlayRect = overlay.getBoundingClientRect()

    const margin = 8
    const centerX = embedRect.left - containerRect.left + embedRect.width / 2
    const preferredTop = embedRect.bottom - containerRect.top + 8

    let left = centerX - overlayRect.width / 2
    let top = preferredTop

    left = Math.min(Math.max(margin, left), containerRect.width - overlayRect.width - margin)
    top = Math.min(Math.max(margin, top), containerRect.height - overlayRect.height - margin)

    setOverlayStyle({ left: `${left}px`, top: `${top}px` })
  }

  const startOverlayDrag = (event: ReactPointerEvent<HTMLInputElement>) => {
    isResizingRef.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const stopOverlayDrag = () => {
    if (!isResizingRef.current) return
    isResizingRef.current = false
    requestAnimationFrame(() => updateOverlayPosition())
  }

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

  const applyEmbedSize = (percent: number) => {
    const quill = quillRef.current?.getEditor()
    if (!quill || !activeEmbed) return
    const currentMeta = getEmbedMeta(activeEmbed.node, quill)
    if (!currentMeta) {
      setActiveEmbed(null)
      return
    }

    const restoreScroll = freezeScroll()
    const maxWidth = currentMeta.maxWidth
    const clampedPercent = Math.min(100, Math.max(25, percent))
    const width = Math.max(1, Math.round((maxWidth * clampedPercent) / 100))

    if (currentMeta.type === 'image') {
      quill.formatText(currentMeta.index, 1, { width: String(width) }, 'user')
    } else {
      const height = Math.round(width * currentMeta.ratio)
      quill.formatText(currentMeta.index, 1, { width: String(width), height: String(height) }, 'user')
    }

    setActiveEmbed({ ...currentMeta, sizePercent: clampedPercent })
    requestAnimationFrame(() => {
      restoreScroll()
      updateOverlayPosition()
    })
  }

  const resetEmbedSize = () => {
    const quill = quillRef.current?.getEditor()
    if (!quill || !activeEmbed) return
    const currentMeta = getEmbedMeta(activeEmbed.node, quill)
    if (!currentMeta) {
      setActiveEmbed(null)
      return
    }

    const restoreScroll = freezeScroll()
    quill.formatText(currentMeta.index, 1, { width: false, height: false }, 'user')
    setActiveEmbed({ ...currentMeta, sizePercent: 100 })
    requestAnimationFrame(() => {
      restoreScroll()
      updateOverlayPosition()
    })
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

  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const handleSelectionChange = (range: { index: number; length: number } | null) => {
      if (!range) {
        return
      }

      const [leaf] = quill.getLeaf(range.index)
      const node = leaf?.domNode
      if (!(node instanceof HTMLElement)) {
        setActiveEmbed(null)
        return
      }

      setActiveEmbed(getEmbedMeta(node, quill))
    }

    quill.on('selection-change', handleSelectionChange)

    return () => {
      quill.off('selection-change', handleSelectionChange)
    }
  }, [])

  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = findEmbedFromEvent(event, quill.root)
      if (!target) {
        setActiveEmbed(null)
        return
      }

      setActiveEmbed(getEmbedMeta(target, quill))
    }

    quill.root.addEventListener('pointerdown', handlePointerDown)
    return () => {
      quill.root.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    const handlePointerEnd = () => {
      stopOverlayDrag()
    }

    document.addEventListener('pointerup', handlePointerEnd)
    document.addEventListener('pointercancel', handlePointerEnd)
    return () => {
      document.removeEventListener('pointerup', handlePointerEnd)
      document.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [])

  useLayoutEffect(() => {
    if (!activeEmbed) {
      isResizingRef.current = false
      setOverlayStyle(null)
      return
    }
    updateOverlayPosition()
  }, [activeEmbed])

  useEffect(() => {
    if (!activeEmbed) return
    const handleResize = () => updateOverlayPosition()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [activeEmbed])

  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill || !activeEmbed) return
    const handleScroll = () => updateOverlayPosition()
    quill.root.addEventListener('scroll', handleScroll)
    return () => {
      quill.root.removeEventListener('scroll', handleScroll)
    }
  }, [activeEmbed])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (containerRef.current && !containerRef.current.contains(target)) {
        setActiveEmbed(null)
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
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
    'width',
    'height',
  ]

  return (
    <div ref={containerRef} className={cn('relative border rounded-lg overflow-hidden w-full max-w-full', className)}>
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
      {activeEmbed && (
        <div
          ref={overlayRef}
          className="absolute z-10 flex items-center gap-2 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
          style={overlayStyle ?? { left: 0, top: 0, visibility: 'hidden' }}
        >
          <span className="font-medium text-foreground">
            {activeEmbed.type === 'image' ? 'Image' : 'Video'} size
          </span>
          <input
            type="range"
            min={25}
            max={100}
            step={5}
            value={activeEmbed.sizePercent}
            onChange={(event) => applyEmbedSize(Number(event.target.value))}
            onPointerDown={startOverlayDrag}
            onPointerUp={stopOverlayDrag}
            className="w-24 accent-primary"
          />
          <span className="w-10 text-right text-muted-foreground">{activeEmbed.sizePercent}%</span>
          <button
            type="button"
            onClick={resetEmbedSize}
            className="rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Reset
          </button>
        </div>
      )}
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
          border-radius: 0.375rem;
          margin: 0.75rem 0;
          display: block;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--muted));
          pointer-events: none;
        }
        .rich-text-editor .ql-editor iframe:not([width]) {
          width: 100%;
        }
        .rich-text-editor .ql-editor iframe:not([height]) {
          aspect-ratio: 16 / 9;
          min-height: 300px;
        }
        .rich-text-editor .ql-editor video:not([width]) {
          width: 100%;
        }
        .rich-text-editor .ql-editor video:not([height]) {
          max-height: 500px;
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
