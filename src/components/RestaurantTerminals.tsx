'use client'

import { useEffect, useState } from 'react'

// Admin version of the merchant dashboard's Terminals list, for one restaurant.
// A tablet still claims its terminal by logging in as the merchant; this just
// sets up, renames, releases, and removes the terminal slots.
export default function RestaurantTerminals({ restaurant, onClose }: { restaurant: { id: string; name: string }; onClose: () => void }) {
  const [terminals, setTerminals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [restaurant.id])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/terminals?restaurantId=${restaurant.id}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setTerminals(data.terminals || [])
      else setMsg(data.error || 'Could not load terminals')
    } catch (e) {
      setMsg('Network error loading terminals')
    }
    setLoading(false)
  }

  async function send(method: string, url: string, body?: any) {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) { setMsg(data.error || 'Something went wrong'); setBusy(false); return false }
      await load()
      setBusy(false)
      return true
    } catch (e) {
      setMsg('Network error - please try again')
      setBusy(false)
      return false
    }
  }

  async function addTerminal() {
    const ok = await send('POST', '/api/admin/terminals', { restaurantId: restaurant.id, name: newName })
    if (ok) setNewName('')
  }

  async function saveName(id: string) {
    const ok = await send('PATCH', '/api/admin/terminals', { id, name: editName })
    if (ok) setEditingId(null)
  }

  async function releaseClaim(id: string) {
    if (!confirm('Release this terminal? The tablet currently using it will need to be claimed again.')) return
    await send('PATCH', '/api/admin/terminals', { id, release: true })
  }

  async function removeTerminal(id: string) {
    if (!confirm('Delete this terminal?')) return
    await send('DELETE', `/api/admin/terminals?id=${id}`)
  }

  const border = 'var(--border)'
  const sub = 'var(--sub)'
  const inputStyle: any = { padding: '8px 10px', background: 'var(--bg3)', border: `1px solid ${border}`, borderRadius: '6px', color: 'inherit', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }
  const smallBtn: any = { padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, color: 'inherit' }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg2)', border: `1px solid ${border}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Terminals - {restaurant.name}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'inherit', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>x</button>
        </div>
        <p style={{ fontSize: '12px', color: sub, marginBottom: '16px' }}>
          Same as the merchant dashboard. A tablet claims its terminal by logging in as the merchant.
        </p>

        {msg && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>{msg}</div>}

        {loading ? (
          <div style={{ fontSize: '13px', color: sub, padding: '20px 0' }}>Loading...</div>
        ) : terminals.length === 0 ? (
          <div style={{ fontSize: '13px', color: sub, padding: '12px 0' }}>No terminals yet for this restaurant.</div>
        ) : (
          <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
            {terminals.map(t => (
              <div key={t.id} style={{ border: `1px solid ${border}`, borderRadius: '10px', padding: '12px', background: 'var(--bg3)' }}>
                {editingId === t.id ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: '140px' }} autoFocus />
                    <button onClick={() => saveName(t.id)} disabled={busy} style={{ ...smallBtn, background: 'var(--green)', color: '#000', border: 'none' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={smallBtn}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: '11px', color: sub, marginTop: '3px' }}>
                        {t.claimed_device
                          ? <>Claimed by <strong style={{ color: 'inherit' }}>{t.claimed_device}</strong>{t.last_seen && <> &middot; last seen {new Date(t.last_seen).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>}</>
                          : 'Not claimed yet'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => { setEditingId(t.id); setEditName(t.name) }} style={smallBtn}>Rename</button>
                      {t.claimed_device && <button onClick={() => releaseClaim(t.id)} disabled={busy} style={smallBtn}>Release</button>}
                      <button onClick={() => removeTerminal(t.id)} disabled={busy} style={{ ...smallBtn, color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${border}`, paddingTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Terminal name (optional)" style={{ ...inputStyle, flex: 1, minWidth: '160px' }} />
          <button onClick={addTerminal} disabled={busy} style={{ padding: '8px 16px', background: 'var(--green)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
            + Add terminal
          </button>
        </div>
      </div>
    </div>
  )
}
