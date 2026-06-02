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

  useEffect(() => { 
    fetchRestaurant()
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#666' }}>
      Loading menu...
    </div>
  )

  if (!restaurant) return null

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Nav */}
      <nav style={{ background: '#1F2937', borderBottom: '3px solid #22C55E', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', textDecoration: 'none', color: '#22C55E' }}>
            feedme.gg
          </Link>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '16px', cursor: 'pointer', padding: '8px 12px' }}>
            ← Back
          </button>
        </div>
      </nav>

      {/* Restaurant Header */}
      <div style={{ background: '#F9FAFB', padding: '20px', borderBottom: '1px solid #E5E5E5', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '40px' }}>{restaurant.emoji}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937', marginBottom: '6px' }}>
              {restaurant.name}
            </h1>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              {restaurant.cuisine_type}
            </p>
            <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '16px' }}>
              <span>⏱ {restaurant.delivery_time_mins}-{restaurant.delivery_time_mins + 10} min</span>
              <span>🚗 £{restaurant.delivery_fee?.toFixed(2) || '2.99'}</span>
            </div>
          </div>
          <span style={{ background: '#22C55E', color: '#FFFFFF', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
            {restaurant.is_open ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 20px', borderBottom: '1px solid #E5E5E5', display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, background: '#F3F4F6', border: '1px solid #E5E5E5', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '10px', fontSize: '13px', color: '#1F2937', outline: 'none' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#999', fontSize: '14px', cursor: 'pointer', padding: '4px 8px' }}
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{ 
            background: '#F3F4F6', 
            border: '1px solid #E5E5E5', 
            borderRadius: '6px', 
            padding: '10px', 
            fontSize: '13px', 
            color: '#1F2937', 
            cursor: 'pointer',
            minWidth: '150px'
          }}
        >
          <option value="all">All</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Menu Items */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <p>No items found</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              style={{ marginTop: '16px', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <div key={cat.id} style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #22C55E' }}>
                {cat.name}
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {cat.menu_items.map((item: any) => (
                  <MenuItemCard key={item.id} item={item} setSelectedItem={setSelectedItem} setItemQty={setItemQty} setItemNote={setItemNote} />
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
          <div style={{ background: '#FFFFFF', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#F3F4F6', border: 'none', color: '#666', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer' }}>
              ✕
            </button>

            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>
              {selectedItem.emoji}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', textAlign: 'center', marginBottom: '8px' }}>
              {selectedItem.name}
            </h2>
            {selectedItem.description && (
              <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '16px', lineHeight: 1.5 }}>
                {selectedItem.description}
              </p>
            )}
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#22C55E', textAlign: 'center', marginBottom: '24px' }}>
              £{selectedItem.price.toFixed(2)}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#333', fontWeight: 600, marginBottom: '8px' }}>
                Special instructions
              </label>
              <textarea
                value={itemNote}
                onChange={e => setItemNote(e.target.value)}
                placeholder="e.g. no onions..."
                rows={2}
                style={{ width: '100%', background: '#F3F4F6', border: '1px solid #E5E5E5', borderRadius: '6px', padding: '10px', fontSize: '13px', color: '#1F2937', outline: 'none', resize: 'none', fontFamily: 'DM Sans, system-ui, sans-serif' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} style={{ background: '#F3F4F6', border: 'none', color: '#1F2937', width: '40px', height: '40px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', fontWeight: 700 }}>
                −
              </button>
              <span style={{ fontSize: '16px', fontWeight: 700, minWidth: '40px', textAlign: 'center', color: '#1F2937' }}>
                {itemQty}
              </span>
              <button onClick={() => setItemQty(itemQty + 1)} style={{ background: '#F3F4F6', border: 'none', color: '#1F2937', width: '40px', height: '40px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', fontWeight: 700 }}>
                +
              </button>
            </div>

            <button
              onClick={() => addToCart(selectedItem, itemNote, itemQty)}
              style={{ width: '100%', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              Add to order — £{(selectedItem.price * itemQty).toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* Basket Modal */}
      {showBasket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowBasket(false) }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowBasket(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#F3F4F6', border: 'none', color: '#666', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer' }}>
              ✕
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', marginBottom: '20px' }}>Your Order</h2>

            {cart.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '40px 0' }}>
                No items in your order
              </p>
            ) : (
              <>
                <div style={{ display: 'grid', gap: '12px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #E5E5E5' }}>
                  {cart.map(item => (
                    <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
                          {item.qty}× {item.name}
                        </p>
                        {item.note && <p style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>Note: {item.note}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#22C55E', minWidth: '50px', textAlign: 'right' }}>
                          £{(item.price * item.qty).toFixed(2)}
                        </span>
                        <button onClick={() => updateQty(item.cartId, -1)} style={{ background: '#F3F4F6', border: 'none', color: '#666', width: '24px', height: '24px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                          −
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gap: '10px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #E5E5E5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666' }}>
                    <span>Subtotal</span>
                    <span>£{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666' }}>
                    <span>Delivery</span>
                    <span>£{deliveryFee.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: '#1F2937', marginBottom: '20px' }}>
                  <span>Total</span>
                  <span style={{ color: '#22C55E' }}>£{(cartTotal + deliveryFee).toFixed(2)}</span>
                </div>

                <button
                  onClick={() => { localStorage.setItem('feedme-cart', JSON.stringify({ cart, restaurantId: restaurant.id, restaurantName: restaurant.name })); router.push('/checkout') }}
                  style={{ width: '100%', background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Proceed to checkout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1F2937', display: 'flex', gap: '12px', padding: '12px 16px', zIndex: 100, boxShadow: '0 -2px 8px rgba(0,0,0,0.1)' }}>
        <button
          style={{ flex: 1, background: '#2D3748', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          ☰ Menu
        </button>
        <button
          onClick={() => setShowBasket(true)}
          style={{ flex: 1, background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          🛒 Basket
          {cartCount > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
              £{cartTotal.toFixed(2)}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

function MenuItemCard({ item, setSelectedItem, setItemQty, setItemNote }: { item: any; setSelectedItem: any; setItemQty: any; setItemNote: any }) {
  const [hovering, setHovering] = useState(false)

  return (
    <div
      onClick={() => { setSelectedItem(item); setItemQty(1); setItemNote('') }}
      style={{ 
        background: '#FFFFFF', 
        border: '1px solid #E5E5E5', 
        borderRadius: '8px', 
        padding: '12px',
        display: 'flex',
        gap: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        alignItems: 'flex-start',
        boxShadow: hovering ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.05)',
        borderColor: hovering ? '#22C55E' : '#E5E5E5'
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{ width: '60px', height: '60px', borderRadius: '6px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '2px' }}>
          {item.name}
        </h4>
        {item.description && (
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px', lineHeight: 1.3 }}>
            {item.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#22C55E' }}>
            £{item.price.toFixed(2)}
          </span>
          {item.tags?.slice(0, 1).map((tag: string) => (
            <span key={tag} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', background: tag === 'vegan' ? '#D1FAE5' : tag === 'spicy' ? '#FED7AA' : '#F0F9FF', color: tag === 'vegan' ? '#065F46' : tag === 'spicy' ? '#92400E' : '#0369A1' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); setSelectedItem(item); setItemQty(1); setItemNote('') }}
        style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', width: '36px', height: '36px', borderRadius: '6px', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
      >
        +
      </button>
    </div>
  )
}
