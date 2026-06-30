import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, delivery_fee, opening_time, closing_time, delivery_time_mins } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing restaurant ID' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updateData: any = {}
    if (delivery_fee !== undefined) updateData.delivery_fee = delivery_fee
    if (opening_time !== undefined) updateData.opening_time = opening_time
    if (closing_time !== undefined) updateData.closing_time = closing_time
    if (delivery_time_mins !== undefined) updateData.delivery_time_mins = delivery_time_mins

    const { data, error } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
