import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { orderId } = await request.json()

    // Get order with restaurant sumup key
    const { data: order } = await supabase
      .from('orders')
      .select('*, restaurants(sumup_api_key, name)')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!order.sumup_checkout_id) return NextResponse.json({ status: 'pending' })

    // Check SumUp checkout status
    const res = await fetch(`https://api.sumup.com/v0.1/checkouts/${order.sumup_checkout_id}`, {
      headers: { 'Authorization': `Bearer ${order.restaurants.sumup_api_key}` }
    })

    const data = await res.json()

    if (data.status === 'PAID') {
      // PRE-ORDERS stay 'pending' even once paid, so they still require the
      // merchant to Accept/Reject when the lead time arrives.
      const isPreOrder = !!order.scheduled_for
      await supabase.from('orders').update({
        status: isPreOrder ? order.status : 'paid',
        paid_at: new Date().toISOString(),
        sumup_payment_id: data.transaction_id || data.transactions?.[0]?.id || null,
      }).eq('id', orderId)
      return NextResponse.json({ status: 'paid', order, isPreOrder })
    }

    if (data.status === 'FAILED' || data.status === 'EXPIRED') {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
      return NextResponse.json({ status: 'failed' })
    }

    return NextResponse.json({ status: 'pending' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
