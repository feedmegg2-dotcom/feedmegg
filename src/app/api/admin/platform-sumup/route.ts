import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'

// GET: tells the admin panel whether defaults are set. Never returns the key.
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('platform_settings')
    .select('sumup_api_key, sumup_merchant_code, updated_at')
    .eq('id', 1)
    .maybeSingle()

  return NextResponse.json({
    apiKeySet: !!data?.sumup_api_key,
    merchantCode: data?.sumup_merchant_code || '',
    updatedAt: data?.updated_at || null,
  })
}

// POST: saves the default merchant code, and the key if one is provided.
// Leaving apiKey blank keeps the existing key, so the code can be changed
// without re-entering the key.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const merchantCode = typeof body.merchantCode === 'string' ? body.merchantCode.trim() : ''
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''

  if (!merchantCode) return NextResponse.json({ error: 'Merchant code is required' }, { status: 400 })
  if (apiKey && !apiKey.startsWith('sup_sk_')) {
    return NextResponse.json({ error: 'That does not look like a SumUp secret key (should start with sup_sk_)' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const update: Record<string, any> = {
    id: 1,
    sumup_merchant_code: merchantCode,
    updated_at: new Date().toISOString(),
  }
  if (apiKey) update.sumup_api_key = apiKey

  const { error } = await supabase.from('platform_settings').upsert(update, { onConflict: 'id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
