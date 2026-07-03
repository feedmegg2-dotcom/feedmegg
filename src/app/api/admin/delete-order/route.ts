import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'

// Permanently deletes an order and its line items. This is a genuine,
// irreversible delete - intended for clearing out test/junk orders, not
// for cancelling a real customer order (use the reject/cancel flow for
// that, which properly notifies the customer and handles refunds).
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Order id required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: order } = await supabase.from('orders').select('id, order_number').eq('id', id).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  await supabase.from('order_items').delete().eq('order_id', id)
  const { error: deleteError } = await supabase.from('orders').delete().eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, orderNumber: order.order_number })
}
