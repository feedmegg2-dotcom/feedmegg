import { createAdminClient } from '@/lib/supabase'

/**
 * Logs an error to the system_errors table so it's visible on the live
 * /admin/errors dashboard, instead of only existing in Vercel's logs where
 * nobody sees it until a customer complains.
 *
 * Always wrapped in try/catch internally - logging an error must NEVER
 * itself throw and break the calling code's error handling.
 */
export async function logSystemError(params: {
  source: string          // e.g. 'sumup-webhook', 'checkout-create', 'print-failure'
  message: string
  details?: any
  orderId?: string
  restaurantId?: string
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from('system_errors').insert({
      source: params.source,
      message: params.message,
      details: params.details ? JSON.parse(JSON.stringify(params.details, (_, v) => v instanceof Error ? { message: v.message, stack: v.stack } : v)) : null,
      order_id: params.orderId || null,
      restaurant_id: params.restaurantId || null,
    })
  } catch (e) {
    // Logging itself failed - fall back to console so it's at least in
    // Vercel's logs, but never let this throw and break the caller.
    console.error('Failed to log system error:', e, params)
  }
}
