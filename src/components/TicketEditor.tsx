'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const ELEMENTS = [
  { type: 'order_number', label: '# Order Number', icon: '🔢', conditional: false },
  { type: 'customer_name', label: '👤 Customer Name', icon: '👤', conditional: false },
  { type: 'items_list', label: '📦 Items + Extras', icon: '📦', conditional: false },
  { type: 'total', label: '💷 Total', icon: '💷', conditional: false },
  { type: 'subtotal', label: '💷 Subtotal', icon: '💷', conditional: false },
  { type: 'restaurant_name', label: '🏪 Restaurant Name', icon: '🏪', conditional: false },
  { type: 'delivery_address', label: '📍 Delivery Address', icon: '📍', conditional: false },
  { type: 'phone', label: '📞 Phone Number', icon: '📞', conditional: false },
  { type: 'datetime', label: '⏰ Date & Time', icon: '⏰', conditional: false },
  { type: 'order_type', label: '🚗 Order Type', icon: '🚗', conditional: false },
  { type: 'special_instructions', label: '📝 Special Instructions', icon: '📝', conditional: false },
  { type: 'preorder_badge', label: '📅 PRE-ORDER Badge', icon: '📅', conditional: true },
  { type: 'preorder_time', label: '🕐 Scheduled Time', icon: '🕐', conditional: true },
  { type: 'contactless', label: '🚪 Contactless Delivery', icon: '🚪', conditional: true },
  { type: 'divider', label: '➖ Divider Line', icon: '➖', conditional: false },
  { type: 'spacer', label: '⬜ Spacer', icon: '⬜', conditional: false },
  { type: 'custom_text', label: '✏️ Custom Text', icon: '✏️', conditional: false },
]

const SAMPLE_ORDER = {
  order_number: 'FM-2024-001',
  customer_name: 'John Smith',
  customer_phone: '07700 900123',
  delivery_address: '12 Le Vauquiedor, St Andrews, Guernsey',
  order_type: 'delivery',
  contactless_delivery: true,
  scheduled_for: '2024-06-15T18:00:00',
  special_instructions: 'Extra sauce please',
  subtotal: 24.50,
  delivery_fee: 2.50,
  tip: 2.00,
  total: 29.00,
  items: [
    { quantity: 2, name: 'Margherita Pizza', price: 10.00, special_instructions: 'Extra cheese' },
    { quantity: 1, name: 'Garlic Bread', price: 3.50, special_instructions: '' },
    { quantity: 1, name: 'Coca Cola', price: 1.50, special_instructions: '' },
  ]
}

