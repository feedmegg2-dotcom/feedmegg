import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { generatePaymentLink } from '@/lib/sumup'
import { sendOrderConfirmation } from '@/lib/email'
import { postcodeToW3W } from '@/lib/what3words'

// POST /api/orders — place a new order
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      restaurantId,
      userId,
      customerName,
      customerEmail,
      customerPhone,
      orderType,
      deliveryAddress,
      deliveryParish,
      deliveryPostcode,
      deliveryNotes,
      items,
      paymentMethod,
      promoCode,
      tip,
      slotId,
      scheduledFor,
    } = body

    // Validate restaurant exists and is open
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('*, merchants(*)')
      .eq('id', restaurantId)
      .maybeSingle()

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    if (!restaurant.is_open || restaurant.is_busy) {
      return NextResponse.json({ error: 'Restaurant is not accepting orders' }, { status: 400 })
    }

    // Calculate subtotal
    let subtotal = 0
    const orderItems = []

    for (const item of items) {
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', item.menuItemId)
        .maybeSingle()

      if (!menuItem || !menuItem.is_available) {
        return NextResponse.json({ error: `Item ${item.name} is not available` }, { status: 400 })
      }

      const itemPrice = menuItem.price + (item.modifierPrice || 0)
      const itemSubtotal = itemPrice * item.quantity
      subtotal += itemSubtotal

      orderItems.push({
        menu_item_id: menuItem.id,
        name: menuItem.name + (item.modifierName ? ` (${item.modifierName})` : ''),
        price: itemPrice,
        quantity: item.quantity,
        special_instructions: item.specialInstructions,
        modifiers: item.modifiers || [],
        subtotal: itemSubtotal,
      })
    }

    // Check min/max order
    if (subtotal < restaurant.min_order) {
      return NextResponse.json({ error: `Minimum order is £${restaurant.min_order}` }, { status: 400 })
    }
    if (subtotal > restaurant.max_order) {
      return NextResponse.json({ error: `Maximum order is £${restaurant.max_order}` }, { status: 400 })
    }

    // Get delivery fee from zones
    let deliveryFee = 0
    if (orderType === 'delivery') {
      const { data: zones } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)

      const zone = zones?.find(z => z.name === deliveryParish || z.parish === deliveryParish)

      if (!zone) {
        return NextResponse.json({ error: `Sorry, we don't deliver to ${deliveryParish}` }, { status: 400 })
      }

      deliveryFee = parseFloat(zone.fee) || 0
      if (zone.free_delivery_over && subtotal >= parseFloat(zone.free_delivery_over)) {
        deliveryFee = 0
      }
    }

    // Apply promo code
    let discount = 0
    let promoId = null
    if (promoCode) {
      const { data: promo } = await supabase
        .from('promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle()

      if (promo) {
        // Check if first order only and user has ordered before
        if (promo.is_first_order_only && userId) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)
            .neq('status', 'cancelled')
          if (count && count > 0) {
            return NextResponse.json({ error: 'This promo code is for first orders only' }, { status: 400 })
          }
        }

        // Check usage limits
        if (promo.max_uses && promo.uses_count >= promo.max_uses) {
          return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
        }

        // Apply discount
        if (promo.type === 'percentage') discount = subtotal * (promo.value / 100)
        else if (promo.type === 'fixed') discount = Math.min(promo.value, subtotal)
        else if (promo.type === 'free_delivery') discount = deliveryFee
        
        promoId = promo.id
        
        // Increment usage
        await supabase.from('promotions').update({ uses_count: promo.uses_count + 1 }).eq('id', promo.id)
      }
    }

    const tipAmount = tip || 0
    const total = subtotal + deliveryFee + tipAmount - discount
    const commissionRate = restaurant.commission_rate || 4
    const commissionAmount = paymentMethod !== 'cash' ? (subtotal * commissionRate / 100) : 0

    // Get What3Words for delivery address
    let what3words = null
    if (orderType === 'delivery' && deliveryPostcode) {
      what3words = await postcodeToW3W(deliveryPostcode)
    }

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        merchant_id: restaurant.merchant_id,
        user_id: userId || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        order_type: orderType,
        delivery_address: deliveryAddress,
        delivery_parish: deliveryParish,
        delivery_postcode: deliveryPostcode,
        delivery_what3words: what3words,
        delivery_notes: deliveryNotes,
        slot_id: slotId,
        scheduled_for: scheduledFor,
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        tip: tipAmount,
        discount,
        total,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        promo_code: promoCode,
        promo_id: promoId,
        status: 'pending',
      })
      .select()
      .maybeSingle()

    if (orderError || !order) {
      throw new Error('Failed to create order')
    }

    // Create order items
    const itemsWithOrderId = orderItems.map(item => ({ ...item, order_id: order.id }))
    await supabase.from('order_items').insert(itemsWithOrderId)

    // Update slot booking count
    if (slotId) {
      await supabase.rpc('increment_slot_booking', { slot_id: slotId })
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total,
      message: 'Order placed successfully. Waiting for restaurant to accept.',
    })

  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 })
  }
}

// GET /api/orders?restaurantId=xxx — get orders for terminal polling
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurantId')
  const status = searchParams.get('status')
  const orderId = searchParams.get('orderId')

  if (!restaurantId && !orderId) {
    return NextResponse.json({ error: 'restaurantId or orderId required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (orderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle()
    return NextResponse.json({ order })
  }

  let query = supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('restaurant_id', restaurantId!)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: orders } = await query
  return NextResponse.json({ orders: orders || [] })
}
