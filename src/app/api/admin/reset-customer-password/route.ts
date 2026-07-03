import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'

// Resets a customer's password directly. Requires the service role key
// since Supabase Auth password changes for OTHER users can only be done
// via the admin API, never from a plain client-side call.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customerId, newPassword } = await request.json()
  if (!customerId || !newPassword) return NextResponse.json({ error: 'customerId and newPassword required' }, { status: 400 })
  if (newPassword.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: customer } = await supabase.from('customers').select('auth_id, email').eq('id', customerId).maybeSingle()
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  if (!customer.auth_id) return NextResponse.json({ error: 'This customer has no linked login account (e.g. guest checkout only) - there is no password to reset' }, { status: 400 })

  const { error } = await supabase.auth.admin.updateUserById(customer.auth_id, { password: newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
