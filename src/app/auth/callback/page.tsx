'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      // Check if customer profile has phone number
      const { data: customer } = await supabase
        .from('customers')
        .select('phone, name')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/account'

      // If no phone number redirect to complete profile
      if (!customer?.phone) {
        router.push(`/auth/complete-profile?redirect=${redirect}`)
      } else {
        router.push(redirect)
      }
    }
    handleCallback()
  }, [])

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', color: '#f1f5f9' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚡</div>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Signing you in...</div>
      </div>
    </div>
  )
}
