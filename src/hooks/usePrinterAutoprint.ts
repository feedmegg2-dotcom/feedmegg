'use client'

import { useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface OrderForPrint {
  id: string
  orderNumber: string | number
  restaurantName: string
  customerName: string
  customerPhone?: string
  deliveryAddress?: string
  isCollection: boolean
  contactlessDelivery?: boolean
  isPreOrder?: boolean
  preOrderTime?: string
  items: Array<{ name: string; quantity: number; price: number; subtotal?: number; special_instructions?: string }>
  specialInstructions?: string
  subtotal: number
  deliveryFee?: number
  tip?: number
  total: number
  paymentMethod?: string
  orderType?: string
}

// ESC/POS helpers
const ESC = '\x1B', GS = '\x1D'
const INIT = ESC + '@'
const BOLD_ON = ESC + 'E\x01', BOLD_OFF = ESC + 'E\x00'
const ALIGN_LEFT = ESC + 'a\x00', ALIGN_CENTER = ESC + 'a\x01', ALIGN_RIGHT = ESC + 'a\x02'
const SIZE_NORMAL = GS + '!\x00', SIZE_DOUBLE_HEIGHT = GS + '!\x01', SIZE_DOUBLE = GS + '!\x11'
const CUT = GS + 'V\x41\x03', LF = '\n'

function rep(c: string, n: number) { return c.repeat(Math.max(0, n)) }
function lr(l: string, r: string, w = 42) { const s = w - l.length - r.length; return s <= 0 ? l + ' ' + r : l + rep(' ', s) + r }

function sizeCmd(size: string) {
  if (size === 'xl' || size === 'xxl' || size === 'xxxl') return SIZE_DOUBLE
  if (size === 'large') return SIZE_DOUBLE_HEIGHT
  return SIZE_NORMAL
}

function alignCmd(align: string) {
  if (align === 'center') return ALIGN_CENTER
  if (align === 'right') return ALIGN_RIGHT
  return ALIGN_LEFT
}

function decodeHtml(str: string): string {
  return (str || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function renderElementESCPOS(el: any, order: OrderForPrint, cols: number): string {
  let t = ''
  const bold = el.bold ? BOLD_ON : ''
  const boldOff = el.bold ? BOLD_OFF : ''
  const size = sizeCmd(el.size || 'medium')
  const align = alignCmd(el.align || 'left')
  const divider = rep('-', cols)

  switch (el.type) {
    case 'order_number':
      t += align + size + bold
      t += 'ORDER #' + String(order.orderNumber).slice(-6).toUpperCase() + LF
      t += boldOff + SIZE_NORMAL
      break
    case 'customer_name':
      t += align + size + bold + decodeHtml(order.customerName) + boldOff + SIZE_NORMAL + LF
      break
    case 'restaurant_name':
      t += align + size + bold + decodeHtml(order.restaurantName || 'Restaurant') + boldOff + SIZE_NORMAL + LF
      break
    case 'phone':
      if (order.customerPhone) t += align + size + bold + order.customerPhone + boldOff + SIZE_NORMAL + LF
      break
    case 'delivery_address':
      if (!order.isCollection && order.deliveryAddress) t += align + size + bold + order.deliveryAddress + boldOff + SIZE_NORMAL + LF
      break
    case 'order_type':
      t += align + size + bold + (order.isCollection ? 'COLLECTION' : 'DELIVERY') + boldOff + SIZE_NORMAL + LF
      break
    case 'items_list':
      order.items.forEach(item => {
        t += align + size + bold + item.quantity + 'x ' + item.name + boldOff + SIZE_NORMAL + LF
        if (item.special_instructions) t += ALIGN_LEFT + '  -> ' + item.special_instructions + LF
      })
      break
    case 'total':
      t += align + size + bold + lr('TOTAL:', 'GBP' + order.total.toFixed(2), cols) + boldOff + SIZE_NORMAL + LF
      break
    case 'subtotal':
      if (order.deliveryFee && order.deliveryFee > 0) {
        t += ALIGN_LEFT + lr('Subtotal:', 'GBP' + order.subtotal.toFixed(2), cols) + LF
        t += lr('Delivery:', 'GBP' + order.deliveryFee.toFixed(2), cols) + LF
      }
      if (order.tip && order.tip > 0) t += lr('Tip:', 'GBP' + order.tip.toFixed(2), cols) + LF
      break
    case 'special_instructions':
      if (order.specialInstructions) t += ALIGN_LEFT + BOLD_ON + '** NOTES **' + BOLD_OFF + LF + order.specialInstructions + LF
      break
    case 'datetime':
      t += align + new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + LF
      break
    case 'preorder_badge':
      if (order.isPreOrder) t += align + size + bold + '*** PRE-ORDER ***' + boldOff + SIZE_NORMAL + LF
      break
    case 'preorder_time':
      if (order.isPreOrder && order.preOrderTime) t += align + size + bold + 'For: ' + order.preOrderTime + boldOff + SIZE_NORMAL + LF
      break
    case 'contactless':
      if (order.contactlessDelivery) t += align + size + bold + 'CONTACTLESS DELIVERY' + boldOff + SIZE_NORMAL + LF
      break
    case 'divider':
      t += ALIGN_LEFT + divider + LF
      break
    case 'spacer':
      t += LF
      break
    case 'custom_text':
      if (el.text) t += align + size + bold + el.text + boldOff + SIZE_NORMAL + LF
      break
  }
  return t
}

function renderTemplate(template: any, order: OrderForPrint, cols: number): string {
  let ticket = INIT
  for (const el of (template.elements || [])) {
    ticket += renderElementESCPOS(el, order, cols)
  }
  ticket += LF + LF + LF + CUT
  return ticket
}

function strToHex(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += ('0' + str.charCodeAt(i).toString(16)).slice(-2)
  }
  return result
}

function printViaBrowser(order: OrderForPrint) {
  const printWindow = window.open('', '_blank', 'width=300,height=600')
  if (!printWindow) { alert('Please allow popups for printing'); return }
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 80mm auto; margin: 2mm; }
    @media print { body { width: 80mm; } }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; color: #000; padding: 2mm; }
    .center { text-align: center; } .right { text-align: right; }
    .bold { font-weight: bold; } .xl { font-size: 20px; } .lg { font-size: 16px; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; }
  </style></head><body>
    <div class="divider"></div>
    <div class="center xl bold">ORDER #${String(order.orderNumber).slice(-6).toUpperCase()}</div>
    <div class="lg bold">${order.customerName}</div>
    <div>${order.isCollection ? 'COLLECTION' : 'DELIVERY'}</div>
    <div class="divider"></div>
    ${order.items.map(i => `<div class="bold">${i.quantity}x ${i.name}</div>${i.special_instructions ? `<div style="padding-left:8px;font-style:italic">-> ${i.special_instructions}</div>` : ''}`).join('')}
    <div class="divider"></div>
    <div class="row xl bold"><span>TOTAL:</span><span>GBP${order.total.toFixed(2)}</span></div>
  </body></html>`
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print(); setTimeout(() => printWindow.close(), 1000) }, 500)
}

async function sendToPrinter(order: OrderForPrint, printerIp: string, printerWidth: number, templates?: any[]) {
  const cols = printerWidth === 58 ? 32 : 42

  // Use saved templates or fall back to defaults
  const defaultTemplates = [
    {
      template_type: 'kitchen', copies: 1,
      elements: [
        { type: 'preorder_badge', size: 'xl', bold: true, align: 'center' },
        { type: 'preorder_time', size: 'large', bold: true, align: 'center' },
        { type: 'contactless', size: 'xl', bold: true, align: 'center' },
        { type: 'divider' },
        { type: 'order_number', size: 'xl', bold: true, align: 'center' },
        { type: 'customer_name', size: 'large', bold: true, align: 'left' },
        { type: 'order_type', size: 'medium', bold: false, align: 'left' },
        { type: 'divider' },
        { type: 'items_list', size: 'large', bold: true, align: 'left' },
        { type: 'divider' },
        { type: 'special_instructions', size: 'medium', bold: false, align: 'left' },
        { type: 'datetime', size: 'small', bold: false, align: 'right' },
      ]
    },
    {
      template_type: 'customer', copies: 1,
      elements: [
        { type: 'restaurant_name', size: 'xl', bold: true, align: 'center' },
        { type: 'divider' },
        { type: 'preorder_badge', size: 'large', bold: true, align: 'center' },
        { type: 'preorder_time', size: 'medium', bold: false, align: 'center' },
        { type: 'order_number', size: 'large', bold: true, align: 'center' },
        { type: 'customer_name', size: 'medium', bold: false, align: 'left' },
        { type: 'datetime', size: 'small', bold: false, align: 'left' },
        { type: 'divider' },
        { type: 'items_list', size: 'medium', bold: false, align: 'left' },
        { type: 'divider' },
        { type: 'subtotal', size: 'medium', bold: false, align: 'right' },
        { type: 'total', size: 'large', bold: true, align: 'right' },
        { type: 'divider' },
        { type: 'custom_text', size: 'small', bold: false, align: 'center', text: 'Thank you for your order!' },
        { type: 'custom_text', size: 'small', bold: false, align: 'center', text: 'feedme.gg' },
      ]
    },
    {
      template_type: 'delivery', copies: 1,
      elements: [
        { type: 'contactless', size: 'xl', bold: true, align: 'center' },
        { type: 'preorder_badge', size: 'large', bold: true, align: 'center' },
        { type: 'preorder_time', size: 'medium', bold: true, align: 'center' },
        { type: 'divider' },
        { type: 'order_number', size: 'xl', bold: true, align: 'center' },
        { type: 'customer_name', size: 'large', bold: true, align: 'left' },
        { type: 'phone', size: 'medium', bold: false, align: 'left' },
        { type: 'divider' },
        { type: 'delivery_address', size: 'large', bold: true, align: 'left' },
        { type: 'divider' },
        { type: 'total', size: 'large', bold: true, align: 'right' },
        { type: 'datetime', size: 'small', bold: false, align: 'right' },
      ]
    }
  ]

  const tmplsToUse = templates && templates.length > 0 ? templates : defaultTemplates

  // Build all tickets
  let allTickets = ''
  for (const tmpl of tmplsToUse) {
    // Skip delivery label for collections
    if (tmpl.template_type === 'delivery' && order.isCollection) continue
    const copies = tmpl.copies || 1
    for (let i = 0; i < copies; i++) {
      allTickets += renderTemplate(tmpl, order, cols)
    }
  }

  const hexData = strToHex(allTickets)

  // Try local print server on port 8080 (embedded in native app)
  try {
    const res = await fetch('http://127.0.0.1:8080/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hexData, printerIp, port: 9100 })
    })
    const data = await res.json()
    if (data.success) return
  } catch (e) {
    console.warn('Local print server failed:', e)
  }

  // Fallback to browser
  printViaBrowser(order)
}

export function usePrinterAutoprint(restaurantId?: string, printerIp?: string, printerWidth?: number) {
  const supabase = createClient()
  const printedOrdersRef = useRef<Set<string>>(new Set())

  async function getTemplates() {
    if (!restaurantId) return null
    try {
      const { data } = await supabase.from('ticket_templates').select('*').eq('restaurant_id', restaurantId).order('created_at')
      return data && data.length > 0 ? data : null
    } catch (e) {
      return null
    }
  }

  async function doPrint(order: OrderForPrint) {
    if (!printerIp) { printViaBrowser(order); return }
    const templates = await getTemplates()
    await sendToPrinter(order, printerIp, printerWidth || 80, templates || undefined)
  }

  const triggerAutoPrint = useCallback(async (order: OrderForPrint, status: string) => {
    if (!['paid', 'accepted'].includes(status)) return
    if (printedOrdersRef.current.has(order.id)) return
    printedOrdersRef.current.add(order.id)
    await doPrint(order)
  }, [printerIp, printerWidth, restaurantId])

  const manualReprint = useCallback(async (order: OrderForPrint) => {
    await doPrint(order)
  }, [printerIp, printerWidth, restaurantId])

  const clearPrintHistory = useCallback(() => {
    printedOrdersRef.current.clear()
  }, [])

  return { triggerAutoPrint, manualReprint, clearPrintHistory }
}
