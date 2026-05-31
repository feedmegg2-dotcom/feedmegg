'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const PARISHES = ['St Peter Port','St Sampson','Vale','Castel','St Martin','St Andrew','Forest','Torteval','St Saviour','St Pierre du Bois']
const TIME_SLOTS = ['Now (ASAP)','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM']
const TIP_AMOUNTS = [0, 1, 2, 3, 5]

export default function CheckoutPage() {
  const router = useRouter()
  const supabase = createClient()
  const [cartData, setCartData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deliveryType, setDeliveryType] = useState('delivery')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [tip, setTip] = useState(0)
  const [timeSlot, setTimeSlot] = useState('Now (ASAP)')
  const [promoCode, setPromoCode] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', street: '', parish: 'St Peter Port', postcode: '', notes: '' })
  const [w3w, setW3w] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('feedme-cart')
    if (saved) setCartData(JSON.parse(saved))
    else router.push('/')
  }, [])

  const cart = cartData?.cart || []
  const subtotal = cart.reduce((s: number, i: any) => s + i.price * i.qty, 0)
  const deliveryFee = deliveryType === 'delivery' ? 2.99 : 0
  const discount = 0 // applied after promo validation
  const total = subtotal + deliveryFee + tip - discount

  async function generateW3W() {
    if (!form.postcode) return
    try {
      const res = await fetch(`/api/w3w?postcode=${encodeURIComponent(form.postcode)}`)
      const data = await res.json()
      if (data.words) setW3w(data.words)
    } catch {}
  }

  async function placeOrder() {
    if (!form.firstName || !form.email) { setError('Please fill in your name and email.'); return }
    if (deliveryType === 'delivery' && !form.street) { setError('Please enter your delivery address.'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: cartData.restaurantId,
          customerName: `${form.firstName} ${form.lastName}`,
          customerEmail: form.email,
          customerPhone: form.phone,
          orderType: deliveryType,
          deliveryAddress: deliveryType === 'delivery' ? `${form.street}, ${form.parish}` : null,
          deliveryParish: deliveryType === 'delivery' ? form.parish : null,
          deliveryPostcode: deliveryType === 'delivery' ? form.postcode : null,
          deliveryNotes: form.notes,
          items: cart.map((i: any) => ({ menuItemId: i.id, quantity: i.qty, specialInstructions: i.note, modifierPrice: 0 })),
          paymentMethod,
          promoCode: promoCode || null,
          tip,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to place order'); setLoading(false); return }

      localStorage.removeItem('feedme-cart')
      router.push(`/order/${data.orderId}/confirm`)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      setLoading(false)
    }
  }

  if (!cartData) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <nav style={{ background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 800, letterSpacing: '-1px', textDecoration: 'none' }}>
          <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
        </Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: '16px' }}>← Back</button>
        <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '24px' }}>Checkout</h2>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--red)' }}>{error}</div>}

        {/* Delivery toggle */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Delivery method</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['delivery', 'pickup'].map(t => (
              <button key={t} onClick={() => setDeliveryType(t)} style={{ flex: 1, padding: '12px', background: deliveryType === t ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: `2px solid ${deliveryType === t ? 'var(--green)' : 'var(--border)'}`, borderRadius: '10px', color: deliveryType === t ? 'var(--green)' : 'var(--sub)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {t === 'delivery' ? '🚗 Delivery' : '🚶 Pickup'}
              </button>
            ))}
          </div>
        </div>

        {/* Your details */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Your details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div><label>First name</label><input className="input" placeholder="Jane" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} /></div>
            <div><label>Last name</label><input className="input" placeholder="Smith" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
          </div>
          <div style={{ marginBottom: '10px' }}><label>Email address</label><input className="input" type="email" placeholder="jane@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div><label>Phone number</label><input className="input" type="tel" placeholder="+44 7700 000000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
        </div>

        {/* Delivery address */}
        {deliveryType === 'delivery' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Delivery address</h3>
            <div style={{ marginBottom: '10px' }}><label>Street address</label><input className="input" placeholder="123 High Street" value={form.street} onChange={e => setForm({...form, street: e.target.value})} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label>Parish</label>
                <select className="input" value={form.parish} onChange={e => setForm({...form, parish: e.target.value})}>
                  {PARISHES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div><label>Postcode</label><input className="input" placeholder="GY1 2AA" value={form.postcode} onChange={e => setForm({...form, postcode: e.target.value})} onBlur={generateW3W} /></div>
            </div>
            {w3w && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--sub)', marginBottom: '10px' }}>
                🗺️ What3Words: <strong style={{ color: 'var(--text)' }}>///{w3w}</strong>
              </div>
            )}
            <div><label>Delivery notes (optional)</label><textarea className="input" rows={2} placeholder="Gate code, leave at door..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ resize: 'none' }} /></div>
          </div>
        )}

        {/* Time slot */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Select time slot</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
            {TIME_SLOTS.map(slot => (
              <button key={slot} onClick={() => setTimeSlot(slot)} style={{ padding: '10px', background: timeSlot === slot ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: `2px solid ${timeSlot === slot ? 'var(--green)' : 'var(--border)'}`, borderRadius: '8px', color: timeSlot === slot ? 'var(--green)' : 'var(--sub)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Payment */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Payment method</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {[{key:'card',icon:'💳',label:'Card (SumUp)'},{key:'paypal',icon:'🅿️',label:'PayPal'},{key:'cash',icon:'💵',label:'Cash'}].map(p => (
              <div key={p.key} onClick={() => setPaymentMethod(p.key)} style={{ background: paymentMethod === p.key ? 'rgba(34,197,94,0.08)' : 'var(--bg3)', border: `2px solid ${paymentMethod === p.key ? 'var(--green)' : 'var(--border)'}`, borderRadius: '10px', padding: '12px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{p.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: paymentMethod === p.key ? 'var(--green)' : 'var(--sub)' }}>{p.label}</div>
              </div>
            ))}
          </div>
          <div><label>Promo code (optional)</label><input className="input" placeholder="e.g. WELCOME" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} /></div>
        </div>

        {/* Tip */}
        {deliveryType === 'delivery' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Add a tip for your driver 🙏</h3>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {TIP_AMOUNTS.map(t => (
                <button key={t} onClick={() => setTip(t)} style={{ background: tip === t ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${tip === t ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`, color: tip === t ? 'var(--green)' : 'var(--sub)', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                  {t === 0 ? 'No tip' : `£${t.toFixed(2)}`}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--sub)' }}>Tips go directly to the restaurant to distribute to their drivers. No commission charged on tips.</p>
          </div>
        )}

        {/* Order summary */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Order summary</h3>
          {cart.map((item: any) => (
            <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: 'var(--sub)' }}>
              <span>{item.qty}× {item.name}</span>
              <span>£{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: 'var(--sub)' }}>
            <span>{deliveryType === 'delivery' ? 'Delivery fee' : 'Pickup'}</span>
            <span>{deliveryType === 'delivery' ? `£${deliveryFee.toFixed(2)}` : 'Free'}</span>
          </div>
          {tip > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: 'var(--sub)' }}>
              <span>Driver tip</span><span>£{tip.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            <span>Total</span><span style={{ color: 'var(--green)' }}>£{total.toFixed(2)}</span>
          </div>
        </div>

        {/* T&Cs */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', fontSize: '11px', color: 'var(--sub)', marginBottom: '16px', lineHeight: 1.6 }}>
          🔒 By placing your order you agree to our <Link href="/terms" style={{ color: 'var(--green)', textDecoration: 'none' }}>Terms & Conditions</Link> and <Link href="/privacy" style={{ color: 'var(--green)', textDecoration: 'none' }}>Privacy Policy</Link>. Allergen information is AI-assisted and a guide only — please contact the restaurant to verify.
        </div>

        <button className="btn-primary" onClick={placeOrder} disabled={loading} style={{ width: '100%', padding: '17px', fontSize: '16px', borderRadius: '14px' }}>
          {loading ? 'Placing order...' : 'Place Order →'}
        </button>
      </div>
    </div>
  )
}
