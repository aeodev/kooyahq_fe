const imageLoadCache = new Map<string, Promise<string>>()

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

export function getFallbackAvatar(color: string = '#3b82f6', name?: string): string {
  if (typeof document === 'undefined') {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiMzYjgyZjYiLz48L3N2Zz4='
  }
  
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 48
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(24, 24, 24, 0, Math.PI * 2)
    ctx.fill()
    
    if (name) {
      const initials = getInitials(name)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initials, 24, 24)
    }
  }
  return canvas.toDataURL()
}

export function createSimpleAvatar(imageUrl: string, borderColor: string = '#ffffff', size: number = 32): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    if (imageUrl.startsWith('data:')) {
      img.onerror = () => resolve(imageUrl)
    } else {
      img.crossOrigin = 'anonymous'
    }
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const borderWidth = 2
      const totalSize = size + borderWidth * 2
      canvas.width = totalSize
      canvas.height = totalSize
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = borderColor
        ctx.beginPath()
        ctx.arc(totalSize / 2, totalSize / 2, totalSize / 2, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.save()
        ctx.beginPath()
        ctx.arc(totalSize / 2, totalSize / 2, size / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(img, borderWidth, borderWidth, size, size)
        ctx.restore()
      }
      resolve(canvas.toDataURL())
    }
    
    img.onerror = () => resolve(imageUrl)
    img.src = imageUrl
  })
}

export function createClusterIcon(count: number, color: string = '#3b82f6'): string {
  const canvas = document.createElement('canvas')
  const size = 40
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(count.toString(), size / 2, size / 2)
  }
  return canvas.toDataURL()
}

export function preloadImage(url: string): Promise<string> {
  if (imageLoadCache.has(url)) {
    return imageLoadCache.get(url)!
  }

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return Promise.resolve(url)
  }

  const loadPromise = new Promise<string>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timeout = setTimeout(() => {
      resolve(getFallbackAvatar('#94a3b8'))
    }, 2000)

    img.onload = () => {
      clearTimeout(timeout)
      resolve(url)
    }

    img.onerror = () => {
      clearTimeout(timeout)
      resolve(getFallbackAvatar('#94a3b8'))
    }

    try {
      img.src = url
    } catch (error) {
      resolve(getFallbackAvatar('#94a3b8'))
    }
  })

  imageLoadCache.set(url, loadPromise)
  return loadPromise
}

export function createTooltipHTML(users: Array<{ name: string; avatar: string }>): string {
  if (users.length === 1) {
    const user = users[0]
    return `
      <div style="padding: 12px; text-align: center; min-width: 120px;">
        <img src="${user.avatar}" style="width: 48px; height: 48px; border-radius: 50%; margin-bottom: 8px; border: 2px solid rgba(255,255,255,0.4);" alt="${user.name}" />
        <div style="font-size: 14px; color: rgba(255,255,255,0.95); font-weight: 500; margin-top: 4px;">${user.name}</div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 4px;">Click to zoom in</div>
      </div>
    `
  }
  
  const iconsHtml = users
    .slice(0, 8)
    .map(
      (user) =>
        `<img src="${user.avatar}" style="width: 32px; height: 32px; border-radius: 50%; margin: 2px; border: 1px solid rgba(255,255,255,0.3);" alt="${user.name}" title="${user.name}" />`
    )
    .join('')
  
  const moreCount = users.length > 8 ? `<span style="display: inline-block; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2); text-align: center; line-height: 32px; font-size: 11px; margin: 2px; color: rgba(255,255,255,0.9);">+${users.length - 8}</span>` : ''
  
  return `
    <div style="padding: 12px; text-align: center; min-width: 200px;">
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; max-width: 250px;">
        ${iconsHtml}${moreCount}
      </div>
      <div style="margin-top: 8px; font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 500;">
        ${users.length} user${users.length !== 1 ? 's' : ''}
      </div>
      <div style="margin-top: 4px; font-size: 11px; color: rgba(255,255,255,0.7);">
        Click to expand and zoom in
      </div>
    </div>
  `
}

