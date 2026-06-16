import { useRef, useEffect, useCallback } from 'react'
import { Vector3, Raycaster, Vector2, Plane } from 'three'
import { useThree } from '@react-three/fiber'

const WINDOW_MAX  = 60
const MIN_DIST_SQ = 0.01

export function useInputSpine() {
  const { camera, gl } = useThree()
  const pointsRef  = useRef([])
  const isDragging = useRef(false)

  const unproject = useCallback((clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      -((clientY - rect.top)  / rect.height) *  2 + 1,
    )
    const raycaster = new Raycaster()
    raycaster.setFromCamera(ndc, camera)
    const target = new Vector3()
    raycaster.ray.intersectPlane(new Plane(new Vector3(0, 0, 1), 0), target)
    return target
  }, [camera, gl])

  const addPoint = useCallback((x, y) => {
    const world = unproject(x, y)
    const pts = pointsRef.current
    if (pts.length > 0) {
      const last = pts[pts.length - 1]
      const dx = world.x - last.x
      const dy = world.y - last.y
      if (dx * dx + dy * dy < MIN_DIST_SQ) return
    }
    pts.push(world)
    if (pts.length > WINDOW_MAX) pts.shift()
  }, [unproject])

  useEffect(() => {
    const canvas = gl.domElement

    // Start: on the canvas only
    const onMouseDown = (e) => {
      isDragging.current = true
      pointsRef.current.length = 0
      addPoint(e.clientX, e.clientY)
    }
    const onTouchStart = (e) => {
      e.preventDefault()
      isDragging.current = true
      pointsRef.current.length = 0
      const t = e.touches[0]
      addPoint(t.clientX, t.clientY)
    }

    // Continue + end: on window so drag works even if cursor leaves canvas
    const onMouseMove = (e) => {
      if (!isDragging.current) return
      addPoint(e.clientX, e.clientY)
    }
    const onMouseUp = () => { isDragging.current = false }
    const onTouchMove = (e) => {
      e.preventDefault()
      if (!isDragging.current) return
      const t = e.touches[0]
      addPoint(t.clientX, t.clientY)
    }
    const onTouchEnd = () => { isDragging.current = false }

    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('mousemove',  onMouseMove)
    window.addEventListener('mouseup',    onMouseUp)
    window.addEventListener('touchmove',  onTouchMove, { passive: false })
    window.addEventListener('touchend',   onTouchEnd)

    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseup',    onMouseUp)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
    }
  }, [gl, addPoint])

  return pointsRef
}
