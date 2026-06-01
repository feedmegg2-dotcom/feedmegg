
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const TABS = ['dashboard', 'restaurants', 'menus', 'merchants', 'orders', 'commissions']
const PARISHES = ['St Peter Port','St Sampson','Vale','Castel','St Martin','Forest','St Saviour','Torteval','St Pierre du Bois','St Andrew']

export default function AdminPage() {
  const supabase = createClient()
  const [tab, setTab] = useState('dashboard')
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showAddRestaurant, setShowAddRestaurant] = useState(false)
  const [showAddMerchant, setShowAddMerchant] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [editRestaurant, setEditRestaurant] = useState<any>(null)

  const [newRestaurant, setNewRestaurant] = useState({ name: '', slug: '', cuisine_type: '', emoji: '🍽️', description: '', parish: 'St Peter Port', postcode: 'GY1', min_order: '10', delivery_time_mins: '25', pickup_time_mins: '15', merchant_id: '', custom_message: 'Thank you for your order!' })
  const [newMerchant, setNewMerchant] = useState({ name: '', email: '', phone: '', commission_rate: '4', password: '' })
  const [newCategory, setNewCategory] = useState({ name: '', sort_order: '1' })
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', emoji: '🍽️', calories: '', category_id: '' })

  function checkPassword() {
    if (password === 'feedmegg2026admin') { setAuthed(true); fetchAll() }
    else setAuthError('Incorrect password')
  }

  async function fetchAll() {
    const { data: r } = await supabase.from('restaurants').select('*, merchants(name,email)').order('name')
    const { data: m } = await supabase.from('merchants').select('*').order('name')
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100)
    setRestaurants(r || [])
    setMerchants(m || [])
    setOrders(o || [])
  }

  async function fetchMenuForRestaurant(restId: string) {
    const { data: cats } = await supabase.from('menu_categories').select('*').eq('restaurant_id', restId).order('sort_order')
    const { data: items } = await supabase.from('menu_items').select('*, menu_categories(name)').eq('restaurant_id', restId).order('sort_order')
    setCategories(cats || [])
    setMenuItems(items || [])
  }

  async function addRestaurant() {
    if (!newRestaurant.name || !newRestaurant.slug || !newRestaurant.merchant_id) { setMsg('Please fill in name, slug and merchant'); return }
    const { error } = await supabase.from('restaurants').insert({ ...newRestaurant, min_order: parseFloat(newRestaurant.min_order), delivery_time_mins: parseInt(newRestaurant.delivery_time_mins), pickup_time_mins: parseInt(newRestaurant.pickup_time_mins), is_open: false, is_active: true, accepts_delivery: true, accepts_pickup: true, accepts_preorders: true, slot_capacity: 5 })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Restaurant added! ✅'); setShowAddRestaurant(false)
    setNewRestaurant({ name: '', slug: '', cuisine_type: '', emoji: '🍽️', description: '', parish: 'St Peter Port', postcode: 'GY1', min_order: '10', delivery_time_mins: '25', pickup_time_mins: '15', merchant_id: '', custom_message: 'Thank you for your order!' })
    fetchAll()
  }

  async function saveRestaurant() {
    if (!editRestaurant) return
    const { error } = await supabase.from('restaurants').update({ name: editRestaurant.name, cuisine_type: editRestaurant.cuisine_type, emoji: editRestaurant.emoji, description: editRestaurant.description, parish: editRestaurant.parish, postcode: editRestaurant.postcode, min_order: parseFloat(editRestaurant.min_order), delivery_time_mins: parseInt(editRestaurant.delivery_time_mins), pickup_time_mins: parseInt(editRestaurant.pickup_time_mins), custom_message: editRestaurant.custom_message, is_open: editRestaurant.is_open, is_active: editRestaurant.is_active, accepts_delivery: editRestaurant.accepts_delivery, accepts_pickup: editRestaurant.accepts_pickup }).eq('id', editRestaurant.id)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Restaurant saved! ✅'); setEditRestaurant(null); fetchAll()
  }

  async function addMerchant() {
    if (!newMerchant.name || !newMerchant.email || !newMerchant.password) { setMsg('Please fill in name, email and password'); return }
    const res = await fetch('/api/admin/create-merchant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMerchant)
    })
    const data = await res.json()
    if (!res.ok) { setMsg('Error: ' + data.error); return }
    setMsg(data.message); setShowAddMerchant(false)
    setNewMerchant({ name: '', email: '', phone: '', commission_rate: '4', password: '' }); fetchAll()
  }

  async function addCategory() {
    if (!selectedRestaurant || !newCategory.name) { setMsg('Select a restaurant and enter category name'); return }
    const { error } = await supabase.from('menu_categories').insert({ restaurant_id: selectedRestaurant.id, name: newCategory.name, sort_order: parseInt(newCategory.sort_order), is_active: true })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Category added! ✅'); setShowAddCategory(false)
    setNewCategory({ name: '', sort_order: '1' }); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function addMenuItem() {
    if (!selectedRestaurant || !newItem.name || !newItem.price || !newItem.category_id) { setMsg('Fill in all required fields'); return }
    const { error } = await supabase.from('menu_items').insert({ restaurant_id: selectedRestaurant.id, category_id: newItem.category_id, name: newItem.name, description: newItem.description, price: parseFloat(newItem.price), emoji: newItem.emoji, calories: newItem.calories ? parseInt(newItem.calories) : null, is_available: true, tags: [], allergens: [] })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Item added! ✅'); setShowAddItem(false)
    setNewItem({ name: '', description: '', price: '', emoji: '🍽️', calories: '', category_id: '' }); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function saveMenuItem() {
    if (!editItem) return
    const { error } = await supabase.from('menu_items').update({ name: editItem.name, description: editItem.description, price: parseFloat(editItem.price), emoji: editItem.emoji, calories: editItem.calories ? parseInt(editItem.calories) : null, is_available: editItem.is_available, category_id: editItem.category_id }).eq('id', editItem.id)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Item saved! ✅'); setEditItem(null); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function deleteMenuItem(id: string) {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setMsg('Item deleted'); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category and all its items?')) return
    await supabase.from('menu_items').delete().eq('category_id', id)
    await supabase.from('menu_categories').delete().eq('id', id)
    setMsg('Category deleted'); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function toggleItem(id: string, current: boolean) {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id)
    fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function toggleRestaurantOpen(id: string, current: boolean) {
    await supabase.from('restaurants').update({ is_open: !current }).eq('id', id)
    fetchAll()
  }

  const totalRevenue = orders.filter(o => ['paid','complete'].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0)
  const totalCommission = orders.filter(o => ['paid','complete'].includes(o.status)).reduce((s, o) => s + (o.commission_amount || 0), 0)
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
            <div style={{ marginBottom: '16px' }}><label>Admin Password</label><input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkPassword()} /></div>
            <button className="btn-primary" onClick={checkPassword} style={{ width: '100%', padding: '13px' }}>Access Admin Panel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 800 }}>
          <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
          <span style={{ fontSize: '12px', color: 'var(--sub)', marginLeft: '8px', fontFamily: 'DM Sans' }}>Admin</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{restaurants.length} restaurants · {merchants.length} merchants</div>
      </div>

      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--green)' : 'transparent'}`, color: tab === t ? 'var(--green)' : 'var(--sub)', padding: '12px 16px', fontSize: '13px', fontWeight: tab === t ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px' }}>
        {msg && <div onClick={() => setMsg('')} style={{ background: msg.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${msg.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: msg.includes('Error') ? 'var(--red)' : 'var(--green)', cursor: 'pointer' }}>{msg} (click to dismiss)</div>}

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Platform Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'Restaurants', value: restaurants.length, color: 'var(--green)', icon: '🍽️' },
                { label: 'Merchants', value: merchants.length, color: 'var(--blue)', icon: '👤' },
                { label: "Today's Orders", value: todayOrders.length, color: 'var(--orange)', icon: '📦' },
                { label: 'Total Revenue', value: `£${totalRevenue.toFixed(2)}`, color: 'var(--green)', icon: '💰' },
                { label: 'Commission', value: `£${totalCommission.toFixed(2)}`, color: 'var(--orange)', icon: '📊' },
                { label: 'All Orders', value: orders.length, color: 'var(--sub)', icon: '🛒' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--sub)', marginTop: '3px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Recent Orders</h3>
            {orders.slice(0, 10).map(o => (
              <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{o.order_number}</div>
                  <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{o.customer_name} · {new Date(o.created_at).toLocaleString('en-GB')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green)' }}>£{o.total?.toFixed(2)}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: ['paid','complete'].includes(o.status) ? 'rgba(34,197,94,0.15)' : o.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: ['paid','complete'].includes(o.status) ? 'var(--green)' : o.status === 'cancelled' ? 'var(--red)' : 'var(--orange)' }}>{o.status}</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{r.emoji}</div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{r.cuisine_type} · {r.parish} · /{r.slug}</div>
                      <div style={{ fontSize: '11px', color: 'var(--sub)' }}>Merchant: {r.merchants?.name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--sub)' }}>
                      Open
                      <div onClick={() => toggleRestaurantOpen(r.id, r.is_open)} style={{ width: '30px', height: '16px', borderRadius: '8px', background: r.is_open ? 'var(--green)' : 'var(--bg3)', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', left: r.is_open ? '16px' : '2px', width: '12px', height: '12px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                    <button onClick={() => setEditRestaurant(r)} className="btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>✏️ Edit</button>
                    <button onClick={() => { setSelectedRestaurant(r); setTab('menus'); fetchMenuForRestaurant(r.id) }} className="btn-primary" style={{ fontSize: '11px', padding: '5px 10px' }}>📋 Menu</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Restaurant Modal */}
            {showAddRestaurant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddRestaurant(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add New Restaurant</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label>Name *</label><input className="input" placeholder="Pizza Palace" value={newRestaurant.name} onChange={e => setNewRestaurant({...newRestaurant, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')})} /></div>
                    <div><label>URL Slug *</label><input className="input" placeholder="pizza-palace" value={newRestaurant.slug} onChange={e => setNewRestaurant({...newRestaurant, slug: e.target.value})} /></div>
                    <div><label>Cuisine</label><input className="input" placeholder="Italian · Pizza" value={newRestaurant.cuisine_type} onChange={e => setNewRestaurant({...newRestaurant, cuisine_type: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" placeholder="🍕" value={newRestaurant.emoji} onChange={e => setNewRestaurant({...newRestaurant, emoji: e.target.value})} /></div>
                    <div><label>Parish</label><select className="input" value={newRestaurant.parish} onChange={e => setNewRestaurant({...newRestaurant, parish: e.target.value})}>{PARISHES.map(p => <option key={p}>{p}</option>)}</select></div>
                    <div><label>Postcode</label><input className="input" placeholder="GY1" value={newRestaurant.postcode} onChange={e => setNewRestaurant({...newRestaurant, postcode: e.target.value})} /></div>
                    <div><label>Min Order £</label><input className="input" type="number" value={newRestaurant.min_order} onChange={e => setNewRestaurant({...newRestaurant, min_order: e.target.value})} /></div>
                    <div><label>Delivery Mins</label><input className="input" type="number" value={newRestaurant.delivery_time_mins} onChange={e => setNewRestaurant({...newRestaurant, delivery_time_mins: e.target.value})} /></div>
                  </div>
                  <div style={{ marginBottom: '10px' }}><label>Description</label><textarea className="input" rows={2} value={newRestaurant.description} onChange={e => setNewRestaurant({...newRestaurant, description: e.target.value})} style={{ resize: 'none' }} /></div>
                  <div style={{ marginBottom: '10px' }}><label>Custom Thank You Message</label><input className="input" placeholder="Thank you for your order!" value={newRestaurant.custom_message} onChange={e => setNewRestaurant({...newRestaurant, custom_message: e.target.value})} /></div>
                  <div style={{ marginBottom: '20px' }}><label>Merchant *</label><select className="input" value={newRestaurant.merchant_id} onChange={e => setNewRestaurant({...newRestaurant, merchant_id: e.target.value})}><option value="">Select merchant...</option>{merchants.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}</select></div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddRestaurant(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addRestaurant} style={{ flex: 2 }}>Add Restaurant</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Restaurant Modal */}
            {editRestaurant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setEditRestaurant(null) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Edit {editRestaurant.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label>Name</label><input className="input" value={editRestaurant.name} onChange={e => setEditRestaurant({...editRestaurant, name: e.target.value})} /></div>
                    <div><label>Cuisine</label><input className="input" value={editRestaurant.cuisine_type} onChange={e => setEditRestaurant({...editRestaurant, cuisine_type: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" value={editRestaurant.emoji} onChange={e => setEditRestaurant({...editRestaurant, emoji: e.target.value})} /></div>
                    <div><label>Parish</label><select className="input" value={editRestaurant.parish} onChange={e => setEditRestaurant({...editRestaurant, parish: e.target.value})}>{PARISHES.map(p => <option key={p}>{p}</option>)}</select></div>
                    <div><label>Min Order £</label><input className="input" type="number" value={editRestaurant.min_order} onChange={e => setEditRestaurant({...editRestaurant, min_order: e.target.value})} /></div>
                    <div><label>Delivery Mins</label><input className="input" type="number" value={editRestaurant.delivery_time_mins} onChange={e => setEditRestaurant({...editRestaurant, delivery_time_mins: e.target.value})} /></div>
                  </div>
                  <div style={{ marginBottom: '10px' }}><label>Description</label><textarea className="input" rows={2} value={editRestaurant.description || ''} onChange={e => setEditRestaurant({...editRestaurant, description: e.target.value})} style={{ resize: 'none' }} /></div>
                  <div style={{ marginBottom: '14px' }}><label>Custom Thank You Message</label><input className="input" value={editRestaurant.custom_message || ''} onChange={e => setEditRestaurant({...editRestaurant, custom_message: e.target.value})} /></div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[['is_open','Open for orders'],['is_active','Listed on site'],['accepts_delivery','Delivery'],['accepts_pickup','Pickup']].map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editRestaurant[key]} onChange={e => setEditRestaurant({...editRestaurant, [key]: e.target.checked})} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setEditRestaurant(null)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={saveRestaurant} style={{ flex: 2 }}>Save Changes</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MENUS */}
        {tab === 'menus' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Menu Editor</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select className="input" style={{ width: 'auto', minWidth: '200px' }} value={selectedRestaurant?.id || ''} onChange={e => { const r = restaurants.find(r => r.id === e.target.value); setSelectedRestaurant(r); if (r) fetchMenuForRestaurant(r.id) }}>
                  <option value="">Select restaurant...</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
                </select>
                {selectedRestaurant && <>
                  <button className="btn-ghost" onClick={() => setShowAddCategory(true)} style={{ fontSize: '12px', padding: '8px 14px' }}>+ Category</button>
                  <button className="btn-primary" onClick={() => setShowAddItem(true)} style={{ fontSize: '12px', padding: '8px 14px' }}>+ Item</button>
                </>}
              </div>
            </div>

            {!selectedRestaurant && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sub)' }}>Select a restaurant to edit its menu</div>}

            {selectedRestaurant && categories.map(cat => (
              <div key={cat.id} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.name}</div>
                  <button onClick={() => deleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '11px', cursor: 'pointer' }}>🗑 Delete category</button>
                </div>
                {menuItems.filter(i => i.category_id === cat.id).map(item => (
                  <div key={item.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: item.is_available ? 'var(--text)' : 'var(--sub)' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{item.description}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--orange)' }}>£{item.price?.toFixed(2)}</span>
                      <div onClick={() => toggleItem(item.id, item.is_available)} style={{ width: '30px', height: '16px', borderRadius: '8px', background: item.is_available ? 'var(--green)' : 'var(--bg3)', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', left: item.is_available ? '16px' : '2px', width: '12px', height: '12px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                      </div>
                      <button onClick={() => setEditItem(item)} style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                      <button onClick={() => deleteMenuItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '14px' }}>🗑</button>
                    </div>
                  </div>
                ))}
                {menuItems.filter(i => i.category_id === cat.id).length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--sub)', padding: '10px', fontStyle: 'italic' }}>No items in this category yet</div>
                )}
              </div>
            ))}

            {/* Add Category Modal */}
            {showAddCategory && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddCategory(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add Category</h3>
                  <div style={{ marginBottom: '12px' }}><label>Category Name</label><input className="input" placeholder="e.g. Starters, Mains, Desserts" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} /></div>
                  <div style={{ marginBottom: '20px' }}><label>Sort Order</label><input className="input" type="number" value={newCategory.sort_order} onChange={e => setNewCategory({...newCategory, sort_order: e.target.value})} /></div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddCategory(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addCategory} style={{ flex: 2 }}>Add Category</button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Item Modal */}
            {showAddItem && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddItem(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add Menu Item</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ gridColumn: 'span 2' }}><label>Item Name *</label><input className="input" placeholder="Margherita Pizza" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
                    <div><label>Price £ *</label><input className="input" type="number" step="0.01" placeholder="11.99" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" placeholder="🍕" value={newItem.emoji} onChange={e => setNewItem({...newItem, emoji: e.target.value})} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label>Description</label><input className="input" placeholder="Tomato, mozzarella, fresh basil" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} /></div>
                    <div><label>Calories (optional)</label><input className="input" type="number" placeholder="820" value={newItem.calories} onChange={e => setNewItem({...newItem, calories: e.target.value})} /></div>
                    <div><label>Category *</label><select className="input" value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})}><option value="">Select...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddItem(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addMenuItem} style={{ flex: 2 }}>Add Item</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Item Modal */}
            {editItem && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setEditItem(null) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Edit {editItem.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ gridColumn: 'span 2' }}><label>Name</label><input className="input" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} /></div>
                    <div><label>Price £</label><input className="input" type="number" step="0.01" value={editItem.price} onChange={e => setEditItem({...editItem, price: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" value={editItem.emoji} onChange={e => setEditItem({...editItem, emoji: e.target.value})} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label>Description</label><input className="input" value={editItem.description || ''} onChange={e => setEditItem({...editItem, description: e.target.value})} /></div>
                    <div><label>Calories</label><input className="input" type="number" value={editItem.calories || ''} onChange={e => setEditItem({...editItem, calories: e.target.value})} /></div>
                    <div><label>Category</label><select className="input" value={editItem.category_id} onChange={e => setEditItem({...editItem, category_id: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={editItem.is_available} onChange={e => setEditItem({...editItem, is_available: e.target.checked})} />
                    Available for ordering
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setEditItem(null)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={saveMenuItem} style={{ flex: 2 }}>Save Item</button>
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
                    <div style={{ fontSize: '11px', color: 'var(--sub)', marginTop: '3px' }}>Commission: {m.commission_rate}% · Joined {new Date(m.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: m.is_trial ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)', color: m.is_trial ? '#EAB308' : 'var(--green)', fontWeight: 600 }}>
                    {m.is_trial ? '🟡 Trial' : '✅ Live'}
                  </span>
                </div>
              </div>
            ))}
            {showAddMerchant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddMerchant(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add Merchant</h3>
                  <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                    <div><label>Full Name</label><input className="input" placeholder="John Smith" value={newMerchant.name} onChange={e => setNewMerchant({...newMerchant, name: e.target.value})} /></div>
                    <div><label>Email</label><input className="input" type="email" placeholder="john@restaurant.com" value={newMerchant.email} onChange={e => setNewMerchant({...newMerchant, email: e.target.value})} /></div>
                    <div><label>Phone</label><input className="input" placeholder="+44 1481 000000" value={newMerchant.phone} onChange={e => setNewMerchant({...newMerchant, phone: e.target.value})} /></div>
                    <div><label>Commission %</label><input className="input" type="number" value={newMerchant.commission_rate} onChange={e => setNewMerchant({...newMerchant, commission_rate: e.target.value})} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label>Terminal Password (they use this to log in)</label><input className="input" type="password" placeholder="Choose a password for them" value={newMerchant.password} onChange={e => setNewMerchant({...newMerchant, password: e.target.value})} /></div>
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
              <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{o.order_number}</div>
                  <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{o.customer_name} · {o.customer_email}</div>
                  <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{new Date(o.created_at).toLocaleString('en-GB')} · {o.order_type} · {o.payment_method}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green)' }}>£{o.total?.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--sub)' }}>Commission: £{o.commission_amount?.toFixed(2) || '0.00'}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: ['paid','complete'].includes(o.status) ? 'rgba(34,197,94,0.15)' : o.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: ['paid','complete'].includes(o.status) ? 'var(--green)' : o.status === 'cancelled' ? 'var(--red)' : 'var(--orange)' }}>{o.status}</span>
                </div>
              </div>
            ))}
            {orders.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sub)' }}>No orders yet</div>}
          </div>
        )}

        {/* COMMISSIONS */}
        {tab === 'commissions' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Commissions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Total Commission</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)' }}>£{totalCommission.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Platform Revenue</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)' }}>£{totalRevenue.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Card Orders</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--blue)' }}>{orders.filter(o => o.payment_method === 'card').length}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--sub)', lineHeight: 1.6 }}>
              Commission is charged at 4% on food subtotal for card orders only. Cash orders are excluded. Invoices sent monthly with 7-day payment terms. Trial merchants are not invoiced.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
