import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const { name, email, password, phone, addressLine1, addressLine2, parish, postcode, directions } = await request.json()
    
    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Name, email, password and phone are required' }, { status: 400 })
    }

    // Create Supabase auth user - send verification email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: { name },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create account' }, { status: 400 })
    }

    // Build full address string
    const addressParts = [addressLine1, addressLine2, parish, postcode].filter(Boolean)
    const fullAddress = addressParts.join(', ')

    // Create customer profile - set BOTH id and auth_id to the same value
    const { error: profileError } = await supabase.from('customers').insert({
      id: authData.user.id,
      auth_id: authData.user.id,
      name,
      first_name: name.split(' ')[0] || name,
      last_name: name.split(' ').slice(1).join(' ') || '',
      email,
      phone,
      parish,
      address: fullAddress,
    })

    if (profileError) {
      // Rollback auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Save default address if provided
    if (addressLine1) {
      await supabase.from('customer_addresses').insert({
        customer_id: authData.user.id,
        name: 'Home',
        address_line1: addressLine1,
        address_line2: addressLine2 || '',
        parish,
        postcode: postcode || '',
        location_description: directions || '',
        is_default: true,
      })
    }

    // Send verification email
    await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
    })

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
