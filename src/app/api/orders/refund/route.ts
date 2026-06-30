import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendOrderRejection } from '@/lib/email'
import { requireAdmin, requireMerchantForRestaurant } from '@/lib/adminAuth'

// This route NEVER calls SumUp's refund API. Refunds are always processed
// manually by staff in the SumUp dashboard/app. This route exists purely to:
// 1. Gate the action behind a PIN so only authorised staff can mark an order refunded
// 2. Record the refund (full or partial) against the order for reporting/audit purposes
// 3. Notify the customer by email that a refund is on its way
//
// `amount` is optional. If omitted, or equal to the order total, this is a
// FULL refund and the order status moves to 'refunded'. If a smaller amount
// is given, this is a PARTIAL refund - the order's existing status is left
// alone (it's still a real, fulfilled order) but refund_amount/refunded_at
// are recorded so it's clear some money has gone back to the customer.
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const { orderId, pin, reason, amount, refundedItems } = await request.json()

  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 })

  const { data: order } = await supabase
    .from('orders')
    .select('*, restaurants(*, merchants(*))')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Authenticate the caller is an admin OR a logged-in merchant for this restaurant
  const admin = await requireAdmin()
  if (!admin) {
    const merchantOk = await requireMerchantForRestaurant(order.restaurant_id)
    if (!merchantOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the refund PIN matches this merchant's set PIN
  const merchantPin = order.restaurants?.merchants?.refund_pin
  if (!merchantPin) {
    return NextResponse.json({ error: 'No refund PIN has been set up for this account. Set one in your merchant settings first.' }, { status: 400 })
  }
  if (pin !== merchantPin) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 403 })
  }

  if (!['paid', 'waiting_payment', 'accepted', 'complete'].includes(order.status)) {
    return NextResponse.json({ error: `Cannot refund an order with status "${order.status}"` }, { status: 400 })
  }

  const alreadyRefunded = order.refund_amount || 0
  const remainingRefundable = order.total - alreadyRefunded

  if (remainingRefundable <= 0) {
    return NextResponse.json({ error: 'This order has already been fully refunded' }, { status: 400 })
  }

  const refundAmount = amount !== undefined && amount !== null
    ? parseFloat(amount)
    : remainingRefundable

  if (isNaN(refundAmount) || refundAmount <= 0) {
    return NextResponse.json({ error: 'Refund amount must be greater than zero' }, { status: 400 })
  }
  if (refundAmount > remainingRefundable + 0.001) {
    return NextResponse.json({ error: `Refund amount cannot exceed the remaining refundable balance of GBP${remainingRefundable.toFixed(2)}` }, { status: 400 })
  }

  const newTotalRefunded = alreadyRefunded + refundAmount
  const isFullRefund = newTotalRefunded >= order.total - 0.001

  const itemsNote = Array.isArray(refundedItems) && refundedItems.length > 0
    ? `Items refunded: ${refundedItems.join(', ')}`
    : null
  const combinedReason = [reason, itemsNote].filter(Boolean).join(' — ') || undefined

  const updates: any = {
    refund_amount: newTotalRefunded,
    refunded_at: new Date().toISOString(),
  }
  if (isFullRefund) {
    updates.status = 'refunded'
    updates.rejection_reason = combinedReason || 'Refunded by restaurant'
    updates.cancelled_at = new Date().toISOString()
  } else if (combinedReason) {
    // Keep a note of the most recent partial refund reason even though the
    // order stays active, so staff have an audit trail without losing status
    updates.rejection_reason = combinedReason
  }

  await supabase.from('orders').update(updates).eq('id', orderId)

  if (order.customer_email) {
    sendOrderRejection({
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      orderNumber: order.order_number,
      restaurantName: order.restaurants?.name || 'the restaurant',
      total: refundAmount,
      reason: combinedReason,
      wasRefunded: order.payment_method === 'card',
      isPartial: !isFullRefund,
    }).catch(err => console.error('Refund email error:', err))
  }

  return NextResponse.json({
    success: true,
    isFullRefund,
    refundAmount,
    totalRefunded: newTotalRefunded,
    message: order.payment_method === 'cash'
      ? `${isFullRefund ? 'Order marked as fully refunded' : `GBP${refundAmount.toFixed(2)} marked as refunded`}. Cash was never collected, so no money movement is needed.`
      : `${isFullRefund ? 'Order marked as fully refunded' : `GBP${refundAmount.toFixed(2)} marked as refunded`}. Please process the refund manually in your SumUp dashboard - the customer has been notified to expect it within 48 hours.`,
  })
}
