'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ErrorsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [errors, setErrors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'unresolved' | 'all'>('unresolved')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndFetch()
    // Auto-refresh every 15 seconds so this can be left open as a live monitor
    const interval = setInterval(fetchErrors, 15000)
    return () => clearInterval(interval)
  }, [filter])

  async function checkAuthAndFetch() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/admin'); return }
    await fetchErrors()
  }

  async function fetchErrors() {
    let query = supabase.from('system_errors').select('*, orders(order_number, total), restaurants(name)').order('created_at', { ascending: false }).limit(100)
    if (filter === 'unresolved') query = query.eq('resolved', false)
    const { data } = await query
    setErrors(data || [])
    setLoading(false)
  }

  async function markResolved(id: string) {
    await supabase.from('system_errors').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', id)
    fetchErrors()
  }

  async function dismissAll() {
    if (!confirm('Mark all currently visible errors as resolved?')) return
    const ids = errors.map(e => e.id)
    await supabase.from('system_errors').update({ resolved: true, resolved_at: new Date().toISOString() }).in('id', ids)
    fetchErrors()
  }

  const sourceColors: Record<string, string> = {
    'checkout-create': '#ef4444',
    'sumup-webhook': '#f97316',
    'refund': '#a855f7',
    'print-failure': '#dc2626',
  }

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif' }}>
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ fontFamily: 'Syne,sans-serif', fontSize: '18px', fontWeight: 800, textDecoration: 'none' }}>
            <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me.gg</span>
          </Link>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>System Errors</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {errors.length > 0 && filter === 'unresolved' && (
            <button onClick={dismissAll} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Mark all resolved
            </button>
          )}
          <Link href="/admin" style={{ padding: '6px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Back to admin
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, marginBottom: '4px' }}>System Errors</h1>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Auto-refreshes every 15 seconds. Leave this tab open to monitor live.</div>
          </div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '4px' }}>
            {(['unresolved', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', background: filter === f ? '#22c55e' : 'transparent', color: filter === f ? '#080c14' : '#94a3b8', textTransform: 'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading...</div>
        ) : errors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#0d1321', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e', marginBottom: '6px' }}>No {filter === 'unresolved' ? 'unresolved' : ''} errors</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Everything is running smoothly.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {errors.map(err => {
              const isExpanded = expandedId === err.id
              const color = sourceColors[err.source] || '#64748b'
              return (
                <div key={err.id} style={{ background: '#0d1321', border: `1px solid ${err.resolved ? 'rgba(255,255,255,0.07)' : color + '40'}`, borderLeft: `3px solid ${err.resolved ? '#334155' : color}`, borderRadius: '12px', padding: '16px', opacity: err.resolved ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : err.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: color + '20', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{err.source}</span>
                        <span style={{ fontSize: '11px', color: '#475569' }}>{new Date(err.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{err.message}</div>
                      {(err.orders || err.restaurants) && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {err.orders && <>Order {err.orders.order_number} • GBP{err.orders.total} </>}
                          {err.restaurants && <>• {err.restaurants.name}</>}
                        </div>
                      )}
                    </div>
                    {!err.resolved && (
                      <button onClick={() => markResolved(err.id)} style={{ padding: '6px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Mark resolved
                      </button>
                    )}
                  </div>
                  {isExpanded && err.details && (
                    <pre style={{ background: '#060b18', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#94a3b8', overflowX: 'auto', marginTop: '10px', marginBottom: 0 }}>
                      {JSON.stringify(err.details, null, 2)}
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
