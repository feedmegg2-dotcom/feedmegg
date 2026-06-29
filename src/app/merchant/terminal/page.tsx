'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PrinterSettingsScreen } from '@/components/PrinterSettingsScreen'
import { usePrinterAutoprint } from '@/hooks/usePrinterAutoprint'

export default function TerminalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [archivedOrders, setArchivedOrders] = useState<any[]>([])
  const [tab, setTab] = useState<'incoming' | 'accepted' | 'preorders' | 'missed'>('incoming')
  const dismissedMissedIds = useRef<Set<string>>(new Set())
  const [dismissedVersion, setDismissedVersion] = useState(0)

  function dismissOrder(id: string) {
    dismissedMissedIds.current.add(id)
    const arr = Array.from(dismissedMissedIds.current)
    localStorage.setItem('feedme-dismissed-orders', JSON.stringify(arr))
    setDismissedVersion(v => v + 1)
  }

  function clearAllDismissed(ids: string[]) {
    ids.forEach(id => dismissedMissedIds.current.add(id))
    const arr = Array.from(dismissedMissedIds.current)
    localStorage.setItem('feedme-dismissed-orders', JSON.stringify(arr))
    setDismissedVersion(v => v + 1)
  } // force re-render when dismissed changes
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [screen, setScreen] = useState<'main' | 'neworder' | 'detail' | 'paying' | 'paid' | 'items' | 'eod' | 'history'>('main')
  const [cogOpen, setCogOpen] = useState(false)
  const [selectedWait, setSelectedWait] = useState(25)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [showRestaurantSelector, setShowRestaurantSelector] = useState(false)
  const [restaurantList, setRestaurantList] = useState<any[]>([])
  const [merchantData, setMerchantData] = useState<any>(null)
  const [aiTagging, setAiTagging] = useState(false)
  const [selectedSound, setSelectedSound] = useState('chime')
  const [paymentSound, setPaymentSound] = useState('bell')
  const alertRef = useRef<any>(null)
  const alertedOrderIds = useRef<Set<string>>(new Set())
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState<string>('')
  const [historyEndDate, setHistoryEndDate] = useState<string>('')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [delivTime, setDelivTime] = useState(25)
  const [pickTime, setPickTime] = useState(15)
  const [timeModal, setTimeModal] = useState<'delivery' | 'pickup' | null>(null)
  const [toggles, setToggles] = useState({ preorders: true, delivery: true, pickups: true, delivery_enabled: true, pickup_enabled: true })
  const [showTimeSlotModal, setShowTimeSlotModal] = useState<'delivery' | 'pickup' | null>(null)
  const [deliveryTime, setDeliveryTime] = useState(45)
  const [preOrderLeadTime, setPreOrderLeadTime] = useState(30)
  const printPendingRef = useRef<Set<string>>(new Set())
  const [printPendingOrders, setPrintPendingOrders] = useState<any[]>([])
  const [printerIp, setPrinterIp] = useState('')
  const [printerWidth, setPrinterWidth] = useState(80)
  const [autoPrint, setAutoPrint] = useState(true)
  const autoPrintRef = useRef(autoPrint)
  useEffect(() => { autoPrintRef.current = autoPrint }, [autoPrint])
  const [printerOnline, setPrinterOnline] = useState<boolean | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected')
  const reconnectRef = useRef<any>(null)
  const currentRestIdRef = useRef<string>('')

  const [deliverySlotDuration, setDeliverySlotDuration] = useState(30)
  const [deliverySlotCapacity, setDeliverySlotCapacity] = useState(4)
  const [pickupTime, setPickupTime] = useState(30)
  const [pickupSlotDuration, setPickupSlotDuration] = useState(30)
  const [pickupSlotCapacity, setPickupSlotCapacity] = useState(4)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const countdownRef = useRef<any>(null)
  const pollRef = useRef<any>(null)
  const syncRef = useRef<any>(null)
  const audioCtx = useRef<any>(null)
  const wakeLockRef = useRef<any>(null)

  // Printer hook
  const { triggerAutoPrint, manualReprint } = usePrinterAutoprint(restaurant?.id, printerIp, printerWidth)
  const triggerAutoPrintRef = useRef(triggerAutoPrint)
  useEffect(() => { triggerAutoPrintRef.current = triggerAutoPrint }, [triggerAutoPrint])

  useEffect(() => {
    // Load dismissed orders from localStorage after hydration
    try {
      const saved = JSON.parse(localStorage.getItem('feedme-dismissed-orders') || '[]')
      saved.forEach((id: string) => dismissedMissedIds.current.add(id))
    } catch (e) {}
    checkAuth()
    // Keep screen awake
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch (e) { console.log('Wake lock failed:', e) }
    }
    requestWakeLock()
    // Re-request wake lock when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock()
      if (document.visibilityState === 'hidden') stopAlertRepeat()
    })
    // Request fullscreen automatically
    const requestFullscreen = () => {
      const el = document.documentElement
      if (el.requestFullscreen) el.requestFullscreen()
      else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen()
      else if ((el as any).mozRequestFullScreen) (el as any).mozRequestFullScreen()
    }
    // Need user interaction first on some browsers
    const handler = () => { requestFullscreen(); document.removeEventListener('touchstart', handler); document.removeEventListener('click', handler) }
    document.addEventListener('touchstart', handler)
    document.addEventListener('click', handler)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (syncRef.current) clearInterval(syncRef.current)
      if (alertRef.current) clearInterval(alertRef.current)
      if (wakeLockRef.current) wakeLockRef.current.release()
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('click', handler)
    }
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/merchant/login'); return }
    
    let { data: merchant } = await supabase.from('merchants').select('*').eq('auth_id', session.user.id).maybeSingle()
    if (!merchant) {
      const res2 = await supabase.from('merchants').select('*').ilike('email', session.user.email || '').maybeSingle()
      merchant = res2.data
      if (merchant) await supabase.from('merchants').update({ auth_id: session.user.id }).eq('id', merchant.id)
    }
    if (!merchant) { router.push('/merchant/login'); return }

    setMerchantData(merchant)

    // Check if this tablet has already claimed a terminal
    const savedTerminalId = localStorage.getItem('feedme-terminal-id')

    if (savedTerminalId) {
      // Load the claimed terminal
      const { data: terminal } = await supabase.from('terminals').select('*').eq('id', savedTerminalId).maybeSingle()
      if (terminal?.restaurant_id) {
        const { data: rest } = await supabase.from('restaurants').select('*').eq('id', terminal.restaurant_id).maybeSingle()
        if (rest) {
          initRestaurant(rest, merchant, terminal.id)
          return
        }
      }
      // Terminal was deleted or has no restaurant - clear and show selector
      localStorage.removeItem('feedme-terminal-id')
    }

    // Show terminal selector - show all terminals (allow reclaiming)
    const { data: allTerminals } = await supabase.from('terminals').select('*').eq('merchant_id', merchant.id)
    
    // Fetch restaurant details separately
    const terminalsWithRests = await Promise.all((allTerminals || []).map(async (t: any) => {
      if (!t.restaurant_id) return { ...t, restaurants: null }
      const { data: rest } = await supabase.from('restaurants').select('name, emoji, parish').eq('id', t.restaurant_id).maybeSingle()
      return { ...t, restaurants: rest }
    }))
    
    setRestaurantList(terminalsWithRests)
    setShowRestaurantSelector(true)
  }

  async function initRestaurant(rest: any, merchant: any, terminalId?: string) {
    const deviceInfo = navigator.userAgent.includes('Android') ? 'Android tablet' : navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Browser'
    
    if (terminalId) {
      // Update last_seen on claimed terminal
      await supabase.from('terminals').update({ last_seen: new Date().toISOString(), claimed_device: deviceInfo }).eq('id', terminalId)
      // Ping every 2 minutes
      setInterval(async () => {
        await supabase.from('terminals').update({ last_seen: new Date().toISOString() }).eq('id', terminalId)
      }, 2 * 60 * 1000)
    }

    setRestaurant(rest)
    setDelivTime(rest.delivery_time_mins || 25)
    setPickTime(rest.pickup_time_mins || 15)
    setDeliveryTime(rest.delivery_time_mins || 45)
    setPreOrderLeadTime(rest.preorder_lead_time_mins || 30)
    setPrinterIp(rest.printer_ip || '')
    setPrinterWidth(rest.printer_width || 80)
    setDeliverySlotDuration(rest.delivery_slot_duration || 30)
    setDeliverySlotCapacity(rest.delivery_slot_capacity || 4)
    setPickupTime(rest.pickup_time_mins || 30)
    setPickupSlotDuration(rest.pickup_slot_duration || 30)
    setPickupSlotCapacity(rest.pickup_slot_capacity || 4)
    setToggles(t => ({
      ...t,
      delivery: rest.preorder_delivery_enabled ?? true,
      pickups: rest.preorder_pickup_enabled ?? true,
      delivery_enabled: rest.delivery_enabled ?? true,
      pickup_enabled: rest.pickup_enabled ?? true,
    }))
    fetchMenuItems(rest.id)
    startPolling(rest.id)
  }

  async function fetchMenuItems(restId: string) {
    if (!restId) return
    const { data } = await supabase.from('menu_items').select('*, menu_categories(name)').eq('restaurant_id', restId)
    setMenuItems(data || [])
  }

  function startPolling(restId: string) {
    if (!restId) return
    currentRestIdRef.current = restId
    // First poll - pre-populate paid orders so we don't re-alert them
    pollOrders(restId, true)
    pollRef.current = setInterval(() => pollOrders(restId), 5000)
    checkPrinterStatus()
    setInterval(() => checkPrinterStatus(), 30000)
  }

  async function checkPrinterStatus() {
    try {
      await fetch('http://localhost:8080', { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      })
      setPrinterOnline(true)
    } catch (e) {
      setPrinterOnline(false)
    }
  }

  async function aiTagMenu() {
    if (!restaurant) return
    if (!confirm('Run AI tagging on all your menu items? This adds allergen info and calorie estimates. May take a few minutes.')) return
    setAiTagging(true)
    try {
      const res = await fetch('/api/admin/ai-tag-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id })
      })
      const data = await res.json()
      alert(data.message || ('Error: ' + data.error))
    } catch (e) {
      alert('AI tagging failed')
    }
    setAiTagging(false)
  }

  function playAlertSound(soundName?: string) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const name = soundName || selectedSound
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      const t = ctx.currentTime
      gain.gain.setValueAtTime(0.3, t)

      if (name === 'chime') { osc.type = 'sine'; osc.frequency.setValueAtTime(880, t); osc.frequency.setValueAtTime(1100, t+0.15); osc.frequency.setValueAtTime(880, t+0.3); gain.gain.exponentialRampToValueAtTime(0.001, t+0.8) }
      else if (name === 'ding') { osc.type = 'sine'; osc.frequency.setValueAtTime(1200, t); osc.frequency.exponentialRampToValueAtTime(600, t+0.5); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'beep') { osc.type = 'square'; osc.frequency.setValueAtTime(800, t); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.3) }
      else if (name === 'alert') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(440, t); osc.frequency.setValueAtTime(880, t+0.1); osc.frequency.setValueAtTime(440, t+0.2); osc.frequency.setValueAtTime(880, t+0.3); gain.gain.exponentialRampToValueAtTime(0.001, t+0.5) }
      else if (name === 'bell') { osc.type = 'triangle'; osc.frequency.setValueAtTime(1568, t); osc.frequency.exponentialRampToValueAtTime(784, t+1); gain.gain.exponentialRampToValueAtTime(0.001, t+1.2) }
      else if (name === 'ping') { osc.type = 'sine'; osc.frequency.setValueAtTime(1400, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.4) }
      else if (name === 'buzz') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.3) }
      else if (name === 'pop') { osc.type = 'sine'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(100, t+0.1); gain.gain.exponentialRampToValueAtTime(0.001, t+0.15) }
      else if (name === 'blip') { osc.type = 'square'; osc.frequency.setValueAtTime(600, t); osc.frequency.setValueAtTime(900, t+0.05); gain.gain.exponentialRampToValueAtTime(0.001, t+0.2) }
      else if (name === 'horn') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(350, t); osc.frequency.setValueAtTime(400, t+0.1); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'whistle') { osc.type = 'sine'; osc.frequency.setValueAtTime(2000, t); osc.frequency.setValueAtTime(1800, t+0.1); osc.frequency.setValueAtTime(2000, t+0.2); gain.gain.exponentialRampToValueAtTime(0.001, t+0.4) }
      else if (name === 'cuckoo') { osc.type = 'triangle'; osc.frequency.setValueAtTime(528, t); osc.frequency.setValueAtTime(440, t+0.2); osc.frequency.setValueAtTime(528, t+0.5); osc.frequency.setValueAtTime(440, t+0.7); gain.gain.exponentialRampToValueAtTime(0.001, t+1) }
      else if (name === 'siren') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, t); osc.frequency.linearRampToValueAtTime(800, t+0.4); osc.frequency.linearRampToValueAtTime(400, t+0.8); gain.gain.exponentialRampToValueAtTime(0.001, t+1) }
      else if (name === 'doorbell') { osc.type = 'sine'; osc.frequency.setValueAtTime(698, t); osc.frequency.setValueAtTime(587, t+0.3); gain.gain.exponentialRampToValueAtTime(0.001, t+0.8) }
      else if (name === 'chirp') { osc.type = 'sine'; osc.frequency.setValueAtTime(1000, t); osc.frequency.exponentialRampToValueAtTime(2000, t+0.1); gain.gain.exponentialRampToValueAtTime(0.001, t+0.2) }
      else if (name === 'gong') { osc.type = 'triangle'; osc.frequency.setValueAtTime(220, t); gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.001, t+2) }
      else if (name === 'xylophone') { osc.type = 'triangle'; osc.frequency.setValueAtTime(1046, t); osc.frequency.setValueAtTime(880, t+0.15); osc.frequency.setValueAtTime(1046, t+0.3); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'trumpet') { osc.type = 'square'; osc.frequency.setValueAtTime(523, t); osc.frequency.setValueAtTime(659, t+0.15); osc.frequency.setValueAtTime(784, t+0.3); gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'sonar') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(200, t+0.5); gain.gain.exponentialRampToValueAtTime(0.001, t+0.6) }
      else if (name === 'sparkle') { osc.type = 'sine'; osc.frequency.setValueAtTime(2000, t); osc.frequency.setValueAtTime(2500, t+0.05); osc.frequency.setValueAtTime(3000, t+0.1); osc.frequency.setValueAtTime(2500, t+0.15); gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.4) }

      osc.start(t); osc.stop(t + 2)
    } catch (e) { console.log('Sound error:', e) }
  }

  async function syncFoodGG(restId: string) {
    try {
      const res = await fetch('/api/merchant/sync-foodgg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restId })
      })
      const data = await res.json()
      if (data.changes?.length > 0) {
        console.log('food.gg sync:', data.message)
      }
    } catch (e) {
      console.log('Sync failed:', e)
    }
  }

  function startAlertRepeat() {
    if (alertRef.current) return
    playAlertSound(selectedSound)
    alertRef.current = setInterval(() => playAlertSound(selectedSound), 2000)
  }

  function stopAlertRepeat() {
    if (alertRef.current) { clearInterval(alertRef.current); alertRef.current = null }
  }

  function startReconnecting() {
    if (reconnectRef.current) return // already reconnecting
    setConnectionStatus('reconnecting')
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    reconnectRef.current = setInterval(async () => {
      try {
        const restId = currentRestIdRef.current
        if (!restId) return
        const { data, error } = await supabase.from('orders').select('id').eq('restaurant_id', restId).limit(1)
        if (!error) {
          clearInterval(reconnectRef.current)
          reconnectRef.current = null
          setConnectionStatus('connected')
          pollOrders(restId, false)
          pollRef.current = setInterval(() => pollOrders(restId), 5000)
        }
      } catch (e) {}
    }, 3000)
  }

  async function pollOrders(restId: string, isFirstLoad = false) {
    const today = new Date().toISOString().split('T')[0]
    let data: any[] | null = null
    let fetchError: any = null
    try {
      const result = await supabase.from('orders').select('*, order_items(*)').eq('restaurant_id', restId).in('status', ['pending', 'accepted', 'waiting_payment', 'paid', 'cancelled', 'rejected']).gte('created_at', today + 'T00:00:00').order('created_at', { ascending: false }).limit(50)
      data = result.data
      fetchError = result.error
    } catch (e) {
      fetchError = e
      }
    if (fetchError || !data) {
        setConnectionStatus('reconnecting')
      startReconnecting()
      return
    }
    setConnectionStatus('connected')

    // AUTO-MOVE PRE-ORDERS to INCOMING at lead time
    const now = new Date()
    const leadTimeMins = restaurant?.preorder_lead_time_mins || preOrderLeadTime || 30
    const preOrdersDue = data.filter(o => {
      if (o.status !== 'pending' || !o.scheduled_for) return false
      const scheduledTime = new Date(o.scheduled_for)
      const minsUntilOrder = (scheduledTime.getTime() - now.getTime()) / 60000
      return minsUntilOrder <= leadTimeMins
    })

    // Move due pre-orders to incoming (keep scheduled_for for printing, just add note)
    for (const o of preOrdersDue) {
      if (!o.notes?.includes('PRE-ORDER')) {
        await supabase.from('orders').update({ 
          notes: (o.notes ? o.notes + ' | ' : '') + `PRE-ORDER (was ${new Date(o.scheduled_for).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})`
        }).eq('id', o.id)
      }
    }

    const prevPendingIds = orders.filter(o => o.status === 'pending').map((o: any) => o.id)
    const newPending = data.filter(o => 
      o.status === 'pending' && 
      !o.scheduled_for && 
      !alertedOrderIds.current.has(o.id)
    )
    
    // Also alert for newly moved pre-orders
    const newFromPreOrder = preOrdersDue.filter(o => !alertedOrderIds.current.has(o.id))
    
    setOrders(data)

    // On first load, mark all existing paid/alerted orders so we don't re-trigger
    if (isFirstLoad) {
      data.filter(o => o.status === 'paid' || o.status === 'accepted' || o.status === 'waiting_payment').forEach(o => {
        alertedOrderIds.current.add(o.id)
        alertedOrderIds.current.add('paid_' + o.id)
        printPendingRef.current.add(o.id)
      })
      return
    }
    const waitingOrders = data.filter(o => o.status === 'waiting_payment' && o.id)
    for (const o of waitingOrders) {
      const checkKey = 'sumup_check_' + o.id
      if (!alertedOrderIds.current.has(checkKey)) {
        alertedOrderIds.current.add(checkKey)
        setTimeout(() => alertedOrderIds.current.delete(checkKey), 15000)
        try {
          const res = await fetch(`/api/sumup/webhook?orderId=${o.id}`)
          const result = await res.json()
          if (result.status === 'paid') {
            // Will be picked up in next poll
          }
        } catch (e) {}
      }
    }
    const justPaid = data.filter(o => 
      o.status === 'paid' && 
      o.payment_method === 'card' &&
      !printPendingRef.current.has(o.id) &&
      !alertedOrderIds.current.has('paid_' + o.id)
    )

    // Detect failed/cancelled card payments
    const justFailed = data.filter(o =>
      o.status === 'cancelled' &&
      o.payment_method === 'card' &&
      !alertedOrderIds.current.has('failed_' + o.id)
    )
    for (const o of justFailed) {
      alertedOrderIds.current.add('failed_' + o.id)
      playAlertSound('buzz')
    }

    for (const o of justPaid) {
      alertedOrderIds.current.add('paid_' + o.id)
      playAlertSound(paymentSound)
      const printOrder = {
        id: o.id,
        orderNumber: o.order_number,
        restaurantName: restaurant?.name || 'Restaurant',
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        deliveryAddress: o.delivery_address,
        what3words: o.delivery_what3words || undefined,
        isCollection: o.order_type === 'collection' || o.order_type === 'pickup',
        contactlessDelivery: o.contactless_delivery,
        isPreOrder: !!o.scheduled_for || !!(o.notes?.includes('PRE-ORDER')),
        scheduledFor: o.scheduled_for,
        preOrderTime: o.scheduled_for ? (() => {
          const d = new Date(o.scheduled_for)
          const today = new Date()
          const isTomorrow = d.toDateString() !== today.toDateString()
          return isTomorrow
            ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        })() : undefined,
        items: o.order_items || [],
        specialInstructions: o.special_instructions || o.notes,
        subtotal: o.subtotal,
        deliveryFee: o.delivery_fee,
        tip: o.tip,
        total: o.total,
        paymentMethod: o.payment_method,
      }
      if (autoPrintRef.current) {
        triggerAutoPrintRef.current(printOrder, 'paid')
        printPendingRef.current.add(o.id)
      } else {
        setPrintPendingOrders(prev => [...prev.filter(p => p.id !== o.id), printOrder])
      }
      // If this is the current order on paying screen, move to paid screen
      stopAlertRepeat()
      setScreen(prev => {
        if (prev === 'paying') {
          setTimeout(() => { setScreen('main'); setCurrentOrderId(null) }, 3000)
          return 'paid'
        }
        return prev
      })
    }
    
    if (newFromPreOrder.length > 0) {
      const firstNew = newFromPreOrder[0]
      alertedOrderIds.current.add(firstNew.id)
      setCurrentOrderId(firstNew.id)
      setScreen('neworder')
      startAlertRepeat()
    } else if (newPending.length > 0) {
      const firstNew = newPending[0]
      alertedOrderIds.current.add(firstNew.id)
      setCurrentOrderId(firstNew.id)
      setScreen('neworder')
      startAlertRepeat()
    } else {
    }
  }

  function playSound(type: 'new' | 'reject' | 'paid') {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const ctx = audioCtx.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = type === 'new' ? 880 : type === 'reject' ? 220 : 1100
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  const currentOrder = orders.find(o => o.id === currentOrderId)
  const pendingOrders = orders.filter(o => {
    if (o.status !== 'pending') return false
    if (!o.scheduled_for) return true // ASAP orders
    // Due pre-orders also show in incoming
    const scheduledTime = new Date(o.scheduled_for)
    const minsUntil = (scheduledTime.getTime() - new Date().getTime()) / 60000
    const leadTime = restaurant?.preorder_lead_time_mins || preOrderLeadTime || 30
    return minsUntil <= leadTime
  })
  const preOrders = orders.filter(o => {
    if (o.status !== 'pending' || !o.scheduled_for) return false
    const scheduledTime = new Date(o.scheduled_for)
    const minsUntil = (scheduledTime.getTime() - new Date().getTime()) / 60000
    const leadTime = restaurant?.preorder_lead_time_mins || preOrderLeadTime || 30
    return minsUntil > leadTime
  })
  const acceptedOrders = orders.filter(o => ['accepted', 'waiting_payment', 'paid', 'complete'].includes(o.status))
  const missedOrders = orders.filter(o => ['cancelled', 'rejected'].includes(o.status) && !dismissedMissedIds.current.has(o.id))

  const [accepting, setAccepting] = useState(false)

  async function updateRestaurant(updates: any) {
    if (!restaurant) return
    await fetch('/api/merchant/restaurant', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: restaurant.id, ...updates })
    })
  }

  async function acceptOrder() {
    if (!currentOrder || accepting) return
    setAccepting(true)
    try {
      stopAlertRepeat()
      setAcceptOpen(false)
      // Keep in alertedOrderIds so polling doesn't re-trigger new order screen
      
      const isCash = currentOrder.payment_method === 'cash'
      
      await fetch(`/api/orders/${currentOrder.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', estimatedWaitMins: selectedWait }) })
      
      if (isCash) {
        setScreen('paid')
        playAlertSound(paymentSound)
        const printOrder = {
          id: currentOrder.id,
          orderNumber: currentOrder.order_number,
          restaurantName: restaurant?.name || 'Restaurant',
          customerName: currentOrder.customer_name,
          customerPhone: currentOrder.customer_phone,
          deliveryAddress: currentOrder.delivery_address,
          what3words: currentOrder.delivery_what3words || undefined,
          isCollection: currentOrder.order_type === 'collection' || currentOrder.order_type === 'pickup',
          contactlessDelivery: currentOrder.contactless_delivery,
          isPreOrder: !!currentOrder.scheduled_for,
          scheduledFor: currentOrder.scheduled_for,
          preOrderTime: currentOrder.scheduled_for ? (() => {
            const d = new Date(currentOrder.scheduled_for)
            const today = new Date()
            const isTomorrow = d.toDateString() !== today.toDateString()
            return isTomorrow
              ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          })() : undefined,
          items: currentOrder.order_items || [],
          specialInstructions: currentOrder.special_instructions || currentOrder.notes,
          subtotal: currentOrder.subtotal,
          deliveryFee: currentOrder.delivery_fee,
          tip: currentOrder.tip,
          total: currentOrder.total,
          paymentMethod: currentOrder.payment_method,
        }
        if (autoPrint || isCash) {
          triggerAutoPrintRef.current(printOrder, 'paid')
        } else {
          setPrintPendingOrders(prev => [...prev.filter(p => p.id !== currentOrder.id), printOrder])
        }
        setTimeout(() => { setScreen('main'); setCurrentOrderId(null); setAccepting(false) }, 3000)
      } else {
        stopAlertRepeat()
        setScreen('main')
        setCurrentOrderId(null)
        setAccepting(false)
      }
    } catch (e) {
      console.error('Accept order failed:', e)
      setAccepting(false)
    }
  }

  async function confirmPayment() {
    if (!currentOrder) return
    clearInterval(countdownRef.current)
    await fetch(`/api/orders/${currentOrder.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'payment_confirmed' }) })
    setScreen('paid')
    playAlertSound(paymentSound)
    
    // Trigger auto-print
    triggerAutoPrintRef.current({
      id: currentOrder.id,
      orderNumber: currentOrder.order_number,
      restaurantName: restaurant?.name || 'Restaurant',
      customerName: currentOrder.customer_name,
      customerPhone: currentOrder.customer_phone,
      deliveryAddress: currentOrder.delivery_address,
          what3words: currentOrder.delivery_what3words || undefined,
      isCollection: currentOrder.order_type === 'collection' || currentOrder.order_type === 'pickup',
      contactlessDelivery: currentOrder.contactless_delivery,
      isPreOrder: !!currentOrder.scheduled_for,
      scheduledFor: currentOrder.scheduled_for,
      preOrderTime: currentOrder.scheduled_for ? (() => {
        const d = new Date(currentOrder.scheduled_for)
        const today = new Date()
        const isTomorrow = d.toDateString() !== today.toDateString()
        return isTomorrow
          ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      })() : undefined,
      items: currentOrder.order_items || [],
      specialInstructions: currentOrder.special_instructions || currentOrder.notes,
      subtotal: currentOrder.subtotal,
      deliveryFee: currentOrder.delivery_fee,
      tip: currentOrder.tip,
      total: currentOrder.total,
      paymentMethod: currentOrder.payment_method,
    }, 'paid')

    setTimeout(() => {
      setScreen('main')
      setCurrentOrderId(null)
    }, 3000)
  }

  async function rejectOrder() {
    if (!currentOrder) return
    stopAlertRepeat()
    setRejectOpen(false)
    alertedOrderIds.current.delete(currentOrder.id)
    const reason = selectedReason || customReason || 'No reason given'
    await fetch(`/api/orders/${currentOrder.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', rejectionReason: reason }) })
    playSound('reject')
    setScreen('main')
    setCurrentOrderId(null)
  }

  async function toggleMenuItem(id: string, current: boolean) {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id)
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, is_available: !current } : i))
  }

  const filteredItems = menuItems.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.menu_categories?.name?.toLowerCase().includes(itemSearch.toLowerCase()))

  const themeColors = {
    light: {
      background: '#f8fafc',
      surface: '#f1f5f9',
      surfaceDark: '#e2e8f0',
      text: '#1e293b',
      textSecondary: '#64748b',
      textTertiary: '#94a3b8',
      border: 'rgba(30,41,59,0.08)',
      borderSecondary: 'rgba(30,41,59,0.12)',
    },
    dark: {
      background: '#0a0f1e',
      surface: '#060b18',
      surfaceDark: '#0f172a',
      text: '#f8fafc',
      textSecondary: '#64748b',
      textTertiary: '#94a3b8',
      border: 'rgba(255,255,255,0.08)',
      borderSecondary: 'rgba(255,255,255,0.12)',
    }
  }

  const colors = themeColors[theme]

  // Restaurant selector screen
  if (showRestaurantSelector) {
    return (
      <div style={{ background: '#080c14', height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', padding: '24px' }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
          <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me</span><span style={{ color: '#22c55e' }}>.gg</span>
        </div>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Which terminal is this tablet?</div>
        <div style={{ fontSize: '12px', color: '#334155', marginBottom: '32px' }}>Select your terminal - this will be saved on this device</div>
        
        {restaurantList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', background: '#0d1321', borderRadius: '14px', maxWidth: '400px', width: '100%' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📱</div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#f1f5f9' }}>No terminals available</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Ask your manager to add a terminal in the merchant dashboard.</div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '400px', display: 'grid', gap: '12px' }}>
            {restaurantList.map((terminal: any) => (
              <button key={terminal.id} onClick={async () => {
                // Claim this terminal
                const deviceInfo = navigator.userAgent.includes('Android') ? 'Android tablet' : navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Browser'
                await supabase.from('terminals').update({ claimed_at: new Date().toISOString(), claimed_device: deviceInfo, last_seen: new Date().toISOString() }).eq('id', terminal.id)
                // Also clear any other device's claim on this terminal
                localStorage.setItem('feedme-terminal-id', terminal.id)
                setShowRestaurantSelector(false)
                initRestaurant(terminal.restaurants, merchantData, terminal.id)
              }} style={{ padding: '20px', background: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#f1f5f9', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>📱</span>
                <div>
                  <div>{terminal.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                    {terminal.restaurants?.emoji} {terminal.restaurants?.name} • {terminal.restaurants?.parish}
                  </div>
                  {terminal.claimed_at && (
                    <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>Previously claimed by {terminal.claimed_device || 'another device'} — tap to reclaim</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {restaurant && (
          <button onClick={() => setShowRestaurantSelector(false)}
            style={{ marginTop: '20px', fontSize: '14px', color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            Cancel - stay on {restaurant?.name}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: colors.background, height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', position: 'relative', overflow: 'hidden', touchAction: 'manipulation', transition: 'background 0.3s' }}>

      {/* TOP BAR */}
      <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: 'clamp(6px,1.5vw,12px) clamp(8px,2vw,16px)', display: 'flex', alignItems: 'center', gap: 'clamp(6px,1.5vw,12px)', flexWrap: 'nowrap', position: 'relative', zIndex: 20, flexShrink: 0, transition: 'background 0.3s' }}>

        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(14px,2.5vw,18px)', fontWeight: 700, color: '#22c55e', flexShrink: 0 }}>
          feed<span style={{ color: colors.text }}>me</span>.gg
        </div>

        {/* 2 BIG BOXES - DELIVERY & PICKUP */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(8px,1.5vw,12px)', flex: 1, maxWidth: '420px' }}>
          {/* DELIVERY BOX */}
          <div onClick={() => { setDeliveryTime(delivTime); setDeliverySlotDuration(deliverySlotDuration); setDeliverySlotCapacity(deliverySlotCapacity); setShowTimeSlotModal('delivery') }} style={{ background: colors.surfaceDark, border: `1px solid ${toggles.delivery_enabled ? colors.border : 'rgba(239,68,68,0.3)'}`, borderRadius: '12px', padding: 'clamp(8px,1.5vw,12px)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '6px', opacity: toggles.delivery_enabled ? 1 : 0.7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 700 }}>🚗 Delivery</div>
            </div>
            <div style={{ fontSize: 'clamp(14px,2.5vw,16px)', fontWeight: 700, color: toggles.delivery_enabled ? '#22c55e' : '#ef4444' }}>{delivTime}m</div>
            <div style={{ fontSize: 'clamp(9px,1.4vw,10px)', color: colors.textTertiary }}>Slot: {deliverySlotCapacity}/{deliverySlotDuration}m</div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { const val = !toggles.delivery_enabled; setToggles({...toggles, delivery_enabled: val}); updateRestaurant({ delivery_enabled: val }) }} style={{ flex: 1, padding: '4px 4px', background: toggles.delivery_enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: toggles.delivery_enabled ? '#22c55e' : '#ef4444', border: `0.5px solid ${toggles.delivery_enabled ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '4px', fontSize: '9px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {toggles.delivery_enabled ? '🟢 Open' : '🔴 Closed'}
              </button>
              <button onClick={() => { const val = !toggles.delivery; setToggles({...toggles, delivery: val}); updateRestaurant({ preorder_delivery_enabled: val }) }} style={{ flex: 1, padding: '4px 4px', background: toggles.delivery ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: toggles.delivery ? '#22c55e' : '#ef4444', border: `0.5px solid ${toggles.delivery ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '4px', fontSize: '9px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {toggles.delivery ? '📅 Pre-On' : '📅 Pre-Off'}
              </button>
            </div>
          </div>

          {/* PICKUP BOX */}
          <div onClick={() => { setPickupTime(pickTime); setPickupSlotDuration(pickupSlotDuration); setPickupSlotCapacity(pickupSlotCapacity); setShowTimeSlotModal('pickup') }} style={{ background: colors.surfaceDark, border: `1px solid ${toggles.pickup_enabled ? colors.border : 'rgba(239,68,68,0.3)'}`, borderRadius: '12px', padding: 'clamp(8px,1.5vw,12px)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '6px', opacity: toggles.pickup_enabled ? 1 : 0.7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 700 }}>🏪 Pickup</div>
            </div>
            <div style={{ fontSize: 'clamp(14px,2.5vw,16px)', fontWeight: 700, color: toggles.pickup_enabled ? '#22c55e' : '#ef4444' }}>{pickTime}m</div>
            <div style={{ fontSize: 'clamp(9px,1.4vw,10px)', color: colors.textTertiary }}>Slot: {pickupSlotCapacity}/{pickupSlotDuration}m</div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { const val = !toggles.pickup_enabled; setToggles({...toggles, pickup_enabled: val}); updateRestaurant({ pickup_enabled: val }) }} style={{ flex: 1, padding: '4px 4px', background: toggles.pickup_enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: toggles.pickup_enabled ? '#22c55e' : '#ef4444', border: `0.5px solid ${toggles.pickup_enabled ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '4px', fontSize: '9px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {toggles.pickup_enabled ? '🟢 Open' : '🔴 Closed'}
              </button>
              <button onClick={() => { const val = !toggles.pickups; setToggles({...toggles, pickups: val}); updateRestaurant({ preorder_pickup_enabled: val }) }} style={{ flex: 1, padding: '4px 4px', background: toggles.pickups ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: toggles.pickups ? '#22c55e' : '#ef4444', border: `0.5px solid ${toggles.pickups ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '4px', fontSize: '9px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {toggles.pickups ? '📅 Pre-On' : '📅 Pre-Off'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'clamp(9px,1.4vw,11px)', flexShrink: 0, color: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'reconnecting' ? '#f59e0b' : '#ef4444' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'reconnecting' ? '#f59e0b' : '#ef4444' }} />
          {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
        </div>

        {/* TEST PRINT BUTTON */}
        <button onClick={() => manualReprint({
          id: 'test',
          orderNumber: 'TEST',
          restaurantName: restaurant?.name || 'Restaurant',
          customerName: 'Test Customer',
          customerPhone: '07700 900000',
          deliveryAddress: '12 Test Street, St Peter Port',
          isCollection: false,
          contactlessDelivery: false,
          isPreOrder: false,
          items: [
            { name: 'Test Burger', quantity: 2, price: 5.00, subtotal: 10.00, special_instructions: 'No onions' },
            { name: 'Test Fries', quantity: 1, price: 3.50, subtotal: 3.50 },
          ],
          specialInstructions: 'Test order',
          subtotal: 13.50,
          deliveryFee: 2.50,
          total: 16.00,
        })}
          style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', background: 'rgba(59,130,246,0.1)', border: '0.5px solid rgba(59,130,246,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: 'clamp(9px,1.4vw,11px)', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap', flexShrink: 0 }}>
          🖨️ Test
        </button>

        <button onClick={() => setCogOpen(!cogOpen)} style={{ background: cogOpen ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)', border: `0.5px solid ${cogOpen ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: cogOpen ? '#22c55e' : '#94a3b8', width: 'clamp(30px,4vw,38px)', height: 'clamp(30px,4vw,38px)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(14px,2.5vw,18px)', cursor: 'pointer', flexShrink: 0 }}>&#9881;</button>

        <a href="/merchant/dashboard" style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: 'clamp(30px,4vw,38px)', height: 'clamp(30px,4vw,38px)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(10px,1.6vw,12px)', cursor: 'pointer', flexShrink: 0, textDecoration: 'none', fontWeight: 600 }}>&#8962;</a>

        {cogOpen && (
          <div style={{ position: 'absolute', top: '100%', right: '10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '8px', zIndex: 50, width: 'clamp(260px,30vw,320px)', maxHeight: '80vh', overflowY: 'auto' }}>
            {[
              { icon: '&#9776;', label: 'Menu Items', sub: 'Enable / disable items', screen: 'items' },
              { icon: '&#128203;', label: 'End of Day', sub: 'Report & reset orders', screen: 'eod' },
              { icon: '&#128337;', label: 'Order History', sub: 'Search past orders', screen: 'history' },
            ].map(btn => (
              <button key={btn.screen} onClick={() => { setScreen(btn.screen as any); setCogOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', color: '#f8fafc', padding: '12px 14px', borderRadius: '8px', fontSize: 'clamp(11px,1.8vw,13px)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: btn.icon }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{btn.label}</div>
                  <div style={{ fontSize: 'clamp(9px,1.4vw,10px)', color: '#64748b' }}>{btn.sub}</div>
                </div>
              </button>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '6px 0', padding: '10px 14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Order Sound</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <select value={selectedSound} onChange={e => setSelectedSound(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }}>
                  {['chime','ding','beep','alert','bell','ping','buzz','pop','blip','horn','whistle','cuckoo','siren','doorbell','chirp','gong','xylophone','trumpet','sonar','sparkle'].map(s => (
                    <option key={s} value={s} style={{ background: '#0f172a' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button onClick={() => playAlertSound(selectedSound)} style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Test</button>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Sound</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select value={paymentSound} onChange={e => setPaymentSound(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }}>
                  {['chime','ding','beep','alert','bell','ping','buzz','pop','blip','horn','whistle','cuckoo','siren','doorbell','chirp','gong','xylophone','trumpet','sonar','sparkle'].map(s => (
                    <option key={s} value={s} style={{ background: '#0f172a' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button onClick={() => playAlertSound(paymentSound)} style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Test</button>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0', paddingTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🖨️ Auto Print</div>
                  <div onClick={() => setAutoPrint(!autoPrint)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: autoPrint ? '#22c55e' : '#334155', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '2px', left: autoPrint ? '18px' : '2px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#475569', marginBottom: '8px' }}>{autoPrint ? 'Tickets print automatically' : 'Auto print disabled'}</div>
                
                {/* Printer IP */}
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Printer IP</div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <input
                    value={printerIp}
                    onChange={e => setPrinterIp(e.target.value)}
                    placeholder="e.g. 192.168.1.100"
                    style={{ flex: 1, padding: '5px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', fontSize: '11px', outline: 'none' }}
                  />
                </div>
                <button onClick={async () => {
                  await updateRestaurant({ printer_ip: printerIp, printer_width: printerWidth })
                  alert('Printer settings saved!')
                }} style={{ width: '100%', padding: '5px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600, marginBottom: '4px' }}>
                  Save Printer IP
                </button>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0', paddingTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pre-Order Lead Time</div>
                <select value={preOrderLeadTime} onChange={async e => {
                  const val = parseInt(e.target.value)
                  setPreOrderLeadTime(val)
                  await updateRestaurant({ preorder_lead_time_mins: val })
                }} style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none', marginBottom: '4px' }}>
                  {[10, 15, 20, 30, 45, 60].map(t => (
                    <option key={t} value={t} style={{ background: '#0f172a' }}>{t} mins before</option>
                  ))}
                </select>
                <div style={{ fontSize: '10px', color: '#475569' }}>Order moves to Incoming {preOrderLeadTime} mins before scheduled time</div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0', paddingTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setTheme('light')} style={{ flex: 1, padding: '6px 10px', background: theme === 'light' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${theme === 'light' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: theme === 'light' ? '#22c55e' : '#94a3b8', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Light</button>
                  <button onClick={() => setTheme('dark')} style={{ flex: 1, padding: '6px 10px', background: theme === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${theme === 'dark' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: theme === 'dark' ? '#22c55e' : '#94a3b8', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Dark</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINT PENDING BANNER */}
      {printPendingOrders.length > 0 && (
        <div style={{ background: 'rgba(34,197,94,0.1)', borderBottom: '1px solid rgba(34,197,94,0.3)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          {printPendingOrders.map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ fontSize: 'clamp(11px,1.8vw,13px)', color: '#22c55e', fontWeight: 600 }}>
                ✅ Order #{String(o.orderNumber).slice(-6).toUpperCase()} paid - GBP{o.total?.toFixed(2)}
              </div>
              <button onClick={() => {
                manualReprint(o)
                setPrintPendingOrders(prev => prev.filter(p => p.id !== o.id))
                printPendingRef.current.add(o.id)
              }} style={{ padding: '6px 14px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '6px', fontSize: 'clamp(11px,1.8vw,13px)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                🖨️ Print Tickets
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', background: colors.surface, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        {(['incoming', 'preorders', 'accepted', 'missed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 'clamp(8px,1.5vw,12px)', textAlign: 'center', fontSize: 'clamp(11px,1.8vw,13px)', fontWeight: 500, color: tab === t ? '#22c55e' : colors.textTertiary, border: 'none', background: 'none', borderBottom: `2px solid ${tab === t ? '#22c55e' : 'transparent'}`, cursor: 'pointer' }}>
            {t === 'incoming' ? 'Incoming' : t === 'preorders' ? 'Pre-Orders' : t === 'accepted' ? 'Accepted' : 'Missed/Rejected'}
            {t === 'incoming' && pendingOrders.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ef4444', color: 'white', fontSize: '9px', fontWeight: 600, width: '16px', height: '16px', borderRadius: '50%', marginLeft: '5px', verticalAlign: 'middle' }}>
                {pendingOrders.length}
              </span>
            )}
            {t === 'preorders' && preOrders.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: 'white', fontSize: '9px', fontWeight: 600, width: '16px', height: '16px', borderRadius: '50%', marginLeft: '5px', verticalAlign: 'middle' }}>
                {preOrders.length}
              </span>
            )}
            {t === 'missed' && missedOrders.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f97316', color: 'white', fontSize: '9px', fontWeight: 600, width: '16px', height: '16px', borderRadius: '50%', marginLeft: '5px', verticalAlign: 'middle' }}>
                {missedOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MAIN ORDER LIST */}
      <div style={{ flex: 1, padding: 'clamp(6px,1.5vw,12px)', overflowY: 'auto', background: colors.background }}>
        
        {/* INCOMING TAB */}
        {tab === 'incoming' && (
          pendingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: colors.textTertiary }}>
              <div style={{ fontSize: 'clamp(11px,2vw,14px)' }}>No pending orders</div>
            </div>
          ) : (
            pendingOrders.map(o => (
              <div key={o.id} onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ background: colors.surfaceDark, border: `1px solid ${colors.borderSecondary}`, borderLeft: `3px solid #22c55e`, borderRadius: '10px', padding: 'clamp(10px,2vw,14px)', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <div style={{ fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 600, color: colors.text }}>{o.order_number || String(o.id).slice(-6).toUpperCase()}</div>
                  <span style={{ fontSize: 'clamp(9px,1.5vw,11px)', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Live order</span>
                </div>
                <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: colors.textSecondary, marginBottom: '4px' }}>
                  {o.customer_name} • {o.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Collection'} • {o.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 600, color: '#22c55e' }}>GBP{o.total?.toFixed(2)}</div>
                  <div style={{ fontSize: 'clamp(9px,1.4vw,11px)', color: colors.textTertiary }}>Tap to view</div>
                </div>
              </div>
            ))
          )
        )}

        {/* PRE-ORDERS TAB */}
        {tab === 'preorders' && (
          preOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: colors.textTertiary }}>
              <div style={{ fontSize: 'clamp(11px,2vw,14px)' }}>No pre-orders scheduled</div>
            </div>
          ) : (
            preOrders.map(o => (
              <div key={o.id} onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ background: colors.surfaceDark, border: `1px solid ${colors.borderSecondary}`, borderLeft: `3px solid #3b82f6`, borderRadius: '10px', padding: 'clamp(10px,2vw,14px)', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <div style={{ fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 600, color: colors.text }}>{o.order_number || String(o.id).slice(-6).toUpperCase()}</div>
                  <span style={{ fontSize: 'clamp(9px,1.5vw,11px)', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>📅 Pre-order</span>
                </div>
                <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: '#3b82f6', fontWeight: 600, marginBottom: '4px' }}>
                  {o.scheduled_for ? `⏰ ${new Date(o.scheduled_for).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
                <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: colors.textSecondary, marginBottom: '4px' }}>
                  {o.customer_name} • {o.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Collection'} • {o.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 600, color: '#3b82f6' }}>GBP{o.total?.toFixed(2)}</div>
                  <div style={{ fontSize: 'clamp(9px,1.4vw,11px)', color: colors.textTertiary }}>Tap to view</div>
                </div>
              </div>
            ))
          )
        )}

        {/* ACCEPTED TAB */}
        {tab === 'accepted' && (
          acceptedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#475569' }}>
              <div style={{ fontSize: 'clamp(11px,2vw,14px)' }}>No accepted orders today</div>
            </div>
          ) : (
            acceptedOrders.map(o => (
              <div key={o.id} onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ background: '#0f172a', borderLeft: `3px solid ${o.status === 'paid' ? '#22c55e' : '#f97316'}`, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: 'clamp(10px,2vw,14px)', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 600, color: '#f8fafc' }}>{o.order_number || String(o.id).slice(-6).toUpperCase()}</div>
                  <span style={{ fontSize: 'clamp(9px,1.5vw,11px)', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: o.status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)', color: o.status === 'paid' ? '#22c55e' : '#f97316' }}>
                    {o.status === 'paid' ? '✅ Paid' : o.status === 'accepted' ? '✓ Accepted' : '⏳ Waiting payment'}
                  </span>
                </div>
                <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: '#64748b', marginBottom: '4px' }}>
                  {o.customer_name} • {o.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Collection'} • {o.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 600, color: '#22c55e' }}>GBP{o.total?.toFixed(2)}</div>
                  <div style={{ fontSize: 'clamp(9px,1.4vw,11px)', color: '#475569' }}>Tap to view</div>
                </div>
              </div>
            ))
          )
        )}

        {/* MISSED TAB */}
        {tab === 'missed' && (
          missedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: colors.textTertiary }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontSize: 'clamp(11px,2vw,14px)' }}>No missed orders</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button onClick={() => clearAllDismissed(missedOrders.map(o => o.id))} style={{ padding: '6px 14px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Clear All
                </button>
              </div>
              {missedOrders.map(o => (
                <div key={o.id} style={{ background: colors.surfaceDark, border: `1px solid ${o.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)'}`, borderLeft: `3px solid ${o.status === 'rejected' ? '#ef4444' : '#f97316'}`, borderRadius: '10px', padding: 'clamp(10px,2vw,14px)', marginBottom: '8px', opacity: 0.9 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ flex: 1, cursor: 'pointer' }}>
                      <div style={{ fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 600, color: colors.text }}>{o.order_number || String(o.id).slice(-6).toUpperCase()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: 'clamp(9px,1.5vw,11px)', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: o.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: o.status === 'rejected' ? '#ef4444' : '#f97316' }}>
                        {o.status === 'rejected' ? '❌ Rejected' : '⏱️ Missed'}
                      </span>
                      <button onClick={() => dismissOrder(o.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                    </div>
                  </div>
                  <div onClick={() => { setCurrentOrderId(o.id); setScreen('detail') }} style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: colors.textSecondary, marginBottom: '4px' }}>
                      {o.customer_name} • {o.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'} • {o.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                    </div>
                    {o.rejection_reason && (
                      <div style={{ fontSize: 'clamp(10px,1.6vw,11px)', color: '#ef4444', marginBottom: '4px', fontStyle: 'italic' }}>
                        "{o.rejection_reason}"
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 600, color: o.status === 'rejected' ? '#ef4444' : '#f97316' }}>GBP{o.total?.toFixed(2)}</div>
                      <div style={{ fontSize: 'clamp(9px,1.4vw,11px)', color: colors.textTertiary }}>{new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )
        )}

      </div>

      {/* NEW ORDER SCREEN */}
      {screen === 'neworder' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          {/* BACK BUTTON */}
          <div style={{ padding: 'clamp(8px,2vw,14px)', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => { stopAlertRepeat(); setScreen('main'); setCurrentOrderId(null) }} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: 'clamp(5px,1vw,8px) clamp(8px,1.5vw,12px)', borderRadius: '6px', fontSize: 'clamp(11px,1.8vw,13px)', cursor: 'pointer' }}>← Back</button>
          </div>
          {/* CONTENT */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
            <div style={{ width: 'clamp(80px,15vw,120px)', height: 'clamp(80px,15vw,120px)', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(32px,7vw,52px)', marginBottom: '20px' }}>&#128276;</div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(24px,5vw,36px)', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>NEW ORDER!</div>
            <div style={{ fontSize: 'clamp(12px,2.5vw,16px)', color: '#64748b', marginBottom: '28px' }}>
              {currentOrder ? `${currentOrder.customer_name} - GBP${currentOrder.total?.toFixed(2)}` : 'Tap to view'}
            </div>
            <button onClick={() => setScreen('detail')} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(12px,2.5vw,18px) clamp(28px,6vw,48px)', borderRadius: '14px', fontSize: 'clamp(14px,3vw,20px)', fontWeight: 700, cursor: 'pointer' }}>
              View Order
            </button>
          </div>
        </div>
      )}

      {screen === 'detail' && currentOrder && (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', zIndex: 200 }}>
          {/* HEADER */}
          <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(8px,2vw,14px)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button onClick={() => { 
              if (currentOrder?.status === 'pending') {
                setScreen('neworder')
              } else {
                setScreen('main')
                setCurrentOrderId(null)
              }
            }} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: 'clamp(5px,1vw,8px) clamp(8px,1.5vw,12px)', borderRadius: '6px', fontSize: 'clamp(11px,1.8vw,13px)', cursor: 'pointer' }}>← Back</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(13px,2.5vw,17px)', fontWeight: 700, color: '#f8fafc' }}>Order #{currentOrder.order_number || String(currentOrder.id).slice(-6).toUpperCase()}</div>
              <div style={{ fontSize: 'clamp(9px,1.5vw,11px)', color: '#64748b' }}>
                {currentOrder.scheduled_for ? `📅 PRE-ORDER - ${new Date(currentOrder.scheduled_for).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : '⚡ ASAP Order'}
                {' • '}
                {currentOrder.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                {' • '}
                {currentOrder.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(10px,2vw,16px)' }}>

            {/* PRE-ORDER BADGE */}
            {currentOrder.scheduled_for && (
              <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '20px' }}>📅</div>
                <div>
                  <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 700, color: '#3b82f6' }}>PRE-ORDER</div>
                  <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: '#64748b' }}>
                    Scheduled for {new Date(currentOrder.scheduled_for).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )}

            {/* CONTACTLESS BADGE */}
            {currentOrder.contactless_delivery && (
              <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '10px', padding: '10px 16px', marginBottom: '12px', fontSize: 'clamp(11px,1.8vw,13px)', color: '#f97316', fontWeight: 600 }}>
                🚪 CONTACTLESS DELIVERY
              </div>
            )}

            {/* CUSTOMER INFO */}
            <div style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: 'clamp(10px,2vw,14px)', marginBottom: '12px' }}>
              <div style={{ fontSize: 'clamp(13px,2.5vw,15px)', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>{currentOrder.customer_name}</div>
              <div style={{ fontSize: 'clamp(10px,1.8vw,13px)', color: '#64748b', lineHeight: 1.8 }}>
                📞 {currentOrder.customer_phone}<br />
                {currentOrder.order_type === 'delivery' 
                  ? <>📍 {currentOrder.delivery_address}</> 
                  : '🏪 Collection'}
                {currentOrder.delivery_what3words && <><br /><span style={{ color: '#ef4444', fontWeight: 600 }}>/// {currentOrder.delivery_what3words}</span></>}
              </div>
              {(currentOrder.special_instructions || currentOrder.notes) && (
                <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.2)', borderRadius: '6px', fontSize: 'clamp(10px,1.6vw,12px)', color: '#f97316' }}>
                  📝 {currentOrder.special_instructions || currentOrder.notes}
                </div>
              )}
            </div>

            {/* ITEMS */}
            <div style={{ fontSize: 'clamp(10px,1.8vw,12px)', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', fontWeight: 600 }}>
              Items ({currentOrder.order_items?.length || 0})
            </div>
            {currentOrder.order_items?.length > 0 ? (
              currentOrder.order_items.map((item: any) => (
                <div key={item.id} style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: 'clamp(8px,1.5vw,12px)', marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'clamp(13px,2.2vw,15px)', fontWeight: 600, color: '#f8fafc' }}>{item.quantity}x {item.name}</div>
                    {item.special_instructions && (
                      <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: '#f97316', fontStyle: 'italic', marginTop: '4px' }}>
                        → {item.special_instructions}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 'clamp(12px,2.2vw,14px)', fontWeight: 700, color: '#22c55e', flexShrink: 0 }}>GBP{item.subtotal?.toFixed(2)}</div>
                </div>
              ))
            ) : (
              <div style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '12px', marginBottom: '6px', fontSize: '12px', color: '#475569', textAlign: 'center' }}>
                No items data available
              </div>
            )}
          </div>

          {/* FOOTER - TOTALS + BUTTONS */}
          <div style={{ background: '#060b18', borderTop: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(10px,2vw,14px)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(11px,2vw,13px)', color: '#64748b', marginBottom: '3px' }}>
              <span>Subtotal</span><span>GBP{currentOrder.subtotal?.toFixed(2)}</span>
            </div>
            {currentOrder.delivery_fee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(11px,2vw,13px)', color: '#64748b', marginBottom: '3px' }}>
                <span>Delivery</span><span>GBP{currentOrder.delivery_fee?.toFixed(2)}</span>
              </div>
            )}
            {currentOrder.tip > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(11px,2vw,13px)', color: '#64748b', marginBottom: '3px' }}>
                <span>Tip</span><span>GBP{currentOrder.tip?.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(16px,3vw,20px)', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', paddingTop: '6px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
              <span>Total</span><span style={{ color: '#22c55e' }}>GBP{currentOrder.total?.toFixed(2)}</span>
            </div>

            {/* Only show accept/reject for pending orders */}
            {currentOrder.status === 'pending' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <button onClick={() => setAcceptOpen(true)} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(12px,2.5vw,16px)', borderRadius: '10px', fontSize: 'clamp(13px,2.5vw,17px)', fontWeight: 700, cursor: 'pointer' }}>
                  {currentOrder.payment_method === 'cash' ? '✓ Accept (Cash)' : '✓ Accept & Send Payment Link'}
                </button>
                <button onClick={() => setRejectOpen(true)} style={{ background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: 'clamp(12px,2.5vw,16px)', borderRadius: '10px', fontSize: 'clamp(13px,2.5vw,17px)', cursor: 'pointer', fontWeight: 600 }}>Reject</button>
              </div>
            )}

            {/* Accepted orders show status + reprint */}
            {['accepted', 'waiting_payment', 'paid', 'complete'].includes(currentOrder.status) && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center', fontSize: 'clamp(12px,2vw,14px)', fontWeight: 600, color: '#22c55e' }}>
                  ✅ {currentOrder.status === 'paid' || currentOrder.status === 'complete' ? 'Order Paid' : currentOrder.status === 'waiting_payment' ? 'Waiting for Payment' : 'Accepted'}
                </div>
                <button onClick={() => manualReprint({
                  id: currentOrder.id,
                  orderNumber: currentOrder.order_number,
                  restaurantName: restaurant?.name || 'Restaurant',
                  customerName: currentOrder.customer_name,
                  deliveryAddress: currentOrder.delivery_address,
          what3words: currentOrder.delivery_what3words || undefined,
                  isCollection: currentOrder.order_type === 'collection' || currentOrder.order_type === 'pickup',
                  items: currentOrder.order_items || [],
                  specialInstructions: currentOrder.special_instructions || currentOrder.notes,
                  subtotal: currentOrder.subtotal,
                  deliveryFee: currentOrder.delivery_fee,
                  tip: currentOrder.tip,
                  total: currentOrder.total,
                  paymentMethod: currentOrder.payment_method,
                })} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', padding: '10px', borderRadius: '10px', fontSize: 'clamp(12px,2vw,14px)', fontWeight: 600, cursor: 'pointer' }}>
                  🖨️ Reprint Tickets
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WAITING FOR PAYMENT */}
      {screen === 'paying' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', zIndex: 10 }}>
          <div style={{ fontSize: 'clamp(36px,7vw,56px)', marginBottom: '16px' }}>&#128179;</div>
          <div style={{ fontSize: 'clamp(18px,3.5vw,26px)', fontWeight: 700, color: '#f97316', marginBottom: '6px' }}>Waiting for Payment</div>
          <div style={{ fontSize: 'clamp(11px,2vw,14px)', color: '#64748b', marginBottom: '8px' }}>Payment link sent to {currentOrder?.customer_name}</div>
          <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: '#475569', marginBottom: '28px' }}>Tickets will print automatically when payment is received</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setScreen('main'); setCurrentOrderId(null) }} style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: 'clamp(10px,2vw,14px) clamp(20px,4vw,28px)', borderRadius: '12px', fontSize: 'clamp(12px,2vw,16px)', cursor: 'pointer' }}>
              Back to Orders
            </button>
            <button onClick={confirmPayment} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(10px,2vw,14px) clamp(20px,4vw,28px)', borderRadius: '12px', fontSize: 'clamp(12px,2vw,16px)', fontWeight: 700, cursor: 'pointer' }}>
              Confirm Payment Manually
            </button>
          </div>
        </div>
      )}

      {/* PAYMENT CONFIRMED */}
      {screen === 'paid' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', zIndex: 10 }}>
          <div style={{ fontSize: 'clamp(40px,8vw,60px)', marginBottom: '16px' }}>&#9989;</div>
          <div style={{ fontSize: 'clamp(18px,3.5vw,26px)', fontWeight: 700, color: '#22c55e', marginBottom: '6px' }}>
            {currentOrder?.payment_method === 'cash' ? 'Order Accepted!' : 'Payment Confirmed!'}
          </div>
          <div style={{ fontSize: 'clamp(11px,2vw,14px)', color: '#64748b', marginBottom: '20px' }}>
            {currentOrder?.payment_method === 'cash' 
              ? `Cash ${currentOrder?.order_type === 'delivery' ? 'on delivery' : 'on collection'} • GBP${currentOrder?.total?.toFixed(2)}`
              : `GBP${currentOrder?.total?.toFixed(2)} received`
            }
          </div>
          <div style={{ background: '#0f172a', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px 24px', marginBottom: '20px', textAlign: 'left' }}>
            <div style={{ fontSize: 'clamp(10px,1.6vw,12px)', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Printing</div>
            <PrintRow label="Kitchen ticket" delay={800} />
            <PrintRow label="Restaurant ticket" delay={1600} />
            <PrintRow label="Customer ticket" delay={2400} />
          </div>
        </div>
      )}

      {screen === 'items' && (
        <FullScreen title="Menu Items" onBack={() => setScreen('main')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
            <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items..." style={{ flex: 1, background: 'none', border: 'none', color: '#f8fafc', fontSize: 'clamp(12px,2vw,14px)', outline: 'none' }} />
            {itemSearch && <button onClick={() => setItemSearch('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px' }}>x</button>}
          </div>
          {itemSearch ? (
            filteredItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(8px,1.5vw,12px)', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'clamp(18px,3vw,22px)' }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 500, color: '#f8fafc' }}>{item.name}</div>
                    <div style={{ fontSize: 'clamp(9px,1.5vw,11px)', color: '#475569' }}>{item.menu_categories?.name}</div>
                  </div>
                </div>
                <div onClick={() => toggleMenuItem(item.id, item.is_available)} style={{ width: '40px', height: '22px', borderRadius: '11px', background: item.is_available ? '#22c55e' : '#334155', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '3px', left: item.is_available ? '21px' : '3px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))
          ) : (
            Array.from(new Set(menuItems.map(i => i.menu_categories?.name || 'Uncategorised'))).map(catName => {
              const catItems = menuItems.filter(i => (i.menu_categories?.name || 'Uncategorised') === catName)
              return <TerminalCatSection key={catName} catName={catName} items={catItems} onToggle={toggleMenuItem} />
            })
          )}
        </FullScreen>
      )}

      {screen === 'eod' && (
        <FullScreen title="End of Day Report" onBack={() => setScreen('main')}>
          <EODReport orders={orders} printerIp={printerIp} onClear={async () => { 
            const completedStatuses = ['paid', 'cancelled', 'accepted', 'waiting_payment', 'complete', 'rejected']
            const ordersToArchive = orders.filter(o => completedStatuses.includes(o.status))
            
            // Mark all non-pending orders as complete in database so they don't come back
            if (ordersToArchive.length > 0 && restaurant) {
              await supabase.from('orders')
                .update({ status: 'complete' })
                .in('id', ordersToArchive.map(o => o.id))
                .eq('restaurant_id', restaurant.id)
            }
            
            setArchivedOrders(prev => [...prev, ...ordersToArchive])
            setOrders(prev => prev.filter(o => o.status === 'pending'))
            dismissedMissedIds.current = new Set()
            localStorage.removeItem('feedme-dismissed-orders')
            setTab('incoming')
            setScreen('main') 
          }} />
        </FullScreen>
      )}

      {screen === 'history' && (
        <FullScreen title="Order History" onBack={() => setScreen('main')}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }} />
              <input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }} />
              {(historyStartDate || historyEndDate) && <button onClick={() => { setHistoryStartDate(''); setHistoryEndDate('') }} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Clear</button>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px' }}>
            <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search by order # or customer..." style={{ flex: 1, background: 'none', border: 'none', color: '#f8fafc', fontSize: 'clamp(12px,2vw,14px)', outline: 'none' }} />
          </div>
          {[...archivedOrders, ...orders.filter(o => ['paid','cancelled'].includes(o.status))].filter(o => {
            const orderDate = new Date(o.created_at).toISOString().split('T')[0]
            const matchesSearch = !historySearch || o.order_number?.includes(historySearch) || o.customer_name?.toLowerCase().includes(historySearch.toLowerCase())
            const matchesStart = !historyStartDate || orderDate >= historyStartDate
            const matchesEnd = !historyEndDate || orderDate <= historyEndDate
            return matchesSearch && matchesStart && matchesEnd
          }).map(o => {
            const isExpanded = expandedOrderId === o.id
            return (
              <div key={o.id || o.order_number} style={{ marginBottom: '8px' }}>
                <div onClick={() => setExpandedOrderId(isExpanded ? null : o.id)} style={{ background: '#060b18', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: isExpanded ? '8px 8px 0 0' : '8px', padding: 'clamp(8px,1.5vw,12px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 'clamp(11px,2vw,13px)', fontWeight: 600, color: '#f8fafc' }}>{o.order_number}</div>
                    <div style={{ fontSize: 'clamp(9px,1.5vw,11px)', color: '#475569' }}>{o.customer_name} &bull; {new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 'clamp(12px,2.2vw,15px)', fontWeight: 600, color: '#22c55e' }}>GBP{o.total?.toFixed(2)}</div>
                      <span style={{ fontSize: 'clamp(9px,1.4vw,11px)', color: o.status === 'paid' ? '#22c55e' : '#ef4444' }}>{o.status}</span>
                    </div>
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>{isExpanded ? 'v' : '>'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '0 0 8px 8px', borderTop: 'none', padding: 'clamp(10px,1.5vw,14px)', fontSize: 'clamp(10px,1.6vw,12px)', color: '#64748b', userSelect: 'text' }}>
                    <div style={{ marginBottom: '8px' }}><div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Customer</div><div>{o.customer_name}</div><div>{o.customer_phone}</div></div>
                    <div style={{ marginBottom: '8px' }}><div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Items</div>
                      {o.order_items?.map((item: any) => <div key={item.id}>{item.quantity}x {item.name} - GBP{item.subtotal?.toFixed(2)}</div>)}
                    </div>
                    <div style={{ paddingTop: '8px', borderTop: '0.5px solid rgba(255,255,255,0.08)', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#22c55e' }}><span>Total:</span><span>GBP{o.total?.toFixed(2)}</span></div>
                    </div>
                    <button onClick={() => manualReprint({ id: o.id, orderNumber: o.order_number, restaurantName: restaurant?.name || 'Restaurant', customerName: o.customer_name, deliveryAddress: o.delivery_address,
        what3words: o.delivery_what3words || undefined, isCollection: o.order_type === 'collection' || o.order_type === 'pickup', items: o.order_items || [], specialInstructions: o.special_instructions, subtotal: o.subtotal, deliveryFee: o.delivery_fee, tip: o.tip, total: o.total, paymentMethod: o.payment_method })} style={{ width: '100%', padding: '8px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Reprint Tickets
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </FullScreen>
      )}

      {acceptOpen && (
        <Modal onClose={() => setAcceptOpen(false)}>
          <h3 style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>How long will this take?</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '14px' }}>
            {[15,20,25,30,45,60].map(t => (
              <button key={t} onClick={() => setSelectedWait(t)} style={{ background: selectedWait === t ? 'rgba(34,197,94,0.08)' : '#0f172a', border: `1.5px solid ${selectedWait === t ? '#22c55e' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: 'clamp(10px,2vw,14px)', textAlign: 'center', cursor: 'pointer', fontSize: 'clamp(12px,2vw,15px)', color: selectedWait === t ? '#22c55e' : '#94a3b8' }}>
                {t} min
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '7px' }}>
            <button onClick={() => setAcceptOpen(false)} style={{ flex: 1, background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.1)', color: '#64748b', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', cursor: 'pointer', fontSize: 'clamp(11px,2vw,13px)' }}>Cancel</button>
            <button onClick={acceptOrder} disabled={accepting} style={{ flex: 2, background: accepting ? '#64748b' : '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', fontSize: 'clamp(11px,2vw,13px)', fontWeight: 700, cursor: accepting ? 'not-allowed' : 'pointer' }}>
              {accepting ? 'Processing...' : currentOrder?.payment_method === 'cash' ? 'Accept Order (Cash)' : 'Accept & Send Payment Link'}
            </button>
          </div>
        </Modal>
      )}

      {rejectOpen && (
        <Modal onClose={() => setRejectOpen(false)}>
          <h3 style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>Why are you rejecting?</h3>
          {['Items out of stock','Too busy right now','Restaurant closing early','Outside delivery zone','Technical issues','Customer requested cancel'].map(r => (
            <button key={r} onClick={() => setSelectedReason(r)} style={{ width: '100%', background: selectedReason === r ? 'rgba(239,68,68,0.1)' : '#0f172a', border: `0.5px solid ${selectedReason === r ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: 'clamp(8px,1.5vw,11px) 12px', fontSize: 'clamp(11px,2vw,13px)', color: selectedReason === r ? '#ef4444' : '#94a3b8', textAlign: 'left', cursor: 'pointer', marginBottom: '5px' }}>
              {selectedReason === r ? '✓ ' : ''}{r}
            </button>
          ))}
          <textarea value={customReason} onChange={e => { setCustomReason(e.target.value); setSelectedReason('') }} placeholder="Or type a custom reason..." style={{ width: '100%', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '9px 11px', fontSize: 'clamp(11px,2vw,13px)', color: '#f8fafc', marginBottom: '10px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} rows={2} />
          <div style={{ display: 'flex', gap: '7px' }}>
            <button onClick={() => { setRejectOpen(false); setSelectedReason(''); setCustomReason('') }} style={{ flex: 1, background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.1)', color: '#64748b', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', cursor: 'pointer', fontSize: 'clamp(11px,2vw,13px)' }}>Cancel</button>
            <button onClick={rejectOrder} disabled={!selectedReason && !customReason} style={{ flex: 2, background: selectedReason || customReason ? '#ef4444' : '#334155', color: 'white', border: 'none', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', fontSize: 'clamp(11px,2vw,13px)', fontWeight: 700, cursor: selectedReason || customReason ? 'pointer' : 'not-allowed' }}>Confirm Rejection</button>
          </div>
        </Modal>
      )}

      {timeModal && (
        <Modal onClose={() => setTimeModal(null)}>
          <h3 style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700, textAlign: 'center', marginBottom: '14px' }}>
            Adjust {timeModal === 'delivery' ? 'delivery' : 'pickup'} time
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '14px' }}>
            {[10,15,20,25,30,45,60,90].map(t => (
              <button key={t} onClick={async () => {
                if (timeModal === 'delivery') { setDelivTime(t); await updateRestaurant({ delivery_time_mins: t }) }
                else { setPickTime(t); await updateRestaurant({ pickup_time_mins: t }) }
                setTimeModal(null)
              }} style={{ background: (timeModal === 'delivery' ? delivTime : pickTime) === t ? 'rgba(34,197,94,0.08)' : '#0f172a', border: `1.5px solid ${(timeModal === 'delivery' ? delivTime : pickTime) === t ? '#22c55e' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', padding: 'clamp(10px,2vw,14px)', textAlign: 'center', cursor: 'pointer', fontSize: 'clamp(12px,2vw,15px)', color: (timeModal === 'delivery' ? delivTime : pickTime) === t ? '#22c55e' : '#94a3b8' }}>
                {t}m
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* TIME SLOT MODAL */}
      {showTimeSlotModal && (
        <Modal onClose={() => setShowTimeSlotModal(null)}>
          <h3 style={{ fontSize: 'clamp(13px,2.5vw,16px)', fontWeight: 700, textAlign: 'center', marginBottom: '16px' }}>
            {showTimeSlotModal === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'} Time Slots
          </h3>
          <div style={{ display: 'grid', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: 'clamp(11px,1.8vw,12px)', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Estimated Time (mins)</label>
              <input type="number" value={showTimeSlotModal === 'delivery' ? deliveryTime : pickupTime} onChange={e => showTimeSlotModal === 'delivery' ? setDeliveryTime(parseInt(e.target.value)) : setPickupTime(parseInt(e.target.value))} min="10" max="120" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '14px', outline: 'none', fontFamily: 'inherit', marginBottom: '8px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {(showTimeSlotModal === 'delivery' ? [20, 30, 45, 60, 90] : [10, 15, 20, 30, 45]).map(t => (
                  <button key={t} onClick={() => showTimeSlotModal === 'delivery' ? setDeliveryTime(t) : setPickupTime(t)} style={{ padding: '8px 4px', background: (showTimeSlotModal === 'delivery' ? deliveryTime : pickupTime) === t ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${(showTimeSlotModal === 'delivery' ? deliveryTime : pickupTime) === t ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: (showTimeSlotModal === 'delivery' ? deliveryTime : pickupTime) === t ? '#22c55e' : '#94a3b8', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t}m
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 'clamp(11px,1.8vw,12px)', color: '#64748b', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Slot Duration (mins)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[15, 20, 30, 45, 60].map(duration => (
                  <button key={duration} onClick={() => showTimeSlotModal === 'delivery' ? setDeliverySlotDuration(duration) : setPickupSlotDuration(duration)} style={{ padding: '10px', background: (showTimeSlotModal === 'delivery' ? deliverySlotDuration : pickupSlotDuration) === duration ? 'rgba(34,197,94,0.15)' : '#0f172a', border: `1px solid ${(showTimeSlotModal === 'delivery' ? deliverySlotDuration : pickupSlotDuration) === duration ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: (showTimeSlotModal === 'delivery' ? deliverySlotDuration : pickupSlotDuration) === duration ? '#22c55e' : '#94a3b8', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {duration}m
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 'clamp(11px,1.8vw,12px)', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Orders Per Slot</label>
              <input type="number" value={showTimeSlotModal === 'delivery' ? deliverySlotCapacity : pickupSlotCapacity} onChange={e => showTimeSlotModal === 'delivery' ? setDeliverySlotCapacity(parseInt(e.target.value)) : setPickupSlotCapacity(parseInt(e.target.value))} min="1" max="50" style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowTimeSlotModal(null)} style={{ flex: 1, background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', cursor: 'pointer', fontSize: 'clamp(11px,2vw,13px)', fontWeight: 600, fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={async () => { if (showTimeSlotModal === 'delivery') { setDelivTime(deliveryTime); await updateRestaurant({ delivery_time_mins: deliveryTime, delivery_slot_duration: deliverySlotDuration, delivery_slot_capacity: deliverySlotCapacity }) } else { setPickTime(pickupTime); await updateRestaurant({ pickup_time_mins: pickupTime, pickup_slot_duration: pickupSlotDuration, pickup_slot_capacity: pickupSlotCapacity }) } setShowTimeSlotModal(null) }} style={{ flex: 2, background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(9px,1.8vw,12px)', borderRadius: '8px', fontSize: 'clamp(11px,2vw,13px)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes bounce-in { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}

function TerminalCatSection({ catName, items, onToggle }: { catName: string; items: any[]; onToggle: (id: string, current: boolean) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{ marginBottom: '8px' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer', marginBottom: open ? '6px' : '0' }}>
        <span style={{ fontSize: 'clamp(11px,2vw,13px)', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{catName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#475569' }}>{items.length} items</span>
          <span style={{ color: '#475569', fontSize: '12px' }}>{open ? 'v' : '>'}</span>
        </div>
      </div>
      {open && items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(8px,1.5vw,12px)', background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'clamp(18px,3vw,22px)' }}>{item.emoji}</span>
            <div>
              <div style={{ fontSize: 'clamp(12px,2vw,14px)', fontWeight: 500, color: item.is_available ? '#f8fafc' : '#475569' }}>{item.name}</div>
              <div style={{ fontSize: 'clamp(9px,1.5vw,11px)', color: '#475569' }}>GBP{item.price?.toFixed(2)}</div>
            </div>
          </div>
          <div onClick={() => onToggle(item.id, item.is_available)} style={{ width: '40px', height: '22px', borderRadius: '11px', background: item.is_available ? '#22c55e' : '#334155', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '3px', left: item.is_available ? '21px' : '3px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function FullScreen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0f1e', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ background: '#060b18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(10px,2vw,16px) clamp(12px,2.5vw,20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(14px,2.5vw,18px)', fontWeight: 700, color: '#f8fafc' }}>{title}</div>
        <button onClick={onBack} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: 'clamp(8px,1.5vw,10px) clamp(16px,2.5vw,24px)', borderRadius: '8px', fontSize: 'clamp(12px,2vw,14px)', fontWeight: 700, cursor: 'pointer' }}>Back</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px,2vw,20px)' }}>{children}</div>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 500 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#1e293b', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: 'clamp(16px,3vw,24px)', width: '100%', maxWidth: 'clamp(280px,50vw,360px)' }}>
        {children}
      </div>
    </div>
  )
}

function PrintRow({ label, delay }: { label: string; delay: number }) {
  const [done, setDone] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDone(true), delay); return () => clearTimeout(t) }, [])
  return (
    <div style={{ fontSize: 'clamp(11px,2vw,13px)', color: done ? '#22c55e' : '#64748b', marginBottom: '6px', transition: 'color 0.3s' }}>
      {done ? '' : '...'} {label}{done ? ' printed' : ''}
    </div>
  )
}

function EODReport({ orders, printerIp, onClear }: { orders: any[]; printerIp: string; onClear: () => void }) {
  const paid = orders.filter(o => o.status === 'paid')
  const cancelled = orders.filter(o => o.status === 'cancelled')
  const card = paid.filter(o => o.payment_method === 'card').reduce((s, o) => s + (o.total || 0), 0)
  const cash = paid.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (o.total || 0), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ background: '#0f172a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px', width: '100%', maxWidth: '320px' }}>
        {[['Card sales', `GBP${card.toFixed(2)}`, '#22c55e'], ['Cash sales', `GBP${cash.toFixed(2)}`, '#f97316'], ['Total orders', String(paid.length + cancelled.length), '#f8fafc'], ['Cancelled', String(cancelled.length), '#ef4444'], ['Total revenue', `GBP${(card + cash).toFixed(2)}`, '#22c55e']].map(([label, val, color], i, arr) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: i === arr.length - 1 ? 'clamp(13px,2.5vw,16px)' : 'clamp(11px,2vw,14px)', fontWeight: i === arr.length - 1 ? 700 : 400, color: '#64748b', padding: 'clamp(4px,1vw,6px) 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
            <span>{label}</span><span style={{ color }}>{val}</span>
          </div>
        ))}
      </div>
      <button onClick={() => {
        const ESC = '\x1B', GS = '\x1D'
        const INIT = ESC+'@', BOLD_ON = ESC+'E\x01', BOLD_OFF = ESC+'E\x00'
        const ALIGN_CENTER = ESC+'a\x01', ALIGN_LEFT = ESC+'a\x00'
        const SIZE_DOUBLE = GS+'!\x11', SIZE_NORMAL = GS+'!\x00'
        const CUT = GS+'V\x41\x03', LF = '\n'
        const cols = 42
        const divider = '-'.repeat(cols)
        let t = INIT
        t += ALIGN_CENTER + SIZE_DOUBLE + BOLD_ON + 'END OF DAY' + BOLD_OFF + SIZE_NORMAL + LF
        t += new Date().toLocaleString('en-GB') + LF
        t += ALIGN_LEFT + divider + LF
        t += `Total orders: ${paid.length + cancelled.length}` + LF
        t += `Card sales: GBP${card.toFixed(2)}` + LF
        t += `Cash sales: GBP${cash.toFixed(2)}` + LF
        t += `Cancelled: ${cancelled.length}` + LF
        t += divider + LF
        t += BOLD_ON + SIZE_DOUBLE + `TOTAL: GBP${(card+cash).toFixed(2)}` + BOLD_OFF + SIZE_NORMAL + LF
        t += divider + LF + LF + LF + CUT
        let hex = ''
        for (let i = 0; i < t.length; i++) hex += ('0'+t.charCodeAt(i).toString(16)).slice(-2)
        fetch('http://127.0.0.1:8080/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hexData: hex, printerIp: printerIp, port: 9100 })
        }).catch(() => alert('Could not print - check printer is connected'))
      }} style={{ background: '#22c55e', color: '#0a0f1e', border: 'none', padding: 'clamp(10px,2vw,14px) clamp(20px,4vw,30px)', borderRadius: '10px', fontSize: 'clamp(12px,2vw,14px)', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>Print Report</button>
      <button onClick={() => { if (confirm('Clear accepted orders? All records saved in history.')) onClear() }} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', padding: 'clamp(8px,1.5vw,12px) clamp(20px,4vw,30px)', borderRadius: '10px', fontSize: 'clamp(12px,2vw,14px)', cursor: 'pointer' }}>
        Perform End of Day & Clear Orders
      </button>
    </div>
  )
}
