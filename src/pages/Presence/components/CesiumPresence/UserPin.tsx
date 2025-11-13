import { useEffect, useState, useMemo, memo } from 'react'
import * as Cesium from 'cesium'
import { Entity, BillboardGraphics } from 'resium'

type UserPinProps = {
  id: string
  name: string
  lon: number
  lat: number
  avatar: string
  isCurrentUser: boolean
}

function UserPinComponent({ id, name, lon, lat, avatar, isCurrentUser }: UserPinProps) {
  const [imageUrl, setImageUrl] = useState<string>(avatar)
  const position = useMemo(() => Cesium.Cartesian3.fromDegrees(lon, lat), [lon, lat])
  
  useEffect(() => {
    if (!avatar) return
    
    if (avatar.startsWith('data:') || avatar.startsWith('blob:')) {
      setImageUrl(avatar)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      setImageUrl(avatar)
    }
    
    img.onerror = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = isCurrentUser ? '#fbbf24' : '#94a3b8'
        ctx.beginPath()
        ctx.arc(16, 16, 16, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        ctx.fillText(initials, 16, 16)
      }
      setImageUrl(canvas.toDataURL())
    }
    
    img.src = avatar
  }, [avatar, name, isCurrentUser])

  const pixelOffset = useMemo(() => new Cesium.Cartesian2(0, -16), [])

  return (
    <Entity key={id} position={position}>
      <BillboardGraphics
        image={imageUrl}
        width={32}
        height={32}
        scale={isCurrentUser ? 1.3 : 1}
        pixelOffset={pixelOffset}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
        horizontalOrigin={Cesium.HorizontalOrigin.CENTER}
        verticalOrigin={Cesium.VerticalOrigin.BOTTOM}
      />
    </Entity>
  )
}

export const UserPin = memo(UserPinComponent)

