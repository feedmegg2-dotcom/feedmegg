import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const { userId, phone } = await request.json()

    // Generate 4 digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins

    // Save code to database
    await supabase.from('phone_verifications').upsert({
      user_id: userId,
      phone,
      code,
      expires_at: expiresAt,
      verified: false,
    })

    // Send SMS via Twilio (placeholder - add credentials later)
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (accountSid && authToken && fromNumber) {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: `Your feedme.gg verification code is: ${code}. Valid for 10 minutes.`,
        }).toString(),
      })
    } else {
      // Twilio not configured yet - log code for testing
      console.log(`VERIFICATION CODE for ${phone}: ${code}`)
    }

    return NextResponse.json({ success: true, message: 'Code sent!' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
