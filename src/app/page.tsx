'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const CUISINE_FILTERS = [
  { key: 'all', label: '🍽️ All' },
  { key: 'pizza', label: '🍕 Pizza' },
  { key: 'burger', label: '🍔 Burgers' },
  { key: 'sushi', label: '🍣 Sushi' },
  { key: 'indian', label: '🍛 Indian' },
  { key: 'chinese', label: '🥡 Chinese' },
  { key: 'mexican', label: '🌮 Mexican' },
  { key: 'healthy', label: '🥗 Healthy' },
]

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [postcode, setPostcode] = useState('')
  const [cookieAccepted, setCookieAccepted] = useState(true)

  useEffect(() => {
    setCookieAccepted(!!localStorage.getItem('cookie-accepted'))
    fetchRestaurants()
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
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'Syne', fontSize: '22px', fontWeight: 800, letterSpacing: '-1px' }}>
          <span style={{ color: 'var(--green)' }}>feed</span>
          <span style={{ color: 'var(--text)' }}>me.gg</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/browse" style={{ background: 'none', border: 'none', color: 'var(--sub)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', textDecoration: 'none' }}>Restaurants</Link>
          <Link href="/account" style={{ background: 'none', border: 'none', color: 'var(--sub)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', textDecoration: 'none' }}>Account</Link>
          <Link href="/auth/login" className="btn-ghost" style={{ fontSize: '12px', padding: '7px 14px', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '60px 20px 40px', textAlign: 'center', maxWidth: '680px', margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--green)', fontSize: '11px', fontWeight: 600, padding: '5px 14px', borderRadius: '20px', marginBottom: '20px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          ⚡ Guernsey&apos;s own food delivery
        </div>
        <h1 style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: '12px' }}>
          Hungry? <span style={{ color: 'var(--green)' }}>Order now,</span><br />eat in minutes.
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--sub)', marginBottom: '32px', lineHeight: 1.6 }}>
          Fresh food from local Guernsey restaurants,<br />delivered straight to your door.
        </p>

        {/* Location bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 16px', marginBottom: '10px', cursor: 'pointer' }}>
          <span style={{ color: 'var(--green)' }}>📍</span>
          <span style={{ flex: 1, fontSize: '13px', color: 'var(--sub)', textAlign: 'left' }}>
            Delivering to <strong style={{ color: 'var(--text)' }}>St Peter Port, Guernsey</strong>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>Change ▾</span>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search restaurants or cuisines..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '14px 18px', fontSize: '15px', color: 'var(--text)', outline: 'none' }}
          />
          <button
            onClick={() => router.push('/browse')}
            style={{ background: 'var(--green)', color: '#0F172A', border: 'none', padding: '14px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            🔍 Search
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CUISINE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${filter === f.key ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                color: filter === f.key ? 'var(--green)' : 'var(--sub)',
                padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Trust strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px', flexWrap: 'wrap' }}>
          {['✓ Free to use', '🏝️ Guernsey based', '💳 Secure payments', '📧 Email confirmation'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--sub)' }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Promo banner */}
      <div style={{ maxWidth: '920px', margin: '0 auto 32px', padding: '0 20px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.1),rgba(34,197,94,0.04))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '28px' }}>🎉</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>Free delivery on your first order!</div>
            <div style={{ fontSize: '12px', color: 'var(--sub)' }}>Use code WELCOME at checkout · Valid this week only</div>
          </div>
          <button className="btn-primary" style={{ marginLeft: 'auto', padding: '9px 18px', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Claim offer
          </button>
        </div>
      </div>

      {/* Restaurant grid */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            {search ? `Results for "${search}"` : 'Restaurants near you'}
          </h2>
          <Link href="/browse" style={{ color: 'var(--green)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
            See all →
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: 'var(--card)', borderRadius: '16px', height: '220px', animation: 'pulse 1.5s infinite', opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px' }}>
            {filtered.slice(0, 8).map(r => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--sub)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>🔍</div>
            <p>No restaurants found for &quot;{search}&quot;</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px', textAlign: 'center', fontSize: '12px', color: 'var(--sub)' }}>
        © 2026 feedme.gg · Guernsey&apos;s local food ordering platform &nbsp;·&nbsp;
        <Link href="/terms" style={{ color: 'var(--sub)', textDecoration: 'none' }}>Terms</Link> &nbsp;·&nbsp;
        <Link href="/privacy" style={{ color: 'var(--sub)', textDecoration: 'none' }}>Privacy</Link> &nbsp;·&nbsp;
        <Link href="/contact" style={{ color: 'var(--sub)', textDecoration: 'none' }}>Contact</Link>
      </footer>

      {/* Cookie banner */}
      {!cookieAccepted && (
        <div id="cookie-banner">
          <p style={{ fontSize: '12px', color: 'var(--sub)', flex: 1 }}>
            🍪 We use cookies to improve your experience. By continuing you agree to our{' '}
            <Link href="/privacy" style={{ color: 'var(--green)', textDecoration: 'none' }}>Privacy Policy</Link>.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-ghost" style={{ fontSize: '12px', padding: '7px 14px' }}>Manage</button>
            <button className="btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }} onClick={acceptCookies}>Accept all</button>
          </div>
        </div>
      )}
    </div>
  )
}

function RestaurantCard({ restaurant: r }: { restaurant: any }) {
  const bgMap: Record<string, string> = {
    pizza: '#2d0a00', burger: '#001a00', sushi: '#001a18',
    indian: '#1a0800', chinese: '#001228', mexican: '#1a0500',
    healthy: '#001a08', chips: '#001418',
  }
  const cuisineKey = Object.keys(bgMap).find(k => r.cuisine_type?.toLowerCase().includes(k)) || 'other'
  const bg = bgMap[cuisineKey] || '#1a1a2d'

  return (
    <Link href={`/restaurant/${r.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
      >
        <div style={{ height: '130px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', position: 'relative' }}>
          {r.emoji || '🍽️'}
          <span style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: r.is_open ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.7)', color: r.is_open ? '#0F172A' : 'var(--sub)' }}>
            {r.is_open ? 'Open' : 'Closed'}
          </span>
          {r.is_busy && (
            <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(249,115,22,0.9)', color: 'white' }}>
              Busy
            </span>
          )}
        </div>
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '15px', fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#F59E0B' }}>★ {r.rating || '4.5'}</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '10px' }}>{r.cuisine_type}</div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--sub)' }}>
            <span>⏱ {r.delivery_time_mins || 25}-{(r.delivery_time_mins || 25) + 10} min</span>
            <span>🚗 £{r.delivery_fee?.toFixed(2) || '2.99'}</span>
            <span style={{ color: r.is_open ? 'var(--green)' : 'var(--sub)' }}>{r.is_open ? '● Open' : '○ Closed'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
