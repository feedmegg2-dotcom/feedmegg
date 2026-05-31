'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function MerchantLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login() {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    // Check if they're a merchant
    const { data: merchant } = await supabase.from('merchants').select('id').eq('email', email).single()
    if (!merchant) {
      await supabase.auth.signOut()
      setError('No merchant account found for this email.')
      setLoading(false)
      return
    }

    router.push('/merchant/dashboard')
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
            </div>
          </Link>
          <div style={{ fontSize: '14px', color: 'var(--sub)' }}>Merchant Portal</div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Sign in to your account</h2>
          <p style={{ fontSize: '13px', color: 'var(--sub)', marginBottom: '24px' }}>Access your restaurant dashboard and terminal</p>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '13px', color: 'var(--red)' }}>{error}</div>}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Email address</label>
            <input className="input" type="email" placeholder="you@restaurant.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          </div>

          <button className="btn-primary" onClick={login} disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '10px' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <a href="#" style={{ fontSize: '13px', color: 'var(--green)', textDecoration: 'none' }}>Forgot password?</a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--sub)' }}>
          Want to list your restaurant on feedme.gg?{' '}
          <a href="mailto:feedme.gg@mail.com" style={{ color: 'var(--green)', textDecoration: 'none' }}>Contact us</a>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <Link href="/" style={{ fontSize: '12px', color: 'var(--sub)', textDecoration: 'none' }}>← Back to feedme.gg</Link>
        </div>
      </div>
    </div>
  )
}
