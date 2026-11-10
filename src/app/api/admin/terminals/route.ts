import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'

// Admin management of a restaurant's tablet terminals. Same operations the
// merchant dashboard offers, done with the service role so RLS can't block them.

// GET ?restaurantId=... : list that restaurant's terminals
export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const restaurantId = request.nextUrl.searchParams.get('restaurantId')
  if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('terminals')
    .select('id, name, claimed_device, claimed_at, last_seen, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ terminals: data || [] })
}

// POST { restaurantId, name? } : create a terminal for a restaurant
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId : ''
  if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, merchant_id')
    .eq('id', restaurantId)
    .maybeSingle()
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  if (!restaurant.merchant_id) return NextResponse.json({ error: 'This restaurant has no merchant assigned' }, { status: 400 })

  const { count } = await supabase
    .from('terminals')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)

  const name = typeof body.name === 'string' && body.name.trim()
    ? body.name.trim()
    : `Terminal ${(count || 0) + 1}`

  const { data, error } = await supabase
    .from('terminals')
    .insert({ merchant_id: restaurant.merchant_id, restaurant_id: restaurantId, name })
    .select('id, name')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true, terminal: data })
}

// PATCH { id, name? , release? } : rename, and/or release the claim so
// another tablet can take this terminal over
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const changes: Record<string, any> = {}
  if (typeof body.name === 'string') {
    if (!body.name.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    changes.name = body.name.trim()
  }
  if (body.release === true) {
    changes.claimed_device = null
    changes.claimed_at = null
  }
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('terminals').update(changes).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

// DELETE ?id=... : delete a terminal
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('terminals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
