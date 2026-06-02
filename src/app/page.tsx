'use client'

import { useState, useEffect } from 'react'
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
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [cookieAccepted, setCookieAccepted] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setCookieAccepted(!!localStorage.getItem('cookie-accepted'))
    fetchRestaurants()
    setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', () => setIsMobile(window.innerWidth < 768))
  }, [])

  async function fetchRestaurants() {
    setLoading(true)
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false })
    setRestaurants(data || [])
    setLoading(false)
  }

  const filtered = restaurants.filter(r => {
    const matchFilter = filter === 'all' || r.cuisine_type?.toLowerCase().includes(filter)
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine_type?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  function acceptCookies() {
    localStorage.setItem('cookie-accepted', '1')
    setCookieAccepted(true)
  }

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Clean Nav */}
      <nav style={{ borderBottom: '1px solid #E5E5E5', padding: isMobile ? '16px' : '20px', position: 'sticky', top: 0, zIndex: 100, background: '#FFFFFF' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: isMobile ? '20px' : '24px', fontWeight: 800, letterSpacing: '-0.5px', color: '#1F2937' }}>
            feedme.gg
          </div>
          <div onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = 'none')}
            style={{ borderRadius: '8px', transition: 'background 0.2s' }}>
            <Link href="/auth/login" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none', padding: '8px 16px', display: 'block' }}>
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Simple & Clean */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '32px 16px' : '60px 20px 40px', textAlign: 'left' }}>
        <h1 style={{ fontSize: isMobile ? '32px' : '48px', fontWeight: 700, marginBottom: '16px', color: '#1F2937', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
          Order from Guernsey's best restaurants
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '32px', maxWidth: '500px', lineHeight: 1.6 }}>
          Fast delivery, fresh food. Order now and eat in minutes.
        </p>

        {/* Search Bar - Prominent */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', maxWidth: '500px', display: 'flex', alignItems: 'center', transition: 'border-color 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.borderColor = '#22C55E')}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.borderColor = '#E5E5E5')}
        >
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '16px 20px', fontSize: '15px', color: '#1F2937', outline: 'none' }}
          />
          <div style={{ padding: '0 20px', color: '#9CA3AF', fontSize: '18px' }}>🔍</div>
        </div>

        {/* Category Filters - Clean pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? '8px' : '0' }}>
          {CUISINE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? '#22C55E' : '#F3F4F6',
                border: 'none',
                color: filter === f.key ? '#FFFFFF' : '#374151',
                padding: '10px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (filter !== f.key) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (filter !== f.key) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'
                }
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid - Minimal cards */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 16px 40px' : '0 20px 60px' }}>
        <h2 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 600, color: '#1F2937', marginBottom: '24px', letterSpacing: '-0.3px' }}>
          {search ? `Results for "${search}"` : filter !== 'all' ? filter.charAt(0).toUpperCase() + filter.slice(1) + ' restaurants' : `Available now`}
        </h2>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: '#F3F4F6', borderRadius: '12px', height: '200px', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>
              {search ? `No restaurants found for "${search}"` : `No restaurants available`}
            </p>
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filtered.map(r => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Simple */}
      <footer style={{ borderTop: '1px solid #E5E5E5', padding: '40px 20px', textAlign: 'center', background: '#F9FAFB' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>© 2026 feedme.gg</p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '13px' }}>
            <Link href="/terms" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</Link>
            <Link href="/privacy" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/contact" style={{ color: '#6B7280', textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>
      </footer>

      {/* Cookie banner */}
      {!cookieAccepted && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1F2937', color: '#FFFFFF', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', zIndex: 999, flexWrap: 'wrap' }}>
          <p style={{ fontSize: '13px' }}>
            We use cookies to improve your experience.{' '}
            <Link href="/privacy" style={{ color: '#22C55E', textDecoration: 'none', fontWeight: 600 }}>Learn more</Link>
          </p>
          <button
            onClick={acceptCookies}
            style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Accept
          </button>
        </div>
      )}
    </div>
  )
}

function RestaurantCard({ restaurant: r }: { restaurant: any }) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget as HTMLDivElement
    el.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)'
    el.style.transform = 'translateY(-2px)'
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget as HTMLDivElement
    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
    el.style.transform = 'translateY(0)'
  }

  return (
    <Link href={`/restaurant/${r.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{ 
        background: '#FFFFFF', 
        border: '1px solid #E5E5E5', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        cursor: 'pointer', 
        transition: 'all 0.2s',
        height: '100%'
      }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Restaurant header with emoji background */}
        <div style={{ height: '140px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', position: 'relative' }}>
          {r.emoji || '🍽️'}
          {r.is_open && (
            <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: '#22C55E', color: '#FFFFFF' }}>
              Open
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', marginBottom: '4px', letterSpacing: '-0.3px' }}>
            {r.name}
          </h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
            {r.cuisine_type}
          </p>
          
          {/* Meta info */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280' }}>
            <div>⏱ {r.delivery_time_mins || 25} mins</div>
            <div>★ {r.rating || '4.5'}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}
