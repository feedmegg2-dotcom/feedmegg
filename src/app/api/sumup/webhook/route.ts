import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const body = await request.json()
    console.log('SumUp webhook received:', JSON.stringify(body))

    const { event_type, payload } = body

    // Handle checkout status change - webhook is only a NOTIFICATION.
    // We never trust the payload's status directly; we always re-verify
    // with SumUp's API using our own API key before marking anything paid.
    if (event_type === 'CHECKOUT_STATUS_CHANGED' || body.status === 'PAID') {
      const reference = payload?.checkout_reference || body.checkout_reference
      const checkoutId = payload?.id || body.id

      let order = null
      if (checkoutId) {
        const { data } = await supabase.from('orders').select('*, restaurants(sumup_api_key)').eq('sumup_checkout_id', checkoutId).maybeSingle()
        order = data
      }
      if (!order && reference) {
        const orderNumber = reference.replace(/^ORDER-/, '')
        const { data } = await supabase.from('orders').select('*, restaurants(sumup_api_key)').eq('order_number', orderNumber).maybeSingle()
        order = data
      }

      if (!order) {
        return NextResponse.json({ success: true, note: 'order not found, ignored' })
      }

      if (order.paid_at) {
        return NextResponse.json({ success: true, note: 'already paid' })
      }

      if (!order.sumup_checkout_id || !order.restaurants?.sumup_api_key) {
        console.error('Webhook: missing checkout ID or API key, cannot verify - ignoring')
        return NextResponse.json({ success: true, note: 'cannot verify, ignored' })
      }

      // Re-verify directly with SumUp before trusting the webhook
      try {
        const verifyRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${order.sumup_checkout_id}`, {
          headers: { 'Authorization': `Bearer ${order.restaurants.sumup_api_key}` }
        })
        const checkout = await verifyRes.json()

        if (checkout.status === 'PAID') {
          // PRE-ORDERS stay 'pending' even once paid, so the merchant still
          // sees them in the Pre-Orders tab and must Accept/Reject when the
          // lead time arrives - we just record that payment has gone through
          // via paid_at, without touching status.
          const isPreOrder = !!order.scheduled_for
          await supabase.from('orders').update({
            status: isPreOrder ? order.status : 'paid',
            paid_at: new Date().toISOString(),
            sumup_payment_id: checkout.transaction_id || payload?.transaction_id || body.transaction_id,
          }).eq('id', order.id)
          console.log('Order verified and marked as paid:', order.id, isPreOrder ? '(pre-order, status unchanged)' : '')
        } else {
          console.log('Webhook claimed paid but SumUp verification returned:', checkout.status)
        }
      } catch (verifyError) {
        console.error('SumUp verification request failed:', verifyError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('orders')
    .select('*, restaurants(sumup_api_key)')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Unpaid pre-order whose payment link has expired - close it out so it
  // never sits forever as an invisible unpaid order.
  if (
    order.status === 'pending' &&
    order.scheduled_for &&
    order.payment_method === 'card' &&
    !order.paid_at &&
    order.payment_link_expires_at &&
    new Date(order.payment_link_expires_at).getTime() < Date.now()
  ) {
    await supabase.from('orders').update({
      status: 'cancelled',
      cancel_reason: 'Pre-order payment was never completed',
      cancelled_at: new Date().toISOString(),
    }).eq('id', orderId)
    return NextResponse.json({ status: 'cancelled' })
  }

  if (order.paid_at) return NextResponse.json({ status: order.status === 'pending' ? 'paid' : order.status, paymentLink: order.sumup_link })

  if (order.sumup_checkout_id && order.restaurants?.sumup_api_key) {
    try {
      const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${order.sumup_checkout_id}`, {
        headers: { 'Authorization': `Bearer ${order.restaurants.sumup_api_key}` }
      })
      const checkout = await response.json()
      if (checkout.status === 'PAID') {
        const isPreOrder = !!order.scheduled_for
        await supabase.from('orders').update({
          status: isPreOrder ? order.status : 'paid',
          paid_at: new Date().toISOString(),
        }).eq('id', orderId)
        return NextResponse.json({ status: 'paid', paymentLink: order.sumup_link })
      }
      if (checkout.status === 'FAILED') {
        await supabase.from('orders').update({ status: 'cancelled', cancel_reason: 'Payment failed' }).eq('id', orderId)
        return NextResponse.json({ status: 'cancelled' })
      }
    } catch (e) {
      console.error('SumUp status check failed:', e)
    }
  }

  return NextResponse.json({ status: order.status, paymentLink: order.sumup_link, sumupCheckoutId: order.sumup_checkout_id })
}
