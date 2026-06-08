'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const TIMEOUT_SECS = 120

export default function WaitingPage() {
  const params = useParams()
  const orderId = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const [order, setOrder] = useState<any>(null)
  const [status, setStatus] = useState<'loading'|'waiting'|'accepted'|'rejected'|'timeout'>('loading')
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECS)
  const [dark, setDark] = useState(true)
  const pollRef = useRef<any>(null)
  const countdownRef = useRef<any>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
    loadOrderThenStart()
    return () => {
      clearInterval(pollRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  async function loadOrderThenStart() {
    // Load order first so we know payment method before showing anything
    const { data } = await supabase
      .from('orders')
      .select('*, restaurants(name, emoji, logo_url, delivery_time_mins, pickup_time_mins, slug)')
      .eq('id', orderId)
      .single()
    
    if (!data) {
      setStatus('timeout')
      return
    }

    setOrder(data)
    setStatus('waiting')
    startCountdown(data)
    startPolling(data.payment_method)
  }

  function startCountdown(orderData: any) {
    countdownRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = TIMEOUT_SECS - elapsed
      
      if (remaining <= 0) {
        // Check ONCE MORE before cancelling - race condition protection
        const { data } = await supabase
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single()
        
        if (data && ['accepted', 'waiting_payment', 'paid'].includes(data.status)) {
          // Already accepted - don't cancel
          clearInterval(countdownRef.current)
          return
        }
        
        // Truly timed out
        clearInterval(countdownRef.current)
        clearInterval(pollRef.current)
        setSecondsLeft(0)
        setStatus('timeout')
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', orderId)
          .eq('status', 'pending') // Only cancel if still pending
        return
      }
      
      setSecondsLeft(remaining)
    }, 1000)
  }

  function startPolling(paymentMethod: string) {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, sumup_link, payment_method, rejection_reason, restaurant_id, restaurants(name, emoji, logo_url, delivery_time_mins, pickup_time_mins, slug)')
        .eq('id', orderId)
        .single()
      
      if (!data) return

      // CASH ORDER - accepted or paid = confirmed
      if (data.payment_method === 'cash' && (data.status === 'paid' || data.status === 'accepted')) {
        clearInterval(pollRef.current)
        clearInterval(countdownRef.current)
        localStorage.removeItem('feedme-cart')
        setStatus('accepted')
        return
      }

      // CARD ORDER - wait for payment link then redirect to SumUp
      if (data.payment_method === 'card' && data.status === 'waiting_payment' && data.sumup_link) {
        clearInterval(pollRef.current)
        clearInterval(countdownRef.current)
        localStorage.removeItem('feedme-cart')
        setStatus('accepted')
        setTimeout(() => { window.location.href = data.sumup_link }, 1500)
        return
      }

      // REJECTED
      if (data.status === 'rejected') {
        clearInterval(pollRef.current)
        clearInterval(countdownRef.current)
        // Fresh fetch to get all data including rejection_reason
        const { data: fresh } = await supabase
          .from('orders')
          .select('*, restaurants(name, emoji, logo_url, delivery_time_mins, pickup_time_mins, slug)')
          .eq('id', orderId)
          .single()
        if (fresh) setOrder(fresh)
        setStatus('rejected')
        return
      }

      // CANCELLED (timed out from another session)
      if (data.status === 'cancelled') {
        clearInterval(pollRef.current)
        clearInterval(countdownRef.current)
        setStatus('timeout')
        return
      }

    }, 1500)
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

  if (status === 'loading') {
    return (
      <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sub, fontFamily: 'system-ui,sans-serif' }}>
        Loading your order...
      </div>
    )
  }

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

          {/* WAITING */}
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
              <p style={{ fontSize: '15px', color: sub, lineHeight: 1.7, marginBottom: '6px', maxWidth: '380px', margin: '0 auto 6px' }}>
                {order?.payment_method === 'cash'
                  ? `Waiting for the restaurant to confirm. You'll pay GBP${order?.total?.toFixed(2)} cash ${order?.order_type === 'delivery' ? 'on delivery' : 'on collection'}.`
                  : 'Once accepted you will be taken to the payment page to complete your order.'
                }
              </p>
              <p style={{ fontSize: '13px', color: dark ? '#334155' : '#94a3b8', marginBottom: '28px' }}>This usually takes less than a minute</p>

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
                      <div style={{ fontSize: '12px', color: sub }}>
                        {order.order_type === 'delivery' 
                          ? `Delivery approx ${order.restaurants?.delivery_time_mins} mins` 
                          : `Collection approx ${order.restaurants?.pickup_time_mins} mins`}
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${border}`, paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: sub }}>Order total</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</span>
                  </div>
                  <div style={{ paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: sub }}>Payment</span>
                    <span style={{ fontWeight: 600, color: order.payment_method === 'cash' ? '#f97316' : '#3b82f6' }}>
                      {order.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACCEPTED */}
          {status === 'accepted' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(34,197,94,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px' }}>✅</div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#22c55e' }}>Order confirmed!</h1>
              <p style={{ fontSize: '15px', color: sub, lineHeight: 1.6, marginBottom: '20px' }}>
                {order?.payment_method === 'cash'
                  ? `Your order is confirmed. Please have GBP${order?.total?.toFixed(2)} cash ready ${order?.order_type === 'delivery' ? 'when your order arrives' : 'when you collect'}.`
                  : 'Taking you to payment now...'
                }
              </p>
              {order && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '16px', textAlign: 'left', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: sub, marginBottom: '8px' }}>{order.restaurants?.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {order?.payment_method === 'cash' && (
                <Link href="/" style={{ display: 'inline-block', padding: '14px 32px', background: '#22c55e', color: '#080c14', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
                  Done
                </Link>
              )}
            </div>
          )}

          {/* REJECTED */}
          {status === 'rejected' && (() => {
            const rawReason = order?.rejection_reason || ''
            const reason = rawReason.toLowerCase().trim()
            
            console.log('Rejection reason:', rawReason, '| Lowered:', reason)
            
            const isOutOfStock = reason.includes('stock') || reason.includes('out of')
            const isTooBusy = reason.includes('busy')
            const isClosing = reason.includes('clos') || reason.includes('early')
            const isZone = reason.includes('zone') || reason.includes('area') || reason.includes('deliver')
            const isTechnical = reason.includes('technical') || reason.includes('issue')
            const isCustomerCancel = reason.includes('customer') || reason.includes('cancel')

            let emoji = '❌'
            let headline = 'Order not accepted'
            let message = 'Sorry, the restaurant couldn\'t take your order right now.'

            if (isOutOfStock) {
              emoji = '🛒'
              headline = 'Items unavailable'
              message = 'Sorry, one or more items you ordered aren\'t available today. Try browsing the menu to see what\'s on offer.'
            } else if (isTooBusy) {
              emoji = '🍳'
              headline = 'Restaurant is really busy!'
              message = 'The restaurant is really busy right now but you can schedule a pre-order for later!'
            } else if (isClosing) {
              emoji = '🔒'
              headline = 'Restaurant closing early'
              message = 'The restaurant is closing early today. Why not pre-order for tomorrow?'
            } else if (isZone) {
              emoji = '📍'
              headline = 'Outside delivery area'
              message = 'Sorry, your address is outside this restaurant\'s delivery area. Try collection or browse nearby restaurants.'
            } else if (isTechnical) {
              emoji = '⚙️'
              headline = 'Technical difficulties'
              message = 'The restaurant is having technical difficulties. Please try again shortly.'
            } else if (isCustomerCancel) {
              emoji = '✅'
              headline = 'Order cancelled'
              message = 'Your order has been cancelled. We hope to see you again soon!'
            }

            return (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '60px', marginBottom: '16px' }}>{emoji}</div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>{headline}</h1>
                <p style={{ fontSize: '15px', color: sub, lineHeight: 1.7, marginBottom: '6px', maxWidth: '360px', margin: '0 auto 20px' }}>
                  {message}
                </p>
                <p style={{ fontSize: '14px', color: '#22c55e', fontWeight: 700, marginBottom: '24px' }}>
                  You have not been charged.
                </p>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                  {/* Out of stock - browse menu */}
                  {isOutOfStock && order?.restaurants?.slug && (
                    <Link href={`/restaurant/${order.restaurants.slug}`} style={{ display: 'block', padding: '16px 20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '14px', textDecoration: 'none', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '28px' }}>🍽️</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e', marginBottom: '3px' }}>Browse the menu</div>
                          <div style={{ fontSize: '12px', color: sub }}>See what's available today</div>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Too busy or technical - pre-order + try again */}
                  {(isTooBusy || isTechnical) && (
                    <Link href="/checkout?preorder=true" style={{ display: 'block', padding: '16px 20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '14px', textDecoration: 'none', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '28px' }}>📅</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e', marginBottom: '3px' }}>Schedule a Pre-Order</div>
                          <div style={{ fontSize: '12px', color: sub }}>Pick a time slot that works for you</div>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Closing - pre-order tomorrow */}
                  {isClosing && (
                    <Link href="/checkout?preorder=true" style={{ display: 'block', padding: '16px 20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '14px', textDecoration: 'none', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '28px' }}>📅</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e', marginBottom: '3px' }}>Pre-Order for tomorrow</div>
                          <div style={{ fontSize: '12px', color: sub }}>Schedule for when they reopen</div>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Zone - switch to collection */}
                  {isZone && order?.restaurants?.slug && (
                    <Link href={`/restaurant/${order.restaurants.slug}?type=pickup`} style={{ display: 'block', padding: '16px 20px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '14px', textDecoration: 'none', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '28px' }}>🏪</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#3b82f6', marginBottom: '3px' }}>Switch to collection</div>
                          <div style={{ fontSize: '12px', color: sub }}>Pick up your order instead</div>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Try again - busy or technical */}
                  {(isTooBusy || isTechnical) && (
                    <TryAgainButton restaurantSlug={order?.restaurants?.slug} dark={dark} sub={sub} card={card} border={border} />
                  )}

                  {/* Browse other restaurants - always show */}
                  <Link href="/" style={{ display: 'block', padding: '16px 20px', background: card, border: `1px solid ${border}`, borderRadius: '14px', textDecoration: 'none', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '28px' }}>🏠</div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: text, marginBottom: '3px' }}>Browse other restaurants</div>
                        <div style={{ fontSize: '12px', color: sub }}>Find somewhere else to order from</div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )
          })()}

          {/* TIMEOUT */}
          {status === 'timeout' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '60px', marginBottom: '16px' }}>🍳</div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Restaurant is busy right now!</h1>
              <p style={{ fontSize: '15px', color: sub, lineHeight: 1.7, marginBottom: '6px', maxWidth: '360px', margin: '0 auto 6px' }}>
                They're likely preparing other orders right now.
              </p>
              <p style={{ fontSize: '13px', color: sub, marginBottom: '28px' }}>
                You have not been charged.
              </p>

              <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                {/* PRE-ORDER OPTION */}
                {order?.restaurant_id && (
                  <Link href={`/checkout?preorder=true`} style={{ display: 'block', padding: '16px 20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '14px', textDecoration: 'none', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '28px' }}>📅</div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e', marginBottom: '3px' }}>Schedule a Pre-Order</div>
                        <div style={{ fontSize: '12px', color: sub }}>Pick a time slot that works for you</div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* TRY AGAIN OPTION */}
                <TryAgainButton orderId={orderId} cartData={order?.items} restaurantId={order?.restaurant_id} restaurantSlug={order?.restaurants?.slug} dark={dark} sub={sub} card={card} border={border} />

                {/* BROWSE OPTION */}
                <Link href="/" style={{ display: 'block', padding: '16px 20px', background: card, border: `1px solid ${border}`, borderRadius: '14px', textDecoration: 'none', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '28px' }}>🏠</div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: text, marginBottom: '3px' }}>Browse other restaurants</div>
                      <div style={{ fontSize: '12px', color: sub }}>Find somewhere else to order from</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function TryAgainButton({ orderId, cartData, restaurantId, restaurantSlug, dark, sub, card, border }: any) {
  const [countdown, setCountdown] = useState(600)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); setReady(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60
  const href = restaurantSlug ? `/restaurant/${restaurantSlug}` : '/'

  return (
    <div onClick={ready ? () => { window.location.href = href } : undefined} 
      style={{ padding: '16px 20px', background: ready ? 'rgba(59,130,246,0.08)' : card, border: `1px solid ${ready ? 'rgba(59,130,246,0.2)' : border}`, borderRadius: '14px', textAlign: 'left', cursor: ready ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '28px' }}>{ready ? '🔄' : '⏱️'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: ready ? '#3b82f6' : sub, marginBottom: '3px' }}>
            {ready ? 'Try ordering again' : 'Try again soon'}
          </div>
          <div style={{ fontSize: '12px', color: sub }}>
            {ready ? 'Restaurant may be less busy now' : `Available in ${mins}:${String(secs).padStart(2,'0')}`}
          </div>
        </div>
        {ready && <div style={{ fontSize: '18px', color: '#3b82f6' }}>→</div>}
      </div>
    </div>
  )
}
