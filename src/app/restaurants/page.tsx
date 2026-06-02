'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Page() {
  const router = useRouter()
  const [all, setAll] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [cuisine, setCuisine] = useState('all')
  const [search, setSearch] = useState('')
  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('theme')
    if (t) setDark(t === 'dark')
    const supabase = createClient()
    supabase.from('restaurants').select('*').eq('is_active', true).order('rating', {ascending:false}).then(({data}) => {
      setAll(data || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    let f = all
    if (cuisine !== 'all') f = f.filter(r => r.cuisine_type?.toLowerCase().includes(cuisine))
    if (search) f = f.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()) || r.cuisine_type?.toLowerCase().includes(search.toLowerCase()))
    setFiltered(f)
  }, [all, cuisine, search])

  const bg = dark ? '#1F2937' : '#FFFFFF'
  const txt = dark ? '#FFFFFF' : '#1F2937'
  const sub = dark ? '#D1D5DB' : '#6B7280'
  const brd = dark ? '#374151' : '#E5E5E5'
  const card = dark ? '#111827' : '#FFFFFF'
  const inp = dark ? '#2D3748' : '#FFFFFF'

  return (
    <div style={{background:bg,minHeight:'100vh',color:txt,position:'relative',overflow:'hidden'}}>
      <style>{`@keyframes f{0%,100%{transform:translateY(0)rotate(0)}50%{transform:translateY(-30px)rotate(5deg)}}`}</style>
      <div style={{position:'fixed',top:'-100px',right:'-100px',fontSize:'180px',opacity:dark?0.08:0.06,zIndex:0,pointerEvents:'none',animation:'f 8s ease-in-out infinite',color:dark?'#fff':'#1F2937'}}>🍕🍔🍜🍱🍛</div>
      <div style={{position:'fixed',bottom:'-80px',left:'-80px',fontSize:'150px',opacity:dark?0.05:0.04,zIndex:0,pointerEvents:'none',animation:'f 10s ease-in-out infinite',color:dark?'#fff':'#1F2937'}}>🍝🌮🥗🍖</div>

      <nav style={{borderBottom:`1px solid ${brd}`,padding:'16px 20px',position:'sticky',top:0,zIndex:101,background:bg}}>
        <div style={{maxWidth:'1200px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <Link href="/" style={{fontFamily:'Syne',fontSize:'20px',fontWeight:800,color:'#22C55E',textDecoration:'none'}}>feedme.gg</Link>
          <div style={{display:'flex',gap:'12px'}}>
            <button onClick={()=>setDark(!dark)} style={{background:dark?'#374151':'#F3F4F6',border:`1px solid ${brd}`,color:txt,padding:'8px 12px',borderRadius:'8px',fontSize:'16px',cursor:'pointer'}}>{dark?'☀️':'🌙'}</button>
            <button onClick={()=>router.back()} style={{background:'#22C55E',color:'#fff',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:600}}>← Back</button>
          </div>
        </div>
      </nav>

      <div style={{background:bg,padding:'30px 20px',borderBottom:`1px solid ${brd}`,position:'relative',zIndex:2}}>
        <div style={{maxWidth:'1200px',margin:'0 auto'}}>
          <h1 style={{fontSize:'28px',fontWeight:700,color:txt,marginBottom:'24px'}}>All Restaurants</h1>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:'16px'}}>
            <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:inp,border:`1px solid ${brd}`,borderRadius:'8px',padding:'12px 16px',color:txt,fontSize:'14px',outline:'none'}} />
            <select value={cuisine} onChange={e=>setCuisine(e.target.value)} style={{background:inp,border:`1px solid ${brd}`,borderRadius:'8px',padding:'12px 16px',color:txt,cursor:'pointer',fontSize:'14px'}}>
              <option value="all">All Cuisines</option>
              <option value="pizza">Pizza</option>
              <option value="burger">Burgers</option>
              <option value="sushi">Sushi</option>
              <option value="indian">Indian</option>
              <option value="chinese">Chinese</option>
            </select>
            {(search || cuisine!=='all') && <button onClick={()=>{setSearch('');setCuisine('all');}} style={{background:'#374151',color:'#fff',border:'none',borderRadius:'8px',padding:'12px 16px',cursor:'pointer',fontWeight:600}}>Clear</button>}
          </div>
        </div>
      </div>

      <div style={{padding:'40px 20px',position:'relative',zIndex:2}}>
        <div style={{maxWidth:'1200px',margin:'0 auto'}}>
          {loading ? <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'20px'}}>{[1,2,3,4,5,6].map(i=><div key={i} style={{background:card,borderRadius:'8px',height:'150px',border:`1px solid ${brd}`}} />)}</div>
          : filtered.length===0 ? <div style={{textAlign:'center',padding:'60px 20px',color:sub}}><p>No results</p><button onClick={()=>{setSearch('');setCuisine('all');}} style={{background:'#22C55E',color:'#fff',border:'none',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',marginTop:'16px'}}>Clear</button></div>
          : <><p style={{color:sub,marginBottom:'24px',fontSize:'14px'}}>Showing {filtered.length}</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'20px'}}>{filtered.map(r=>{const s=r.slug||r.name?.toLowerCase().replace(/\s+/g,'-');return <Link key={r.id} href={`/restaurant/${s}`} style={{textDecoration:'none'}}><div style={{background:card,border:`1px solid ${brd}`,borderRadius:'8px',padding:'16px',display:'flex',gap:'16px',cursor:'pointer',transition:'all 0.2s'}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}><div style={{width:'80px',height:'80px',background:dark?'#2D3748':'#E5E7EB',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',flexShrink:0}}>{r.emoji}</div><div style={{flex:1}}><div style={{fontSize:'16px',fontWeight:700,color:txt,marginBottom:'4px'}}>{r.name}</div><div style={{fontSize:'13px',color:sub,marginBottom:'4px'}}>{r.cuisine_type}</div><div style={{fontSize:'12px',color:sub,marginBottom:'8px'}}>{r.address||'Guernsey'}</div><div style={{display:'flex',gap:'12px',fontSize:'12px',color:sub}}><span>⏱ {r.delivery_time_mins} min</span><span>★ {r.rating||'4.5'}</span><span style={{padding:'2px 8px',borderRadius:'3px',background:r.is_open?'#D1FAE5':'#FEE2E2',color:r.is_open?'#065F46':'#991B1B',fontWeight:600}}>{r.is_open?'Open':'Closed'}</span></div></div></div></Link>})}</div></>}
        </div>
      </div>

      <footer style={{background:'#1F2937',color:'#fff',padding:'40px 20px',textAlign:'center',borderTop:`1px solid ${brd}`,position:'relative',zIndex:2}}>
        <p style={{fontSize:'13px',opacity:0.8,marginBottom:'16px'}}>© 2026 feedme.gg</p>
        <div style={{display:'flex',gap:'20px',justifyContent:'center',fontSize:'13px'}}>
          <Link href="/terms" style={{color:'#D1D5DB',textDecoration:'none'}}>Terms</Link>
          <Link href="/privacy" style={{color:'#D1D5DB',textDecoration:'none'}}>Privacy</Link>
          <Link href="/contact" style={{color:'#D1D5DB',textDecoration:'none'}}>Contact</Link>
        </div>
      </footer>
    </div>
  )
}
