'use client'

import React, { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

const ELEMENTS = [
  { type: 'order_number', label: '# Order Number', conditional: false },
  { type: 'customer_name', label: '👤 Customer Name', conditional: false },
  { type: 'items_list', label: '📦 Items + Extras', conditional: false },
  { type: 'total', label: '💷 Total', conditional: false },
  { type: 'subtotal', label: '💷 Subtotal + Fees', conditional: false },
  { type: 'restaurant_name', label: '🏪 Restaurant Name', conditional: false },
  { type: 'delivery_address', label: '📍 Delivery Address', conditional: false },
  { type: 'phone', label: '📞 Phone Number', conditional: false },
  { type: 'datetime', label: '⏰ Date & Time', conditional: false },
  { type: 'order_type', label: '🚗 Order Type', conditional: false },
  { type: 'special_instructions', label: '📝 Special Instructions', conditional: false },
  { type: 'divider', label: '➖ Divider Line', conditional: false },
  { type: 'spacer', label: '⬜ Spacer', conditional: false },
  { type: 'custom_text', label: '✏️ Custom Text', conditional: false },
  { type: 'preorder_badge', label: '📅 PRE-ORDER Badge', conditional: true },
  { type: 'preorder_time', label: '🕐 Scheduled Time', conditional: true },
  { type: 'contactless', label: '🚪 Contactless Delivery', conditional: true },
  { type: 'tip', label: '💰 Driver Tip', conditional: true },
  { type: 'payment_method', label: '💳 Payment Method', conditional: false },
]

const SAMPLE_ORDER = {
  order_number: 'FM-2024-001',
  customer_name: 'John Smith',
  customer_phone: '07700 900123',
  delivery_address: '12 Le Vauquiedor\nSt Andrews\nGuernsey GY6 8TP',
  order_type: 'delivery',
  contactless_delivery: true,
  scheduled_for: new Date(Date.now() + 3600000).toISOString(),
  special_instructions: 'Extra sauce please, no onions',
  restaurant_name: 'The Grand Bistro',
  subtotal: 24.50,
  delivery_fee: 2.50,
  tip: 2.00,
  total: 29.00,
  items: [
    { quantity: 2, name: 'Margherita Pizza', price: 10.00, special_instructions: 'Extra cheese, thin crust' },
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

function renderElement(el: any, order: any = SAMPLE_ORDER, printerWidth: number = 80) {
  const scale = printerWidth === 58 ? 0.75 : 1
  const sizeMap: any = {
    small: Math.round(10 * scale) + 'px',
    medium: Math.round(12 * scale) + 'px',
    large: Math.round(15 * scale) + 'px',
    xl: Math.round(18 * scale) + 'px',
    xxl: Math.round(24 * scale) + 'px',
    xxxl: Math.round(32 * scale) + 'px',
  }
  const fontSize = sizeMap[el.size] || sizeMap.medium
  const style: any = {
    fontSize,
    fontWeight: el.bold ? 700 : 400,
    textAlign: el.align || 'left',
    textTransform: el.caps ? 'uppercase' : 'none',
    fontFamily: '"Courier New", Courier, monospace',
    width: '100%',
    padding: '1px 0',
    lineHeight: 1.4,
    wordBreak: 'break-word',
    color: '#000',
  }

  const isPreOrder = !!order.scheduled_for
  const isContactless = !!order.contactless_delivery

  switch (el.type) {
    case 'order_number': return <div style={style}>{order.order_number}</div>
    case 'customer_name': return <div style={style}>{order.customer_name}</div>
    case 'phone': return <div style={style}>{order.customer_phone}</div>
    case 'delivery_address': return <div style={{ ...style, whiteSpace: 'pre-line' }}>{order.delivery_address}</div>
    case 'order_type': return <div style={style}>{order.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}</div>
    case 'restaurant_name': return <div style={style}>{order.restaurant_name}</div>
    case 'datetime': return <div style={style}>{new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    case 'subtotal': return (
      <div style={style}>
        <div>Subtotal: GBP{order.subtotal?.toFixed(2)}</div>
        {order.delivery_fee > 0 && <div>Delivery: GBP{order.delivery_fee?.toFixed(2)}</div>}
        {order.tip > 0 && <div>Tip: GBP{order.tip?.toFixed(2)}</div>}
      </div>
    )
    case 'total': return <div style={style}>TOTAL: GBP{order.total?.toFixed(2)}</div>
    case 'special_instructions': return order.special_instructions ? (
      <div style={style}>
        <div style={{ fontWeight: 700 }}>** NOTES **</div>
        <div>{order.special_instructions}</div>
      </div>
    ) : null
    case 'custom_text': return <div style={style}>{el.text || 'Custom text here'}</div>
    case 'divider': return <div style={{ borderTop: '1px dashed #000', margin: '4px 0', width: '100%' }} />
    case 'spacer': return <div style={{ height: '10px' }} />
    case 'items_list': return (
      <div style={{ width: '100%' }}>
        {order.items?.map((item: any, i: number) => (
          <div key={i} style={{ marginBottom: '6px' }}>
            <div style={{ ...style, fontWeight: 700 }}>{item.quantity}x {item.name}</div>
            {item.special_instructions && <div style={{ ...style, fontSize: Math.round(10 * scale) + 'px', paddingLeft: '10px', fontStyle: 'italic' }}>→ {item.special_instructions}</div>}
          </div>
        ))}
      </div>
    )
    case 'preorder_badge': return isPreOrder ? (
      <div style={{ ...style, background: '#000', color: '#fff', padding: '4px 8px', margin: '3px 0', textAlign: 'center' }}>
        *** PRE-ORDER ***
      </div>
    ) : null
    case 'preorder_time': return isPreOrder ? (
      <div style={{ ...style, fontWeight: 700 }}>
        Ready: {new Date(order.scheduled_for).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
    ) : null
    case 'contactless': return isContactless ? (
      <div style={{ ...style, background: '#000', color: '#fff', padding: '4px 8px', margin: '3px 0', textAlign: 'center' }}>
        *** CONTACTLESS DELIVERY ***
      </div>
    ) : null
    case 'tip': return order.tip > 0 ? (
      <div style={{ ...style, fontSize: el.size === 'xl' ? '18px' : '14px', fontWeight: 'bold', textAlign: 'center', margin: '4px 0', padding: '4px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000' }}>
        *** TIP GBP{order.tip?.toFixed(2)} ***
      </div>
    ) : null
    case 'payment_method': return (
      <div style={{ ...style }}>
        {order.paymentMethod === 'cash' ? '💵 CASH ORDER' : '💳 CARD ORDER'}
      </div>
    )
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
  const [printerWidth, setPrinterWidth] = useState<58 | 80>(80)
  const [showPreOrder, setShowPreOrder] = useState(true)
  const [showContactless, setShowContactless] = useState(true)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  // Canvas width based on printer
  const canvasWidth = printerWidth === 80 ? 300 : 220

  React.useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const { data: rest } = await supabase.from('restaurants').select('printer_width').eq('id', restaurantId).single()
    if (rest?.printer_width) setPrinterWidth(rest.printer_width as 58 | 80)
    const { data } = await supabase.from('ticket_templates').select('*').eq('restaurant_id', restaurantId).order('created_at')
    if (data && data.length > 0) {
      setTemplates(data)
      setSelectedTemplate(data[0])
    }
  }

  async function saveAll() {
    setSaving(true)
    await supabase.from('restaurants').update({ printer_width: printerWidth }).eq('id', restaurantId)
    for (const t of templates) {
      const isDefault = ['kitchen', 'customer', 'delivery'].includes(t.id)
      if (isDefault) {
        const existing = await supabase.from('ticket_templates').select('id').eq('restaurant_id', restaurantId).eq('template_type', t.template_type).single()
        if (existing.data) {
          await supabase.from('ticket_templates').update({ name: t.name, copies: t.copies, elements: t.elements, updated_at: new Date().toISOString() }).eq('id', existing.data.id)
        } else {
          await supabase.from('ticket_templates').insert({ restaurant_id: restaurantId, name: t.name, template_type: t.template_type, copies: t.copies, elements: t.elements })
        }
      } else {
        await supabase.from('ticket_templates').upsert({ id: t.id.length < 10 ? undefined : t.id, restaurant_id: restaurantId, name: t.name, template_type: t.template_type, copies: t.copies, elements: t.elements, updated_at: new Date().toISOString() })
      }
    }
    setSaving(false)
    alert('Saved!')
  }

  function addElement(type: string) {
    const el = { id: Date.now().toString(), type, size: 'medium', bold: false, align: 'left', caps: false, text: type === 'custom_text' ? 'Your custom text here' : undefined }
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

  function updateTemplate(changes: any) {
    const updated = { ...selectedTemplate, ...changes }
    setSelectedTemplate(updated)
    setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t))
  }

  // DRAG AND DROP
  function handleDragStart(idx: number) { dragItem.current = idx }
  function handleDragEnter(idx: number) { dragOverItem.current = idx }
  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return
    const els = [...selectedTemplate.elements]
    const dragged = els.splice(dragItem.current, 1)[0]
    els.splice(dragOverItem.current, 0, dragged)
    dragItem.current = null
    dragOverItem.current = null
    const updated = { ...selectedTemplate, elements: els }
    setSelectedTemplate(updated)
    setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t))
  }

  function addTemplate() {
    const newT = { id: Date.now().toString(), name: 'New Template', template_type: 'custom', copies: 1, elements: [] }
    setTemplates(prev => [...prev, newT])
    setSelectedTemplate(newT)
    setSelectedElement(null)
  }

  async function deleteTemplate(id: string) {
    if (templates.length <= 1) return
    const remaining = templates.filter(t => t.id !== id)
    setTemplates(remaining)
    setSelectedTemplate(remaining[0])
    if (id.length > 10) await supabase.from('ticket_templates').delete().eq('id', id)
  }

  const sampleOrder = {
    ...SAMPLE_ORDER,
    scheduled_for: showPreOrder ? SAMPLE_ORDER.scheduled_for : null,
    contactless_delivery: showContactless,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#060b18', zIndex: 500, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* HEADER */}
      <div style={{ background: '#0d1321', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>🎫 Ticket Editor — {restaurantName}</div>
        </div>

        {/* PRINTER WIDTH */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Printer:</span>
          {([58, 80] as const).map(w => (
            <button key={w} onClick={async () => { setPrinterWidth(w) }} style={{ padding: '5px 10px', background: printerWidth === w ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${printerWidth === w ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: printerWidth === w ? '#22c55e' : '#94a3b8', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
              {w}mm
            </button>
          ))}
        </div>

        {/* PREVIEW TOGGLES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Preview:</span>
          <button onClick={() => setShowPreOrder(!showPreOrder)} style={{ padding: '5px 10px', background: showPreOrder ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showPreOrder ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`, color: showPreOrder ? '#3b82f6' : '#94a3b8', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
            📅 Pre-Order
          </button>
          <button onClick={() => setShowContactless(!showContactless)} style={{ padding: '5px 10px', background: showContactless ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showContactless ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`, color: showContactless ? '#3b82f6' : '#94a3b8', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
            🚪 Contactless
          </button>
        </div>

        <button onClick={saveAll} disabled={saving} style={{ padding: '8px 20px', background: '#22c55e', border: 'none', color: '#0a0f1e', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving...' : '💾 Save All'}
        </button>
        <button onClick={onClose} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>✕ Close</button>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 260px', overflow: 'hidden' }}>

        {/* LEFT - TEMPLATES */}
        <div style={{ background: '#0a0f1e', borderRight: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Templates</div>
          {templates.map(t => (
            <div key={t.id} onClick={() => { setSelectedTemplate(t); setSelectedElement(null) }} style={{ background: selectedTemplate?.id === t.id ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedTemplate?.id === t.id ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', padding: '10px', marginBottom: '6px', cursor: 'pointer' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: selectedTemplate?.id === t.id ? '#22c55e' : '#f8fafc', marginBottom: '4px' }}>{t.name}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{t.elements?.length || 0} elements</div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Copies:</span>
                <select value={t.copies} onChange={e => { const val = parseInt(e.target.value); const upd = {...t, copies: val}; setTemplates(prev => prev.map(tp => tp.id === t.id ? upd : tp)); if (selectedTemplate?.id === t.id) setSelectedTemplate(upd) }} style={{ flex: 1, padding: '3px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f8fafc', fontSize: '11px', outline: 'none' }}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={() => deleteTemplate(t.id)} style={{ padding: '3px 6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
          <button onClick={addTemplate} style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>+ New Template</button>
        </div>

        {/* MIDDLE - CANVAS */}
        <div style={{ background: '#060b18', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Template name */}
          <div style={{ width: canvasWidth + 32, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input value={selectedTemplate?.name || ''} onChange={e => updateTemplate({ name: e.target.value })} style={{ flex: 1, background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '16px', fontWeight: 700, outline: 'none' }} />
            <span style={{ fontSize: '11px', color: '#64748b' }}>{printerWidth}mm • {selectedTemplate?.copies} cop{selectedTemplate?.copies === 1 ? 'y' : 'ies'}</span>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>🖱️ Drag elements to reorder • Click to edit</div>

          {/* TICKET CANVAS */}
          <div style={{ background: 'white', borderRadius: '4px', padding: '16px', width: canvasWidth, minHeight: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', transition: 'width 0.3s' }}>
            <div style={{ fontSize: '9px', color: '#999', textAlign: 'center', marginBottom: '8px', fontFamily: 'monospace', letterSpacing: '2px' }}>{'─'.repeat(printerWidth === 80 ? 32 : 24)}</div>
            {selectedTemplate?.elements?.length === 0 && (
              <div style={{ textAlign: 'center', color: '#ccc', fontSize: '12px', padding: '40px 0' }}>← Add elements from the right panel</div>
            )}
            {selectedTemplate?.elements?.map((el: any, idx: number) => (
              <div
                key={el.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={e => e.preventDefault()}
                onClick={() => setSelectedElement(selectedElement?.id === el.id ? null : el)}
                style={{
                  position: 'relative',
                  cursor: 'grab',
                  padding: '3px 4px',
                  border: `2px solid ${selectedElement?.id === el.id ? '#3b82f6' : 'transparent'}`,
                  borderRadius: '4px',
                  marginBottom: '2px',
                  background: selectedElement?.id === el.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                  userSelect: 'none',
                }}
              >
                {renderElement(el, sampleOrder, printerWidth)}
                {selectedElement?.id === el.id && (
                  <div style={{ position: 'absolute', right: '2px', top: '2px', display: 'flex', gap: '2px', zIndex: 10 }}>
                    <button onClick={e => { e.stopPropagation(); removeElement(el.id) }} style={{ background: '#ef4444', border: 'none', color: 'white', width: '18px', height: '18px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                )}
              </div>
            ))}
            <div style={{ fontSize: '9px', color: '#999', textAlign: 'center', marginTop: '8px', fontFamily: 'monospace', letterSpacing: '2px' }}>{'─'.repeat(printerWidth === 80 ? 32 : 24)}</div>
          </div>
        </div>

        {/* RIGHT - ELEMENTS + PROPERTIES */}
        <div style={{ background: '#0a0f1e', borderLeft: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: '14px' }}>

          {/* ELEMENT PROPERTIES */}
          {selectedElement && (
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Edit: {ELEMENTS.find(e => e.type === selectedElement.type)?.label || selectedElement.type}
              </div>

              {selectedElement.type === 'custom_text' && (
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Text</label>
                  <textarea value={selectedElement.text || ''} onChange={e => updateElement(selectedElement.id, { text: e.target.value })} rows={2} style={{ width: '100%', padding: '6px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                </div>
              )}

              {!['divider','spacer'].includes(selectedElement.type) && (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Size</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px' }}>
                      {['small','medium','large','xl','xxl','xxxl'].map(s => (
                        <button key={s} onClick={() => updateElement(selectedElement.id, { size: s })} style={{ padding: '6px 2px', background: selectedElement.size === s ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${selectedElement.size === s ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: selectedElement.size === s ? '#22c55e' : '#94a3b8', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Align</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px' }}>
                      {[['left','⬅ Left'],['center','↔ Centre'],['right','➡ Right']].map(([a,l]) => (
                        <button key={a} onClick={() => updateElement(selectedElement.id, { align: a })} style={{ padding: '6px 2px', background: selectedElement.align === a ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${selectedElement.align === a ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: selectedElement.align === a ? '#22c55e' : '#94a3b8', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>{l}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <button onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })} style={{ padding: '8px', background: selectedElement.bold ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${selectedElement.bold ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: selectedElement.bold ? '#22c55e' : '#94a3b8', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                      Bold {selectedElement.bold ? '✓' : ''}
                    </button>
                    <button onClick={() => updateElement(selectedElement.id, { caps: !selectedElement.caps })} style={{ padding: '8px', background: selectedElement.caps ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${selectedElement.caps ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: selectedElement.caps ? '#22c55e' : '#94a3b8', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                      CAPS {selectedElement.caps ? '✓' : ''}
                    </button>
                  </div>
                </>
              )}

              <button onClick={() => { removeElement(selectedElement.id); setSelectedElement(null) }} style={{ width: '100%', padding: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                Remove Element
              </button>
            </div>
          )}

          {/* ADD ELEMENTS */}
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Add Elements</div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>STANDARD</div>
            {ELEMENTS.filter(e => !e.conditional).map(el => (
              <button key={el.type} onClick={() => addElement(el.type)} style={{ display: 'block', width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', marginBottom: '3px', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              >
                {el.label}
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: '10px', color: '#f97316', fontWeight: 600, marginBottom: '6px' }}>CONDITIONAL</div>
            <div style={{ fontSize: '10px', color: '#475569', marginBottom: '6px' }}>Only prints when applicable</div>
            {ELEMENTS.filter(e => e.conditional).map(el => (
              <button key={el.type} onClick={() => addElement(el.type)} style={{ display: 'block', width: '100%', padding: '7px 10px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: '6px', color: '#f97316', fontSize: '12px', cursor: 'pointer', marginBottom: '3px', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.05)')}
              >
                {el.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