const DEFAULT_TEMPLATES = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    template_type: 'kitchen',
    copies: 1,
    elements: [
      { id: '1', type: 'preorder_badge', size: 'xl', bold: true, align: 'center', caps: true },
      { id: '2', type: 'preorder_time', size: 'large', bold: true, align: 'center', caps: false },
      { id: '3', type: 'divider' },
      { id: '4', type: 'order_number', size: 'xl', bold: true, align: 'center', caps: true },
      { id: '5', type: 'customer_name', size: 'large', bold: true, align: 'left', caps: false },
      { id: '6', type: 'order_type', size: 'medium', bold: false, align: 'left', caps: false },
      { id: '7', type: 'divider' },
      { id: '8', type: 'items_list', size: 'large', bold: false, align: 'left', caps: false },
      { id: '9', type: 'divider' },
      { id: '10', type: 'special_instructions', size: 'medium', bold: false, align: 'left', caps: false },
      { id: '11', type: 'datetime', size: 'small', bold: false, align: 'right', caps: false },
    ]
  },
  {
    id: 'customer',
    name: 'Customer Receipt',
    template_type: 'customer',
    copies: 1,
    elements: [
      { id: '1', type: 'restaurant_name', size: 'xl', bold: true, align: 'center', caps: true },
      { id: '2', type: 'divider' },
      { id: '3', type: 'preorder_badge', size: 'large', bold: true, align: 'center', caps: true },
      { id: '4', type: 'preorder_time', size: 'medium', bold: false, align: 'center', caps: false },
      { id: '5', type: 'order_number', size: 'large', bold: true, align: 'center', caps: false },
      { id: '6', type: 'customer_name', size: 'medium', bold: false, align: 'left', caps: false },
      { id: '7', type: 'datetime', size: 'small', bold: false, align: 'left', caps: false },
      { id: '8', type: 'divider' },
      { id: '9', type: 'items_list', size: 'medium', bold: false, align: 'left', caps: false },
      { id: '10', type: 'divider' },
      { id: '11', type: 'subtotal', size: 'medium', bold: false, align: 'right', caps: false },
      { id: '12', type: 'total', size: 'large', bold: true, align: 'right', caps: false },
      { id: '13', type: 'divider' },
      { id: '14', type: 'custom_text', size: 'small', bold: false, align: 'center', caps: false, text: 'Thank you for your order!' },
    ]
  },
  {
    id: 'delivery',
    name: 'Delivery Label',
    template_type: 'delivery',
    copies: 1,
    elements: [
      { id: '1', type: 'contactless', size: 'xl', bold: true, align: 'center', caps: true },
      { id: '2', type: 'preorder_badge', size: 'large', bold: true, align: 'center', caps: true },
      { id: '3', type: 'preorder_time', size: 'medium', bold: true, align: 'center', caps: false },
      { id: '4', type: 'divider' },
      { id: '5', type: 'order_number', size: 'xl', bold: true, align: 'center', caps: true },
      { id: '6', type: 'customer_name', size: 'large', bold: true, align: 'left', caps: false },
      { id: '7', type: 'phone', size: 'medium', bold: false, align: 'left', caps: false },
      { id: '8', type: 'divider' },
      { id: '9', type: 'delivery_address', size: 'large', bold: true, align: 'left', caps: false },
      { id: '10', type: 'divider' },
      { id: '11', type: 'total', size: 'large', bold: true, align: 'right', caps: false },
      { id: '12', type: 'datetime', size: 'small', bold: false, align: 'right', caps: false },
    ]
  }
]

