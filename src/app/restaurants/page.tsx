'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RestaurantsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [allRestaurants, setAllRestaurants] = useState<any[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([])
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get('cuisine') || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    setTheme(savedTheme || 'dark')
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
    
    setAllRestaurants(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let filtered = allRestaurants

    if (selectedCuisine !== 'all') {
      filtered = filtered.filter(r => r.cuisine_type?.toLowerCase().includes(selectedCuisine))
    }

    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cuisine_type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredRestaurants(filtered)
  }, [allRestaurants, selectedCuisine, searchQuery])

  const isDark = theme === 'dark'
  const bgColor = isDark ? '#1F2937' : '#FFFFFF'
  const textColor = isDark ? '#FFFFFF' : '#1F2937'
  const secondaryText = isDark ? '#D1D5DB' : '#6B7280'
  const borderColor = isDark ? '#374151' : '#E5E5E5'
  const cardBg = isDark ? '#111827' : '#FFFFFF'
  const inputBg = isDark ? '#2D3748' : '#FFFFFF'

  return (
    <div style={{ background: bgColor, minHeight: '100vh', color: textColor, transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}>
      {/* Food Background - Works in both light and dark */}
      <div style={{
        position: 'fixed',
        top: '-100px',
        right: '-100px',
        fontSize: '180px',
        opacity: isDark ? 0.08 : 0.06,
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'float 8s ease-in-out infinite',
        color: isDark ? '#FFFFFF' : '#1F2937'
      }}>
        🍕 🍔 🍜 🍱 🍛
      </div>
      <div style={{
        position: 'fixed',
        bottom: '-80px',
        left: '-80px',
        fontSize: '150px',
        opacity: isDark ? 0.05 : 0.04,
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'float 10s ease-in-out infinite',
        color: isDark ? '#FFFFFF' : '#1F2937'
      }}>
        🍝 🌮 🥗 🍖
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
      `}</style>

      {/* Navigation */}
      <nav style={{ borderBottom: `1px solid ${borderColor}`, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 101, background: bgColor }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#22C55E', textDecoration: 'none' }}>
            feedme.gg
          </Link>
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
                cursor: 'pointer'
              }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => router.back()}
              style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              ← Back
            </button>
          </div>
        </div>
      </nav>

      {/* Filter Section */}
      <div style={{ background: bgColor, padding: '30px 20px', borderBottom: `1px solid ${borderColor}`, position: 'relative', zIndex: 2 }}>

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: textColor, marginBottom: '24px' }}>
            All Restaurants
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Search */}
            <div style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: textColor, fontSize: '14px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: secondaryText, cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Cuisine Filter */}
            <select
              value={selectedCuisine}
              onChange={e => setSelectedCuisine(e.target.value)}
              style={{
                background: inputBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '12px 16px',
                color: textColor,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px'
              }}
            >
              {CUISINE_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Clear Button */}
            {(searchQuery || selectedCuisine !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCuisine('all'); }}
                style={{
                  background: '#374151',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Restaurants Grid */}
      <div style={{ padding: '40px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} style={{ background: cardBg, borderRadius: '8px', height: '150px', border: `1px solid ${borderColor}` }} />
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: secondaryText }}>
              <p style={{ fontSize: '16px', marginBottom: '16px' }}>No restaurants found</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCuisine('all'); }}
                style={{ background: '#22C55E', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: secondaryText, marginBottom: '24px', fontSize: '14px' }}>
                Showing {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {filteredRestaurants.map(r => (
                  <RestaurantCard key={r.id} restaurant={r} isDark={isDark} cardBg={cardBg} borderColor={borderColor} textColor={textColor} secondaryText={secondaryText} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1F2937', color: '#FFFFFF', padding: '40px 20px', textAlign: 'center', borderTop: `1px solid ${borderColor}`, position: 'relative', zIndex: 2 }}>
        <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>© 2026 feedme.gg - Food Delivery in Guernsey</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '13px' }}>
          <Link href="/terms" style={{ color: '#D1D5DB', textDecoration: 'none' }}>Terms</Link>
          <Link href="/privacy" style={{ color: '#D1D5DB', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/contact" style={{ color: '#D1D5DB', textDecoration: 'none' }}>Contact</Link>
        </div>
      </footer>
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
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          transition: 'all 0.2s',
          cursor: 'pointer',
          boxShadow: hovering ? (isDark ? '0 8px 20px rgba(34,197,94,0.15)' : '0 8px 20px rgba(0,0,0,0.08)') : '0 0',
          transform: hovering ? 'translateY(-2px)' : 'translateY(0)'
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div style={{
          width: '80px',
          height: '80px',
          background: isDark ? '#2D3748' : '#E5E7EB',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          flexShrink: 0
        }}>
          {r.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: textColor, marginBottom: '4px' }}>
            {r.name}
          </div>
          <div style={{ fontSize: '13px', color: secondaryText, marginBottom: '4px' }}>
            {r.cuisine_type}
          </div>
          <div style={{ fontSize: '12px', color: secondaryText, marginBottom: '8px' }}>
            {r.address || 'Guernsey'}
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: secondaryText }}>
            <span>⏱ {r.delivery_time_mins} min</span>
            <span>★ {r.rating || '4.5'}</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '3px',
              background: r.is_open ? '#D1FAE5' : '#FEE2E2',
              color: r.is_open ? '#065F46' : '#991B1B',
              fontWeight: 600
            }}>
              {r.is_open ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
