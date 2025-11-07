import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'

type ImageCropModalProps = {
  open: boolean
  onClose: () => void
  imageFile: File | null
  onCrop: (croppedFile: File) => Promise<void>
  aspectRatio?: number
  borderRadius?: string
}

export function ImageCropModal({
  open,
  onClose,
  imageFile,
  onCrop,
  aspectRatio = 1,
  borderRadius = '0px',
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string)
        setScale(1)
        setPosition({ x: 0, y: 0 })
      }
      reader.readAsDataURL(imageFile)
    } else {
      // Reset state when imageFile is cleared
      setImageSrc(null)
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [imageFile])

  useEffect(() => {
    if (imageSrc && containerRef.current && imageRef.current) {
      const img = imageRef.current
      img.onload = () => {
        const container = containerRef.current!
        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight

        const imgAspect = img.width / img.height
        const containerAspect = containerWidth / containerHeight

        let width = containerWidth
        let height = containerHeight

        if (imgAspect > containerAspect) {
          height = containerWidth / imgAspect
        } else {
          width = containerHeight * imgAspect
        }

        const initialScale = Math.max(width / img.width, height / img.height) * 1.2
        setScale(initialScale)
        setPosition({ x: 0, y: 0 })
      }
    }
  }, [imageSrc])

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, 0.5))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX - position.x
    const startY = e.clientY - position.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      })
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleCrop = async () => {
    if (!imageFile || !canvasRef.current || !imageRef.current || !containerRef.current) return

    setIsProcessing(true)
    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = imageRef.current
      const container = containerRef.current

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      
      // For rectangular crop, calculate based on aspect ratio
      const containerAspect = containerWidth / containerHeight
      let cropSize: number
      let canvasWidth: number
      let canvasHeight: number
      
      if (containerAspect > aspectRatio) {
        // Container is wider than target aspect, use height
        cropSize = containerHeight * 0.9
        canvasHeight = cropSize
        canvasWidth = cropSize * aspectRatio
      } else {
        // Container is taller than target aspect, use width
        cropSize = containerWidth * 0.9
        canvasWidth = cropSize
        canvasHeight = cropSize / aspectRatio
      }

      canvas.width = canvasWidth
      canvas.height = canvasHeight

      if (ctx) {
        // Apply rounded corners if borderRadius is set
        if (borderRadius !== '0px') {
          const radius = parseFloat(borderRadius) || 0
          ctx.beginPath()
          ctx.moveTo(radius, 0)
          ctx.lineTo(canvasWidth - radius, 0)
          ctx.quadraticCurveTo(canvasWidth, 0, canvasWidth, radius)
          ctx.lineTo(canvasWidth, canvasHeight - radius)
          ctx.quadraticCurveTo(canvasWidth, canvasHeight, canvasWidth - radius, canvasHeight)
          ctx.lineTo(radius, canvasHeight)
          ctx.quadraticCurveTo(0, canvasHeight, 0, canvasHeight - radius)
          ctx.lineTo(0, radius)
          ctx.quadraticCurveTo(0, 0, radius, 0)
          ctx.closePath()
          ctx.clip()
        }

        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale

        const centerX = containerWidth / 2
        const centerY = containerHeight / 2

        // Calculate the actual crop overlay dimensions
        const containerAspect = containerWidth / containerHeight
        let overlayWidth: number
        let overlayHeight: number
        
        if (containerAspect > aspectRatio) {
          overlayHeight = containerHeight * 0.9
          overlayWidth = overlayHeight * aspectRatio
        } else {
          overlayWidth = containerWidth * 0.9
          overlayHeight = overlayWidth / aspectRatio
        }

        const overlayX = centerX - overlayWidth / 2
        const overlayY = centerY - overlayHeight / 2

        const imgX = centerX - scaledWidth / 2 + position.x
        const imgY = centerY - scaledHeight / 2 + position.y

        const cropX = Math.max(0, (overlayX - imgX) / scale)
        const cropY = Math.max(0, (overlayY - imgY) / scale)
        const cropWidth = Math.min(img.width - cropX, (overlayWidth / scale))
        const cropHeight = Math.min(img.height - cropY, (overlayHeight / scale))

        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          canvasWidth,
          canvasHeight
        )
      }

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const croppedFile = new File([blob], imageFile.name, {
              type: imageFile.type,
              lastModified: Date.now(),
            })
            await onCrop(croppedFile)
            onClose()
          }
        },
        imageFile.type,
        0.95
      )
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="4xl">
      <div className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Crop Image</h2>
        
        <div
          ref={containerRef}
          className={`relative bg-muted overflow-hidden border border-border ${borderRadius !== '0px' ? '' : 'rounded-lg'}`}
          style={{ 
            aspectRatio,
            width: aspectRatio === 1 ? '500px' : '100%',
            height: aspectRatio === 1 ? '500px' : '300px',
            maxWidth: '100%',
            margin: '0 auto',
            borderRadius: borderRadius !== '0px' ? borderRadius : undefined
          }}
          onMouseDown={handleMouseDown}
        >
          {imageSrc && (
            <>
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="absolute top-1/2 left-1/2 object-contain"
                style={{
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                  maxWidth: '200%',
                  maxHeight: '200%',
                  cursor: 'move',
                }}
                draggable={false}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div 
                  className="border-4 border-white shadow-lg bg-white/10"
                  style={{ 
                    width: '90%',
                    height: '90%',
                    aspectRatio,
                    borderRadius
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4 mr-2" />
            Zoom Out
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4 mr-2" />
            Zoom In
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={isProcessing || !imageSrc}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </Modal>
  )
}
