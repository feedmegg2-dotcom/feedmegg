import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')
  const phone = searchParams.get('phone')

  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  const { data: order } = await supabase
    .from('orders')
    .select('*, restaurants(name, address, parish), order_items(*)')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Security: verify phone matches (for guest orders)
  if (phone && order.customer_phone !== phone) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt - ${order.order_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; color: #0f172a; padding: 40px; max-width: 560px; margin: 0 auto; }
  .logo { font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 32px; }
  .logo span { color: #22c55e; }
  h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
  .info-grid { display: grid; gap: 8px; margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 10px; }
  .info-row { display: flex; justify-content: space-between; font-size: 13px; }
  .info-row span:first-child { color: #64748b; }
  .info-row strong { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { text-align: left; padding: 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  .total-section { padding-top: 12px; display: grid; gap: 6px; }
  .total-row { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; }
  .total-row.final { font-size: 18px; font-weight: 800; color: #0f172a; padding-top: 8px; border-top: 2px solid #0f172a; margin-top: 4px; }
  .total-row.final span:last-child { color: #22c55e; }
  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.8; }
  .print-btn { display: block; width: 100%; padding: 14px; background: #22c55e; color: #080c14; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; margin: 24px 0; font-family: inherit; }
  @media print { .print-btn { display: none; } body { padding: 20px; } }
</style>
</head>
<body>
  <div class="logo"><span>feed</span>me.gg</div>
  <h1>Order Receipt</h1>
  <p class="subtitle">Thank you for your order, ${order.customer_name}!</p>

  <div class="info-grid">
    <div class="info-row"><span>Order number</span><strong>${order.order_number}</strong></div>
    <div class="info-row"><span>Restaurant</span><strong>${order.restaurants?.name}</strong></div>
    <div class="info-row"><span>Date</span><strong>${new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></div>
    <div class="info-row"><span>Order type</span><strong>${order.order_type === 'delivery' ? 'Delivery' : 'Collection'}</strong></div>
    ${order.delivery_address ? `<div class="info-row"><span>Delivered to</span><strong>${order.delivery_address}</strong></div>` : ''}
    <div class="info-row"><span>Payment</span><strong>${order.payment_method === 'cash' ? 'Cash' : 'Card'}</strong></div>
    <div class="info-row"><span>Status</span><strong style="color:#22c55e">${order.status}</strong></div>
  </div>

  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>

  <table>
    <thead>
      <tr><th>Item</th><th style="text-align:right">Price</th></tr>
    </thead>
    <tbody>
      ${(order.order_items || []).map((item: any) => `
        <tr>
          <td>${item.quantity}x ${item.name}${item.special_instructions ? '<br><small style="color:#64748b">→ ' + item.special_instructions + '</small>' : ''}</td>
          <td style="text-align:right">GBP${parseFloat(item.subtotal || 0).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row"><span>Subtotal</span><span>GBP${parseFloat(order.subtotal || 0).toFixed(2)}</span></div>
    ${parseFloat(order.delivery_fee || 0) > 0 ? `<div class="total-row"><span>Delivery</span><span>GBP${parseFloat(order.delivery_fee).toFixed(2)}</span></div>` : ''}
    ${parseFloat(order.tip || 0) > 0 ? `<div class="total-row"><span>Tip</span><span>GBP${parseFloat(order.tip).toFixed(2)}</span></div>` : ''}
    <div class="total-row final"><span>Total</span><span>GBP${parseFloat(order.total || 0).toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <p>feedme.gg &bull; Guernsey, Channel Islands</p>
    <p>feedme.gg@mail.com &bull; feedme.gg</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    }
  })
}
