import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const { userId, code } = await request.json()

    // Get the verification record
    const { data: verification } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('verified', false)
      .single()

    if (!verification) {
      return NextResponse.json({ error: 'No verification request found' }, { status: 400 })
    }

    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
    }

    if (verification.code !== code) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
    }

    // Mark as verified
    await supabase.from('phone_verifications').update({ verified: true }).eq('user_id', userId)
    await supabase.from('customers').update({ phone_verified: true }).eq('id', userId)

    return NextResponse.json({ success: true, message: 'Phone verified!' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
