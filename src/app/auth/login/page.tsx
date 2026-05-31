'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true); setError(''); setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('Invalid email or password.'); setLoading(false); return }
      router.push('/')
    } else {
      if (!name) { setError('Please enter your name.'); setLoading(false); return }
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
      if (error) { setError(error.message); setLoading(false); return }
      setSuccess('Account created! Check your email to verify your account.')
      setLoading(false)
    }
  }

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  async function loginWithApple() {
    await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>
              <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
            </div>
          </Link>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--sub)', marginBottom: '24px' }}>
            {mode === 'login' ? 'Sign in to your feedme.gg account' : 'Sign up to start ordering food'}
          </p>

          {/* Social buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <button onClick={loginWithGoogle} style={{ background: 'white', color: '#333', border: '1px solid #ddd', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              🔵 Continue with Google
            </button>
            <button onClick={loginWithApple} style={{ background: '#000', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
               Continue with Apple
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--sub)', marginBottom: '16px' }}>or continue with email</div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '13px', color: 'var(--red)' }}>{error}</div>}
          {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '13px', color: 'var(--green)' }}>{success}</div>}

          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Full name</label>
              <input className="input" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Email address</label>
            <input className="input" type="email" placeholder="jane@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '10px' }}>
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <a href="#" style={{ fontSize: '13px', color: 'var(--green)', textDecoration: 'none' }}>Forgot password?</a>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--sub)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: '13px', cursor: 'pointer' }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
