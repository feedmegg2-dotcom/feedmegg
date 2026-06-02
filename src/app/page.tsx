'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const supabase = createClient()
  const [allRestaurants, setAllRestaurants] = useState<any[]>([])
  const [selectedCuisine, setSelectedCuisine] = useState('all')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isMobileView, setIsMobileView] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    setTheme(savedTheme || 'dark')
    setIsMobileView(typeof window !== 'undefined' && window.innerWidth < 768)
    window.addEventListener('resize', () => setIsMobileView(window.innerWidth < 768))
    fetchRestaurants()
    return () => window.removeEventListener('resize', () => setIsMobileView(window.innerWidth < 768))
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

  function getRandomRestaurants(count: number) {
    const shuffled = [...allRestaurants].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

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
      <nav style={{ borderBottom: `1px solid ${borderColor}`, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, background: bgColor }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Syne, system-ui, sans-serif', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#22C55E' }}>
            feedme.gg
          </div>
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
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ 
        background: '#1F2937', 
        padding: '40px 20px', 
        borderBottom: `1px solid ${isDark ? '#374151' : '#E5E5E5'}`,
        position: 'relative',
        overflow: 'hidden',
        zIndex: 2
      }}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(31, 41, 55, 0.95) 100%)',
          zIndex: 1
        }} />
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-50px',
          fontSize: '120px',
          opacity: 0.08,
          zIndex: 0,
          animation: 'float 6s ease-in-out infinite',
          pointerEvents: 'none'
        }}>
          🍕 🍔 🍜 🍱 🍛 🍝 🌮 🥗
        </div>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
        `}</style>

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ 
            fontSize: isMobileView ? '24px' : '32px', 
            fontWeight: 700, 
            color: '#FFFFFF', 
            marginBottom: isMobileView ? '24px' : '32px', 
            letterSpacing: '-0.5px',
            transition: 'font-size 0.3s'
          }}>
            Delivery Online in Guernsey
          </h1>
          
          <div style={{ 
            padding: isMobileView ? '16px' : '20px', 
            maxWidth: '900px', 
            margin: '0 auto', 
            display: 'grid',
            gridTemplateColumns: isMobileView ? '1fr' : '2fr 1fr',
            gap: '12px',
            alignItems: 'end'
          }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ 
                display: 'block', 
                color: '#FFFFFF', 
                fontWeight: 700, 
                fontSize: isMobileView ? '13px' : '14px',
                marginBottom: '8px',
                transition: 'font-size 0.3s'
              }}>
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
            <button
              onClick={() => router.push(`/restaurants?cuisine=${selectedCuisine}`)}
              style={{
                background: '#F5F5F5',
                color: '#1F2937',
                border: 'none',
                padding: '12px 24px',
                fontSize: isMobileView ? '13px' : '14px',
                fontWeight: 700,
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
                width: '100%'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E5E5E5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F5F5F5')}
            >
              All Takeaways
            </button>
          </div>
        </div>
      </div>

      {/* Places to Try Section */}
      <div style={{ background: bgColor, padding: '60px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: textColor, marginBottom: '12px', textAlign: 'center' }}>
            Places to Try
          </h2>
          <p style={{ textAlign: 'center', color: secondaryText, fontSize: '16px', marginBottom: '32px', fontStyle: 'italic' }}>
            Local food at your fingertips
          </p>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ background: cardBg, borderRadius: '8px', height: '150px', border: `1px solid ${borderColor}` }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {getRandomRestaurants(6).map(r => (
                <RestaurantItem key={r.id} restaurant={r} isDark={isDark} cardBg={cardBg} borderColor={borderColor} textColor={textColor} secondaryText={secondaryText} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Browse All Takeaways Section */}
      <div id="all-takeaways" style={{ background: bgColor, padding: '60px 20px', textAlign: 'center', borderTop: `1px solid ${borderColor}`, position: 'relative', zIndex: 2 }}>

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: textColor, marginBottom: '16px' }}>
            Browse All Takeaways
          </h2>
          <p style={{ color: secondaryText, marginBottom: '24px', fontSize: '16px' }}>
            Explore all available restaurants in Guernsey
          </p>
          <button
            onClick={() => router.push('/restaurants')}
            style={{
              background: '#22C55E',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px 40px',
              fontSize: '16px',
              fontWeight: 700,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#16A34A')}
            onMouseLeave={e => (e.currentTarget.style.background = '#22C55E')}
          >
            View All Restaurants
          </button>
        </div>
      </div>

      {/* How It Works Section */}
      <div style={{ background: bgColor, padding: '60px 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: textColor, marginBottom: '40px', textAlign: 'center' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <StepCard emoji="🔍" number="1" title="Browse Restaurants" description="Search for your favourite restaurants or filter by cuisine type" isDark={isDark} />
            <StepCard emoji="🛒" number="2" title="Select Your Items" description="Add items to your basket and add special instructions" isDark={isDark} />
            <StepCard emoji="💳" number="3" title="Checkout" description="Review your order and complete payment securely" isDark={isDark} />
            <StepCard emoji="😋" number="4" title="Enjoy Your Food" description="Relax and enjoy your delicious meal delivered fresh to your door" isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1F2937', color: '#FFFFFF', padding: '40px 20px', textAlign: 'center', borderTop: `1px solid ${borderColor}` }}>
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

function RestaurantItem(props: any) {
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
          <span style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            background: r.is_open ? '#D1FAE5' : '#FEE2E2',
            color: r.is_open ? '#065F46' : '#991B1B'
          }}>
            {r.is_open ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function StepCard(props: any) {
  const { emoji, number, title, description, isDark } = props
  return (
    <div style={{
      background: isDark ? '#111827' : '#F9FAFB',
      padding: '32px 24px',
      borderRadius: '12px',
      textAlign: 'center',
      border: `1px solid ${isDark ? '#374151' : '#E5E5E5'}`,
      transition: 'all 0.2s'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'
      e.currentTarget.style.transform = 'translateY(-4px)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.boxShadow = '0 0'
      e.currentTarget.style.transform = 'translateY(0)'
    }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>{emoji}</div>
      <div style={{
        width: '50px',
        height: '50px',
        background: '#22C55E',
        color: '#FFFFFF',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 700,
        margin: '0 auto 16px'
      }}>
        {number}
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '8px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: isDark ? '#D1D5DB' : '#6B7280', lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  )
}
