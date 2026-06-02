'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RestaurantPage() {
  const { slug } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [itemNote, setItemNote] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [optionGroups, setOptionGroups] = useState<any[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [optionsLoading, setOptionsLoading] = useState(false)

  useEffect(() => { fetchRestaurant() }, [slug])

  async function fetchRestaurant() {
    const { data: rest } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
    if (!rest) { router.push('/'); return }
    setRestaurant(rest)
    const { data: cats } = await supabase.from('menu_categories').select('*, menu_items(*)').eq('restaurant_id', rest.id).order('sort_order')
    setCategories(cats || [])
    setLoading(false)
  }

  async function openItem(item: any) {
    setSelectedItem(item)
    setItemQty(1)
    setItemNote('')
    setSelectedOptions({})
    setOptionsLoading(true)
    // Fetch item-specific option groups
    const { data: directGroups } = await supabase
      .from('item_option_groups')
      .select('*, item_options(*)')
      .eq('menu_item_id', item.id)
      .order('sort_order')
    // Fetch shared option groups linked to this item
    const { data: links } = await supabase
      .from('item_option_group_links')
      .select('option_group_id')
      .eq('menu_item_id', item.id)
    const sharedGroupIds = (links || []).map((l: any) => l.option_group_id)
    let sharedGroups: any[] = []
    if (sharedGroupIds.length > 0) {
      const { data: sg } = await supabase
        .from('item_option_groups')
        .select('*, item_options(*)')
        .in('id', sharedGroupIds)
        .order('sort_order')
      sharedGroups = sg || []
    }
    const allGroups = [...(directGroups || []), ...sharedGroups]
    setOptionGroups(allGroups)
    // Set defaults for required single-select groups
    const defaults: Record<string, string[]> = {}
    for (const g of (groups || [])) {
      if (g.required && g.type === 'single' && g.item_options?.length > 0) {
        defaults[g.id] = [g.item_options[0].id]
      }
    }
    setSelectedOptions(defaults)
    setOptionsLoading(false)
  }

  function toggleOption(groupId: string, optionId: string, type: string) {
    setSelectedOptions(prev => {
      const current = prev[groupId] || []
      if (type === 'single') {
        return { ...prev, [groupId]: [optionId] }
      } else {
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter(id => id !== optionId) }
        } else {
          return { ...prev, [groupId]: [...current, optionId] }
        }
      }
    })
  }

  function getOptionsTotal(): number {
    let extra = 0
    for (const group of optionGroups) {
      const selected = selectedOptions[group.id] || []
      for (const optId of selected) {
        const opt = group.item_options?.find((o: any) => o.id === optId)
        if (opt) extra += parseFloat(opt.price_adjustment) || 0
      }
    }
    return extra
  }

  function getSelectedOptionLabels(): string {
    const labels: string[] = []
    for (const group of optionGroups) {
      const selected = selectedOptions[group.id] || []
      for (const optId of selected) {
        const opt = group.item_options?.find((o: any) => o.id === optId)
        if (opt) labels.push(opt.name)
      }
    }
    return labels.join(', ')
  }

  function canAddToCart(): boolean {
    for (const group of optionGroups) {
      if (group.required) {
        const selected = selectedOptions[group.id] || []
        if (selected.length === 0) return false
      }
    }
    return true
  }

  function addToCart(item: any, note: string, qty: number) {
    const optionsLabel = getSelectedOptionLabels()
    const optionsExtra = getOptionsTotal()
    const totalPrice = item.price + optionsExtra
    const cartNote = [optionsLabel, note].filter(Boolean).join(' | ')
    const key = item.id + cartNote
    const existing = cart.find(c => c.key === key)
    if (existing) {
      setCart(cart.map(c => c.key === key ? { ...c, qty: c.qty + qty } : c))
    } else {
      setCart([...cart, { ...item, price: totalPrice, qty, note: cartNote, key, cartId: Date.now() }])
    }
    setSelectedItem(null)
    setItemNote('')
    setItemQty(1)
    setOptionGroups([])
    setSelectedOptions({})
  }

  function updateQty(cartId: number, delta: number) {
    setCart(prev => prev.map(c => c.cartId === cartId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--sub)' }}>Loading menu...</div>
  )
  if (!restaurant) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <nav style={{ background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 800, letterSpacing: '-1px', textDecoration: 'none' }}>
          <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
        </Link>
        {cartCount > 0 && (
          <button onClick={() => router.push('/checkout')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
            Cart {cartCount} - GBP{cartTotal.toFixed(2)}
          </button>
        )}
      </nav>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 20px 0' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: '14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>Back</button>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '56px' }}>{restaurant.emoji}</div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{restaurant.name}</h1>
            <div style={{ fontSize: '13px', color: 'var(--sub)' }}>{restaurant.cuisine_type} - {restaurant.delivery_time_mins}-{restaurant.delivery_time_mins + 10} min - GBP{restaurant.min_order?.toFixed(2)} min order</div>
            {restaurant.description && <div style={{ fontSize: '12px', color: 'var(--sub)', marginTop: '6px' }}>{restaurant.description}</div>}
          </div>
        </div>

        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>i</span>
          <p style={{ fontSize: '11px', color: '#fca5a5', lineHeight: 1.5 }}>Allergen info is AI-assisted and a guide only. Please contact the restaurant directly to verify.</p>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {categories.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sub)', fontSize: '14px' }}>Menu coming soon...</div>}
            {categories.map(cat => (
              <div key={cat.id}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>{cat.name}</div>
                {cat.menu_items?.filter((i: any) => i.is_available).map((item: any) => (
                  <div key={item.id} onClick={() => openItem(item)}
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>{item.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>
                        {item.name.includes(' - ') ? item.name.split(' - ')[0] : item.name}
                      </div>
                      {(item.description || item.name.includes(' - ')) && (
                        <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px', lineHeight: 1.4 }}>
                          {item.name.includes(' - ') ? item.name.split(' - ').slice(1).join(' - ') : item.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--orange)' }}>GBP{item.price.toFixed(2)}</span>
                        {item.calories && <span style={{ fontSize: '11px', color: 'var(--sub)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>~{item.calories} kcal</span>}
                        {item.tags?.map((tag: string) => (
                          <span key={tag} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: tag === 'veg' || tag === 'vegan' ? 'rgba(34,197,94,0.15)' : tag === 'spicy' ? 'rgba(249,115,22,0.15)' : 'rgba(234,179,8,0.15)', color: tag === 'veg' || tag === 'vegan' ? 'var(--green)' : tag === 'spicy' ? 'var(--orange)' : '#EAB308' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); openItem(item) }} style={{ background: 'var(--green)', color: '#0F172A', border: 'none', width: '34px', height: '34px', borderRadius: '8px', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>+</button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ width: '260px', flexShrink: 0 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', position: 'sticky', top: '74px' }}>
              <div style={{ fontFamily: 'Syne', fontSize: '15px', fontWeight: 700, marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>Your Order</div>
              {cart.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--sub)', textAlign: 'center', padding: '20px 0' }}>Add items to get started</div>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.cartId} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text)', flex: 1 }}>{item.qty}x {item.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--green)', fontWeight: 600 }}>GBP{(item.price * item.qty).toFixed(2)}</span>
                          <button onClick={() => updateQty(item.cartId, -1)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--sub)', width: '18px', height: '18px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>-</button>
                        </div>
                      </div>
                      {item.note && <div style={{ fontSize: '10px', color: 'var(--sub)', marginTop: '2px' }}>{item.note}</div>}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, padding: '10px 0 8px', color: 'var(--text)' }}>
                    <span>Total</span><span style={{ color: 'var(--green)' }}>GBP{cartTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={() => { localStorage.setItem('feedme-cart', JSON.stringify({ cart, restaurantId: restaurant.id, restaurantName: restaurant.name })); router.push('/checkout') }} className="btn-primary" style={{ width: '100%', padding: '11px' }}>
                    Checkout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ITEM OPTIONS MODAL */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedItem(null) }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '10px' }}>{selectedItem.emoji}</div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', marginBottom: '4px' }}>
              {selectedItem.name.includes(' - ') ? selectedItem.name.split(' - ')[0] : selectedItem.name}
            </h3>
            {(selectedItem.description || selectedItem.name.includes(' - ')) && (
              <p style={{ fontSize: '13px', color: 'var(--sub)', textAlign: 'center', marginBottom: '10px', lineHeight: 1.5 }}>
                {selectedItem.name.includes(' - ') ? selectedItem.name.split(' - ').slice(1).join(' - ') : selectedItem.description}
              </p>
            )}

            {selectedItem.allergens?.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', fontSize: '11px', color: '#fca5a5' }}>
                i AI-detected allergens (guide only): {selectedItem.allergens.join(', ')}
              </div>
            )}

            {optionsLoading && <div style={{ textAlign: 'center', color: 'var(--sub)', fontSize: '13px', padding: '20px' }}>Loading options...</div>}

            {/* OPTION GROUPS */}
            {!optionsLoading && optionGroups.map(group => (
              <div key={group.id} style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{group.name}</div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: group.required ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: group.required ? '#fca5a5' : 'var(--sub)' }}>
                    {group.required ? 'Required' : 'Optional'}
                  </span>
                </div>

                {group.type === 'single' ? (
                  // Radio buttons for single select
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.item_options?.filter((o: any) => o.is_available).map((opt: any) => (
                      <div key={opt.id} onClick={() => toggleOption(group.id, opt.id, 'single')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${(selectedOptions[group.id] || []).includes(opt.id) ? 'var(--green)' : 'var(--border)'}`, background: (selectedOptions[group.id] || []).includes(opt.id) ? 'rgba(34,197,94,0.06)' : 'var(--bg3)', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${(selectedOptions[group.id] || []).includes(opt.id) ? 'var(--green)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {(selectedOptions[group.id] || []).includes(opt.id) && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }} />}
                          </div>
                          <span style={{ fontSize: '14px' }}>{opt.name}</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: opt.price_adjustment > 0 ? 'var(--orange)' : 'var(--sub)' }}>
                          {opt.price_adjustment > 0 ? '+GBP' + parseFloat(opt.price_adjustment).toFixed(2) : opt.price_adjustment < 0 ? '-GBP' + Math.abs(parseFloat(opt.price_adjustment)).toFixed(2) : 'Included'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Checkboxes for multiple select
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {group.item_options?.filter((o: any) => o.is_available).map((opt: any) => (
                      <div key={opt.id} onClick={() => toggleOption(group.id, opt.id, 'multiple')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', border: `1.5px solid ${(selectedOptions[group.id] || []).includes(opt.id) ? 'var(--green)' : 'var(--border)'}`, background: (selectedOptions[group.id] || []).includes(opt.id) ? 'rgba(34,197,94,0.06)' : 'var(--bg3)', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${(selectedOptions[group.id] || []).includes(opt.id) ? 'var(--green)' : 'var(--border)'}`, background: (selectedOptions[group.id] || []).includes(opt.id) ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {(selectedOptions[group.id] || []).includes(opt.id) && <span style={{ color: '#0f172a', fontSize: '10px', fontWeight: 700 }}>v</span>}
                          </div>
                          <span style={{ fontSize: '13px' }}>{opt.name}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--orange)' }}>
                          {opt.price_adjustment > 0 ? '+GBP' + parseFloat(opt.price_adjustment).toFixed(2) : 'Free'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Special instructions */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--sub)', display: 'block', marginBottom: '6px' }}>Special instructions (optional)</label>
              <textarea value={itemNote} onChange={e => setItemNote(e.target.value)} placeholder="e.g. no onions, extra sauce..." rows={2} className="input" style={{ resize: 'none', marginTop: '4px' }} />
            </div>

            {/* Quantity */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
              <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', width: '36px', height: '36px', borderRadius: '8px', fontSize: '20px', cursor: 'pointer' }}>-</button>
              <span style={{ fontSize: '20px', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>{itemQty}</span>
              <button onClick={() => setItemQty(itemQty + 1)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', width: '36px', height: '36px', borderRadius: '8px', fontSize: '20px', cursor: 'pointer' }}>+</button>
            </div>

            <button onClick={() => addToCart(selectedItem, itemNote, itemQty)} className="btn-primary" style={{ width: '100%', padding: '15px', opacity: canAddToCart() ? 1 : 0.5, cursor: canAddToCart() ? 'pointer' : 'not-allowed' }} disabled={!canAddToCart()}>
              Add to order - GBP{((selectedItem.price + getOptionsTotal()) * itemQty).toFixed(2)}
            </button>
            {!canAddToCart() && <div style={{ textAlign: 'center', fontSize: '12px', color: '#fca5a5', marginTop: '8px' }}>Please make all required selections</div>}
          </div>
        </div>
      )}
    </div>
  )
}
