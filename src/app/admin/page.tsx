'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  const ADMIN_PASSWORD = 'feedmegg2026admin'

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setPassword('')
      fetchRestaurants()
    } else {
      alert('Wrong password')
      setPassword('')
    }
  }

  async function fetchRestaurants() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('name', { ascending: true })
    setRestaurants(data || [])
    setLoading(false)
  }

  function startEdit(restaurant: any) {
    setEditingId(restaurant.id)
    setEditForm({
      delivery_fee: restaurant.delivery_fee || 2.99,
      opening_time: restaurant.opening_time || '10:00',
      closing_time: restaurant.closing_time || '23:00',
      delivery_time_mins: restaurant.delivery_time_mins || 30
    })
  }

  async function saveEdit() {
    if (!editingId) return
    setUpdating(editingId)
    try {
      const response = await fetch('/api/admin/update-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingId, 
          ...editForm 
        })
      })
      
      if (response.ok) {
        setRestaurants(restaurants.map(r => 
          r.id === editingId ? { ...r, ...editForm } : r
        ))
        setEditingId(null)
        setEditForm({})
      } else {
        alert('Failed to update restaurant')
      }
    } catch (error) {
      alert('Error: ' + error)
    } finally {
      setUpdating(null)
    }
  }

  async function toggleRestaurant(id: string, currentStatus: boolean) {
    setUpdating(id)
    try {
      const response = await fetch('/api/admin/toggle-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      })
      
      if (response.ok) {
        setRestaurants(restaurants.map(r => 
          r.id === id ? { ...r, is_active: !currentStatus } : r
        ))
      } else {
        alert('Failed to update restaurant')
      }
    } catch (error) {
      alert('Error: ' + error)
    } finally {
      setUpdating(null)
    }
  }

  async function deleteRestaurant(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return
    }
    
    setUpdating(id)
    try {
      const response = await fetch('/api/admin/delete-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      
      if (response.ok) {
        setRestaurants(restaurants.filter(r => r.id !== id))
      } else {
        alert('Failed to delete restaurant')
      }
    } catch (error) {
      alert('Error: ' + error)
    } finally {
      setUpdating(null)
    }
  }

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1F2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h1 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 700, marginBottom: '32px', textAlign: 'center' }}>
            Admin Panel
          </h1>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#D1D5DB', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #374151',
                  background: '#2D3748',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#22C55E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#16A34A')}
              onMouseLeave={e => (e.currentTarget.style.background = '#22C55E')}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#1F2937', minHeight: '100vh', color: '#FFFFFF', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700 }}>Restaurant Management</h1>
          <button
            onClick={() => {
              setAuthenticated(false)
              setRestaurants([])
            }}
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Logout
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#D1D5DB' }}>Loading restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#D1D5DB' }}>No restaurants found</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {restaurants.map(r => (
              <div
                key={r.id}
                style={{
                  background: '#111827',
                  border: `2px solid ${r.is_active ? '#22C55E' : '#EF4444'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  transition: 'all 0.3s'
                }}
              >
                {editingId === r.id ? (
                  <>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#FFFFFF' }}>
                      Edit: {r.name}
                    </h3>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', color: '#D1D5DB', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Delivery Fee (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.delivery_fee}
                        onChange={e => setEditForm({...editForm, delivery_fee: parseFloat(e.target.value)})}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #374151', background: '#2D3748', color: '#FFFFFF', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', color: '#D1D5DB', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Delivery Time (mins)</label>
                      <input
                        type="number"
                        value={editForm.delivery_time_mins}
                        onChange={e => setEditForm({...editForm, delivery_time_mins: parseInt(e.target.value)})}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #374151', background: '#2D3748', color: '#FFFFFF', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', color: '#D1D5DB', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Opening Time</label>
                      <input
                        type="time"
                        value={editForm.opening_time}
                        onChange={e => setEditForm({...editForm, opening_time: e.target.value})}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #374151', background: '#2D3748', color: '#FFFFFF', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', color: '#D1D5DB', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Closing Time</label>
                      <input
                        type="time"
                        value={editForm.closing_time}
                        onChange={e => setEditForm({...editForm, closing_time: e.target.value})}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #374151', background: '#2D3748', color: '#FFFFFF', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => saveEdit()}
                        disabled={updating === r.id}
                        style={{ flex: 1, padding: '10px', background: '#22C55E', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        {updating === r.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ flex: 1, padding: '10px', background: '#6B7280', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '40px' }}>{r.emoji}</div>
                      
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#FFFFFF' }}>
                          {r.name}
                        </h3>
                        
                        <div style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '4px' }}>
                          {r.cuisine_type}
                        </div>
                        
                        <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>
                          {r.address}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '13px', color: '#9CA3AF', flexWrap: 'wrap' }}>
                          <span>⏱ {r.delivery_time_mins} min</span>
                          <span>★ {r.rating || '4.5'}</span>
                          <span>💰 £{r.delivery_fee || '2.99'}</span>
                          <span>🕐 {r.opening_time || '10:00'} - {r.closing_time || '23:00'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => startEdit(r)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        marginBottom: '8px'
                      }}
                    >
                      ✏️ Edit Settings
                    </button>

                    <button
                      onClick={() => toggleRestaurant(r.id, r.is_active)}
                      disabled={updating === r.id}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: r.is_active ? '#22C55E' : '#6B7280',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: updating === r.id ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        opacity: updating === r.id ? 0.5 : 1,
                        marginBottom: '8px'
                      }}
                    >
                      {updating === r.id ? 'Updating...' : r.is_active ? '✓ Active' : '✗ Inactive'}
                    </button>

                    <button
                      onClick={() => deleteRestaurant(r.id, r.name)}
                      disabled={updating === r.id}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: updating === r.id ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        opacity: updating === r.id ? 0.5 : 1
                      }}
                    >
                      {updating === r.id ? 'Deleting...' : '🗑️ Delete'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
