import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { issueRefund } from '@/lib/sumup'
import { sendOrderRejection } from '@/lib/email'
import { requireAdmin, requireMerchantForRestaurant } from '@/lib/adminAuth'
import { logSystemError } from '@/lib/errorLog'

// PIN-gated refund action. Once the correct refund PIN is entered on the
// terminal, this route automatically calls SumUp's refund API to send the
// money back to the customer's card - no manual step in the SumUp
// dashboard required. If the SumUp API call itself fails (network issue,
// account lacks refund permission, transaction too old, etc), the order is
// still marked as needing a refund and staff are told to action it
// manually as a fallback, rather than the whole request failing silently.
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

  // Attempt the real SumUp refund automatically for card payments. Cash
  // payments were never collected through SumUp, so there's nothing to
  // call - just record it.
  let sumupRefunded = false
  let sumupError: string | null = null
  if (order.payment_method === 'card') {
    if (!order.sumup_payment_id) {
      sumupError = 'No SumUp transaction ID on this order - cannot auto-refund'
    } else if (!order.restaurants?.sumup_api_key) {
      sumupError = 'No SumUp API key configured for this restaurant'
    } else {
      try {
        await issueRefund({
          transactionId: order.sumup_payment_id,
          amount: refundAmount,
          reason: combinedReason || 'Refund issued by restaurant',
          merchantApiKey: order.restaurants.sumup_api_key,
        })
        sumupRefunded = true
      } catch (e: any) {
        sumupError = e.message || 'SumUp refund request failed'
        console.error('SumUp auto-refund failed for order', orderId, e)
        logSystemError({
          source: 'refund',
          message: 'Automatic SumUp refund failed - manual refund required',
          details: { error: e.message, refundAmount },
          orderId,
          restaurantId: order.restaurant_id,
        })
      }
    }
  }

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

  const manualRefundNeeded = order.payment_method === 'card' && !sumupRefunded

  return NextResponse.json({
    success: true,
    isFullRefund,
    refundAmount,
    totalRefunded: newTotalRefunded,
    sumupRefunded,
    manualRefundNeeded,
    message: order.payment_method === 'cash'
      ? `${isFullRefund ? 'Order marked as fully refunded' : `GBP${refundAmount.toFixed(2)} marked as refunded`}. Cash was never collected, so no money movement is needed.`
      : sumupRefunded
        ? `GBP${refundAmount.toFixed(2)} has been refunded to the customer's card via SumUp.`
        : `${isFullRefund ? 'Order marked as fully refunded' : `GBP${refundAmount.toFixed(2)} marked as refunded`}, but the automatic SumUp refund failed (${sumupError}). Please process this refund manually in your SumUp dashboard.`,
  })
}
