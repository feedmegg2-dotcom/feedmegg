'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const TABS = ['dashboard', 'restaurants', 'merchants', 'orders', 'commissions', 'announcements']

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState('dashboard')
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddRestaurant, setShowAddRestaurant] = useState(false)
  const [showAddMerchant, setShowAddMerchant] = useState(false)
  const [newRestaurant, setNewRestaurant] = useState({ name: '', slug: '', cuisine_type: '', emoji: '🍽️', description: '', parish: 'St Peter Port', postcode: 'GY1', min_order: '10', delivery_time_mins: '25', merchant_id: '' })
  const [newMerchant, setNewMerchant] = useState({ name: '', email: '', phone: '', commission_rate: '4' })
  const [msg, setMsg] = useState('')

  // Simple admin password check
  function checkPassword() {
    if (password === 'feedmegg2026admin') {
      setAuthed(true)
      fetchAll()
    } else {
      setAuthError('Incorrect password')
    }
  }

  async function fetchAll() {
    setLoading(true)
    const { data: r } = await supabase.from('restaurants').select('*, merchants(name, email)').order('name')
    const { data: m } = await supabase.from('merchants').select('*').order('name')
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50)
    setRestaurants(r || [])
    setMerchants(m || [])
    setOrders(o || [])
    setLoading(false)
  }

  async function addRestaurant() {
    if (!newRestaurant.name || !newRestaurant.slug || !newRestaurant.merchant_id) {
      setMsg('Please fill in name, slug and merchant'); return
    }
    const { error } = await supabase.from('restaurants').insert({
      ...newRestaurant,
      min_order: parseFloat(newRestaurant.min_order),
      delivery_time_mins: parseInt(newRestaurant.delivery_time_mins),
      is_open: false,
      is_active: true,
      accepts_delivery: true,
      accepts_pickup: true,
      accepts_preorders: true,
      slot_capacity: 5,
      pickup_time_mins: 15,
    })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Restaurant added! ✅')
    setShowAddRestaurant(false)
    setNewRestaurant({ name: '', slug: '', cuisine_type: '', emoji: '🍽️', description: '', parish: 'St Peter Port', postcode: 'GY1', min_order: '10', delivery_time_mins: '25', merchant_id: '' })
    fetchAll()
  }

  async function addMerchant() {
    if (!newMerchant.name || !newMerchant.email) {
      setMsg('Please fill in name and email'); return
    }
    const { error } = await supabase.from('merchants').insert({
      ...newMerchant,
      commission_rate: parseFloat(newMerchant.commission_rate),
      is_trial: true,
      is_active: true,
    })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Merchant added! ✅')
    setShowAddMerchant(false)
    setNewMerchant({ name: '', email: '', phone: '', commission_rate: '4' })
    fetchAll()
  }

  async function toggleRestaurant(id: string, current: boolean) {
    await supabase.from('restaurants').update({ is_open: !current }).eq('id', id)
    fetchAll()
  }

  async function toggleRestaurantActive(id: string, current: boolean) {
    await supabase.from('restaurants').update({ is_active: !current }).eq('id', id)
    fetchAll()
  }

  const totalRevenue = orders.filter(o => o.status === 'paid' || o.status === 'complete').reduce((s, o) => s + (o.total || 0), 0)
  const totalCommission = orders.filter(o => o.status === 'paid' || o.status === 'complete').reduce((s, o) => s + (o.commission_amount || 0), 0)
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())

  if (!authed) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>
              <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--sub)', marginTop: '4px' }}>Platform Admin</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>🔐 Admin Access</h2>
            {authError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: 'var(--red)' }}>{authError}</div>}
            <div style={{ marginBottom: '16px' }}>
              <label>Admin Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkPassword()} />
            </div>
            <button className="btn-primary" onClick={checkPassword} style={{ width: '100%', padding: '13px' }}>Access Admin Panel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 800 }}>
          <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
          <span style={{ fontSize: '12px', color: 'var(--sub)', marginLeft: '8px', fontFamily: 'DM Sans' }}>Admin</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--sub)' }}>
          {restaurants.length} restaurants · {merchants.length} merchants · {orders.length} orders
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--green)' : 'transparent'}`, color: tab === t ? 'var(--green)' : 'var(--sub)', padding: '12px 16px', fontSize: '13px', fontWeight: tab === t ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px' }}>
        {msg && <div style={{ background: msg.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${msg.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: msg.includes('Error') ? 'var(--red)' : 'var(--green)' }}>{msg}</div>}

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Platform Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Restaurants', value: restaurants.length, icon: '🍽️', color: 'var(--green)' },
                { label: 'Active Merchants', value: merchants.length, icon: '👤', color: 'var(--blue)' },
                { label: "Today's Orders", value: todayOrders.length, icon: '📦', color: 'var(--orange)' },
                { label: 'Total Revenue', value: `£${totalRevenue.toFixed(2)}`, icon: '💰', color: 'var(--green)' },
                { label: 'Commission Owed', value: `£${totalCommission.toFixed(2)}`, icon: '📊', color: 'var(--orange)' },
                { label: 'Total Orders', value: orders.length, icon: '🛒', color: 'var(--sub)' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color, marginBottom: '4px' }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Recent Orders</h3>
            {orders.slice(0, 10).map(o => (
              <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{o.order_number}</div>
                  <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{o.customer_name} · {new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green)' }}>£{o.total?.toFixed(2)}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: o.status === 'paid' || o.status === 'complete' ? 'rgba(34,197,94,0.15)' : o.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: o.status === 'paid' || o.status === 'complete' ? 'var(--green)' : o.status === 'cancelled' ? 'var(--red)' : 'var(--orange)' }}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RESTAURANTS */}
        {tab === 'restaurants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Restaurants</h2>
              <button className="btn-primary" onClick={() => setShowAddRestaurant(true)} style={{ padding: '10px 18px' }}>+ Add Restaurant</button>
            </div>

            {restaurants.map(r => (
              <div key={r.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{r.emoji}</div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{r.cuisine_type} · {r.parish} · feedme.gg/restaurant/{r.slug}</div>
                      <div style={{ fontSize: '11px', color: 'var(--sub)' }}>Merchant: {r.merchants?.name} ({r.merchants?.email})</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--sub)' }}>
                      Open
                      <div onClick={() => toggleRestaurant(r.id, r.is_open)} style={{ width: '32px', height: '17px', borderRadius: '9px', background: r.is_open ? 'var(--green)' : 'var(--bg3)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: '2px', left: r.is_open ? '17px' : '2px', width: '13px', height: '13px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--sub)' }}>
                      Active
                      <div onClick={() => toggleRestaurantActive(r.id, r.is_active)} style={{ width: '32px', height: '17px', borderRadius: '9px', background: r.is_active ? 'var(--green)' : 'var(--bg3)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: '2px', left: r.is_active ? '17px' : '2px', width: '13px', height: '13px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Restaurant Modal */}
            {showAddRestaurant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddRestaurant(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add New Restaurant</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div><label>Restaurant Name</label><input className="input" placeholder="Pizza Palace" value={newRestaurant.name} onChange={e => setNewRestaurant({...newRestaurant, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})} /></div>
                    <div><label>URL Slug</label><input className="input" placeholder="pizza-palace" value={newRestaurant.slug} onChange={e => setNewRestaurant({...newRestaurant, slug: e.target.value})} /></div>
                    <div><label>Cuisine Type</label><input className="input" placeholder="Italian · Pizza" value={newRestaurant.cuisine_type} onChange={e => setNewRestaurant({...newRestaurant, cuisine_type: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" placeholder="🍕" value={newRestaurant.emoji} onChange={e => setNewRestaurant({...newRestaurant, emoji: e.target.value})} /></div>
                    <div><label>Parish</label>
                      <select className="input" value={newRestaurant.parish} onChange={e => setNewRestaurant({...newRestaurant, parish: e.target.value})}>
                        {['St Peter Port','St Sampson','Vale','Castel','St Martin','Forest','St Saviour','Torteval','St Pierre du Bois','St Andrew'].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div><label>Postcode</label><input className="input" placeholder="GY1" value={newRestaurant.postcode} onChange={e => setNewRestaurant({...newRestaurant, postcode: e.target.value})} /></div>
                    <div><label>Min Order (£)</label><input className="input" type="number" value={newRestaurant.min_order} onChange={e => setNewRestaurant({...newRestaurant, min_order: e.target.value})} /></div>
                    <div><label>Delivery Time (mins)</label><input className="input" type="number" value={newRestaurant.delivery_time_mins} onChange={e => setNewRestaurant({...newRestaurant, delivery_time_mins: e.target.value})} /></div>
                  </div>
                  <div style={{ marginBottom: '12px' }}><label>Description</label><textarea className="input" rows={2} placeholder="Fresh food made to order..." value={newRestaurant.description} onChange={e => setNewRestaurant({...newRestaurant, description: e.target.value})} style={{ resize: 'none' }} /></div>
                  <div style={{ marginBottom: '20px' }}>
                    <label>Merchant</label>
                    <select className="input" value={newRestaurant.merchant_id} onChange={e => setNewRestaurant({...newRestaurant, merchant_id: e.target.value})}>
                      <option value="">Select merchant...</option>
                      {merchants.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddRestaurant(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addRestaurant} style={{ flex: 2 }}>Add Restaurant</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MERCHANTS */}
        {tab === 'merchants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Merchants</h2>
              <button className="btn-primary" onClick={() => setShowAddMerchant(true)} style={{ padding: '10px 18px' }}>+ Add Merchant</button>
            </div>

            {merchants.map(m => (
              <div key={m.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{m.email} · {m.phone}</div>
                    <div style={{ fontSize: '11px', color: 'var(--sub)', marginTop: '3px' }}>
                      Commission: {m.commission_rate}% · {m.is_trial ? '🟡 Trial' : '✅ Active'} · Joined {new Date(m.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: m.is_trial ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)', color: m.is_trial ? '#EAB308' : 'var(--green)', fontWeight: 600 }}>
                      {m.is_trial ? 'Trial' : 'Live'}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Merchant Modal */}
            {showAddMerchant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddMerchant(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add New Merchant</h3>
                  <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                    <div><label>Full Name</label><input className="input" placeholder="John Smith" value={newMerchant.name} onChange={e => setNewMerchant({...newMerchant, name: e.target.value})} /></div>
                    <div><label>Email</label><input className="input" type="email" placeholder="john@restaurant.com" value={newMerchant.email} onChange={e => setNewMerchant({...newMerchant, email: e.target.value})} /></div>
                    <div><label>Phone</label><input className="input" placeholder="+44 1481 000000" value={newMerchant.phone} onChange={e => setNewMerchant({...newMerchant, phone: e.target.value})} /></div>
                    <div><label>Commission Rate (%)</label><input className="input" type="number" value={newMerchant.commission_rate} onChange={e => setNewMerchant({...newMerchant, commission_rate: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddMerchant(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addMerchant} style={{ flex: 2 }}>Add Merchant</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORDERS */}
        {tab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>All Orders</h2>
            {orders.map(o => (
              <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{o.order_number}</div>
                    <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{o.customer_name} · {o.customer_email}</div>
                    <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{new Date(o.created_at).toLocaleString('en-GB')} · {o.order_type} · {o.payment_method}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green)' }}>£{o.total?.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--sub)' }}>Commission: £{o.commission_amount?.toFixed(2) || '0.00'}</div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: o.status === 'paid' || o.status === 'complete' ? 'rgba(34,197,94,0.15)' : o.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: o.status === 'paid' || o.status === 'complete' ? 'var(--green)' : o.status === 'cancelled' ? 'var(--red)' : 'var(--orange)' }}>
                      {o.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sub)' }}>No orders yet</div>}
          </div>
        )}

        {/* COMMISSIONS */}
        {tab === 'commissions' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Commission Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Total Commission Earned</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)' }}>£{totalCommission.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Total Platform Revenue</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)' }}>£{totalRevenue.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Card Orders</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--blue)' }}>{orders.filter(o => o.payment_method === 'card').length}</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--sub)' }}>Commission is charged at 4% on food subtotal for card orders only. Cash orders are excluded.</p>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === 'announcements' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Announcements</h2>
            <p style={{ color: 'var(--sub)', fontSize: '13px' }}>Send announcements to all merchants — they appear on the terminal when they log in.</p>
            <div style={{ marginTop: '20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ marginBottom: '12px' }}><label>Title</label><input className="input" placeholder="Important update..." /></div>
              <div style={{ marginBottom: '12px' }}><label>Message</label><textarea className="input" rows={3} placeholder="Your announcement here..." style={{ resize: 'none' }} /></div>
              <button className="btn-primary" style={{ padding: '10px 20px' }}>Send to All Merchants</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
