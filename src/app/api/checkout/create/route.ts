import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { 
      restaurantId, 
      items, 
      customerName, 
      customerPhone, 
      customerEmail, 
      address, 
      parish,
      locationDescription,
      orderType, 
      paymentMethod,
      note,
      contactlessDelivery,
      scheduledFor,
    } = await request.json()

    // Get restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    // Calculate totals
    const subtotal = items.reduce((s: number, i: any) => s + (i.price * i.qty), 0)
    
    // Get delivery fee
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
    const commission = paymentMethod === 'cash' ? 0 : parseFloat((subtotal * 0.04).toFixed(2))

    // ALL orders start as 'pending' - merchant must accept first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_address: address,
        delivery_notes: locationDescription,
        parish,
        order_type: orderType,
        payment_method: paymentMethod || 'card',
        contactless_delivery: contactlessDelivery || false,
        scheduled_for: scheduledFor || null,
        status: 'pending',
        subtotal,
        delivery_fee: deliveryFee,
        total,
        commission,
        notes: note,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order: ' + orderError?.message }, { status: 500 })
    }

    // Create order_items entries
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.qty,
        price: item.price,
        subtotal: item.price * item.qty,
        special_instructions: item.note || item.special_instructions || '',
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) console.error('Order items error:', itemsError)
    }

    // Return success - payment handled AFTER merchant accepts
    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      paymentMethod: paymentMethod || 'card',
    })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
