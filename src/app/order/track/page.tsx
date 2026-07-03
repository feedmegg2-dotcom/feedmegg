'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface BillUnit {
  id: string
  name: string
  price: number
}

export default function TrackOrder() {
  const supabase = createClient()
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showSplitter, setShowSplitter] = useState(false)
  const [people, setPeople] = useState<string[]>(['Person 1', 'Person 2'])
  const [newPersonName, setNewPersonName] = useState('')
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({})
  const [splitExtrasEvenly, setSplitExtrasEvenly] = useState(true)

  async function trackOrder() {
    setError('')
    setOrder(null)
    setItems([])
    setShowSplitter(false)
    if (!orderNumber || !phone) { setError('Please enter your order number and phone number'); return }
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, restaurants(name, emoji), order_items(*)')
      .eq('order_number', orderNumber.toUpperCase())
      .eq('customer_phone', phone)
      .maybeSingle()
    setLoading(false)
    if (!data) { setError('Order not found. Please check your order number and phone number.'); return }
    setOrder(data)
    setItems(data.order_items || [])
  }

  function getBillUnits(): BillUnit[] {
    const units: BillUnit[] = []
    for (const item of items) {
      const qty = item.quantity || item.qty || 1
      const unitPrice = parseFloat(item.price) || 0
      for (let i = 0; i < qty; i++) {
        units.push({ id: `${item.id}-${i}`, name: item.name || item.item_name, price: unitPrice })
      }
    }
    return units
  }

  function toggleAssignment(unitId: string, person: string) {
    setAssignments(prev => {
      const current = new Set(prev[unitId] || [])
      if (current.has(person)) current.delete(person)
      else current.add(person)
      return { ...prev, [unitId]: current }
    })
  }

  function addPerson() {
    const name = newPersonName.trim() || `Person ${people.length + 1}`
    setPeople([...people, name])
    setNewPersonName('')
  }

  function removePerson(name: string) {
    setPeople(people.filter(p => p !== name))
    setAssignments(prev => {
      const updated: Record<string, Set<string>> = {}
      for (const [unitId, assigned] of Object.entries(prev)) {
        const next = new Set(assigned)
        next.delete(name)
        updated[unitId] = next
      }
      return updated
    })
  }

  function calculateTotals(): { perPerson: Record<string, number>; unassignedTotal: number } {
    const units = getBillUnits()
    const perPerson: Record<string, number> = {}
    people.forEach(p => { perPerson[p] = 0 })
    let unassignedTotal = 0

    for (const unit of units) {
      const assigned = assignments[unit.id]
      if (!assigned || assigned.size === 0) {
        unassignedTotal += unit.price
        continue
      }
      const share = unit.price / assigned.size
      assigned.forEach(person => {
        if (perPerson[person] !== undefined) perPerson[person] += share
      })
    }

    if (splitExtrasEvenly && people.length > 0) {
      const itemsSubtotal = getBillUnits().reduce((s, u) => s + u.price, 0)
      const extras = Math.max(0, (order?.total || 0) - itemsSubtotal)
      const extraShare = extras / people.length
      people.forEach(p => { perPerson[p] += extraShare })
    }

    return { perPerson, unassignedTotal }
  }

  const statusInfo: Record<string, { label: string, color: string, icon: string, desc: string }> = {
    pending: { label: 'Waiting for restaurant', color: '#f97316', icon: '⏳', desc: 'Your order has been sent to the restaurant and is waiting to be accepted.' },
    accepted: { label: 'Order accepted', color: '#22c55e', icon: '✅', desc: 'The restaurant has accepted your order and is preparing it.' },
    waiting_payment: { label: 'Awaiting payment', color: '#3b82f6', icon: '💳', desc: 'Your order is ready - please complete your payment.' },
    paid: { label: 'Paid & preparing', color: '#22c55e', icon: '🍳', desc: 'Payment confirmed! The restaurant is preparing your order.' },
    complete: { label: 'Delivered', color: '#22c55e', icon: '🎉', desc: 'Your order has been delivered. Enjoy your meal!' },
    rejected: { label: 'Order rejected', color: '#ef4444', icon: '❌', desc: 'Unfortunately the restaurant could not accept your order. You have not been charged.' },
    cancelled: { label: 'Cancelled', color: '#ef4444', icon: '❌', desc: 'This order was cancelled. You have not been charged.' },
  }

  const bg = '#080c14'
  const card = '#0d1321'
  const border = 'rgba(255,255,255,0.07)'
  const text = '#f1f5f9'
  const sub = '#64748b'

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: bg, minHeight: '100vh', color: text }}>
      <nav style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Syne,sans-serif', fontSize: '20px', fontWeight: 800, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: text }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: sub, textDecoration: 'none' }}>Back to home</Link>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>Track your order</h1>
        <p style={{ color: sub, marginBottom: '32px', fontSize: '14px' }}>Enter your order number and phone number to check your order status.</p>

        <div style={{ background: card, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Order Number</label>
              <input placeholder="e.g. FM-ABC123" value={orderNumber} onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as any, letterSpacing: '1px', fontWeight: 600 }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: sub, display: 'block', marginBottom: '6px', fontWeight: 600 }}>Phone Number</label>
              <input placeholder="The number you used to order" value={phone} onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: text, fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as any }} />
            </div>
            {error && <div style={{ fontSize: '13px', color: '#ef4444', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>{error}</div>}
            <button onClick={trackOrder} disabled={loading}
              style={{ width: '100%', padding: '14px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Searching...' : 'Track Order'}
            </button>
          </div>
        </div>

        {order && (() => {
          const status = statusInfo[order.status] || { label: order.status, color: '#64748b', icon: '📦', desc: '' }
          return (
            <div style={{ background: card, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '40px' }}>{status.icon}</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: status.color }}>{status.label}</div>
                  <div style={{ fontSize: '13px', color: sub, marginTop: '4px' }}>{status.desc}</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px', display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: sub }}>Order number</span>
                  <strong style={{ fontFamily: 'monospace' }}>{order.order_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: sub }}>Restaurant</span>
                  <strong>{order.restaurants?.emoji} {order.restaurants?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: sub }}>Order type</span>
                  <strong>{order.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Collection'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: sub }}>Payment</span>
                  <strong>{order.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <span>Total</span>
                  <span style={{ color: '#22c55e' }}>GBP{order.total?.toFixed(2)}</span>
                </div>
                <a href={`/api/invoice/order?orderId=${order.id}&phone=${encodeURIComponent(phone)}`} target="_blank"
                  style={{ display: 'block', textAlign: 'center', marginTop: '8px', padding: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                  Download Receipt
                </a>
                {items.length > 0 && (
                  <button onClick={() => setShowSplitter(!showSplitter)}
                    style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {showSplitter ? 'Hide bill splitter' : '🧾 Split the bill'}
                  </button>
                )}
              </div>

              {showSplitter && (() => {
                const units = getBillUnits()
                const { perPerson, unassignedTotal } = calculateTotals()
                return (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '16px', paddingTop: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>Split the bill</h3>
                    <p style={{ fontSize: '12px', color: sub, marginBottom: '16px' }}>Add everyone in your group, then tap who had what. Shared dishes split evenly between everyone selected for that item.</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                      {people.map(p => (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`, borderRadius: '8px', padding: '6px 10px', fontSize: '13px' }}>
                          {p}
                          <button onClick={() => removePerson(p)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', padding: 0 }}>×</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                      <input placeholder="Add a name..." value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()}
                        style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${border}`, borderRadius: '8px', color: text, fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                      <button onClick={addPerson} style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
                    </div>

                    <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                      {units.map(unit => (
                        <div key={unit.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span>{unit.name}</span>
                            <span style={{ color: sub }}>GBP{unit.price.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {people.map(p => {
                              const isSelected = assignments[unit.id]?.has(p)
                              return (
                                <button key={p} onClick={() => toggleAssignment(unit.id, p)}
                                  style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${isSelected ? '#22c55e' : border}`, background: isSelected ? 'rgba(34,197,94,0.15)' : 'transparent', color: isSelected ? '#22c55e' : sub, fontSize: '12px', fontWeight: isSelected ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {p}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {people.length > 1 && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: sub, marginBottom: '16px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={splitExtrasEvenly} onChange={e => setSplitExtrasEvenly(e.target.checked)} />
                        Split delivery fee/tip evenly across everyone
                      </label>
                    )}

                    <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Who owes what</div>
                      {people.map(p => (
                        <div key={p} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                          <span>{p}</span>
                          <strong>GBP{(perPerson[p] || 0).toFixed(2)}</strong>
                        </div>
                      ))}
                      {unassignedTotal > 0.01 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f97316', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <span>Not yet assigned to anyone</span>
                          <strong>GBP{unassignedTotal.toFixed(2)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })()}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: sub }}>
          Have an account? <Link href="/account" style={{ color: '#22c55e', textDecoration: 'none' }}>View all your orders</Link>
        </p>
      </div>
    </div>
  )
}
