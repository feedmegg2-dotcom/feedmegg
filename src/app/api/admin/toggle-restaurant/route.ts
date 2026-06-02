import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { id, is_active } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing restaurant ID' }, { status: 400 })
    }

    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('restaurants')
      .update({ is_active })
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
