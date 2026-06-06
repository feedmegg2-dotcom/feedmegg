// hooks/usePrinterAutoprint.ts
'use client';

import { useRef, useCallback } from 'react';
import { printerStorage, ticketRenderer } from '@/lib/printerService';

interface OrderForPrint {
  id: string;
  orderNumber: number;
  restaurantName: string;
  customerName: string;
  deliveryAddress?: string;
  isCollection: boolean;
  items: Array<{ name: string; quantity: number; price: number; special_instructions?: string }>;
  specialInstructions?: string;
  subtotal: number;
  deliveryFee?: number;
  tip?: number;
  total: number;
}

export function usePrinterAutoprint() {
  const printedOrdersRef = useRef<Set<string>>(new Set());

  const generateKitchenTicket = (order: OrderForPrint) => {
    return `
=====================================
KITCHEN TICKET
=====================================

ORDER #${order.orderNumber}
${order.customerName}

=====================================
ITEMS TO PREPARE:
=====================================

${order.items.map((item: any) => {
  let line = `${item.quantity}x ${item.name}`;
  if (item.special_instructions) {
    line += `\n   *** ${item.special_instructions} ***`;
  }
  return line;
}).join('\n')}

=====================================
${new Date().toLocaleTimeString()}
=====================================
`;
  };

  const generateCustomerReceipt = (order: OrderForPrint) => {
    return `
=====================================
CUSTOMER RECEIPT
=====================================

ORDER #${order.orderNumber}
${order.restaurantName}
Date: ${new Date().toLocaleDateString()}

=====================================
ITEMS:
=====================================

${order.items.map((item: any) => 
  `${item.quantity}x ${item.name} ... GBP${(item.quantity * item.price).toFixed(2)}`
).join('\n')}

=====================================
Subtotal:          GBP${order.subtotal.toFixed(2)}
${order.deliveryFee ? `Delivery:          GBP${order.deliveryFee.toFixed(2)}` : 'Pickup'}
${order.tip ? `Tip:               GBP${order.tip.toFixed(2)}` : ''}
=====================================
TOTAL:             GBP${order.total.toFixed(2)}
=====================================

Thank you for your order!

=====================================
`;
  };

  const generateDeliveryLabel = (order: OrderForPrint) => {
    return `
=====================================
DELIVERY LABEL
=====================================

ORDER #${order.orderNumber}
${order.customerName}

=====================================
DELIVERY ADDRESS:
=====================================

${order.deliveryAddress}

=====================================
Items: ${order.items.length}
Total: GBP${order.total.toFixed(2)}

Time: ${new Date().toLocaleTimeString()}
=====================================
`;
  };

  // Auto-print when order status changes to 'paid'
  const triggerAutoPrint = useCallback((order: OrderForPrint, status: string) => {
    if (status !== 'paid') return;

    const settings = printerStorage.getSettings();
    
    // Skip if already printed
    if (printedOrdersRef.current.has(order.id)) return;
    if (!settings.autoprint) return;

    try {
      // Generate all 3 tickets
      const kitchenTicket = generateKitchenTicket(order);
      const customerReceipt = generateCustomerReceipt(order);
      const deliveryLabel = order.isCollection === false ? generateDeliveryLabel(order) : null;

      // Log for testing
      console.log('=== KITCHEN TICKET ===', kitchenTicket);
      console.log('=== CUSTOMER RECEIPT ===', customerReceipt);
      if (deliveryLabel) console.log('=== DELIVERY LABEL ===', deliveryLabel);

      // Send to print endpoint
      fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          kitchen: kitchenTicket,
          customer: customerReceipt,
          delivery: deliveryLabel,
        }),
      }).catch((e) => console.log('Print service error:', e));

      printedOrdersRef.current.add(order.id);
    } catch (e) {
      console.error('Print generation error:', e);
    }
  }, []);

  // Manual reprint
  const manualReprint = useCallback((order: OrderForPrint) => {
    try {
      const kitchenTicket = generateKitchenTicket(order);
      const customerReceipt = generateCustomerReceipt(order);
      const deliveryLabel = order.isCollection === false ? generateDeliveryLabel(order) : null;

      fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          kitchen: kitchenTicket,
          customer: customerReceipt,
          delivery: deliveryLabel,
        }),
      }).catch((e) => console.log('Print service error:', e));
    } catch (e) {
      console.error('Print error:', e);
    }
  }, []);

  // Clear print history
  const clearPrintHistory = useCallback(() => {
    printedOrdersRef.current.clear();
  }, []);

  return { triggerAutoPrint, manualReprint, clearPrintHistory };
}
