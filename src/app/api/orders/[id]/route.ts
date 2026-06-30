import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { generatePaymentLink, fetchExistingCheckout } from '@/lib/sumup'
import { sendOrderConfirmation, sendOrderRejection } from '@/lib/email'

// PATCH /api/orders/[id]/accept
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient()
  const body = await request.json()
  const { action, estimatedWaitMins, rejectionReason, removedItems } = body
  const orderId = params.id

  // Get order with restaurant and merchant details
  const { data: order } = await supabase
    .from('orders')
    .select('*, restaurants(*, merchants(*))')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (action === 'accept') {
    // Remove any unchecked items and recalculate total
    if (removedItems && removedItems.length > 0) {
      await supabase
        .from('order_items')
        .delete()
        .in('id', removedItems)

      // Recalculate subtotal
      const { data: remainingItems } = await supabase
        .from('order_items')
        .select('subtotal')
        .eq('order_id', orderId)

      const newSubtotal = remainingItems?.reduce((s, i) => s + i.subtotal, 0) || 0
      const newTotal = newSubtotal + order.delivery_fee + order.tip - order.discount

      await supabase
        .from('orders')
        .update({ subtotal: newSubtotal, total: newTotal })
        .eq('id', orderId)
    }

    // Generate SumUp payment link (for card payments only) - but skip
    // entirely if this is a pre-order that's already been paid ahead of
    // time, otherwise we'd charge the customer a second time.
    let paymentLink = null
    let paymentLinkExpiresAt = null
    let sumupCheckoutId = order.sumup_checkout_id || null
    const alreadyPaidInAdvance = !!order.paid_at

    if (order.payment_method === 'card' && !alreadyPaidInAdvance) {
      const restaurant = order.restaurants

      console.log('SumUp debug - restaurant:', JSON.stringify({
        id: restaurant?.id,
        hasApiKey: !!restaurant?.sumup_api_key,
        hasMerchantCode: !!restaurant?.sumup_merchant_code,
        apiKeyStart: restaurant?.sumup_api_key?.substring(0, 10),
      }))

      if (restaurant?.sumup_api_key && restaurant?.sumup_merchant_code) {
        try {
          const linkData = await generatePaymentLink({
            orderId: order.id,
            orderNumber: order.order_number,
            amount: order.total,
            merchantApiKey: restaurant.sumup_api_key,
            merchantCode: restaurant.sumup_merchant_code,
            customerEmail: order.customer_email,
            restaurantName: restaurant.name,
          })
          paymentLink = linkData.paymentUrl
          paymentLinkExpiresAt = linkData.expiresAt
          sumupCheckoutId = linkData.checkoutId
          console.log('SumUp link generated:', paymentLink)
        } catch (error: any) {
          console.error('SumUp link generation failed:', error)
          // If duplicate, fetch the existing checkout
          if (error.message?.includes('DUPLICATED_CHECKOUT')) {
            try {
              const existing = await fetchExistingCheckout(`ORDER-${order.order_number}`, restaurant.sumup_api_key)
              if (existing) {
                paymentLink = existing.paymentUrl
                sumupCheckoutId = existing.checkoutId
                console.log('Using existing SumUp checkout:', paymentLink)
              }
            } catch (e2) {
              console.error('Failed to fetch existing checkout:', e2)
            }
          }
        }
      } else {
        console.error('SumUp credentials missing - apiKey:', !!restaurant?.sumup_api_key, 'merchantCode:', !!restaurant?.sumup_merchant_code)
      }
    }

    // Update order status to accepted
    await supabase
      .from('orders')
      .update({
        status: alreadyPaidInAdvance ? 'paid' : (order.payment_method === 'card' ? 'waiting_payment' : 'paid'),
        estimated_wait_mins: estimatedWaitMins,
        accepted_at: new Date().toISOString(),
        sumup_link: paymentLink || order.sumup_link,
        sumup_checkout_id: sumupCheckoutId,
        payment_link_sent_at: paymentLink ? new Date().toISOString() : order.payment_link_sent_at,
        payment_link_expires_at: paymentLinkExpiresAt,
      })
      .eq('id', orderId)

    // For cash orders — mark as paid immediately and send confirmation
    if (order.payment_method === 'cash') {
      await supabase
        .from('orders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', orderId)
    }

    return NextResponse.json({
      success: true,
      paymentLink: paymentLink || order.sumup_link,
      paymentLinkExpiresAt,
      message: alreadyPaidInAdvance
        ? 'Order accepted. Customer already paid in advance.'
        : order.payment_method === 'card'
          ? 'Order accepted. Payment link sent to customer.'
          : 'Order accepted. Cash payment on delivery.',
    })

  } else if (action === 'reject') {
    const wasPaidByCard = (order.status === 'paid' || order.status === 'waiting_payment') && order.payment_method === 'card'

    // Refunds are always processed manually by staff in the SumUp dashboard/app.
    // This route never calls SumUp's refund API - it just records the rejection
    // and tells the customer to expect a refund if they were charged by card.

    await supabase
      .from('orders')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (order.customer_email) {
      sendOrderRejection({
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        orderNumber: order.order_number,
        restaurantName: order.restaurants?.name || 'the restaurant',
        total: order.total,
        reason: rejectionReason,
        wasRefunded: wasPaidByCard,
      }).catch(err => console.error('Rejection email error:', err))
    }

    return NextResponse.json({
      success: true,
      manualRefundNeeded: wasPaidByCard,
      message: wasPaidByCard
        ? 'Order rejected. Customer notified - please issue the refund manually in your SumUp dashboard.'
        : 'Order rejected. Customer has been notified.',
    })

  } else if (action === 'complete') {
    await supabase
      .from('orders')
      .update({
        status: 'complete',
        completed_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    // Update restaurant total orders count
    await supabase.rpc('increment_restaurant_orders', { rest_id: order.restaurant_id })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
