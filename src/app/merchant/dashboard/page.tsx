'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function MerchantDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [merchant, setMerchant] = useState<any>(null)
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [tab, setTab] = useState<'dashboard'|'restaurants'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Dashboard tab state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [orders, setOrders] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 })
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Settings modal
  const [editingRestaurant, setEditingRestaurant] = useState<any>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [showZones, setShowZones] = useState<string|null>(null)
  const [showHours, setShowHours] = useState<string|null>(null)
  const [zones, setZones] = useState<any[]>([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [restaurantHours, setRestaurantHours] = useState<any[]>([])

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  const PARISHES = ['Castel','Forest','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/merchant/login'); return }
    let { data: merch } = await supabase.from('merchants').select('*').eq('auth_id', user.id).maybeSingle()
    if (!merch) {
      const res2 = await supabase.from('merchants').select('*').ilike('email', user.email || '').maybeSingle()
      merch = res2.data
      if (merch) await supabase.from('merchants').update({ auth_id: user.id }).eq('id', merch.id)
    }
    if (!merch) { router.push('/merchant/login'); return }
    setMerchant(merch)
    const { data: rests } = await supabase.from('restaurants').select('*').eq('merchant_id', merch.id).order('name')
    setRestaurants(rests || [])
    await fetchOrdersForDate(new Date().toISOString().split('T')[0], merch.id)
    setLoading(false)
  }

  async function fetchOrdersForDate(date: string, merchantId?: string) {
    const mid = merchantId || merchant?.id
    if (!mid) return
    const start = date + 'T00:00:00.000Z'
    const end = date + 'T23:59:59.999Z'
    const { data: rests } = await supabase.from('restaurants').select('id').eq('merchant_id', mid)
    const restIds = (rests || []).map((r: any) => r.id)
    if (restIds.length === 0) { setOrders([]); return }
    const { data } = await supabase.from('orders').select('*, restaurants(name, emoji, logo_url), order_items(*, menu_items(name, price))').in('restaurant_id', restIds).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false })
    setOrders(data || [])
    const today = new Date().toISOString().split('T')[0]
    if (date === today) {
      const completed = (data || []).filter((o: any) => ['paid','completed'].includes(o.status))
      setTodayStats({ count: data?.length || 0, revenue: completed.reduce((s: number, o: any) => s + (o.total || 0), 0) })
    }
  }

  async function toggleOpen(restId: string, current: boolean) {
    await supabase.from('restaurants').update({ is_open: !current }).eq('id', restId)
    setRestaurants(prev => prev.map(r => r.id === restId ? { ...r, is_open: !current } : r))
  }

  async function uploadLogo(restId: string, file: File) {
    const ext = file.name.split('.').pop()
    const path = `${restId}.${ext}`
    await supabase.storage.from('restaurant-logos').upload(path, file, { upsert: true })
    const { data: urlData } = supabase.storage.from('restaurant-logos').getPublicUrl(path)
    await supabase.from('restaurants').update({ logo_url: urlData.publicUrl }).eq('id', restId)
    setRestaurants(prev => prev.map(r => r.id === restId ? { ...r, logo_url: urlData.publicUrl } : r))
    setMsg('Logo uploaded!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function fetchHours(restId: string) {
    const { data } = await supabase.from('restaurant_hours').select('*').eq('restaurant_id', restId)
    const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    const merged = DAYS.map(d => {
      const saved = data?.find((h: any) => h.day === d)
      return saved || { day: d, open_time: '12:00', close_time: '21:30', is_closed: false, restaurant_id: restId }
    })
    setRestaurantHours(merged)
  }

  async function saveHours(restId: string) {
    await supabase.from('restaurant_hours').delete().eq('restaurant_id', restId)
    const toInsert = restaurantHours.map(h => ({
      restaurant_id: restId, day: h.day, open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed || false,
    }))
    await supabase.from('restaurant_hours').insert(toInsert)
    setShowHours(null)
    setMsg('Opening hours saved!'); setTimeout(() => setMsg(''), 3000)
  }

  async function fetchZones(restId: string) {
    setZonesLoading(true)
    const { data } = await supabase.from('delivery_zones').select('*').eq('restaurant_id', restId).order('parish')
    // Always show all 10 parishes merged with saved data
    const merged = PARISHES.map(p => {
      const saved = (data || []).find((z: any) => z.parish === p || z.name === p)
      return saved || { parish: p, name: p, fee: 2.50, min_order: 10, is_active: true, restaurant_id: restId, id: null }
    })
    // Insert any missing parishes
    const missing = merged.filter((z: any) => !z.id)
    if (missing.length > 0) {
      const { data: newZones } = await supabase.from('delivery_zones').insert(
        missing.map((z: any) => ({ restaurant_id: restId, parish: z.parish, name: z.name, fee: z.fee, min_order: z.min_order, is_active: z.is_active }))
      ).select()
      const allZones = [...(data || []), ...(newZones || [])]
      setZones(PARISHES.map(p => allZones.find((z: any) => z.parish === p || z.name === p) || { parish: p, name: p, fee: 2.50, min_order: 10, is_active: true, restaurant_id: restId }))
    } else {
      setZones(merged)
    }
    setZonesLoading(false)
  }

  async function updateZone(zoneId: string | null, field: string, value: any, zone: any) {
    if (!zoneId) {
      // Zone doesn't exist yet - create it first
      const { data } = await supabase.from('delivery_zones').insert({
        restaurant_id: zone.restaurant_id,
        parish: zone.parish,
        name: zone.name,
        fee: field === 'fee' ? value : zone.fee,
        min_order: field === 'min_order' ? value : zone.min_order,
        is_active: field === 'is_active' ? value : zone.is_active,
      }).select().single()
      if (data) setZones(prev => prev.map(z => z.parish === zone.parish ? { ...z, ...data } : z))
      return
    }
    await supabase.from('delivery_zones').update({ [field]: value }).eq('id', zoneId)
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, [field]: value } : z))
  }

  async function saveSettings() {
    if (!editingRestaurant) return
    setSavingSettings(true)
    await supabase.from('restaurants').update({
      name: editingRestaurant.name,
      description: editingRestaurant.description,
      cuisine_type: editingRestaurant.cuisine_type,
      parish: editingRestaurant.parish,
      postcode: editingRestaurant.postcode,
      min_order: parseFloat(editingRestaurant.min_order) || 10,
      delivery_fee: parseFloat(editingRestaurant.delivery_fee) || 2.50,
      delivery_time_mins: parseInt(editingRestaurant.delivery_time_mins) || 45,
      pickup_time_mins: parseInt(editingRestaurant.pickup_time_mins) || 20,
      opening_time: editingRestaurant.opening_time || null,
      closing_time: editingRestaurant.closing_time || null,
      accepts_delivery: editingRestaurant.accepts_delivery,
      accepts_pickup: editingRestaurant.accepts_pickup,
      custom_message: editingRestaurant.custom_message,
      printer_ip: editingRestaurant.printer_ip || null,
      printer_width: editingRestaurant.printer_width || 80,
    }).eq('id', editingRestaurant.id)

    setRestaurants(prev => prev.map(r => r.id === editingRestaurant.id ? { ...r, ...editingRestaurant } : r))
    setEditingRestaurant(null)
    setSavingSettings(false)
    setMsg('Settings saved!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function changePassword() {
    if (!newPassword) { setPwMsg('Please enter a new password'); return }
    if (newPassword !== confirmPassword) { setPwMsg('Passwords do not match'); return }
    if (newPassword.length < 6) { setPwMsg('Password must be at least 6 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwMsg('Error: ' + error.message); return }
    setPwMsg('Password updated!')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => { setPwMsg(''); setShowPasswordModal(false) }, 2000)
  }

  const inputStyle: any = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  if (loading) return <div style={{ background: '#080c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
            <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me.gg</span>
          </Link>
          <span style={{ fontSize: '13px', color: '#64748b' }}>{merchant?.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowPasswordModal(true)} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Password</button>
          <Link href="/merchant/terminal" style={{ padding: '7px 14px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>Terminal</Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/merchant/login') }} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 20px' }}>

        {msg && <div style={{ marginBottom: '16px', padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{msg}</div>}

        {/* TABS */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
          {(['dashboard','restaurants'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', background: tab === t ? '#22c55e' : 'transparent', color: tab === t ? '#080c14' : '#64748b', textTransform: 'capitalize' }}>
              {t === 'dashboard' ? 'Dashboard' : 'Restaurants'}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Today's Orders</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e' }}>{todayStats.count}</div>
              </div>
              <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Today's Revenue</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e' }}>GBP{todayStats.revenue.toFixed(2)}</div>
              </div>
            </div>

            {/* Date picker */}
            <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Orders for</div>
                <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); fetchOrdersForDate(e.target.value) }}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
              </div>

              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#475569' }}>No orders for this date</div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {orders.map(order => (
                    <div key={order.id} onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${selectedOrder?.id === order.id ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '14px 16px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selectedOrder?.id === order.id ? '12px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700 }}>Order #{String(order.id).slice(-6).toUpperCase()}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} &bull; {order.customer_name} &bull; {order.order_type}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, background: order.status === 'completed' || order.status === 'paid' ? 'rgba(34,197,94,0.15)' : order.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: order.status === 'completed' || order.status === 'paid' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : '#f97316' }}>{order.status}</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</span>
                        </div>
                      </div>

                      {selectedOrder?.id === order.id && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '12px', userSelect: 'text' }}>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>ORDER DETAILS</div>
                          {order.order_items?.map((oi: any) => (
                            <div key={oi.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                              <span>{oi.quantity}x {oi.menu_items?.name || oi.item_name}</span>
                              <span style={{ color: '#94a3b8' }}>GBP{((oi.menu_items?.price || oi.unit_price || 0) * oi.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '8px', paddingTop: '8px' }}>
                            {order.delivery_address && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Address: {order.delivery_address}</div>}
                            {order.customer_phone && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Phone: {order.customer_phone}</div>}
                            {order.notes && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Notes: {order.notes}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>
                              <span>Total</span>
                              <span style={{ color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESTAURANTS TAB */}
        {tab === 'restaurants' && (
          <div style={{ display: 'grid', gap: '14px' }}>
            {restaurants.map(r => (
              <div key={r.id} style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Logo */}
                  <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {r.logo_url ? <img src={r.logo_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px' }}>{r.emoji}</span>}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>{r.name.replace(/&amp;/g, '&')}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{r.cuisine_type} &bull; {r.parish} &bull; /{r.slug}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
                      {/* Open toggle */}
                      <button onClick={() => toggleOpen(r.id, r.is_open)} style={{ fontSize: '12px', padding: '4px 12px', background: r.is_open ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: r.is_open ? '#22c55e' : '#ef4444', border: `1px solid ${r.is_open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                        {r.is_open ? 'Open' : 'Closed'}
                      </button>
                      {/* Card payments - read only */}
                      {r.accepts_card && <span style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px' }}>Card payments on</span>}
                      {/* Logo upload */}
                      <label style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>
                        Logo
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) uploadLogo(r.id, e.target.files[0]) }} />
                      </label>
                      {/* Settings */}
                      <button onClick={() => setEditingRestaurant({ ...r, min_order: r.min_order?.toString(), delivery_fee: r.delivery_fee?.toString(), delivery_time_mins: r.delivery_time_mins?.toString(), pickup_time_mins: r.pickup_time_mins?.toString() })} style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>Settings</button>
                      {/* Hours */}
                      <button onClick={() => { setShowHours(r.id); fetchHours(r.id) }} style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>Hours</button>
                      {/* Zones */}
                      <button onClick={() => { setShowZones(r.id); fetchZones(r.id) }} style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>Zones</button>
                      {/* Menu */}
                      <Link href={`/merchant/dashboard/menu/${r.id}`} style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Menu</Link>
                      {/* Tickets */}
                      <Link href={`/merchant/dashboard/tickets/${r.id}`} style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', textDecoration: 'none' }}>Tickets</Link>
                      {/* Slots */}
                      <Link href={`/merchant/dashboard/slots/${r.id}`} style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', textDecoration: 'none' }}>Slots</Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SETTINGS MODAL */}
      {editingRestaurant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setEditingRestaurant(null) }}>
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Restaurant Settings</h3>
              <button onClick={() => setEditingRestaurant(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f1f5f9', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Restaurant Name</label><input value={editingRestaurant.name} onChange={e => setEditingRestaurant({...editingRestaurant, name: e.target.value})} style={inputStyle} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Description</label><textarea value={editingRestaurant.description || ''} onChange={e => setEditingRestaurant({...editingRestaurant, description: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'none' }} /></div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Cuisine</label><input value={editingRestaurant.cuisine_type || ''} onChange={e => setEditingRestaurant({...editingRestaurant, cuisine_type: e.target.value})} style={inputStyle} /></div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Parish</label>
                <select value={editingRestaurant.parish || ''} onChange={e => setEditingRestaurant({...editingRestaurant, parish: e.target.value})} style={{ ...inputStyle, appearance: 'none' }}>
                  {PARISHES.map(p => <option key={p} value={p} style={{ background: '#0d1321' }}>{p}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Min Order GBP</label><input type="number" value={editingRestaurant.min_order} onChange={e => setEditingRestaurant({...editingRestaurant, min_order: e.target.value})} style={inputStyle} /></div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Delivery Fee GBP</label><input type="number" step="0.01" value={editingRestaurant.delivery_fee} onChange={e => setEditingRestaurant({...editingRestaurant, delivery_fee: e.target.value})} style={inputStyle} /></div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Delivery Mins</label><input type="number" value={editingRestaurant.delivery_time_mins} onChange={e => setEditingRestaurant({...editingRestaurant, delivery_time_mins: e.target.value})} style={inputStyle} /></div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Pickup Mins</label><input type="number" value={editingRestaurant.pickup_time_mins} onChange={e => setEditingRestaurant({...editingRestaurant, pickup_time_mins: e.target.value})} style={inputStyle} /></div>

              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Custom Message to Customers</label><input value={editingRestaurant.custom_message || ''} onChange={e => setEditingRestaurant({...editingRestaurant, custom_message: e.target.value})} style={inputStyle} /></div>


              <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>🖨️ Printer Settings</div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Printer IP Address</label>
                  <input 
                    value={editingRestaurant.printer_ip || ''} 
                    onChange={e => setEditingRestaurant({...editingRestaurant, printer_ip: e.target.value})} 
                    placeholder="e.g. 192.168.1.100"
                    style={inputStyle} 
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                  Connect your thermal printer to the restaurant WiFi. Use Fing app to find the printer IP address.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="del" checked={editingRestaurant.accepts_delivery} onChange={e => setEditingRestaurant({...editingRestaurant, accepts_delivery: e.target.checked})} />
                <label htmlFor="del" style={{ fontSize: '13px', cursor: 'pointer' }}>Accepts Delivery</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="pick" checked={editingRestaurant.accepts_pickup} onChange={e => setEditingRestaurant({...editingRestaurant, accepts_pickup: e.target.checked})} />
                <label htmlFor="pick" style={{ fontSize: '13px', cursor: 'pointer' }}>Accepts Pickup</label>
              </div>
            </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexShrink: 0 }}>
              <button onClick={saveSettings} disabled={savingSettings} style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
              <button onClick={() => setEditingRestaurant(null)} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* HOURS MODAL */}
      {showHours && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowHours(null) }}>
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Opening Hours</h3>
              <button onClick={() => setShowHours(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f1f5f9', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 60px', gap: '8px', fontSize: '11px', color: '#64748b', padding: '0 4px' }}>
                <span>Day</span><span>Opens</span><span>Closes</span><span>Closed</span>
              </div>
              {restaurantHours.map((h, i) => (
                <div key={h.day} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 60px', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{h.day}</span>
                  <input type="time" value={h.open_time} onChange={e => setRestaurantHours(prev => prev.map((r, idx) => idx === i ? { ...r, open_time: e.target.value } : r))}
                    disabled={h.is_closed}
                    style={{ padding: '6px 8px', background: h.is_closed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: h.is_closed ? '#334155' : '#f1f5f9', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' as any }} />
                  <input type="time" value={h.close_time} onChange={e => setRestaurantHours(prev => prev.map((r, idx) => idx === i ? { ...r, close_time: e.target.value } : r))}
                    disabled={h.is_closed}
                    style={{ padding: '6px 8px', background: h.is_closed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: h.is_closed ? '#334155' : '#f1f5f9', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' as any }} />
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input type="checkbox" checked={h.is_closed} onChange={e => setRestaurantHours(prev => prev.map((r, idx) => idx === i ? { ...r, is_closed: e.target.checked } : r))} style={{ width: '16px', height: '16px' }} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => saveHours(showHours)} style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Save Hours</button>
          </div>
        </div>
      )}

      {/* ZONES MODAL */}
      {showZones && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowZones(null) }}>
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Delivery Zones</h3>
              <button onClick={() => setShowZones(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f1f5f9', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Set delivery fee and minimum order per parish. Untick to disable delivery to that parish.</div>
            {zonesLoading ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading zones...</div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 36px', gap: '8px', fontSize: '11px', color: '#64748b', padding: '0 4px' }}>
                  <span>Parish</span><span>Fee GBP</span><span>Min Order</span><span>On</span>
                </div>
                {zones.map(zone => (
                  <div key={zone.parish} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 36px', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px' }}>{zone.parish}</span>
                    <input type="number" step="0.01" value={zone.fee ?? ''} onChange={e => updateZone(zone.id, 'fee', parseFloat(e.target.value) || 0, zone)}
                      style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f1f5f9', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' as any }} />
                    <input type="number" value={zone.min_order ?? ''} onChange={e => updateZone(zone.id, 'min_order', parseFloat(e.target.value) || 0, zone)}
                      style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f1f5f9', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' as any }} />
                    <input type="checkbox" checked={zone.is_active ?? true} onChange={e => updateZone(zone.id, 'is_active', e.target.checked, zone)} style={{ width: '16px', height: '16px' }} />
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowZones(null)} style={{ width: '100%', marginTop: '20px', padding: '12px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowPasswordModal(false) }}>
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f1f5f9', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} /></div>
              {pwMsg && <div style={{ padding: '10px 12px', background: pwMsg.includes('updated') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', border: `1px solid ${pwMsg.includes('updated') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', fontSize: '13px', color: pwMsg.includes('updated') ? '#22c55e' : '#fca5a5', fontWeight: 600 }}>{pwMsg}</div>}
              <button onClick={changePassword} style={{ padding: '12px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Update Password</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
