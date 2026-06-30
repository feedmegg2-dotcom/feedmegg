import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin, requireMerchantForRestaurant } from '@/lib/adminAuth'

export async function PATCH(request: NextRequest) {
  const supabase = createAdminClient()
  const { restaurantId, ...updates } = await request.json()
  if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })

  const admin = await requireAdmin()
  if (!admin) {
    const merchantOk = await requireMerchantForRestaurant(restaurantId)
    if (!merchantOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase.from('restaurants').update(updates).eq('id', restaurantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
