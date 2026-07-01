import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, is_active, is_open } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing restaurant ID' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updates: any = {}
    if (is_active !== undefined) updates.is_active = is_active
    if (is_open !== undefined) updates.is_open = is_open

    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
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
