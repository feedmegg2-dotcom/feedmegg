'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const CUISINE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pizza', label: 'Pizza' },
  { key: 'burger', label: 'Burgers' },
  { key: 'sushi', label: 'Sushi' },
  { key: 'indian', label: 'Indian' },
  { key: 'chinese', label: 'Chinese' },
  { key: 'mexican', label: 'Mexican' },
  { key: 'healthy', label: 'Healthy' },
]

export default function HomePage() {
  const supabase = createClient()
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [cookieAccepted, setCookieAccepted] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    setTheme(savedTheme || 'light')
    setCookieAccepted(!!localStorage.getItem('cookie-accepted'))
    fetchData()
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchData() {
    setLoading(true)
    
    const { data: rests } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false })
    setRestaurants(rests || [])

    const { data: items } = await supabase
      .from('menu_items')
      .select('*, menu_categories(restaurant_id, restaurant:restaurants(id, name, slug, emoji, cuisine_type))')
      .eq('is_available', true)
    setMenuItems(items || [])
    
    setLoading(false)
  }

  function acceptCookies() {
    localStorage.setItem('cookie-accepted', '1')
    setCookieAccepted(true)
  }

  // Get suggestions as you type
  const getSuggestions = () => {
    if (!search.trim()) return []

    const searchLower = search.toLowerCase()
    const suggestions: any[] = []

    // Find matching menu items
    menuItems.slice(0, 5).forEach(item => {
      if (item.name.toLowerCase().includes(searchLower) || (item.description && item.description.toLowerCase().includes(searchLower))) {
        const cat = item.menu_categories as any
        const restName = cat?.restaurant?.name
        suggestions.push({
          type: 'item',
          name: item.name,
          restaurant: restName,
          description: item.description,
          emoji: cat?.restaurant?.emoji || '🍽️'
        })
      }
    })

    // Find matching restaurants
    restaurants.slice(0, 3).forEach(r => {
      if (r.name.toLowerCase().includes(searchLower)) {
        suggestions.push({
          type: 'restaurant',
          name: r.name,
          cuisine: r.cuisine_type,
          emoji: r.emoji
        })
      }
    })

    return suggestions.slice(0, 8)
  }

  // Search through menu items
  const getSearchResults = () => {
    if (!search.trim()) {
      return restaurants.filter(r => {
        const matchFilter = filter === 'all' || r.cuisine_type?.toLowerCase().includes(filter)
        return matchFilter
      })
    }

    const searchLower = search.toLowerCase()
    const matchingItems = menuItems.filter(item => 
      item.name.toLowerCase().includes(searchLower) || 
      (item.description && item.description.toLowerCase().includes(searchLower))
    )

    const restaurantIds = new Set(
      matchingItems.map(item => {
        const cat = item.menu_categories as any
        return cat?.restaurant_id
      }).filter(Boolean)
    )

    const results = restaurants.filter(r => {
      const matchFilter = filter === 'all' || r.cuisine_type?.toLowerCase().includes(filter)
      const matchSearch = restaurantIds.has(r.id)
      return matchFilter && matchSearch
    })

    return results
  }

  const suggestions = getSuggestions()
  const displayResults = getSearchResults()

  const isDark = theme === 'dark'
  const bgColor = isDark ? '#1F2937' : '#FFFFFF'
  const textColor = isDark ? '#FFFFFF' : '#1F2937'
  const secondaryText = isDark ? '#D1D5DB' : '#6B7280'
  const borderColor = isDark ? '#374151' : '#E5E5E5'
  const inputBg = isDark ? '#374151' : '#F3F4F6'
  const hoverBg = isDark ? '#2D3748' : '#F3F4F6'
  const cardBg = isDark ? '#111827' : '#FFFFFF'

  return (
    <div style={{ background: bgColor, minHeight: '100vh', color: textColor, transition: 'all 0.3s' }}>
      {/* Navigation */}
      <nav style={{ borderBottom: `1px solid ${borderColor}`, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, background: bgColor }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#22C55E' }}>
            feedme.gg
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              style={{ 
                background: inputBg, 
                border: `1px solid ${borderColor}`, 
                color: textColor,
                padding: '8px 12px', 
                borderRadius: '8px', 
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <Link href="/auth/login" style={{ fontSize: '14px', color: secondaryText, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px' }}>
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 30px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '12px', color: textColor, lineHeight: 1.2 }}>
          Order from Guernsey's best restaurants
        </h1>
        <p style={{ fontSize: '16px', color: secondaryText, marginBottom: '24px', maxWidth: '500px', lineHeight: 1.6 }}>
          Fast delivery, fresh food. Order now and eat in minutes.
        </p>

        {/* Search with Suggestions */}
        <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '500px' }}>
          <div style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Type what food would you like..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              style={{ flex: 1, background: 'none', border: 'none', padding: '14px 16px', fontSize: '14px', color: textColor, outline: 'none' }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('')
                  setShowSuggestions(false)
                }}
                style={{ background: 'none', border: 'none', color: secondaryText, fontSize: '16px', cursor: 'pointer', padding: '8px 12px' }}
              >
                ✕
              </button>
            )}
            <div style={{ padding: '0 16px', color: secondaryText }}>🔍</div>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: cardBg, border: `1px solid ${borderColor}`, borderTop: 'none', borderRadius: '0 0 12px 12px', marginTop: '-1px', boxShadow: isDark ? '0 8px 20px rgba(0,0,0,0.3)' : '0 8px 20px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '400px', overflowY: 'auto' }}>
              {suggestions.map((sugg, idx) => {
                const restName = sugg.type === 'restaurant' ? sugg.name : sugg.restaurant
                const foundRest = restaurants.find(r => r.name === restName)
                const restaurantSlug = foundRest?.slug || restName?.toLowerCase().replace(/\s+/g, '-')
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      window.location.href = `/restaurant/${restaurantSlug}`
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: idx < suggestions.length - 1 ? `1px solid ${borderColor}` : 'none',
                      borderTop: 'none',
                      color: textColor,
                      padding: '12px 16px', 
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '18px' }}>{sugg.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: textColor }}>
                        {sugg.name}
                      </div>
                      <div style={{ fontSize: '11px', color: secondaryText }}>
                        {sugg.type === 'item' ? `at ${sugg.restaurant}` : sugg.cuisine}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Filter Dropdown & View All */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              background: inputBg,
              border: `1px solid ${borderColor}`,
              color: textColor,
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {CUISINE_FILTERS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>

          <button
            onClick={() => { setSearch(''); setFilter('all'); }}
            style={{
              background: '#22C55E',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1ea853')}
            onMouseLeave={e => (e.currentTarget.style.background = '#22C55E')}
          >
            View All Menus
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '20px' }}>
          {search ? `Restaurants serving "${search}"` : filter !== 'all' ? filter.charAt(0).toUpperCase() + filter.slice(1) + ' restaurants' : 'All restaurants'}
        </h2>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: cardBg, borderRadius: '12px', height: '200px', border: `1px solid ${borderColor}` }} />
            ))}
          </div>
        ) : displayResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: secondaryText }}>
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>
              {search ? `No restaurants serving "${search}"` : 'No restaurants found'}
            </p>
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {displayResults.map(r => (
              <RestaurantCard key={r.id} restaurant={r} isDark={isDark} cardBg={cardBg} borderColor={borderColor} hoverBg={hoverBg} textColor={textColor} secondaryText={secondaryText} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${borderColor}`, padding: '32px 20px', textAlign: 'center', background: hoverBg }}>
        <p style={{ fontSize: '13px', color: secondaryText, marginBottom: '16px' }}>© 2026 feedme.gg</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '13px' }}>
          <Link href="/terms" style={{ color: secondaryText, textDecoration: 'none' }}>Terms</Link>
          <Link href="/privacy" style={{ color: secondaryText, textDecoration: 'none' }}>Privacy</Link>
          <Link href="/contact" style={{ color: secondaryText, textDecoration: 'none' }}>Contact</Link>
        </div>
      </footer>

      {/* Cookie Banner */}
      {!cookieAccepted && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1F2937', color: '#FFFFFF', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', zIndex: 999, borderTop: '1px solid #22C55E' }}>
          <p style={{ fontSize: '13px' }}>
            We use cookies.{' '}
            <Link href="/privacy" style={{ color: '#22C55E', textDecoration: 'none', fontWeight: 600 }}>Learn more</Link>
          </p>
          <button
            onClick={acceptCookies}
            style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Accept
          </button>
        </div>
      )}
    </div>
  )
}

function RestaurantCard(props: any) {
  const { restaurant: r, isDark, cardBg, borderColor, hoverBg, textColor, secondaryText } = props
  const [hovering, setHovering] = useState(false)
  const slug = r.slug || r.name?.toLowerCase().replace(/\s+/g, '-')

  return (
    <Link href={`/restaurant/${slug}`} style={{ textDecoration: 'none' }}>
      <div
        style={{ 
          background: cardBg, 
          border: `1px solid ${borderColor}`, 
          borderRadius: '12px', 
          overflow: 'hidden', 
          cursor: 'pointer', 
          transition: 'all 0.2s',
          height: '100%',
          boxShadow: hovering ? (isDark ? '0 8px 20px rgba(34,197,94,0.15)' : '0 10px 25px rgba(0,0,0,0.08)') : '0 1px 3px rgba(0,0,0,0.06)',
          transform: hovering ? 'translateY(-2px)' : 'translateY(0)'
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div style={{ height: '120px', background: hoverBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', position: 'relative' }}>
          {r.emoji}
          {r.is_open && (
            <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: '#22C55E', color: '#FFFFFF' }}>
              Open
            </span>
          )}
        </div>

        <div style={{ padding: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: textColor, marginBottom: '4px' }}>
            {r.name}
          </h3>
          <p style={{ fontSize: '12px', color: secondaryText, marginBottom: '10px' }}>
            {r.cuisine_type}
          </p>
          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: secondaryText }}>
            <div>⏱ {r.delivery_time_mins} min</div>
            <div>★ {r.rating}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}
