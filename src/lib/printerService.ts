// lib/printerService.ts - Network & Bluetooth Thermal Printer Service
'use client';

export interface PrinterSettings {
  type: 'network' | 'bluetooth';
  networkIp?: string;
  bluetoothDeviceId?: string;
  bluetoothDeviceName?: string;
  paperSize: '58mm' | '80mm';
  printDensity: number; // 0-100
  autoprint: boolean;
}

export interface TicketTemplate {
  showRestaurantName: boolean;
  showOrderNumber: boolean;
  showDateTime: boolean;
  showCustomerName: boolean;
  showDeliveryAddress: boolean;
  showItems: boolean;
  showTotals: boolean;
  showInstructions: boolean;
  footerMessage: string;
}

const PRINTER_SETTINGS_KEY = 'feedme_printer_settings';
const TICKET_TEMPLATE_KEY = 'feedme_ticket_template';

const DEFAULT_SETTINGS: PrinterSettings = {
  type: 'network',
  paperSize: '80mm',
  printDensity: 75,
  autoprint: true,
};

const DEFAULT_TEMPLATE: TicketTemplate = {
  showRestaurantName: true,
  showOrderNumber: true,
  showDateTime: true,
  showCustomerName: true,
  showDeliveryAddress: true,
  showItems: true,
  showTotals: true,
  showInstructions: true,
  footerMessage: 'Thank you for your order!',
};

// Storage
export const printerStorage = {
  getSettings: (): PrinterSettings => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(PRINTER_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: PrinterSettings): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save printer settings:', e);
    }
  },

  getTemplate: (): TicketTemplate => {
    if (typeof window === 'undefined') return DEFAULT_TEMPLATE;
    try {
      const stored = localStorage.getItem(TICKET_TEMPLATE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_TEMPLATE;
    } catch {
      return DEFAULT_TEMPLATE;
    }
  },

  saveTemplate: (template: TicketTemplate): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TICKET_TEMPLATE_KEY, JSON.stringify(template));
    } catch (e) {
      console.error('Failed to save ticket template:', e);
    }
  },

  clearBluetooth: (): void => {
    if (typeof window === 'undefined') return;
    const settings = printerStorage.getSettings();
    settings.bluetoothDeviceId = undefined;
    settings.bluetoothDeviceName = undefined;
    printerStorage.saveSettings(settings);
  },
};

// Bluetooth API
export const bluetoothPrinter = {
  async requestDevice(): Promise<{ id: string; name: string } | null> {
    if (typeof window === 'undefined' || !(navigator as any).bluetooth) {
      console.error('Web Bluetooth not available');
      return null;
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { name: /thermal|printer|epson|star|xprinter|goojprt|munbyn/i },
        ],
        optionalServices: [
          '00001101-0000-1000-8000-00805f9b34fb', // SPP Serial Port
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Info
        ],
      });

      return { id: device.id, name: device.name || 'Unknown' };
    } catch (error) {
      console.error('Bluetooth device request failed:', error);
      return null;
    }
  },

  async connect(
    deviceId: string
  ): Promise<BluetoothRemoteGATTCharacteristic | null> {
    if (typeof window === 'undefined') return null;

    try {
      const device = await (navigator as any).bluetooth.getDevice(deviceId);
      const server = await (device as any).gatt?.connect();
      if (!server) return null;

      try {
        const service = await server.getPrimaryService(
          '00001101-0000-1000-8000-00805f9b34fb'
        );
        const characteristic = await service.getCharacteristic(
          '00002a4d-0000-1000-8000-00805f9b34fb'
        );
        return characteristic;
      } catch {
        return null;
      }
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      return null;
    }
  },

  async sendCommand(
    characteristic: BluetoothRemoteGATTCharacteristic,
    data: Uint8Array
  ): Promise<boolean> {
    try {
      await characteristic.writeValue(data);
      return true;
    } catch (error) {
      console.error('Failed to send command:', error);
      return false;
    }
  },
};

// ESC/POS Commands
export const escPos = {
  INIT: new Uint8Array([0x1b, 0x40]),
  LF: new Uint8Array([0x0a]),
  FF: new Uint8Array([0x0c]),
  bold: (on: boolean) => new Uint8Array([0x1b, 0x45, on ? 0x01 : 0x00]),
  underline: (on: boolean) => new Uint8Array([0x1b, 0x2d, on ? 0x01 : 0x00]),
  setSize: (width: 0 | 1 | 2 | 3, height: 0 | 1 | 2 | 3) => {
    return new Uint8Array([0x1d, 0x21, (width << 4) | height]);
  },
  alignLeft: new Uint8Array([0x1b, 0x61, 0x00]),
  alignCenter: new Uint8Array([0x1b, 0x61, 0x01]),
  alignRight: new Uint8Array([0x1b, 0x61, 0x02]),
  partialCut: new Uint8Array([0x1d, 0x56, 0x00]),
  fullCut: new Uint8Array([0x1d, 0x56, 0x01]),
  setDensity: (density: number) => {
    const d = Math.min(Math.max(Math.round(density / 10), 0), 10);
    return new Uint8Array([0x1d, 0x7c, d]);
  },
  text: (str: string) => new TextEncoder().encode(str),
  build: (...commands: Uint8Array[]): Uint8Array => {
    const total = commands.reduce((sum, cmd) => sum + cmd.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const cmd of commands) {
      result.set(cmd, offset);
      offset += cmd.length;
    }
    return result;
  },
};

