'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const PARISHES = ['Castel','Forest','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']

export default function CheckoutPage() {
  const router = useRouter()
  const supabase = createClient()
  const [cartData, setCartData] = useState<any>(null)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [deliveryZones, setDeliveryZones] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    orderType: 'delivery',
    paymentMethod: 'card',
    parish: 'St Peter Port',
    address: '',
    note: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('feedme-cart')
    if (!saved) { router.push('/'); return }
    const data = JSON.parse(saved)
    setCartData(data)
    fetchRestaurant(data.restaurantId)
  }, [])

  async function fetchRestaurant(id: string) {
    const { data } = await supabase.from('restaurants').select('*').eq('id', id).single()
    setRestaurant(data)
    const { data: zones } = await supabase.from('delivery_zones').select('*').eq('restaurant_id', id)
    setDeliveryZones(zones || [])
  }

  const cartTotal = cartData?.cart?.reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0

  function getDeliveryFee() {
    if (form.orderType !== 'delivery') return 0
    const zone = deliveryZones.find(z => z.parish === form.parish)
    if (zone) return parseFloat(zone.fee)
    return parseFloat(restaurant?.delivery_fee) || 2.50
  }

  function getMinOrder() {
    const zone = deliveryZones.find(z => z.parish === form.parish)
    if (zone) return parseFloat(zone.min_order)
    return parseFloat(restaurant?.min_order) || 10
  }

  const deliveryFee = getDeliveryFee()
  const orderTotal = cartTotal + deliveryFee
  const meetsMinOrder = cartTotal >= getMinOrder()

  async function placeOrder() {
    if (!form.name) { setError('Please enter your name'); return }
    if (!form.phone) { setError('Please enter your phone number'); return }
    if (form.orderType === 'delivery' && !form.address) { setError('Please enter your delivery address'); return }
    if (!meetsMinOrder) { setError(`Minimum order is GBP${getMinOrder().toFixed(2)}`); return }
    setError('')
    setLoading(true)

    const itemsWithPayment = cartData.cart.map((i: any) => ({ ...i, paymentMethod: form.paymentMethod }))

    const res = await fetch('/api/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: cartData.restaurantId,
        items: itemsWithPayment,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email,
        address: form.address,
        parish: form.parish,
        orderType: form.orderType,
        note: form.note,
      })
    })

    const data = await res.json()
    setLoading(false)

    if (!data.success) { setError(data.error || 'Something went wrong'); return }

    localStorage.removeItem('feedme-cart')

    if (data.paymentMethod === 'cash') {
      router.push(`/order/${data.orderId}/confirmed?method=cash`)
    } else {
      window.location.href = data.paymentUrl
    }
  }

  if (!cartData || !restaurant) return (
    <div style={{ background: '#080c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>
  )

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Back</button>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(20px,4vw,40px) 20px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,340px)', gap: '24px' }}>

        {/* LEFT  FORM */}
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(20px,3vw,26px)', fontWeight: 800, marginBottom: '24px', letterSpacing: '-0.5px' }}>Checkout</h1>

          {/* ORDER TYPE */}
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Order type</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {restaurant.accepts_delivery && (
                <button onClick={() => setForm({...form, orderType: 'delivery'})}
                  style={{ padding: '14px', borderRadius: '10px', border: `2px solid ${form.orderType === 'delivery' ? '#22c55e' : 'rgba(255,255,255,0.08)'}`, background: form.orderType === 'delivery' ? 'rgba(34,197,94,0.08)' : 'transparent', color: '#f1f5f9', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
                  Delivery
                </button>
              )}
              {restaurant.accepts_pickup && (
                <button onClick={() => setForm({...form, orderType: 'pickup'})}
                  style={{ padding: '14px', borderRadius: '10px', border: `2px solid ${form.orderType === 'pickup' ? '#22c55e' : 'rgba(255,255,255,0.08)'}`, background: form.orderType === 'pickup' ? 'rgba(34,197,94,0.08)' : 'transparent', color: '#f1f5f9', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
                  Collection
                </button>
              )}
            </div>
          </div>

          {/* CONTACT */}
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Your details</div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <input placeholder="Full name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
              <input placeholder="Phone number *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
              <input placeholder="Email (optional)" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>

          {/* DELIVERY ADDRESS */}
          {form.orderType === 'delivery' && (
            <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Delivery address</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <select value={form.parish} onChange={e => setForm({...form, parish: e.target.value})}
                  style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}>
                  {PARISHES.map(p => <option key={p} value={p} style={{ background: '#0d1321' }}>{p}</option>)}
                </select>
                <textarea placeholder="House number and street *" value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2}
                  style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
              </div>
              {deliveryZones.length > 0 && !deliveryZones.find(z => z.parish === form.parish) && (
                <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '12px', color: '#fca5a5' }}>
                  Sorry, this restaurant does not deliver to {form.parish}
                </div>
              )}
            </div>
          )}

          {/* SPECIAL INSTRUCTIONS */}
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Special instructions</div>
            <textarea placeholder="Any notes for the restaurant? (optional)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} rows={2}
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {/* PAYMENT METHOD */}
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Payment method</div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <button onClick={() => setForm({...form, paymentMethod: 'card'})}
                style={{ padding: '14px 16px', borderRadius: '10px', border: `2px solid ${form.paymentMethod === 'card' ? '#22c55e' : 'rgba(255,255,255,0.08)'}`, background: form.paymentMethod === 'card' ? 'rgba(34,197,94,0.08)' : 'transparent', color: '#f1f5f9', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>$</span>
                <div>
                  <div>Pay by card</div>
                  <div style={{ fontSize: '11px', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>Secure online payment via SumUp</div>
                </div>
              </button>
              <button onClick={() => setForm({...form, paymentMethod: 'cash'})}
                style={{ padding: '14px 16px', borderRadius: '10px', border: `2px solid ${form.paymentMethod === 'cash' ? '#22c55e' : 'rgba(255,255,255,0.08)'}`, background: form.paymentMethod === 'cash' ? 'rgba(34,197,94,0.08)' : 'transparent', color: '#f1f5f9', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>$</span>
                <div>
                  <div>Cash {form.orderType === 'pickup' ? 'on collection' : 'on delivery'}</div>
                  <div style={{ fontSize: '11px', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>Pay with cash {form.orderType === 'pickup' ? 'when you collect' : 'when your order arrives'}</div>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5', marginBottom: '16px' }}>{error}</div>
          )}
        </div>

        {/* RIGHT  ORDER SUMMARY */}
        <div style={{ position: 'sticky', top: '72px', alignSelf: 'start' }}>
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Order summary</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', fontWeight: 600 }}>{restaurant.name}</div>

            {cartData.cart.map((item: any) => (
              <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', gap: '8px' }}>
                <span style={{ color: '#94a3b8' }}>{item.qty}x {item.name}{item.note ? ` (${item.note})` : ''}</span>
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>GBP{(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '14px', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                <span>Subtotal</span><span>GBP{cartTotal.toFixed(2)}</span>
              </div>
              {form.orderType === 'delivery' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                  <span>Delivery to {form.parish}</span><span>GBP{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <span>Total</span><span style={{ color: '#22c55e' }}>GBP{orderTotal.toFixed(2)}</span>
              </div>
            </div>

            {!meetsMinOrder && (
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', fontSize: '12px', color: '#fca5a5' }}>
                Minimum order GBP{getMinOrder().toFixed(2)}  add GBP{(getMinOrder() - cartTotal).toFixed(2)} more
              </div>
            )}

            <button onClick={placeOrder} disabled={loading || !meetsMinOrder}
              style={{ width: '100%', marginTop: '16px', padding: '14px', background: loading || !meetsMinOrder ? '#1e3a2f' : '#22c55e', color: loading || !meetsMinOrder ? '#475569' : '#080c14', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading || !meetsMinOrder ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Placing order...' : form.paymentMethod === 'cash' ? 'Place order' : `Pay GBP${orderTotal.toFixed(2)}`}
            </button>

            {form.paymentMethod === 'card' && (
              <div style={{ textAlign: 'center', fontSize: '11px', color: '#334155', marginTop: '10px' }}>
                Secured by SumUp
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          div[style*="grid-template-columns: minmax(0,1fr) minmax(0,340px)"] {
            grid-template-columns: 1fr !important;
          }
        }
        input::placeholder, textarea::placeholder { color: #334155; }
        option { background: #0d1321; color: #f1f5f9; }
      `}</style>
    </div>
  )
}
