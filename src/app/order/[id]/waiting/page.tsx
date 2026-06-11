'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const TIMEOUT_SECS = 120

export default function WaitingPage() {
  const params = useParams()
  const orderId = params.id || params.orderId
  const router = useRouter()
  const supabase = createClient()
  const [order, setOrder] = useState<any>(null)
  const [status, setStatus] = useState<'waiting'|'accepted'|'paying'|'paid'|'rejected'|'timeout'>('waiting')
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECS)
  const [dark, setDark] = useState(true)
  const [checkoutId, setCheckoutId] = useState<string|null>(null)
  const pollRef = useRef<any>(null)
  const countdownRef = useRef<any>(null)
  const startTimeRef = useRef<number>(Date.now())
  const widgetMounted = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
    fetchOrder()
    startCountdown()
    startPolling()
    return () => {
      clearInterval(pollRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  // Mount SumUp widget when checkoutId is available
  useEffect(() => {
    if (!checkoutId || widgetMounted.current) return
    const script = document.createElement('script')
    script.src = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js'
    script.onload = () => {
      widgetMounted.current = true
      ;(window as any).SumUpCard?.mount({
        id: 'sumup-card',
        checkoutId: checkoutId,
        onResponse: async (type: string, body: any) => {
          console.log('SumUp response:', type, body)
          if (type === 'success') {
            // Update order to paid
            await fetch(`/api/sumup/webhook?orderId=${orderId}`)
            setStatus('paid')
            clearInterval(pollRef.current)
            clearInterval(countdownRef.current)
            setTimeout(() => router.push(`/order/${orderId}/confirmed`), 1500)
          } else if (type === 'error' || type === 'fail') {
            setStatus('accepted') // Show widget again with error
          }
        },
      })
    }
    document.head.appendChild(script)
  }, [checkoutId])

  async function fetchOrder() {
    const { data } = await supabase.from('orders').select('*, restaurants(name, emoji, logo_url, delivery_time_mins, pickup_time_mins)').eq('id', orderId).single()
    if (data) setOrder(data)
  }

  function startCountdown() {
    countdownRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = TIMEOUT_SECS - elapsed
      if (remaining <= 0) {
        setSecondsLeft(0)
        setStatus('timeout')
        clearInterval(countdownRef.current)
        clearInterval(pollRef.current)
        supabase.from('orders').update({ status: 'cancelled', cancel_reason: 'timeout' }).eq('id', orderId)
        return
      }
      setSecondsLeft(remaining)
    }, 1000)
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/sumup/webhook?orderId=${orderId}`)
      const data = await res.json()
      if (data.status === 'paid') {
        clearInterval(pollRef.current)
        clearInterval(countdownRef.current)
        setStatus('paid')
        setTimeout(() => router.push(`/order/${orderId}/confirmed`), 1500)
      } else if (data.status === 'rejected' || data.status === 'cancelled') {
        clearInterval(pollRef.current)
        clearInterval(countdownRef.current)
        setStatus('rejected')
      } else if (data.status === 'waiting_payment' && data.paymentLink && !checkoutId) {
        // Extract checkout ID from payment link and show widget
        const id = data.sumupCheckoutId || data.paymentLink.split('/').pop()?.replace('c-', '')
        if (id) {
          clearInterval(countdownRef.current)
          setCheckoutId(id)
          setStatus('accepted')
        }
      }
    }, 5000)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timerDisplay = `${mins}:${secs.toString().padStart(2, '0')}`
  const progress = (secondsLeft / TIMEOUT_SECS) * 100
  const bg = dark ? '#080c14' : '#f8fafc'
  const card = dark ? '#0d1321' : '#ffffff'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const text = dark ? '#f1f5f9' : '#0f172a'
  const sub = dark ? '#64748b' : '#94a3b8'

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: dark ? '#060b18' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me.gg</span>
        </Link>
        {order && <div style={{ fontSize: '13px', color: sub }}>Order #{String(order.id).slice(-6).toUpperCase()}</div>}
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ maxWidth: '480px', width: '100%' }}>

          {status === 'waiting' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '140px', height: '140px', margin: '0 auto 28px', position: 'relative' }}>
                <svg viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)', width: '140px', height: '140px' }}>
                  <circle cx="70" cy="70" r="62" fill="none" stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="8" />
                  <circle cx="70" cy="70" r="62" fill="none" stroke="#22c55e" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 62}`}
                    strokeDashoffset={`${2 * Math.PI * 62 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{timerDisplay}</div>
                </div>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '14px' }}>Order sent to the restaurant!</h1>
              <p style={{ fontSize: '15px', color: sub, lineHeight: 1.7, marginBottom: '28px', maxWidth: '380px', margin: '0 auto 28px' }}>
                Waiting for the restaurant to accept your order...
              </p>
              {order && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {order.restaurants?.logo_url
                        ? <img src={order.restaurants.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '24px' }}>{order.restaurants?.emoji}</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{order.restaurants?.name}</div>
                      <div style={{ fontSize: '12px', color: sub }}>{order.order_type === 'delivery' ? `Delivery approx ${order.restaurants?.delivery_time_mins} mins` : `Collection approx ${order.restaurants?.pickup_time_mins} mins`}</div>
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${border}`, paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: sub }}>Order total</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'accepted' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '60px', height: '60px', background: 'rgba(34,197,94,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>✅</div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: '#22c55e' }}>Order accepted!</h1>
                <p style={{ fontSize: '14px', color: sub }}>Complete your payment below</p>
              </div>
              {/* SumUp Payment Widget */}
              <div id="sumup-card" style={{ background: card, borderRadius: '14px', padding: '16px', border: `1px solid ${border}` }}></div>
            </div>
          )}

          {status === 'paid' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(34,197,94,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '40px' }}>✅</div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#22c55e' }}>Payment confirmed!</h1>
              <p style={{ fontSize: '15px', color: sub }}>Redirecting to your order...</p>
            </div>
          )}

          {status === 'rejected' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(239,68,68,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px', color: '#ef4444' }}>✕</div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Order not accepted</h1>
              <p style={{ fontSize: '15px', color: sub, lineHeight: 1.6, marginBottom: '10px' }}>Sorry, the restaurant couldn't take your order right now.</p>
              <p style={{ fontSize: '15px', color: '#22c55e', fontWeight: 700, marginBottom: '28px' }}>You have not been charged.</p>
              <Link href="/" style={{ display: 'inline-block', padding: '14px 32px', background: '#22c55e', color: '#080c14', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
                Back to restaurants
              </Link>
            </div>
          )}

          {status === 'timeout' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(249,115,22,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px' }}>⏱</div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Restaurant didn't respond</h1>
              <p style={{ fontSize: '15px', color: sub, lineHeight: 1.6, marginBottom: '10px' }}>The restaurant didn't confirm your order in time. Your order has been automatically cancelled.</p>
              <p style={{ fontSize: '15px', color: '#22c55e', fontWeight: 700, marginBottom: '28px' }}>You have not been charged.</p>
              <Link href="/" style={{ display: 'inline-block', padding: '14px 32px', background: '#22c55e', color: '#080c14', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
                Back to restaurants
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
