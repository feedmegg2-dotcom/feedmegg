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
  const [menu, setMenu] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [itemNote, setItemNote] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [showBasket, setShowBasket] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    setTheme(savedTheme || 'dark')
    fetchRestaurant()
  }, [slug])

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

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

    const { data: items } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', rest.id)
      .eq('is_active', true)
      .order('category')

    setMenu(items || [])
    setLoading(false)
  }

  function addToCart(item: any) {
    const existing = cart.find(c => c.id === item.id && c.note === itemNote)
    if (existing) {
      setCart(cart.map(c => 
        c.id === item.id && c.note === itemNote 
          ? { ...c, qty: c.qty + itemQty } 
          : c
      ))
    } else {
      setCart([...cart, { ...item, qty: itemQty, note: itemNote, cartId: Date.now() }])
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

  const isDark = theme === 'dark'
  const bgColor = isDark ? '#1F2937' : '#FFFFFF'
  const textColor = isDark ? '#FFFFFF' : '#1F2937'
  const secondaryText = isDark ? '#D1D5DB' : '#6B7280'
  const borderColor = isDark ? '#374151' : '#E5E5E5'
  const cardBg = isDark ? '#111827' : '#FFFFFF'
  const inputBg = isDark ? '#2D3748' : '#FFFFFF'

  const cartTotal = cart.reduce((s, i) => s + (i.price * i.qty), 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const deliveryFee = 2.99

  if (!restaurant) return <div style={{background:bgColor,minHeight:'100vh',color:textColor}}>Loading...</div>

  const groupedMenu: Record<string, any[]> = menu.reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div style={{background:bgColor,minHeight:'100vh',color:textColor,transition:'all 0.3s',position:'relative',overflow:'hidden'}}>
      <style>{`@keyframes f{0%,100%{transform:translateY(0)rotate(0)}50%{transform:translateY(-30px)rotate(5deg)}}`}</style>
      <div style={{position:'fixed',top:'-100px',right:'-100px',fontSize:'180px',opacity:isDark?0.08:0.06,zIndex:0,pointerEvents:'none',animation:'f 8s ease-in-out infinite',color:isDark?'#fff':'#1F2937'}}>🍕🍔🍜🍱🍛</div>
      <div style={{position:'fixed',bottom:'-80px',left:'-80px',fontSize:'150px',opacity:isDark?0.05:0.04,zIndex:0,pointerEvents:'none',animation:'f 10s ease-in-out infinite',color:isDark?'#fff':'#1F2937'}}>🍝🌮🥗🍖</div>

      {/* Navigation */}
      <nav style={{borderBottom:`1px solid ${borderColor}`,padding:'16px 20px',position:'sticky',top:0,zIndex:101,background:bgColor}}>
        <div style={{maxWidth:'1200px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <Link href="/" style={{fontFamily:'Syne',fontSize:'20px',fontWeight:800,color:'#22C55E',textDecoration:'none'}}>feedme.gg</Link>
          <button onClick={()=>setTheme(isDark?'light':'dark')} style={{background:isDark?'#374151':'#F3F4F6',border:`1px solid ${borderColor}`,color:textColor,padding:'8px 12px',borderRadius:'8px',fontSize:'16px',cursor:'pointer'}}>{isDark?'☀️':'🌙'}</button>
        </div>
      </nav>

      {/* Header */}
      <div style={{background:isDark?'#111827':'#F9FAFB',padding:'40px 20px',borderBottom:`1px solid ${borderColor}`,position:'relative',zIndex:2}}>
        <div style={{maxWidth:'1200px',margin:'0 auto',display:'flex',gap:'20px',alignItems:'center'}}>
          <div style={{fontSize:'60px'}}>{restaurant.emoji}</div>
          <div>
            <h1 style={{fontSize:'32px',fontWeight:700,color:textColor,marginBottom:'8px'}}>{restaurant.name}</h1>
            <p style={{fontSize:'14px',color:secondaryText,marginBottom:'8px'}}>{restaurant.cuisine_type}</p>
            <div style={{display:'flex',gap:'16px',fontSize:'13px',color:secondaryText}}>
              <span>⏱ {restaurant.delivery_time_mins} mins</span>
              <span>★ {restaurant.rating||'4.5'}</span>
              <span style={{padding:'2px 8px',borderRadius:'3px',background:restaurant.is_open?'#D1FAE5':'#FEE2E2',color:restaurant.is_open?'#065F46':'#991B1B',fontWeight:600}}>{restaurant.is_open?'Open':'Closed'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div style={{padding:'40px 20px',position:'relative',zIndex:2}}>
        <div style={{maxWidth:'1200px',margin:'0 auto'}}>
          {loading ? (
            <div>Loading menu...</div>
          ) : (
            Object.entries(groupedMenu).map(([category, items]) => (
              <div key={category} style={{marginBottom:'40px'}}>
                <h2 style={{fontSize:'22px',fontWeight:700,color:textColor,marginBottom:'20px',paddingBottom:'12px',borderBottom:`1px solid ${borderColor}`}}>{category}</h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'16px'}}>
                  {(items as any[]).map((item: any) => (
                    <div key={item.id} style={{background:cardBg,border:`1px solid ${borderColor}`,borderRadius:'8px',padding:'16px',cursor:'pointer',transition:'all 0.2s'}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 16px rgba(0,0,0,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}} onClick={()=>setSelectedItem(item)}>
                      <h3 style={{fontSize:'16px',fontWeight:700,color:textColor,marginBottom:'4px'}}>{item.name}</h3>
                      <p style={{fontSize:'13px',color:secondaryText,marginBottom:'12px',minHeight:'32px'}}>{item.description}</p>
                      <div style={{fontSize:'18px',fontWeight:700,color:'#22C55E'}}>£{item.price?.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Item Modal */}
      {selectedItem && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={()=>setSelectedItem(null)}>
          <div style={{width:'100%',background:cardBg,borderRadius:'16px 16px 0 0',padding:'24px',maxHeight:'80vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:'24px',fontWeight:700,color:textColor,marginBottom:'8px'}}>{selectedItem.name}</h2>
            <p style={{fontSize:'14px',color:secondaryText,marginBottom:'24px'}}>{selectedItem.description}</p>
            <div style={{fontSize:'20px',fontWeight:700,color:'#22C55E',marginBottom:'24px'}}>£{selectedItem.price?.toFixed(2)}</div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',color:textColor,fontSize:'14px',fontWeight:600,marginBottom:'8px'}}>Special Instructions</label>
              <textarea value={itemNote} onChange={e=>setItemNote(e.target.value)} placeholder="e.g. No onions" style={{width:'100%',padding:'12px',borderRadius:'8px',border:`1px solid ${borderColor}`,background:inputBg,color:textColor,fontSize:'14px',outline:'none',minHeight:'80px',fontFamily:'inherit'}} />
            </div>
            <div style={{display:'flex',gap:'12px',marginBottom:'24px'}}>
              <button onClick={()=>setItemQty(Math.max(1,itemQty-1))} style={{background:borderColor,color:textColor,border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>−</button>
              <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:700}}>{itemQty}</div>
              <button onClick={()=>setItemQty(itemQty+1)} style={{background:borderColor,color:textColor,border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>+</button>
            </div>
            <button onClick={()=>addToCart(selectedItem)} style={{width:'100%',padding:'14px',background:'#22C55E',color:'#fff',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:700,cursor:'pointer'}}>Add to Basket - £{(selectedItem.price*itemQty)?.toFixed(2)}</button>
          </div>
        </div>
      )}

      {/* Basket Button */}
      {cartCount > 0 && (
        <button onClick={()=>setShowBasket(true)} style={{position:'fixed',bottom:'20px',right:'20px',background:'#22C55E',color:'#fff',border:'none',borderRadius:'50%',width:'60px',height:'60px',fontSize:'24px',fontWeight:700,cursor:'pointer',zIndex:102,boxShadow:'0 4px 12px rgba(34,197,94,0.3)'}}>
          {cartCount}
        </button>
      )}

      {/* Basket Modal */}
      {showBasket && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowBasket(false)}>
          <div style={{width:'100%',background:cardBg,borderRadius:'16px 16px 0 0',padding:'24px',maxHeight:'80vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:'24px',fontWeight:700,color:textColor,marginBottom:'24px'}}>Your Basket</h2>
            {cart.length === 0 ? (
              <p style={{color:secondaryText}}>Empty basket</p>
            ) : (
              <>
                {cart.map(item=>(
                  <div key={item.cartId} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px',borderBottom:`1px solid ${borderColor}`,marginBottom:'12px'}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:textColor}}>{item.name}</div>
                      {item.note && <div style={{fontSize:'12px',color:secondaryText}}>{item.note}</div>}
                    </div>
                    <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      <button onClick={()=>updateQty(item.cartId,-1)} style={{background:borderColor,color:textColor,border:'none',width:'32px',height:'32px',borderRadius:'6px',cursor:'pointer'}}>−</button>
                      <span style={{width:'24px',textAlign:'center',fontWeight:700}}>{item.qty}</span>
                      <button onClick={()=>updateQty(item.cartId,1)} style={{background:borderColor,color:textColor,border:'none',width:'32px',height:'32px',borderRadius:'6px',cursor:'pointer'}}>+</button>
                      <div style={{fontWeight:700,width:'60px',textAlign:'right'}}>£{(item.price*item.qty)?.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                <div style={{marginTop:'24px',paddingTop:'16px',borderTop:`1px solid ${borderColor}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px',color:secondaryText}}>
                    <span>Subtotal:</span>
                    <span>£{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px',color:secondaryText}}>
                    <span>Delivery:</span>
                    <span>£{deliveryFee.toFixed(2)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'18px',fontWeight:700,color:textColor,marginBottom:'24px'}}>
                    <span>Total:</span>
                    <span>£{(cartTotal+deliveryFee).toFixed(2)}</span>
                  </div>
                  <button style={{width:'100%',padding:'14px',background:'#22C55E',color:'#fff',border:'none',borderRadius:'8px',fontWeight:700,cursor:'pointer',fontSize:'16px'}}>Proceed to Checkout</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
