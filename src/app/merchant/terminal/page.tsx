'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function TerminalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [archivedOrders, setArchivedOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'incoming' | 'accepted'>('incoming')
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'main' | 'neworder' | 'detail' | 'paying' | 'paid' | 'items' | 'printer' | 'eod' | 'history'>('main')
  const [cogOpen, setCogOpen] = useState(false)
  const [selectedWait, setSelectedWait] = useState(25)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [aiTagging, setAiTagging] = useState(false)
  const [selectedSound, setSelectedSound] = useState('chime')
  const [paymentSound, setPaymentSound] = useState('bell')
  const alertRef = useRef<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [delivTime, setDelivTime] = useState(25)
  const [pickTime, setPickTime] = useState(15)
  const [timeModal, setTimeModal] = useState<'delivery' | 'pickup' | null>(null)
  const [toggles, setToggles] = useState({ preorders: true, delivery: true, pickups: true })
  const countdownRef = useRef<any>(null)
  const pollRef = useRef<any>(null)
  const syncRef = useRef<any>(null)
  const audioCtx = useRef<any>(null)

  useEffect(() => {
    checkAuth()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (syncRef.current) clearInterval(syncRef.current)
      if (alertRef.current) clearInterval(alertRef.current)
    }
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/merchant/login'); return }
    const { data: merchant } = await supabase.from('merchants').select('*, restaurants(*)').eq('id', session.user.id).single()
    if (merchant) {
      const rest = merchant.restaurants?.[0]
      setRestaurant(rest)
      if (rest) {
        setDelivTime(rest.delivery_time_mins || 25)
        setPickTime(rest.pickup_time_mins || 15)
      }
      fetchMenuItems(rest?.id)
      startPolling(rest?.id)
    }
  }

  async function fetchMenuItems(restId: string) {
    if (!restId) return
    const { data } = await supabase.from('menu_items').select('*, menu_categories(name)').eq('restaurant_id', restId)
    setMenuItems(data || [])
  }

  function startPolling(restId: string) {
    if (!restId) return
    pollOrders(restId)
    pollRef.current = setInterval(() => pollOrders(restId), 5000)
  }

  async function aiTagMenu() {
    if (!restaurant) return
    if (!confirm('Run AI tagging on all your menu items? This adds allergen info and calorie estimates. May take a few minutes.')) return
    setAiTagging(true)
    try {
      const res = await fetch('/api/admin/ai-tag-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id })
      })
      const data = await res.json()
      alert(data.message || ('Error: ' + data.error))
    } catch (e) {
      alert('AI tagging failed')
    }
    setAiTagging(false)
  }

  function playAlertSound(soundName?: string) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const name = soundName || selectedSound
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      const t = ctx.currentTime
      gain.gain.setValueAtTime(0.3, t)

      if (name === 'chime') { osc.type = 'sine'; osc.frequency.setValueAtTime(880, t); osc.frequency.setValueAtTime(1100, t+0.15); osc.frequency.setValueAtTime(880, t+0.3); gain.gain.exponentialRampToValueAtTime(0.001, t+0.8) }
      else if (name === 'ding') { osc.type = 'sine'; osc.frequency.setValueAtTime(1200, t); osc.frequency.exponentialRampToValueAtTime(600, t+0.5); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'beep') { osc.type = 'square'; osc.frequency.setValueAtTime(800, t); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.3) }
      else if (name === 'alert') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(440, t); osc.frequency.setValueAtTime(880, t+0.1); osc.frequency.setValueAtTime(440, t+0.2); osc.frequency.setValueAtTime(880, t+0.3); gain.gain.exponentialRampToValueAtTime(0.001, t+0.5) }
      else if (name === 'bell') { osc.type = 'triangle'; osc.frequency.setValueAtTime(1568, t); osc.frequency.exponentialRampToValueAtTime(784, t+1); gain.gain.exponentialRampToValueAtTime(0.001, t+1.2) }
      else if (name === 'ping') { osc.type = 'sine'; osc.frequency.setValueAtTime(1400, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.4) }
      else if (name === 'buzz') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.3) }
      else if (name === 'pop') { osc.type = 'sine'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(100, t+0.1); gain.gain.exponentialRampToValueAtTime(0.001, t+0.15) }
      else if (name === 'blip') { osc.type = 'square'; osc.frequency.setValueAtTime(600, t); osc.frequency.setValueAtTime(900, t+0.05); gain.gain.exponentialRampToValueAtTime(0.001, t+0.2) }
      else if (name === 'horn') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(350, t); osc.frequency.setValueAtTime(400, t+0.1); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'whistle') { osc.type = 'sine'; osc.frequency.setValueAtTime(2000, t); osc.frequency.setValueAtTime(1800, t+0.1); osc.frequency.setValueAtTime(2000, t+0.2); gain.gain.exponentialRampToValueAtTime(0.001, t+0.4) }
      else if (name === 'cuckoo') { osc.type = 'triangle'; osc.frequency.setValueAtTime(528, t); osc.frequency.setValueAtTime(440, t+0.2); osc.frequency.setValueAtTime(528, t+0.5); osc.frequency.setValueAtTime(440, t+0.7); gain.gain.exponentialRampToValueAtTime(0.001, t+1) }
      else if (name === 'siren') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, t); osc.frequency.linearRampToValueAtTime(800, t+0.4); osc.frequency.linearRampToValueAtTime(400, t+0.8); gain.gain.exponentialRampToValueAtTime(0.001, t+1) }
      else if (name === 'doorbell') { osc.type = 'sine'; osc.frequency.setValueAtTime(698, t); osc.frequency.setValueAtTime(587, t+0.3); gain.gain.exponentialRampToValueAtTime(0.001, t+0.8) }
      else if (name === 'chirp') { osc.type = 'sine'; osc.frequency.setValueAtTime(1000, t); osc.frequency.exponentialRampToValueAtTime(2000, t+0.1); gain.gain.exponentialRampToValueAtTime(0.001, t+0.2) }
      else if (name === 'gong') { osc.type = 'triangle'; osc.frequency.setValueAtTime(220, t); gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.001, t+2) }
      else if (name === 'xylophone') { osc.type = 'triangle'; osc.frequency.setValueAtTime(1046, t); osc.frequency.setValueAtTime(880, t+0.15); osc.frequency.setValueAtTime(1046, t+0.3); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'trumpet') { osc.type = 'square'; osc.frequency.setValueAtTime(523, t); osc.frequency.setValueAtTime(659, t+0.15); osc.frequency.setValueAtTime(784, t+0.3); gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'sonar') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(200, t+0.5); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'sparkle') { osc.type = 'sine'; osc.frequency.setValueAtTime(2000, t); osc.frequency.setValueAtTime(2500, t+0.05); osc.frequency.setValueAtTime(3000, t+0.1); osc.frequency.setValueAtTime(2500, t+0.15); gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.4) }

      osc.start(t); osc.stop(t + 2)
    } catch (e) { console.log('Sound error:', e) }
  }

  async function syncFoodGG(restId: string) {
    try {
      const res = await fetch('/api/merchant/sync-foodgg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restId })
      })
      const data = await res.json()
      if (data.changes?.length > 0) {
        console.log('food.gg sync:', data.message)
      }
    } catch (e) {
      console.log('Sync failed:', e)
    }
  }

  function startAlertRepeat() {
    if (alertRef.current) return
    playAlertSound()
    alertRef.current = setInterval(() => playAlertSound(), 2000)
  }

  function stopAlertRepeat() {
    if (alertRef.current) { clearInterval(alertRef.current); alertRef.current = null }
  }

  async function pollOrders(restId: string) {
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('restaurant_id', restId).in('status', ['pending', 'accepted', 'waiting_payment', 'paid']).order('created_at', { ascending: false })
    if (!data) return
    const prevPendingIds = orders.filter(o => o.status === 'pending').map((o: any) => o.id)
    const newPending = data.filter(o => o.status === 'pending' && !prevPendingIds.includes(o.id))
    setOrders(data)
    if (newPending.length > 0) {
      setCurrentOrderId(newPending[0].id)
      setScreen('neworder')
      startAlertRepeat()
    }
  }

  function playSound(type: 'new' | 'reject' | 'paid') {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const ctx = audioCtx.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = type === 'new' ? 880 : type === 'reject' ? 220 : 1100
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  const currentOrder = orders.find(o => o.id === currentOrderId)
  const pendingOrders = orders.filter(o => o.status === 'pending')
  const acceptedOrders = orders.filter(o => ['accepted','waiting_payment','paid'].includes(o.status))

  async function acceptOrder() {
    if (!currentOrder) return
    stopAlertRepeat()
    setAcceptOpen(false)
    setScreen('paying')
    await fetch(`/api/orders/${currentOrder.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', estimatedWaitMins: selectedWait }) })
    setCountdown(10)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(countdownRef.current); simulatePayment(); return 0 } return prev - 1 })
    }, 1000)
  }

  function simulatePayment() { setScreen('paid'); playAlertSound(paymentSound) }

  async function rejectOrder() {
    if (!currentOrder) return
    stopAlertRepeat()
    setRejectOpen(false)
    const reason = selectedReason || customReason || 'No reason given'
    await fetch(`/api/orders/${currentOrder.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', rejectionReason: reason }) })
    playSound('reject')
    setScreen('main')
    setCurrentOrderId(null)
  }

  async function toggleMenuItem(id: string, current: boolean) {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id)
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, is_available: !current } : i))
  }

  // Start/stop food.gg sync when toggle changes
  useEffect(() => {
    if (toggles.sync && restaurant?.id) {
      // Run immediately then every 5 minutes
      syncFoodGG(restaurant.id)
      syncRef.current = setInterval(() => syncFoodGG(restaurant.id), 5 * 60 * 1000)
    } else {
      if (syncRef.current) {
        clearInterval(syncRef.current)
        syncRef.current = null
      }
    }
    return () => {
      if (syncRef.current) clearInterval(syncRef.current)
    }
  }, [toggles.sync, restaurant?.id])

  const filteredItems = menuItems.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.menu_categories?.name?.toLowerCase().includes(itemSearch.toLowerCase()))

  return (
    <div style={{ background: '#0a0f1e', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', position: 'relative', overflow: 'hidden', touchAction: 'manipulation' }}>

      {/* TOP BAR */}
      <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(6px,1.5vw,12px) clamp(8px,2vw,16px)', display: 'flex', alignItems: 'center', gap: 'clamp(6px,1.5vw,12px)', flexWrap: 'nowrap', position: 'relative', zIndex: 20, flexShrink: 0 }}>
        
        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(14px,2.5vw,18px)', fontWeight: 700, color: '#22c55e', flexShrink: 0 }}>
          feed<span style={{ color: '#f8fafc' }}>me</span>.gg
        </div>

        {/* DELIVERY TIME - twice as large */}
        <button onClick={() => setTimeModal('delivery')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: 'clamp(6px,1.5vw,10px) clamp(10px,2vw,18px)', cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontSize: 'clamp(9px,1.5vw,12px)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}> Delivery</span>
          <span style={{ fontSize: 'clamp(22px,4.5vw,36px)', fontWeight: 700, color: '#f97316', lineHeight: 1.1 }}>{delivTime}<span style={{ fontSize: 'clamp(11px,2vw,16px)', fontWeight: 400 }}>m</span></span>
        </button>

        {/* PICKUP TIME - twice as large */}
        <button onClick={() => setTimeModal('pickup')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: 'clamp(6px,1.5vw,10px) clamp(10px,2vw,18px)', cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontSize: 'clamp(9px,1.5vw,12px)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}> Pickup</span>
          <span style={{ fontSize: 'clamp(22px,4.5vw,36px)', fontWeight: 700, color: '#f97316', lineHeight: 1.1 }}>{pickTime}<span style={{ fontSize: 'clamp(11px,2vw,16px)', fontWeight: 400 }}>m</span></span>
        </button>

        {/* Toggles */}
        <div style={{ display: 'flex', gap: 'clamp(4px,1vw,8px)', flexWrap: 'wrap', flex: 1 }}>
          {(['preorders','delivery','pickups'] as const).map(key => (
            <div key={key} onClick={() => setToggles(t => ({ ...t, [key]: !t[key] }))} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: toggles[key] ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `0.5px solid ${toggles[key] ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', padding: 'clamp(4px,1vw,6px) clamp(6px,1.2vw,10px)', fontSize: 'clamp(9px,1.4vw,11px)', color: toggles[key] ? '#22c55e' : '#ef4444', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
              <div style={{ width: 'clamp(22px,3vw,28px)', height: 'clamp(12px,1.8vw,15px)', borderRadius: '8px', background: toggles[key] ? '#22c55e' : '#334155', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '2px', left: toggles[key] ? 'calc(100% - 13px)' : '2px', width: 'clamp(8px,1.4vw,11px)', height: 'clamp(8px,1.4vw,11px)', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'clamp(9px,1.4vw,11px)', color: '#22c55e', flexShrink: 0 }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />Live
        </div>

        {/* Cog */}
        <button onClick={() => setCogOpen(!cogOpen)} style={{ background: cogOpen ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)', border: `0.5px solid ${cogOpen ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: cogOpen ? '#22c55e' : '#94a3b8', width: 'clamp(30px,4vw,38px)', height: 'clamp(30px,4vw,38px)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(14px,2.5vw,18px)', cursor: 'pointer', flexShrink: 0 }}>&#9881;</button>

        {cogOpen && (
          <div style={{ position: 'absolute', top: '100%', right: '10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '8px', zIndex: 50, width: 'clamp(180px,25vw,220px)' }}>
            {[
              { icon: '&#9776;', label: 'Menu Items', sub: 'Enable / disable items', screen: 'items' },
              { icon: '&#128438;', label: 'Printer Settings', sub: 'Test, check, configure', screen: 'printer' },
              { icon: '&#128203;', label: 'End of Day', sub: 'Report & reset orders', screen: 'eod' },
              { icon: '&#128337;', label: 'Order History', sub: 'Search past orders', screen: 'history' },
            ].map(btn => (
              <button key={btn.screen} onClick={() => { if (btn.screen === 'aitag') { setCogOpen(false); aiTagMenu() } else { setScreen(btn.screen as any); setCogOpen(false) } }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', color: '#f8fafc', padding: '12px 14px', borderRadius: '8px', fontSize: 'clamp(11px,1.8vw,13px)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: btn.icon }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{btn.label}</div>
                  <div style={{ fontSize: 'clamp(9px,1.4vw,10px)', color: '#64748b' }}>{btn.sub}</div>
                </div>
              </button>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '6px 0', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Order Sound</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <select value={selectedSound} onChange={e => setSelectedSound(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }}>
                  {['chime','ding','beep','alert','bell','ping','buzz','pop','blip','horn','whistle','cuckoo','siren','doorbell','chirp','gong','xylophone','trumpet','sonar','sparkle'].map(s => (
                    <option key={s} value={s} style={{ background: '#0f172a', textTransform: 'capitalize' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button onClick={() => playAlertSound(selectedSound)} style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Test</button>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Sound</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select value={paymentSound} onChange={e => setPaymentSound(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }}>
                  {['chime','ding','beep','alert','bell','ping','buzz','pop','blip','horn','whistle','cuckoo','siren','doorbell','chirp','gong','xylophone','trumpet','sonar','sparkle'].map(s => (
                    <option key={s} value={s} style={{ background: '#0f172a', textTransform: 'capitalize' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button onClick={() => playAlertSound(paymentSound)} style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Test</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {(['incoming', 'accepted'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 'clamp(8px,1.5vw,12px)', textAlign: 'center', fontSize: 'clamp(11px,1.8vw,13px)', fontWeight: 500, color: tab === t ? '#22c55e' : '#94a3b8', border: 'none', background: 'none', borderBottom: `2px solid ${tab === t ? '#22c55e' : 'transparent'}`, cursor: 'pointer' }}>
            {t === 'incoming' ? 'Orders Incoming' : 'Orders Accepted'}
            {t === 'incoming' && pendingOrders.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ef4444', color: 'white', fontSize: '9px', fontWeight: 600, width: '16px', height: '16px', borderRadius: '50%', marginLeft: '5px', verticalAlign: 'middle' }}>
                {pendingOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MAIN ORDER LIST */}
      <div style={{ flex: 1, padding: 'clamp(6px,1.5vw,12px)', overflowY: 'auto' }}>
        {tab === 'incoming' ? (
          pendingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#475569' }}>
              <div style={{ fontSize: 'clamp(28px,5vw,40px)', marginBottom: '10px', opacity: 0.3 }}></div>
              <div style={{ fontSize: 'clamp(11px,2vw,14px)' }}>No pending orders</div>
            </div>
          ) : (
            pendingOrders.map(o => (
              <div key={o.id} onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ background: '#0f172a', borderLeft: `3px solid ${o.scheduled_for ? '#3b82f6' : '#22c55e'}`, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: 'clamp(10px,2vw,14px)', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <div style={{ fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 600, color: '#f8fafc' }}>{o.order_number}</div>
                  <span style={{ fontSize: 'clamp(9px,1.5vw,11px)', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: o.scheduled_for ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)', color: o.scheduled_for ? '#3b82f6' : '#22c55e' }}>
                    {o.scheduled_for ? `Pre-order ${new Date(o.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live order'}
                  </span>
                </div>
                <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: '#64748b', marginBottom: '4px' }}>{o.customer_name}  {o.order_type === 'delivery' ? ' Delivery' : ' Collection'}  {o.payment_method}</div>
                <div style={{ fontSize: 'clamp(10px,1.6vw,11px)', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{o.order_items?.map((i: any) => `${i.quantity} ${i.name}`).join(', ')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 600, color: '#22c55e' }}>{o.total?.toFixed(2)}</div>
                  <div style={{ fontSize: 'clamp(9px,1.4vw,11px)', color: '#475569' }}>Tap to open </div>
                </div>
              </div>
            ))
          )
        ) : (
          acceptedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#475569' }}>
              <div style={{ fontSize: 'clamp(28px,5vw,40px)', marginBottom: '10px', opacity: 0.3 }}></div>
              <div style={{ fontSize: 'clamp(11px,2vw,14px)' }}>No accepted orders today</div>
            </div>
          ) : (
            acceptedOrders.map(o => (
              <div key={o.id} style={{ background: '#0f172a', borderLeft: `3px solid ${o.status === 'paid' ? '#22c55e' : '#f97316'}`, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: 'clamp(10px,2vw,14px)', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 600, color: '#f8fafc' }}>{o.order_number}</div>
                  <span style={{ fontSize: 'clamp(9px,1.5vw,11px)', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: o.status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)', color: o.status === 'paid' ? '#22c55e' : '#f97316' }}>
                    {o.status === 'paid' ? ' Paid' : 'Waiting payment...'}
                  </span>
                </div>
                <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: '#64748b', marginBottom: '4px' }}>{o.customer_name}  {o.order_type === 'delivery' ? ' Delivery' : ' Collection'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 600, color: '#22c55e' }}>{o.total?.toFixed(2)}</div>
                  {o.status === 'paid' && <span style={{ fontSize: 'clamp(9px,1.4vw,11px)', color: '#22c55e' }}> 3 tickets printed</span>}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* NEW ORDER SCREEN */}
      {screen === 'neworder' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', zIndex: 10 }}>
          <div style={{ width: 'clamp(80px,15vw,120px)', height: 'clamp(80px,15vw,120px)', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(32px,7vw,52px)', marginBottom: '20px' }}></div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(24px,5vw,36px)', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>NEW ORDER!</div>
          <div style={{ fontSize: 'clamp(12px,2.5vw,16px)', color: '#64748b', marginBottom: '28px' }}>
            {currentOrder ? `${currentOrder.customer_name}  ${currentOrder.total?.toFixed(2)}` : 'Tap to view'}
          </div>
          <button onClick={() => setScreen('detail')} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(12px,2.5vw,18px) clamp(28px,6vw,48px)', borderRadius: '14px', fontSize: 'clamp(14px,3vw,20px)', fontWeight: 700, cursor: 'pointer' }}>
            View Order 
          </button>
        </div>
      )}

      {/* ORDER DETAIL */}
      {screen === 'detail' && currentOrder && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', zIndex: 9 }}>
          <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(8px,2vw,14px)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button onClick={() => { setScreen('main'); setCurrentOrderId(null) }} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: 'clamp(5px,1vw,8px) clamp(8px,1.5vw,12px)', borderRadius: '6px', fontSize: 'clamp(11px,1.8vw,13px)', cursor: 'pointer' }}> Back</button>
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(13px,2.5vw,17px)', fontWeight: 700, color: '#f8fafc' }}>Order {currentOrder.order_number}</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(10px,2vw,16px)' }}>
            <div style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: 'clamp(10px,2vw,14px)', marginBottom: '12px' }}>
              <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 600, color: '#f8fafc', marginBottom: '5px' }}>{currentOrder.customer_name}</div>
              <div style={{ fontSize: 'clamp(10px,1.8vw,13px)', color: '#64748b', lineHeight: 1.8 }}>
                {currentOrder.customer_phone}<br />
                {currentOrder.order_type === 'delivery' ? ` ${currentOrder.delivery_address}` : ' Collection'}
                {currentOrder.delivery_what3words && <><br /><span style={{ color: '#ef4444', fontWeight: 600 }}>/// {currentOrder.delivery_what3words}</span></>}
                <br /> {currentOrder.payment_method}
              </div>
            </div>
            <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', fontWeight: 600 }}>Items</div>
            {currentOrder.order_items?.map((item: any) => (
              <div key={item.id} style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: 'clamp(8px,1.5vw,12px)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: '1.5px solid #22c55e', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', color: '#22c55e' }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'clamp(12px,2.2vw,14px)', fontWeight: 500, color: '#f8fafc' }}>{item.quantity} {item.name}</div>
                  {item.special_instructions && <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: '#f97316', fontStyle: 'italic', marginTop: '2px' }}>&quot;{item.special_instructions}&quot;</div>}
                </div>
                <div style={{ fontSize: 'clamp(12px,2.2vw,14px)', fontWeight: 600, color: '#22c55e' }}>{item.subtotal?.toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#060b18', borderTop: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(10px,2vw,14px)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(11px,2vw,13px)', color: '#64748b', marginBottom: '3px' }}><span>Subtotal</span><span>{currentOrder.subtotal?.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(11px,2vw,13px)', color: '#64748b', marginBottom: '8px' }}><span>Delivery</span><span>{currentOrder.order_type === 'delivery' ? `${currentOrder.delivery_fee?.toFixed(2)}` : 'Free'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(16px,3vw,20px)', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}><span>Total</span><span style={{ color: '#22c55e' }}>{currentOrder.total?.toFixed(2)}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
              <button onClick={() => setAcceptOpen(true)} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(12px,2.5vw,16px)', borderRadius: '10px', fontSize: 'clamp(13px,2.5vw,17px)', fontWeight: 700, cursor: 'pointer' }}> Accept Order</button>
              <button onClick={() => setRejectOpen(true)} style={{ background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: 'clamp(12px,2.5vw,16px)', borderRadius: '10px', fontSize: 'clamp(13px,2.5vw,17px)', cursor: 'pointer' }}> Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* WAITING FOR PAYMENT */}
      {screen === 'paying' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', zIndex: 10 }}>
          <div style={{ fontSize: 'clamp(36px,7vw,56px)', marginBottom: '16px' }}></div>
          <div style={{ fontSize: 'clamp(18px,3.5vw,26px)', fontWeight: 700, color: '#f97316', marginBottom: '6px' }}>Waiting for Payment</div>
          <div style={{ fontSize: 'clamp(11px,2vw,14px)', color: '#64748b', marginBottom: '20px' }}>Payment link sent to {currentOrder?.customer_name}</div>
          <div style={{ fontSize: 'clamp(44px,9vw,64px)', fontWeight: 700, color: '#f97316', marginBottom: '8px' }}>{countdown}</div>
          <div style={{ width: 'clamp(140px,25vw,200px)', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ height: '100%', background: '#f97316', borderRadius: '3px', width: `${(countdown / 120) * 100}%`, transition: 'width 1s linear' }} />
          </div>
          <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: '#334155' }}>Customer has 2 minutes to pay</div>
        </div>
      )}

      {/* PAYMENT CONFIRMED */}
      {screen === 'paid' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', zIndex: 10 }}>
          <div style={{ fontSize: 'clamp(40px,8vw,60px)', marginBottom: '16px' }}></div>
          <div style={{ fontSize: 'clamp(18px,3.5vw,26px)', fontWeight: 700, color: '#22c55e', marginBottom: '6px' }}>Payment Confirmed!</div>
          <div style={{ fontSize: 'clamp(11px,2vw,14px)', color: '#64748b', marginBottom: '20px' }}>{currentOrder?.total?.toFixed(2)} received  Printing 3 tickets now...</div>
          <div style={{ background: '#0f172a', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px 24px', marginBottom: '20px', textAlign: 'left' }}>
            <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Printing</div>
            <PrintRow label="Kitchen ticket" delay={800} />
            <PrintRow label="Restaurant ticket" delay={1600} />
            <PrintRow label="Customer ticket" delay={2400} />
          </div>
          <button onClick={() => { setScreen('main'); setCurrentOrderId(null); setTab('accepted') }} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(10px,2vw,14px) clamp(24px,5vw,36px)', borderRadius: '10px', fontSize: 'clamp(13px,2.5vw,17px)', fontWeight: 700, cursor: 'pointer' }}>
            Back to orders
          </button>
        </div>
      )}

      {/* FULL SCREEN PANELS  with close button */}
      {screen === 'items' && (
        <FullScreen title="Menu Items" onBack={() => setScreen('main')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
            <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items..." style={{ flex: 1, background: 'none', border: 'none', color: '#f8fafc', fontSize: 'clamp(12px,2vw,14px)', outline: 'none' }} />
            {itemSearch && <button onClick={() => setItemSearch('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px' }}>x</button>}
          </div>
          {itemSearch ? (
            filteredItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(8px,1.5vw,12px)', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'clamp(18px,3vw,22px)' }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 500, color: '#f8fafc' }}>{item.name}</div>
                    <div style={{ fontSize: 'clamp(9px,1.5vw,11px)', color: '#475569' }}>{item.menu_categories?.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: 'clamp(11px,2vw,13px)', fontWeight: 600, color: '#22c55e' }}>{item.price?.toFixed(2)}</span>
                  <div onClick={() => toggleMenuItem(item.id, item.is_available)} style={{ width: '32px', height: '17px', borderRadius: '9px', background: item.is_available ? '#22c55e' : '#334155', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: '2px', left: item.is_available ? '17px' : '2px', width: '13px', height: '13px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            Array.from(new Set(menuItems.map(i => i.menu_categories?.name || 'Uncategorised'))).map(catName => {
              const catItems = menuItems.filter(i => (i.menu_categories?.name || 'Uncategorised') === catName)
              return (
                <TerminalCatSection key={catName} catName={catName} items={catItems} onToggle={toggleMenuItem} />
              )
            })
          )}
        </FullScreen>
      )}

      {screen === 'printer' && (
        <FullScreen title="Printer Settings" onBack={() => setScreen('main')}>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: 'clamp(11px,1.8vw,13px)', color: '#94a3b8' }}>
             <strong style={{ color: '#f8fafc' }}>Epson TM-T20III</strong>  Connected 
          </div>
          {[' Print test tickets', ' Check connection', ' Edit kitchen ticket', ' Edit restaurant ticket', ' Edit customer ticket'].map(btn => (
            <button key={btn} onClick={() => alert(`${btn}  coming soon`)} style={{ width: '100%', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.08)', color: '#f8fafc', padding: 'clamp(10px,2vw,14px)', borderRadius: '8px', fontSize: 'clamp(12px,2vw,14px)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {btn}
            </button>
          ))}
        </FullScreen>
      )}

      {screen === 'eod' && (
        <FullScreen title="End of Day Report" onBack={() => setScreen('main')}>
          <EODReport orders={orders} onClear={() => { setArchivedOrders(prev => [...prev, ...orders.filter(o => ['paid','cancelled'].includes(o.status))]); setOrders(prev => prev.filter(o => o.status === 'pending')); setScreen('main') }} />
        </FullScreen>
      )}

      {screen === 'history' && (
        <FullScreen title="Order History" onBack={() => setScreen('main')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px' }}>
            <span style={{ color: '#475569' }}></span>
            <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search orders..." style={{ flex: 1, background: 'none', border: 'none', color: '#f8fafc', fontSize: 'clamp(12px,2vw,14px)', outline: 'none' }} />
          </div>
          {[...archivedOrders, ...orders.filter(o => ['paid','cancelled'].includes(o.status))].filter(o => !historySearch || o.order_number?.includes(historySearch) || o.customer_name?.toLowerCase().includes(historySearch.toLowerCase())).map(o => (
            <div key={o.id || o.order_number} style={{ background: '#060b18', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: 'clamp(8px,1.5vw,12px)', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 'clamp(11px,2vw,13px)', fontWeight: 600, color: '#f8fafc' }}>{o.order_number}</div>
                <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: '#475569' }}>{o.customer_name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 600, color: '#22c55e' }}>{o.total?.toFixed(2)}</div>
                <span style={{ fontSize: 'clamp(9px,1.4vw,11px)', color: o.status === 'paid' ? '#22c55e' : '#ef4444' }}>{o.status}</span>
              </div>
            </div>
          ))}
        </FullScreen>
      )}

      {/* ACCEPT MODAL */}
      {acceptOpen && (
        <Modal onClose={() => setAcceptOpen(false)}>
          <h3 style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>How long will this take?</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '14px' }}>
            {[15,20,25,30,45,60].map(t => (
              <button key={t} onClick={() => setSelectedWait(t)} style={{ background: selectedWait === t ? 'rgba(34,197,94,0.08)' : '#0f172a', border: `1.5px solid ${selectedWait === t ? '#22c55e' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: 'clamp(10px,2vw,14px)', textAlign: 'center', cursor: 'pointer', fontSize: 'clamp(12px,2vw,15px)', color: selectedWait === t ? '#22c55e' : '#94a3b8' }}>
                {t} min
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '7px' }}>
            <button onClick={() => setAcceptOpen(false)} style={{ flex: 1, background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.1)', color: '#64748b', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', cursor: 'pointer', fontSize: 'clamp(11px,2vw,13px)' }}>Cancel</button>
            <button onClick={acceptOrder} style={{ flex: 2, background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', fontSize: 'clamp(11px,2vw,13px)', fontWeight: 700, cursor: 'pointer' }}>Accept & Send Payment Link</button>
          </div>
        </Modal>
      )}

      {/* REJECT MODAL */}
      {rejectOpen && (
        <Modal onClose={() => setRejectOpen(false)}>
          <h3 style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>Reason for rejection</h3>
          {['Out of stock','Too busy right now','Outside delivery zone','Closing soon'].map(r => (
            <button key={r} onClick={() => setSelectedReason(r)} style={{ width: '100%', background: '#0f172a', border: `0.5px solid ${selectedReason === r ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: 'clamp(8px,1.5vw,11px) 12px', fontSize: 'clamp(11px,2vw,13px)', color: selectedReason === r ? '#ef4444' : '#94a3b8', textAlign: 'left', cursor: 'pointer', marginBottom: '5px' }}>
              {r}
            </button>
          ))}
          <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Or type a custom reason..." style={{ width: '100%', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '9px 11px', fontSize: 'clamp(11px,2vw,13px)', color: '#f8fafc', marginBottom: '10px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} rows={2} />
          <div style={{ display: 'flex', gap: '7px' }}>
            <button onClick={() => setRejectOpen(false)} style={{ flex: 1, background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.1)', color: '#64748b', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', cursor: 'pointer', fontSize: 'clamp(11px,2vw,13px)' }}>Cancel</button>
            <button onClick={rejectOrder} style={{ flex: 2, background: '#ef4444', color: 'white', border: 'none', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', fontSize: 'clamp(11px,2vw,13px)', fontWeight: 700, cursor: 'pointer' }}>Confirm Rejection</button>
          </div>
        </Modal>
      )}

      {/* TIME MODAL */}
      {timeModal && (
        <Modal onClose={() => setTimeModal(null)}>
          <h3 style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>
            Adjust {timeModal === 'delivery' ? 'delivery' : 'pickup'} time
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '14px' }}>
            {[10,15,20,25,30,45,60,90].map(t => (
              <button key={t} onClick={async () => {
                if (timeModal === 'delivery') {
                  setDelivTime(t)
                  if (restaurant) await supabase.from('restaurants').update({ delivery_time_mins: t }).eq('id', restaurant.id)
                } else {
                  setPickTime(t)
                  if (restaurant) await supabase.from('restaurants').update({ pickup_time_mins: t }).eq('id', restaurant.id)
                }
                setTimeModal(null)
              }} style={{ background: (timeModal === 'delivery' ? delivTime : pickTime) === t ? 'rgba(34,197,94,0.08)' : '#0f172a', border: `1.5px solid ${(timeModal === 'delivery' ? delivTime : pickTime) === t ? '#22c55e' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: 'clamp(10px,2vw,14px)', textAlign: 'center', cursor: 'pointer', fontSize: 'clamp(12px,2vw,15px)', color: (timeModal === 'delivery' ? delivTime : pickTime) === t ? '#22c55e' : '#94a3b8' }}>
                {t}m
              </button>
            ))}
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bounce-in { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}

function TerminalCatSection({ catName, items, onToggle }: { catName: string; items: any[]; onToggle: (id: string, current: boolean) => void }) {
  const [open, setOpen] = React.useState(true)
  return (
    <div style={{ marginBottom: '8px' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer', marginBottom: open ? '6px' : '0' }}>
        <span style={{ fontSize: 'clamp(11px,2vw,13px)', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{catName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#475569' }}>{items.length} items</span>
          <span style={{ color: '#475569', fontSize: '12px' }}>{open ? 'v' : '>'}</span>
        </div>
      </div>
      {open && items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(8px,1.5vw,12px)', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'clamp(18px,3vw,22px)' }}>{item.emoji}</span>
            <div>
              <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 500, color: item.is_available ? '#f8fafc' : '#475569' }}>{item.name}</div>
              <div style={{ fontSize: 'clamp(9px,1.5vw,11px)', color: '#475569' }}>GBP{item.price?.toFixed(2)}</div>
            </div>
          </div>
          <div onClick={() => onToggle(item.id, item.is_available)} style={{ width: '40px', height: '22px', borderRadius: '11px', background: item.is_available ? '#22c55e' : '#334155', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '3px', left: item.is_available ? '21px' : '3px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function FullScreen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(10px,2vw,16px) clamp(12px,2.5vw,20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(14px,2.5vw,18px)', fontWeight: 700, color: '#f8fafc' }}>{title}</div>
        <button onClick={onBack} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: 'clamp(8px,1.5vw,10px) clamp(16px,2.5vw,24px)', borderRadius: '8px', fontSize: 'clamp(12px,2vw,14px)', fontWeight: 700, cursor: 'pointer' }}>Back</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px,2vw,20px)' }}>{children}</div>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 20 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#1e293b', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: 'clamp(16px,3vw,24px)', width: '100%', maxWidth: 'clamp(280px,50vw,360px)' }}>
        {children}
      </div>
    </div>
  )
}

function PrintRow({ label, delay }: { label: string; delay: number }) {
  const [done, setDone] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDone(true), delay); return () => clearTimeout(t) }, [])
  return (
    <div style={{ fontSize: 'clamp(11px,2vw,13px)', color: done ? '#22c55e' : '#64748b', marginBottom: '6px', transition: 'color 0.3s' }}>
      {done ? '' : ''} {label}{done ? ' printed' : '...'}
    </div>
  )
}

function EODReport({ orders, onClear }: { orders: any[]; onClear: () => void }) {
  const paid = orders.filter(o => o.status === 'paid')
  const cancelled = orders.filter(o => o.status === 'cancelled')
  const card = paid.filter(o => o.payment_method === 'card').reduce((s, o) => s + (o.total || 0), 0)
  const cash = paid.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (o.total || 0), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px', width: '100%', maxWidth: '320px' }}>
        {[['Card sales', `${card.toFixed(2)}`, '#22c55e'], ['Cash sales', `${cash.toFixed(2)}`, '#f97316'], ['Total orders', String(paid.length + cancelled.length), '#f8fafc'], ['Cancelled', String(cancelled.length), '#ef4444'], ['Total revenue', `${(card + cash).toFixed(2)}`, '#22c55e']].map(([label, val, color], i, arr) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: i === arr.length - 1 ? 'clamp(13px,2.5vw,16px)' : 'clamp(11px,2vw,14px)', fontWeight: i === arr.length - 1 ? 700 : 400, color: '#64748b', padding: 'clamp(4px,1vw,6px) 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', borderTop: i === arr.length - 1 ? '0.5px solid rgba(255,255,255,0.08)' : 'none', marginTop: i === arr.length - 1 ? '4px' : 0 }}>
            <span>{label}</span><span style={{ color }}>{val}</span>
          </div>
        ))}
      </div>
      <button onClick={() => alert('End of day report printed!')} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(10px,2vw,14px) clamp(20px,4vw,30px)', borderRadius: '10px', fontSize: 'clamp(12px,2vw,14px)', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}> Print Report</button>
      <button onClick={() => { if (confirm('Clear accepted orders? All records saved in history.')) onClear() }} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', padding: 'clamp(8px,1.5vw,12px) clamp(20px,4vw,30px)', borderRadius: '10px', fontSize: 'clamp(12px,2vw,14px)', cursor: 'pointer' }}>
         Perform End of Day & Clear Orders
      </button>
    </div>
  )
}
