import { useEffect, useState, useMemo, memo, useCallback } from 'react'
import * as Cesium from 'cesium'
import { Entity, BillboardGraphics } from 'resium'

type UserPinProps = {
  id: string
  name: string
  lon: number
  lat: number
  avatar: string
  isCurrentUser: boolean
  isActive: boolean
}

function UserPinComponent({ id, name, lon, lat, avatar, isCurrentUser, isActive }: UserPinProps) {
  const [imageUrl, setImageUrl] = useState<string>(avatar)
  const position = useMemo(() => Cesium.Cartesian3.fromDegrees(lon, lat), [lon, lat])
  const ringColor = isCurrentUser ? '#fbbf24' : (isActive ? '#22c55e' : '#94a3b8')

  const buildMarker = useCallback((baseImage?: HTMLImageElement, fallbackInitials?: string) => {
    const outerRadius = 18
    const innerRadius = 16
    const pointerHeight = 10
    const canvasWidth = outerRadius * 2 + 8
    const canvasHeight = outerRadius * 2 + pointerHeight + 8
    const centerX = canvasWidth / 2
    const centerY = outerRadius + 2

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return avatar

    // Shadow for lift
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.18)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2

    // Pin body (circle + pointer)
    ctx.fillStyle = ringColor
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(centerX - 9, centerY + outerRadius - 4)
    ctx.lineTo(centerX + 9, centerY + outerRadius - 4)
    ctx.lineTo(centerX, centerY + outerRadius + pointerHeight)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Inner avatar circle
    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    if (baseImage) {
      ctx.drawImage(baseImage, centerX - innerRadius, centerY - innerRadius, innerRadius * 2, innerRadius * 2)
    } else {
      // Fallback avatar with initials
      ctx.fillStyle = isCurrentUser ? '#f59e0b' : (isActive ? '#22c55e' : '#94a3b8')
      ctx.fillRect(centerX - innerRadius, centerY - innerRadius, innerRadius * 2, innerRadius * 2)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (fallbackInitials) {
        ctx.fillText(fallbackInitials, centerX, centerY)
      }
    }
    ctx.restore()

    // Thin white ring for contrast
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2
    ctx.arc(centerX, centerY, innerRadius + 1, 0, Math.PI * 2)
    ctx.stroke()

    return canvas.toDataURL()
  }, [avatar, isActive, isCurrentUser, ringColor])
  
  useEffect(() => {
    if (!avatar) return
    
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

    const img = new Image()
    if (!avatar.startsWith('data:') && !avatar.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }

    img.onload = () => {
      setImageUrl(buildMarker(img))
    }
    
    img.onerror = () => {
      setImageUrl(buildMarker(undefined, initials))
    }
    
    img.src = avatar
  }, [avatar, buildMarker, name, isCurrentUser])

  const pixelOffset = useMemo(() => new Cesium.Cartesian2(0, -20), [])

  return (
    <Entity key={id} position={position}>
      <BillboardGraphics
        image={imageUrl}
        width={44}
        height={52}
        scale={isCurrentUser ? 1.1 : 1}
        pixelOffset={pixelOffset}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
        horizontalOrigin={Cesium.HorizontalOrigin.CENTER}
        verticalOrigin={Cesium.VerticalOrigin.BOTTOM}
      />
    </Entity>
  )
}

export const UserPin = memo(UserPinComponent)
