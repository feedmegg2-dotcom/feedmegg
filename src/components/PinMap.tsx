'use client'
import { useEffect, useRef, useState } from 'react'

interface PinMapProps {
  initialLat?: number
  initialLng?: number
  onPin: (lat: number, lng: number) => void
}

// Tile coordinate helpers
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lng + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x, y }
}

function tileToLatLng(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const lng = x / n * 360 - 180
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)))
  const lat = latRad * 180 / Math.PI
  return { lat, lng }
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
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, lat: 0, lng: 0 })
  const lastTouchDist = useRef<number | null>(null)
  const animFrame = useRef<number>()

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
    const centerTileX = (center.lng + 180) / 360 * n
    const latRad = center.lat * Math.PI / 180
    const centerTileY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n

    const startTileX = Math.floor(centerTileX - W / 2 / tileSize)
    const startTileY = Math.floor(centerTileY - H / 2 / tileSize)
    const endTileX = Math.ceil(centerTileX + W / 2 / tileSize)
    const endTileY = Math.ceil(centerTileY + H / 2 / tileSize)

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        const wrappedTx = ((tx % n) + n) % n
        const key = `${zoom}/${wrappedTx}/${ty}`
        const px = (tx - centerTileX) * tileSize + W / 2
        const py = (ty - centerTileY) * tileSize + H / 2

        if (tileCache.current.has(key)) {
          const img = tileCache.current.get(key)!
          if (img.complete) ctx.drawImage(img, Math.floor(px), Math.floor(py), tileSize, tileSize)
        } else {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = `https://tile.openstreetmap.org/${zoom}/${wrappedTx}/${ty}.png`
          img.onload = () => { tileCache.current.set(key, img); draw() }
          img.onerror = () => {}
          tileCache.current.set(key, img)
        }
      }
    }

    // Draw pin
    if (pin) {
      const latRad2 = pin.lat * Math.PI / 180
      const pinTileX = (pin.lng + 180) / 360 * n
      const pinTileY = (1 - Math.log(Math.tan(latRad2) + 1 / Math.cos(latRad2)) / Math.PI) / 2 * n
      const px = (pinTileX - centerTileX) * tileSize + W / 2
      const py = (pinTileY - centerTileY) * tileSize + H / 2

      // Shadow
      ctx.beginPath()
      ctx.ellipse(px, py + 4, 8, 4, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fill()

      // Pin body
      ctx.beginPath()
      ctx.arc(px, py - 20, 12, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()

      // Pin point
      ctx.beginPath()
      ctx.moveTo(px - 6, py - 10)
      ctx.lineTo(px, py)
      ctx.lineTo(px + 6, py - 10)
      ctx.fillStyle = '#ef4444'
      ctx.fill()

      // Inner dot
      ctx.beginPath()
      ctx.arc(px, py - 20, 5, 0, Math.PI * 2)
      ctx.fillStyle = 'white'
      ctx.fill()
    }

    // Attribution
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(W - 150, H - 18, 150, 18)
    ctx.fillStyle = '#333'
    ctx.font = '10px sans-serif'
    ctx.fillText('© OpenStreetMap contributors', W - 148, H - 5)
  }

  useEffect(() => { draw() }, [center, zoom, pin])

  function canvasToLatLng(cx: number, cy: number) {
    const canvas = canvasRef.current!
    const W = canvas.width, H = canvas.height
    const tileSize = 256
    const n = Math.pow(2, zoom)
    const latRad = center.lat * Math.PI / 180
    const centerTileX = (center.lng + 180) / 360 * n
    const centerTileY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
    const tileX = centerTileX + (cx - W / 2) / tileSize
    const tileY = centerTileY + (cy - H / 2) / tileSize
    return tileToLatLng(tileX, tileY, zoom)
  }

  function handleClick(e: React.MouseEvent) {
    if (isDragging.current) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = canvasRef.current!.width / rect.width
    const scaleY = canvasRef.current!.height / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY
    const { lat, lng } = canvasToLatLng(cx, cy)
    setPin({ lat, lng })
    onPin(lat, lng)
  }

  function handleMouseDown(e: React.MouseEvent) {
    isDragging.current = false
    dragStart.current = { x: e.clientX, y: e.clientY, lat: center.lat, lng: center.lng }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (e.buttons !== 1) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true
    if (!isDragging.current) return
    const canvas = canvasRef.current!
    const tileSize = 256
    const n = Math.pow(2, zoom)
    const metersPerPixel = tileSize / n
    const latRad = center.lat * Math.PI / 180
    const dLng = -dx / tileSize / n * 360
    const dLat = dy / tileSize * (360 / n) * Math.cos(latRad) * (180 / Math.PI) / (Math.PI)

    // Simpler delta calculation
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const origPos = canvasToLatLng(dragStart.current.x - rect.left, dragStart.current.y - rect.top)
    const newPos = canvasToLatLng((dragStart.current.x - rect.left) * scaleX + (dragStart.current.x - e.clientX) * scaleX, (dragStart.current.y - rect.top + dragStart.current.y - e.clientY))

    setCenter({
      lat: Math.max(-85, Math.min(85, dragStart.current.lat + (dragStart.current.y - e.clientY) / tileSize * (360 / n) * Math.cos(dragStart.current.lat * Math.PI / 180) * 0.5)),
      lng: dragStart.current.lng + (dragStart.current.x - e.clientX) / tileSize / n * 360 * -1
    })
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.max(10, Math.min(19, z + (e.deltaY < 0 ? 1 : -1))))
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
    } else {
      isDragging.current = false
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, lat: center.lat, lng: center.lng }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastTouchDist.current) {
        if (dist > lastTouchDist.current + 10) setZoom(z => Math.min(19, z + 1))
        else if (dist < lastTouchDist.current - 10) setZoom(z => Math.max(10, z - 1))
        lastTouchDist.current = dist
      }
    } else {
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true
      if (!isDragging.current) return
      const n = Math.pow(2, zoom)
      const tileSize = 256
      setCenter({
        lat: Math.max(-85, Math.min(85, dragStart.current.lat + (dragStart.current.y - e.touches[0].clientY) / tileSize * (360 / n) * Math.cos(dragStart.current.lat * Math.PI / 180) * 0.5)),
        lng: dragStart.current.lng + (dragStart.current.x - e.touches[0].clientX) / tileSize / n * 360 * -1
      })
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches.length === 1 && !isDragging.current) {
      const rect = canvasRef.current!.getBoundingClientRect()
      const scaleX = canvasRef.current!.width / rect.width
      const scaleY = canvasRef.current!.height / rect.height
      const cx = (e.changedTouches[0].clientX - rect.left) * scaleX
      const cy = (e.changedTouches[0].clientY - rect.top) * scaleY
      const { lat, lng } = canvasToLatLng(cx, cy)
      setPin({ lat, lng })
      onPin(lat, lng)
    }
    lastTouchDist.current = null
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '360px', cursor: 'crosshair', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        width={500}
        height={360}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
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
          Tap to drop a pin on your front door
        </div>
      )}
    </div>
  )
}
