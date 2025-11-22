import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBoardStore } from '@/stores/board.store'
import type { Card, CardCoverImage } from '@/types/board'
import { X, Image as ImageIcon, Upload } from 'lucide-react'

type CardCoverPickerProps = {
  card: Card
  onUpdate: () => void
  onCardUpdate?: (updatedCard: Card) => void
}

const PRESET_COLORS = [
  { name: 'Blue', value: '#0079bf', brightness: 'dark' as const },
  { name: 'Orange', value: '#d29034', brightness: 'dark' as const },
  { name: 'Green', value: '#519839', brightness: 'dark' as const },
  { name: 'Red', value: '#b04632', brightness: 'dark' as const },
  { name: 'Purple', value: '#89609e', brightness: 'dark' as const },
  { name: 'Pink', value: '#cd5a91', brightness: 'dark' as const },
  { name: 'Lime', value: '#4bbf6b', brightness: 'light' as const },
  { name: 'Sky', value: '#00aecc', brightness: 'light' as const },
  { name: 'Gray', value: '#838c91', brightness: 'dark' as const },
]

export function CardCoverPicker({ card, onUpdate, onCardUpdate }: CardCoverPickerProps) {
  const { setCardCover, removeCardCover } = useBoardStore()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleColorSelect = async (color: string, brightness: 'dark' | 'light') => {
    const updated = await setCardCover(card.id, { color, brightness })
    if (updated) {
      if (onCardUpdate) {
        onCardUpdate(updated)
      }
      onUpdate()
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const updated = await setCardCover(card.id, formData)
      if (updated) {
        if (onCardUpdate) {
          onCardUpdate(updated)
        }
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to upload cover image:', error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveCover = async () => {
    if (!confirm('Remove cover from this card?')) return
    
    const updated = await removeCardCover(card.id)
    if (updated) {
      if (onCardUpdate) {
        onCardUpdate(updated)
      }
      onUpdate()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cover</h3>
        {card.coverImage && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemoveCover}
            className="h-8 text-xs text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {/* Current Cover Preview */}
      {card.coverImage && (
        <div className="relative h-32 rounded-lg overflow-hidden border">
          {card.coverImage.url ? (
            <img
              src={card.coverImage.url}
              alt="Card cover"
              className="w-full h-full object-cover"
            />
          ) : card.coverImage.color ? (
            <div
              className="w-full h-full"
              style={{ backgroundColor: card.coverImage.color }}
            />
          ) : null}
        </div>
      )}

      {/* Color Picker */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Colors
        </label>
        <div className="grid grid-cols-9 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorSelect(color.value, color.brightness)}
              className="h-8 w-8 rounded hover:scale-110 transition-transform border-2 border-border hover:border-primary"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Upload Image
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="cover-image-upload"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 h-9"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

