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
}

// ESC/POS commands for 58mm thermal printer
const ESC = '\x1B'
const GS = '\x1D'
const INIT = ESC + '@'
const BOLD_ON = ESC + 'E\x01'
const BOLD_OFF = ESC + 'E\x00'
const ALIGN_LEFT = ESC + 'a\x00'
const ALIGN_CENTER = ESC + 'a\x01'
const ALIGN_RIGHT = ESC + 'a\x02'
const SIZE_NORMAL = GS + '!\x00'
const SIZE_DOUBLE_HEIGHT = GS + '!\x01'
const SIZE_DOUBLE_WIDTH = GS + '!\x10'
const SIZE_DOUBLE = GS + '!\x11'
const CUT = GS + 'V\x41\x03'
const LINE_FEED = '\n'

function repeat(char: string, n: number) {
  return char.repeat(Math.max(0, n))
}

function centerText(text: string, width: number = 32) {
  if (text.length >= width) return text
  const pad = Math.floor((width - text.length) / 2)
  return repeat(' ', pad) + text
}

function leftRight(left: string, right: string, width: number = 32) {
  const space = width - left.length - right.length
  if (space <= 0) return left + ' ' + right
  return left + repeat(' ', space) + right
}

function generateKitchenTicket(order: OrderForPrint): string {
  let t = INIT

  // PRE-ORDER badge
  if (order.isPreOrder) {
    t += ALIGN_CENTER + SIZE_DOUBLE + BOLD_ON
    t += '*** PRE-ORDER ***' + LINE_FEED
    if (order.preOrderTime) {
      t += SIZE_NORMAL + 'Ready: ' + order.preOrderTime + LINE_FEED
    }
    t += BOLD_OFF + SIZE_NORMAL
  }

  // Contactless
  if (order.contactlessDelivery) {
    t += ALIGN_CENTER + BOLD_ON + SIZE_DOUBLE_HEIGHT
    t += 'CONTACTLESS' + LINE_FEED
    t += BOLD_OFF + SIZE_NORMAL
  }

  t += ALIGN_CENTER
  t += repeat('-', 32) + LINE_FEED

  // Order number - BIG
  t += SIZE_DOUBLE + BOLD_ON + ALIGN_CENTER
  t += 'ORDER #' + String(order.orderNumber).slice(-6) + LINE_FEED
  t += BOLD_OFF + SIZE_NORMAL

  // Customer name
  t += SIZE_DOUBLE_HEIGHT + BOLD_ON + ALIGN_LEFT
  t += order.customerName + LINE_FEED
  t += BOLD_OFF + SIZE_NORMAL

  // Order type
  t += (order.isCollection ? 'COLLECTION' : 'DELIVERY') + LINE_FEED
  t += repeat('-', 32) + LINE_FEED

  // Items
  t += BOLD_ON + 'ITEMS:' + LINE_FEED + BOLD_OFF
  for (const item of order.items) {
    t += SIZE_DOUBLE_HEIGHT + BOLD_ON
    t += `${item.quantity}x ${item.name}` + LINE_FEED
    t += BOLD_OFF + SIZE_NORMAL
    if (item.special_instructions) {
      t += '  -> ' + item.special_instructions + LINE_FEED
    }
  }

  t += repeat('-', 32) + LINE_FEED

  // Special instructions
  if (order.specialInstructions) {
    t += BOLD_ON + '** NOTES **' + LINE_FEED + BOLD_OFF
    t += order.specialInstructions + LINE_FEED
    t += repeat('-', 32) + LINE_FEED
  }

  // Time
  t += ALIGN_RIGHT + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + LINE_FEED

  t += LINE_FEED + LINE_FEED + LINE_FEED
  t += CUT

  return t
}

function generateCustomerReceipt(order: OrderForPrint): string {
  let t = INIT

  t += ALIGN_CENTER + SIZE_DOUBLE + BOLD_ON
  t += order.restaurantName + LINE_FEED
  t += BOLD_OFF + SIZE_NORMAL

  t += repeat('-', 32) + LINE_FEED

  if (order.isPreOrder) {
    t += BOLD_ON + 'PRE-ORDER' + LINE_FEED + BOLD_OFF
    if (order.preOrderTime) t += 'Ready: ' + order.preOrderTime + LINE_FEED
  }

  t += ALIGN_LEFT
  t += 'Order #' + String(order.orderNumber).slice(-6) + LINE_FEED
  t += order.customerName + LINE_FEED
  t += new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + LINE_FEED

  t += repeat('-', 32) + LINE_FEED

  for (const item of order.items) {
    t += leftRight(`${item.quantity}x ${item.name}`, `GBP${((item.subtotal || item.price * item.quantity)).toFixed(2)}`) + LINE_FEED
    if (item.special_instructions) {
      t += '  ' + item.special_instructions + LINE_FEED
    }
  }

  t += repeat('-', 32) + LINE_FEED

  if (order.deliveryFee && order.deliveryFee > 0) {
    t += leftRight('Subtotal:', `GBP${order.subtotal.toFixed(2)}`) + LINE_FEED
    t += leftRight('Delivery:', `GBP${order.deliveryFee.toFixed(2)}`) + LINE_FEED
  }
  if (order.tip && order.tip > 0) {
    t += leftRight('Tip:', `GBP${order.tip.toFixed(2)}`) + LINE_FEED
  }

  t += repeat('-', 32) + LINE_FEED
  t += BOLD_ON + SIZE_DOUBLE_HEIGHT
  t += leftRight('TOTAL:', `GBP${order.total.toFixed(2)}`) + LINE_FEED
  t += BOLD_OFF + SIZE_NORMAL

  t += repeat('-', 32) + LINE_FEED
  t += ALIGN_CENTER + 'Thank you!' + LINE_FEED
  t += 'feedme.gg' + LINE_FEED

  t += LINE_FEED + LINE_FEED + LINE_FEED
  t += CUT

  return t
}

