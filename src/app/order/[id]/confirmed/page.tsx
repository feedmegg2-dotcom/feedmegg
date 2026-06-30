'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ConfirmedPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [status, setStatus] = useState<'checking' | 'paid' | 'cash' | 'failed'>('checking')
  const [order, setOrder] = useState<any>(null)
  const pollRef = useRef<any>(null)
  const method = searchParams.get('method')

  useEffect(() => {
    if (method === 'cash') { setStatus('cash'); fetchOrder(); return }
    checkOrderDirectly()
    return () => { clearInterval(pollRef.current) }
  }, [])

  // By the time the customer reaches this page, they have almost always
  // ALREADY paid - the SumUp widget on the previous /waiting page confirms
  // payment and calls our webhook to verify it with SumUp directly before
  // ever redirecting here. So we trust the order's real database status
  // first, rather than immediately running a fresh payment check (which can
  // lag) and risking telling a customer their successful payment "failed".
  async function checkOrderDirectly() {
    const { data } = await supabase.from('orders').select('*, restaurants(name)').eq('id', id).maybeSingle()
    if (data) {
      setOrder(data)
      if (data.paid_at || data.status === 'paid') {
        setStatus('paid')
        return
      }
      if (data.status === 'cancelled' || data.status === 'rejected') {
        setStatus('failed')
        return
      }
    }
    // Not yet confirmed paid in our own records - poll a few times in case
    // the webhook is still catching up. We never auto-cancel an order
    // purely because of a local timeout - only a genuine FAILED/EXPIRED
    // result from SumUp's own API (via /api/checkout/verify) marks it failed.
    startPolling()
  }

  async function fetchOrder() {
    const { data } = await supabase.from('orders').select('*, restaurants(name)').eq('id', id).maybeSingle()
    setOrder(data)
  }

  async function startPolling() {
    pollRef.current = setInterval(async () => {
      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id })
      })
      const data = await res.json()
      if (data.status === 'paid') {
        clearInterval(pollRef.current)
        setOrder(data.order)
        setStatus('paid')
      }
      if (data.status === 'failed') {
        clearInterval(pollRef.current)
        setStatus('failed')
      }
    }, 4000)
  }

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, textDecoration: 'none', marginBottom: '40px' }}>
        <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
      </Link>
      <div style={{ background: '#0d1321', border: `1px solid ${status === 'paid' || status === 'cash' ? 'rgba(34,197,94,0.3)' : status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '20px', padding: 'clamp(24px,5vw,48px)', maxWidth: '480px', width: '100%', textAlign: 'center' }}>

        {status === 'checking' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>...</div>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>Confirming your payment...</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>This will only take a moment.</p>
          </>
        )}

        {(status === 'paid' || status === 'cash') && (
          <>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>ok</div>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, marginBottom: '10px', color: '#22c55e' }}>
              {status === 'cash' ? 'Order placed!' : 'Payment confirmed!'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>
              {order?.scheduled_for
                ? `Your payment has been received. ${order?.restaurants?.name} will confirm your order shortly before your scheduled time of ${new Date(order.scheduled_for).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
                : status === 'cash'
                  ? `Your order has been sent to ${order?.restaurants?.name}. Please have the correct cash ready.`
                  : `Your payment was successful and your order has been sent to ${order?.restaurants?.name}.`}
            </p>
            {order && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px', marginBottom: '20px', textAlign: 'left' }}>
                <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>Order reference</div>
                <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', marginBottom: '8px' }}>{order.order_number || String(order.id).slice(0,8).toUpperCase()}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#22c55e' }}>GBP{parseFloat(order.total).toFixed(2)}</div>
              </div>
            )}
            <Link href="/" style={{ display: 'block', padding: '13px', background: '#22c55e', color: '#080c14', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>Back to restaurants</Link>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px', color: '#ef4444', fontWeight: 800 }}>!</div>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '10px', color: '#ef4444' }}>Payment not completed</h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>Your payment was not completed and your order has been cancelled. If you believe you were charged, please contact us before placing a new order.</p>
            <Link href="/" style={{ display: 'block', padding: '13px', background: '#22c55e', color: '#080c14', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>Back to restaurants</Link>
          </>
        )}
      </div>
    </div>
  )
}
