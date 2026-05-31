import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'hello@feedme.gg'

// Order confirmation email to customer
export async function sendOrderConfirmation(params: {
  customerEmail: string
  customerName: string
  orderNumber: string
  restaurantName: string
  items: { name: string; quantity: number; price: number }[]
  subtotal: number
  deliveryFee: number
  tip: number
  total: number
  orderType: 'delivery' | 'pickup'
  deliveryAddress?: string
  what3words?: string
  estimatedWait?: number
  customMessage?: string
}) {
  const itemsHtml = params.items
    .map(i => `<tr><td style="padding:6px 0;color:#94A3B8">${i.quantity}× ${i.name}</td><td style="padding:6px 0;text-align:right;color:#F8FAFC">£${(i.price * i.quantity).toFixed(2)}</td></tr>`)
    .join('')

  await resend.emails.send({
    from: `feedme.gg <${FROM}>`,
    to: params.customerEmail,
    subject: `Order confirmed — ${params.orderNumber} from ${params.restaurantName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#0F172A;margin:0;padding:20px;font-family:system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto">
    <div style="text-align:center;padding:24px 0">
      <div style="font-size:28px;font-weight:800;color:#22C55E;letter-spacing:-1px">feedme.gg</div>
      <div style="font-size:13px;color:#64748B;margin-top:4px">Guernsey's food delivery platform</div>
    </div>
    <div style="background:#1E293B;border-radius:16px;padding:24px;margin-bottom:16px">
      <div style="font-size:32px;text-align:center;margin-bottom:12px">🎉</div>
      <div style="font-size:20px;font-weight:700;color:#22C55E;text-align:center;margin-bottom:6px">Order Confirmed!</div>
      <div style="font-size:13px;color:#94A3B8;text-align:center">Your order has been received by ${params.restaurantName}</div>
    </div>
    <div style="background:#1E293B;border-radius:16px;padding:24px;margin-bottom:16px">
      <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Order Details</div>
      <div style="font-size:18px;font-weight:700;color:#F8FAFC;margin-bottom:16px">${params.orderNumber}</div>
      <table style="width:100%;border-collapse:collapse">
        ${itemsHtml}
        <tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.08);padding:8px 0"></td></tr>
        <tr><td style="padding:4px 0;color:#64748B;font-size:13px">${params.orderType === 'delivery' ? 'Delivery fee' : 'Pickup'}</td><td style="text-align:right;color:#94A3B8;font-size:13px">${params.orderType === 'delivery' ? '£' + params.deliveryFee.toFixed(2) : 'Free'}</td></tr>
        ${params.tip > 0 ? `<tr><td style="padding:4px 0;color:#64748B;font-size:13px">Driver tip</td><td style="text-align:right;color:#94A3B8;font-size:13px">£${params.tip.toFixed(2)}</td></tr>` : ''}
        <tr><td style="padding:8px 0;font-size:16px;font-weight:700;color:#F8FAFC">Total</td><td style="text-align:right;font-size:16px;font-weight:700;color:#22C55E">£${params.total.toFixed(2)}</td></tr>
      </table>
    </div>
    ${params.orderType === 'delivery' && params.deliveryAddress ? `
    <div style="background:#1E293B;border-radius:16px;padding:24px;margin-bottom:16px">
      <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Delivery Address</div>
      <div style="font-size:13px;color:#F8FAFC">${params.deliveryAddress}</div>
      ${params.what3words ? `<div style="font-size:12px;color:#EF4444;margin-top:6px;font-weight:600">/// ${params.what3words}</div>` : ''}
    </div>` : ''}
    ${params.estimatedWait ? `
    <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">
      <div style="font-size:13px;color:#94A3B8">Estimated ${params.orderType === 'delivery' ? 'delivery' : 'pickup'} time</div>
      <div style="font-size:22px;font-weight:700;color:#22C55E">${params.estimatedWait} minutes</div>
    </div>` : ''}
    ${params.customMessage ? `
    <div style="background:#1E293B;border-radius:16px;padding:20px;margin-bottom:16px">
      <div style="font-size:13px;color:#94A3B8;font-style:italic">"${params.customMessage}"</div>
      <div style="font-size:11px;color:#64748B;margin-top:6px">— ${params.restaurantName}</div>
    </div>` : ''}
    <div style="text-align:center;font-size:11px;color:#475569;padding:16px 0">
      feedme.gg · Guernsey's local food ordering platform<br>
      Questions? Contact us at hello@feedme.gg
    </div>
  </div>
</body>
</html>`,
  })
}

// Merchant notification email
export async function sendMerchantNotification(params: {
  merchantEmail: string
  restaurantName: string
  orderNumber: string
  total: number
}) {
  await resend.emails.send({
    from: `feedme.gg <${FROM}>`,
    to: params.merchantEmail,
    subject: `New order ${params.orderNumber} — £${params.total.toFixed(2)}`,
    html: `<div style="font-family:system-ui,sans-serif;padding:20px"><h2>New Order!</h2><p>Order ${params.orderNumber} has arrived for ${params.restaurantName}</p><p>Total: £${params.total.toFixed(2)}</p><p>Log in to your terminal to accept or reject.</p></div>`,
  })
}

// Password reset email
export async function sendPasswordReset(params: {
  email: string
  resetUrl: string
}) {
  await resend.emails.send({
    from: `feedme.gg <${FROM}>`,
    to: params.email,
    subject: 'Reset your feedme.gg password',
    html: `<div style="font-family:system-ui,sans-serif;padding:20px"><h2>Password Reset</h2><p>Click the link below to reset your password. This link expires in 1 hour.</p><a href="${params.resetUrl}" style="background:#22C55E;color:#0F172A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin:16px 0">Reset Password</a><p style="color:#666;font-size:12px">If you didn't request this, you can ignore this email.</p></div>`,
  })
}