function renderElement(el: any, order: any = SAMPLE_ORDER) {
  const sizeMap: any = { small: '11px', medium: '13px', large: '16px', xl: '20px' }
  const fontSize = sizeMap[el.size] || '13px'
  const style: any = {
    fontSize,
    fontWeight: el.bold ? 700 : 400,
    textAlign: el.align || 'left',
    textTransform: el.caps ? 'uppercase' : 'none',
    fontFamily: 'monospace',
    width: '100%',
    padding: '1px 0',
  }

  const isPreOrder = !!order.scheduled_for
  const isContactless = !!order.contactless_delivery

  switch (el.type) {
    case 'order_number': return <div style={style}>{order.order_number}</div>
    case 'customer_name': return <div style={style}>{order.customer_name}</div>
    case 'phone': return <div style={style}>{order.customer_phone}</div>
    case 'delivery_address': return <div style={style}>{order.delivery_address}</div>
    case 'order_type': return <div style={style}>{order.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}</div>
    case 'restaurant_name': return <div style={style}>{order.restaurant_name || 'Restaurant Name'}</div>
    case 'datetime': return <div style={style}>{new Date().toLocaleString('en-GB')}</div>
    case 'subtotal': return <div style={style}>Subtotal: GBP{order.subtotal?.toFixed(2)}{order.delivery_fee ? ` | Delivery: GBP${order.delivery_fee?.toFixed(2)}` : ''}</div>
    case 'total': return <div style={style}>TOTAL: GBP{order.total?.toFixed(2)}</div>
    case 'special_instructions': return order.special_instructions ? <div style={style}>Note: {order.special_instructions}</div> : null
    case 'custom_text': return <div style={style}>{el.text || 'Custom text here'}</div>
    case 'divider': return <div style={{ borderTop: '1px dashed #000', margin: '4px 0', width: '100%' }} />
    case 'spacer': return <div style={{ height: '8px' }} />
    case 'items_list': return (
      <div style={{ width: '100%' }}>
        {order.items?.map((item: any, i: number) => (
          <div key={i} style={{ ...style, marginBottom: '4px' }}>
            <div>{item.quantity}x {item.name}</div>
            {item.special_instructions && <div style={{ fontSize: '11px', paddingLeft: '12px' }}>→ {item.special_instructions}</div>}
          </div>
        ))}
      </div>
    )
    case 'preorder_badge': return isPreOrder ? (
      <div style={{ ...style, background: '#000', color: '#fff', padding: '4px 8px', margin: '2px 0' }}>
        📅 PRE-ORDER
      </div>
    ) : null
    case 'preorder_time': return isPreOrder ? (
      <div style={style}>
        🕐 Ready: {new Date(order.scheduled_for).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
    ) : null
    case 'contactless': return isContactless ? (
      <div style={{ ...style, background: '#000', color: '#fff', padding: '4px 8px', margin: '2px 0' }}>
        🚪 CONTACTLESS DELIVERY
      </div>
    ) : null
    default: return null
  }
}

interface TicketEditorProps {
  restaurantId: string
  restaurantName: string
  onClose: () => void
}

export function TicketEditor({ restaurantId, restaurantName, onClose }: TicketEditorProps) {
  const supabase = createClient()
  const [templates, setTemplates] = useState<any[]>(DEFAULT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(DEFAULT_TEMPLATES[0])
  const [selectedElement, setSelectedElement] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  React.useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    const { data } = await supabase.from('ticket_templates').select('*').eq('restaurant_id', restaurantId).order('created_at')
    if (data && data.length > 0) {
      setTemplates(data)
      setSelectedTemplate(data[0])
    }
    setLoading(false)
  }

  async function saveTemplates() {
    setSaving(true)
    for (const t of templates) {
      if (t.id && !['kitchen','customer','delivery'].includes(t.id)) {
        await supabase.from('ticket_templates').upsert({ ...t, restaurant_id: restaurantId, updated_at: new Date().toISOString() })
      } else {
        const { data } = await supabase.from('ticket_templates').upsert({ ...t, id: undefined, restaurant_id: restaurantId, updated_at: new Date().toISOString() }).select().single()
        if (data) setTemplates(prev => prev.map(tp => tp.id === t.id ? data : tp))
      }
    }
    setSaving(false)
    alert('Templates saved!')
  }

  function addElement(type: string) {
    const el = { id: Date.now().toString(), type, size: 'medium', bold: false, align: 'left', caps: false, text: type === 'custom_text' ? 'Custom text' : undefined }
    const updated = { ...selectedTemplate, elements: [...(selectedTemplate.elements || []), el] }
    setSelectedTemplate(updated)
    setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t))
    setSelectedElement(el)
  }

  function removeElement(id: string) {
    const updated = { ...selectedTemplate, elements: selectedTemplate.elements.filter((e: any) => e.id !== id) }
    setSelectedTemplate(updated)
    setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t))
    setSelectedElement(null)
  }

  function updateElement(id: string, changes: any) {
    const updated = { ...selectedTemplate, elements: selectedTemplate.elements.map((e: any) => e.id === id ? { ...e, ...changes } : e) }
    setSelectedTemplate(updated)
    setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t))
    setSelectedElement((prev: any) => prev?.id === id ? { ...prev, ...changes } : prev)
  }

  function moveElement(id: string, dir: 'up' | 'down') {
    const els = [...selectedTemplate.elements]
    const idx = els.findIndex((e: any) => e.id === id)
    if (dir === 'up' && idx > 0) { [els[idx-1], els[idx]] = [els[idx], els[idx-1]] }
    if (dir === 'down' && idx < els.length-1) { [els[idx+1], els[idx]] = [els[idx], els[idx+1]] }
    const updated = { ...selectedTemplate, elements: els }
    setSelectedTemplate(updated)
    setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t))
  }

  function addTemplate() {
    const newT = { id: Date.now().toString(), name: 'New Template', template_type: 'custom', copies: 1, elements: [] }
    setTemplates(prev => [...prev, newT])
    setSelectedTemplate(newT)
  }

  function deleteTemplate(id: string) {
    if (templates.length <= 1) return alert('Must have at least one template')
    const remaining = templates.filter(t => t.id !== id)
    setTemplates(remaining)
    setSelectedTemplate(remaining[0])
    supabase.from('ticket_templates').delete().eq('id', id)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#060b18', zIndex: 500, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      {/* HEADER */}
      <div style={{ background: '#0d1321', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>🎫 Ticket Editor</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{restaurantName}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowPreview(!showPreview)} style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button onClick={saveTemplates} disabled={saving} style={{ padding: '8px 16px', background: '#22c55e', border: 'none', color: '#0a0f1e', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save All'}
          </button>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: showPreview ? '220px 1fr 260px 280px' : '220px 1fr 260px', overflow: 'hidden' }}>

        {/* LEFT - TEMPLATE LIST */}
        <div style={{ background: '#0a0f1e', borderRight: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Templates</div>
          {templates.map(t => (
            <div key={t.id} onClick={() => { setSelectedTemplate(t); setSelectedElement(null) }} style={{ background: selectedTemplate?.id === t.id ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedTemplate?.id === t.id ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '6px', cursor: 'pointer' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: selectedTemplate?.id === t.id ? '#22c55e' : '#f8fafc' }}>{t.name}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                {t.elements?.length || 0} elements • {t.copies} cop{t.copies === 1 ? 'y' : 'ies'}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <select value={t.copies} onChange={e => { const updated = {...t, copies: parseInt(e.target.value)}; setTemplates(prev => prev.map(tp => tp.id === t.id ? updated : tp)); if (selectedTemplate?.id === t.id) setSelectedTemplate(updated) }} onClick={e => e.stopPropagation()} style={{ flex: 1, padding: '4px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f8fafc', fontSize: '11px', outline: 'none' }}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} cop{n===1?'y':'ies'}</option>)}
                </select>
                <button onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
          <button onClick={addTemplate} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: '#64748b', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>+ New Template</button>
        </div>

        {/* MIDDLE - CANVAS / ELEMENT LIST */}
        <div style={{ background: '#060b18', overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <input value={selectedTemplate?.name || ''} onChange={e => { const updated = {...selectedTemplate, name: e.target.value}; setSelectedTemplate(updated); setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t)) }} style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '18px', fontWeight: 700, outline: 'none', width: '200px' }} />
            </div>
          </div>

          {/* ELEMENT CANVAS */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '16px', width: '300px', margin: '0 auto', minHeight: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '10px', color: '#999', textAlign: 'center', marginBottom: '8px', fontFamily: 'monospace' }}>── THERMAL TICKET ──</div>
            {selectedTemplate?.elements?.length === 0 && (
              <div style={{ textAlign: 'center', color: '#ccc', fontSize: '12px', padding: '40px 0' }}>Add elements from the right panel</div>
            )}
            {selectedTemplate?.elements?.map((el: any) => (
              <div key={el.id} onClick={() => setSelectedElement(selectedElement?.id === el.id ? null : el)} style={{ position: 'relative', cursor: 'pointer', padding: '3px', border: `2px solid ${selectedElement?.id === el.id ? '#3b82f6' : 'transparent'}`, borderRadius: '4px', marginBottom: '2px', background: selectedElement?.id === el.id ? 'rgba(59,130,246,0.05)' : 'transparent' }}>
                {renderElement(el)}
                {selectedElement?.id === el.id && (
                  <div style={{ position: 'absolute', right: '2px', top: '2px', display: 'flex', gap: '2px' }}>
                    <button onClick={e => { e.stopPropagation(); moveElement(el.id, 'up') }} style={{ background: '#3b82f6', border: 'none', color: 'white', width: '18px', height: '18px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
                    <button onClick={e => { e.stopPropagation(); moveElement(el.id, 'down') }} style={{ background: '#3b82f6', border: 'none', color: 'white', width: '18px', height: '18px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
                    <button onClick={e => { e.stopPropagation(); removeElement(el.id) }} style={{ background: '#ef4444', border: 'none', color: 'white', width: '18px', height: '18px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT - ADD ELEMENTS + PROPERTIES */}
        <div style={{ background: '#0a0f1e', borderLeft: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: '16px' }}>
          {/* ELEMENT PROPERTIES */}
          {selectedElement && (
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Element Settings</div>
              
              {selectedElement.type === 'custom_text' && (
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Text</label>
                  <input value={selectedElement.text || ''} onChange={e => updateElement(selectedElement.id, { text: e.target.value })} style={{ width: '100%', padding: '6px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', outline: 'none' }} />
                </div>
              )}

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Size</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px' }}>
                  {['small','medium','large','xl'].map(s => (
                    <button key={s} onClick={() => updateElement(selectedElement.id, { size: s })} style={{ padding: '5px 2px', background: selectedElement.size === s ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${selectedElement.size === s ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: selectedElement.size === s ? '#22c55e' : '#94a3b8', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>{s}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Align</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px' }}>
                  {['left','center','right'].map(a => (
                    <button key={a} onClick={() => updateElement(selectedElement.id, { align: a })} style={{ padding: '5px', background: selectedElement.align === a ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${selectedElement.align === a ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: selectedElement.align === a ? '#22c55e' : '#94a3b8', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                      {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })} style={{ padding: '6px', background: selectedElement.bold ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${selectedElement.bold ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: selectedElement.bold ? '#22c55e' : '#94a3b8', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>Bold {selectedElement.bold ? '✓' : ''}</button>
                <button onClick={() => updateElement(selectedElement.id, { caps: !selectedElement.caps })} style={{ padding: '6px', background: selectedElement.caps ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${selectedElement.caps ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: selectedElement.caps ? '#22c55e' : '#94a3b8', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>CAPS {selectedElement.caps ? '✓' : ''}</button>
              </div>
            </div>
          )}

          {/* ADD ELEMENTS */}
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Add Elements</div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', color: '#475569', marginBottom: '6px', fontWeight: 600 }}>STANDARD</div>
            {ELEMENTS.filter(e => !e.conditional).map(el => (
              <button key={el.type} onClick={() => addElement(el.type)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', marginBottom: '4px', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                {el.label}
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: '10px', color: '#f97316', marginBottom: '6px', fontWeight: 600 }}>CONDITIONAL (only prints when applicable)</div>
            {ELEMENTS.filter(e => e.conditional).map(el => (
              <button key={el.type} onClick={() => addElement(el.type)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: '6px', color: '#f97316', fontSize: '12px', cursor: 'pointer', marginBottom: '4px', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(249,115,22,0.05)'}
              >
                {el.label}
              </button>
            ))}
          </div>
        </div>

        {/* PREVIEW PANEL */}
        {showPreview && (
          <div style={{ background: '#0a0f1e', borderLeft: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Live Preview</div>
            <div style={{ fontSize: '10px', color: '#475569', marginBottom: '12px' }}>Showing with sample pre-order + contactless order</div>
            <div style={{ background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
              <div style={{ fontSize: '10px', color: '#999', textAlign: 'center', marginBottom: '8px' }}>── THERMAL TICKET ──</div>
              {selectedTemplate?.elements?.map((el: any) => (
                <div key={el.id}>{renderElement(el, SAMPLE_ORDER)}</div>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#475569' }}>
              {selectedTemplate?.copies} cop{selectedTemplate?.copies === 1 ? 'y' : 'ies'} will print
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
