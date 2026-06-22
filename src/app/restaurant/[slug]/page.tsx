'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RestaurantPage() {
  const { slug } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reorderId = searchParams.get('reorder')
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [itemNote, setItemNote] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [optionGroups, setOptionGroups] = useState<any[]>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [hours, setHours] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [offers, setOffers] = useState<any[]>([])
  const [showBasket, setShowBasket] = useState(false)
  const [dark, setDark] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  useEffect(() => { fetchRestaurant() }, [slug])

  async function fetchRestaurant() {
    const { data: rest } = await supabase.from('restaurants').select('*').eq('slug', slug).single()
    if (!rest) { router.push('/'); return }
    setRestaurant(rest)
    // Fetch hours and zones
    const { data: h } = await supabase.from('restaurant_hours').select('*').eq('restaurant_id', rest.id).order('id')
    setHours(h || [])
    const { data: z } = await supabase.from('delivery_zones').select('*').eq('restaurant_id', rest.id).order('name')
    setZones(z || [])
    const { data: cats } = await supabase
      .from('menu_categories')
      .select('*, menu_items(*)')
      .eq('restaurant_id', rest.id)
      .order('sort_order')
    setCategories(cats || [])
    // Fetch active offers
    const { data: offersData } = await supabase.from('offers').select('*').eq('restaurant_id', rest.id).eq('is_active', true)
    setOffers(offersData || [])
    setLoading(false)

    // Handle reorder
    if (reorderId) {
      const { data: oldOrder } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', reorderId)
        .single()
      if (oldOrder?.order_items) {
        const allItems = (cats || []).flatMap((c: any) => c.menu_items || [])
        const reorderCart = oldOrder.order_items
          .map((item: any) => {
            const menuItem = allItems.find((m: any) => m.id === item.menu_item_id || m.name === item.name)
            if (!menuItem || !menuItem.is_available) return null
            return {
              cartId: Date.now() + Math.random(),
              id: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
              qty: item.quantity,
              note: item.special_instructions || '',
              options: [],
            }
          })
          .filter(Boolean)
        if (reorderCart.length > 0) {
          setCart(reorderCart)
          setShowBasket(true)
        }
      }
    }
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
      .order('sort_order', { ascending: true })

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
    // Mark shared groups so we can label them
    const markedDirect = (directGroups || []).map((g: any) => ({ ...g, isShared: false }))
    const markedShared = sharedGroups.map((g: any) => ({ ...g, isShared: true }))
    setOptionGroups([...markedDirect, ...markedShared])

    // Set defaults for required single-select groups
    const defaults: Record<string, string[]> = {}
    for (const g of allGroups) {
      if (g.required && g.type === 'single' && g.item_options?.length > 0) {
        defaults[g.id] = [g.item_options[0].id]
      }
    }
    setSelectedOptions(defaults)
    // Collapse groups marked as collapsible
    const collapsed = new Set<string>()
    allGroups.forEach((g: any) => { if (g.is_collapsible) collapsed.add(g.id) })
    setCollapsedGroups(collapsed)
    setOptionsLoading(false)
  }

  function toggleOption(groupId: string, optionId: string, type: string, maxSelections?: number) {
    setSelectedOptions(prev => {
      const current = prev[groupId] || []
      if (type === 'single') return { ...prev, [groupId]: [optionId] }
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter(id => id !== optionId) }
      // Enforce max selections
      if (maxSelections && maxSelections > 0 && current.length >= maxSelections) return prev
      return { ...prev, [groupId]: [...current, optionId] }
    })
  }

  function getOptionsTotal(): number {
    let extra = 0
    for (const group of optionGroups) {
      for (const optId of (selectedOptions[group.id] || [])) {
        const opt = group.item_options?.find((o: any) => o.id === optId)
        if (opt) extra += parseFloat(opt.price_adjustment) || 0
      }
    }
    return extra
  }

  function getSelectedOptionLabels(): string {
    const labels: string[] = []
    for (const group of optionGroups) {
      for (const optId of (selectedOptions[group.id] || [])) {
        const opt = group.item_options?.find((o: any) => o.id === optId)
        if (opt) labels.push(opt.name)
      }
    }
    return labels.join(', ')
  }

  function canAddToCart(): boolean {
    for (const group of optionGroups) {
      if (group.required && (selectedOptions[group.id] || []).length === 0) return false
    }
    return true
  }

  function addToCart() {
    if (!selectedItem || !canAddToCart()) return
    const optionsLabel = getSelectedOptionLabels()
    const optionsExtra = getOptionsTotal()
    const totalPrice = selectedItem.price + optionsExtra
    const cartNote = [optionsLabel, itemNote].filter(Boolean).join(' | ')
    const key = selectedItem.id + cartNote
    const existing = cart.find(c => c.key === key)
    if (existing) {
      setCart(cart.map(c => c.key === key ? { ...c, qty: c.qty + itemQty } : c))
    } else {
      setCart([...cart, { ...selectedItem, price: totalPrice, qty: itemQty, note: cartNote, key, cartId: Date.now() }])
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
  const minFee = zones.length > 0 
    ? Math.min(...zones.map((z: any) => parseFloat(z.fee) || 0))
    : parseFloat(restaurant?.delivery_fee) || 2.50
  const deliveryFee = minFee
  const deliveryFeeLabel = zones.length > 1 
    ? (minFee === 0 ? 'from FREE' : `from GBP${minFee.toFixed(2)}`)
    : (minFee === 0 ? 'FREE' : `GBP${minFee.toFixed(2)}`)
  const freeDeliveryOver = zones.length > 0 
    ? Math.min(...zones.filter((z: any) => z.free_delivery_over).map((z: any) => parseFloat(z.free_delivery_over)))
    : null
  const hasFreeDeliveryThreshold = freeDeliveryOver && isFinite(freeDeliveryOver)

  // Filter categories/items by search
  const filteredCategories = categories.map(cat => ({
    ...cat,
    menu_items: (cat.menu_items || []).filter((item: any) => {
      if (!item.is_available) return false
      if (!searchQuery) return true
      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    })
  })).filter(cat => cat.menu_items.length > 0)

  if (loading) return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading menu...</div>
  )
  if (!restaurant) return null

  return (
    <div style={{ background: dark ? '#0a0f1e' : '#f8fafc', minHeight: '100vh', color: dark ? '#f8fafc' : '#0f172a', fontFamily: 'system-ui,sans-serif', paddingBottom: '80px' }}>

      {/* NAV */}
      <nav style={{ background: dark ? '#060b18' : '#ffffff', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f8fafc' }}>me.gg</span>
        </Link>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Back</button>
      </nav>

      {/* RESTAURANT INFO */}
      <div style={{ background: dark ? '#060b18' : '#ffffff', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, padding: '20px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {restaurant.logo_url
              ? <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '40px' }}>{restaurant.emoji}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{restaurant.name}</h1>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: restaurant.is_open ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: restaurant.is_open ? '#22c55e' : '#ef4444' }}>
                {restaurant.is_open ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>{restaurant.cuisine_type}</div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              <span>Delivery {restaurant.delivery_time_mins} mins</span>
              <span>Collection {restaurant.pickup_time_mins} mins</span>
              <span>Min order GBP{restaurant.min_order?.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowInfo(!showInfo)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: showInfo ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showInfo ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', color: showInfo ? '#22c55e' : '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Info &amp; Map {showInfo ? 'v' : '>'}
            </button>
          </div>
        </div>
      </div>



      {/* INFO PANEL */}
      {showInfo && (
        <div style={{ background: dark ? '#060b18' : '#ffffff', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, padding: '20px' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>

            {/* Description */}
            {restaurant.description && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>{restaurant.description}</p>
              </div>
            )}

            {/* Map & Info */}
            {(restaurant.address || restaurant.phone) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {restaurant.address && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <iframe
                      width="100%"
                      height="200"
                      frameBorder="0"
                      style={{ display: 'block' }}
                      src={restaurant.lat && restaurant.lng
                        ? `https://www.openstreetmap.org/export/embed.html?bbox=${restaurant.lng - 0.01},${restaurant.lat - 0.01},${restaurant.lng + 0.01},${restaurant.lat + 0.01}&layer=mapnik&marker=${restaurant.lat},${restaurant.lng}`
                        : `https://maps.google.com/maps?q=${encodeURIComponent(restaurant.address + ', Guernsey')}&output=embed&z=15`
                      }
                    />
                    <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
                        <span>📍</span><span>{restaurant.address}, {restaurant.parish}</span>
                      </div>
                      {restaurant.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
                          <span>📞</span><a href={`tel:${restaurant.phone}`} style={{ color: '#22c55e', textDecoration: 'none' }}>{restaurant.phone}</a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>

              {/* Opening Hours */}
              {hours.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#f1f5f9' }}>Opening Times</h3>
                  {hours.map((h: any) => (
                    <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: '#64748b', width: '100px' }}>{h.day}</span>
                      <span style={{ color: h.is_closed ? '#ef4444' : '#f1f5f9', fontWeight: 500 }}>
                        {h.is_closed ? 'Closed' : `${h.open_time} - ${h.close_time}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Delivery Zones */}
              {zones.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#f1f5f9' }}>Delivery</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parish</span>
                    <span style={{ color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', paddingRight: '16px' }}>Min Order</span>
                    <span style={{ color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Fee</span>
                  </div>
                  {zones.map((z: any) => (
                    <div key={z.parish} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>{z.name || z.parish}</span>
                      <span style={{ color: '#f1f5f9', textAlign: 'right', paddingRight: '16px' }}>GBP{parseFloat(z.min_order).toFixed(2)}</span>
                      <span style={{ color: '#22c55e', textAlign: 'right', fontWeight: 600 }}>GBP{parseFloat(z.fee).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          <input type="text" placeholder="Search menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', fontSize: '13px', outline: 'none' }} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Clear</button>}
        </div>
      </div>

      {/* MENU */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '16px 20px' }}>

        {/* OFFERS BANNER */}
        {offers.length > 0 && (
          <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
            {offers.map(offer => (
              <div key={offer.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: offer.offer_type === 'deal_of_day' ? 'rgba(249,115,22,0.08)' : offer.offer_type === 'free_delivery' ? 'rgba(34,197,94,0.08)' : offer.offer_type === 'first_order' ? 'rgba(168,85,247,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${offer.offer_type === 'deal_of_day' ? 'rgba(249,115,22,0.25)' : offer.offer_type === 'free_delivery' ? 'rgba(34,197,94,0.25)' : offer.offer_type === 'first_order' ? 'rgba(168,85,247,0.25)' : 'rgba(59,130,246,0.25)'}`, borderRadius: '12px' }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>
                  {offer.offer_type === 'deal_of_day' ? '🔥' : offer.offer_type === 'free_delivery' ? '🚗' : offer.offer_type === 'meal_deal' ? '🍱' : '🎁'}
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '2px' }}>{offer.title}</div>
                  {offer.description && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{offer.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredCategories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
            {searchQuery ? `No items found for "${searchQuery}"` : 'Menu coming soon...'}
          </div>
        )}
        {filteredCategories.map(cat => (
          <div key={cat.id} id={`cat-${cat.id}`} style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {cat.name}
            </div>
            {cat.menu_items.map((item: any) => (
              <div key={item.id} onClick={() => openItem(item)}
                style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{item.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{item.name}</div>
                  {item.description && <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#f97316' }}>GBP{item.price.toFixed(2)}</span>

                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); openItem(item) }} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', width: '32px', height: '32px', borderRadius: '8px', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>+</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* BOTTOM BAR */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#060b18', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', zIndex: 100, display: 'flex', gap: '10px' }}>
        <button onClick={() => setShowCategoryMenu(true)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.06)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
          Menu
        </button>
        <button onClick={() => setShowBasket(true)} style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#0a0f1e', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
          Basket {cartCount > 0 ? `(${cartCount}) - GBP${cartTotal.toFixed(2)}` : ''}
        </button>
      </div>

      {/* CATEGORY MENU MODAL */}
      {showCategoryMenu && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowCategoryMenu(false)}>
          <div style={{ width: '100%', background: '#0f172a', borderRadius: '16px 16px 0 0', padding: '20px', maxHeight: '60vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Categories</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '8px' }}>
              {filteredCategories.map(cat => (
                <button key={cat.id} onClick={() => { const el = document.getElementById(`cat-${cat.id}`); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setShowCategoryMenu(false) }}
                  style={{ padding: '10px', background: 'rgba(255,255,255,0.06)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}>
                  {cat.name}
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>{cat.menu_items.length} items</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ITEM OPTIONS MODAL */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) setSelectedItem(null) }}>
          <div style={{ width: '100%', background: '#0f172a', borderRadius: '16px 16px 0 0', padding: '24px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '40px' }}>{selectedItem.emoji}</div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, marginBottom: '3px' }}>{selectedItem.name}</h2>
                {selectedItem.description && <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{selectedItem.description}</p>}
              </div>
            </div>



            {optionsLoading && <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading options...</div>}

            {!optionsLoading && optionGroups.map(group => (
              <div key={group.id} style={{ marginBottom: '18px' }}>
                <div onClick={() => {
                  if (!group.is_collapsible) return
                  setCollapsedGroups(prev => {
                    const next = new Set(prev)
                    if (next.has(group.id)) next.delete(group.id)
                    else next.add(group.id)
                    return next
                  })
                }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsedGroups.has(group.id) ? '0' : '10px', cursor: group.is_collapsible ? 'pointer' : 'default', padding: group.is_collapsible ? '8px 12px' : '0', background: group.is_collapsible ? 'rgba(255,255,255,0.03)' : 'transparent', borderRadius: '8px', border: group.is_collapsible ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{group.name}</div>

                    {group.is_collapsible && <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>{collapsedGroups.has(group.id) ? '+ Show options' : '- Hide options'}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: group.required ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: group.required ? '#fca5a5' : '#64748b' }}>
                      {group.required ? 'Required' : 'Optional'}
                    </span>
                    {group.max_selections > 0 && (
                      <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600 }}>Choose up to {group.max_selections}</span>
                    )}
                  </div>
                </div>
                {!collapsedGroups.has(group.id) && (group.type === 'single' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {group.item_options?.filter((o: any) => o.is_available).map((opt: any) => (
                      <div key={opt.id} onClick={() => toggleOption(group.id, opt.id, 'single', group.max_selections)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${(selectedOptions[group.id] || []).includes(opt.id) ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: (selectedOptions[group.id] || []).includes(opt.id) ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${(selectedOptions[group.id] || []).includes(opt.id) ? '#22c55e' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {(selectedOptions[group.id] || []).includes(opt.id) && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />}
                          </div>
                          <span style={{ fontSize: '13px' }}>{opt.name}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: opt.price_adjustment > 0 ? '#f97316' : '#64748b' }}>
                          {opt.price_adjustment > 0 ? `+GBP${parseFloat(opt.price_adjustment).toFixed(2)}` : 'Included'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {group.item_options?.filter((o: any) => o.is_available).map((opt: any) => (
                      <div key={opt.id} onClick={() => toggleOption(group.id, opt.id, 'multiple', group.max_selections)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${(selectedOptions[group.id] || []).includes(opt.id) ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: (selectedOptions[group.id] || []).includes(opt.id) ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: `2px solid ${(selectedOptions[group.id] || []).includes(opt.id) ? '#22c55e' : 'rgba(255,255,255,0.2)'}`, background: (selectedOptions[group.id] || []).includes(opt.id) ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {(selectedOptions[group.id] || []).includes(opt.id) && <span style={{ color: '#0a0f1e', fontSize: '9px', fontWeight: 700, lineHeight: 1 }}>v</span>}
                          </div>
                          <span style={{ fontSize: '12px' }}>{opt.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#f97316' }}>
                          {opt.price_adjustment > 0 ? `+GBP${parseFloat(opt.price_adjustment).toFixed(2)}` : 'Free'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Special instructions (optional)</label>
              <textarea value={itemNote} onChange={e => setItemNote(e.target.value)} placeholder="e.g. no onions, extra sauce..." rows={2} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#f8fafc', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
              <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', width: '36px', height: '36px', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
              <span style={{ fontSize: '20px', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>{itemQty}</span>
              <button onClick={() => setItemQty(itemQty + 1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', width: '36px', height: '36px', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>

            <button onClick={addToCart} disabled={!canAddToCart()}
              style={{ width: '100%', padding: '14px', background: canAddToCart() ? '#22c55e' : '#1e3a2f', color: canAddToCart() ? '#0a0f1e' : '#475569', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: canAddToCart() ? 'pointer' : 'not-allowed' }}>
              Add to Basket - GBP{((selectedItem.price + getOptionsTotal()) * itemQty).toFixed(2)}
            </button>
            {!canAddToCart() && <div style={{ textAlign: 'center', fontSize: '12px', color: '#fca5a5', marginTop: '8px' }}>Please make all required selections</div>}
          </div>
        </div>
      )}

      {/* BASKET MODAL */}
      {/* BASKET SIDEBAR */}
      {showBasket && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setShowBasket(false)}>
          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
          {/* Sidebar */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(380px, 100vw)', background: dark ? '#0f172a' : '#ffffff', borderLeft: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: dark ? '#f1f5f9' : '#0f172a' }}>Your Order</h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{restaurant?.name}</div>
              </div>
              <button onClick={() => setShowBasket(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Your basket is empty</div>
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>Add items from the menu</div>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: dark ? '#f1f5f9' : '#0f172a' }}>{item.name}</div>
                      {item.note && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.note}</div>}
                      <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '2px', fontWeight: 600 }}>GBP{(item.price * item.qty).toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: '8px', padding: '4px' }}>
                      <button onClick={() => updateQty(item.cartId, -1)} style={{ background: 'none', border: 'none', color: dark ? '#f8fafc' : '#0f172a', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>-</button>
                      <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '16px', textAlign: 'center', color: dark ? '#f8fafc' : '#0f172a' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.cartId, 1)} style={{ background: 'none', border: 'none', color: dark ? '#f8fafc' : '#0f172a', width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Footer */}
            {cart.length > 0 && (
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                  <span>Subtotal</span><span>GBP{cartTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: hasFreeDeliveryThreshold ? '4px' : '12px' }}>
                  <span>Delivery</span><span>{deliveryFeeLabel}</span>
                </div>
                {hasFreeDeliveryThreshold && (
                  <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '12px', textAlign: 'right' }}>
                    🎉 Free delivery over GBP{freeDeliveryOver!.toFixed(2)}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: 800, marginBottom: '16px', color: dark ? '#f1f5f9' : '#0f172a' }}>
                  <span>Total</span><span style={{ color: '#22c55e' }}>GBP{(cartTotal + deliveryFee).toFixed(2)}+</span>
                </div>
                <button onClick={() => { if (!restaurant?.id) return; localStorage.setItem('feedme-cart', JSON.stringify({ cart, restaurantId: restaurant.id, restaurantName: restaurant.name })); router.push('/checkout') }}
                  style={{ width: '100%', padding: '16px', background: '#22c55e', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
