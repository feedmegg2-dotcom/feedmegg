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
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [deliveryZones, setDeliveryZones] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    orderType: 'delivery',
    contactless: false,
    paymentMethod: 'card',
    addressMode: 'new', // 'saved' | 'new' | 'temp'
    savedAddressId: '',
    addressLine1: '',
    addressLine2: '',
    parish: 'St Peter Port',
    postcode: '',
    locationDesc: '',
    note: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
    const cartSaved = localStorage.getItem('feedme-cart')
    if (!cartSaved) { router.push('/'); return }
    const data = JSON.parse(cartSaved)
    setCartData(data)
    fetchRestaurant(data.restaurantId)
    fetchCustomer()
  }, [])

  async function fetchCustomer() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: cust } = await supabase.from('customers').select('*').eq('id', user.id).single()
    if (cust) {
      setCustomer(cust)
      setForm(f => ({
        ...f,
        name: cust.name || (cust.first_name ? `${cust.first_name} ${cust.last_name || ''}`.trim() : f.name),
        phone: cust.phone || f.phone,
        email: user.email || f.email,
      }))
      // Fetch saved addresses
      const { data: addrs } = await supabase.from('customer_addresses').select('*').eq('customer_id', cust.id).order('is_default', { ascending: false })
      if (addrs && addrs.length > 0) {
        setSavedAddresses(addrs)
        const def = addrs.find(a => a.is_default) || addrs[0]
        setForm(f => ({
          ...f,
          addressMode: 'saved',
          savedAddressId: def.id,
          parish: def.parish || f.parish,
        }))
      }
    }
  }

  async function fetchRestaurant(id: string) {
    const { data } = await supabase.from('restaurants').select('*').eq('id', id).single()
    setRestaurant(data)
    const { data: zones } = await supabase.from('delivery_zones').select('*').eq('restaurant_id', id).eq('is_active', true)
    setDeliveryZones(zones || [])
  }

  const cartTotal = cartData?.cart?.reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0
  function getDeliveryFee() {
    if (form.orderType !== 'delivery') return 0
    const parish = form.addressMode === 'saved' ? (getSelectedAddress()?.parish || form.parish) : form.parish
    // Check delivery zones for this parish
    if (deliveryZones.length > 0) {
      const zone = deliveryZones.find((z: any) => z.parish === parish || z.name === parish)
      if (zone) return parseFloat(zone.fee) || 0
    }
    // Fall back to restaurant default delivery fee
    return parseFloat(restaurant?.delivery_fee) || 2.50
  }
  const deliveryFee = getDeliveryFee()
  const orderTotal = cartTotal + deliveryFee
  const meetsMinOrder = cartTotal >= (parseFloat(restaurant?.min_order) || 10)

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

  async function placeOrder() {
    if (!form.name) { setError('Please enter your name'); return }
    if (!form.phone) { setError('Please enter your phone number'); return }
    if (form.orderType === 'delivery') {
      if (form.addressMode === 'saved' && !form.savedAddressId) { setError('Please select a delivery address'); return }
      if (form.addressMode !== 'saved' && !form.addressLine1) { setError('Please enter your delivery address'); return }
    }
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
        customerId: customer?.id || null,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email,
        address: addressText,
        locationDescription: locationDesc,
        parish: form.addressMode === 'saved' ? (selectedAddr?.parish || form.parish) : form.parish,
        orderType: form.orderType,
        paymentMethod: form.paymentMethod,
        note: form.note,
        contactless_delivery: form.orderType === 'delivery' ? form.contactless : false,
      })
    })

    const data = await res.json()
    setLoading(false)

    if (!data.success) { setError(data.error || 'Something went wrong'); return }
    localStorage.removeItem('feedme-cart')

    // Always go to waiting screen  payment happens AFTER merchant accepts
    router.push(`/order/${data.orderId}/waiting`)
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

        {/* ORDER SUMMARY */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Order Summary</div>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>{restaurant.name.replace(/&amp;/g, '&')}</div>
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
                <span>Delivery to {form.addressMode === 'saved' ? (getSelectedAddress()?.parish || form.parish) : form.parish}</span>
                <span>GBP{deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${border}` }}>
              <span>Total</span><span style={{ color: '#22c55e' }}>GBP{orderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ORDER TYPE */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Order Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {restaurant.accepts_delivery && (
              <button onClick={() => setForm({...form, orderType: 'delivery'})}
                style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${form.orderType === 'delivery' ? '#22c55e' : border}`, background: form.orderType === 'delivery' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
                Delivery
              </button>
            )}
            {restaurant.accepts_pickup && (
              <button onClick={() => setForm({...form, orderType: 'pickup'})}
                style={{ padding: '12px', borderRadius: '10px', border: `2px solid ${form.orderType === 'pickup' ? '#22c55e' : border}`, background: form.orderType === 'pickup' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
                Collection
              </button>
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

            {/* Address mode selector */}
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

            {/* Saved address picker */}
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
                {!customer && <Link href="/auth/login?redirect=/checkout" style={{ fontSize: '12px', color: '#22c55e', textDecoration: 'none' }}>Sign in to use saved addresses</Link>}
              </div>
            )}

            {/* New / temp address form */}
            {(form.addressMode === 'new' || form.addressMode === 'temp' || savedAddresses.length === 0) && (
              <div style={{ display: 'grid', gap: '10px' }}>
                <input placeholder="House number and street *" value={form.addressLine1} onChange={e => setForm({...form, addressLine1: e.target.value})} style={inputStyle} />
                <input placeholder="Apartment / building name (optional)" value={form.addressLine2} onChange={e => setForm({...form, addressLine2: e.target.value})} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <select value={form.parish} onChange={e => setForm({...form, parish: e.target.value})} style={{ ...inputStyle, appearance: 'none' as any }}>
                    {PARISHES.map(p => <option key={p} value={p} style={{ background: dark ? '#0d1321' : '#fff' }}>{p}</option>)}
                  </select>
                  <input placeholder="Postcode" value={form.postcode} onChange={e => setForm({...form, postcode: e.target.value})} style={inputStyle} />
                </div>
                <textarea placeholder="Location description  helps the driver find you (optional)" value={form.locationDesc} onChange={e => setForm({...form, locationDesc: e.target.value})} rows={2}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>
            )}
          </div>
        )}

        {/* SPECIAL INSTRUCTIONS */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Special Instructions</div>
          <textarea placeholder="Any notes for the restaurant? (optional)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'none' }} />

          {form.orderType === 'delivery' && (
            <div onClick={() => setForm({...form, contactless: !form.contactless})} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: form.contactless ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${form.contactless ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', marginTop: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: form.contactless ? '#22c55e' : '#f8fafc' }}>🚪 Contactless Delivery</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Driver leaves food at your door</div>
              </div>
              <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.contactless ? '#22c55e' : '#334155', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '3px', left: form.contactless ? '23px' : '3px', width: '18px', height: '18px', background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
            </div>
          )}
        </div>

        {/* PAYMENT METHOD */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: sub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Payment Method</div>
          <div style={{ display: 'grid', gap: '10px' }}>
            <button onClick={() => setForm({...form, paymentMethod: 'card'})}
              style={{ padding: '14px 16px', borderRadius: '10px', border: `2px solid ${form.paymentMethod === 'card' ? '#22c55e' : border}`, background: form.paymentMethod === 'card' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Pay by card</div>
                <div style={{ fontSize: '11px', color: sub }}>Secure online payment via SumUp</div>
              </div>
            </button>
            <button onClick={() => setForm({...form, paymentMethod: 'cash'})}
              style={{ padding: '14px 16px', borderRadius: '10px', border: `2px solid ${form.paymentMethod === 'cash' ? '#22c55e' : border}`, background: form.paymentMethod === 'cash' ? 'rgba(34,197,94,0.08)' : 'transparent', color: text, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Cash {form.orderType === 'pickup' ? 'on collection' : 'on delivery'}</div>
                <div style={{ fontSize: '11px', color: sub }}>Pay with cash {form.orderType === 'pickup' ? 'when you collect' : 'when your order arrives'}</div>
              </div>
            </button>
          </div>
        </div>

        {/* MIN ORDER WARNING */}
        {!meetsMinOrder && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: '#fca5a5', marginBottom: '14px' }}>
            Minimum order GBP{(parseFloat(restaurant?.min_order) || 10).toFixed(2)}  add GBP{((parseFloat(restaurant?.min_order) || 10) - cartTotal).toFixed(2)} more
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: '#fca5a5', marginBottom: '14px' }}>{error}</div>
        )}

        {/* PLACE ORDER BUTTON */}
        <button onClick={placeOrder} disabled={loading || !meetsMinOrder}
          style={{ width: '100%', padding: '16px', background: loading || !meetsMinOrder ? '#1e3a2f' : '#22c55e', color: loading || !meetsMinOrder ? '#475569' : '#080c14', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: loading || !meetsMinOrder ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: '8px' }}>
          {loading ? 'Placing order...' : 'Place Order'}
        </button>

      </div>

      <style>{`input::placeholder, textarea::placeholder { color: #334155; } select option { background: ${dark ? '#0d1321' : '#fff'}; }`}</style>
    </div>
  )
}
