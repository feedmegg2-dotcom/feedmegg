'use client'

import { useRef, useCallback } from 'react'

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

function generateTicketHTML(order: OrderForPrint): string {
  const isPreOrder = order.isPreOrder && order.preOrderTime
  const isContactless = order.contactlessDelivery

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @page {
          size: 58mm auto;
          margin: 2mm;
        }

        @media print {
          body { width: 58mm; }
          .no-print { display: none; }
          .page-break { page-break-after: always; }
        }

        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          width: 58mm;
          color: #000;
          background: #fff;
          padding: 2mm;
        }

        .center { text-align: center; }
        .left { text-align: left; }
        .right { text-align: right; }
        .bold { font-weight: bold; }

        .divider { border-top: 1px dashed #000; margin: 3px 0; }
        .spacer { height: 4px; }

        .xl { font-size: 18px; }
        .lg { font-size: 15px; }
        .md { font-size: 12px; }
        .sm { font-size: 10px; }

        .badge {
          background: #000;
          color: #fff;
          padding: 3px 6px;
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin: 3px 0;
        }

        .row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }

        .item-name { font-weight: bold; font-size: 12px; }
        .item-note { font-size: 10px; padding-left: 8px; font-style: italic; }

        .ticket { margin-bottom: 4mm; }
      </style>
    </head>
    <body>

      <!-- KITCHEN TICKET -->
      <div class="ticket">
        ${isPreOrder ? `
          <div class="badge">*** PRE-ORDER ***</div>
          <div class="center bold md">Ready: ${order.preOrderTime}</div>
          <div class="spacer"></div>
        ` : ''}

        ${isContactless ? `
          <div class="badge">CONTACTLESS DELIVERY</div>
          <div class="spacer"></div>
        ` : ''}

        <div class="divider"></div>
        <div class="center xl bold">ORDER #${String(order.orderNumber).slice(-6).toUpperCase()}</div>
        <div class="lg bold">${order.customerName}</div>
        <div class="md">${order.isCollection ? '🏪 COLLECTION' : '🚗 DELIVERY'}</div>
        <div class="divider"></div>

        <div class="bold md">ITEMS:</div>
        ${order.items.map(item => `
          <div class="item-name">${item.quantity}x ${item.name}</div>
          ${item.special_instructions ? `<div class="item-note">→ ${item.special_instructions}</div>` : ''}
        `).join('')}

        ${order.specialInstructions ? `
          <div class="divider"></div>
          <div class="bold md">** NOTES **</div>
          <div class="md">${order.specialInstructions}</div>
        ` : ''}

        <div class="divider"></div>
        <div class="right sm">${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div class="page-break"></div>

      <!-- CUSTOMER RECEIPT -->
      <div class="ticket">
        <div class="center xl bold">${order.restaurantName}</div>
        <div class="divider"></div>

        ${isPreOrder ? `
          <div class="center bold md">PRE-ORDER</div>
          <div class="center md">Ready: ${order.preOrderTime}</div>
        ` : ''}

        <div class="md">Order #${String(order.orderNumber).slice(-6).toUpperCase()}</div>
        <div class="md">${order.customerName}</div>
        <div class="sm">${new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        <div class="divider"></div>

        ${order.items.map(item => `
          <div class="row">
            <span>${item.quantity}x ${item.name}</span>
            <span>£${(item.subtotal || item.price * item.quantity).toFixed(2)}</span>
          </div>
          ${item.special_instructions ? `<div class="item-note">→ ${item.special_instructions}</div>` : ''}
        `).join('')}

        <div class="divider"></div>

        ${order.deliveryFee && order.deliveryFee > 0 ? `
          <div class="row"><span>Subtotal:</span><span>£${order.subtotal.toFixed(2)}</span></div>
          <div class="row"><span>Delivery:</span><span>£${order.deliveryFee.toFixed(2)}</span></div>
        ` : ''}

        ${order.tip && order.tip > 0 ? `
          <div class="row"><span>Tip:</span><span>£${order.tip.toFixed(2)}</span></div>
        ` : ''}

        <div class="divider"></div>
        <div class="row xl bold"><span>TOTAL:</span><span>£${order.total.toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="center md">Thank you!</div>
        <div class="center sm">feedme.gg</div>
      </div>

      ${!order.isCollection ? `
        <div class="page-break"></div>

        <!-- DELIVERY LABEL -->
        <div class="ticket">
          ${isContactless ? '<div class="badge">CONTACTLESS DELIVERY</div>' : ''}
          ${isPreOrder ? `<div class="center bold md">PRE-ORDER: ${order.preOrderTime}</div>` : ''}
          
          <div class="divider"></div>
          <div class="center xl bold">ORDER #${String(order.orderNumber).slice(-6).toUpperCase()}</div>
          <div class="lg bold">${order.customerName}</div>
          ${order.customerPhone ? `<div class="md">${order.customerPhone}</div>` : ''}
          <div class="divider"></div>
          <div class="bold md">${order.deliveryAddress}</div>
          <div class="divider"></div>
          <div class="row lg bold"><span>TOTAL:</span><span>£${order.total.toFixed(2)}</span></div>
          <div class="right sm">${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ` : ''}

    </body>
    </html>
  `
}

function printTicket(order: OrderForPrint) {
  const html = generateTicketHTML(order)
  const printWindow = window.open('', '_blank', 'width=300,height=600')
  if (!printWindow) {
    alert('Please allow popups for this site to enable printing')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }, 500)
}

export function usePrinterAutoprint() {
  const printedOrdersRef = useRef<Set<string>>(new Set())

  const triggerAutoPrint = useCallback((order: OrderForPrint, status: string) => {
    if (!['paid', 'accepted'].includes(status)) return
    if (printedOrdersRef.current.has(order.id)) return
    printTicket(order)
    printedOrdersRef.current.add(order.id)
  }, [])

  const manualReprint = useCallback((order: OrderForPrint) => {
    printTicket(order)
  }, [])

  const clearPrintHistory = useCallback(() => {
    printedOrdersRef.current.clear()
  }, [])

  return { triggerAutoPrint, manualReprint, clearPrintHistory }
}
