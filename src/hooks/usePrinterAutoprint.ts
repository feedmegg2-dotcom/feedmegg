'use client'

import { useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface OrderForPrint {
  id: string
  orderNumber: string | number
  restaurantName: string
  restaurantId?: string
  customerName: string
  customerPhone?: string
  deliveryAddress?: string
  what3words?: string
  deliveryLat?: number | null
  deliveryLng?: number | null
  isCollection: boolean
  contactlessDelivery?: boolean
  isPreOrder?: boolean
  preOrderTime?: string
  scheduledFor?: string
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
const INVERT_ON = GS + 'B\x01', INVERT_OFF = GS + 'B\x00'
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

  // If invert is enabled, we render the element normally into a temp
  // string first, then wrap it with INVERT_ON/OFF. Inverted text always
  // centres and fills the full width for maximum visual impact.
  if (el.invert) {
    const innerEl = { ...el, invert: false }
    const inner = renderElementESCPOS(innerEl, order, cols)
    // Pad each non-empty line to full width so the black bar fills the ticket
    const padded = inner.split('\n').map(line => {
      if (!line.trim()) return line
      const stripped = line.replace(/[\x00-\x1F\x7F-\x9F]/g, '') // strip control chars for length
      const pad = Math.max(0, cols - stripped.length)
      return line + rep(' ', pad)
    }).join('\n')
    return ALIGN_CENTER + INVERT_ON + padded + INVERT_OFF + ALIGN_LEFT
  }

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
      if (!order.isCollection && order.deliveryAddress) {
        t += align + size + bold + order.deliveryAddress + boldOff + SIZE_NORMAL + LF
        if ((order as any).what3words) t += ALIGN_CENTER + bold + '///' + (order as any).what3words + boldOff + ALIGN_LEFT + LF
      }
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
    case 'items_list_with_numbers': {
      const knSize = el.kitchen_number_size || 'xxxl'
      // GS ! byte: high nibble = height mult-1, low nibble = width mult-1
      // 4x4=0x33, 3x3=0x22, 2x2=0x11, 1x1=0x00
      const knByte = knSize === 'xxxl' || knSize === 'xxl' ? 0x33 :
                     knSize === 'xl' ? 0x22 :
                     knSize === 'large' ? 0x11 : 0x00
      const knCmd = GS + '!' + String.fromCharCode(knByte)
      order.items.forEach((item: any) => {
        if (item.kitchen_number) {
          t += ALIGN_CENTER + knCmd + BOLD_ON + '[' + item.kitchen_number + ']' + BOLD_OFF + SIZE_NORMAL + LF
        }
        t += align + size + bold + item.quantity + 'x ' + item.name + boldOff + SIZE_NORMAL + LF
        if (item.special_instructions) t += ALIGN_LEFT + '  -> ' + item.special_instructions + LF
      })
      break
    }
    case 'total':
      t += align + size + bold + lr('TOTAL:', 'GBP' + order.total.toFixed(2), cols) + boldOff + SIZE_NORMAL + LF
      break
    case 'tip':
      if (order.tip && order.tip > 0) {
        t += LF + ALIGN_CENTER + SIZE_DOUBLE + bold + '*** TIP GBP' + parseFloat(String(order.tip)).toFixed(2) + ' ***' + boldOff + SIZE_NORMAL + ALIGN_LEFT + LF
      }
      break
    case 'payment_method':
      t += align + size + (order.paymentMethod === 'cash' ? 'CASH ORDER' : 'CARD ORDER') + SIZE_NORMAL + LF
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
      if (order.isPreOrder) {
        t += align + size + bold + '*** PRE-ORDER ***' + boldOff + SIZE_NORMAL + LF
        if (order.scheduledFor) {
          const orderDate = new Date(order.scheduledFor)
          const today = new Date()
          const isNextDay = orderDate.toDateString() !== today.toDateString()
          if (isNextDay) {
            t += align + SIZE_DOUBLE + bold + '!!! TOMORROW !!!' + boldOff + SIZE_NORMAL + LF
            t += align + bold + orderDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + boldOff + LF
          }
        }
      }
      break
    case 'preorder_time':
      if (order.isPreOrder && order.preOrderTime) t += align + size + bold + 'For: ' + order.preOrderTime + boldOff + SIZE_NORMAL + LF
      break
    case 'contactless':
      if (order.contactlessDelivery) t += align + size + bold + 'CONTACTLESS DELIVERY' + boldOff + SIZE_NORMAL + LF
      break
    case 'delivery_qr':
      if (!order.isCollection && (order as any).deliveryLat && (order as any).deliveryLng) {
        const mapsUrl = `https://maps.google.com/maps?daddr=${(order as any).deliveryLat},${(order as any).deliveryLng}`
        const urlLen = mapsUrl.length
        t += ALIGN_CENTER + LF
        t += GS + '(k' + String.fromCharCode(4, 0) + '\x31\x41\x32\x00'
        t += GS + '(k' + String.fromCharCode(3, 0) + '\x31\x43\x08'
        t += GS + '(k' + String.fromCharCode(3, 0) + '\x31\x45\x31'
        t += GS + '(k' + String.fromCharCode((urlLen + 3) & 0xff, ((urlLen + 3) >> 8) & 0xff) + '\x31\x50\x30' + mapsUrl
        t += GS + '(k' + String.fromCharCode(3, 0) + '\x31\x51\x30'
        t += SIZE_NORMAL + ALIGN_CENTER + 'Scan for Google Maps directions' + LF + ALIGN_LEFT
      }
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
      body: JSON.stringify({ hexData, printerIp, port: 9100 }),
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    if (data.success) return true
  } catch (e) {
    console.warn('Local print server failed:', e)
  }

  return false // Print failed - caller decides what to do
}

