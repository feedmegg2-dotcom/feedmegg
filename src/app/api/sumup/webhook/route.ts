import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendOrderConfirmation } from '@/lib/email'

// POST /api/sumup/webhook
// SumUp calls this when payment status changes
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const { event_type, payload } = body

    // Handle checkout completed event
    if (event_type === 'CHECKOUT_STATUS_CHANGED' && payload.status === 'PAID') {
      const checkoutReference = payload.checkout_reference // this is our order_number
      
      // Find the order
      const { data: order } = await supabase
        .from('orders')
        .select('*, restaurants(*, merchants(*))')
        .eq('order_number', checkoutReference)
        .single()

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      if (order.status === 'paid') {
        // Already marked as paid (duplicate webhook)
        return NextResponse.json({ success: true })
      }

      // Mark order as paid
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          sumup_payment_id: payload.transaction_id,
        })
        .eq('id', order.id)

      // Get order items for email
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      // Send confirmation email to customer
      await sendOrderConfirmation({
        customerEmail: order.customer_email,
        customerName: order.customer_name,
        orderNumber: order.order_number,
        restaurantName: order.restaurants?.name || '',
        items: orderItems?.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })) || [],
        subtotal: order.subtotal,
        deliveryFee: order.delivery_fee,
        tip: order.tip,
        total: order.total,
        orderType: order.order_type,
        deliveryAddress: order.delivery_address,
        what3words: order.delivery_what3words,
        estimatedWait: order.estimated_wait_mins,
        customMessage: order.restaurants?.custom_message,
      })

      return NextResponse.json({ success: true })
    }

    // Handle failed/expired payment
    if (event_type === 'CHECKOUT_STATUS_CHANGED' && 
        ['FAILED', 'EXPIRED'].includes(payload.status)) {
      
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', payload.checkout_reference)
        .single()

      if (order && order.payment_retries < 3) {
        // Increment retry count — customer can try again
        await supabase
          .from('orders')
          .update({ payment_retries: order.payment_retries + 1 })
          .eq('id', order.id)
      } else if (order) {
        // Too many retries — cancel order
        await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            rejection_reason: 'Payment failed after 3 attempts',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', order.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('SumUp webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Also handle payment status polling (backup for if webhook fails)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')

  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('orders')
    .select('status, sumup_link, payment_link_expires_at, payment_retries')
    .eq('id', orderId)
    .single()

  return NextResponse.json({ 
    status: order?.status,
    paymentLink: order?.sumup_link,
    expiresAt: order?.payment_link_expires_at,
    retries: order?.payment_retries,
  })
}
