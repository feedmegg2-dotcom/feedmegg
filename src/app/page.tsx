'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const PARISHES = ['All','Castel','Forest','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']
const CUISINES = ['All','Pizza','Burgers','Chicken','Kebabs','Indian','Chinese','Pasta','Seafood','Desserts','Sides','Drinks']

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [parish, setParish] = useState('All')
  const [cuisine, setCuisine] = useState('All')
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('feedme-theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('feedme-theme', next ? 'dark' : 'light')
  }

  const t = {
    bg:       dark ? '#080c14' : '#f8fafc',
    bg2:      dark ? '#0d1321' : '#ffffff',
    bg3:      dark ? '#111827' : '#f1f5f9',
    border:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text:     dark ? '#f1f5f9' : '#0f172a',
    sub:      dark ? '#64748b' : '#64748b',
    muted:    dark ? '#334155' : '#94a3b8',
    navBg:    dark ? 'rgba(8,12,20,0.9)' : 'rgba(248,250,252,0.9)',
    card:     dark ? '#0d1321' : '#ffffff',
    cardHov:  dark ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.4)',
    trustBg:  dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    stepBg:   dark ? '#0d1321' : '#ffffff',
    whyBg:    dark ? 'linear-gradient(180deg, transparent 0%, rgba(34,197,94,0.04) 50%, transparent 100%)' : 'linear-gradient(180deg, transparent 0%, rgba(34,197,94,0.06) 50%, transparent 100%)',
    promoBg:  dark ? 'linear-gradient(135deg, #0f2d1a 0%, #0d1f2d 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
    footerBorder: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    inputBg:  dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    inputBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    glow:     dark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)',
    openBg:   dark ? 'rgba(34,197,94,0.9)' : 'rgba(34,197,94,0.9)',
    closedBg: dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
  }

  useEffect(() => { fetchRestaurants() }, [])

  async function fetchRestaurants() {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('is_open', { ascending: false })
    setRestaurants(data || [])
    setLoading(false)
  }

  const filtered = restaurants.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.cuisine_type?.toLowerCase().includes(search.toLowerCase())) return false
    if (parish !== 'All' && r.parish !== parish) return false
    if (cuisine !== 'All' && !r.cuisine_type?.toLowerCase().includes(cuisine.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: 'DM Sans, system-ui, sans-serif', overflowX: 'hidden', transition: 'background 0.3s, color 0.3s' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #080c14; } ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        .nav-link { color: #64748b; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #f1f5f9; }
        .cuisine-pill { padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: inherit; }
        .cuisine-pill:hover { border-color: rgba(34,197,94,0.4); color: #f1f5f9; }
        .cuisine-pill.active { background: #22c55e; border-color: #22c55e; color: #080c14; font-weight: 700; }
        .rest-card { background: #0d1321; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; cursor: pointer; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; text-decoration: none; display: block; }
        .rest-card:hover { transform: translateY(-3px); border-color: rgba(34,197,94,0.3); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
        .rest-card.closed { opacity: 0.6; }
        .search-input { width: 100%; padding: 16px 20px 16px 52px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: inherit; font-size: 15px; outline: none; transition: border-color 0.2s; font-family: inherit; }
        .search-input:focus { border-color: rgba(34,197,94,0.5); background: rgba(255,255,255,0.07); }
        .search-input::placeholder { color: #475569; }
        .step-card { background: #0d1321; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 28px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        @media (max-width: 640px) {
          .hero-title { font-size: clamp(32px, 8vw, 52px) !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-2 { grid-template-columns: 1fr 1fr !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: t.navBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.border}`, padding: '0 clamp(16px, 4vw, 48px)', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, textDecoration: 'none', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 28px)' }}>
          <a href="#how-it-works" className="nav-link hide-mobile">How it works</a>
          <Link href="/merchant/login" className="nav-link hide-mobile">Restaurants</Link>
          <button onClick={toggleTheme} style={{ width: '36px', height: '36px', borderRadius: '8px', background: t.bg3, border: `1px solid ${t.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.2s' }}>
            {dark
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          <Link href="/merchant/login" style={{ padding: '8px 18px', background: '#22c55e', color: '#080c14', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', transition: 'background 0.2s' }}>Sign in</Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 48px) clamp(32px, 5vw, 64px)', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: `radial-gradient(ellipse, ${t.glow} 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>


          <h1 className="hero-title" style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(40px, 7vw, 68px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: '20px', color: t.text }}>
            Guernsey food,<br />
            <span style={{ color: '#22c55e' }}>delivered fast.</span>
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#64748b', lineHeight: 1.6, marginBottom: '36px', maxWidth: '520px', margin: '0 auto 36px' }}>
            Order from the best local restaurants. Fresh food delivered to your door in minutes.
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '560px', margin: '0 auto 16px' }}>
            <svg style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="search-input" type="text" placeholder="Search for a restaurant or cuisine..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Parish + Cuisine dropdowns */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '560px', margin: '0 auto' }}>
            <select value={parish} onChange={e => setParish(e.target.value)}
              style={{ flex: 1, minWidth: '160px', padding: '10px 16px', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${t.border}`, borderRadius: '10px', color: t.text, fontSize: '13px', fontWeight: 500, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
              {PARISHES.map(p => <option key={p} value={p}>{p === 'All' ? 'All parishes' : p}</option>)}
            </select>
            <select value={cuisine} onChange={e => setCuisine(e.target.value)}
              style={{ flex: 1, minWidth: '160px', padding: '10px 16px', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${t.border}`, borderRadius: '10px', color: t.text, fontSize: '13px', fontWeight: 500, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
              {CUISINES.map(c => <option key={c} value={c}>{c === 'All' ? 'All cuisines' : c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div style={{ borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, padding: 'clamp(12px, 2vw, 16px) clamp(16px, 4vw, 48px)', background: t.trustBg }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 5vw, 64px)', flexWrap: 'wrap' }}>
          {[
            { label: '100% Free to use', icon: '' },
            { label: 'Local restaurants only', icon: '' },
            { label: 'Fast delivery', icon: '' },
            { label: 'Secure payments', icon: '' },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'clamp(12px, 1.5vw, 14px)', color: '#64748b', fontWeight: 500 }}>
              <span style={{ color: '#22c55e', fontSize: '10px' }}>{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>
      </div>



      {/* RESTAURANTS GRID */}
      <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(16px, 4vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '16px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: t.card, borderRadius: '16px', height: '220px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'clamp(40px, 8vw, 80px) 20px', color: '#334155' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>food</div>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#475569' }}>No restaurants found</div>
            <div style={{ fontSize: '14px' }}>Try adjusting your search or filters</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 700, color: '#f1f5f9' }}>
                {filtered.length} restaurant{filtered.length !== 1 ? 's' : ''} {parish !== 'All' ? `in ${parish}` : 'in Guernsey'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                {filtered.filter(r => r.is_open).length} open now
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '16px' }}>
              {filtered.map((r, idx) => (
                <Link key={r.id} href={`/restaurant/${r.slug}`} className={`rest-card${!r.is_open ? ' closed' : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                  {/* Image / Logo area */}
                  <div style={{ height: '140px', background: dark ? 'linear-gradient(135deg, #0f1b2d 0%, #162032 100%)' : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {r.logo_url
                      ? <img src={r.logo_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '52px' }}>{r.emoji || 'food'}</span>
                    }
                    {/* Open/closed badge */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', background: r.is_open ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.6)', color: r.is_open ? '#080c14' : '#64748b', backdropFilter: 'blur(4px)' }}>
                      {r.is_open ? 'OPEN' : 'CLOSED'}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px', letterSpacing: '-0.3px' }}>{r.name}</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>{r.cuisine_type}</div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {r.delivery_time_mins} min
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                        GBP{r.delivery_fee?.toFixed(2) || '2.50'} delivery
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#334155' }}>GBP{r.min_order?.toFixed(2)} min</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* HOW IT WORKS */}
      <div id="how-it-works" style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vw, 56px)' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px' }}>How it works</h2>
          <p style={{ fontSize: 'clamp(13px, 1.5vw, 15px)', color: '#475569', maxWidth: '400px', margin: '0 auto' }}>Order from your favourite Guernsey restaurants in 3 simple steps</p>
        </div>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(12px, 2vw, 20px)' }}>
          {[
            { n: '01', title: 'Pick a restaurant', desc: 'Browse local Guernsey restaurants by cuisine or parish and find exactly what you fancy.', color: '#22c55e' },
            { n: '02', title: 'Build your order', desc: 'Choose your dishes, customise options, add special instructions and review your basket.', color: '#3b82f6' },
            { n: '03', title: 'Enjoy your food', desc: 'Sit back, relax and enjoy your meal delivered fresh and hot straight to your door.', color: '#f97316' },
          ].map(s => (
            <div key={s.n} className="step-card">
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, color: s.color, opacity: 0.3, marginBottom: '16px', lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 'clamp(14px, 1.5vw, 16px)', fontWeight: 700, marginBottom: '10px', color: '#f1f5f9' }}>{s.title}</div>
              <div style={{ fontSize: 'clamp(12px, 1.2vw, 14px)', color: '#475569', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WHY FEEDME */}
      <div style={{ background: t.whyBg, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 48px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vw, 48px)' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px' }}>Why feedme.gg?</h2>
            <p style={{ fontSize: 'clamp(13px, 1.5vw, 15px)', color: '#475569' }}>Built for Guernsey, by people who love Guernsey food</p>
          </div>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 'clamp(16px, 2vw, 24px)' }}>
            {[
              { icon: '', title: 'Local & independent', desc: 'We only work with genuine Guernsey restaurants. No chains, no nonsense.' },
              { icon: '', title: '100% free to use', desc: 'No service fees charged to customers. Ever. What you see is what you pay.' },
              { icon: '', title: 'Lightning fast', desc: 'Most orders delivered in under 45 minutes, straight to your door.' },
              { icon: '', title: 'Secure checkout', desc: 'All payments encrypted and processed securely every single time.' },
            ].map(f => (
              <div key={f.title} style={{ padding: 'clamp(20px, 2.5vw, 28px)', background: t.card, borderRadius: '16px', border: `1px solid ${t.border}` }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '16px', color: '#22c55e' }}>{f.icon}</div>
                <div style={{ fontSize: 'clamp(13px, 1.5vw, 15px)', fontWeight: 700, marginBottom: '8px', color: '#f1f5f9' }}>{f.title}</div>
                <div style={{ fontSize: 'clamp(12px, 1.2vw, 13px)', color: '#475569', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROMO BANNER */}
      <div style={{ padding: 'clamp(32px, 5vw, 48px) clamp(16px, 4vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: t.promoBg, border: '1px solid rgba(34,197,94,0.2)', borderRadius: '20px', padding: 'clamp(24px, 4vw, 40px) clamp(24px, 4vw, 48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontSize: 'clamp(11px, 1.2vw, 13px)', fontWeight: 600, color: '#22c55e', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Limited time offer</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px', letterSpacing: '-0.5px' }}>Free delivery on your first order</h3>
            <p style={{ fontSize: 'clamp(12px, 1.3vw, 14px)', color: '#475569' }}>Use code FIRSTORDER at checkout. Valid for new customers only.</p>
          </div>
          <button onClick={() => document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: 'clamp(12px, 1.5vw, 14px) clamp(20px, 2.5vw, 28px)', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '10px', fontSize: 'clamp(13px, 1.3vw, 15px)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            Order now
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${t.footerBorder}`, padding: 'clamp(32px, 5vw, 48px) clamp(16px, 4vw, 48px)', marginTop: 'clamp(16px, 3vw, 32px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '32px', marginBottom: '32px' }}>
            <div style={{ maxWidth: '280px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>
                <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
              </div>
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>Guernsey's local food ordering platform. Supporting independent restaurants across the island.</p>
            </div>
            <div style={{ display: 'flex', gap: 'clamp(32px, 5vw, 64px)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Platform</div>
                {['How it works','For restaurants','About us','Contact'].map(l => (
                  <div key={l} style={{ marginBottom: '10px' }}><a href="#" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>{l}</a></div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Legal</div>
                {['Terms of service','Privacy policy','Cookie policy'].map(l => (
                  <div key={l} style={{ marginBottom: '10px' }}><a href="#" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>{l}</a></div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#1e293b' }}>2026 feedme.gg. All rights reserved.</div>
            <div style={{ fontSize: '12px', color: '#1e293b' }}>Made with love in Guernsey</div>
          </div>
        </div>
      </footer>

    </div>
  )
}
