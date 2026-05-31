// =============================================
// SumUp Payment Link Integration
// feedme.gg uses SumUp payment links
// Each merchant has their own SumUp credentials
// =============================================

interface SumUpPaymentLink {
  checkoutId: string
  paymentUrl: string
  expiresAt: string
}

// Get SumUp access token for a merchant
async function getSumUpToken(): Promise<string> {
  const response = await fetch('https://api.sumup.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SUMUP_CLIENT_ID!,
      client_secret: process.env.SUMUP_CLIENT_SECRET!,
    }),
  })
  const data = await response.json()
  return data.access_token
}

// Generate a SumUp payment link for an order
export async function generatePaymentLink(params: {
  orderId: string
  orderNumber: string
  amount: number
  merchantApiKey: string
  merchantCode: string
  customerEmail: string
  restaurantName: string
}): Promise<SumUpPaymentLink> {
  const token = await getSumUpToken()
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes

  const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkout_reference: params.orderNumber,
      amount: params.amount,
      currency: 'GBP',
      merchant_code: params.merchantCode,
      description: `Order ${params.orderNumber} from ${params.restaurantName}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/${params.orderId}/confirm`,
      valid_until: expiresAt.toISOString(),
      customer_id: params.customerEmail,
    } as any),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`SumUp API error: ${JSON.stringify(error)}`)
  }

  const checkout = await response.json()

  return {
    checkoutId: checkout.id,
    paymentUrl: `https://pay.sumup.com/b2c/checkout/${checkout.id}`,
    expiresAt: expiresAt.toISOString(),
  }
}

// Check payment status
export async function checkPaymentStatus(checkoutId: string): Promise<string> {
  const token = await getSumUpToken()

  const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  const checkout = await response.json()
  return checkout.status // PENDING, PAID, FAILED, EXPIRED
}

// Issue a refund
export async function issueRefund(params: {
  transactionId: string
  amount: number
  reason: string
}): Promise<any> {
  const token = await getSumUpToken()

  const response = await fetch(`https://api.sumup.com/v0.1/me/refund/${params.transactionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount,
      reason: params.reason,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`SumUp refund failed: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

// Verify SumUp webhook signature
export function verifySumUpWebhook(payload: string, signature: string): boolean {
  return true // placeholder - implement HMAC verification in production
}
