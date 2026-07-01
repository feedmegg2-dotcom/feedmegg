'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Supabase's password recovery link puts the user into a temporary
    // "recovery" session automatically once the URL's token is processed.
    // We just need to confirm a session exists before showing the form.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setError('This password reset link is invalid or has expired. Please request a new one.')
    })
  }, [])

  async function handleReset() {
    setError('')
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) { setError(updateError.message); return }
    setSuccess(true)
    setTimeout(() => router.push('/admin'), 2000)
  }

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', color: '#f1f5f9', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '28px', fontWeight: 800 }}>
            <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me.gg</span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Reset Password</div>
        </div>
        <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e', marginBottom: '6px' }}>Password updated!</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Redirecting you to login...</div>
            </div>
          ) : !ready ? (
            <div style={{ fontSize: '13px', color: error ? '#ef4444' : '#64748b', textAlign: 'center' }}>
              {error || 'Checking your reset link...'}
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '18px' }}>Set a new password</h2>
              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#ef4444' }}>{error}</div>}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Confirm password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: '13px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
