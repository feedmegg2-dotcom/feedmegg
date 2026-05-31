'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUSES = [
  { key: 'pending', label: 'Order received by restaurant', done: true },
  { key: 'accepted', label: 'Restaurant accepted your order', done: false },
  { key: 'waiting_payment', label: 'Payment link sent', done: false },
  { key: 'paid', label: 'Payment confirmed', done: false },
  { key: 'complete', label: 'Order complete!', done: false },
]

export default function OrderConfirmPage() {
  const { id } = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    fetchOrder()
    // Poll every 5 seconds
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [id])

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/orders?orderId=${id}`)
      const data = await res.json()
      setOrder(data.order)
      setLoading(false)

      // If order has a payment link and is waiting payment, show popup
      if (data.order?.status === 'waiting_payment' && data.order?.sumup_link) {
        setShowPayment(true)
      }
    } catch {}
  }

  const getStatusIndex = (status: string) => {
    const map: Record<string, number> = { pending: 0, accepted: 1, waiting_payment: 2, paid: 3, complete: 4, cancelled: -1 }
    return map[status] ?? 0
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--sub)' }}>
      Loading order...
    </div>
  )

  const currentStep = order ? getStatusIndex(order.status) : 0
  const isCancelled = order?.status === 'cancelled'

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <nav style={{ background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 800, letterSpacing: '-1px', textDecoration: 'none' }}>
          <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
        </Link>
      </nav>

      <div style={{ maxWidth: '520px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
        {isCancelled ? (
          <>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--red)', marginBottom: '8px' }}>Order Cancelled</h2>
            <p style={{ color: 'var(--sub)', marginBottom: '20px' }}>
              {order?.rejection_reason || 'Your order was cancelled.'}
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--green)', marginBottom: '8px' }}>Order Placed!</h2>
            <p style={{ color: 'var(--sub)', marginBottom: '20px' }}>
              Your order has been sent to the restaurant. Check your email for confirmation.
            </p>
          </>
        )}

        {/* Order reference */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '20px', fontWeight: 700, marginBottom: '20px', letterSpacing: '1px' }}>
          {order?.order_number || 'Loading...'}
        </div>

        {/* Status tracker */}
        {!isCancelled && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', textAlign: 'left', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Order Status</div>
            {STATUSES.map((step, idx) => (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', fontSize: '13px', color: idx <= currentStep ? (idx === currentStep ? 'var(--orange)' : 'var(--green)') : 'var(--sub)', borderBottom: idx < STATUSES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${idx < currentStep ? 'var(--green)' : idx === currentStep ? 'var(--orange)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0, background: idx < currentStep ? 'var(--green)' : 'transparent', color: idx < currentStep ? '#0F172A' : 'inherit' }}>
                  {idx < currentStep ? '✓' : idx + 1}
                </div>
                {step.label}
                {idx === currentStep && <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--orange)', animation: 'blink 1.5s infinite' }}>●</span>}
              </div>
            ))}
          </div>
        )}

        {order?.estimated_wait_mins && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--sub)' }}>Estimated {order.order_type === 'delivery' ? 'delivery' : 'pickup'} time</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--green)' }}>{order.estimated_wait_mins} minutes</div>
          </div>
        )}

        <p style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '20px' }}>
          This page updates automatically every 5 seconds.
        </p>

        <Link href="/" className="btn-primary" style={{ display: 'block', padding: '14px', borderRadius: '12px', textDecoration: 'none', textAlign: 'center' }}>
          Back to Home
        </Link>
      </div>

      {/* Payment link popup */}
      {showPayment && order?.sumup_link && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '380px', textAlign: 'center' }} className="animate-bounce-in">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--green)', marginBottom: '8px' }}>Order Accepted!</h3>
            <p style={{ fontSize: '13px', color: 'var(--sub)', marginBottom: '20px' }}>
              {order.restaurants?.name} has accepted your order. Complete payment to confirm.
            </p>
            <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: 'var(--orange)' }}>
              ⏱ You have 2 minutes to complete payment
            </div>
            <a
              href={order.sumup_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ display: 'block', padding: '15px', borderRadius: '12px', textDecoration: 'none', fontSize: '16px', marginBottom: '10px' }}
              onClick={() => setShowPayment(false)}
            >
              Pay £{order.total?.toFixed(2)} Now →
            </a>
            <button onClick={() => setShowPayment(false)} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '12px', cursor: 'pointer' }}>
              I&apos;ll pay later (order may be cancelled)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
