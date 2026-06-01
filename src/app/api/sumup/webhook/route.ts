import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const body = await request.json()
    const { event_type, payload } = body
    if (event_type === 'CHECKOUT_STATUS_CHANGED' && payload.status === 'PAID') {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', payload.checkout_reference)
        .single()
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      if (order.status === 'paid') return NextResponse.json({ success: true })
      await supabase.from('orders').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        sumup_payment_id: payload.transaction_id,
      }).eq('id', order.id)
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
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
    .select('status, sumup_link, payment_link_expires_at, payment_retries')
    .eq('id', orderId)
    .single()
  return NextResponse.json({ status: order?.status, paymentLink: order?.sumup_link })
}
