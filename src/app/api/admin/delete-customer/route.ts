import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'

// Permanently deletes a customer account: their saved addresses, their
// Supabase Auth login (if they have one), and the customer record itself.
// Their past ORDERS are deliberately left untouched - those are real
// business/financial records (revenue, commission, tax) and should not
// disappear just because the customer's account is closed.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customerId } = await request.json()
  if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: customer } = await supabase.from('customers').select('id, auth_id, name, email').eq('id', customerId).maybeSingle()
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  await supabase.from('customer_addresses').delete().eq('customer_id', customerId)

  if (customer.auth_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(customer.auth_id)
    // If the auth user is already gone for some reason, don't block the
    // rest of the deletion over it - just log and continue.
    if (authError) console.error('Failed to delete auth user for customer:', authError)
  }

  const { error: deleteError } = await supabase.from('customers').delete().eq('id', customerId)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

  return NextResponse.json({ success: true, name: customer.name || customer.email })
}
