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
  const [addresses, setAddresses] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'profile'|'addresses'|'orders'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [dark, setDark] = useState(true)

  // Profile
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<any>(null)
  const [addrName, setAddrName] = useState('Home')
  const [addrLine1, setAddrLine1] = useState('')
  const [addrLine2, setAddrLine2] = useState('')
  const [addrParish, setAddrParish] = useState('St Peter Port')
  const [addrPostcode, setAddrPostcode] = useState('')
  const [addrDesc, setAddrDesc] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUser(user)
    // Try auth_id first, then id, then email
    let { data: cust } = await supabase.from('customers').select('*').eq('auth_id', user.id).single()
    if (!cust) {
      const res2 = await supabase.from('customers').select('*').eq('id', user.id).single()
      cust = res2.data
    }
    if (!cust && user.email) {
      const res3 = await supabase.from('customers').select('*').ilike('email', user.email).single()
      cust = res3.data
      // Link auth_id so future lookups work
      if (cust) await supabase.from('customers').update({ auth_id: user.id }).eq('id', cust.id)
    }
    if (cust) {
      setCustomer(cust)
      setFirstName(cust.first_name || '')
      setLastName(cust.last_name || '')
      setPhone(cust.phone || '')
      await fetchAddresses(cust.id)
      await fetchOrders(cust.id)
    }
    setLoading(false)
  }

  async function fetchAddresses(customerId: string) {
    const { data } = await supabase.from('customer_addresses').select('*').eq('customer_id', customerId).order('is_default', { ascending: false })
    setAddresses(data || [])
  }

  async function fetchOrders(customerId: string) {
    const { data } = await supabase.from('orders').select('*, restaurants(name, emoji, logo_url)').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(20)
    setOrders(data || [])
  }

  async function saveProfile() {
    if (!customer) {
      setMsg('Error: Could not find your account. Please log out and back in.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('customers').update({
      first_name: firstName,
      last_name: lastName,
      phone,
      name: (firstName + ' ' + lastName).trim()
    }).eq('id', customer.id)
    setSaving(false)
    if (error) {
      setMsg('Error saving: ' + error.message)
    } else {
      setMsg('Profile updated! ✓')
    }
    setTimeout(() => setMsg(''), 4000)
  }

  async function changePassword() {
    if (!newPassword) { setPwMsg('Please enter a new password'); return }
    if (newPassword !== confirmPassword) { setPwMsg('Passwords do not match'); return }
    if (newPassword.length < 6) { setPwMsg('Password must be at least 6 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwMsg('Error: ' + error.message); return }
    setPwMsg('Password updated!')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwMsg(''), 3000)
  }

  function openAddressForm(addr?: any) {
    if (addr) {
      setEditingAddress(addr)
      setAddrName(addr.name || 'Home')
      setAddrLine1(addr.address_line1 || '')
      setAddrLine2(addr.address_line2 || '')
      setAddrParish(addr.parish || 'St Peter Port')
      setAddrPostcode(addr.postcode || '')
      setAddrDesc(addr.location_description || '')
    } else {
      setEditingAddress(null)
      setAddrName('Home')
      setAddrLine1('')
      setAddrLine2('')
      setAddrParish('St Peter Port')
      setAddrPostcode('')
      setAddrDesc('')
    }
    setShowAddressForm(true)
  }

  async function saveAddress() {
    if (!customer) { setMsg('Not logged in — please refresh'); return }
    if (!addrLine1) { setMsg('Please enter your house number and street'); return }
    setSaving(true)
    setMsg('')
    const payload = {
      customer_id: customer.id,
      name: addrName || 'Home',
      address_line1: addrLine1,
      address_line2: addrLine2 || null,
      parish: addrParish || 'St Peter Port',
      postcode: addrPostcode || null,
      location_description: addrDesc || null,
      is_default: addresses.length === 0
    }
    let error = null
    if (editingAddress) {
      const res = await supabase.from('customer_addresses').update(payload).eq('id', editingAddress.id)
      error = res.error
    } else {
      const res = await supabase.from('customer_addresses').insert(payload)
      error = res.error
    }
    setSaving(false)
    if (error) {
      setMsg('Error saving: ' + error.message)
      return
    }
    await fetchAddresses(customer.id)
    setShowAddressForm(false)
    setTab('addresses')
    setMsg('Address saved! You can add another address below.')
    setTimeout(() => setMsg(''), 5000)
  }

  async function setDefaultAddress(addrId: string) {
    await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', customer.id)
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', addrId)
    await fetchAddresses(customer.id)
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

  const bg = dark ? '#080c14' : '#f8fafc'
  const card = dark ? '#0d1321' : '#ffffff'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const text = dark ? '#f1f5f9' : '#0f172a'
  const sub = dark ? '#64748b' : '#94a3b8'
  const inputStyle: any = { width: '100%', padding: '10px 14px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  if (loading) return <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sub }}>Loading...</div>

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: 'system-ui,sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: dark ? '#060b18' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me.gg</span>
        </Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => { const n = !dark; setDark(n); localStorage.setItem('feedme-theme', n ? 'dark' : 'light') }}
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, color: sub, padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            {dark ? 'Light' : 'Dark'}
          </button>
          <Link href="/" style={{ padding: '8px 16px', background: '#22c55e', color: '#080c14', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Order Food</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 20px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, marginBottom: '4px' }}>My Account</h1>
            <div style={{ fontSize: '13px', color: sub }}>{user?.email}</div>
          </div>
          <button onClick={signOut} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign out
          </button>
        </div>

        {/* SUCCESS MESSAGE */}
        {msg && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', fontSize: '14px', color: '#22c55e', fontWeight: 600 }}>
            {msg}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: '10px', padding: '4px' }}>
          {(['profile','addresses','orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', background: tab === t ? '#22c55e' : 'transparent', color: tab === t ? '#080c14' : sub, textTransform: 'capitalize' }}>
              {t === 'profile' ? 'Your Info' : t === 'addresses' ? 'Addresses' : 'Order History'}
            </button>
          ))}
        </div>

        {/* PROFILE TAB - two column like food.gg */}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>

            {/* Personal Details */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', paddingBottom: '12px', borderBottom: `1px solid ${border}` }}>Personal Details</h2>
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>First name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Last name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Phone number</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 07911 123456" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Email address</label>
                  <input value={user?.email || ''} disabled style={{ ...inputStyle, opacity: 0.5 }} />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  style={{ padding: '11px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '4px' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', paddingBottom: '12px', borderBottom: `1px solid ${border}` }}>Change Password</h2>
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>New password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Confirm new password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" style={inputStyle} />
                </div>
                {pwMsg && (
                  <div style={{ padding: '10px 12px', background: pwMsg.includes('updated') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', border: `1px solid ${pwMsg.includes('updated') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', fontSize: '13px', color: pwMsg.includes('updated') ? '#22c55e' : '#fca5a5', fontWeight: 600 }}>
                    {pwMsg}
                  </div>
                )}
                <button onClick={changePassword}
                  style={{ padding: '11px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '4px' }}>
                  Save New Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADDRESSES TAB */}
        {tab === 'addresses' && (
          <div>
            {!showAddressForm ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {addresses.map(addr => (
                  <div key={addr.id} style={{ background: card, border: `2px solid ${addr.is_default ? 'rgba(34,197,94,0.3)' : border}`, borderRadius: '16px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700 }}>{addr.name}</span>
                        {addr.is_default && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 600 }}>Default</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: sub, lineHeight: 1.7, marginBottom: '14px' }}>
                      <div>{addr.address_line1}</div>
                      {addr.address_line2 && <div>{addr.address_line2}</div>}
                      <div>{addr.parish}{addr.postcode ? `, ${addr.postcode}` : ''}</div>
                      {addr.location_description && <div style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '12px' }}>"{addr.location_description}"</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {!addr.is_default && (
                        <button onClick={() => setDefaultAddress(addr.id)} style={{ fontSize: '11px', padding: '5px 10px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Set default
                        </button>
                      )}
                      <button onClick={() => openAddressForm(addr)} style={{ fontSize: '11px', padding: '5px 10px', background: 'rgba(255,255,255,0.06)', color: sub, border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                      <button onClick={() => deleteAddress(addr.id)} style={{ fontSize: '11px', padding: '5px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                    </div>
                  </div>
                ))}

                {/* Add address card */}
                <div onClick={() => openAddressForm()} style={{ background: 'transparent', border: `2px dashed ${border}`, borderRadius: '16px', padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '140px' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#22c55e')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px', color: sub }}>+</div>
                    <div style={{ fontSize: '13px', color: sub, fontWeight: 600 }}>Add an address</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '24px', maxWidth: '500px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', paddingBottom: '12px', borderBottom: `1px solid ${border}` }}>
                  {editingAddress ? 'Edit Address' : 'Add an Address'}
                </h2>
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Address name</label>
                    <input value={addrName} onChange={e => setAddrName(e.target.value)} placeholder="e.g. Home, Work" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Address line 1 *</label>
                    <input value={addrLine1} onChange={e => setAddrLine1(e.target.value)} placeholder="House number and street" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Address line 2</label>
                    <input value={addrLine2} onChange={e => setAddrLine2(e.target.value)} placeholder="Apartment / building name (optional)" style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Parish *</label>
                      <select value={addrParish} onChange={e => setAddrParish(e.target.value)} style={{ ...inputStyle, appearance: 'none' as any }}>
                        {PARISHES.map(p => <option key={p} value={p} style={{ background: dark ? '#0d1321' : '#fff' }}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Postcode</label>
                      <input value={addrPostcode} onChange={e => setAddrPostcode(e.target.value)} placeholder="e.g. GY4 6RT" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Directions (helps the driver find you)</label>
                    <textarea value={addrDesc} onChange={e => setAddrDesc(e.target.value)} placeholder="e.g. Past the big tree, white van in the drive. Ring bell on gate." rows={3}
                      style={{ ...inputStyle, resize: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button onClick={saveAddress} disabled={saving}
                    style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {saving ? 'Saving...' : 'Save Address'}
                  </button>
                  <button onClick={() => setShowAddressForm(false)}
                    style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.06)', color: sub, border: `1px solid ${border}`, borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
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
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>No orders yet</div>
                <p style={{ color: sub, marginBottom: '20px' }}>You haven't placed any orders yet</p>
                <Link href="/" style={{ padding: '12px 24px', background: '#22c55e', color: '#080c14', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>Order some food!</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {orders.map(order => (
                  <div key={order.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {order.restaurants?.logo_url
                          ? <img src={order.restaurants.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '24px' }}>{order.restaurants?.emoji}</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>{order.restaurants?.name}</div>
                        <div style={{ fontSize: '12px', color: sub }}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} &bull; {order.order_type === 'delivery' ? 'Delivery' : 'Collection'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', fontWeight: 600, background: order.status === 'completed' || order.status === 'paid' ? 'rgba(34,197,94,0.15)' : order.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: order.status === 'completed' || order.status === 'paid' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : '#f97316' }}>
                        {order.status}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`input::placeholder, textarea::placeholder { color: #334155; } select option { background: ${dark ? '#0d1321' : '#fff'}; }`}</style>
    </div>
  )
}
