import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { to, subject, body, name } = await request.json()
  if (!to || !subject || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#0f172a;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:28px;font-weight:800;margin:0;">
          <span style="color:#22c55e;">feed</span>me.gg
        </h1>
      </div>
      ${name ? `<p>Hi ${name},</p>` : ''}
      <div style="white-space:pre-line;line-height:1.7;color:#334155;">${body}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:12px;text-align:center;">feedme.gg • Guernsey • feedme.gg@mail.com</p>
    </body>
    </html>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'feedme.gg <orders@feedme.gg>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  return NextResponse.json({ success: true })
}
