'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const CUISINE_FILTERS = [
  { value: 'all', label: 'All Cuisines' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'burger', label: 'Burgers' },
  { value: 'sushi', label: 'Sushi' },
  { value: 'indian', label: 'Indian' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'fried-chicken', label: 'Fried Chicken' },
  { value: 'kebab', label: 'Kebab' },
]

export default function HomePage() {
  const supabase = createClient()
  const [allRestaurants, setAllRestaurants] = useState<any[]>([])
  const [popularRestaurants, setPopularRestaurants] = useState<any[]>([])
  const [selectedCuisine, setSelectedCuisine] = useState('all')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [cookieAccepted, setCookieAccepted] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    setTheme(savedTheme || 'light')
    setCookieAccepted(!!localStorage.getItem('cookie-accepted'))
    fetchRestaurants()
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  async function fetchRestaurants() {
    setLoading(true)
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false })
    
    const restaurants = data || []
    setAllRestaurants(restaurants)
    
    // Get 5 random restaurants for popular section
    const shuffled = [...restaurants].sort(() => 0.5 - Math.random())
    setPopularRestaurants(shuffled.slice(0, 5))
    
    setLoading(false)
  }

  function acceptCookies() {
    localStorage.setItem('cookie-accepted', '1')
    setCookieAccepted(true)
  }

  const getFilteredRestaurants = () => {
    if (selectedCuisine === 'all') return allRestaurants
    return allRestaurants.filter(r => r.cuisine_type?.toLowerCase().includes(selectedCuisine))
  }

  const isDark = theme === 'dark'
  const bgColor = isDark ? '#1F2937' : '#FFFFFF'
  const textColor = isDark ? '#FFFFFF' : '#1F2937'
  const secondaryText = isDark ? '#D1D5DB' : '#6B7280'
  const borderColor = isDark ? '#374151' : '#E5E5E5'
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
                background: isDark ? '#374151' : '#F3F4F6', 
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

      {/* Hero Section */}
      <div style={{ background: '#22C55E', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', marginBottom: '32px', letterSpacing: '-0.5px' }}>
            Delivery Online in Guernsey
          </h1>
          
          <div style={{ background: '#22C55E', padding: '20px', borderRadius: '8px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
              {/* Cuisine Dropdown */}
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', color: '#FFFFFF', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                  Select what food you would like to eat
                </label>
                <select
                  value={selectedCuisine}
                  onChange={e => setSelectedCuisine(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#FFFFFF',
                    color: '#1F2937',
                    fontWeight: 500
                  }}
                >
                  {CUISINE_FILTERS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Location Dropdown */}
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', color: '#FFFFFF', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                  Where are you?
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#FFFFFF',
                    color: '#1F2937',
                    fontWeight: 500
                  }}
                >
                  <option>I'll choose later</option>
                  <option>St Peter Port</option>
                  <option>St Sampson</option>
                  <option>Guernsey (All)</option>
                </select>
              </div>

              {/* Button */}
              <Link href="#all-takeaways" style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    background: '#1F2937',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#111827')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#1F2937')}
                >
                  All Takeaways
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Most Popular Takeaways */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: textColor, marginBottom: '24px' }}>
          Most Popular Takeaways
        </h2>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ background: cardBg, borderRadius: '12px', height: '200px', border: `1px solid ${borderColor}` }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {popularRestaurants.map(r => (
              <RestaurantCard key={r.id} restaurant={r} isDark={isDark} cardBg={cardBg} borderColor={borderColor} textColor={textColor} secondaryText={secondaryText} />
            ))}
          </div>
        )}
      </div>

      {/* All Takeaways Section */}
      <div id="all-takeaways" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: textColor, marginBottom: '24px' }}>
          {selectedCuisine !== 'all' ? `${CUISINE_FILTERS.find(f => f.value === selectedCuisine)?.label || 'All'} Takeaways` : 'All Takeaways'}
        </h2>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: cardBg, borderRadius: '12px', height: '200px', border: `1px solid ${borderColor}` }} />
            ))}
          </div>
        ) : getFilteredRestaurants().length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: secondaryText }}>
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>No restaurants found for this cuisine</p>
            <button
              onClick={() => setSelectedCuisine('all')}
              style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              View All
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {getFilteredRestaurants().map(r => (
              <RestaurantCard key={r.id} restaurant={r} isDark={isDark} cardBg={cardBg} borderColor={borderColor} textColor={textColor} secondaryText={secondaryText} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${borderColor}`, padding: '32px 20px', textAlign: 'center', background: isDark ? '#111827' : '#F9FAFB' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', color: secondaryText, marginBottom: '16px' }}>© 2026 feedme.gg</p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '13px' }}>
            <Link href="/terms" style={{ color: secondaryText, textDecoration: 'none' }}>Terms</Link>
            <Link href="/privacy" style={{ color: secondaryText, textDecoration: 'none' }}>Privacy</Link>
            <Link href="/contact" style={{ color: secondaryText, textDecoration: 'none' }}>Contact</Link>
          </div>
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
  const { restaurant: r, isDark, cardBg, borderColor, textColor, secondaryText } = props
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
        <div style={{ height: '120px', background: isDark ? '#2D3748' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', position: 'relative' }}>
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

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768
}
