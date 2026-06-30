import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin, requireMerchantForRestaurant } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurantId')
  const month = searchParams.get('month') // e.g. "2026-06"

  if (!restaurantId || !month) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const admin = await requireAdmin()
  if (!admin) {
    const merchantOk = await requireMerchantForRestaurant(restaurantId)
    if (!merchantOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [year, mon] = month.split('-')
  const startDate = `${month}-01`
  const endDate = new Date(parseInt(year), parseInt(mon), 0).toISOString().split('T')[0]

  const { data: restaurant } = await supabase.from('restaurants').select('name, address, parish').eq('id', restaurantId).single()
  const { data: orders } = await supabase.from('orders')
    .select('*, order_items(*)')
    .eq('restaurant_id', restaurantId)
    .in('status', ['paid', 'complete'])
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59')

  if (!orders || !restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cardOrders = orders.filter((o: any) => o.payment_method === 'card')
  const totalRevenue = orders.reduce((s: number, o: any) => s + parseFloat(o.total || 0), 0)
  const cardRevenue = cardOrders.reduce((s: number, o: any) => s + parseFloat(o.subtotal || 0), 0)
  const commission = cardRevenue * 0.04
  const monthName = new Date(startDate + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const invoiceNumber = `FM-${year}${mon}-${restaurantId.slice(0,6).toUpperCase()}`

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; color: #0f172a; padding: 48px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
  .logo { font-size: 28px; font-weight: 800; }
  .logo span { color: #22c55e; }
  .invoice-info { text-align: right; }
  .invoice-info h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
  .invoice-info p { font-size: 13px; color: #64748b; line-height: 1.8; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; padding: 24px; background: #f8fafc; border-radius: 12px; }
  .party h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
  .party p { font-size: 14px; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  .totals { margin-left: auto; width: 320px; }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
  .total-row.final { font-size: 20px; font-weight: 800; color: #22c55e; border-top: 2px solid #0f172a; border-bottom: none; padding-top: 12px; margin-top: 4px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .card { background: #dbeafe; color: #1d4ed8; }
  .cash { background: #dcfce7; color: #166534; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.8; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo"><span>feed</span>me.gg</div>
    <div class="invoice-info">
      <h1>INVOICE</h1>
      <p>${invoiceNumber}</p>
      <p>Issued: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p>Period: ${monthName}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p><strong>feedme.gg</strong><br>Guernsey, Channel Islands<br>feedme.gg@mail.com</p>
    </div>
    <div class="party">
      <h3>To</h3>
      <p><strong>${restaurant.name}</strong><br>${restaurant.address || ''}${restaurant.parish ? '<br>' + restaurant.parish : ''}<br>Guernsey</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Order #</th>
        <th>Date</th>
        <th>Type</th>
        <th>Payment</th>
        <th style="text-align:right">Subtotal</th>
        <th style="text-align:right">Commission (4%)</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map((o: any) => `
        <tr>
          <td>${o.order_number}</td>
          <td>${new Date(o.created_at).toLocaleDateString('en-GB')}</td>
          <td>${o.order_type === 'delivery' ? 'Delivery' : 'Collection'}</td>
          <td><span class="badge ${o.payment_method}">${o.payment_method}</span></td>
          <td style="text-align:right">GBP${parseFloat(o.subtotal || 0).toFixed(2)}</td>
          <td style="text-align:right">${o.payment_method === 'card' ? 'GBP' + (parseFloat(o.subtotal || 0) * 0.04).toFixed(2) : '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Total orders</span><span>${orders.length}</span></div>
    <div class="total-row"><span>Card orders</span><span>${cardOrders.length}</span></div>
    <div class="total-row"><span>Total revenue</span><span>GBP${totalRevenue.toFixed(2)}</span></div>
    <div class="total-row"><span>Card subtotal (commissionable)</span><span>GBP${cardRevenue.toFixed(2)}</span></div>
    <div class="total-row final"><span>Commission due (4%)</span><span>GBP${commission.toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <p>feedme.gg &bull; Guernsey, Channel Islands &bull; feedme.gg@mail.com</p>
    <p>Payment due within 7 days of invoice date. Commission applies to card orders only. Cash orders excluded.</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="feedmegg-invoice-${invoiceNumber}.html"`,
    }
  })
}
