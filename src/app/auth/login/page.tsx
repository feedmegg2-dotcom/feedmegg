'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string|null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  async function handleLogin() {
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true); setError('')
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (loginError) { setError('Incorrect email or password'); return }
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/account'
    router.push(redirect)
  }

  async function handleSocialLogin(provider: 'google') {
    setSocialLoading(provider)
    setError('')
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/account'
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      }
    })
    if (error) { setError(`Could not sign in with ${provider}`); setSocialLoading(null) }
  }

  const bg = dark ? '#080c14' : '#f8fafc'
  const card = dark ? '#0d1321' : '#ffffff'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const text = dark ? '#f1f5f9' : '#0f172a'
  const inputStyle = { width: '100%', padding: '12px 14px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, textDecoration: 'none', marginBottom: '32px' }}>
        <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
      </Link>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '20px', padding: 'clamp(24px,5vw,40px)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Sign in</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>No account? <Link href="/auth/signup" style={{ color: '#22c55e', textDecoration: 'none' }}>Create one</Link></p>

        {/* SOCIAL LOGIN BUTTONS */}
        <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}
            style={{ width: '100%', padding: '12px', background: dark ? 'rgba(255,255,255,0.06)' : '#ffffff', border: `1px solid ${border}`, borderRadius: '10px', color: text, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {socialLoading === 'google' ? 'Connecting...' : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </>
            )}
          </button>
        </div>

        {/* DIVIDER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: border }} />
          <span style={{ fontSize: '12px', color: '#64748b' }}>or sign in with email</span>
          <div style={{ flex: 1, height: '1px', background: border }} />
        </div>

        {/* EMAIL LOGIN */}
        <div style={{ display: 'grid', gap: '12px' }}>
          <input placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle} />
        </div>

        {error && <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>{error}</div>}

        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', marginTop: '16px', padding: '14px', background: loading ? '#1e3a2f' : '#22c55e', color: loading ? '#475569' : '#080c14', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p style={{ fontSize: '12px', color: '#475569', textAlign: 'center', marginTop: '16px' }}>
          <Link href="/auth/forgot-password" style={{ color: '#64748b', textDecoration: 'none' }}>Forgot password?</Link>
        </p>
      </div>
      <style>{`input::placeholder { color: #334155; }`}</style>
    </div>
  )
}
