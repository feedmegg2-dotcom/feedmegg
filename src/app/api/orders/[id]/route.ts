import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { generatePaymentLink, fetchExistingCheckout } from '@/lib/sumup'
import { getSumupAccountForNewPayment, getSumupAccountForOrder } from '@/lib/sumupAccount'
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

    // Generate SumUp payment link (card payments only). Skip entirely if the
    // customer already paid in advance, otherwise they'd be charged twice.
    let paymentLink = null
    let paymentLinkExpiresAt = null
    let sumupCheckoutId = order.sumup_checkout_id || null
    let paymentAccountLabel: string | null = order.payment_account || null
    const alreadyPaidInAdvance = !!order.paid_at

    if (order.payment_method === 'card' && !alreadyPaidInAdvance) {
      const restaurant = order.restaurants

      // Use the account recorded at checkout, so the payment matches the one
      // used when the order was placed. Older orders have none recorded, so
      // they use the restaurant's own keys, or the platform default.
      const account = order.payment_account
        ? await getSumupAccountForOrder(order.payment_account, restaurant || {})
        : await getSumupAccountForNewPayment(restaurant || {})

      if (!account) {
        console.error('No SumUp account available for order', order.id)
      } else {
        paymentAccountLabel = account.label
        try {
          const linkData = await generatePaymentLink({
            orderId: order.id,
            orderNumber: order.order_number,
            amount: order.total,
            merchantApiKey: account.apiKey,
            merchantCode: account.merchantCode,
            customerEmail: order.customer_email,
            restaurantName: restaurant?.name || '',
          })
          paymentLink = linkData.paymentUrl
          paymentLinkExpiresAt = linkData.expiresAt
          sumupCheckoutId = linkData.checkoutId
        } catch (error: any) {
          console.error('SumUp link generation failed:', error)
          // If duplicate, fetch the existing checkout
          if (error.message?.includes('DUPLICATED_CHECKOUT')) {
            try {
              const existing = await fetchExistingCheckout(`ORDER-${order.order_number}`, account.apiKey)
              if (existing) {
                paymentLink = existing.paymentUrl
                sumupCheckoutId = existing.checkoutId
              }
            } catch (e2) {
              console.error('Failed to fetch existing checkout:', e2)
            }
          }
        }
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
        payment_account: paymentAccountLabel,
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
    // IMPORTANT: 'waiting_payment' means a payment link was sent but the
    // customer has NOT actually paid yet - no money has moved. Only
    // order.paid_at being set (or status 'paid'/'complete') means a real
    // charge exists that would need refunding. Treating 'waiting_payment'
    // as "already paid" here would wrongly tell both the customer and
    // staff that a refund is needed for a charge that never happened.
    const wasPaidByCard = !!order.paid_at && order.payment_method === 'card'

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
