import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const { name, email, password, phone, address, parish } = await request.json()
    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Name, email, password and phone are required' }, { status: 400 })
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create account' }, { status: 400 })
    }

    // Create customer profile
    const { error: profileError } = await supabase.from('customers').insert({
      id: authData.user.id,
      name,
      email,
      phone,
      address,
      parish,
      phone_verified: false,
    })

    if (profileError) {
      // Rollback auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
