import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin, requireMerchantForRestaurant } from '@/lib/adminAuth'

// Changes the refund PIN for a merchant. If a PIN is already set, the
// caller MUST provide the correct current PIN to change it - this stops
// any staff member who can open the settings cog from simply setting a
// brand new PIN and bypassing the existing one entirely.
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const { merchantId, restaurantId, currentPin, newPin } = await request.json()

  if (!merchantId || !restaurantId) return NextResponse.json({ error: 'merchantId and restaurantId required' }, { status: 400 })
  if (!newPin || newPin.length < 4) return NextResponse.json({ error: 'New PIN must be at least 4 digits' }, { status: 400 })

  const admin = await requireAdmin()
  if (!admin) {
    const merchantOk = await requireMerchantForRestaurant(restaurantId)
    if (!merchantOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: merchant } = await supabase.from('merchants').select('refund_pin').eq('id', merchantId).maybeSingle()
  if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })

  if (merchant.refund_pin) {
    if (!currentPin) return NextResponse.json({ error: 'Current PIN required to change it' }, { status: 400 })
    if (currentPin !== merchant.refund_pin) return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 403 })
  }

  await supabase.from('merchants').update({ refund_pin: newPin }).eq('id', merchantId)

  return NextResponse.json({ success: true })
}
