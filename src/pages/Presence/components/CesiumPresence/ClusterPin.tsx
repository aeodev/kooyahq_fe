import { useMemo, memo } from 'react'
import * as Cesium from 'cesium'
import { Entity, BillboardGraphics } from 'resium'
import { createClusterIcon } from './utils'

type ClusterPinProps = {
  idx: number
  lon: number
  lat: number
  count: number
  hasActiveUsers: boolean
}

function ClusterPinComponent({ idx, lon, lat, count, hasActiveUsers }: ClusterPinProps) {
  const position = useMemo(() => Cesium.Cartesian3.fromDegrees(lon, lat), [lon, lat])
  const clusterColor = useMemo(() => hasActiveUsers ? '#22c55e' : '#94a3b8', [hasActiveUsers])
  const clusterIcon = useMemo(() => createClusterIcon(count, clusterColor), [count, clusterColor])
  const clusterId = useMemo(() => `cluster-${idx}`, [idx])
  const pixelOffset = useMemo(() => new Cesium.Cartesian2(0, -20), [])

  return (
    <Entity 
      id={clusterId}
      position={position}
    >
      <BillboardGraphics
        image={clusterIcon}
        width={40}
        height={40}
        pixelOffset={pixelOffset}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
      />
    </Entity>
  )
}

export const ClusterPin = memo(ClusterPinComponent)

