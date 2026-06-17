import { useRef, useEffect, useCallback } from 'react'
import { Vector3, Raycaster, Vector2, Plane } from 'three'
import { useThree } from '@react-three/fiber'

const MIN_DIST_SQ = 0.01

function smoothPath(pts, passes = 5) {
  let result = pts.slice()
  for (let p = 0; p < passes; p++) {
    const s = [result[0].clone()]
    for (let i = 1; i < result.length - 1; i++) {
      s.push(new Vector3(
        (result[i - 1].x + 2 * result[i].x + result[i + 1].x) / 4,
        (result[i - 1].y + 2 * result[i].y + result[i + 1].y) / 4,
        0,
      ))
    }
    s.push(result[result.length - 1].clone())
    result = s
  }
  return result
}

function buildMeta(pts) {
  const lengths = [0]
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]))
  }
  return { lengths, totalLen: lengths[lengths.length - 1] }
}

export function useInputSpine(orbitMode = false) {
  const { camera, gl } = useThree()
  const orbitModeRef = useRef(orbitMode)
  const drawingRef   = useRef([])
  const committedRef = useRef([])
  const metaRef      = useRef({ lengths: [], totalLen: 0 })
  const morphCountRef = useRef(0)
  const isDragging   = useRef(false)

  useEffect(() => { orbitModeRef.current = orbitMode }, [orbitMode])

  const unproject = useCallback((clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    const ray = new Raycaster()
    ray.setFromCamera(ndc, camera)
    const target = new Vector3()
    ray.ray.intersectPlane(new Plane(new Vector3(0, 0, 1), 0), target)
    return target
  }, [camera, gl])

  useEffect(() => {
    const canvas = gl.domElement

    const start = (x, y) => {
      if (orbitModeRef.current) return
      isDragging.current = true
      drawingRef.current = [unproject(x, y)]
    }

    const move = (x, y) => {
      if (orbitModeRef.current || !isDragging.current) return
      const world = unproject(x, y)
      const pts = drawingRef.current
      if (pts.length > 0) {
        const last = pts[pts.length - 1]
        const dx = world.x - last.x
        const dy = world.y - last.y
        if (dx * dx + dy * dy < MIN_DIST_SQ) return
      }
      pts.push(world)
    }

    const end = () => {
      if (orbitModeRef.current) return
      isDragging.current = false
      const raw = drawingRef.current
      if (raw.length < 2) { drawingRef.current = []; return }
      const smoothed = smoothPath(raw)
      committedRef.current = smoothed
      metaRef.current = buildMeta(smoothed)
      morphCountRef.current += 1
      drawingRef.current = []
    }

    const onMouseDown  = (e) => start(e.clientX, e.clientY)
    const onMouseMove  = (e) => move(e.clientX, e.clientY)
    const onMouseUp    = () => end()
    const onTouchStart = (e) => { e.preventDefault(); const t = e.touches[0]; start(t.clientX, t.clientY) }
    const onTouchMove  = (e) => { e.preventDefault(); const t = e.touches[0]; move(t.clientX, t.clientY) }
    const onTouchEnd   = () => end()

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
  }, [gl, unproject])

  return { committedRef, metaRef, drawingRef, morphCountRef }
}
