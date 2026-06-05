'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function MerchantLogin() {
  const router = useRouter()
  const supabase = createClient()
  const [destination, setDestination] = useState<'dashboard'|'terminal'|null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  async function login() {
    if (!destination) { setError('Please choose where to go first'); return }
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError('Invalid email or password'); setLoading(false); return }
    router.push(destination === 'dashboard' ? '/merchant/dashboard' : '/merchant/terminal')
  }

  const bg = dark ? '#080c14' : '#f8fafc'
  const card = dark ? '#0d1321' : '#ffffff'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const text = dark ? '#f1f5f9' : '#0f172a'
  const sub = dark ? '#64748b' : '#94a3b8'
  const inputStyle: any = { width: '100%', padding: '12px 14px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' }}>

      <nav style={{ background: dark ? '#060b18' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me.gg</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: sub, textDecoration: 'none' }}>Back to site</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px', textAlign: 'center' }}>Restaurant Login</h1>
          <p style={{ fontSize: '14px', color: sub, textAlign: 'center', marginBottom: '28px' }}>Where would you like to go?</p>

          {/* DESTINATION PICKER */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => setDestination('dashboard')} style={{ background: destination === 'dashboard' ? 'rgba(34,197,94,0.08)' : card, border: `2px solid ${destination === 'dashboard' ? '#22c55e' : border}`, borderRadius: '14px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: text }}>Dashboard</div>
              <div style={{ fontSize: '11px', color: sub }}>Manage menu & settings</div>
            </button>
            <button onClick={() => setDestination('terminal')} style={{ background: destination === 'terminal' ? 'rgba(34,197,94,0.08)' : card, border: `2px solid ${destination === 'terminal' ? '#22c55e' : border}`, borderRadius: '14px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖥️</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: text }}>Terminal</div>
              <div style={{ fontSize: '11px', color: sub }}>Take & manage orders</div>
            </button>
          </div>

          {/* LOGIN FORM */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} onKeyDown={e => e.key === 'Enter' && login()} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={inputStyle} onKeyDown={e => e.key === 'Enter' && login()} />
              </div>
              {error && <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>{error}</div>}
              <button onClick={login} disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#1e3a2f' : '#22c55e', color: loading ? '#475569' : '#080c14', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Signing in...' : `Sign in${destination ? ` to ${destination === 'dashboard' ? 'Dashboard' : 'Terminal'}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`input::placeholder { color: #334155; }`}</style>
    </div>
  )
}
