// components/PrinterSettingsScreen.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  printerStorage,
  bluetoothPrinter,
  ticketRenderer,
  PrinterSettings,
  TicketTemplate,
} from '@/lib/printerService';

interface Props {
  onBack: () => void;
}

export function PrinterSettingsScreen({ onBack }: Props) {
  const [settings, setSettings] = useState<PrinterSettings>(printerStorage.getSettings());
  const [template, setTemplate] = useState<TicketTemplate>(printerStorage.getTemplate());
  const [tab, setTab] = useState<'connection' | 'template' | 'preview'>('connection');
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    printerStorage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    printerStorage.saveTemplate(template);
  }, [template]);

  const handleBluetoothConnect = async () => {
    setConnecting(true);
    setStatus('Searching for printers...');
    const device = await bluetoothPrinter.requestDevice();
    if (device) {
      setSettings(prev => ({
        ...prev,
        bluetoothDeviceId: device.id,
        bluetoothDeviceName: device.name,
      }));
      setStatus(`✓ Connected: ${device.name}`);
    } else {
      setStatus('✗ Failed to connect');
    }
    setConnecting(false);
  };

  const handleTestPrint = () => {
    ticketRenderer.testPrint(settings, template);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <h2 style={styles.title}>🖨️ Printer Settings</h2>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['connection', 'template', 'preview'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...styles.tab,
              ...(tab === t ? styles.tabActive : {}),
            }}
          >
            {t === 'connection' && '⚙️ Connection'}
            {t === 'template' && '📋 Template'}
            {t === 'preview' && '👁️ Preview'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {tab === 'connection' && (
          <div>
            {/* Printer Type */}
            <div style={styles.section}>
              <h3 style={styles.label}>Printer Type</h3>
              <div style={styles.buttonGroup}>
                <button
                  onClick={() => setSettings({ ...settings, type: 'network' })}
                  style={{
                    ...styles.typeBtn,
                    ...(settings.type === 'network' ? styles.typeBtnActive : {}),
                  }}
                >
                  🌐 Network
                </button>
                <button
                  onClick={() => setSettings({ ...settings, type: 'bluetooth' })}
                  style={{
                    ...styles.typeBtn,
                    ...(settings.type === 'bluetooth' ? styles.typeBtnActive : {}),
                  }}
                >
                  📱 Bluetooth
                </button>
              </div>
            </div>

            {/* Network IP */}
            {settings.type === 'network' && (
              <div style={styles.section}>
                <h3 style={styles.label}>Network IP Address</h3>
                <input
                  type="text"
                  placeholder="192.168.1.100"
                  value={settings.networkIp || ''}
                  onChange={e => setSettings({ ...settings, networkIp: e.target.value })}
                  style={styles.input}
                />
                <p style={styles.hint}>Enter your network printer's IP address (port 9100)</p>
              </div>
            )}

            {/* Bluetooth Device */}
            {settings.type === 'bluetooth' && (
              <div style={styles.section}>
                <h3 style={styles.label}>Bluetooth Printer</h3>
                {settings.bluetoothDeviceName ? (
                  <div style={styles.deviceStatus}>
                    <span style={styles.statusDot}>🟢</span>
                    <span>{settings.bluetoothDeviceName}</span>
                    <button
                      onClick={() => printerStorage.clearBluetooth()}
                      style={styles.disconnectBtn}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleBluetoothConnect}
                    disabled={connecting}
                    style={{
                      ...styles.connectBtn,
                      opacity: connecting ? 0.6 : 1,
                    }}
                  >
                    {connecting ? '⏳ Scanning...' : '🔗 Scan & Pair'}
                  </button>
                )}
              </div>
            )}

            {/* Paper Size */}
            <div style={styles.section}>
              <h3 style={styles.label}>Paper Size</h3>
              <div style={styles.buttonGroup}>
                {(['58mm', '80mm'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setSettings({ ...settings, paperSize: size })}
                    style={{
                      ...styles.sizeBtn,
                      ...(settings.paperSize === size ? styles.sizeBtnActive : {}),
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div style={styles.section}>
              <h3 style={styles.label}>Print Darkness</h3>
              <div style={styles.sliderContainer}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.printDensity}
                  onChange={e => setSettings({ ...settings, printDensity: parseInt(e.target.value) })}
                  style={styles.slider}
                />
                <span style={styles.sliderValue}>{settings.printDensity}%</span>
              </div>
            </div>

            {/* Auto-print */}
            <div style={styles.section}>
              <div style={styles.toggleContainer}>
                <label style={styles.label}>Auto-print on payment</label>
                <input
                  type="checkbox"
                  checked={settings.autoprint}
                  onChange={e => setSettings({ ...settings, autoprint: e.target.checked })}
                  style={styles.checkbox}
                />
              </div>
            </div>

            {/* Test Print */}
            <div style={styles.section}>
              <button onClick={handleTestPrint} style={styles.testBtn}>
                🧪 Test Print
              </button>
            </div>

            {/* Status */}
            {status && (
              <div style={{
                ...styles.status,
                color: status.includes('✗') ? '#ef4444' : '#10b981',
              }}>
                {status}
              </div>
            )}
          </div>
        )}

        {tab === 'template' && (
          <div>
            <h3 style={styles.label}>Ticket Sections</h3>
            {[
              { key: 'showRestaurantName', label: 'Restaurant Name' },
              { key: 'showOrderNumber', label: 'Order Number' },
              { key: 'showDateTime', label: 'Date & Time' },
              { key: 'showCustomerName', label: 'Customer Name' },
              { key: 'showDeliveryAddress', label: 'Delivery Address' },
              { key: 'showItems', label: 'Items' },
              { key: 'showTotals', label: 'Totals' },
              { key: 'showInstructions', label: 'Special Instructions' },
            ].map(({ key, label }) => (
              <div key={key} style={styles.toggleRow}>
                <label>{label}</label>
                <input
                  type="checkbox"
                  checked={template[key as keyof TicketTemplate] as boolean}
                  onChange={e => setTemplate({
                    ...template,
                    [key]: e.target.checked,
                  })}
                  style={styles.checkbox}
                />
              </div>
            ))}

            <div style={styles.section}>
              <h3 style={styles.label}>Footer Message</h3>
              <textarea
                value={template.footerMessage}
                onChange={e => setTemplate({ ...template, footerMessage: e.target.value })}
                placeholder="Thank you for your order!"
                style={styles.textarea}
              />
            </div>
          </div>
        )}

        {tab === 'preview' && (
          <div style={styles.previewContainer}>
            <div style={{
              ...styles.previewPaper,
              width: settings.paperSize === '58mm' ? 240 : 320,
            }}>
              <TicketPreview template={template} settings={settings} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketPreview({ template, settings }: { template: TicketTemplate; settings: PrinterSettings }) {
  const sampleOrder = {
    restaurantName: 'Test Restaurant',
    orderNumber: 12345,
    customerName: 'John Doe',
    deliveryAddress: '123 Main St',
    isCollection: false,
    items: [
      { name: 'Pizza', quantity: 2, price: 12.99 },
      { name: 'Salad', quantity: 1, price: 8.50 },
    ],
    specialInstructions: 'No onions',
    subtotal: 34.48,
    deliveryFee: 2.50,
    tip: 5.00,
    total: 41.98,
  };

  const html = ticketRenderer.generateTicketHTML(sampleOrder, template, settings);

  return (
    <iframe
      srcDoc={html}
      style={{ width: '100%', height: 600, border: 'none', borderRadius: 8 }}
    />
  );
}

const styles = {
  container: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    height: '100%',
    background: '#f9fafb',
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
    padding: '16px',
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '8px 12px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600 as const,
  },
  tabs: {
    display: 'flex' as const,
    gap: '4px',
    padding: '12px 16px',
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: 500 as const,
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  content: {
    flex: 1,
    padding: '24px 16px',
    overflowY: 'auto' as const,
  },
  section: {
    marginBottom: '24px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    marginBottom: '8px',
    display: 'block',
  },
  buttonGroup: {
    display: 'flex' as const,
    gap: '8px',
  },
  typeBtn: {
    flex: 1,
    padding: '10px',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500 as const,
    transition: 'all 0.2s',
  },
  typeBtnActive: {
    background: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },
  sizeBtn: {
    flex: 1,
    padding: '10px',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500 as const,
    transition: 'all 0.2s',
  },
  sizeBtnActive: {
    background: '#10b981',
    color: 'white',
    borderColor: '#10b981',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '8px',
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  deviceStatus: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
    padding: '12px',
    background: '#ecfdf5',
    borderRadius: '6px',
    fontSize: '14px',
  },
  statusDot: {
    fontSize: '12px',
  },
  connectBtn: {
    width: '100%',
    padding: '12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600 as const,
    transition: 'all 0.2s',
  },
  disconnectBtn: {
    marginLeft: 'auto',
    padding: '6px 12px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  sliderContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
  },
  slider: {
    flex: 1,
    cursor: 'pointer',
  },
  sliderValue: {
    minWidth: '50px',
    textAlign: 'right' as const,
    fontSize: '14px',
    fontWeight: 600 as const,
  },
  toggleContainer: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  toggleRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '8px',
    fontSize: '14px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  testBtn: {
    width: '100%',
    padding: '12px',
    background: '#06b6d4',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600 as const,
    transition: 'all 0.2s',
  },
  status: {
    marginTop: '12px',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'center' as const,
    background: '#f0fdf4',
  },
  previewContainer: {
    display: 'flex' as const,
    justifyContent: 'center' as const,
    padding: '24px',
  },
  previewPaper: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
};
