
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

  useEffect(() => { fetchRestaurant() }, [slug])

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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--sub)' }}>
      Loading menu...
    </div>
  )

  if (!restaurant) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 800, letterSpacing: '-1px', textDecoration: 'none' }}>
          <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
        </Link>
        {cartCount > 0 && (
          <button
            onClick={() => router.push('/checkout')}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            🛒 {cartCount} item{cartCount !== 1 ? 's' : ''} · £{cartTotal.toFixed(2)}
          </button>
        )}
      </nav>

      {/* Restaurant banner */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 20px 0' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: '14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          ← Back
        </button>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '56px' }}>{restaurant.emoji}</div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{restaurant.name}</h1>
            <div style={{ fontSize: '13px', color: 'var(--sub)' }}>
              {restaurant.cuisine_type} · {restaurant.delivery_time_mins}-{restaurant.delivery_time_mins + 10} min · £{restaurant.min_order?.toFixed(2)} min order
            </div>
            {restaurant.description && (
              <div style={{ fontSize: '12px', color: 'var(--sub)', marginTop: '6px' }}>{restaurant.description}</div>
            )}
          </div>
        </div>

        {/* Allergen warning */}
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>ⓘ</span>
          <p style={{ fontSize: '11px', color: '#fca5a5', lineHeight: 1.5 }}>
            Allergen info is AI-assisted and a guide only. Please contact the restaurant directly to verify allergens before ordering.
          </p>
        </div>

        {/* Menu layout */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Menu */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {categories.map(cat => (
              <div key={cat.id}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  {cat.name}
                </div>
                {cat.menu_items?.filter((i: any) => i.is_available).map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedItem(item); setItemQty(1); setItemNote('') }}
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>{item.emoji}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>{item.name}</div>
                      {item.description && <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px', lineHeight: 1.4 }}>{item.description}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--orange)' }}>£{item.price.toFixed(2)}</span>
                        {item.calories && <span style={{ fontSize: '11px', color: 'var(--sub)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>~{item.calories} kcal</span>}
                        {item.tags?.map((tag: string) => (
                          <span key={tag} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: tag === 'veg' || tag === 'vegan' ? 'rgba(34,197,94,0.15)' : tag === 'spicy' ? 'rgba(249,115,22,0.15)' : 'rgba(234,179,8,0.15)', color: tag === 'veg' || tag === 'vegan' ? 'var(--green)' : tag === 'spicy' ? 'var(--orange)' : '#EAB308' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); addToCart(item, '', 1) }}
                      style={{ background: 'var(--green)', color: '#0F172A', border: 'none', width: '34px', height: '34px', borderRadius: '8px', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                    >+</button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Cart sidebar */}
          <div style={{ width: '260px', flexShrink: 0 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', position: 'sticky', top: '74px' }}>
              <div style={{ fontFamily: 'Syne', fontSize: '15px', fontWeight: 700, marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>Your Order</div>
              {cart.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--sub)', textAlign: 'center', padding: '20px 0' }}>Add items to get started</div>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text)', flex: 1 }}>{item.qty}× {item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>£{(item.price * item.qty).toFixed(2)}</span>
                        <button onClick={() => updateQty(item.cartId, -1)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--sub)', width: '18px', height: '18px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>−</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, padding: '10px 0 8px', color: 'var(--text)' }}>
                    <span>Total</span><span style={{ color: 'var(--green)' }}>£{(cartTotal + 2.99).toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => { localStorage.setItem('feedme-cart', JSON.stringify({ cart, restaurantId: restaurant.id, restaurantName: restaurant.name })); router.push('/checkout') }}
                    className="btn-primary"
                    style={{ width: '100%', padding: '11px' }}
                  >
                    Checkout →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Item modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedItem(null) }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }} className="animate-bounce-in">
            <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <div style={{ fontSize: '56px', textAlign: 'center', marginBottom: '12px' }}>{selectedItem.emoji}</div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', marginBottom: '6px' }}>{selectedItem.name}</h3>
            {selectedItem.description && <p style={{ fontSize: '13px', color: 'var(--sub)', textAlign: 'center', marginBottom: '12px', lineHeight: 1.5 }}>{selectedItem.description}</p>}
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)', textAlign: 'center', marginBottom: '20px' }}>£{selectedItem.price.toFixed(2)}</div>

            {selectedItem.allergens?.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '11px', color: '#fca5a5' }}>
                ⓘ AI-detected allergens (guide only): {selectedItem.allergens.join(', ')}. Contact restaurant to verify.
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label>Special instructions (optional)</label>
              <textarea
                value={itemNote}
                onChange={e => setItemNote(e.target.value)}
                placeholder="e.g. no onions, extra sauce, well done..."
                rows={2}
                className="input"
                style={{ resize: 'none', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
              <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', width: '36px', height: '36px', borderRadius: '8px', fontSize: '20px', cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: '20px', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>{itemQty}</span>
              <button onClick={() => setItemQty(itemQty + 1)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', width: '36px', height: '36px', borderRadius: '8px', fontSize: '20px', cursor: 'pointer' }}>+</button>
            </div>

            <button onClick={() => addToCart(selectedItem, itemNote, itemQty)} className="btn-primary" style={{ width: '100%', padding: '15px' }}>
              Add to order — £{(selectedItem.price * itemQty).toFixed(2)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
