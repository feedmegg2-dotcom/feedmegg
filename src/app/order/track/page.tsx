'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function TrackOrder() {
  const supabase = createClient()
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function trackOrder() {
    setError('')
    setOrder(null)
    if (!orderNumber || !phone) { setError('Please enter your order number and phone number'); return }
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, restaurants(name, emoji)')
      .eq('order_number', orderNumber.toUpperCase())
      .eq('customer_phone', phone)
      .maybeSingle()
    setLoading(false)
    if (!data) { setError('Order not found. Please check your order number and phone number.'); return }
    setOrder(data)
  }

  const statusInfo: Record<string, { label: string, color: string, icon: string, desc: string }> = {
    pending: { label: 'Waiting for restaurant', color: '#f97316', icon: '⏳', desc: 'Your order has been sent to the restaurant and is waiting to be accepted.' },
    accepted: { label: 'Order accepted', color: '#22c55e', icon: '✅', desc: 'The restaurant has accepted your order and is preparing it.' },
    waiting_payment: { label: 'Awaiting payment', color: '#3b82f6', icon: '💳', desc: 'Your order is ready - please complete your payment.' },
    paid: { label: 'Paid & preparing', color: '#22c55e', icon: '🍳', desc: 'Payment confirmed! The restaurant is preparing your order.' },
    complete: { label: 'Delivered', color: '#22c55e', icon: '🎉', desc: 'Your order has been delivered. Enjoy your meal!' },
    rejected: { label: 'Order rejected', color: '#ef4444', icon: '❌', desc: 'Unfortunately the restaurant could not accept your order. You have not been charged.' },
    cancelled: { label: 'Cancelled', color: '#ef4444', icon: '❌', desc: 'This order was cancelled. You have not been charged.' },
  }

  const bg = '#080c14'
  const card = '#0d1321'
  const border = 'rgba(255,255,255,0.07)'
  const text = '#f1f5f9'
  const sub = '#64748b'

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: bg, minHeight: '100vh', color: text }}>
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: sub, textDecoration: 'none' }}>Back to home</Link>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>Track your order</h1>
        <p style={{ color: sub, marginBottom: '32px', fontSize: '14px' }}>Enter your order number and phone number to check your order status.</p>

        <div style={{ background: card, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Order Number</label>
              <input placeholder="e.g. FM-ABC123" value={orderNumber} onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as any, letterSpacing: '1px', fontWeight: 600 }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Phone Number</label>
              <input placeholder="The number you used to order" value={phone} onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as any }} />
            </div>
            {error && <div style={{ fontSize: '13px', color: '#ef4444', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>{error}</div>}
            <button onClick={trackOrder} disabled={loading}
              style={{ width: '100%', padding: '14px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Searching...' : 'Track Order'}
            </button>
          </div>
        </div>

        {order && (() => {
          const status = statusInfo[order.status] || { label: order.status, color: '#64748b', icon: '📦', desc: '' }
          return (
            <div style={{ background: card, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '40px' }}>{status.icon}</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: status.color }}>{status.label}</div>
                  <div style={{ fontSize: '13px', color: sub, marginTop: '4px' }}>{status.desc}</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px', display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: sub }}>Order number</span>
                  <strong style={{ fontFamily: 'monospace' }}>{order.order_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: sub }}>Restaurant</span>
                  <strong>{order.restaurants?.emoji} {order.restaurants?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: sub }}>Order type</span>
                  <strong>{order.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Collection'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: sub }}>Payment</span>
                  <strong>{order.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <span>Total</span>
                  <span style={{ color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )
        })()}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: sub }}>
          Have an account? <Link href="/account" style={{ color: '#22c55e', textDecoration: 'none' }}>View all your orders</Link>
        </p>
      </div>
    </div>
  )
}