// Ticket rendering
export const ticketRenderer = {
  generateTicketHTML(orderData: any, template: TicketTemplate, settings: PrinterSettings): string {
    const width = settings.paperSize === '58mm' ? '248px' : '320px';

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Receipt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      width: ${width};
      padding: 8px;
      background: white;
      color: black;
    }
    .receipt { width: 100%; font-size: 12px; line-height: 1.3; }
    .header { text-align: center; margin-bottom: 8px; font-weight: bold; font-size: 13px; }
    .separator { border-top: 1px solid black; margin: 6px 0; }
    .line { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
    .item { font-size: 10px; margin: 2px 0; }
    .label { font-weight: bold; }
    .footer { text-align: center; margin-top: 8px; font-size: 10px; }
    @media print { body { margin: 0; padding: 0; width: auto; } }
  </style>
</head>
<body>
<div class="receipt">`;

    if (template.showRestaurantName) {
      html += `<div class="header">${orderData.restaurantName || 'Restaurant'}</div>`;
    }

    html += `<div class="separator"></div>`;

    if (template.showOrderNumber || template.showDateTime) {
      if (template.showOrderNumber) {
        html += `<div class="line"><span class="label">Order:</span><span>#${orderData.orderNumber}</span></div>`;
      }
      if (template.showDateTime) {
        const now = new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        html += `<div class="line"><span>${now}</span></div>`;
      }
    }

    if (template.showCustomerName) {
      html += `<div class="line"><span class="label">Customer:</span><span>${orderData.customerName}</span></div>`;
    }

    if (template.showDeliveryAddress) {
      const addr = orderData.isCollection ? 'COLLECTION' : orderData.deliveryAddress;
      html += `<div class="line"><span class="label">Address:</span><span>${addr}</span></div>`;
    }

    if (template.showItems && orderData.items?.length > 0) {
      html += `<div class="separator"></div>`;
      orderData.items.forEach((item: any) => {
        const total = (item.quantity * item.price).toFixed(2);
        html += `<div class="item"><span>${item.name}</span></div>`;
        html += `<div class="line"><span>×${item.quantity}</span><span>£${total}</span></div>`;
      });
    }

    if (template.showInstructions && orderData.specialInstructions) {
      html += `<div class="separator"></div>`;
      html += `<div class="item"><span class="label">Instructions:</span></div>`;
      html += `<div style="font-size: 10px; margin: 2px 0;">${orderData.specialInstructions}</div>`;
    }

    if (template.showTotals) {
      html += `<div class="separator"></div>`;
      if (orderData.subtotal) {
        html += `<div class="line"><span>Subtotal:</span><span>£${orderData.subtotal.toFixed(2)}</span></div>`;
      }
      if (orderData.deliveryFee && orderData.deliveryFee > 0) {
        html += `<div class="line"><span>Delivery:</span><span>£${orderData.deliveryFee.toFixed(2)}</span></div>`;
      }
      if (orderData.tip && orderData.tip > 0) {
        html += `<div class="line"><span>Tip:</span><span>£${orderData.tip.toFixed(2)}</span></div>`;
      }
      html += `<div class="line" style="font-weight: bold; font-size: 12px; margin-top: 4px;">
        <span>TOTAL:</span><span>£${orderData.total.toFixed(2)}</span>
      </div>`;
    }

    if (template.footerMessage) {
      html += `<div class="separator"></div>`;
      html += `<div class="footer">${template.footerMessage}</div>`;
    }

    html += `</div></body></html>`;
    return html;
  },

  printViaWindowPrint(html: string): void {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Unable to open print window');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  },

  testPrint(settings: PrinterSettings, template: TicketTemplate): void {
    const testData = {
      restaurantName: 'Test Restaurant',
      orderNumber: Math.floor(Math.random() * 10000),
      customerName: 'John Doe',
      deliveryAddress: '123 Main Street',
      isCollection: false,
      items: [
        { name: 'Pizza Margherita', quantity: 2, price: 12.99 },
        { name: 'Garlic Bread', quantity: 1, price: 4.50 },
      ],
      specialInstructions: 'Extra cheese, no onions',
      subtotal: 30.48,
      deliveryFee: 2.50,
      tip: 5.00,
      total: 37.98,
    };
    const html = this.generateTicketHTML(testData, template, settings);
    this.printViaWindowPrint(html);
  },
};

// Network printing via POST
export const networkPrinter = {
  async testConnection(ipAddress: string): Promise<boolean> {
    try {
      const response = await fetch(`http://${ipAddress}:9100/status`, {
        method: 'GET',
        mode: 'no-cors',
      });
      return response.ok || response.status === 0;
    } catch {
      return false;
    }
  },

  async sendEscPos(ipAddress: string, commands: Uint8Array): Promise<boolean> {
    try {
      const response = await fetch(`http://${ipAddress}:9100`, {
        method: 'POST',
        body: commands,
        mode: 'no-cors',
      });
      return response.ok || response.status === 0;
    } catch (error) {
      console.error('Failed to send ESC/POS:', error);
      return false;
    }
  },
};
