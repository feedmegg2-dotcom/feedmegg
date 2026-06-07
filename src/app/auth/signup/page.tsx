'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const PARISHES = ['Castel','Forest','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    addressLine1: '', addressLine2: '', parish: 'St Peter Port', postcode: '', directions: ''
  })
  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

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

    // Show verification message instead of auto-login
    setSuccess(true)
  }

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: dark ? '#f1f5f9' : '#0f172a', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }

  if (success) {
    return (
      <div style={{ background: dark ? '#080c14' : '#f8fafc', minHeight: '100vh', color: dark ? '#f1f5f9' : '#0f172a', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, textDecoration: 'none', marginBottom: '32px' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <div style={{ background: dark ? '#0d1321' : '#ffffff', border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '460px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Check your email!</h1>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, marginBottom: '24px' }}>
            We've sent a verification link to <strong style={{ color: '#f8fafc' }}>{form.email}</strong>
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
    <div style={{ background: dark ? '#080c14' : '#f8fafc', minHeight: '100vh', color: dark ? '#f1f5f9' : '#0f172a', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, textDecoration: 'none', marginBottom: '32px' }}>
        <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
      </Link>

      <div style={{ background: dark ? '#0d1321' : '#ffffff', border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '20px', padding: 'clamp(24px,5vw,40px)', width: '100%', maxWidth: '460px' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Create account</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Already have one? <Link href="/auth/login" style={{ color: '#22c55e', textDecoration: 'none' }}>Sign in</Link></p>

        <div style={{ display: 'grid', gap: '12px' }}>
          {/* PERSONAL DETAILS */}
          <input placeholder="Full name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} />
          <input placeholder="Email address *" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
          <input placeholder="Phone number * (e.g. 07700 900000)" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inputStyle} />
          <input placeholder="Password * (min 6 characters)" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />
          <input placeholder="Confirm password *" type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} style={inputStyle} />

          {/* DELIVERY ADDRESS */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px' }}>
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
          By creating an account you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
      <style>{`input::placeholder, textarea::placeholder { color: #334155; } option { background: #0d1321; color: #f1f5f9; }`}</style>
    </div>
  )
}
