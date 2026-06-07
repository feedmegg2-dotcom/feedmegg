'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PrinterSettingsScreen } from '@/components/PrinterSettingsScreen'
import { usePrinterAutoprint } from '@/hooks/usePrinterAutoprint'
import { playSound as playSoundEffect } from '@/lib/soundGenerator'

export default function TerminalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [archivedOrders, setArchivedOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'incoming' | 'accepted' | 'preorders'>('incoming')
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'main' | 'neworder' | 'detail' | 'paying' | 'paid' | 'ticketsready' | 'items' | 'printer' | 'eod' | 'history'>('main')
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
  const [historyStartDate, setHistoryStartDate] = useState<string>('')
  const [historyEndDate, setHistoryEndDate] = useState<string>('')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [delivTime, setDelivTime] = useState(25)
  const [pickTime, setPickTime] = useState(15)
  const [timeModal, setTimeModal] = useState<'delivery' | 'pickup' | null>(null)
  const [toggles, setToggles] = useState({ preorders: true, delivery: true, pickups: true })
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const countdownRef = useRef<any>(null)
  const pollRef = useRef<any>(null)
  const syncRef = useRef<any>(null)
  const audioCtx = useRef<any>(null)
  const wakeLockRef = useRef<any>(null)
  
  // NEW SEPARATE DELIVERY/PICKUP STATES
  const [deliveryPreOrderEnabled, setDeliveryPreOrderEnabled] = useState(true)
  const [pickupPreOrderEnabled, setPickupPreOrderEnabled] = useState(true)
  const [deliveryTime, setDeliveryTime] = useState(45)
  const [deliverySlotDuration, setDeliverySlotDuration] = useState(30)
  const [deliverySlotCapacity, setDeliverySlotCapacity] = useState(4)
  const [pickupTime, setPickupTime] = useState(30)
  const [pickupSlotDuration, setPickupSlotDuration] = useState(30)
  const [pickupSlotCapacity, setPickupSlotCapacity] = useState(4)
  const [showTimeSlotModal, setShowTimeSlotModal] = useState<'delivery' | 'pickup' | null>(null)
  
  const soundRepeatRef = useRef<any>(null)
  const [soundRingsPlayed, setSoundRingsPlayed] = useState(0)
  const [pendingTicketsReady, setPendingTicketsReady] = useState<Set<string>>(new Set())

  // Printer hook
  const { triggerAutoPrint, manualReprint } = usePrinterAutoprint()

  useEffect(() => {
    checkAuth()
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch (e) { console.log('Wake lock failed:', e) }
    }
    requestWakeLock()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    })
    const requestFullscreen = () => {
      const el = document.documentElement
      if (el.requestFullscreen) el.requestFullscreen()
      else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen()
      else if ((el as any).mozRequestFullScreen) (el as any).mozRequestFullScreen()
    }
    const handler = () => { requestFullscreen(); document.removeEventListener('touchstart', handler); document.removeEventListener('click', handler) }
    document.addEventListener('touchstart', handler)
    document.addEventListener('click', handler)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (syncRef.current) clearInterval(syncRef.current)
      if (alertRef.current) clearInterval(alertRef.current)
      if (wakeLockRef.current) wakeLockRef.current.release()
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('click', handler)
    }
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/merchant/login'); return }
    let { data: merchant } = await supabase.from('merchants').select('*, restaurants(*)').eq('auth_id', session.user.id).maybeSingle()
    if (!merchant) {
      const res2 = await supabase.from('merchants').select('*, restaurants(*)').ilike('email', session.user.email || '').maybeSingle()
      merchant = res2.data
      if (merchant) await supabase.from('merchants').update({ auth_id: session.user.id }).eq('id', merchant.id)
    }
    if (merchant?.restaurants?.[0]) {
      const rest = merchant.restaurants[0]
      setRestaurant(rest)
      setDeliveryPreOrderEnabled(rest.preorder_delivery_enabled ?? true)
      setPickupPreOrderEnabled(rest.preorder_pickup_enabled ?? true)
      setDeliveryTime(rest.delivery_time_mins ?? 45)
      setDeliverySlotDuration(rest.delivery_slot_duration ?? 30)
      setDeliverySlotCapacity(rest.delivery_slot_capacity ?? 4)
      setPickupTime(rest.pickup_time_mins ?? 30)
      setPickupSlotDuration(rest.pickup_slot_duration ?? 30)
      setPickupSlotCapacity(rest.pickup_slot_capacity ?? 4)
      setDelivTime(rest.delivery_time_mins ?? 25)
      setPickTime(rest.pickup_time_mins ?? 15)
      await pollOrders(rest.id)
      setInterval(() => pollOrders(rest.id), 3000)
    }
  }

  function playAlertSound(soundName?: string) {
    try {
      const name = soundName || selectedSound
      playSoundEffect(name)
    } catch (e) { 
      console.log('Sound error:', e) 
    }
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
    playAlertSound(selectedSound)
    alertRef.current = setInterval(() => playAlertSound(selectedSound), 2000)
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

  const currentOrder = orders.find(o => o.id === currentOrderId)
  const pendingOrders = orders.filter(o => o.status === 'pending' && !o.scheduled_for)
  const preOrders = orders.filter(o => o.status === 'pending' && o.scheduled_for)
  const acceptedOrders = orders.filter(o => ['accepted', 'waiting_payment', 'paid'].includes(o.status))

  const colors = theme === 'dark' ? {
    background: '#0a0f1e',
    surface: '#1e293b',
    card: '#0f172a',
    border: 'rgba(255,255,255,0.08)',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
  } : {
    background: '#ffffff',
    surface: '#f8fafc',
    card: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#64748b',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.background, color: colors.text, fontFamily: 'system-ui, sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px,2vw,16px)', background: colors.surface, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 'clamp(16px,3vw,24px)', fontWeight: 800 }}>{restaurant?.name || 'Terminal'}</div>
          <div style={{ fontSize: 'clamp(11px,1.5vw,13px)', color: colors.textTertiary }}>🟢 Online</div>
        </div>
        <div style={{ display: 'flex', gap: 'clamp(8px,1.5vw,12px)', position: 'relative' }}>
          <button onClick={() => setScreen(screen === 'main' ? 'history' : 'main')} style={{ background: 'none', border: 'none', fontSize: 'clamp(18px,4vw,28px)', cursor: 'pointer' }}>📋</button>
          <button onClick={() => setCogOpen(!cogOpen)} style={{ background: 'none', border: 'none', fontSize: 'clamp(18px,4vw,28px)', cursor: 'pointer' }}>⚙️</button>
          
          {cogOpen && (
            <div style={{ position: 'absolute', top: '100%', right: '10px', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '8px', zIndex: 50, width: 'clamp(180px,25vw,240px)' }}>
              {[
                { icon: '&#9776;', label: 'Menu Items', sub: 'Enable / disable items', screen: 'items' },
                { icon: '&#128438;', label: 'Printer Settings', sub: 'Test, check, configure', screen: 'printer' },
                { icon: '&#128203;', label: 'End of Day', sub: 'Report & reset orders', screen: 'eod' },
                { icon: '&#128337;', label: 'Order History', sub: 'Search past orders', screen: 'history' },
              ].map(btn => (
                <button key={btn.screen} onClick={() => { setScreen(btn.screen as any); setCogOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', color: colors.text, padding: '12px 14px', borderRadius: '8px', fontSize: 'clamp(11px,1.8vw,13px)', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: btn.icon }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{btn.label}</div>
                    <div style={{ fontSize: 'clamp(9px,1.4vw,10px)', color: colors.textTertiary }}>{btn.sub}</div>
                  </div>
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${colors.border}`, margin: '6px 0', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: colors.textTertiary, marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Order Sound</div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <select value={selectedSound} onChange={e => setSelectedSound(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '6px', color: colors.text, fontSize: '12px', outline: 'none' }}>
                    {['chime','cuckoo','air-horn','klaxon','alarm-clock','fire-alarm','police-siren','ambulance','car-horn','train-horn','foghorn','loud-doorbell','loud-buzzer','siren'].map(s => (
                      <option key={s} value={s} style={{ background: colors.card }}>{s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                    ))}
                  </select>
                  <button onClick={() => playAlertSound(selectedSound)} style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Test</button>
                </div>
                <div style={{ fontSize: '11px', color: colors.textTertiary, marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Sound</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select value={paymentSound} onChange={e => setPaymentSound(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '6px', color: colors.text, fontSize: '12px', outline: 'none' }}>
                    {['chime','cuckoo','air-horn','klaxon','alarm-clock','fire-alarm','police-siren','ambulance','car-horn','train-horn','foghorn','loud-doorbell','loud-buzzer','siren'].map(s => (
                      <option key={s} value={s} style={{ background: colors.card }}>{s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                    ))}
                  </select>
                  <button onClick={() => playAlertSound(paymentSound)} style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Test</button>
                </div>
                <div style={{ borderTop: `1px solid ${colors.border}`, margin: '8px 0', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: colors.textTertiary, marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setTheme('light')} style={{ flex: 1, padding: '6px 10px', background: theme === 'light' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${theme === 'light' ? 'rgba(34,197,94,0.3)' : colors.border}`, color: theme === 'light' ? '#22c55e' : colors.textSecondary, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Light</button>
                    <button onClick={() => setTheme('dark')} style={{ flex: 1, padding: '6px 10px', background: theme === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${theme === 'dark' ? 'rgba(34,197,94,0.3)' : colors.border}`, color: theme === 'dark' ? '#22c55e' : colors.textSecondary, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Dark</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: colors.surface, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        {(['incoming', 'preorders', 'accepted'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 'clamp(8px,1.5vw,12px)', textAlign: 'center', fontSize: 'clamp(11px,1.8vw,13px)', fontWeight: 500, color: tab === t ? '#22c55e' : colors.textTertiary, border: 'none', background: 'none', borderBottom: `2px solid ${tab === t ? '#22c55e' : 'transparent'}`, cursor: 'pointer' }}>
            {t === 'incoming' ? 'Incoming' : t === 'preorders' ? 'Pre-Orders' : 'Accepted'}
            {t === 'incoming' && pendingOrders.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ef4444', color: 'white', fontSize: '9px', fontWeight: 600, width: '16px', height: '16px', borderRadius: '50%', marginLeft: '5px', verticalAlign: 'middle' }}>
                {pendingOrders.length}
              </span>
            )}
            {t === 'preorders' && preOrders.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: 'white', fontSize: '9px', fontWeight: 600, width: '16px', height: '16px', borderRadius: '50%', marginLeft: '5px', verticalAlign: 'middle' }}>
                {preOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {/* MAIN SCREEN */}
        {screen === 'main' && (
          <div style={{ flex: 1, padding: 'clamp(6px,1.5vw,12px)', overflowY: 'auto', background: colors.background }}>
            {tab === 'incoming' && (
              pendingOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textTertiary }}>No incoming orders</div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {pendingOrders.map(o => (
                    <div key={o.id} onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: 'clamp(12px,2vw,16px)', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#22c55e')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = colors.border)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700 }}>{o.customer_name}</div>
                          <div style={{ fontSize: 'clamp(11px,1.8vw,13px)', color: colors.textTertiary }}>Order #{String(o.id).slice(-6).toUpperCase()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 600, color: '#22c55e' }}>GBP{o.total?.toFixed(2)}</div>
                          <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: colors.textTertiary }}>{o.order_items?.length || 0} items</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'preorders' && (
              preOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textTertiary }}>No pre-orders scheduled</div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {preOrders.map(o => (
                    <div key={o.id} onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: 'clamp(12px,2vw,16px)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700 }}>{o.customer_name}</div>
                          <div style={{ fontSize: 'clamp(11px,1.8vw,13px)', color: colors.textTertiary }}>Order for {new Date(o.scheduled_for).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 600, color: '#3b82f6' }}>GBP{o.total?.toFixed(2)}</div>
                          <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: colors.textTertiary }}>{o.order_items?.length || 0} items</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'accepted' && (
              acceptedOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textTertiary }}>No accepted orders</div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {acceptedOrders.map(o => (
                    <div key={o.id} onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: 'clamp(12px,2vw,16px)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700 }}>{o.customer_name}</div>
                          <div style={{ fontSize: 'clamp(11px,1.8vw,13px)', color: colors.textTertiary }}>Status: {o.status}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 600, color: '#22c55e' }}>GBP{o.total?.toFixed(2)}</div>
                          <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: colors.textTertiary }}>{o.order_items?.length || 0} items</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {screen === 'printer' && <PrinterSettingsScreen onBack={() => setScreen('main')} />}

        {screen === 'history' && (
          <div style={{ flex: 1, padding: 'clamp(12px,2vw,20px)', overflowY: 'auto' }}>
            <div style={{ fontSize: 'clamp(16px,3vw,20px)', fontWeight: 700, marginBottom: '16px' }}>Order History</div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {archivedOrders.map(o => (
                <div key={o.id} onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)} style={{ background: colors.card, border: `0.5px solid ${colors.border}`, borderRadius: '8px', padding: 'clamp(12px,1.5vw,14px)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 600 }}>Order #{String(o.id).slice(-6)}</div>
                      <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: colors.textTertiary }}>{o.customer_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#22c55e' }}>GBP{o.total?.toFixed(2)}</div>
                      <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: colors.textTertiary }}>{o.status}</div>
                    </div>
                  </div>
                  {expandedOrderId === o.id && (
                    <div style={{ background: colors.background, border: `0.5px solid ${colors.border}`, borderRadius: '0 0 8px 8px', borderTop: 'none', padding: 'clamp(10px,1.5vw,14px)', fontSize: 'clamp(10px,1.6vw,12px)', color: colors.textTertiary, marginTop: '12px', userSelect: 'text' }}>
                      <div style={{ marginBottom: '8px' }}><div style={{ color: colors.textSecondary, fontWeight: 600, marginBottom: '4px' }}>Customer</div><div>{o.customer_name}</div><div>{o.customer_phone}</div></div>
                      <div style={{ marginBottom: '8px' }}><div style={{ color: colors.textSecondary, fontWeight: 600, marginBottom: '4px' }}>Items</div>
                        {o.order_items?.map((item: any) => <div key={item.id}>{item.quantity}x {item.name} - GBP{item.subtotal?.toFixed(2)}</div>)}
                      </div>
                      <div style={{ paddingTop: '8px', borderTop: `0.5px solid ${colors.border}`, marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#22c55e' }}><span>Total:</span><span>GBP{o.total?.toFixed(2)}</span></div>
                      </div>
                      <button onClick={() => {
                        manualReprint({
                          id: o.id,
                          orderNumber: o.order_number,
                          restaurantName: restaurant?.name || 'Restaurant',
                          customerName: o.customer_name,
                          deliveryAddress: o.delivery_address,
                          isCollection: o.order_type === 'collection',
                          items: o.order_items || [],
                          specialInstructions: o.special_instructions,
                          subtotal: o.subtotal,
                          deliveryFee: o.delivery_fee,
                          tip: o.tip,
                          total: o.total,
                        })
                      }} style={{ width: '100%', padding: '8px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        Reprint Tickets
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TIME SLOT SETTINGS MODAL */}
      {showTimeSlotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowTimeSlotModal(null) }}>
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: '20px', color: colors.text }}>
              {showTimeSlotModal === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'} Time Slots
            </h3>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', color: colors.textTertiary, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Estimated Time (mins)</label>
                <input 
                  type="number" 
                  value={showTimeSlotModal === 'delivery' ? deliveryTime : pickupTime}
                  onChange={e => showTimeSlotModal === 'delivery' ? setDeliveryTime(parseInt(e.target.value)) : setPickupTime(parseInt(e.target.value))}
                  min="10" max="120"
                  style={{ width: '100%', padding: '10px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text, fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: colors.textTertiary, display: 'block', marginBottom: '8px', fontWeight: 600 }}>Slot Duration (mins)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[15, 20, 30, 45, 60].map(duration => (
                    <button 
                      key={duration}
                      onClick={() => showTimeSlotModal === 'delivery' ? setDeliverySlotDuration(duration) : setPickupSlotDuration(duration)}
                      style={{
                        padding: '10px',
                        background: (showTimeSlotModal === 'delivery' ? deliverySlotDuration : pickupSlotDuration) === duration ? 'rgba(34,197,94,0.15)' : colors.card,
                        border: `1px solid ${(showTimeSlotModal === 'delivery' ? deliverySlotDuration : pickupSlotDuration) === duration ? 'rgba(34,197,94,0.3)' : colors.border}`,
                        color: (showTimeSlotModal === 'delivery' ? deliverySlotDuration : pickupSlotDuration) === duration ? '#22c55e' : colors.textSecondary,
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}>
                      {duration}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: colors.textTertiary, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Orders Per Slot</label>
                <input 
                  type="number" 
                  value={showTimeSlotModal === 'delivery' ? deliverySlotCapacity : pickupSlotCapacity}
                  onChange={e => showTimeSlotModal === 'delivery' ? setDeliverySlotCapacity(parseInt(e.target.value)) : setPickupSlotCapacity(parseInt(e.target.value))}
                  min="1" max="50"
                  style={{ width: '100%', padding: '10px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text, fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowTimeSlotModal(null)} style={{ flex: 1, background: colors.card, border: `1px solid ${colors.border}`, color: colors.textTertiary, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={async () => {
                if (showTimeSlotModal === 'delivery') {
                  await supabase.from('restaurants').update({
                    delivery_time_mins: deliveryTime,
                    delivery_slot_duration: deliverySlotDuration,
                    delivery_slot_capacity: deliverySlotCapacity
                  }).eq('id', restaurant.id)
                } else {
                  await supabase.from('restaurants').update({
                    pickup_time_mins: pickupTime,
                    pickup_slot_duration: pickupSlotDuration,
                    pickup_slot_capacity: pickupSlotCapacity
                  }).eq('id', restaurant.id)
                }
                setShowTimeSlotModal(null)
              }} style={{ flex: 2, background: '#22c55e', color: '#0a0f1e', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
