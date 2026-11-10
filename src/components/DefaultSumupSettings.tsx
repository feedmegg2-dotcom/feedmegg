'use client'

import { useEffect, useState } from 'react'

// Lets the admin set the default SumUp account used by any restaurant that
// hasn't entered its own keys. The secret key is never shown back here: the
// admin can only see whether one is set.
export default function DefaultSumupSettings() {
  const [open, setOpen] = useState(false)
  const [apiKeySet, setApiKeySet] = useState(false)
  const [savedMerchantCode, setSavedMerchantCode] = useState('')
  const [merchantCode, setMerchantCode] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await fetch('/api/admin/platform-sumup', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setApiKeySet(!!data.apiKeySet)
        setSavedMerchantCode(data.merchantCode || '')
        setMerchantCode(data.merchantCode || '')
      } else {
        setMsg(data.error || 'Could not load default SumUp settings')
      }
    } catch (e) {
      setMsg('Network error loading default SumUp settings')
    }
  }

  async function save() {
    setMsg('')
    if (!merchantCode.trim()) { setMsg('Enter the merchant code'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/platform-sumup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantCode, apiKey: newApiKey }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setMsg(data.error || 'Failed to save')
      } else {
        setMsg('Saved')
        setNewApiKey('')
        await load()
      }
    } catch (e) {
      setMsg('Network error - please try again')
    }
    setSaving(false)
  }

  const bg = 'var(--bg2)'
  const border = 'var(--border)'
  const sub = 'var(--sub)'
  const inputStyle: any = { width: '100%', padding: '10px 12px', background: 'var(--bg3)', border: `1px solid ${border}`, borderRadius: '8px', color: 'inherit', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>Default SumUp account</div>
          <div style={{ fontSize: '12px', color: sub, marginTop: '3px' }}>
            Used by any restaurant that hasn&apos;t entered its own SumUp keys.
            {' '}Secret key: <strong style={{ color: apiKeySet ? '#22c55e' : '#ef4444' }}>{apiKeySet ? 'set' : 'not set'}</strong>
            {savedMerchantCode && <> &middot; Merchant code: <strong>{savedMerchantCode}</strong></>}
          </div>
        </div>
        <button onClick={() => setOpen(!open)} style={{ padding: '8px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {open ? 'Close' : (apiKeySet ? 'Update' : 'Set up')}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: '14px', display: 'grid', gap: '10px', maxWidth: '420px' }}>
          <div>
            <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '5px' }}>Merchant code</label>
            <input value={merchantCode} onChange={e => setMerchantCode(e.target.value)} placeholder="e.g. MXXXXXXXX" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '5px' }}>
              Secret key {apiKeySet && <span>(leave blank to keep the current key)</span>}
            </label>
            <input type="password" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} placeholder="sup_sk_..." style={inputStyle} />
          </div>
          <div style={{ fontSize: '11px', color: sub }}>
            Both the merchant code and the secret key are needed for default payments to work.
          </div>
          <button onClick={save} disabled={saving} style={{ padding: '10px 16px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save default account'}
          </button>
          {msg && <div style={{ fontSize: '12px', color: msg === 'Saved' ? '#22c55e' : '#ef4444' }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
