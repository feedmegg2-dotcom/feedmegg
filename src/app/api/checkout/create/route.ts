import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { 
      restaurantId, 
      items, 
      customerId,
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

    if (!customerName) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!items || items.length === 0) return NextResponse.json({ error: 'No items in cart' }, { status: 400 })

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
        .maybeSingle()
      deliveryFee = zone ? parseFloat(zone.fee) : parseFloat(restaurant.delivery_fee) || 2.50
    }

    const total = subtotal + deliveryFee
    const commission = paymentMethod === 'cash' ? 0 : parseFloat((subtotal * 0.04).toFixed(2))

    // Validate customerId exists in auth if provided
    let validUserId = null
    if (customerId) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(customerId)
        if (authUser?.user) validUserId = customerId
      } catch (e) {
        console.log('Could not validate user:', e)
      }
    }

    // Generate order number
    const orderNumber = 'FM-' + Date.now().toString().slice(-6)

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_name: customerName,
        customer_phone: customerPhone || '',
        customer_email: customerEmail || '',
        delivery_address: address || '',
        delivery_notes: locationDescription || '',
        delivery_parish: parish || '',
        order_type: orderType,
        payment_method: paymentMethod || 'card',
        contactless_delivery: contactlessDelivery || false,
        scheduled_for: scheduledFor || null,
        status: 'pending',
        order_number: orderNumber,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        commission,
        notes: note || '',
        items: JSON.stringify(items), // Store as JSON backup
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
        menu_item_id: item.id || null,
        name: item.name,
        quantity: item.qty || 1,
        price: item.price,
        subtotal: item.price * (item.qty || 1),
        special_instructions: item.note || null,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) {
        console.error('Order items insert error:', itemsError.message)
        // Try without menu_item_id if foreign key issue
        const itemsMinimal = items.map((item: any) => ({
          order_id: order.id,
          name: item.name,
          quantity: item.qty || 1,
          price: item.price,
          subtotal: item.price * (item.qty || 1),
          special_instructions: item.note || null,
        }))
        const { error: e2 } = await supabase.from('order_items').insert(itemsMinimal)
        if (e2) console.error('Order items retry error:', e2.message)
      }
    }

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      orderNumber,
      paymentMethod: paymentMethod || 'card',
    })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