async function sendToPrinterWithFallback(order: OrderForPrint, printerIp: string, printerWidth: number, templates?: any[]) {
  const success = await sendToPrinter(order, printerIp, printerWidth, templates)
  if (!success) printViaBrowser(order)
}

export function usePrinterAutoprint(restaurantId?: string, printerIp?: string, printerWidth?: number) {
  const supabase = createClient()
  const printedOrdersRef = useRef<Set<string>>(new Set())

  async function getTemplates(orderRestaurantId?: string) {
    const rid = orderRestaurantId || restaurantId
    if (!rid) return null
    try {
      const { data } = await supabase.from('ticket_templates').select('*').eq('restaurant_id', rid).order('created_at')
      return data && data.length > 0 ? data : null
    } catch (e) {
      return null
    }
  }

  async function doPrint(order: OrderForPrint, allowFallback = true) {
    if (!printerIp) { 
      if (allowFallback) printViaBrowser(order)
      return 
    }
    const templates = await getTemplates((order as any).restaurantId)
    if (allowFallback) {
      await sendToPrinterWithFallback(order, printerIp, printerWidth || 80, templates || undefined)
    } else {
      await sendToPrinter(order, printerIp, printerWidth || 80, templates || undefined)
    }
  }

  const triggerAutoPrint = useCallback(async (order: OrderForPrint, status: string): Promise<boolean> => {
    if (!['paid', 'accepted'].includes(status)) return false
    if (printedOrdersRef.current.has(order.id)) return true
    if (!printerIp) return false

    // DATABASE-BACKED DEDUP: in-memory refs (printedOrdersRef) reset on every
    // page reload, which previously caused already-printed tickets to print
    // again whenever the terminal reloaded (watchdog recovery, network
    // reconnect, manual refresh, etc). ticket_printed_at survives reloads
    // and is the real source of truth - we atomically claim it here (only
    // update rows where it's still null) so two near-simultaneous polls
    // can never both print the same order.
    try {
      const { data: claimed } = await supabase
        .from('orders')
        .update({ ticket_printed_at: new Date().toISOString() })
        .eq('id', order.id)
        .is('ticket_printed_at', null)
        .select('id')
        .maybeSingle()

      if (!claimed) {
        // Already printed by a previous session/poll - don't print again,
        // but remember it locally too so we don't keep re-checking the DB
        printedOrdersRef.current.add(order.id)
        return true
      }
    } catch (e) {
      console.error('Print claim check failed, proceeding cautiously:', e)
    }

    printedOrdersRef.current.add(order.id)
    const templates = await getTemplates((order as any).restaurantId)
    const result = await sendToPrinter(order, printerIp, printerWidth || 80, templates || undefined)
    if (!result) {
      printedOrdersRef.current.delete(order.id)
      // Release the claim so a retry (manual reprint or next poll) can try again
      try {
        await supabase.from('orders').update({ ticket_printed_at: null }).eq('id', order.id)
      } catch (e) {}
    }
    return !!result
  }, [printerIp, printerWidth, restaurantId])

  const manualReprint = useCallback(async (order: OrderForPrint) => {
    await doPrint(order, true) // Allow browser fallback for manual reprint
  }, [printerIp, printerWidth, restaurantId])

  const clearPrintHistory = useCallback(() => {
    printedOrdersRef.current.clear()
  }, [])

  return { triggerAutoPrint, manualReprint, clearPrintHistory }
}
