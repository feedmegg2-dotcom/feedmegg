import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function createAdminClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type Order = {
  id: string
  order_number: string
  restaurant_id: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  order_type: 'delivery' | 'pickup'
  delivery_address: string | null
  delivery_postcode: string | null
  delivery_what3words: string | null
  payment_method: 'card' | 'cash' | 'paypal'
  subtotal: number
  delivery_fee: number
  tip: number
  discount: number
  total: number
  sumup_link: string | null
  status: 'pending' | 'accepted' | 'waiting_payment' | 'paid' | 'complete' | 'cancelled'
  rejection_reason: string | null
  estimated_wait_mins: number | null
  created_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  name: string
  price: number
  quantity: number
  special_instructions: string | null
  modifiers: any[]
  subtotal: number
}
