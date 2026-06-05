'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function MerchantDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [merchant, setMerchant] = useState<any>(null)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [tab, setTab] = useState<'menu'|'options'|'shared'>('menu')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Category state
  const [editingCat, setEditingCat] = useState<any>(null)
  const [newCatName, setNewCatName] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)

  // Item state
  const [editingItem, setEditingItem] = useState<any>(null)
  const [expandedCat, setExpandedCat] = useState<string|null>(null)
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', emoji: '', category_id: '' })
  const [showAddItem, setShowAddItem] = useState<string|null>(null)

  // Options state
  const [editingOptions, setEditingOptions] = useState<any>(null)
  const [optionGroups, setOptionGroups] = useState<any[]>([])
  const [sharedOptionGroups, setSharedOptionGroups] = useState<any[]>([])
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showAddOption, setShowAddOption] = useState<string|null>(null)
  const [newGroup, setNewGroup] = useState({ name: '', type: 'multiple', required: false, is_collapsible: false, max_selections: '0', sort_order: '1' })
  const [newOption, setNewOption] = useState({ name: '', price_adjustment: '0', sort_order: '1' })

  // Shared groups state
  const [allSharedGroups, setAllSharedGroups] = useState<any[]>([])
  const [showAddSharedGroup, setShowAddSharedGroup] = useState(false)
  const [newSharedGroup, setNewSharedGroup] = useState({ name: '', type: 'multiple', required: false, is_collapsible: false, max_selections: '0', sort_order: '1' })
  const [showAddSharedOption, setShowAddSharedOption] = useState<string|null>(null)
  const [linkingGroup, setLinkingGroup] = useState<any>(null)
  const [allItems, setAllItems] = useState<any[]>([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/merchant/login'); return }
    // Try auth_id first, then email - use maybeSingle to avoid 406
    let { data: merch } = await supabase.from('merchants').select('*, restaurants(*)').eq('auth_id', user.id).maybeSingle()
    if (!merch) {
      const res2 = await supabase.from('merchants').select('*, restaurants(*)').eq('email', user.email).maybeSingle()
      merch = res2.data
      if (merch) await supabase.from('merchants').update({ auth_id: user.id }).eq('id', merch.id)
    }
    if (!merch) { router.push('/merchant/login'); return }
    setMerchant(merch)
    const rest = merch.restaurants?.[0]
    setRestaurant(rest)
    if (rest) {
      await fetchMenu(rest.id)
      await fetchSharedGroups(rest.id)
    }
    setLoading(false)
  }

  async function fetchMenu(restId: string) {
    const { data } = await supabase.from('menu_categories').select('*, menu_items(*)').eq('restaurant_id', restId).order('sort_order')
    setCategories(data || [])
    const items = (data || []).flatMap((c: any) => c.menu_items || [])
    setAllItems(items)
  }

  async function fetchSharedGroups(restId: string) {
    const { data } = await supabase.from('item_option_groups').select('*, item_options(*)').eq('restaurant_id', restId).is('menu_item_id', null).order('sort_order')
    setAllSharedGroups(data || [])
  }

  async function fetchOptionGroups(itemId: string) {
    const { data: direct } = await supabase.from('item_option_groups').select('*, item_options(*)').eq('menu_item_id', itemId).order('sort_order')
    const { data: links } = await supabase.from('item_option_group_links').select('option_group_id').eq('menu_item_id', itemId)
    const linkedIds = (links || []).map((l: any) => l.option_group_id)
    let shared: any[] = []
    if (linkedIds.length > 0) {
      const { data: sg } = await supabase.from('item_option_groups').select('*, item_options(*)').in('id', linkedIds)
      shared = (sg || []).map((g: any) => ({ ...g, isShared: true }))
    }
    setOptionGroups(direct || [])
    setSharedOptionGroups(shared)
  }

  async function addCategory() {
    if (!newCatName || !restaurant) return
    await supabase.from('menu_categories').insert({ restaurant_id: restaurant.id, name: newCatName, sort_order: categories.length + 1, is_active: true })
    setNewCatName('')
    setShowAddCat(false)
    fetchMenu(restaurant.id)
    setMsg('Category added!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteCategory(catId: string) {
    if (!confirm('Delete this category and all its items?')) return
    await supabase.from('menu_items').delete().eq('category_id', catId)
    await supabase.from('menu_categories').delete().eq('id', catId)
    fetchMenu(restaurant.id)
  }

  async function saveItem() {
    if (!editingItem) return
    await supabase.from('menu_items').update({ name: editingItem.name, description: editingItem.description, price: parseFloat(editingItem.price), emoji: editingItem.emoji, is_available: editingItem.is_available, category_id: editingItem.category_id }).eq('id', editingItem.id)
    setEditingItem(null)
    fetchMenu(restaurant.id)
    setMsg('Item saved!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function addItem(catId: string) {
    if (!newItem.name || !newItem.price) return
    await supabase.from('menu_items').insert({ restaurant_id: restaurant.id, category_id: catId, name: newItem.name, description: newItem.description, price: parseFloat(newItem.price), emoji: newItem.emoji || 'food', is_available: true, tags: [], allergens: [] })
    setNewItem({ name: '', description: '', price: '', emoji: '', category_id: '' })
    setShowAddItem(null)
    fetchMenu(restaurant.id)
    setMsg('Item added!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').delete().eq('id', itemId)
    fetchMenu(restaurant.id)
  }

  async function toggleItemAvailable(itemId: string, current: boolean) {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', itemId)
    fetchMenu(restaurant.id)
  }

  async function addOptionGroup(itemId: string) {
    if (!newGroup.name) return
    await supabase.from('item_option_groups').insert({ menu_item_id: itemId, restaurant_id: restaurant.id, name: newGroup.name, type: newGroup.type, required: newGroup.required, is_collapsible: newGroup.is_collapsible, max_selections: parseInt(newGroup.max_selections) || 0, sort_order: optionGroups.length + 1 })
    setNewGroup({ name: '', type: 'multiple', required: false, is_collapsible: false, max_selections: '0', sort_order: '1' })
    setShowAddGroup(false)
    fetchOptionGroups(itemId)
  }

  async function addOption(groupId: string, itemId: string) {
    if (!newOption.name) return
    await supabase.from('item_options').insert({ option_group_id: groupId, name: newOption.name, price_adjustment: parseFloat(newOption.price_adjustment) || 0, sort_order: 1, is_available: true })
    setNewOption({ name: '', price_adjustment: '0', sort_order: '1' })
    setShowAddOption(null)
    fetchOptionGroups(itemId)
  }

  async function deleteOptionGroup(groupId: string, itemId: string) {
    if (!confirm('Delete this option group?')) return
    await supabase.from('item_options').delete().eq('option_group_id', groupId)
    await supabase.from('item_option_groups').delete().eq('id', groupId)
    fetchOptionGroups(itemId)
  }

  async function deleteOption(optId: string, itemId: string) {
    await supabase.from('item_options').delete().eq('id', optId)
    fetchOptionGroups(itemId)
  }

  async function moveGroup(groupId: string, direction: 'up'|'down', itemId: string) {
    const idx = optionGroups.findIndex((g: any) => g.id === groupId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === optionGroups.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const a = optionGroups[idx]; const b = optionGroups[swapIdx]
    await supabase.from('item_option_groups').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('item_option_groups').update({ sort_order: a.sort_order }).eq('id', b.id)
    fetchOptionGroups(itemId)
  }

  async function addSharedGroup() {
    if (!newSharedGroup.name || !restaurant) return
    await supabase.from('item_option_groups').insert({ restaurant_id: restaurant.id, menu_item_id: null, name: newSharedGroup.name, type: newSharedGroup.type, required: newSharedGroup.required, is_collapsible: newSharedGroup.is_collapsible, max_selections: parseInt(newSharedGroup.max_selections) || 0, sort_order: allSharedGroups.length + 1 })
    setNewSharedGroup({ name: '', type: 'multiple', required: false, is_collapsible: false, max_selections: '0', sort_order: '1' })
    setShowAddSharedGroup(false)
    fetchSharedGroups(restaurant.id)
  }

  async function addSharedOption(groupId: string) {
    if (!newOption.name) return
    await supabase.from('item_options').insert({ option_group_id: groupId, name: newOption.name, price_adjustment: parseFloat(newOption.price_adjustment) || 0, sort_order: 1, is_available: true })
    setNewOption({ name: '', price_adjustment: '0', sort_order: '1' })
    setShowAddSharedOption(null)
    fetchSharedGroups(restaurant.id)
  }

  async function linkSharedGroup(groupId: string, itemId: string) {
    await supabase.from('item_option_group_links').insert({ option_group_id: groupId, menu_item_id: itemId })
    setMsg('Linked!')
    setTimeout(() => setMsg(''), 2000)
  }

  const inputStyle: any = { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  if (loading) return <div style={{ background: '#080c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
            <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me.gg</span>
          </Link>
          <span style={{ fontSize: '13px', color: '#64748b' }}>{restaurant?.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/merchant/terminal" style={{ padding: '7px 14px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>Terminal</Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/merchant/login') }} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Menu Management</h1>

        {msg && <div style={{ marginBottom: '16px', padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{msg}</div>}

        {/* TABS */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
          {(['menu','options','shared'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', background: tab === t ? '#22c55e' : 'transparent', color: tab === t ? '#080c14' : '#64748b', textTransform: 'capitalize' }}>
              {t === 'menu' ? 'Menu' : t === 'options' ? 'Item Options' : 'Shared Toppings'}
            </button>
          ))}
        </div>

        {/* MENU TAB */}
        {tab === 'menu' && (
          <div>
            {categories.map(cat => (
              <div key={cat.id} style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>{cat.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{cat.menu_items?.length || 0} items</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); setEditingCat(cat) }} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>Rename</button>
                    <button onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>{expandedCat === cat.id ? 'v' : '>'}</span>
                  </div>
                </div>

                {editingCat?.id === cat.id && (
                  <div style={{ padding: '0 16px 14px', display: 'flex', gap: '8px' }}>
                    <input value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={async () => { await supabase.from('menu_categories').update({ name: editingCat.name }).eq('id', editingCat.id); setEditingCat(null); fetchMenu(restaurant.id) }} style={{ padding: '9px 16px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingCat(null)} style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}

                {expandedCat === cat.id && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {cat.menu_items?.map((item: any) => (
                      <div key={item.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {editingItem?.id === item.id ? (
                          <div style={{ display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="Name" style={inputStyle} />
                              <input value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} placeholder="Price" type="number" step="0.01" style={inputStyle} />
                            </div>
                            <input value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="Description" style={inputStyle} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <input value={editingItem.emoji || ''} onChange={e => setEditingItem({...editingItem, emoji: e.target.value})} placeholder="Emoji" style={inputStyle} />
                              <select value={editingItem.category_id} onChange={e => setEditingItem({...editingItem, category_id: e.target.value})} style={{ ...inputStyle, appearance: 'none' }}>
                                {categories.map(c => <option key={c.id} value={c.id} style={{ background: '#0d1321' }}>{c.name}</option>)}
                              </select>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={editingItem.is_available} onChange={e => setEditingItem({...editingItem, is_available: e.target.checked})} />
                              Available for ordering
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={saveItem} style={{ flex: 1, padding: '9px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Save</button>
                              <button onClick={() => setEditingItem(null)} style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {item.name}
                                  {!item.is_available && <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '4px' }}>Off</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>GBP{item.price?.toFixed(2)}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <button onClick={() => toggleItemAvailable(item.id, item.is_available)} style={{ fontSize: '11px', padding: '4px 8px', background: item.is_available ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: item.is_available ? '#22c55e' : '#ef4444', border: `1px solid ${item.is_available ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '6px', cursor: 'pointer' }}>
                                {item.is_available ? 'On' : 'Off'}
                              </button>
                              <button onClick={() => { setEditingOptions(item); fetchOptionGroups(item.id) }} style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '6px', cursor: 'pointer' }}>Options</button>
                              <button onClick={() => setEditingItem({...item, price: item.price?.toString()})} style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                              <button onClick={() => deleteItem(item.id)} style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}>Del</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {showAddItem === cat.id ? (
                      <div style={{ padding: '12px 16px', display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Item name *" style={inputStyle} />
                          <input value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="Price *" type="number" step="0.01" style={inputStyle} />
                        </div>
                        <input value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Description" style={inputStyle} />
                        <input value={newItem.emoji} onChange={e => setNewItem({...newItem, emoji: e.target.value})} placeholder="Emoji (optional)" style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => addItem(cat.id)} style={{ flex: 1, padding: '9px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Add Item</button>
                          <button onClick={() => setShowAddItem(null)} style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '10px 16px' }}>
                        <button onClick={() => setShowAddItem(cat.id)} style={{ width: '100%', padding: '8px', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>+ Add item</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {showAddCat ? (
              <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '8px' }}>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name" style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === 'Enter' && addCategory()} />
                <button onClick={addCategory} style={{ padding: '9px 16px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Add</button>
                <button onClick={() => setShowAddCat(false)} style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowAddCat(true)} style={{ width: '100%', padding: '14px', background: 'transparent', border: '2px dashed rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>+ Add Category</button>
            )}
          </div>
        )}

        {/* ITEM OPTIONS TAB */}
        {tab === 'options' && (
          <div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Click Options on any item in the Menu tab to edit its option groups here.</p>
            <div style={{ display: 'grid', gap: '8px' }}>
              {categories.flatMap((cat: any) => cat.menu_items || []).map((item: any) => (
                <div key={item.id} style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <button onClick={() => { setEditingOptions(item); fetchOptionGroups(item.id); setTab('menu') }} style={{ fontSize: '12px', padding: '5px 12px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '6px', cursor: 'pointer' }}>Edit Options</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHARED TOPPINGS TAB */}
        {tab === 'shared' && (
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', padding: '10px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px' }}>
              Shared toppings can be linked to multiple items. Create them here then link them from the item options editor.
            </div>
            {allSharedGroups.map(group => (
              <div key={group.id} style={{ background: '#0d1321', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#a855f7' }}>{group.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>{group.item_options?.length} options</span>
                    {group.required && <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', marginLeft: '6px' }}>Required</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
                      <input type="checkbox" checked={group.is_collapsible || false} onChange={async e => {
                        await supabase.from('item_option_groups').update({ is_collapsible: e.target.checked }).eq('id', group.id)
                        fetchSharedGroups(restaurant.id)
                      }} />
                      Collapsible
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                      <span>Max:</span>
                      <input type="number" min="0" value={group.max_selections || 0} onChange={async e => {
                        await supabase.from('item_option_groups').update({ max_selections: parseInt(e.target.value) || 0 }).eq('id', group.id)
                        fetchSharedGroups(restaurant.id)
                      }} style={{ width: '48px', padding: '2px 6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f1f5f9', fontSize: '12px' }} />
                    </div>
                    <button onClick={() => setLinkingGroup(group)} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', cursor: 'pointer' }}>Link to items</button>
                    <button onClick={async () => { if (!confirm('Delete this shared group?')) return; await supabase.from('item_options').delete().eq('option_group_id', group.id); await supabase.from('item_option_groups').delete().eq('id', group.id); fetchSharedGroups(restaurant.id) }} style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {group.item_options?.map((opt: any) => (
                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                      <span>{opt.name}</span>
                      {opt.price_adjustment > 0 && <span style={{ color: '#f97316' }}>+GBP{parseFloat(opt.price_adjustment).toFixed(2)}</span>}
                      <button onClick={async () => { await supabase.from('item_options').delete().eq('id', opt.id); fetchSharedGroups(restaurant.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>x</button>
                    </div>
                  ))}
                </div>
                {showAddSharedOption === group.id ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input className="input" placeholder="Option name" value={newOption.name} onChange={e => setNewOption({...newOption, name: e.target.value})} style={{ ...inputStyle, flex: 2 }} />
                    <input className="input" type="number" step="0.01" placeholder="+Price" value={newOption.price_adjustment} onChange={e => setNewOption({...newOption, price_adjustment: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => addSharedOption(group.id)} style={{ padding: '9px 14px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Add</button>
                    <button onClick={() => setShowAddSharedOption(null)} style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>x</button>
                  </div>
                ) : (
                  <button onClick={() => { setShowAddSharedOption(group.id); setNewOption({ name: '', price_adjustment: '0', sort_order: '1' }) }} style={{ width: '100%', padding: '7px', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>+ Add option</button>
                )}
              </div>
            ))}

            {showAddSharedGroup ? (
              <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>New Shared Group</div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <input value={newSharedGroup.name} onChange={e => setNewSharedGroup({...newSharedGroup, name: e.target.value})} placeholder="Group name e.g. Extra Toppings" style={inputStyle} />
                  <select value={newSharedGroup.type} onChange={e => setNewSharedGroup({...newSharedGroup, type: e.target.value})} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="multiple" style={{ background: '#0d1321' }}>Multi select (checkboxes)</option>
                    <option value="single" style={{ background: '#0d1321' }}>Single select (radio)</option>
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={newSharedGroup.required} onChange={e => setNewSharedGroup({...newSharedGroup, required: e.target.checked})} />
                      Required
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={newSharedGroup.is_collapsible} onChange={e => setNewSharedGroup({...newSharedGroup, is_collapsible: e.target.checked})} />
                      Collapsible
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <span>Max:</span>
                      <input type="number" min="0" placeholder="0" value={newSharedGroup.max_selections} onChange={e => setNewSharedGroup({...newSharedGroup, max_selections: e.target.value})} style={{ width: '56px', padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f1f5f9', fontSize: '13px' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={addSharedGroup} style={{ flex: 1, padding: '10px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Create Group</button>
                  <button onClick={() => setShowAddSharedGroup(false)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddSharedGroup(true)} style={{ width: '100%', padding: '14px', background: 'transparent', border: '2px dashed rgba(168,85,247,0.3)', color: '#a855f7', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>+ Create Shared Group</button>
            )}
          </div>
        )}
      </div>

      {/* ITEM OPTIONS MODAL */}
      {editingOptions && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setEditingOptions(null) }}>
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Options for {editingOptions.name}</h3>
              <button onClick={() => setEditingOptions(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f1f5f9', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>x</button>
            </div>

            {sharedOptionGroups.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Linked Shared Groups</div>
                {sharedOptionGroups.map(group => (
                  <div key={group.id} style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#a855f7' }}>{group.name}</span>
                      <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>{group.item_options?.length} options</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
                        <input type="checkbox" checked={group.is_collapsible || false} onChange={async e => {
                          await supabase.from('item_option_groups').update({ is_collapsible: e.target.checked }).eq('id', group.id)
                          fetchOptionGroups(editingOptions.id)
                        }} />
                        Collapsible
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                        <span>Max:</span>
                        <input type="number" min="0" value={group.max_selections || 0} onChange={async e => {
                          await supabase.from('item_option_groups').update({ max_selections: parseInt(e.target.value) || 0 }).eq('id', group.id)
                          fetchOptionGroups(editingOptions.id)
                        }} style={{ width: '48px', padding: '2px 6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f1f5f9', fontSize: '12px' }} />
                      </div>
                      <button onClick={async () => { await supabase.from('item_option_group_links').delete().eq('menu_item_id', editingOptions.id).eq('option_group_id', group.id); fetchOptionGroups(editingOptions.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>Unlink</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {optionGroups.map(group => (
              <div key={group.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{group.name}</span>
                    {group.required && <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', marginLeft: '6px' }}>Required</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={() => moveGroup(group.id, 'up', editingOptions.id)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}>up</button>
                    <button onClick={() => moveGroup(group.id, 'down', editingOptions.id)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}>dn</button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
                      <input type="checkbox" checked={group.is_collapsible || false} onChange={async e => {
                        await supabase.from('item_option_groups').update({ is_collapsible: e.target.checked }).eq('id', group.id)
                        fetchOptionGroups(editingOptions.id)
                      }} />
                      Collapse
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                      <span>Max:</span>
                      <input type="number" min="0" value={group.max_selections || 0} onChange={async e => {
                        await supabase.from('item_option_groups').update({ max_selections: parseInt(e.target.value) || 0 }).eq('id', group.id)
                        fetchOptionGroups(editingOptions.id)
                      }} style={{ width: '44px', padding: '2px 5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f1f5f9', fontSize: '12px' }} />
                    </div>
                    <button onClick={() => deleteOptionGroup(group.id, editingOptions.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>Del</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                  {group.item_options?.map((opt: any) => (
                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '3px 8px', fontSize: '12px' }}>
                      <span>{opt.name}</span>
                      {opt.price_adjustment > 0 && <span style={{ color: '#f97316' }}>+GBP{parseFloat(opt.price_adjustment).toFixed(2)}</span>}
                      <button onClick={() => deleteOption(opt.id, editingOptions.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}>x</button>
                    </div>
                  ))}
                </div>
                {showAddOption === group.id ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input placeholder="Option name" value={newOption.name} onChange={e => setNewOption({...newOption, name: e.target.value})} style={{ ...inputStyle, flex: 2 }} />
                    <input type="number" step="0.01" placeholder="+Price" value={newOption.price_adjustment} onChange={e => setNewOption({...newOption, price_adjustment: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => addOption(group.id, editingOptions.id)} style={{ padding: '9px 12px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Add</button>
                    <button onClick={() => setShowAddOption(null)} style={{ padding: '9px 10px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>x</button>
                  </div>
                ) : (
                  <button onClick={() => { setShowAddOption(group.id); setNewOption({ name: '', price_adjustment: '0', sort_order: '1' }) }} style={{ width: '100%', padding: '6px', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>+ Add option</button>
                )}
              </div>
            ))}

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Link Shared Group</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {allSharedGroups.filter(g => !sharedOptionGroups.find(sg => sg.id === g.id)).map(group => (
                  <button key={group.id} onClick={() => { linkSharedGroup(group.id, editingOptions.id); fetchOptionGroups(editingOptions.id) }} style={{ fontSize: '12px', padding: '5px 12px', background: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '6px', cursor: 'pointer' }}>
                    + {group.name}
                  </button>
                ))}
                {allSharedGroups.filter(g => !sharedOptionGroups.find(sg => sg.id === g.id)).length === 0 && (
                  <span style={{ fontSize: '12px', color: '#475569' }}>All shared groups already linked</span>
                )}
              </div>
            </div>

            {showAddGroup ? (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>New Option Group</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <input placeholder="Group name" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} style={inputStyle} />
                  <select value={newGroup.type} onChange={e => setNewGroup({...newGroup, type: e.target.value})} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="single" style={{ background: '#0d1321' }}>Single select (radio)</option>
                    <option value="multiple" style={{ background: '#0d1321' }}>Multi select (checkboxes)</option>
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={newGroup.required} onChange={e => setNewGroup({...newGroup, required: e.target.checked})} />
                      Required
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={newGroup.is_collapsible} onChange={e => setNewGroup({...newGroup, is_collapsible: e.target.checked})} />
                      Collapsible
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <span>Max:</span>
                      <input type="number" min="0" value={newGroup.max_selections} onChange={e => setNewGroup({...newGroup, max_selections: e.target.value})} style={{ width: '56px', padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f1f5f9', fontSize: '13px' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={() => addOptionGroup(editingOptions.id)} style={{ flex: 1, padding: '10px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Add Group</button>
                  <button onClick={() => setShowAddGroup(false)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddGroup(true)} style={{ width: '100%', padding: '10px', background: 'none', border: '1px dashed rgba(255,255,255,0.15)', color: '#64748b', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>+ Add Option Group</button>
            )}
          </div>
        </div>
      )}

      {/* LINK GROUP TO ITEMS MODAL */}
      {linkingGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setLinkingGroup(null) }}>
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Link "{linkingGroup.name}" to items</h3>
              <button onClick={() => setLinkingGroup(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f1f5f9', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              {allItems.map(item => (
                <button key={item.id} onClick={async () => {
                  await supabase.from('item_option_group_links').upsert({ option_group_id: linkingGroup.id, menu_item_id: item.id })
                  setMsg('Linked to ' + item.name)
                  setTimeout(() => setMsg(''), 2000)
                }} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', textAlign: 'left', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{item.emoji}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
