import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const body = await request.json()
    console.log('SumUp webhook received:', JSON.stringify(body))
    
    const { event_type, payload } = body
    
    // Handle checkout status change
    if (event_type === 'CHECKOUT_STATUS_CHANGED' || body.status === 'PAID') {
      const reference = payload?.checkout_reference || body.checkout_reference
      const checkoutId = payload?.id || body.id
      
      // Find order by checkout ID or reference
      let order = null
      if (checkoutId) {
        const { data } = await supabase.from('orders').select('*').eq('sumup_checkout_id', checkoutId).single()
        order = data
      }
      if (!order && reference) {
        const orderNumber = reference.replace(/^ORDER-/, '')
        const { data } = await supabase.from('orders').select('*').eq('order_number', orderNumber).single()
        order = data
      }
      
      if (order && order.status !== 'paid') {
        await supabase.from('orders').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          sumup_payment_id: payload?.transaction_id || body.transaction_id,
        }).eq('id', order.id)
        console.log('Order marked as paid:', order.id)
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
    .single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // If already paid, return immediately
  if (order.status === 'paid') return NextResponse.json({ status: 'paid', paymentLink: order.sumup_link })

  // Poll SumUp for checkout status
  if (order.sumup_checkout_id && order.restaurants?.sumup_api_key) {
    try {
      const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${order.sumup_checkout_id}`, {
        headers: { 'Authorization': `Bearer ${order.restaurants.sumup_api_key}` }
      })
      const checkout = await response.json()
      if (checkout.status === 'PAID') {
        await supabase.from('orders').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        }).eq('id', orderId)
        return NextResponse.json({ status: 'paid', paymentLink: order.sumup_link })
      }
    } catch (e) {
      console.error('SumUp status check failed:', e)
    }
  }

  return NextResponse.json({ status: order.status, paymentLink: order.sumup_link })
}
