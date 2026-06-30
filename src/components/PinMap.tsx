'use client'
import { useEffect, useRef, useState } from 'react'

interface PinMapProps {
  initialLat?: number
  initialLng?: number
  onPin: (lat: number, lng: number) => void
}

function tileToLatLng(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const lng = x / n * 360 - 180
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)))
  const lat = latRad * 180 / Math.PI
  return { lat, lng }
}

function latLngToTileFloat(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = (lng + 180) / 360 * n
  const latRad = lat * Math.PI / 180
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
  return { x, y }
}

export default function PinMap({ initialLat, initialLng, onPin }: PinMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(13)
  const [center, setCenter] = useState({ lat: initialLat || 49.455, lng: initialLng || -2.535 })
  const [pin, setPin] = useState<{ lat: number, lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  )
  const tileCache = useRef<Map<string, HTMLImageElement>>(new Map())

  // Drag state - store the tile-coordinate center at drag start, and pixel start
  const dragState = useRef<{ active: boolean, moved: boolean, startPx: number, startPy: number, startCenterTile: { x: number, y: number } } | null>(null)
  const lastPinchDist = useRef<number | null>(null)

  function getCenterTile() {
    return latLngToTileFloat(center.lat, center.lng, zoom)
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    const tileSize = 256
    const n = Math.pow(2, zoom)
    const { x: centerTileX, y: centerTileY } = getCenterTile()

    const startTileX = Math.floor(centerTileX - W / 2 / tileSize)
    const startTileY = Math.floor(centerTileY - H / 2 / tileSize)
    const endTileX = Math.ceil(centerTileX + W / 2 / tileSize)
    const endTileY = Math.ceil(centerTileY + H / 2 / tileSize)

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        if (ty < 0 || ty >= n) continue
        const wrappedTx = ((tx % n) + n) % n
        const key = `${zoom}/${wrappedTx}/${ty}`
        const px = (tx - centerTileX) * tileSize + W / 2
        const py = (ty - centerTileY) * tileSize + H / 2

        if (tileCache.current.has(key)) {
          const img = tileCache.current.get(key)!
          if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, Math.floor(px), Math.floor(py), tileSize, tileSize)
        } else {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = `https://tile.openstreetmap.org/${zoom}/${wrappedTx}/${ty}.png`
          img.onload = () => draw()
          img.onerror = () => {}
          tileCache.current.set(key, img)
        }
      }
    }

    if (pin) {
      const pinTile = latLngToTileFloat(pin.lat, pin.lng, zoom)
      const px = (pinTile.x - centerTileX) * tileSize + W / 2
      const py = (pinTile.y - centerTileY) * tileSize + H / 2

      ctx.beginPath()
      ctx.ellipse(px, py + 4, 8, 4, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(px, py - 20, 12, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(px - 6, py - 10)
      ctx.lineTo(px, py)
      ctx.lineTo(px + 6, py - 10)
      ctx.fillStyle = '#ef4444'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(px, py - 20, 5, 0, Math.PI * 2)
      ctx.fillStyle = 'white'
      ctx.fill()
    }

    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(W - 150, H - 18, 150, 18)
    ctx.fillStyle = '#333'
    ctx.font = '10px sans-serif'
    ctx.fillText('© OpenStreetMap contributors', W - 148, H - 5)
  }

  useEffect(() => { draw() }, [center, zoom, pin])

  function getCanvasPos(clientX: number, clientY: number) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { px: (clientX - rect.left) * scaleX, py: (clientY - rect.top) * scaleY }
  }

  function canvasToLatLng(px: number, py: number) {
    const canvas = canvasRef.current!
    const W = canvas.width, H = canvas.height
    const tileSize = 256
    const { x: centerTileX, y: centerTileY } = getCenterTile()
    const tileX = centerTileX + (px - W / 2) / tileSize
    const tileY = centerTileY + (py - H / 2) / tileSize
    return tileToLatLng(tileX, tileY, zoom)
  }

  // Drag-to-pan: 1:1 pixel tracking, exactly like Google Maps
  function startDrag(clientX: number, clientY: number) {
    const { px, py } = getCanvasPos(clientX, clientY)
    dragState.current = {
      active: true,
      moved: false,
      startPx: px,
      startPy: py,
      startCenterTile: getCenterTile()
    }
  }

  function moveDrag(clientX: number, clientY: number) {
    const ds = dragState.current
    if (!ds || !ds.active) return
    const { px, py } = getCanvasPos(clientX, clientY)
    const dx = px - ds.startPx
    const dy = py - ds.startPy
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ds.moved = true
    if (!ds.moved) return

    const tileSize = 256
    const n = Math.pow(2, zoom)
    // Moving the cursor right should move the map left (drag the world under your finger)
    const newCenterTileX = ds.startCenterTile.x - dx / tileSize
    const newCenterTileY = ds.startCenterTile.y - dy / tileSize
    const clampedY = Math.max(0, Math.min(n, newCenterTileY))
    const newLatLng = tileToLatLng(newCenterTileX, clampedY, zoom)
    setCenter(newLatLng)
  }

  function endDrag(clientX: number, clientY: number) {
    const ds = dragState.current
    if (ds && !ds.moved) {
      // Treat as a tap/click - drop pin
      const { px, py } = getCanvasPos(clientX, clientY)
      const { lat, lng } = canvasToLatLng(px, py)
      setPin({ lat, lng })
      onPin(lat, lng)
    }
    dragState.current = null
  }

  function handleMouseDown(e: React.MouseEvent) {
    startDrag(e.clientX, e.clientY)
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (e.buttons !== 1) return
    moveDrag(e.clientX, e.clientY)
  }
  function handleMouseUp(e: React.MouseEvent) {
    endDrag(e.clientX, e.clientY)
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.max(10, Math.min(19, z + (e.deltaY < 0 ? 1 : -1))))
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
      dragState.current = null
    } else if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastPinchDist.current) {
        if (dist > lastPinchDist.current + 12) { setZoom(z => Math.min(19, z + 1)); lastPinchDist.current = dist }
        else if (dist < lastPinchDist.current - 12) { setZoom(z => Math.max(10, z - 1)); lastPinchDist.current = dist }
      }
    } else if (e.touches.length === 1) {
      moveDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches.length === 1) {
      endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
    }
    lastPinchDist.current = null
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '360px', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        width={500}
        height={360}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button onClick={() => setZoom(z => Math.min(19, z + 1))} style={{ width: '32px', height: '32px', background: 'white', border: '1px solid #ccc', borderRadius: '4px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#333' }}>+</button>
        <button onClick={() => setZoom(z => Math.max(10, z - 1))} style={{ width: '32px', height: '32px', background: 'white', border: '1px solid #ccc', borderRadius: '4px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#333' }}>−</button>
      </div>
      {!pin && (
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '12px', padding: '6px 12px', borderRadius: '20px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          Drag to move the map, tap to drop a pin
        </div>
      )}
    </div>
  )
}
