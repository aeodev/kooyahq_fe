import Spline from '@splinetool/react-spline'

export function SplineScene() {
  return (
    <div className="h-full w-full overflow-visible">
      <Spline 
        scene="https://prod.spline.design/NsZNgn31Q5EV4VO7/scene.splinecode"
        style={{ width: '800px', height: '100%' }}
      />
    </div>
  )
}

