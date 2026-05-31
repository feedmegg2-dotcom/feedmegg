import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Browser client (for client components)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server client (for server components and API routes)
export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: any) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}

// Admin client (bypasses RLS - use only in API routes)
export function createAdminClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Database types
export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      restaurants: { Row: Restaurant; Insert: Partial<Restaurant>; Update: Partial<Restaurant> }
      menu_items: { Row: MenuItem; Insert: Partial<MenuItem>; Update: Partial<MenuItem> }
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> }
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> }
    }
  }
}

export type User = {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatar_url: string | null
  provider: string
  created_at: string
}

export type Restaurant = {
  id: string
  merchant_id: string
  name: string
  slug: string
  description: string | null
  emoji: string
  cuisine_type: string | null
  parish: string | null
  postcode: string | null
  phone: string | null
  logo_url: string | null
  custom_message: string
  is_open: boolean
  is_busy: boolean
  min_order: number
  max_order: number
  delivery_time_mins: number
  pickup_time_mins: number
  accepts_delivery: boolean
  accepts_pickup: boolean
  accepts_preorders: boolean
  slot_capacity: number
  rating: number
  total_orders: number
}

export type MenuItem = {
  id: string
  category_id: string
  restaurant_id: string
  name: string
  description: string | null
  price: number
  emoji: string
  image_url: string | null
  is_available: boolean
  calories: number | null
  tags: string[]
  allergens: string[]
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
