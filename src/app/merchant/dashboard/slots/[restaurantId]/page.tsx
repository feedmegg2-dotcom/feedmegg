'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function SlotsPage() {
  const params = useParams()
  const router = useRouter()
  const restaurantId = params.restaurantId as string
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [settings, setSettings] = useState({
    delivery_slot_duration: 30,
    delivery_slot_capacity: 10,
    pickup_slot_duration: 15,
    pickup_slot_capacity: 10,
    preorder_delivery_enabled: true,
    preorder_pickup_enabled: true,
  })

  useEffect(() => {
    fetchRestaurant()
  }, [])

  async function fetchRestaurant() {
    const { data } = await supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle()
    if (data) {
      setRestaurant(data)
      setSettings({
        delivery_slot_duration: data.delivery_slot_duration || 30,
        delivery_slot_capacity: data.delivery_slot_capacity || 10,
        pickup_slot_duration: data.pickup_slot_duration || 15,
        pickup_slot_capacity: data.pickup_slot_capacity || 10,
        preorder_delivery_enabled: data.preorder_delivery_enabled !== false,
        preorder_pickup_enabled: data.preorder_pickup_enabled !== false,
      })
    }
  }

  async function saveSettings() {
    setSaving(true)
    await supabase.from('restaurants').update(settings).eq('id', restaurantId)
    setSaving(false)
    setMsg('Saved!')
    setTimeout(() => setMsg(''), 3000)
  }

  const inputStyle: any = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => router.push('/merchant/dashboard')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Pre-Order Slots</h1>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>

          {/* DELIVERY SLOTS */}
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>🚗 Delivery Slots</div>
              <div onClick={() => setSettings({...settings, preorder_delivery_enabled: !settings.preorder_delivery_enabled})}
                style={{ width: '44px', height: '24px', borderRadius: '12px', background: settings.preorder_delivery_enabled ? '#22c55e' : '#334155', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '3px', left: settings.preorder_delivery_enabled ? '23px' : '3px', width: '18px', height: '18px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
              </div>
            </div>
            {settings.preorder_delivery_enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Slot Duration</label>
                  <select value={settings.delivery_slot_duration} onChange={e => setSettings({...settings, delivery_slot_duration: parseInt(e.target.value)})} style={{ ...inputStyle, appearance: 'none' }}>
                    {[15,20,30,45,60].map(d => <option key={d} value={d} style={{ background: '#0d1321' }}>{d} mins</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Orders Per Slot</label>
                  <input type="number" min={1} max={50} value={settings.delivery_slot_capacity} onChange={e => setSettings({...settings, delivery_slot_capacity: parseInt(e.target.value)})} style={inputStyle} />
                </div>
              </div>
            )}
          </div>

          {/* PICKUP SLOTS */}
          <div style={{ background: '#0d1321', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>🏪 Pickup Slots</div>
              <div onClick={() => setSettings({...settings, preorder_pickup_enabled: !settings.preorder_pickup_enabled})}
                style={{ width: '44px', height: '24px', borderRadius: '12px', background: settings.preorder_pickup_enabled ? '#22c55e' : '#334155', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '3px', left: settings.preorder_pickup_enabled ? '23px' : '3px', width: '18px', height: '18px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
              </div>
            </div>
            {settings.preorder_pickup_enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Slot Duration</label>
                  <select value={settings.pickup_slot_duration} onChange={e => setSettings({...settings, pickup_slot_duration: parseInt(e.target.value)})} style={{ ...inputStyle, appearance: 'none' }}>
                    {[15,20,30,45,60].map(d => <option key={d} value={d} style={{ background: '#0d1321' }}>{d} mins</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Orders Per Slot</label>
                  <input type="number" min={1} max={50} value={settings.pickup_slot_capacity} onChange={e => setSettings({...settings, pickup_slot_capacity: parseInt(e.target.value)})} style={inputStyle} />
                </div>
              </div>
            )}
          </div>

        </div>

        {msg && <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', color: '#22c55e', fontSize: '13px' }}>{msg}</div>}

        <button onClick={saveSettings} disabled={saving} style={{ width: '100%', marginTop: '16px', padding: '14px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
