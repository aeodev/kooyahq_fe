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

function ViewerCapture() {
  const { viewer } = useCesium()
  
  useEffect(() => {
    if (viewer) {
      setCesiumViewer(viewer)
    }
  }, [viewer])
  
  return null
}

const CesiumPresence = () => {
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
      >
        <ViewerCapture />
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
