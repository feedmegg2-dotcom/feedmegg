import { createAdminClient } from '@/lib/supabase'

// Which SumUp account took (or will take) a payment.
// 'restaurant' = the restaurant's own keys on its restaurants row.
// 'platform'   = the default keys saved in platform_settings (admin panel).
export type SumupAccount = {
  label: 'restaurant' | 'platform'
  apiKey: string
  merchantCode: string
}

type RestaurantKeys = {
  sumup_api_key?: string | null
  sumup_merchant_code?: string | null
}

// Reads the default keys from platform_settings. Uses the service-role
// client, so the table can stay locked down with RLS and no public policies.
export async function getPlatformSumupAccount(): Promise<SumupAccount | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('platform_settings')
    .select('sumup_api_key, sumup_merchant_code')
    .eq('id', 1)
    .maybeSingle()

  if (!data?.sumup_api_key || !data?.sumup_merchant_code) return null
  return { label: 'platform', apiKey: data.sumup_api_key, merchantCode: data.sumup_merchant_code }
}

// Used when taking a NEW payment. The restaurant's own keys win if both are
// set; otherwise the platform default is used. Returns null only if neither
// is configured, so the caller can refuse the order clearly.
export async function getSumupAccountForNewPayment(restaurant: RestaurantKeys): Promise<SumupAccount | null> {
  if (restaurant.sumup_api_key && restaurant.sumup_merchant_code) {
    return {
      label: 'restaurant',
      apiKey: restaurant.sumup_api_key,
      merchantCode: restaurant.sumup_merchant_code,
    }
  }
  return getPlatformSumupAccount()
}

// Used for an EXISTING payment (refund, status check, webhook). It must use
// the account that actually took the money, even if the restaurant has since
// changed its keys. Orders from before this change have no payment_account
// set, so they fall back to the restaurant's own keys, as before.
export async function getSumupAccountForOrder(
  paymentAccount: string | null | undefined,
  restaurant: RestaurantKeys
): Promise<SumupAccount | null> {
  if (paymentAccount === 'platform') return getPlatformSumupAccount()
  if (restaurant.sumup_api_key && restaurant.sumup_merchant_code) {
    return {
      label: 'restaurant',
      apiKey: restaurant.sumup_api_key,
      merchantCode: restaurant.sumup_merchant_code,
    }
  }
  return null
}
