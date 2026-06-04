'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [addresses, setAddresses] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'profile'|'addresses'|'orders'>('profile')
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Profile form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<any>(null)
  const [addrName, setAddrName] = useState('Home')
  const [addrLine1, setAddrLine1] = useState('')
  const [addrLine2, setAddrLine2] = useState('')
  const [addrParish, setAddrParish] = useState('')
  const [addrPostcode, setAddrPostcode] = useState('')
  const [addrDesc, setAddrDesc] = useState('')

  const PARISHES = ['Castel','Forest','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUser(user)
    const { data: cust } = await supabase.from('customers').select('*').eq('auth_id', user.id).single()
    if (cust) {
      setCustomer(cust)
      setFirstName(cust.first_name || '')
      setLastName(cust.last_name || '')
      setPhone(cust.phone || '')
    }
    await fetchAddresses(cust?.id)
    await fetchOrders(cust?.id)
    setLoading(false)
  }

  async function fetchAddresses(customerId: string) {
    if (!customerId) return
    const { data } = await supabase.from('customer_addresses').select('*').eq('customer_id', customerId).order('is_default', { ascending: false })
    setAddresses(data || [])
  }

  async function fetchOrders(customerId: string) {
    if (!customerId) return
    const { data } = await supabase.from('orders').select('*, restaurants(name, emoji, logo_url)').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(20)
    setOrders(data || [])
  }

  async function saveProfile() {
    if (!customer) return
    setSaving(true)
    await supabase.from('customers').update({ first_name: firstName, last_name: lastName, phone, name: `${firstName} ${lastName}`.trim() }).eq('id', customer.id)
    setMsg('Profile saved!')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  function openAddressForm(addr?: any) {
    if (addr) {
      setEditingAddress(addr)
      setAddrName(addr.name || 'Home')
      setAddrLine1(addr.address_line1 || '')
      setAddrLine2(addr.address_line2 || '')
      setAddrParish(addr.parish || '')
      setAddrPostcode(addr.postcode || '')
      setAddrDesc(addr.location_description || '')
    } else {
      setEditingAddress(null)
      setAddrName('Home')
      setAddrLine1('')
      setAddrLine2('')
      setAddrParish('')
      setAddrPostcode('')
      setAddrDesc('')
    }
    setShowAddressForm(true)
  }

  async function saveAddress() {
    if (!customer || !addrLine1 || !addrParish) { setMsg('Please fill in address and parish'); return }
    setSaving(true)
    const payload = {
      customer_id: customer.id,
      name: addrName,
      address_line1: addrLine1,
      address_line2: addrLine2,
      parish: addrParish,
      postcode: addrPostcode,
      location_description: addrDesc,
      is_default: addresses.length === 0
    }
    if (editingAddress) {
      await supabase.from('customer_addresses').update(payload).eq('id', editingAddress.id)
    } else {
      await supabase.from('customer_addresses').insert(payload)
    }
    await fetchAddresses(customer.id)
    setShowAddressForm(false)
    setSaving(false)
    setMsg('Address saved!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function setDefaultAddress(addrId: string) {
    await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', customer.id)
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', addrId)
    await fetchAddresses(customer.id)
    setMsg('Default address updated!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteAddress(addrId: string) {
    if (!confirm('Delete this address?')) return
    await supabase.from('customer_addresses').delete().eq('id', addrId)
    await fetchAddresses(customer.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const inputStyle: any = { width: '100%', padding: '12px 14px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px', color: dark ? '#f1f5f9' : '#0f172a', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  if (loading) return (
    <div style={{ background: '#080c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>
  )

  return (
    <div style={{ background: dark ? '#080c14' : '#f8fafc', minHeight: '100vh', color: dark ? '#f1f5f9' : '#0f172a', fontFamily: 'system-ui,sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: dark ? '#060b18' : '#ffffff', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me.gg</span>
        </Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => { const n = !dark; setDark(n); localStorage.setItem('feedme-theme', n ? 'dark' : 'light') }}
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, color: dark ? '#94a3b8' : '#64748b', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            {dark ? 'Light' : 'Dark'}
          </button>
          <Link href="/" style={{ padding: '8px 18px', background: '#22c55e', color: '#080c14', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Order Food</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>My Account</h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>{user?.email}</p>
        </div>

        {msg && <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '13px', color: '#22c55e' }}>{msg}</div>}

        {/* TABS */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
          {(['profile','addresses','orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', background: tab === t ? '#22c55e' : 'transparent', color: tab === t ? '#080c14' : '#64748b', textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div style={{ background: dark ? '#0d1321' : '#ffffff', border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Personal Details</h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>First name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Last name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Phone number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 07911 123456" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Email address</label>
                <input value={user?.email || ''} disabled style={{ ...inputStyle, opacity: 0.5 }} />
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving}
              style={{ marginTop: '16px', padding: '12px 24px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={signOut} style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* ADDRESSES TAB */}
        {tab === 'addresses' && (
          <div>
            {!showAddressForm ? (
              <>
                <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                  {addresses.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#475569', background: '#0d1321', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                      No saved addresses yet
                    </div>
                  )}
                  {addresses.map(addr => (
                    <div key={addr.id} style={{ background: '#0d1321', border: `1px solid ${addr.is_default ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '16px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>{addr.name}</span>
                          {addr.is_default && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 600 }}>Default</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!addr.is_default && (
                            <button onClick={() => setDefaultAddress(addr.id)} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>
                              Set default
                            </button>
                          )}
                          <button onClick={() => openAddressForm(addr)} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => deleteAddress(addr.id)} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                        <div>{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}</div>
                        <div>{addr.parish}{addr.postcode ? `, ${addr.postcode}` : ''}</div>
                        {addr.location_description && <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>"{addr.location_description}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => openAddressForm()} style={{ width: '100%', padding: '14px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Add New Address
                </button>
              </>
            ) : (
              <div style={{ background: dark ? '#0d1321' : '#ffffff', border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '16px', padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Address name (e.g. Home, Work)</label>
                    <input value={addrName} onChange={e => setAddrName(e.target.value)} placeholder="Home" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>House number and street *</label>
                    <input value={addrLine1} onChange={e => setAddrLine1(e.target.value)} placeholder="e.g. 12 La Route de St Martin" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Apartment / Building name (optional)</label>
                    <input value={addrLine2} onChange={e => setAddrLine2(e.target.value)} placeholder="e.g. Flat 2, Les Mielles" style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Parish *</label>
                      <select value={addrParish} onChange={e => setAddrParish(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                        <option value="">Select parish</option>
                        {PARISHES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Postcode</label>
                      <input value={addrPostcode} onChange={e => setAddrPostcode(e.target.value)} placeholder="e.g. GY4 6RT" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Location description (helps the driver find you)</label>
                    <textarea value={addrDesc} onChange={e => setAddrDesc(e.target.value)} placeholder="e.g. Past the big tree, white van in the drive. Ring bell on gate." rows={3}
                      style={{ ...inputStyle, resize: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button onClick={saveAddress} disabled={saving}
                    style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {saving ? 'Saving...' : 'Save Address'}
                  </button>
                  <button onClick={() => setShowAddressForm(false)}
                    style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569', background: '#0d1321', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>No orders yet</div>
                <Link href="/" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>Order some food!</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {orders.map(order => (
                  <div key={order.id} style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>{order.restaurants?.emoji || 'food'}</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700 }}>{order.restaurants?.name}</div>
                          <div style={{ fontSize: '11px', color: '#475569' }}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</div>
                        <div style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: order.status === 'completed' ? 'rgba(34,197,94,0.15)' : order.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: order.status === 'completed' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : '#f97316', marginTop: '4px', display: 'inline-block' }}>{order.status}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>{order.order_type === 'delivery' ? 'Delivery' : 'Collection'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`input::placeholder, textarea::placeholder { color: #334155; } select option { background: #0d1321; }`}</style>
    </div>
  )
}
