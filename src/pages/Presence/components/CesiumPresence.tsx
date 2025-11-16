import * as Cesium from 'cesium'
import { Viewer, useCesium } from 'resium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { usePresenceStore } from '@/stores/presence.store'
import { useAuthStore } from '@/stores/auth.store'
import { useCesiumViewer, useUserAvatars, useClustering, setCesiumViewer } from './CesiumPresence/hooks'
import { UserPin } from './CesiumPresence/UserPin'
import { ClusterPin } from './CesiumPresence/ClusterPin'
import { useEffect } from 'react'

const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN
Cesium.Ion.defaultAccessToken = ionToken || ''

type ViewerCaptureProps = {
  onViewerReady: () => void
}

function ViewerCapture({ onViewerReady }: ViewerCaptureProps) {
  const { viewer } = useCesium()
  
  useEffect(() => {
    if (viewer) {
      setCesiumViewer(viewer)
      
      let renderCount = 0
      let readyCalled = false
      
      const markReady = () => {
        if (!readyCalled) {
          readyCalled = true
          onViewerReady()
        }
      }
      
      // Listen for render events - after a few renders, the globe should be ready
      const renderHandler = () => {
        renderCount++
        // After 3-5 renders, the globe should be visible
        if (renderCount >= 3) {
          viewer.scene.postRender.removeEventListener(renderHandler)
          // Small delay to ensure tiles are visible
          setTimeout(markReady, 500)
        }
      }
      
      if (viewer.scene) {
        viewer.scene.postRender.addEventListener(renderHandler)
      }
      
      // Fallback: mark as ready after 3 seconds max
      const fallbackTimeout = setTimeout(() => {
        viewer.scene?.postRender.removeEventListener(renderHandler)
        markReady()
      }, 3000)
      
      return () => {
        viewer.scene?.postRender.removeEventListener(renderHandler)
        clearTimeout(fallbackTimeout)
      }
    }
  }, [viewer, onViewerReady])
  
  return null
}

const CesiumPresence = ({ onViewerReady }: { onViewerReady: () => void }) => {
  const users = usePresenceStore((state) => state.users)
  const currentUser = useAuthStore((state) => state.user)
  const { cameraHeight } = useCesiumViewer()
  const { validatedAvatars, allUsers } = useUserAvatars(users)
  const { clusters, individualPins } = useClustering(allUsers, validatedAvatars, cameraHeight, currentUser?.id)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Viewer
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        infoBox={false}
        selectionIndicator={false}
        fullscreenButton={false}
      >
        <ViewerCapture onViewerReady={onViewerReady} />
        {clusters.map((cluster, idx) => {
          const hasActiveUsers = cluster.users.some(u => u.isActive)
          return (
            <ClusterPin
              key={`cluster-${idx}`}
              idx={idx}
              lon={cluster.lon}
              lat={cluster.lat}
              count={cluster.count}
              hasActiveUsers={hasActiveUsers}
            />
          )
        })}
        
        {individualPins.map((p) => (
          <UserPin
            key={p.id}
            id={p.id}
            name={p.name}
            lon={p.lon}
            lat={p.lat}
            avatar={p.avatar}
            isCurrentUser={p.isCurrentUser}
          />
        ))}
      </Viewer>
    </div>
  )
}

export default CesiumPresence
