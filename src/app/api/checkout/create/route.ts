import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { restaurantId, items, customerName, customerPhone, customerEmail, address, parish, orderType, note } = await request.json()

    // Get restaurant with SumUp key
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    // Calculate totals
    const subtotal = items.reduce((s: number, i: any) => s + (i.price * i.qty), 0)
    
    // Get delivery fee from delivery_zones if delivery order
    let deliveryFee = 0
    if (orderType === 'delivery') {
      const { data: zone } = await supabase
        .from('delivery_zones')
        .select('fee')
        .eq('restaurant_id', restaurantId)
        .eq('parish', parish)
        .single()
      deliveryFee = zone ? parseFloat(zone.fee) : parseFloat(restaurant.delivery_fee) || 2.50
    }

    const total = subtotal + deliveryFee
    const commission = items[0]?.paymentMethod === 'cash' ? 0 : parseFloat((subtotal * 0.04).toFixed(2))

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_address: address,
        parish,
        order_type: orderType,
        payment_method: items[0]?.paymentMethod || 'card',
        status: items[0]?.paymentMethod === 'cash' ? 'pending_cash' : 'pending',
        subtotal,
        delivery_fee: deliveryFee,
        total,
        commission,
        notes: note,
        items: JSON.stringify(items),
      })
      .select()
      .single()

    if (orderError || !order) return NextResponse.json({ error: 'Failed to create order: ' + orderError?.message }, { status: 500 })

    // Cash order - no payment needed
    if (items[0]?.paymentMethod === 'cash') {
      return NextResponse.json({ success: true, orderId: order.id, paymentMethod: 'cash' })
    }

    // Card order - create SumUp checkout
    if (!restaurant.sumup_api_key) {
      return NextResponse.json({ error: 'Restaurant payment not configured' }, { status: 400 })
    }

    const checkoutRes = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${restaurant.sumup_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout_reference: order.id,
        amount: total,
        currency: 'GBP',
        merchant_code: restaurant.sumup_merchant_code,
        description: `Order from ${restaurant.name}`,
        hosted_checkout: { enabled: true },
        redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/${order.id}/confirmed`,
      })
    })

    const checkoutData = await checkoutRes.json()

    if (!checkoutData.id || !checkoutData.hosted_checkout_url) {
      return NextResponse.json({ error: 'SumUp error: ' + JSON.stringify(checkoutData) }, { status: 500 })
    }

    // Save SumUp checkout ID to order
    await supabase.from('orders').update({ sumup_checkout_id: checkoutData.id }).eq('id', order.id)

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentUrl: checkoutData.hosted_checkout_url,
      checkoutId: checkoutData.id,
      paymentMethod: 'card',
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
