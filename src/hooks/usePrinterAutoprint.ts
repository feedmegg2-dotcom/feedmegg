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

async function printViaNetwork(order: any, restaurantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get printer IP from restaurant settings
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('printer_ip, printer_width')
      .eq('id', restaurantId)
      .single()

    if (!restaurant?.printer_ip) {
      return { success: false, error: 'No printer IP configured. Please set printer IP in dashboard settings.' }
    }

    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        printerIp: restaurant.printer_ip,
        printerWidth: restaurant.printer_width || 80,
      })
    })

    const data = await res.json()
    if (!data.success) return { success: false, error: data.error }
    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Fallback Chrome print dialog
function printViaBrowser(order: OrderForPrint) {
  const printWindow = window.open('', '_blank', 'width=300,height=600')
  if (!printWindow) {
    alert('Please allow popups for printing')
    return
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 80mm auto; margin: 2mm; }
  @media print { body { width: 80mm; } .page-break { page-break-after: always; } }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; color: #000; padding: 2mm; }
  .center { text-align: center; } .right { text-align: right; }
  .bold { font-weight: bold; } .xl { font-size: 20px; } .lg { font-size: 16px; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; }
  .badge { background: #000; color: #fff; text-align: center; padding: 3px; font-weight: bold; font-size: 14px; margin: 3px 0; }
</style>
</head>
<body>
  ${order.isPreOrder ? `<div class="badge">*** PRE-ORDER *** ${order.preOrderTime || ''}</div>` : ''}
  ${order.contactlessDelivery ? `<div class="badge">CONTACTLESS DELIVERY</div>` : ''}
  <div class="divider"></div>
  <div class="center xl bold">ORDER #${String(order.orderNumber).slice(-6).toUpperCase()}</div>
  <div class="lg bold">${order.customerName}</div>
  ${order.customerPhone ? `<div>${order.customerPhone}</div>` : ''}
  <div>${order.isCollection ? 'COLLECTION' : 'DELIVERY'}</div>
  ${!order.isCollection && order.deliveryAddress ? `<div class="bold">${order.deliveryAddress}</div>` : ''}
  <div class="divider"></div>
  <div class="bold">ITEMS:</div>
  ${order.items.map(i => `
    <div class="bold">${i.quantity}x ${i.name}</div>
    ${i.special_instructions ? `<div style="padding-left:8px;font-style:italic">-> ${i.special_instructions}</div>` : ''}
  `).join('')}
  <div class="divider"></div>
  ${order.specialInstructions ? `<div class="bold">** NOTES **</div><div>${order.specialInstructions}</div><div class="divider"></div>` : ''}
  ${order.deliveryFee && order.deliveryFee > 0 ? `<div class="row"><span>Subtotal:</span><span>GBP${order.subtotal.toFixed(2)}</span></div>` : ''}
  ${order.deliveryFee && order.deliveryFee > 0 ? `<div class="row"><span>Delivery:</span><span>GBP${order.deliveryFee.toFixed(2)}</span></div>` : ''}
  ${order.tip && order.tip > 0 ? `<div class="row"><span>Tip:</span><span>GBP${order.tip.toFixed(2)}</span></div>` : ''}
  <div class="row xl bold"><span>TOTAL:</span><span>GBP${order.total.toFixed(2)}</span></div>
  <div class="divider"></div>
  <div class="right">${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }, 500)
}

export function usePrinterAutoprint(restaurantId?: string, printerIp?: string, printerWidth?: number) {
  const printedOrdersRef = useRef<Set<string>>(new Set())

  async function doPrint(order: OrderForPrint) {
    // Check if running in Capacitor native app
    const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNative

    if (isNative && (window as any).nativePrint && printerIp) {
      // Use native TCP printing
      try {
        const result = await (window as any).nativePrint(order, printerIp, printerWidth || 80)
        if (!result.success) {
          console.warn('Native print failed:', result.error)
          printViaBrowser(order)
        }
      } catch (e) {
        console.warn('Native print error:', e)
        printViaBrowser(order)
      }
    } else if (printerIp) {
      // Use local print server (Firefox/browser)
      try {
        const res = await fetch('http://127.0.0.1:3001/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order, printerIp, printerWidth: printerWidth || 80 })
        })
        const data = await res.json()
        if (!data.success) {
          console.warn('Local print server error:', data.error)
          printViaBrowser(order)
        }
      } catch (e) {
        console.warn('Local print server not running, using browser:', e)
        printViaBrowser(order)
      }
    } else {
      printViaBrowser(order)
    }
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
