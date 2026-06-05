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
  items: Array<{ name: string; quantity: number; price: number }>;
  specialInstructions?: string;
  subtotal: number;
  deliveryFee?: number;
  tip?: number;
  total: number;
}

export function usePrinterAutoprint() {
  const printedOrdersRef = useRef<Set<string>>(new Set());

  // Auto-print when order status changes to 'paid'
  const triggerAutoPrint = useCallback((order: OrderForPrint, status: string) => {
    if (status !== 'paid') return;

    const settings = printerStorage.getSettings();
    const template = printerStorage.getTemplate();

    // Skip if already printed
    if (printedOrdersRef.current.has(order.id)) return;
    if (!settings.autoprint) return;

    const html = ticketRenderer.generateTicketHTML(order, template, settings);
    ticketRenderer.printViaWindowPrint(html);
    printedOrdersRef.current.add(order.id);
  }, []);

  // Manual reprint
  const manualReprint = useCallback((order: OrderForPrint) => {
    const settings = printerStorage.getSettings();
    const template = printerStorage.getTemplate();
    const html = ticketRenderer.generateTicketHTML(order, template, settings);
    ticketRenderer.printViaWindowPrint(html);
  }, []);

  // Clear print history
  const clearPrintHistory = useCallback(() => {
    printedOrdersRef.current.clear();
  }, []);

  return { triggerAutoPrint, manualReprint, clearPrintHistory };
}
