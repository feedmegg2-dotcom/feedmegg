import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const { merchantId, password } = await request.json()
    if (!merchantId || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const { data: merchant } = await supabase.from('merchants').select('auth_id').eq('id', merchantId).maybeSingle()
    if (!merchant?.auth_id) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    const { error } = await supabase.auth.admin.updateUserById(merchant.auth_id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
