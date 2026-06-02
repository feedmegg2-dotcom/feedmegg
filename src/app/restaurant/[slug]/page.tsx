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
  const [isMobile, setIsMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => { 
    fetchRestaurant()
    setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', () => setIsMobile(window.innerWidth < 768))
  }, [slug])

  async function fetchRestaurant() {
    const { data: rest } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single()

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6B7280' }}>
      Loading menu...
    </div>
  )

  if (!restaurant) return null

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Clean Nav */}
      <nav style={{ borderBottom: '1px solid #E5E5E5', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, background: '#FFFFFF' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', textDecoration: 'none', color: '#1F2937' }}>
            feedme.gg
          </Link>
          {cartCount > 0 && (
            <button
              onClick={() => router.push('/checkout')}
              style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              🛒 {cartCount} item{cartCount !== 1 ? 's' : ''} · £{cartTotal.toFixed(2)}
            </button>
          )}
        </div>
      </nav>

      {/* Restaurant Header - Clean */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '24px 16px' : '32px 20px', borderBottom: '1px solid #E5E5E5' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '14px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          ← Back
        </button>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '48px' }}>{restaurant.emoji}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              {restaurant.name}
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
              {restaurant.cuisine_type} · {restaurant.delivery_time_mins}-{restaurant.delivery_time_mins + 10} min delivery
            </p>
            {restaurant.description && (
              <p style={{ fontSize: '13px', color: '#6B7280' }}>{restaurant.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar - Clean */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px' : '24px 20px', borderBottom: '1px solid #E5E5E5', display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Search */}
        <div style={{ flex: 1, background: '#F3F4F6', border: '1px solid #E5E5E5', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '12px', fontSize: '14px', color: '#1F2937', outline: 'none' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '16px', cursor: 'pointer', padding: '4px 8px' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Select */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{ 
            background: '#F3F4F6', 
            border: '1px solid #E5E5E5', 
            borderRadius: '8px', 
            padding: '12px', 
            fontSize: '14px', 
            color: '#1F2937', 
            cursor: 'pointer',
            minWidth: isMobile ? '100%' : '200px',
            fontFamily: 'DM Sans, system-ui, sans-serif'
          }}
        >
          <option value="all">All categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 20px', display: 'flex', gap: isMobile ? '0' : '32px', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
        {/* Menu */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filteredCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
              <p>No items found{searchQuery && ` for "${searchQuery}"`}</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                style={{ marginTop: '16px', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            filteredCategories.map(cat => (
              <div key={cat.id} style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', marginBottom: '16px', letterSpacing: '-0.3px' }}>
                  {cat.name}
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {cat.menu_items.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setItemQty(1); setItemNote('') }}
                      style={{ 
                        background: '#FFFFFF', 
                        border: '1px solid #E5E5E5', 
                        borderRadius: '10px', 
                        padding: '16px',
                        display: 'flex',
                        gap: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        alignItems: 'flex-start'
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                        el.style.borderColor = '#D1D5DB'
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
                        el.style.borderColor = '#E5E5E5'
                      }}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>
                          {item.emoji}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
                          {item.name}
                        </h4>
                        {item.description && (
                          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '10px', lineHeight: 1.4 }}>
                            {item.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E' }}>
                            £{item.price.toFixed(2)}
                          </span>
                          {item.tags?.slice(0, 1).map((tag: string) => (
                            <span key={tag} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: tag === 'vegan' ? '#D1FAE5' : tag === 'spicy' ? '#FED7AA' : '#F0F9FF', color: tag === 'vegan' ? '#065F46' : tag === 'spicy' ? '#92400E' : '#0369A1' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); addToCart(item, '', 1) }}
                        style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', width: '40px', height: '40px', borderRadius: '8px', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Sidebar */}
        <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '10px', padding: '20px', position: 'sticky', top: '80px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', marginBottom: '16px', letterSpacing: '-0.3px' }}>
              Your Order
            </h3>
            
            {cart.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>
                Add items to continue
              </p>
            ) : (
              <>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #E5E5E5' }}>
                  {cart.map(item => (
                    <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: '13px', marginBottom: '8px' }}>
                      <span style={{ color: '#374151', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.qty}× {item.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ color: '#22C55E', fontWeight: 600 }}>£{(item.price * item.qty).toFixed(2)}</span>
                        <button onClick={() => updateQty(item.cartId, -1)} style={{ background: '#F3F4F6', border: 'none', color: '#6B7280', width: '20px', height: '20px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                          −
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Subtotal</span>
                    <span>£{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Delivery</span>
                    <span>£{deliveryFee.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ paddingTop: '12px', borderTop: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
                  <span>Total</span>
                  <span style={{ color: '#22C55E' }}>£{(cartTotal + deliveryFee).toFixed(2)}</span>
                </div>

                <button
                  onClick={() => { localStorage.setItem('feedme-cart', JSON.stringify({ cart, restaurantId: restaurant.id, restaurantName: restaurant.name })); router.push('/checkout') }}
                  style={{ width: '100%', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Item Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedItem(null) }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#F3F4F6', border: 'none', color: '#6B7280', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer' }}>
              ✕
            </button>

            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>
              {selectedItem.emoji}
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1F2937', textAlign: 'center', marginBottom: '8px' }}>
              {selectedItem.name}
            </h2>
            {selectedItem.description && (
              <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', marginBottom: '16px', lineHeight: 1.5 }}>
                {selectedItem.description}
              </p>
            )}
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#22C55E', textAlign: 'center', marginBottom: '24px' }}>
              £{selectedItem.price.toFixed(2)}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>
                Special instructions
              </label>
              <textarea
                value={itemNote}
                onChange={e => setItemNote(e.target.value)}
                placeholder="e.g. no onions..."
                rows={2}
                style={{ width: '100%', background: '#F3F4F6', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1F2937', outline: 'none', resize: 'none', fontFamily: 'DM Sans, system-ui, sans-serif' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
              <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} style={{ background: '#F3F4F6', border: 'none', color: '#1F2937', width: '36px', height: '36px', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
                −
              </button>
              <span style={{ fontSize: '18px', fontWeight: 700, minWidth: '30px', textAlign: 'center', color: '#1F2937' }}>
                {itemQty}
              </span>
              <button onClick={() => setItemQty(itemQty + 1)} style={{ background: '#F3F4F6', border: 'none', color: '#1F2937', width: '36px', height: '36px', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
                +
              </button>
            </div>

            <button
              onClick={() => addToCart(selectedItem, itemNote, itemQty)}
              style={{ width: '100%', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              Add to order — £{(selectedItem.price * itemQty).toFixed(2)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
