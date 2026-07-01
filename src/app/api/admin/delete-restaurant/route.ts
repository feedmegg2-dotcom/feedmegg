import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'

// Deletes a restaurant and everything that depends on it. Runs with the
// service role key (via createAdminClient), which bypasses RLS entirely -
// this is required because the admin panel only uses a plain password
// check rather than a real Supabase Auth session, so direct client-side
// deletes get silently blocked by RLS with no visible error once a table
// requires an authenticated admin session to write.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Restaurant id required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: restaurant } = await supabase.from('restaurants').select('id, name').eq('id', id).maybeSingle()
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const { data: menuItems } = await supabase.from('menu_items').select('id').eq('restaurant_id', id)
  const menuItemIds = (menuItems || []).map((m: any) => m.id)

  const { data: optionGroups } = await supabase.from('item_option_groups').select('id').eq('restaurant_id', id)
  const optionGroupIds = (optionGroups || []).map((g: any) => g.id)

  if (optionGroupIds.length > 0) {
    await supabase.from('item_options').delete().in('option_group_id', optionGroupIds)
    await supabase.from('item_option_group_links').delete().in('option_group_id', optionGroupIds)
  }
  if (menuItemIds.length > 0) {
    await supabase.from('item_option_group_links').delete().in('menu_item_id', menuItemIds)
  }
  await supabase.from('item_option_groups').delete().eq('restaurant_id', id)
  await supabase.from('menu_items').delete().eq('restaurant_id', id)
  await supabase.from('menu_categories').delete().eq('restaurant_id', id)
  await supabase.from('restaurant_hours').delete().eq('restaurant_id', id)
  await supabase.from('delivery_zones').delete().eq('restaurant_id', id)

  const { error: deleteError } = await supabase.from('restaurants').delete().eq('id', id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, name: restaurant.name })
}
