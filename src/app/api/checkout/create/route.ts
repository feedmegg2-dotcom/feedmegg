import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendOrderConfirmation } from '@/lib/email'

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
      tip,
      what3words,
      contactlessDelivery,
      scheduledFor,
    } = await request.json()

    if (!customerName) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!items || items.length === 0) return NextResponse.json({ error: 'No items in cart' }, { status: 400 })

    // Check if customer is banned
    if (customerPhone) {
      const { data: customer } = await supabase
        .from('customers')
        .select('is_banned, ban_reason')
        .eq('phone', customerPhone)
        .maybeSingle()
      if (customer?.is_banned) {
        return NextResponse.json({ error: 'Your account has been suspended. Please contact feedme.gg@mail.com for assistance.' }, { status: 403 })
      }
    }

    // Get restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    // Check restaurant is open (skip for pre-orders)
    if (!scheduledFor) {
      if (restaurant.is_open === false) {
        return NextResponse.json({ error: 'Sorry, this restaurant is currently closed.' }, { status: 400 })
      }
      // Check opening hours
      const now = new Date()
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
      const { data: hours } = await supabase.from('opening_hours').select('*').eq('restaurant_id', restaurantId).eq('day', dayName).maybeSingle()
      if (hours && !hours.is_closed) {
        const [openH, openM] = hours.open_time.split(':').map(Number)
        const [closeH, closeM] = hours.close_time.split(':').map(Number)
        const currentMins = now.getHours() * 60 + now.getMinutes()
        const openMins = openH * 60 + openM
        const closeMins = closeH * 60 + closeM
        if (currentMins < openMins || currentMins >= closeMins) {
          return NextResponse.json({ error: `Sorry, this restaurant is closed right now. Opening hours: ${hours.open_time} - ${hours.close_time}` }, { status: 400 })
        }
      } else if (hours?.is_closed) {
        return NextResponse.json({ error: 'Sorry, this restaurant is closed today.' }, { status: 400 })
      }
    }

    // Calculate totals
    const subtotal = items.reduce((s: number, i: any) => s + (i.price * i.qty), 0)
    
    // Get delivery fee
    let deliveryFee = 0
    if (orderType === 'delivery') {
      const { data: zones } = await supabase
        .from('delivery_zones')
        .select('fee, free_delivery_over')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
      const zone = zones?.find((z: any) => z.name === parish || z.parish === parish)
      if (zone) {
        deliveryFee = parseFloat(zone.fee) || 0
        if (zone.free_delivery_over && subtotal >= parseFloat(zone.free_delivery_over)) {
          deliveryFee = 0
        }
      }
    }

    const tipAmount = parseFloat(tip) || 0
    const total = subtotal + deliveryFee + tipAmount
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

    // Check slot capacity for pre-orders
    if (scheduledFor) {
      const slotStart = new Date(scheduledFor)
      const slotDuration = orderType === 'delivery' 
        ? (restaurant.delivery_slot_duration || 30) 
        : (restaurant.pickup_slot_duration || 15)
      const slotCapacity = orderType === 'delivery'
        ? (restaurant.delivery_slot_capacity || 10)
        : (restaurant.pickup_slot_capacity || 10)
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000)

      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('restaurant_id', restaurantId)
        .eq('order_type', orderType)
        .gte('scheduled_for', slotStart.toISOString())
        .lt('scheduled_for', slotEnd.toISOString())
        .in('status', ['pending', 'accepted', 'waiting_payment', 'paid'])

      if ((count || 0) >= slotCapacity) {
        return NextResponse.json({ error: `Sorry, this time slot is full. Please choose another time.` }, { status: 400 })
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
        delivery_what3words: what3words || null,
        order_type: orderType,
        payment_method: paymentMethod || 'card',
        contactless_delivery: contactlessDelivery || false,
        scheduled_for: scheduledFor || null,
        status: 'pending',
        order_number: orderNumber,
        subtotal,
        delivery_fee: deliveryFee,
        tip: tipAmount,
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

    // Send confirmation email (fire and forget)
    if (customerEmail) {
      sendOrderConfirmation({
        customerName,
        customerEmail,
        orderNumber,
        restaurantName: restaurant.name,
        items,
        subtotal,
        deliveryFee,
        tip: tipAmount,
        total,
        orderType,
        deliveryAddress: address,
        scheduledFor: scheduledFor || undefined,
        paymentMethod: paymentMethod || 'card',
      }).catch(err => console.error('Email error:', err))
    }

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      orderNumber,
      paymentMethod: paymentMethod || 'card',
      scheduledFor: scheduledFor || null,
    })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
