'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const PARISHES = ['Castel','Forest','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => { fetchAccount() }, [])

  async function fetchAccount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?redirect=/account'); return }
    setUser(user)

    const { data: cust } = await supabase.from('customers').select('*').eq('id', user.id).single()
    setCustomer(cust)
    setForm(cust || {})

    const { data: ords } = await supabase.from('orders').select('*, restaurants(name)').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(20)
    setOrders(ords || [])
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    await supabase.from('customers').update({ name: form.name, phone: form.phone, address: form.address, parish: form.parish }).eq('id', user.id)
    setCustomer({ ...customer, ...form })
    setEditing(false)
    setSaving(false)
    setMsg('Profile updated!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function reorder(order: any) {
    if (!order.items) return
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    localStorage.setItem('feedme-cart', JSON.stringify({ cart: items, restaurantId: order.restaurant_id, restaurantName: order.restaurants?.name }))
    router.push('/checkout')
  }

  if (loading) return <div style={{ background: '#080c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>

  const inputStyle = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <button onClick={signOut} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(20px,4vw,40px) 20px' }}>

        {msg && <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '13px', color: '#22c55e', marginBottom: '16px' }}>{msg}</div>}

        {/* PROFILE */}
        <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: '18px', fontWeight: 700 }}>My Account</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {customer?.phone_verified && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>Phone verified</span>}
              {!customer?.phone_verified && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>Phone unverified</span>}
              <button onClick={() => setEditing(!editing)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>

          {editing ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              <input placeholder="Full name" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} />
              <input placeholder="Phone number" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} style={inputStyle} />
              <select value={form.parish || 'St Peter Port'} onChange={e => setForm({...form, parish: e.target.value})} style={{ ...inputStyle, appearance: 'none' as const }}>
                {PARISHES.map(p => <option key={p} value={p} style={{ background: '#0d1321' }}>{p}</option>)}
              </select>
              <input placeholder="Street address" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} style={inputStyle} />
              <button onClick={saveProfile} disabled={saving} style={{ padding: '10px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: '#475569', width: '80px' }}>Name</span><span>{customer?.name}</span></div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: '#475569', width: '80px' }}>Email</span><span>{customer?.email}</span></div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: '#475569', width: '80px' }}>Phone</span><span>{customer?.phone}</span></div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: '#475569', width: '80px' }}>Parish</span><span>{customer?.parish}</span></div>
              {customer?.address && <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: '#475569', width: '80px' }}>Address</span><span>{customer?.address}</span></div>}
            </div>
          )}
        </div>

        {/* ORDER HISTORY */}
        <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Order History</h2>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>food</div>
              <div>No orders yet  <Link href="/" style={{ color: '#22c55e', textDecoration: 'none' }}>browse restaurants</Link></div>
            </div>
          ) : (
            orders.map(o => (
              <div key={o.id} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
                <div onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                  style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{o.restaurants?.name}</div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{new Date(o.created_at).toLocaleString('en-GB')} - {o.order_type} - {o.payment_method}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>GBP{parseFloat(o.total || 0).toFixed(2)}</div>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: ['paid','complete'].includes(o.status) ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)', color: ['paid','complete'].includes(o.status) ? '#22c55e' : '#f97316' }}>{o.status}</span>
                  </div>
                </div>
                {expandedOrder === o.id && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', background: 'rgba(255,255,255,0.02)' }}>
                    {o.items && (typeof o.items === 'string' ? JSON.parse(o.items) : o.items).map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', color: '#94a3b8' }}>
                        <span>{item.qty}x {item.name}</span>
                        <span>GBP{(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                    <button onClick={() => reorder(o)}
                      style={{ marginTop: '12px', width: '100%', padding: '10px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Reorder
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`input::placeholder { color: #334155; } option { background: #0d1321; color: #f1f5f9; }`}</style>
    </div>
  )
}
