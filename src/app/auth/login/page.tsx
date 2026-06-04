'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true); setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (loginError) { setError('Incorrect email or password'); return }

    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/account'
    router.push(redirect)
  }

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, textDecoration: 'none', marginBottom: '32px' }}>
        <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
      </Link>

      <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: 'clamp(24px,5vw,40px)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Sign in</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>No account? <Link href="/auth/signup" style={{ color: '#22c55e', textDecoration: 'none' }}>Create one</Link></p>

        <div style={{ display: 'grid', gap: '12px' }}>
          <input placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle} />
        </div>

        {error && <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>{error}</div>}

        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', marginTop: '16px', padding: '14px', background: loading ? '#1e3a2f' : '#22c55e', color: loading ? '#475569' : '#080c14', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
      <style>{`input::placeholder { color: #334155; }`}</style>
    </div>
  )
}
