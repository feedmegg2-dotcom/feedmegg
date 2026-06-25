'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      await supabase.auth.getSession()
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/account'
      router.push(redirect)
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
