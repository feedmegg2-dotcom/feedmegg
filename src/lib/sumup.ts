interface SumUpPaymentLink {
  checkoutId: string
  paymentUrl: string
  expiresAt: string
}

export async function generatePaymentLink(params: {
  orderId: string
  orderNumber: string
  amount: number
  merchantApiKey: string
  merchantCode: string
  customerEmail?: string
  restaurantName: string
}): Promise<SumUpPaymentLink> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.merchantApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkout_reference: `ORDER-${params.orderNumber}`,
      amount: params.amount,
      currency: 'GBP',
      merchant_code: params.merchantCode,
      description: `Order ${params.orderNumber} from ${params.restaurantName}`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/${params.orderId}/confirmed`,
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/${params.orderId}/confirmed`,
      hosted_checkout: {
        enabled: true,
      },
    }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`SumUp API error: ${JSON.stringify(error)}`)
  }
  const checkout = await response.json()
  return {
    checkoutId: checkout.id,
    paymentUrl: checkout.hosted_checkout_url || `https://checkout.sumup.com/pay/c-${checkout.id}`,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function fetchExistingCheckout(reference: string, merchantApiKey: string): Promise<{ checkoutId: string, paymentUrl: string } | null> {
  const response = await fetch(`https://api.sumup.com/v0.1/checkouts?checkout_reference=${encodeURIComponent(reference)}`, {
    headers: { 'Authorization': `Bearer ${merchantApiKey}` },
  })
  if (!response.ok) return null
  const data = await response.json()
  const checkout = Array.isArray(data) ? data[0] : data
  if (!checkout?.id) return null
  return {
    checkoutId: checkout.id,
    paymentUrl: checkout.hosted_checkout_url || `https://checkout.sumup.com/pay/c-${checkout.id}`,
  }
}

export async function checkPaymentStatus(checkoutId: string, merchantApiKey: string): Promise<string> {
  const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
    headers: { 'Authorization': `Bearer ${merchantApiKey}` },
  })
  const checkout = await response.json()
  return checkout.status
}

export async function issueRefund(params: {
  transactionId: string
  amount: number
  reason: string
  merchantApiKey: string
}): Promise<any> {
  const response = await fetch(`https://api.sumup.com/v0.1/me/refund/${params.transactionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.merchantApiKey}`,
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

export function verifySumUpWebhook(payload: string, signature: string): boolean {
  return true
}
