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
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [cookieAccepted, setCookieAccepted] = useState(true)

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

  const colors = theme === 'dark' ? {
    bg: '#1F2937',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
    border: '#374151',
    bgCard: '#111827',
    bgHover: '#2D3748',
    bgInput: '#374151'
  } : {
    bg: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E5E5',
    bgCard: '#FFFFFF',
    bgHover: '#F3F4F6',
    bgInput: '#F3F4F6'
  }

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.text, transition: 'all 0.3s' }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${colors.border}`, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, background: colors.bg }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#22C55E' }}>
            feedme.gg
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              style={{ 
                background: colors.bgInput, 
                border: `1px solid ${colors.border}`, 
                color: colors.text,
                padding: '8px 12px', 
                borderRadius: '8px', 
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <Link href="/auth/login" style={{ fontSize: '14px', color: colors.textSecondary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', transition: 'background 0.2s' }}>
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 30px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '12px', color: colors.text, lineHeight: 1.2, letterSpacing: '-0.5px' }}>
          Order from Guernsey's best restaurants
        </h1>
        <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '24px', maxWidth: '500px', lineHeight: 1.6 }}>
          Fast delivery, fresh food. Order now and eat in minutes.
        </p>

        {/* Search Bar */}
        <div style={{ background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', maxWidth: '500px', display: 'flex', alignItems: 'center', transition: 'border-color 0.2s', boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '14px 16px', fontSize: '14px', color: colors.text, outline: 'none' }}
          />
          <div style={{ padding: '0 16px', color: colors.textSecondary, fontSize: '16px' }}>🔍</div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '8px' }}>
          {CUISINE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? '#22C55E' : colors.bgInput,
                border: `1px solid ${colors.border}`,
                color: filter === f.key ? '#FFFFFF' : colors.text,
                padding: '10px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '20px', letterSpacing: '-0.3px' }}>
          {search ? `Results for "${search}"` : filter !== 'all' ? filter.charAt(0).toUpperCase() + filter.slice(1) + ' restaurants' : `Available now`}
        </h2>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', height: '200px', animation: 'pulse 1.5s infinite', border: `1px solid ${colors.border}` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textSecondary }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map(r => (
              <RestaurantCard key={r.id} restaurant={r} colors={colors} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: '32px 20px', textAlign: 'center', background: colors.bgHover }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '16px' }}>© 2026 feedme.gg</p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '13px' }}>
            <Link href="/terms" style={{ color: colors.textSecondary, textDecoration: 'none' }}>Terms</Link>
            <Link href="/privacy" style={{ color: colors.textSecondary, textDecoration: 'none' }}>Privacy</Link>
            <Link href="/contact" style={{ color: colors.textSecondary, textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>
      </footer>

      {/* Cookie banner */}
      {!cookieAccepted && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: theme === 'dark' ? '#111827' : '#1F2937', color: '#FFFFFF', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', zIndex: 999, flexWrap: 'wrap', borderTop: '1px solid #22C55E' }}>
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

function RestaurantCard({ restaurant: r, colors }: { restaurant: any; colors: any }) {
  const [hovering, setHovering] = useState(false)

  return (
    <Link href={`/restaurant/${r.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{ 
        background: colors.bgCard, 
        border: `1px solid ${colors.border}`, 
        borderRadius: '12px', 
        overflow: 'hidden', 
        cursor: 'pointer', 
        transition: 'all 0.2s',
        height: '100%',
        boxShadow: hovering ? (colors.bg === '#1F2937' ? '0 8px 20px rgba(34,197,94,0.15)' : '0 10px 25px rgba(0,0,0,0.08)') : '0 1px 3px rgba(0,0,0,0.06)',
        transform: hovering ? 'translateY(-2px)' : 'translateY(0)'
      }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Restaurant header */}
        <div style={{ height: '120px', background: colors.bgHover, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', position: 'relative' }}>
          {r.emoji || '🍽️'}
          {r.is_open && (
            <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: '#22C55E', color: '#FFFFFF' }}>
              Open
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: colors.text, marginBottom: '4px', letterSpacing: '-0.3px' }}>
            {r.name}
          </h3>
          <p style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '10px' }}>
            {r.cuisine_type}
          </p>
          
          {/* Meta info */}
          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: colors.textSecondary' }}>
            <div>⏱ {r.delivery_time_mins || 25} min</div>
            <div>★ {r.rating || '4.5'}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}
