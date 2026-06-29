'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const PARISHES = ['Castel','Forest','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']

export default function CheckoutPage() {
  const router = useRouter()
  const supabase = createClient()
  const [dark, setDark] = useState(true)
  const [cartData, setCartData] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [deliveryZones, setDeliveryZones] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  const [restaurantHours, setRestaurantHours] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const [closedMessage, setClosedMessage] = useState('')

  const [hasPreviousOrder, setHasPreviousOrder] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    orderType: 'delivery',
    paymentMethod: 'card',
    addressMode: 'new',
    deliveryLat: null as number | null,
    deliveryLng: null as number | null,
    savedAddressId: '',
    addressLine1: '',
    addressLine2: '',
    parish: 'St Peter Port',
    postcode: '',
    locationDesc: '',
    note: '',
    contactless: false,
    // Pre-order
    isPreOrder: false,
    preOrderDate: '',
    preOrderTime: '',
  })

  // Generate available time slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
    const cartSaved = localStorage.getItem('feedme-cart')
    if (!cartSaved) { router.push('/'); return }
    const data = JSON.parse(cartSaved)
    setCartData(data)
    fetchRestaurant(data.restaurantId)
    fetchCustomer()
    // Prefill guest details from previous order
    const guestSaved = localStorage.getItem('feedme-guest')
    if (guestSaved) {
      try {
        const g = JSON.parse(guestSaved)
        setForm(f => ({
          ...f,
          name: f.name || g.name || '',
          phone: f.phone || g.phone || '',
          email: f.email || g.email || '',
        }))
      } catch (e) {}
    }
    // Auto-select pre-order if coming from timeout/rejected page
    const params = new URLSearchParams(window.location.search)
    if (params.get('preorder') === 'true') {
      setForm(f => ({...f, isPreOrder: true}))
    }
  }, [])

  useEffect(() => {
    if (form.isPreOrder && restaurant) generateSlots()
  }, [form.isPreOrder, form.preOrderDate, form.orderType, restaurant])

  async function generateSlots() {
    if (!restaurant) return
    const slots: string[] = []
    const slotDuration = form.orderType === 'delivery'
      ? (restaurant?.delivery_slot_duration || 30)
      : (restaurant?.pickup_slot_duration || 30)
    const slotCapacity = form.orderType === 'delivery'
      ? (restaurant?.delivery_slot_capacity || 10)
      : (restaurant?.pickup_slot_capacity || 10)

    const now = new Date()
    const dateStr = new Date().toISOString().split('T')[0]

    // Compare dates properly
    const todayStr = now.toISOString().split('T')[0]
    const isToday = dateStr === todayStr

    // Find today's opening hours
    const dayName = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    const dayHours = restaurantHours.find(h => h.day === dayName)

    // Default open/close times
    let openH = 10, openM = 0
    let closeH = 22, closeM = 0

    if (dayHours && !dayHours.is_closed) {
      const [oh, om] = dayHours.open_time.split(':').map(Number)
      const [ch, cm] = dayHours.close_time.split(':').map(Number)
      openH = oh; openM = om
      closeH = ch; closeM = cm
    }

    let startH = openH
    let startM = openM

    if (isToday) {
      // Start from 30 mins from now minimum
      const minTime = new Date(now.getTime() + 30 * 60000)
      const minH = minTime.getHours()
      const minM = Math.ceil(minTime.getMinutes() / slotDuration) * slotDuration

      if (minH > startH || (minH === startH && minM > startM)) {
        startH = minH
        startM = minM >= 60 ? 0 : minM
        if (minM >= 60) startH += 1
      }
    }

    const closeMins = closeH * 60 + closeM

    // Get existing orders for today to check capacity
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('scheduled_for')
      .eq('restaurant_id', restaurant.id)
      .eq('order_type', form.orderType)
      .gte('scheduled_for', `${dateStr}T00:00:00`)
      .lte('scheduled_for', `${dateStr}T23:59:59`)
      .in('status', ['pending', 'accepted', 'waiting_payment', 'paid'])

    for (let h = startH; h <= closeH; h++) {
      const mStart = h === startH ? startM : 0
      for (let m = mStart; m < 60; m += slotDuration) {
        const slotStartMins = h * 60 + m
        const slotEndMins = slotStartMins + slotDuration

        if (slotEndMins > closeMins) break

        const endH = Math.floor(slotEndMins / 60)
        const endM = slotEndMins % 60
        const slotStart = `${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`
        const slotEnd = `${dateStr}T${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00`

        // Check capacity
        const ordersInSlot = (existingOrders || []).filter(o => o.scheduled_for >= slotStart && o.scheduled_for < slotEnd).length
        if (ordersInSlot >= slotCapacity) continue // Skip full slots

        const slot = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} - ${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
        slots.push(slot)
      }
    }

    setAvailableSlots(slots)
    if (slots.length > 0) setForm(f => ({...f, preOrderTime: f.preOrderTime && slots.includes(f.preOrderTime) ? f.preOrderTime : slots[0]}))
  }

  async function fetchCustomer() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAuthUserId(user.id)
    let { data: cust } = await supabase.from('customers').select('*').eq('auth_id', user.id).single()
    if (!cust) {
      const r2 = await supabase.from('customers').select('*').eq('id', user.id).single()
      cust = r2.data
    }
    if (cust) {
      setCustomer(cust)
      setForm(f => ({
        ...f,
        name: cust.name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || f.name,
        phone: cust.phone || f.phone,
        email: user.email || f.email,
      }))
      const { data: addrs } = await supabase.from('customer_addresses').select('*').eq('customer_id', cust.id).order('is_default', { ascending: false })
      if (addrs && addrs.length > 0) {
        setSavedAddresses(addrs)
        const def = addrs.find(a => a.is_default) || addrs[0]
        setForm(f => ({ ...f, addressMode: 'saved', savedAddressId: def.id, parish: def.parish || f.parish }))
      }
      // Check if customer has previous paid orders
      const { data: prevOrders } = await supabase.from('orders').select('id').eq('customer_email', user.email).eq('status', 'paid').limit(1)
      if (prevOrders && prevOrders.length > 0) setHasPreviousOrder(true)
    }
  }

  async function fetchRestaurant(id: string) {
    const { data } = await supabase.from('restaurants').select('*').eq('id', id).single()
    setRestaurant(data)
    const { data: zones } = await supabase.from('delivery_zones').select('*').eq('restaurant_id', id).eq('is_active', true)
    setDeliveryZones(zones || [])
    
    // Fetch and check opening hours
    const { data: hours } = await supabase.from('restaurant_hours').select('*').eq('restaurant_id', id)
    if (hours && hours.length > 0) {
      setRestaurantHours(hours)
      checkIfOpen(hours, data)
    }
  }

  function checkIfOpen(hours: any[], rest: any) {
    // Check if restaurant is marked as open
    if (rest?.is_open === false) {
      setIsOpen(false)
      setClosedMessage('This restaurant is currently closed')
      return
    }

    const now = new Date()
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const todayName = days[now.getDay()]
    const todayHours = hours.find(h => h.day === todayName)

    if (!todayHours || todayHours.is_closed) {
      setIsOpen(false)
      setClosedMessage(`Closed today (${todayName})`)
      return
    }

    // Check current time is within opening hours
    const [openH, openM] = todayHours.open_time.split(':').map(Number)
    const [closeH, closeM] = todayHours.close_time.split(':').map(Number)
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const openMins = openH * 60 + openM
    const closeMins = closeH * 60 + closeM

    if (nowMins < openMins) {
      setIsOpen(false)
      setClosedMessage(`Opens at ${todayHours.open_time}`)
      return
    }

    if (nowMins >= closeMins) {
      setIsOpen(false)
      setClosedMessage(`Closed - reopens ${getNextOpenDay(hours, days, now.getDay())}`)
      return
    }

    setIsOpen(true)
    setClosedMessage('')
  }

  function getNextOpenDay(hours: any[], days: string[], todayIdx: number) {
    for (let i = 1; i <= 7; i++) {
      const nextIdx = (todayIdx + i) % 7
      const nextDay = days[nextIdx]
      const nextHours = hours.find(h => h.day === nextDay)
      if (nextHours && !nextHours.is_closed) {
        return i === 1 ? `tomorrow at ${nextHours.open_time}` : `${nextDay} at ${nextHours.open_time}`
      }
    }
    return 'soon'
  }

  const [tip, setTip] = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [promoError, setPromoError] = useState('')
  const [w3wAddress, setW3wAddress] = useState('')
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapPin, setMapPin] = useState<{lat: number, lng: number} | null>(null)
  const [w3wLoading, setW3wLoading] = useState(false)
  const cartTotal = cartData?.cart?.reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0

  function getDeliveryFee() {
    if (form.orderType !== 'delivery') return 0
    const parish = form.addressMode === 'saved' ? (getSelectedAddress()?.parish || form.parish) : form.parish
    if (deliveryZones.length > 0) {
      const zone = deliveryZones.find((z: any) => z.parish === parish || z.name === parish)
      if (zone) {
        const fee = parseFloat(zone.fee) || 0
        const freeOver = zone.free_delivery_over ? parseFloat(zone.free_delivery_over) : null
        if (freeOver && cartTotal >= freeOver) return 0
        return fee
      }
    }
    return 0
  }

  const deliveryFee = getDeliveryFee()
  const promoDiscount = appliedPromo ? (appliedPromo.discount_type === 'percent' ? cartTotal * (appliedPromo.discount_value / 100) : appliedPromo.discount_value) : 0
  const orderTotal = cartTotal + deliveryFee + tip - promoDiscount
  const meetsMinOrder = cartTotal >= (parseFloat(restaurant?.min_order) || 10)

  async function applyPromoCode() {
    setPromoError('')
    if (!promoCode) return
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()
    if (!promo) { setPromoError('Invalid or expired promo code'); return }
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) { setPromoError('This promo code has expired'); return }
    if (promo.max_uses && promo.uses_count >= promo.max_uses) { setPromoError('This promo code has reached its maximum uses'); return }
    if (promo.min_order && cartTotal < promo.min_order) { setPromoError(`Minimum order of £${promo.min_order} required for this code`); return }
    if (promo.restaurant_id && promo.restaurant_id !== restaurant?.id) { setPromoError('This code is not valid for this restaurant'); return }
    setAppliedPromo(promo)
  }

  useEffect(() => {
    if (form.orderType !== 'delivery' || form.paymentMethod !== 'card') {
      setTip(0)
      setCustomTip('')
    }
  }, [form.orderType, form.paymentMethod])

  function getSelectedAddress() {
    if (form.addressMode === 'saved') return savedAddresses.find(a => a.id === form.savedAddressId)
    return null
  }

  function getDeliveryAddressText() {
    if (form.addressMode === 'saved') {
      const addr = getSelectedAddress()
      if (!addr) return ''
      return [addr.address_line1, addr.address_line2, addr.parish, addr.postcode].filter(Boolean).join(', ')
    }
    return [form.addressLine1, form.addressLine2, form.parish, form.postcode].filter(Boolean).join(', ')
  }

  function getScheduledFor() {
    if (!form.isPreOrder || !form.preOrderTime) return null
    const date = new Date().toISOString().split('T')[0]
    const time = form.preOrderTime.split(' - ')[0] // Take start time
    return `${date}T${time}:00`
  }

  async function getW3WFromGPS() {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return }
    setW3wLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await fetch(`https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&language=en&key=${process.env.NEXT_PUBLIC_W3W_API_KEY}`)
        const data = await res.json()
        if (data.words) {
          setW3wAddress(data.words)
          setForm(f => ({ ...f, locationDesc: f.locationDesc ? f.locationDesc : `What3Words: ///${data.words}` }))
        }
      } catch (e) {
        alert('Could not get What3Words address')
      }
      setW3wLoading(false)
    }, () => {
      alert('Location access denied')
      setW3wLoading(false)
    })
  }

  async function placeOrder() {
    if (!form.name) { setError('Please enter your name'); return }
    if (!form.phone) { setError('Please enter your phone number'); return }
    if (form.orderType === 'delivery') {
      if (form.addressMode === 'saved' && !form.savedAddressId) { setError('Please select a delivery address'); return }
      if (form.addressMode !== 'saved' && !form.addressLine1) { setError('Please enter your delivery address'); return }
    }
    if (form.isPreOrder && !form.preOrderTime) { setError('Please select a time slot'); return }
    if (!meetsMinOrder) { setError(`Minimum order is GBP${(parseFloat(restaurant?.min_order) || 10).toFixed(2)}`); return }
    setError('')
    setLoading(true)

    const selectedAddr = getSelectedAddress()
    const addressText = getDeliveryAddressText()
    const locationDesc = form.addressMode === 'saved' ? selectedAddr?.location_description : form.locationDesc

    const res = await fetch('/api/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: cartData.restaurantId,
        items: cartData.cart,
        customerId: authUserId || null,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email,
        address: addressText,
        locationDescription: locationDesc,
        parish: form.addressMode === 'saved' ? (selectedAddr?.parish || form.parish) : form.parish,
        deliveryParish: form.addressMode === 'saved' ? (selectedAddr?.parish || form.parish) : form.parish,
        orderType: form.orderType,
        paymentMethod: form.paymentMethod,
        note: form.note,
        tip: tip || 0,
        promoCode: appliedPromo?.code || null,
        promoDiscount: promoDiscount || 0,
        what3words: w3wAddress || null,
        deliveryLat: form.deliveryLat || null,
        deliveryLng: form.deliveryLng || null,
        contactlessDelivery: form.orderType === 'delivery' ? form.contactless : false,
        scheduledFor: getScheduledFor(),
      })
    })

    const data = await res.json()
    setLoading(false)

    if (!data.success) { setError(data.error || 'Something went wrong'); return }
    // Don't clear cart yet - keep it in case order is rejected/times out
    // Cart will be cleared when order is confirmed
    // localStorage.removeItem('feedme-cart')
    // Save guest details for next order
    localStorage.setItem('feedme-guest', JSON.stringify({ name: form.name, phone: form.phone, email: form.email }))

    if (data.paymentMethod === 'cash') {
      // Cash orders (including pre-orders) go straight to confirmed
      router.push(`/order/${data.orderId}/confirmed?method=cash`)
    } else {
      // Card orders wait for merchant acceptance then payment
      router.push(`/order/${data.orderId}/waiting`)
    }
  }

  const bg = dark ? '#080c14' : '#f8fafc'
  const card = dark ? '#0d1321' : '#ffffff'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const text = dark ? '#f1f5f9' : '#0f172a'
  const sub = dark ? '#64748b' : '#94a3b8'
  const inputStyle: any = { width: '100%', padding: '12px 14px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  if (!cartData || !restaurant) return (
    <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sub }}>Loading...</div>
  )

  // Check if pre-orders enabled
  const preOrderEnabled = form.orderType === 'delivery'
    ? restaurant?.preorder_delivery_enabled !== false
    : restaurant?.preorder_pickup_enabled !== false

  // Get estimated time
  const estTime = form.orderType === 'delivery'
    ? restaurant?.delivery_time_mins || 45
    : restaurant?.pickup_time_mins || 30

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: 'system-ui,sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: dark ? '#060b18' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me.gg</span>
        </Link>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, color: sub, padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Back</button>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px 16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Checkout</h1>

        {/* CLOSED BANNER */}
        {!isOpen && !form.isPreOrder && (
          <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', marginBottom: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔴</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>Restaurant Closed</div>
            <div style={{ fontSize: '13px', color: sub, marginBottom: '12px' }}>{closedMessage}</div>
            {preOrderEnabled && (
              <button onClick={() => setForm({...form, isPreOrder: true})} style={{ padding: '10px 24px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                📅 Schedule a Pre-Order instead
              </button>
            )}
            {restaurantHours.length > 0 && (
              <div style={{ marginTop: '12px', display: 'grid', gap: '4px' }}>
                {restaurantHours.filter(h => !h.is_closed).map(h => (
                  <div key={h.day} style={{ fontSize: '12px', color: sub, display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, width: '90px', textAlign: 'right' }}>{h.day}</span>
                    <span>{h.open_time} - {h.close_time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isOpen && form.isPreOrder && (
          <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', marginBottom: '14px', fontSize: '13px', color: '#22c55e' }}>
            📅 Restaurant is closed now but you can still pre-order for a future time
          </div>
        )}

        {/* ORDER SUMMARY */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Order Summary</div>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>{restaurant.name?.replace(/&amp;/g, '&')}</div>
          {cartData.cart.map((item: any) => (
            <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', gap: '12px' }}>
              <div style={{ color: dark ? '#94a3b8' : '#64748b', flex: 1 }}>
                <span style={{ fontWeight: 600, color: text }}>{item.qty}x</span> {item.name}
                {item.note && <div style={{ fontSize: '11px', color: sub, marginTop: '2px' }}>{item.note}</div>}
              </div>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>GBP{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${border}`, marginTop: '12px', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: sub, marginBottom: '6px' }}>
              <span>Subtotal</span><span>GBP{cartTotal.toFixed(2)}</span>
            </div>
            {form.orderType === 'delivery' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: sub, marginBottom: '6px' }}>
                <span>Delivery</span><span>GBP{deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {/* TIP moved to below payment method */}
            {tip > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#22c55e', marginBottom: '6px' }}>
                <span>Tip</span><span>GBP{tip.toFixed(2)}</span>
              </div>
            )}
            {promoDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#22c55e', marginBottom: '6px' }}>
                <span>Promo ({promoCode})</span><span>-GBP{promoDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${border}` }}>
              <span>Total</span><span style={{ color: '#22c55e' }}>GBP{Math.max(0, orderTotal).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ORDER TYPE */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Order Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {restaurant.accepts_delivery !== false && restaurant.delivery_enabled !== false && deliveryZones.length > 0 && (
              <button onClick={() => setForm({...form, orderType: 'delivery', isPreOrder: false, paymentMethod: 'card'})}
                style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${form.orderType === 'delivery' ? '#22c55e' : border}`, background: form.orderType === 'delivery' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
                🚗 Delivery<br/><span style={{ fontSize: '11px', color: sub, fontWeight: 400 }}>{estTime} mins</span>
              </button>
            )}
            {restaurant.accepts_pickup !== false && restaurant.pickup_enabled !== false && (
              <button onClick={() => setForm({...form, orderType: 'pickup', isPreOrder: false})}
                style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${form.orderType === 'pickup' ? '#22c55e' : border}`, background: form.orderType === 'pickup' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
                🏪 Collection<br/><span style={{ fontSize: '11px', color: sub, fontWeight: 400 }}>{restaurant?.pickup_time_mins || 20} mins</span>
              </button>
            )}
          </div>

          {/* WHEN - ASAP vs PRE-ORDER */}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>When would you like it?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setForm({...form, isPreOrder: false})}
                style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${!form.isPreOrder ? '#22c55e' : border}`, background: !form.isPreOrder ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
                ⚡ ASAP<br/><span style={{ fontSize: '11px', color: sub, fontWeight: 400 }}>~{estTime} mins</span>
              </button>
              {preOrderEnabled && (
                <button onClick={() => setForm({...form, isPreOrder: true})}
                  style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${form.isPreOrder ? '#22c55e' : border}`, background: form.isPreOrder ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
                  📅 Pre-Order<br/><span style={{ fontSize: '11px', color: sub, fontWeight: 400 }}>Choose a time</span>
                </button>
              )}
            </div>

            {/* TIME SLOT PICKER */}
            {form.isPreOrder && (
              <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px' }}>Time Slot</label>
                  {availableSlots.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                      {availableSlots.map(slot => (
                        <button key={slot} onClick={() => setForm({...form, preOrderTime: slot})}
                          style={{ padding: '8px 6px', background: form.preOrderTime === slot ? 'rgba(34,197,94,0.15)' : dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${form.preOrderTime === slot ? 'rgba(34,197,94,0.3)' : border}`, borderRadius: '6px', color: form.preOrderTime === slot ? '#22c55e' : text, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: form.preOrderTime === slot ? 600 : 400 }}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: sub }}>No slots available today</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* YOUR DETAILS */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Your Details</div>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input placeholder="Full name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} />
            <input placeholder="Phone number *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inputStyle} />
            <input placeholder="Email (optional)" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
          </div>
        </div>

        {/* DELIVERY ADDRESS */}
        {form.orderType === 'delivery' && (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Delivery Address</div>

            {savedAddresses.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button onClick={() => setForm({...form, addressMode: 'saved'})}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `2px solid ${form.addressMode === 'saved' ? '#22c55e' : border}`, background: form.addressMode === 'saved' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit' }}>
                  Saved Address
                </button>
                <button onClick={() => setForm({...form, addressMode: 'temp'})}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `2px solid ${form.addressMode === 'temp' ? '#22c55e' : border}`, background: form.addressMode === 'temp' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit' }}>
                  Different Address
                </button>
              </div>
            )}

            {form.addressMode === 'saved' && savedAddresses.length > 0 && (
              <div style={{ display: 'grid', gap: '8px' }}>
                {savedAddresses.map(addr => (
                  <div key={addr.id} onClick={() => setForm({...form, savedAddressId: addr.id, parish: addr.parish || form.parish})}
                    style={{ padding: '12px 14px', borderRadius: '10px', border: `2px solid ${form.savedAddressId === addr.id ? '#22c55e' : border}`, background: form.savedAddressId === addr.id ? 'rgba(34,197,94,0.06)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{addr.name}</span>
                      {addr.is_default && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Default</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: sub }}>
                      {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}, {addr.parish}{addr.postcode ? `, ${addr.postcode}` : ''}
                    </div>
                    {addr.location_description && <div style={{ fontSize: '11px', color: sub, fontStyle: 'italic', marginTop: '3px' }}>"{addr.location_description}"</div>}
                  </div>
                ))}
              </div>
            )}

            {(form.addressMode === 'new' || form.addressMode === 'temp' || savedAddresses.length === 0) && (
              <div style={{ display: 'grid', gap: '10px' }}>
                <input placeholder="House number and street *" value={form.addressLine1} onChange={e => setForm({...form, addressLine1: e.target.value})} style={inputStyle} />
                <input placeholder="Apartment / building name (optional)" value={form.addressLine2} onChange={e => setForm({...form, addressLine2: e.target.value})} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <select value={form.parish} onChange={e => setForm({...form, parish: e.target.value})} style={{ ...inputStyle, appearance: 'none' as any }}>
                    {(deliveryZones.length > 0 
                      ? deliveryZones.filter((z: any) => z.is_active).map((z: any) => z.name || z.parish).filter(Boolean)
                      : PARISHES
                    ).map(p => <option key={p} value={p} style={{ background: dark ? '#0d1321' : '#fff' }}>{p}</option>)}
                  </select>
                  <input placeholder="Postcode" value={form.postcode} onChange={e => setForm({...form, postcode: e.target.value})} style={inputStyle} />
                </div>
                {form.parish && deliveryZones.length > 0 && !deliveryZones.find((z: any) => (z.name === form.parish || z.parish === form.parish) && z.is_active) && (
                  <div style={{ fontSize: '12px', color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                    ❌ Sorry, delivery is not available to {form.parish}
                  </div>
                )}
                <textarea placeholder="Delivery directions - helps the driver find you (optional)" value={form.locationDesc} onChange={e => setForm({...form, locationDesc: e.target.value})} rows={2}
                  style={{ ...inputStyle, resize: 'none' }} />
                <button type="button" onClick={() => setShowMapModal(true)} style={{ width: '100%', padding: '10px', background: form.deliveryLat ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${form.deliveryLat ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.3)'}`, borderRadius: '10px', color: form.deliveryLat ? '#22c55e' : '#3b82f6', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  📍 {form.deliveryLat ? 'Location pinned ✓ — tap to change' : 'Pin my exact location on map'}
                </button>
              </div>
            )}

            {/* CONTACTLESS */}
            <div onClick={() => setForm({...form, contactless: !form.contactless, paymentMethod: !form.contactless ? 'card' : form.paymentMethod})}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: form.contactless ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${form.contactless ? 'rgba(34,197,94,0.2)' : border}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', marginTop: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: form.contactless ? '#22c55e' : text }}>🚪 Contactless Delivery</div>
                <div style={{ fontSize: '12px', color: sub, marginTop: '2px' }}>Driver leaves food at your door</div>
              </div>
              <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.contactless ? '#22c55e' : '#334155', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '3px', left: form.contactless ? '23px' : '3px', width: '18px', height: '18px', background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
            </div>
          </div>
        )}

        {/* SPECIAL INSTRUCTIONS */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Special Instructions</div>
          <textarea placeholder="Any notes for the restaurant? (optional)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} rows={2}
            style={{ ...inputStyle, resize: 'none' }} />
        </div>

        {/* PAYMENT METHOD */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Payment Method</div>
          {form.contactless && (
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#22c55e' }}>
              🚪 Contactless delivery requires card payment
            </div>
          )}
          <div style={{ display: 'grid', gap: '10px' }}>
            <button onClick={() => setForm({...form, paymentMethod: 'card'})}
              style={{ padding: '14px 16px', borderRadius: '10px', border: `2px solid ${form.paymentMethod === 'card' ? '#22c55e' : border}`, background: form.paymentMethod === 'card' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>💳 Pay by card</div>
              <div style={{ fontSize: '11px', color: sub }}>Secure online payment • Apple Pay • Google Pay • Card</div>
            </button>
            {!form.contactless && (form.orderType !== 'delivery' || hasPreviousOrder) && (
              <button onClick={() => setForm({...form, paymentMethod: 'cash'})}
                style={{ padding: '14px 16px', borderRadius: '10px', border: `2px solid ${form.paymentMethod === 'cash' ? '#22c55e' : border}`, background: form.paymentMethod === 'cash' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>💵 Cash {form.orderType === 'delivery' ? 'on delivery' : 'on collection'}</div>
                <div style={{ fontSize: '11px', color: sub }}>Pay with cash {form.orderType === 'delivery' ? 'when your order arrives' : 'when you collect'}</div>
              </button>
            )}
            {form.orderType === 'delivery' && !hasPreviousOrder && (
              <div style={{ padding: '12px 14px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '10px', fontSize: '12px', color: '#f97316' }}>
                💡 Cash on delivery is available after your first order. Card payment is required for your first delivery.
              </div>
            )}
          </div>
        </div>

        {/* TIP - only for card delivery */}
        {form.orderType === 'delivery' && form.paymentMethod === 'card' && (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Add a tip for the driver? 🙏</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
              {[0, 1, 2, 3, 4, 5, 10].map(t => (
                <button key={t} onClick={() => { setTip(t); setCustomTip('') }}
                  style={{ padding: '10px 4px', background: tip === t && !customTip ? 'rgba(34,197,94,0.15)' : dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${tip === t && !customTip ? 'rgba(34,197,94,0.3)' : border}`, borderRadius: '8px', color: tip === t && !customTip ? '#22c55e' : text, fontSize: '13px', cursor: 'pointer', fontWeight: tip === t && !customTip ? 700 : 400, fontFamily: 'inherit' }}>
                  {t === 0 ? 'None' : `£${t}`}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: sub }}>£</span>
              <input type="number" min="0" step="0.50" placeholder="Custom amount" value={customTip}
                onChange={e => { setCustomTip(e.target.value); setTip(parseFloat(e.target.value) || 0) }}
                style={{ flex: 1, padding: '10px 12px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${customTip ? 'rgba(34,197,94,0.3)' : border}`, borderRadius: '8px', color: text, fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>
        )}

        {/* PROMO CODE */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Promo Code 🎟️</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="Enter promo code" value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setAppliedPromo(null); setPromoError('') }}
              style={{ flex: 1, padding: '10px 14px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${appliedPromo ? 'rgba(34,197,94,0.3)' : border}`, borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={applyPromoCode} style={{ padding: '10px 16px', background: appliedPromo ? 'rgba(34,197,94,0.15)' : dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${appliedPromo ? 'rgba(34,197,94,0.3)' : border}`, borderRadius: '8px', color: appliedPromo ? '#22c55e' : text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {appliedPromo ? '✓ Applied' : 'Apply'}
            </button>
          </div>
          {promoError && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{promoError}</div>}
          {appliedPromo && <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '6px' }}>🎉 {appliedPromo.description || `${appliedPromo.discount_type === 'percent' ? appliedPromo.discount_value + '%' : '£' + appliedPromo.discount_value} off applied!`}</div>}
        </div>

        {/* MIN ORDER WARNING */}
        {!meetsMinOrder && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: '#fca5a5', marginBottom: '14px' }}>
            Minimum order GBP{(parseFloat(restaurant?.min_order) || 10).toFixed(2)} — add GBP{((parseFloat(restaurant?.min_order) || 10) - cartTotal).toFixed(2)} more
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: '#fca5a5', marginBottom: '14px' }}>{error}</div>
        )}

        {/* SPACER for sticky bar */}
        <div style={{ height: '90px' }} />

      </div>

      {/* STICKY BOTTOM BAR */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: dark ? 'rgba(6,11,24,0.97)' : 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${border}`, padding: '12px 16px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', color: sub }}>
              {cartData?.cart?.length || 0} items
              {promoDiscount > 0 && <span style={{ color: '#22c55e', marginLeft: '8px' }}>• Promo applied</span>}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e' }}>
              GBP{Math.max(0, orderTotal).toFixed(2)}
            </div>
          </div>
          <button onClick={placeOrder} disabled={loading || !meetsMinOrder || (!isOpen && !form.isPreOrder)}
            style={{ width: '100%', padding: '15px', background: loading || !meetsMinOrder || (!isOpen && !form.isPreOrder) ? '#1e3a2f' : '#22c55e', color: loading || !meetsMinOrder || (!isOpen && !form.isPreOrder) ? '#475569' : '#080c14', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: loading || !meetsMinOrder || (!isOpen && !form.isPreOrder) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {(!isOpen && !form.isPreOrder) ? 'Restaurant Closed' : loading ? 'Placing order...' : form.isPreOrder ? `Pre-Order for ${form.preOrderTime || 'selected time'}` : 'Place Order • GBP' + Math.max(0, orderTotal).toFixed(2)}
          </button>
        </div>
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: #334155; }
        select option { background: ${dark ? '#0d1321' : '#fff'}; }
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 30px ${dark ? '#0d1321' : '#fff'} inset !important;
          -webkit-text-fill-color: ${dark ? '#f1f5f9' : '#0f172a'} !important;
        }
      `}</style>


      {/* MAP MODAL */}
      {showMapModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#0d1321', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>📍 Pin your location</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Tap the map to place a pin on your exact front door</div>
            </div>
            <button onClick={() => setShowMapModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ position: 'relative', height: '360px' }}>
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=-2.7,-2.4,49.3,49.55&layer=mapnik&marker=${mapPin ? `${mapPin.lat},${mapPin.lng}` : '49.455,-2.535'}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '32px', marginBottom: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>📍</div>
            </div>
            <div style={{ position: 'absolute', inset: 0 }} onClick={async (e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = (e.clientX - rect.left) / rect.width
              const y = (e.clientY - rect.top) / rect.height
              // Guernsey bounding box
              const minLng = -2.7, maxLng = -2.4
              const minLat = 49.3, maxLat = 49.55
              const lng = minLng + x * (maxLng - minLng)
              const lat = maxLat - y * (maxLat - minLat)
              setMapPin({ lat, lng })
            }} />
          </div>
          {mapPin && (
            <div style={{ padding: '8px 16px', background: 'rgba(34,197,94,0.08)', borderTop: '1px solid rgba(34,197,94,0.15)', fontSize: '12px', color: '#22c55e', textAlign: 'center' }}>
              📍 Pin placed at {mapPin.lat.toFixed(5)}, {mapPin.lng.toFixed(5)}
            </div>
          )}
          <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                  setMapPin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                })
              }
            }} style={{ flex: 1, padding: '10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Use my GPS
            </button>
            <button onClick={() => {
              if (mapPin) {
                setForm(f => ({ ...f, deliveryLat: mapPin.lat, deliveryLng: mapPin.lng }))
                setShowMapModal(false)
              }
            }} disabled={!mapPin} style={{ flex: 2, padding: '10px', background: mapPin ? '#22c55e' : '#334155', color: mapPin ? '#0a0f1e' : '#64748b', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: mapPin ? 'pointer' : 'not-allowed' }}>
              Confirm Location
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
