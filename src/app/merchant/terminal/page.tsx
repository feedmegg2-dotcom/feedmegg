'use client'
// This is the full merchant terminal page
// Served at merchants.feedme.gg/terminal
// All logic is client-side with 5-second polling

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function TerminalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [archivedOrders, setArchivedOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'incoming' | 'accepted'>('incoming')
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'main' | 'neworder' | 'detail' | 'wait' | 'paying' | 'paid' | 'items' | 'printer' | 'eod' | 'history'>('main')
  const [cogOpen, setCogOpen] = useState(false)
  const [selectedWait, setSelectedWait] = useState(25)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [delivTime, setDelivTime] = useState(25)
  const [pickTime, setPickTime] = useState(15)
  const [timeModal, setTimeModal] = useState<'delivery' | 'pickup' | null>(null)
  const [toggles, setToggles] = useState({ preorders: true, delivery: true, pickups: true, sync: true })
  const countdownRef = useRef<any>(null)
  const pollRef = useRef<any>(null)
  const audioCtx = useRef<any>(null)

  useEffect(() => {
    // Check auth
    checkAuth()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/merchant/login'); return }
    
    const { data: merchant } = await supabase
      .from('merchants')
      .select('*, restaurants(*)')
      .eq('id', session.user.id)
      .single()

    if (merchant) {
      setMerchantId(merchant.id)
      setRestaurant(merchant.restaurants?.[0])
      fetchMenuItems(merchant.restaurants?.[0]?.id)
      startPolling(merchant.restaurants?.[0]?.id)
    }
  }

  async function fetchMenuItems(restId: string) {
    if (!restId) return
    const { data } = await supabase
      .from('menu_items')
      .select('*, menu_categories(name)')
      .eq('restaurant_id', restId)
      .order('menu_categories(sort_order)')
    setMenuItems(data || [])
  }

  function startPolling(restId: string) {
    if (!restId) return
    pollOrders(restId)
    pollRef.current = setInterval(() => pollOrders(restId), 5000)
  }

  async function pollOrders(restId: string) {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', restId)
      .in('status', ['pending', 'accepted', 'waiting_payment', 'paid'])
      .order('created_at', { ascending: false })

    if (!data) return

    const prevPendingIds = orders.filter(o => o.status === 'pending').map((o: any) => o.id)
    const newPending = data.filter(o => o.status === 'pending' && !prevPendingIds.includes(o.id))

    setOrders(data)

    // Trigger new order alert
    if (newPending.length > 0 && screen === 'main') {
      setCurrentOrderId(newPending[0].id)
      setScreen('neworder')
      playSound('new')
    }
  }

  function playSound(type: 'new' | 'reject' | 'paid') {
    // Create simple beep sounds using Web Audio API
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const ctx = audioCtx.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = type === 'new' ? 880 : type === 'reject' ? 220 : 1100
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  const currentOrder = orders.find(o => o.id === currentOrderId)
  const pendingOrders = orders.filter(o => o.status === 'pending')
  const acceptedOrders = orders.filter(o => ['accepted','waiting_payment','paid'].includes(o.status))

  async function acceptOrder() {
    if (!currentOrder) return
    setAcceptOpen(false)
    setScreen('paying')
    
    const res = await fetch(`/api/orders/${currentOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', estimatedWaitMins: selectedWait }),
    })
    
    setCountdown(10) // 10s for demo, 120s in prod
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          simulatePayment()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function simulatePayment() {
    setScreen('paid')
    playSound('paid')
    // In production, this triggers when SumUp webhook fires
  }

  async function rejectOrder() {
    if (!currentOrder) return
    setRejectOpen(false)
    const reason = selectedReason || customReason || 'No reason given'
    await fetch(`/api/orders/${currentOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
    })
    playSound('reject')
    setScreen('main')
    setCurrentOrderId(null)
  }

  async function toggleMenuItem(id: string, current: boolean) {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id)
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, is_available: !current } : i))
  }

  const filteredItems = menuItems.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.menu_categories?.name?.toLowerCase().includes(itemSearch.toLowerCase()))

  // Render
  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', position: 'relative' }}>

      {/* TOP BAR */}
      <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', position: 'relative', zIndex: 20 }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '16px', fontWeight: 700, color: '#22c55e', marginRight: '4px' }}>
          feed<span style={{ color: '#f8fafc' }}>me</span>.gg
        </div>

        {/* Delivery time */}
        <button onClick={() => setTimeModal('delivery')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '6px 14px', cursor: 'pointer', minWidth: '80px' }}>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🚗 Delivery</span>
          <span style={{ fontSize: '17px', fontWeight: 600, color: '#f97316' }}>{delivTime} mins</span>
        </button>

        {/* Pickup time */}
        <button onClick={() => setTimeModal('pickup')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '6px 14px', cursor: 'pointer', minWidth: '80px' }}>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🚶 Pickup</span>
          <span style={{ fontSize: '17px', fontWeight: 600, color: '#f97316' }}>{pickTime} mins</span>
        </button>

        {/* Toggles */}
        {(['preorders','delivery','pickups','sync'] as const).map(key => (
          <div key={key} onClick={() => setToggles(t => ({ ...t, [key]: !t[key] }))} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: toggles[key] ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `0.5px solid ${toggles[key] ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', padding: '5px 9px', fontSize: '10px', color: toggles[key] ? '#22c55e' : '#ef4444', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {key === 'sync' ? 'food.gg' : key.charAt(0).toUpperCase() + key.slice(1)}
            <div style={{ width: '28px', height: '15px', borderRadius: '8px', background: toggles[key] ? '#22c55e' : '#334155', position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '2px', left: toggles[key] ? '15px' : '2px', width: '11px', height: '11px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#22c55e', marginLeft: 'auto' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', animation: 'blink 2s infinite' }} />Live
        </div>

        {/* Cog */}
        <button onClick={() => setCogOpen(!cogOpen)} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>⚙</button>

        {/* Cog menu */}
        {cogOpen && (
          <div style={{ position: 'absolute', top: '52px', right: '10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '8px', zIndex: 50, width: '200px' }}>
            {[
              { icon: '📋', label: 'Menu Items', sub: 'Enable / disable items', screen: 'items' },
              { icon: '🖨️', label: 'Printer Settings', sub: 'Test, check, configure', screen: 'printer' },
              { icon: '📊', label: 'End of Day', sub: 'Report & reset orders', screen: 'eod' },
              { icon: '📁', label: 'Order History', sub: 'Search past orders', screen: 'history' },
            ].map(btn => (
              <button key={btn.screen} onClick={() => { setScreen(btn.screen as any); setCogOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', color: '#f8fafc', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{btn.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{btn.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{btn.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {(['incoming', 'accepted'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '11px', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: tab === t ? '#22c55e' : '#94a3b8', border: 'none', background: 'none', borderBottom: `2px solid ${tab === t ? '#22c55e' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
            {t === 'incoming' ? 'Orders Incoming' : 'Orders Accepted'}
            {t === 'incoming' && pendingOrders.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ef4444', color: 'white', fontSize: '9px', fontWeight: 600, width: '16px', height: '16px', borderRadius: '50%', marginLeft: '5px', verticalAlign: 'middle' }}>
                {pendingOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
        {tab === 'incoming' ? (
          pendingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#475569' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.3 }}>📭</div>
              <div style={{ fontSize: '13px' }}>No pending orders</div>
              <div style={{ fontSize: '11px', marginTop: '4px', color: '#334155' }}>Orders will appear here automatically</div>
            </div>
          ) : (
            pendingOrders.map(o => (
              <div key={o.id} onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ background: '#0f172a', borderLeft: `3px solid ${o.scheduled_for ? '#3b82f6' : '#22c55e'}`, border: `1px solid rgba(255,255,255,0.07)`, borderRadius: '10px', padding: '12px', marginBottom: '8px', cursor: 'pointer', animation: o.scheduled_for ? 'pulse-blue 1.5s infinite' : 'pulse-green 1.5s infinite' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{o.order_number}</div>
                  <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: o.scheduled_for ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)', color: o.scheduled_for ? '#3b82f6' : '#22c55e' }}>
                    {o.scheduled_for ? `Pre-order ${new Date(o.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live order'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>{o.customer_name} · {o.order_type === 'delivery' ? '🚗 Delivery' : '🚶 Collection'} · {o.payment_method}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '7px' }}>{o.order_items?.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>£{o.total?.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>Tap to open →</div>
                </div>
              </div>
            ))
          )
        ) : (
          acceptedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#475569' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.3 }}>✅</div>
              <div style={{ fontSize: '13px' }}>No accepted orders today</div>
            </div>
          ) : (
            acceptedOrders.map(o => (
              <div key={o.id} style={{ background: '#0f172a', borderLeft: `3px solid ${o.status === 'paid' ? '#22c55e' : '#f97316'}`, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{o.order_number}</div>
                  <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: o.status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)', color: o.status === 'paid' ? '#22c55e' : '#f97316' }}>
                    {o.status === 'paid' ? '✓ Paid' : 'Waiting payment...'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>{o.customer_name} · {o.order_type === 'delivery' ? '🚗 Delivery' : '🚶 Collection'}{o.estimated_wait_mins ? ` · Est. ${o.estimated_wait_mins} mins` : ''}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '7px' }}>{o.order_items?.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>£{o.total?.toFixed(2)}</div>
                  {o.status === 'paid' && <span style={{ fontSize: '10px', color: '#22c55e' }}>🖨 3 tickets printed</span>}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* NEW ORDER SCREEN */}
      {screen === 'neworder' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', zIndex: 10 }}>
          <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px', marginBottom: '20px', animation: 'bounce-in 0.5s, rp 1s infinite' }}>🔔</div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '30px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>NEW ORDER!</div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px' }}>
            {currentOrder ? `${currentOrder.customer_name} · £${currentOrder.total?.toFixed(2)}` : 'Tap to view'}
          </div>
          <button onClick={() => setScreen('detail')} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: '16px 44px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', animation: 'bounce-anim 1s infinite' }}>
            View Order →
          </button>
        </div>
      )}

      {/* ORDER DETAIL */}
      {screen === 'detail' && currentOrder && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', zIndex: 9 }}>
          <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setScreen('main')} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>← Back</button>
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>Order {currentOrder.order_number}</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            <div style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '5px' }}>{currentOrder.customer_name}</div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.8 }}>
                {currentOrder.customer_phone}<br />
                {currentOrder.order_type === 'delivery' ? `🚗 ${currentOrder.delivery_address}` : '🚶 Collection — no address needed'}
                {currentOrder.delivery_what3words && <><br /><span style={{ color: '#ef4444', fontWeight: 600 }}>/// {currentOrder.delivery_what3words}</span></>}
                <br />💳 {currentOrder.payment_method}
                {currentOrder.scheduled_for && <><br />🕐 Slot: {new Date(currentOrder.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', fontWeight: 600 }}>
              Items — uncheck to remove unavailable
            </div>

            {currentOrder.order_items?.map((item: any, idx: number) => (
              <div key={item.id} style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: '1.5px solid #22c55e', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', color: '#22c55e', cursor: 'pointer' }}>✓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc' }}>{item.quantity}× {item.name}</div>
                  {item.special_instructions && <div style={{ fontSize: '11px', color: '#f97316', fontStyle: 'italic', marginTop: '2px' }}>&quot;{item.special_instructions}&quot;</div>}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>£{item.subtotal?.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#060b18', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '3px' }}><span>Subtotal</span><span>£{currentOrder.subtotal?.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}><span>Delivery</span><span>{currentOrder.order_type === 'delivery' ? `£${currentOrder.delivery_fee?.toFixed(2)}` : 'Free'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}><span>Total</span><span style={{ color: '#22c55e' }}>£{currentOrder.total?.toFixed(2)}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
              <button onClick={() => setAcceptOpen(true)} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>✓ Accept Order</button>
              <button onClick={() => setRejectOpen(true)} style={{ background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '14px', borderRadius: '10px', fontSize: '15px', cursor: 'pointer' }}>✗ Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* WAITING FOR PAYMENT */}
      {screen === 'paying' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', zIndex: 10 }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f97316', marginBottom: '6px' }}>Waiting for Payment</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Payment link sent to {currentOrder?.customer_name}</div>
          <div style={{ fontSize: '56px', fontWeight: 700, color: '#f97316', marginBottom: '8px' }}>{countdown}</div>
          <div style={{ width: '180px', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ height: '100%', background: '#f97316', borderRadius: '3px', width: `${(countdown / 120) * 100}%`, transition: 'width 1s linear' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#334155' }}>Customer has 2 minutes to pay · Auto-cancels if not paid</div>
        </div>
      )}

      {/* PAYMENT CONFIRMED */}
      {screen === 'paid' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', zIndex: 10 }}>
          <div style={{ fontSize: '56px', marginBottom: '16px', animation: 'bounce-in 0.4s' }}>✅</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e', marginBottom: '6px' }}>Payment Confirmed!</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>£{currentOrder?.total?.toFixed(2)} received · Printing 3 tickets now...</div>
          <div style={{ background: '#0f172a', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', textAlign: 'left', width: '100%', maxWidth: '280px' }}>
            <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Printing</div>
            <PrintRow label="Kitchen ticket" delay={800} />
            <PrintRow label="Restaurant ticket" delay={1600} />
            <PrintRow label="Customer ticket" delay={2400} onDone={() => {}} />
          </div>
          <button
            onClick={() => { setScreen('main'); setCurrentOrderId(null); setTab('accepted') }}
            style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: '12px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}
          >
            Back to orders
          </button>
        </div>
      )}

      {/* MENU ITEMS */}
      {screen === 'items' && (
        <FullScreen title="Menu Items" onBack={() => setScreen('main')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
            <span style={{ color: '#475569' }}>🔍</span>
            <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items by name or category..." style={{ flex: 1, background: 'none', border: 'none', color: '#f8fafc', fontSize: '13px', outline: 'none' }} />
          </div>
          {filteredItems.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc' }}>{item.name}</div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>{item.menu_categories?.name}{!item.is_available && ' · Unavailable'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>£{item.price?.toFixed(2)}</span>
                <div onClick={() => toggleMenuItem(item.id, item.is_available)} style={{ width: '30px', height: '16px', borderRadius: '8px', background: item.is_available ? '#22c55e' : '#334155', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '2px', left: item.is_available ? '16px' : '2px', width: '12px', height: '12px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                </div>
              </div>
            </div>
          ))}
        </FullScreen>
      )}

      {/* PRINTER */}
      {screen === 'printer' && (
        <FullScreen title="Printer Settings" onBack={() => setScreen('main')}>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '12px', color: '#94a3b8' }}>
            🖨 <strong style={{ color: '#f8fafc' }}>Epson TM-T20III</strong> — Connected ✓<br />
            <span style={{ fontSize: '10px', color: '#475569' }}>USB · Paper OK · Last test: Today</span>
          </div>
          {['🖨 Print test tickets', '🔌 Check connection', '📄 Edit kitchen ticket', '📄 Edit restaurant ticket', '📄 Edit customer ticket'].map(btn => (
            <button key={btn} onClick={() => alert(`${btn} — coming in production`)} style={{ width: '100%', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.08)', color: '#f8fafc', padding: '13px 14px', borderRadius: '8px', fontSize: '13px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {btn}
            </button>
          ))}
        </FullScreen>
      )}

      {/* EOD */}
      {screen === 'eod' && (
        <FullScreen title="End of Day Report" onBack={() => setScreen('main')}>
          <EODReport orders={orders} onClear={() => { setArchivedOrders(prev => [...prev, ...orders.filter(o => o.status === 'paid' || o.status === 'cancelled')]); setOrders(prev => prev.filter(o => o.status === 'pending')); setScreen('main'); }} />
        </FullScreen>
      )}

      {/* HISTORY */}
      {screen === 'history' && (
        <FullScreen title="Order History" onBack={() => setScreen('main')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px' }}>
            <span style={{ color: '#475569' }}>🔍</span>
            <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search by order ID, customer..." style={{ flex: 1, background: 'none', border: 'none', color: '#f8fafc', fontSize: '13px', outline: 'none' }} />
          </div>
          {[...archivedOrders, ...orders.filter(o => ['paid','cancelled'].includes(o.status))].filter(o => !historySearch || o.order_number?.includes(historySearch) || o.customer_name?.toLowerCase().includes(historySearch.toLowerCase())).map(o => (
            <div key={o.id || o.order_number} style={{ background: '#060b18', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{o.order_number}</div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>{o.customer_name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>£{o.total?.toFixed(2)}</div>
                <span style={{ fontSize: '10px', color: o.status === 'paid' ? '#22c55e' : '#ef4444' }}>{o.status}</span>
              </div>
            </div>
          ))}
        </FullScreen>
      )}

      {/* ACCEPT MODAL */}
      {acceptOpen && (
        <Modal onClose={() => setAcceptOpen(false)}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>How long will this take?</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '14px' }}>
            {[15,20,25,30,45,60].map(t => (
              <button key={t} onClick={() => setSelectedWait(t)} style={{ background: selectedWait === t ? 'rgba(34,197,94,0.08)' : '#0f172a', border: `1.5px solid ${selectedWait === t ? '#22c55e' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', color: selectedWait === t ? '#22c55e' : '#94a3b8' }}>
                {t} min
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '7px' }}>
            <button onClick={() => setAcceptOpen(false)} style={{ flex: 1, background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.1)', color: '#64748b', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
            <button onClick={acceptOrder} style={{ flex: 2, background: '#22c55e', color: '#0a0f1e', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Accept & Send Payment Link</button>
          </div>
        </Modal>
      )}

      {/* REJECT MODAL */}
      {rejectOpen && (
        <Modal onClose={() => setRejectOpen(false)}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>Reason for rejection</h3>
          {['Out of stock','Too busy right now','Outside delivery zone','Closing soon'].map(r => (
            <button key={r} onClick={() => setSelectedReason(r)} style={{ width: '100%', background: '#0f172a', border: `0.5px solid ${selectedReason === r ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: selectedReason === r ? '#ef4444' : '#94a3b8', textAlign: 'left', cursor: 'pointer', marginBottom: '5px', transition: 'all 0.15s' }}>
              {r}
            </button>
          ))}
          <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Or type a custom reason..." style={{ width: '100%', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '9px 11px', fontSize: '12px', color: '#f8fafc', marginBottom: '10px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} rows={2} />
          <div style={{ display: 'flex', gap: '7px' }}>
            <button onClick={() => setRejectOpen(false)} style={{ flex: 1, background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.1)', color: '#64748b', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
            <button onClick={rejectOrder} style={{ flex: 2, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Confirm Rejection</button>
          </div>
        </Modal>
      )}

      {/* TIME MODAL */}
      {timeModal && (
        <Modal onClose={() => setTimeModal(null)}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>
            Adjust {timeModal === 'delivery' ? 'delivery' : 'pickup'} time
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '14px' }}>
            {[10,15,20,25,30,45,60,90].map(t => (
              <button key={t} onClick={() => { if (timeModal === 'delivery') setDelivTime(t); else setPickTime(t); setTimeModal(null) }} style={{ background: (timeModal === 'delivery' ? delivTime : pickTime) === t ? 'rgba(34,197,94,0.08)' : '#0f172a', border: `1.5px solid ${(timeModal === 'delivery' ? delivTime : pickTime) === t ? '#22c55e' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', color: (timeModal === 'delivery' ? delivTime : pickTime) === t ? '#22c55e' : '#94a3b8' }}>
                {t} min
              </button>
            ))}
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes rp { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
        @keyframes bounce-anim { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bounce-in { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes pulse-green { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 0 4px rgba(34,197,94,0.12)} }
        @keyframes pulse-blue { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 0 4px rgba(59,130,246,0.12)} }
      `}</style>
    </div>
  )
}

function FullScreen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onBack} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>← Back</button>
        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{title}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>{children}</div>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 20 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#1e293b', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '320px' }}>
        {children}
      </div>
    </div>
  )
}

function PrintRow({ label, delay, onDone }: { label: string; delay: number; onDone?: () => void }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => { setDone(true); onDone?.() }, delay)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{ fontSize: '12px', color: done ? '#22c55e' : '#64748b', marginBottom: '6px', transition: 'color 0.3s' }}>
      {done ? '✓' : '🖨'} {label}{done ? ' printed' : '...'}
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
      <div style={{ fontSize: '12px', color: '#475569', marginBottom: '14px' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px', width: '100%', maxWidth: '300px' }}>
        {[['Card sales', `£${card.toFixed(2)}`, '#22c55e'], ['Cash sales', `£${cash.toFixed(2)}`, '#f97316'], ['Total orders', String(paid.length + cancelled.length), '#f8fafc'], ['Cancelled', String(cancelled.length), '#ef4444'], ['Total revenue', `£${(card + cash).toFixed(2)}`, '#22c55e']].map(([label, val, color], i, arr) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: i === arr.length - 1 ? '15px' : '13px', fontWeight: i === arr.length - 1 ? 700 : 400, color: '#64748b', padding: '5px 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', borderTop: i === arr.length - 1 ? '0.5px solid rgba(255,255,255,0.08)' : 'none', marginTop: i === arr.length - 1 ? '4px' : 0 }}>
            <span>{label}</span><span style={{ color }}>{val}</span>
          </div>
        ))}
      </div>
      <button onClick={() => alert('End of day report printed!')} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>🖨 Print Report</button>
      <button onClick={() => { if (confirm('This will archive today\'s orders and clear the Accepted tab. All records are saved in Order History. Continue?')) onClear() }} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', padding: '10px 28px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
        ✓ Perform End of Day & Clear Orders
      </button>
      <div style={{ fontSize: '10px', color: '#334155', marginTop: '10px', textAlign: 'center' }}>All records kept in Order History</div>
    </div>
  )
}
