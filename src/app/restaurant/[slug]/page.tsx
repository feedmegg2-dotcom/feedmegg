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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showBasket, setShowBasket] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => { 
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    setTheme(savedTheme || 'light')
    fetchRestaurant()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [slug])

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleScroll = () => {
    setScrolled(window.scrollY > 100)
  }

  async function fetchRestaurant() {
    let rest = null
    const { data: restBySlug } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single()
    rest = restBySlug

    if (!rest) {
      const decodedName = decodeURIComponent(slug as string).replace(/-/g, ' ')
      const { data: restByName } = await supabase
        .from('restaurants')
        .select('*')
        .ilike('name', decodedName)
        .single()
      rest = restByName
    }

    if (!rest) { router.push('/'); return }
    setRestaurant(rest)

    const { data: cats } = await supabase
      .from('menu_categories')
      .select('*, menu_items(*)')
      .eq('restaurant_id', rest.id)
      .eq('is_active', true)
      .order('sort_order')

    setCategories(cats || [])
    setLoading(false)
  }

  function addToCart(item: any, note: string, qty: number) {
    const existing = cart.find(c => c.id === item.id && c.note === note)
    if (existing) {
      setCart(cart.map(c => c.id === item.id && c.note === note ? { ...c, qty: c.qty + qty } : c))
    } else {
      setCart([...cart, { ...item, qty, note, cartId: Date.now() }])
    }
    setSelectedItem(null)
    setItemNote('')
    setItemQty(1)
  }

  function updateQty(cartId: number, delta: number) {
    setCart(prev => {
      const updated = prev.map(c => c.cartId === cartId ? { ...c, qty: c.qty + delta } : c)
      return updated.filter(c => c.qty > 0)
    })
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const deliveryFee = 2.99

  const getFilteredCategories = () => {
    let filtered = categories
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(cat => cat.id.toString() === selectedCategory)
    }
    return filtered
      .map(cat => {
        const filteredItems = cat.menu_items?.filter((item: any) => {
          if (!item.is_available) return false
          if (searchQuery) {
            return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
          }
          return true
        }) || []
        return { ...cat, menu_items: filteredItems }
      })
      .filter(cat => cat.menu_items.length > 0)
  }

  const filteredCategories = getFilteredCategories()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#666' }}>
      Loading menu...
    </div>
  )

  if (!restaurant) return null

  const isDark = theme === 'dark'
  const bgColor = isDark ? '#1F2937' : '#FFFFFF'
  const textColor = isDark ? '#FFFFFF' : '#1F2937'
  const secondaryText = isDark ? '#D1D5DB' : '#6B7280'
  const borderColor = isDark ? '#374151' : '#E5E5E5'
  const inputBg = isDark ? '#374151' : '#F3F4F6'
  const hoverBg = isDark ? '#2D3748' : '#F3F4F6'
  const cardBg = isDark ? '#111827' : '#FFFFFF'

  return (
    <div style={{ background: bgColor, minHeight: '100vh', paddingBottom: '70px', color: textColor, transition: 'all 0.3s' }}>
      {/* Nav */}
      <nav style={{ background: '#1F2937', borderBottom: '3px solid #22C55E', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: '18px', fontWeight: 800, textDecoration: 'none', color: '#22C55E' }}>
            feedme.gg
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              style={{ background: '#2D3748', border: 'none', color: '#FFFFFF', fontSize: '14px', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '14px', cursor: 'pointer', padding: '6px 10px' }}>
              ← Back
            </button>
          </div>
        </div>
      </nav>

      {/* Restaurant Header */}
      <div style={{ background: hoverBg, padding: '16px', borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '32px' }}>{restaurant.emoji}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: textColor, marginBottom: '4px' }}>
              {restaurant.name}
            </h1>
            <p style={{ fontSize: '12px', color: secondaryText, marginBottom: '6px' }}>
              {restaurant.cuisine_type}
            </p>
            <div style={{ fontSize: '11px', color: secondaryText, display: 'flex', gap: '12px' }}>
              <span>⏱ {restaurant.delivery_time_mins} min</span>
              <span>🚗 £{restaurant.delivery_fee?.toFixed(2) || '2.99'}</span>
            </div>
          </div>
          <span style={{ background: restaurant.is_open ? '#22C55E' : '#999', color: '#FFFFFF', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
            {restaurant.is_open ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '10px 0', fontSize: '13px', color: textColor, outline: 'none' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: secondaryText, fontSize: '14px', cursor: 'pointer', padding: '4px 6px' }}
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: '6px', padding: '10px 8px', fontSize: '12px', color: textColor, cursor: 'pointer', minWidth: '120px' }}
        >
          <option value="all">All</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Menu Items */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: secondaryText }}>
            <p>No items found</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              style={{ marginTop: '12px', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <div key={cat.id} style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: textColor, marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #22C55E' }}>
                {cat.name}
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {cat.menu_items.map((item: any) => (
                  <MenuItemCard key={item.id} item={item} setSelectedItem={setSelectedItem} setItemQty={setItemQty} setItemNote={setItemNote} bgColor={bgColor} textColor={textColor} secondaryText={secondaryText} borderColor={borderColor} inputBg={inputBg} hoverBg={hoverBg} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Item Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedItem(null) }}>
          <div style={{ background: cardBg, borderRadius: '16px 16px 0 0', padding: '20px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: inputBg, border: 'none', color: secondaryText, width: '28px', height: '28px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer' }}>
              ✕
            </button>
            <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>
              {selectedItem.emoji}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: textColor, textAlign: 'center', marginBottom: '6px' }}>
              {selectedItem.name}
            </h2>
            {selectedItem.description && (
              <p style={{ fontSize: '12px', color: secondaryText, textAlign: 'center', marginBottom: '14px', lineHeight: 1.4 }}>
                {selectedItem.description}
              </p>
            )}
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E', textAlign: 'center', marginBottom: '18px' }}>
              £{selectedItem.price.toFixed(2)}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: textColor, fontWeight: 600, marginBottom: '6px' }}>
                Instructions
              </label>
              <textarea
                value={itemNote}
                onChange={e => setItemNote(e.target.value)}
                placeholder="e.g. no onions..."
                rows={2}
                style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, borderRadius: '6px', padding: '8px', fontSize: '12px', color: textColor, outline: 'none', resize: 'none', fontFamily: 'DM Sans, system-ui, sans-serif' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '18px' }}>
              <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} style={{ background: inputBg, border: 'none', color: textColor, width: '36px', height: '36px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: 700 }}>
                −
              </button>
              <span style={{ fontSize: '14px', fontWeight: 700, minWidth: '36px', textAlign: 'center', color: textColor }}>
                {itemQty}
              </span>
              <button onClick={() => setItemQty(itemQty + 1)} style={{ background: inputBg, border: 'none', color: textColor, width: '36px', height: '36px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: 700 }}>
                +
              </button>
            </div>
            <button
              onClick={() => {
                const existing = cart.find(c => c.id === selectedItem.id && c.note === itemNote)
                if (existing) {
                  setCart(cart.map(c => c.id === selectedItem.id && c.note === itemNote ? { ...c, qty: c.qty + itemQty } : c))
                } else {
                  setCart([...cart, { ...selectedItem, qty: itemQty, note: itemNote, cartId: Date.now() }])
                }
                setSelectedItem(null)
                setItemNote('')
                setItemQty(1)
              }}
              style={{ width: '100%', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Add — £{(selectedItem.price * itemQty).toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* Category Menu Modal */}
      {showCategoryMenu && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCategoryMenu(false) }}>
          <div style={{ background: cardBg, borderRadius: '16px 16px 0 0', padding: '20px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: textColor, marginBottom: '16px' }}>Categories</h2>
            <div style={{ display: 'grid', gap: '8px' }}>
              <button
                onClick={() => { setSelectedCategory('all'); setShowCategoryMenu(false); }}
                style={{ background: selectedCategory === 'all' ? '#22C55E' : inputBg, color: selectedCategory === 'all' ? '#FFFFFF' : textColor, border: 'none', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
              >
                All Items
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id.toString()); setShowCategoryMenu(false); }}
                  style={{ background: selectedCategory === cat.id.toString() ? '#22C55E' : inputBg, color: selectedCategory === cat.id.toString() ? '#FFFFFF' : textColor, border: 'none', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Basket Modal */}
      {showBasket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowBasket(false) }}>
          <div style={{ background: cardBg, borderRadius: '16px 16px 0 0', padding: '20px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowBasket(false)} style={{ position: 'absolute', top: '12px', right: '12px', background: inputBg, border: 'none', color: secondaryText, width: '28px', height: '28px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer' }}>
              ✕
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: textColor, marginBottom: '16px' }}>Your Order</h2>
            {cart.length === 0 ? (
              <p style={{ fontSize: '12px', color: secondaryText, textAlign: 'center', padding: '32px 0' }}>
                No items yet
              </p>
            ) : (
              <>
                <div style={{ display: 'grid', gap: '10px', marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${borderColor}` }}>
                  {cart.map(item => (
                    <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: textColor, marginBottom: '2px' }}>
                          {item.qty}× {item.name}
                        </p>
                        {item.note && <p style={{ fontSize: '10px', color: secondaryText, fontStyle: 'italic' }}>Note: {item.note}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#22C55E', minWidth: '45px', textAlign: 'right' }}>
                          £{(item.price * item.qty).toFixed(2)}
                        </span>
                        <button onClick={() => updateQty(item.cartId, -1)} style={{ background: inputBg, border: 'none', color: textColor, width: '20px', height: '20px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                          −
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gap: '8px', marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: secondaryText }}>
                    <span>Subtotal</span>
                    <span>£{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: secondaryText }}>
                    <span>Delivery</span>
                    <span>£{deliveryFee.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: textColor, marginBottom: '16px' }}>
                  <span>Total</span>
                  <span style={{ color: '#22C55E' }}>£{(cartTotal + deliveryFee).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => { localStorage.setItem('feedme-cart', JSON.stringify({ cart, restaurantId: restaurant.id, restaurantName: restaurant.name })); router.push('/checkout') }}
                  style={{ width: '100%', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1F2937', display: 'flex', gap: '10px', padding: '10px 12px', zIndex: 100, boxShadow: '0 -2px 8px rgba(0,0,0,0.1)' }}>
        <button
          onClick={() => setShowCategoryMenu(true)}
          style={{ flex: 1, background: '#2D3748', color: '#FFFFFF', border: 'none', padding: '11px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
        >
          ☰ Menu
        </button>
        <button
          onClick={() => setShowBasket(true)}
          style={{ flex: 1, background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '11px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          🛒 {cartCount > 0 ? `£${cartTotal.toFixed(2)}` : 'Basket'}
        </button>
      </div>
    </div>
  )
}

function MenuItemCard(props: any) {
  const { item, setSelectedItem, setItemQty, setItemNote, bgColor, textColor, secondaryText, borderColor, inputBg, hoverBg } = props
  const [hovering, setHovering] = useState(false)

  return (
    <div
      onClick={() => { setSelectedItem(item); setItemQty(1); setItemNote('') }}
      style={{ 
        background: bgColor, 
        border: `1px solid ${borderColor}`, 
        borderRadius: '8px', 
        padding: '10px',
        display: 'flex',
        gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        alignItems: 'flex-start',
        boxShadow: hovering ? `0 4px 12px rgba(0,0,0,0.08)` : `0 1px 2px rgba(0,0,0,0.05)`,
        borderColor: hovering ? '#22C55E' : borderColor
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{ width: '50px', height: '50px', borderRadius: '6px', background: hoverBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: textColor, marginBottom: '2px' }}>
          {item.name}
        </h4>
        {item.description && (
          <p style={{ fontSize: '11px', color: secondaryText, marginBottom: '4px', lineHeight: 1.3 }}>
            {item.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#22C55E' }}>
            £{item.price.toFixed(2)}
          </span>
          {item.tags?.slice(0, 1).map((tag: string) => (
            <span key={tag} style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '3px', background: tag === 'vegan' ? '#D1FAE5' : tag === 'spicy' ? '#FED7AA' : '#F0F9FF', color: tag === 'vegan' ? '#065F46' : tag === 'spicy' ? '#92400E' : '#0369A1' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); setSelectedItem(item); setItemQty(1); setItemNote('') }}
        style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', width: '32px', height: '32px', borderRadius: '6px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
      >
        +
      </button>
    </div>
  )
}
