export async function sendOrderConfirmation(order: {
  customerName: string
  customerEmail: string
  orderNumber: string
  restaurantName: string
  items: any[]
  subtotal: number
  deliveryFee: number
  tip: number
  total: number
  orderType: string
  deliveryAddress?: string
  scheduledFor?: string
  paymentMethod: string
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY || !order.customerEmail) return

  const itemsList = order.items.map(i => 
    `<tr><td style="padding:4px 0">${i.qty}x ${i.name}</td><td style="padding:4px 0;text-align:right">GBP${(i.price * i.qty).toFixed(2)}</td></tr>`
  ).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#0f172a;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:28px;font-weight:800;margin:0;">
          <span style="color:#22c55e;">feed</span>me.gg
        </h1>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:20px;">
        <h2 style="margin:0 0 4px;font-size:20px;">Order Confirmed! 🎉</h2>
        <p style="margin:0;color:#64748b;">Hi ${order.customerName}, your order has been placed.</p>
      </div>
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#64748b;">Order number</span>
          <strong>${order.orderNumber}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#64748b;">Restaurant</span>
          <strong>${order.restaurantName}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#64748b;">Order type</span>
          <strong>${order.orderType === 'delivery' ? '🚗 Delivery' : '🏪 Collection'}</strong>
        </div>
        ${order.deliveryAddress ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;">Delivery to</span><strong>${order.deliveryAddress}</strong></div>` : ''}
        ${order.scheduledFor ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;">Scheduled for</span><strong>${new Date(order.scheduledFor).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong></div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#64748b;">Payment</span>
          <strong>${order.paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'}</strong>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:8px 0;color:#64748b;font-weight:500;">Item</th><th style="text-align:right;padding:8px 0;color:#64748b;font-weight:500;">Price</th></tr></thead>
        <tbody>${itemsList}</tbody>
        <tfoot>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:8px 0;color:#64748b;">Subtotal</td><td style="padding:8px 0;text-align:right;color:#64748b;">GBP${order.subtotal.toFixed(2)}</td></tr>
          ${order.deliveryFee > 0 ? `<tr><td style="padding:4px 0;color:#64748b;">Delivery</td><td style="padding:4px 0;text-align:right;color:#64748b;">GBP${order.deliveryFee.toFixed(2)}</td></tr>` : ''}
          ${order.tip > 0 ? `<tr><td style="padding:4px 0;color:#64748b;">Tip</td><td style="padding:4px 0;text-align:right;color:#64748b;">GBP${order.tip.toFixed(2)}</td></tr>` : ''}
          <tr style="border-top:2px solid #e2e8f0;"><td style="padding:8px 0;font-weight:800;font-size:16px;">Total</td><td style="padding:8px 0;text-align:right;font-weight:800;font-size:16px;color:#22c55e;">GBP${order.total.toFixed(2)}</td></tr>
        </tfoot>
      </table>
      <p style="color:#64748b;font-size:13px;text-align:center;">Thank you for ordering with feedme.gg!</p>
    </body>
    </html>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'feedme.gg <orders@feedme.gg>',
      to: order.customerEmail,
      subject: `Order confirmed - ${order.orderNumber} from ${order.restaurantName}`,
      html,
    }),
  })
}
