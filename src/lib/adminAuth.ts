import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase'

const ADMIN_USER_ID = 'e4e7926f-4fad-432e-9c0f-8829eaa71d6e'

/**
 * Verifies the incoming request belongs to an authenticated admin session.
 * Returns the admin user object if valid, or null if not authorized.
 * Use this at the top of every /api/admin/* route.
 */
export async function requireAdmin() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null
  if (user.id !== ADMIN_USER_ID) return null

  return user
}

/**
 * Verifies the incoming request belongs to an authenticated merchant who owns
 * the given restaurantId. Returns the merchant record if valid, or null.
 */
export async function requireMerchantForRestaurant(restaurantId: string) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const admin = createAdminClient()
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, merchant_id, merchants!inner(auth_id)')
    .eq('id', restaurantId)
    .maybeSingle()

  if (!restaurant) return null
  const merchantAuthId = (restaurant as any).merchants?.auth_id
  if (merchantAuthId !== user.id) return null

  return restaurant
}
