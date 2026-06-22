'use client'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: '#080c14', minHeight: '100vh', color: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '120px', fontFamily: 'Syne,sans-serif', fontWeight: 800, color: '#22c55e', lineHeight: 1, marginBottom: '8px' }}>404</div>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🚗</div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Looks like this page got lost on delivery</h1>
        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px', maxWidth: '400px', lineHeight: 1.6 }}>
          The page you're looking for doesn't exist. Maybe it was eaten?
        </p>
        <Link href="/" style={{ padding: '14px 32px', background: '#22c55e', color: '#080c14', borderRadius: '12px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}>
          Back to home
        </Link>
      </div>
    </div>
  )
}