function generateDeliveryLabel(order: OrderForPrint): string {
  if (order.isCollection) return ''

  let t = INIT

  if (order.contactlessDelivery) {
    t += ALIGN_CENTER + SIZE_DOUBLE + BOLD_ON
    t += 'CONTACTLESS' + LINE_FEED
    t += BOLD_OFF + SIZE_NORMAL
  }

  if (order.isPreOrder && order.preOrderTime) {
    t += ALIGN_CENTER + BOLD_ON
    t += 'PRE-ORDER: ' + order.preOrderTime + LINE_FEED
    t += BOLD_OFF
  }

  t += ALIGN_CENTER + repeat('-', 32) + LINE_FEED

  t += SIZE_DOUBLE + BOLD_ON + ALIGN_CENTER
  t += 'ORDER #' + String(order.orderNumber).slice(-6) + LINE_FEED
  t += BOLD_OFF + SIZE_NORMAL

  t += SIZE_DOUBLE_HEIGHT + BOLD_ON + ALIGN_LEFT
  t += order.customerName + LINE_FEED
  t += BOLD_OFF + SIZE_NORMAL

  if (order.customerPhone) {
    t += order.customerPhone + LINE_FEED
  }

  t += repeat('-', 32) + LINE_FEED
  t += BOLD_ON + order.deliveryAddress + LINE_FEED + BOLD_OFF
  t += repeat('-', 32) + LINE_FEED

  t += BOLD_ON + SIZE_DOUBLE_HEIGHT
  t += leftRight('TOTAL:', `GBP${order.total.toFixed(2)}`) + LINE_FEED
  t += BOLD_OFF + SIZE_NORMAL

  t += new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + LINE_FEED

  t += LINE_FEED + LINE_FEED + LINE_FEED
  t += CUT

  return t
}

function printViaRawBT(escposData: string) {
  try {
    // Convert ESC/POS string to base64
    const bytes = new Uint8Array(escposData.length)
    for (let i = 0; i < escposData.length; i++) {
      bytes[i] = escposData.charCodeAt(i) & 0xFF
    }
    const base64 = btoa(String.fromCharCode(...bytes))
    
    // Open RawBT with base64 encoded ESC/POS data
    window.location.href = `rawbt:base64,${base64}`
  } catch (e) {
    console.error('Print error:', e)
    alert('Print failed - make sure RawBT app is installed and printer is connected')
  }
}

export function usePrinterAutoprint() {
  const supabase = createClient()
  const printedOrdersRef = useRef<Set<string>>(new Set())

  const printOrder = useCallback(async (order: OrderForPrint, copies?: { kitchen?: number, customer?: number, delivery?: number }) => {
    // Get ticket templates from Supabase if available
    const { data: templates } = await supabase
      .from('ticket_templates')
      .select('*')
      .eq('restaurant_id', order.id) // Will be restaurant_id when passed properly
      .order('created_at')

    // Default copies
    const kitchenCopies = copies?.kitchen || 1
    const customerCopies = copies?.customer || 1
    const deliveryCopies = copies?.delivery || (order.isCollection ? 0 : 1)

    // Generate and print tickets
    let allTickets = ''

    for (let i = 0; i < kitchenCopies; i++) {
      allTickets += generateKitchenTicket(order)
    }
    for (let i = 0; i < customerCopies; i++) {
      allTickets += generateCustomerReceipt(order)
    }
    if (!order.isCollection) {
      for (let i = 0; i < deliveryCopies; i++) {
        allTickets += generateDeliveryLabel(order)
      }
    }

    printViaRawBT(allTickets)
    printedOrdersRef.current.add(order.id)
  }, [])

  const triggerAutoPrint = useCallback((order: OrderForPrint, status: string) => {
    if (!['paid', 'accepted'].includes(status)) return
    if (printedOrdersRef.current.has(order.id)) return
    printOrder(order)
  }, [printOrder])

  const manualReprint = useCallback((order: OrderForPrint) => {
    printOrder(order)
  }, [printOrder])

  const clearPrintHistory = useCallback(() => {
    printedOrdersRef.current.clear()
  }, [])

  return { triggerAutoPrint, manualReprint, clearPrintHistory }
}
