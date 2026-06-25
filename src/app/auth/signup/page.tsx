'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const PARISHES = ['Castel','Forest','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    addressLine1: '', addressLine2: '', parish: 'St Peter Port', postcode: '', directions: ''
  })
  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  async function handleGoogleSignup() {
    setSocialLoading(true)
    setError('')
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      }
    })
    if (error) { setError('Could not sign in with Google'); setSocialLoading(false) }
  }

  async function handleSignup() {
    if (!form.name || !form.email || !form.password || !form.phone) { setError('Please fill in all required fields'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!/^\+?[\d\s\-()]{10,}$/.test(form.phone)) { setError('Please enter a valid phone number'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setLoading(false)

    if (!data.success) { setError(data.error || 'Something went wrong'); return }

    // Auto login
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (loginError) { router.push('/auth/login'); return }

    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/'
    router.push(redirect)
  }

  const bg = dark ? '#080c14' : '#f8fafc'
  const card = dark ? '#0d1321' : '#ffffff'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const text = dark ? '#f1f5f9' : '#0f172a'
  const inputStyle = { width: '100%', padding: '12px 14px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }

  if (success) {
    return (
      <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, textDecoration: 'none', marginBottom: '32px' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '460px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Check your email!</h1>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, marginBottom: '24px' }}>
            We've sent a verification link to <strong style={{ color: text }}>{form.email}</strong>
            <br />Click the link to verify your account.
          </p>
          <Link href="/auth/login" style={{ display: 'inline-block', padding: '12px 32px', background: '#22c55e', color: '#080c14', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, textDecoration: 'none', marginBottom: '32px' }}>
        <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
      </Link>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '20px', padding: 'clamp(24px,5vw,40px)', width: '100%', maxWidth: '460px' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Create account</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Already have one? <Link href="/auth/login" style={{ color: '#22c55e', textDecoration: 'none' }}>Sign in</Link></p>

        {/* GOOGLE SIGNUP */}
        <button onClick={handleGoogleSignup} disabled={socialLoading}
          style={{ width: '100%', padding: '12px', background: dark ? 'rgba(255,255,255,0.06)' : '#ffffff', border: `1px solid ${border}`, borderRadius: '10px', color: text, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          {socialLoading ? 'Connecting...' : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </>
          )}
        </button>

        {/* DIVIDER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: border }} />
          <span style={{ fontSize: '12px', color: '#64748b' }}>or create with email</span>
          <div style={{ flex: 1, height: '1px', background: border }} />
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {/* PERSONAL DETAILS */}
          <input placeholder="Full name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} />
          <input placeholder="Email address *" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
          <input placeholder="Phone number * (e.g. 07700 900000)" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inputStyle} />
          <input placeholder="Password * (min 6 characters)" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />
          <input placeholder="Confirm password *" type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} style={inputStyle} />

          {/* DELIVERY ADDRESS */}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', fontWeight: 600 }}>Default delivery address <span style={{ color: '#475569', fontWeight: 400 }}>(optional - saves time at checkout)</span></div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <input placeholder="House number and street" value={form.addressLine1} onChange={e => setForm({...form, addressLine1: e.target.value})} style={inputStyle} />
              <input placeholder="Address line 2 (optional)" value={form.addressLine2} onChange={e => setForm({...form, addressLine2: e.target.value})} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select value={form.parish} onChange={e => setForm({...form, parish: e.target.value})} style={{ ...inputStyle, appearance: 'none' as const }}>
                  {PARISHES.map(p => <option key={p} value={p} style={{ background: '#0d1321' }}>{p}</option>)}
                </select>
                <input placeholder="Postcode" value={form.postcode} onChange={e => setForm({...form, postcode: e.target.value})} style={inputStyle} />
              </div>
              <input placeholder="Delivery directions (optional, e.g. Blue door, ring bell)" value={form.directions} onChange={e => setForm({...form, directions: e.target.value})} style={inputStyle} />
            </div>
          </div>
        </div>

        {error && <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>{error}</div>}

        <button onClick={handleSignup} disabled={loading}
          style={{ width: '100%', marginTop: '16px', padding: '14px', background: loading ? '#1e3a2f' : '#22c55e', color: loading ? '#475569' : '#080c14', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <p style={{ fontSize: '11px', color: '#334155', textAlign: 'center', marginTop: '14px', lineHeight: 1.5 }}>
          By creating an account you agree to our <Link href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</Link>
        </p>
      </div>
      <style>{`
        input::placeholder, textarea::placeholder { color: #334155; }
        option { background: #0d1321; color: #f1f5f9; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #0d1321 inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
          caret-color: #f1f5f9 !important;
        }
      `}</style>
    </div>
  )
}
