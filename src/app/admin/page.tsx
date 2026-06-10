'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const TABS = ['dashboard', 'restaurants', 'menus', 'merchants', 'orders', 'commissions']
const PARISHES = ['St Peter Port','St Sampson','Vale','Castel','St Martin','Forest','St Saviour','Torteval','St Pierre du Bois','St Andrew']
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function AdminPage() {
  const supabase = createClient()
  const [tab, setTab] = useState('dashboard')
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [editMerchant, setEditMerchant] = useState<any>(null)
  const [merchantNewPassword, setMerchantNewPassword] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [showAddRestaurant, setShowAddRestaurant] = useState(false)
  const [showAddMerchant, setShowAddMerchant] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [expandedCat, setExpandedCat] = useState<string|null>(null)
  const [dragOverItem, setDragOverItem] = useState<any>(null)
  const dragItem = React.useRef<any>(null)
  const [showImport, setShowImport] = useState(false)
  const [deliveryZones, setDeliveryZones] = useState<any[]>([])
  const [showHours, setShowHours] = useState(false)
  const [hoursRestaurant, setHoursRestaurant] = useState<any>(null)
  const [restaurantHours, setRestaurantHours] = useState<any[]>([])
  const [showZones, setShowZones] = useState(false)
  const [zonesRestaurant, setZonesRestaurant] = useState<any>(null)
  const [importUrl, setImportUrl] = useState('')
  const [importMerchantId, setImportMerchantId] = useState('')
  const [importing, setImporting] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [editRestaurant, setEditRestaurant] = useState<any>(null)

  // Option groups - per item
  const [editingOptions, setEditingOptions] = useState<any>(null)
  const [optionGroups, setOptionGroups] = useState<any[]>([])
  const [sharedOptionGroups, setSharedOptionGroups] = useState<any[]>([])
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showAddOption, setShowAddOption] = useState<string | null>(null)
  const [newGroup, setNewGroup] = useState({ name: '', type: 'single', required: false, is_collapsible: false, max_selections: '0', sort_order: '1' })
  const [newOption, setNewOption] = useState({ name: '', price_adjustment: '0', sort_order: '1' })

  // Shared option groups - restaurant level
  const [showSharedGroups, setShowSharedGroups] = useState(false)
  const [sharedGroups, setSharedGroups] = useState<any[]>([])
  const [showAddSharedGroup, setShowAddSharedGroup] = useState(false)
  const [showAddSharedOption, setShowAddSharedOption] = useState<string | null>(null)
  const [newSharedGroup, setNewSharedGroup] = useState({ name: '', type: 'multiple', required: false, is_collapsible: false, max_selections: '0', sort_order: '1' })
  const [newSharedOption, setNewSharedOption] = useState({ name: '', price_adjustment: '0', sort_order: '1' })
  const [linkingGroup, setLinkingGroup] = useState<any>(null)
  const [linkedItems, setLinkedItems] = useState<string[]>([])

  const [newRestaurant, setNewRestaurant] = useState({ name: '', slug: '', cuisine_type: '', emoji: 'food', description: '', parish: 'St Peter Port', postcode: 'GY1', min_order: '10', delivery_fee: '2.50', delivery_time_mins: '25', pickup_time_mins: '15', opening_time: '11:00', closing_time: '22:00', merchant_id: '', custom_message: 'Thank you for your order!' })
  const [newMerchant, setNewMerchant] = useState({ name: '', email: '', phone: '', commission_rate: '4', password: '' })
  const [newCategory, setNewCategory] = useState({ name: '', sort_order: '1' })
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', emoji: 'food', calories: '', category_id: '' })

  function checkPassword() {
    if (password === 'feedmegg2026admin') { setAuthed(true); fetchAll() }
    else setAuthError('Incorrect password')
  }

  async function fetchAll() {
    const { data: r } = await supabase.from('restaurants').select('*, merchants(name,email)').order('name')
    const { data: m } = await supabase.from('merchants').select('*').order('name')
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100)
    setRestaurants(r || [])
    setMerchants(m || [])
    setOrders(o || [])
  }

  async function fetchMenuForRestaurant(restId: string) {
    const { data: cats } = await supabase.from('menu_categories').select('*').eq('restaurant_id', restId).order('sort_order')
    const { data: items } = await supabase.from('menu_items').select('*, menu_categories(name)').eq('restaurant_id', restId).order('sort_order')
    setCategories(cats || [])
    setMenuItems(items || [])
  }

  async function fetchOptionGroups(itemId: string) {
    const { data } = await supabase.from('item_option_groups').select('*, item_options(*)').eq('menu_item_id', itemId).order('sort_order')
    setOptionGroups(data || [])
    // Also fetch shared groups linked to this item
    const { data: links } = await supabase.from('item_option_group_links').select('option_group_id').eq('menu_item_id', itemId)
    const linkedIds = (links || []).map((l: any) => l.option_group_id)
    if (linkedIds.length > 0) {
      const { data: sg } = await supabase.from('item_option_groups').select('*, item_options(*)').in('id', linkedIds)
      setSharedOptionGroups(sg || [])
    } else {
      setSharedOptionGroups([])
    }
  }

  async function importToppingsFromItems(restId: string) {
    // Find all menu items that look like toppings (price under 2.50, no category description)
    const { data: items } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restId)
      .lt('price', 2.50)
    
    if (!items || items.length === 0) {
      setMsg('No topping-priced items found (under GBP2.50)')
      return
    }

    const confirmed = confirm(`Found ${items.length} items priced under GBP2.50:\n\n${items.map((i: any) => i.name + ' - GBP' + i.price.toFixed(2)).join('\n')}\n\nConvert these into a shared Extra Toppings option group?`)
    if (!confirmed) return

    // Create shared option group
    const { data: group, error: groupError } = await supabase
      .from('item_option_groups')
      .insert({
        restaurant_id: restId,
        menu_item_id: null,
        name: 'Extra Toppings',
        type: 'multiple',
        required: false,
        sort_order: 1,
      })
      .select()
      .single()

    if (groupError || !group) {
      setMsg('Error creating group: ' + groupError?.message)
      return
    }

    // Create options from the items
    for (const item of items) {
      await supabase.from('item_options').insert({
        option_group_id: group.id,
        name: item.name,
        price_adjustment: item.price,
        is_available: true,
        sort_order: 0,
      })
    }

    // Delete the original items
    await supabase.from('menu_items').delete().in('id', items.map((i: any) => i.id))

    setMsg(`Converted ${items.length} items into shared toppings group!`)
    fetchMenuForRestaurant(restId)
    fetchSharedGroups(restId)
  }

  async function fetchSharedGroups(restId: string) {
    const { data: restGroups } = await supabase.from('item_option_groups').select('*, item_options(*), item_option_group_links(menu_item_id)').eq('restaurant_id', restId).is('menu_item_id', null).order('sort_order')
    const { data: globalGroups } = await supabase.from('item_option_groups').select('*, item_options(*), item_option_group_links(menu_item_id)').is('restaurant_id', null).is('menu_item_id', null).order('sort_order')
    setSharedGroups([...(restGroups || []), ...(globalGroups || [])])
  }

  async function moveGroup(groupId: string, direction: 'up' | 'down', itemId: string) {
    const idx = optionGroups.findIndex((g: any) => g.id === groupId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === optionGroups.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const a = optionGroups[idx]
    const b = optionGroups[swapIdx]
    await supabase.from('item_option_groups').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('item_option_groups').update({ sort_order: a.sort_order }).eq('id', b.id)
    fetchOptionGroups(itemId)
  }

  async function addOptionGroup(itemId: string) {
    if (!newGroup.name) { setMsg('Enter a group name'); return }
    const { error } = await supabase.from('item_option_groups').insert({ menu_item_id: itemId, restaurant_id: selectedRestaurant.id, name: newGroup.name, type: newGroup.type, required: newGroup.required, is_collapsible: newGroup.is_collapsible, sort_order: parseInt(newGroup.sort_order) })
    if (error) { setMsg('Error: ' + error.message); return }
    setNewGroup({ name: '', type: 'single', required: false, is_collapsible: false, max_selections: '0', sort_order: '1' })
    setShowAddGroup(false)
    fetchOptionGroups(itemId)
  }

  async function addOption(groupId: string, itemId: string) {
    if (!newOption.name) { setMsg('Enter option name'); return }
    const { error } = await supabase.from('item_options').insert({ option_group_id: groupId, name: newOption.name, price_adjustment: parseFloat(newOption.price_adjustment) || 0, sort_order: parseInt(newOption.sort_order), is_available: true })
    if (error) { setMsg('Error: ' + error.message); return }
    setNewOption({ name: '', price_adjustment: '0', sort_order: '1' })
    setShowAddOption(null)
    fetchOptionGroups(itemId)
  }

  async function deleteOptionGroup(groupId: string, itemId: string) {
    if (!confirm('Delete this option group and all its options?')) return
    await supabase.from('item_options').delete().eq('option_group_id', groupId)
    await supabase.from('item_option_groups').delete().eq('id', groupId)
    fetchOptionGroups(itemId)
  }

  async function deleteOption(optionId: string, itemId: string) {
    await supabase.from('item_options').delete().eq('id', optionId)
    fetchOptionGroups(itemId)
  }

  // Shared group functions
  async function addSharedGroup() {
    if (!newSharedGroup.name || !selectedRestaurant) { setMsg('Enter a group name'); return }
    const { error } = await supabase.from('item_option_groups').insert({ restaurant_id: selectedRestaurant.id, menu_item_id: null, name: newSharedGroup.name, type: newSharedGroup.type, required: newSharedGroup.required, sort_order: parseInt(newSharedGroup.sort_order) })
    if (error) { setMsg('Error: ' + error.message); return }
    setNewSharedGroup({ name: '', type: 'multiple', required: false, is_collapsible: false, max_selections: '0', sort_order: '1' })
    setShowAddSharedGroup(false)
    fetchSharedGroups(selectedRestaurant.id)
  }

  async function addSharedOption(groupId: string) {
    if (!newSharedOption.name) { setMsg('Enter option name'); return }
    const { error } = await supabase.from('item_options').insert({ option_group_id: groupId, name: newSharedOption.name, price_adjustment: parseFloat(newSharedOption.price_adjustment) || 0, sort_order: parseInt(newSharedOption.sort_order), is_available: true })
    if (error) { setMsg('Error: ' + error.message); return }
    setNewSharedOption({ name: '', price_adjustment: '0', sort_order: '1' })
    setShowAddSharedOption(null)
    fetchSharedGroups(selectedRestaurant.id)
  }

  async function deleteSharedGroup(groupId: string) {
    if (!confirm('Delete this shared option group?')) return
    await supabase.from('item_option_group_links').delete().eq('option_group_id', groupId)
    await supabase.from('item_options').delete().eq('option_group_id', groupId)
    await supabase.from('item_option_groups').delete().eq('id', groupId)
    fetchSharedGroups(selectedRestaurant.id)
  }

  async function openLinkGroup(group: any) {
    setLinkingGroup(group)
    const { data } = await supabase.from('item_option_group_links').select('menu_item_id').eq('option_group_id', group.id)
    setLinkedItems((data || []).map((d: any) => d.menu_item_id))
  }

  async function toggleItemLink(itemId: string) {
    if (!linkingGroup) return
    if (linkedItems.includes(itemId)) {
      await supabase.from('item_option_group_links').delete().eq('option_group_id', linkingGroup.id).eq('menu_item_id', itemId)
      setLinkedItems(prev => prev.filter(id => id !== itemId))
    } else {
      await supabase.from('item_option_group_links').insert({ option_group_id: linkingGroup.id, menu_item_id: itemId })
      setLinkedItems(prev => [...prev, itemId])
    }
  }

  async function fetchHours(restId: string) {
    const { data } = await supabase.from('restaurant_hours').select('*').eq('restaurant_id', restId)
    // Always show all 7 days, merge with saved data
    const merged = DAYS.map(d => {
      const saved = data?.find((h: any) => h.day === d)
      return saved || { day: d, open_time: '12:00', close_time: '21:30', is_closed: false, restaurant_id: restId }
    })
    setRestaurantHours(merged)
  }

  async function saveHours() {
    if (!hoursRestaurant) return
    await supabase.from('restaurant_hours').delete().eq('restaurant_id', hoursRestaurant.id)
    const toInsert = restaurantHours.map(h => ({
      restaurant_id: hoursRestaurant.id,
      day: h.day,
      open_time: h.open_time,
      close_time: h.close_time,
      is_closed: h.is_closed || false,
    }))
    await supabase.from('restaurant_hours').insert(toInsert)
    setMsg('Opening hours saved for ' + hoursRestaurant.name + '!')
    setShowHours(false)
    setHoursRestaurant(null)
  }

  async function fetchZones(restId: string) {
    try {
      const { data } = await supabase.from('delivery_zones').select('*').eq('restaurant_id', restId).order('name')
      if (data && data.length > 0) {
        // Merge DB zones with all parishes so all 10 always show
        const merged = PARISHES.map(p => {
          const saved = data.find((z: any) => z.name === p || z.parish === p)
          return saved ? { ...saved, parish: saved.name || saved.parish, enabled: true } : { parish: p, name: p, fee: 2.50, min_order: 10, enabled: true, restaurant_id: restId }
        })
        setDeliveryZones(merged)
      } else {
        setDeliveryZones(PARISHES.map(p => ({ parish: p, name: p, fee: 2.50, min_order: 10, enabled: true, restaurant_id: restId })))
      }
    } catch (e) {
      setDeliveryZones(PARISHES.map(p => ({ parish: p, name: p, fee: 2.50, min_order: 10, enabled: true, restaurant_id: restId })))
    }
  }

  async function saveZones() {
    if (!zonesRestaurant) return
    await supabase.from('delivery_zones').delete().eq('restaurant_id', zonesRestaurant.id)
    // Include ALL zones unless explicitly unticked
    const toInsert = deliveryZones.map(z => ({
      restaurant_id: zonesRestaurant.id,
      name: z.parish,
      fee: parseFloat(z.fee) || 0,
      min_order: parseFloat(z.min_order) || 10,
    }))
    if (toInsert.length > 0) {
      const { error } = await supabase.from('delivery_zones').insert(toInsert)
      if (error) { setMsg('Error saving zones: ' + error.message); return }
      setMsg(`Saved ${toInsert.length} delivery zones for ` + zonesRestaurant.name + '!')
    } else {
      setMsg('No zones to save!')
    }
    setShowZones(false)
    setZonesRestaurant(null)
  }

  async function importFromFoodGG() {
    if (!importUrl || !importMerchantId) { setMsg('Please enter a food.gg URL and select a merchant'); return }
    setImporting(true)
    setMsg('Importing... this may take 30 seconds...')
    const res = await fetch('/api/admin/scrape-foodgg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: importUrl, merchantId: importMerchantId }) })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setMsg('Error: ' + data.error); return }
    setMsg(data.message)
    setShowImport(false)
    setImportUrl('')
    setImportMerchantId('')
    fetchAll()
  }

  async function deleteRestaurant(id: string, name: string) {
    if (!confirm('Delete ' + name + ' and ALL its menu items? This cannot be undone!')) return
    await supabase.from('item_option_group_links').delete().eq('menu_item_id', id)
    await supabase.from('item_options').delete().eq('option_group_id', id)
    await supabase.from('item_option_groups').delete().eq('restaurant_id', id)
    await supabase.from('menu_items').delete().eq('restaurant_id', id)
    await supabase.from('menu_categories').delete().eq('restaurant_id', id)
    await supabase.from('restaurants').delete().eq('id', id)
    setMsg(name + ' deleted!')
    fetchAll()
  }

  async function addRestaurant() {
    if (!newRestaurant.name || !newRestaurant.slug || !newRestaurant.merchant_id) { setMsg('Please fill in name, slug and merchant'); return }
    const { error } = await supabase.from('restaurants').insert({ ...newRestaurant, min_order: parseFloat(newRestaurant.min_order), delivery_fee: parseFloat(newRestaurant.delivery_fee) || 2.50, delivery_time_mins: parseInt(newRestaurant.delivery_time_mins), pickup_time_mins: parseInt(newRestaurant.pickup_time_mins), is_open: false, is_active: true, accepts_delivery: true, accepts_pickup: true, accepts_preorders: true, slot_capacity: 5 })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Restaurant added!'); setShowAddRestaurant(false)
    setNewRestaurant({ name: '', slug: '', cuisine_type: '', emoji: 'food', description: '', parish: 'St Peter Port', postcode: 'GY1', min_order: '10', delivery_fee: '2.50', delivery_time_mins: '25', pickup_time_mins: '15', opening_time: '11:00', closing_time: '22:00', merchant_id: '', custom_message: 'Thank you for your order!' })
    fetchAll()
  }

  async function saveRestaurant() {
    if (!editRestaurant) return
    const { error } = await supabase.from('restaurants').update({ name: editRestaurant.name, cuisine_type: editRestaurant.cuisine_type, emoji: editRestaurant.emoji, description: editRestaurant.description, parish: editRestaurant.parish, postcode: editRestaurant.postcode, min_order: parseFloat(editRestaurant.min_order), delivery_fee: parseFloat(editRestaurant.delivery_fee) || 0, delivery_time_mins: parseInt(editRestaurant.delivery_time_mins), pickup_time_mins: parseInt(editRestaurant.pickup_time_mins), opening_time: editRestaurant.opening_time || null, closing_time: editRestaurant.closing_time || null, custom_message: editRestaurant.custom_message, is_open: editRestaurant.is_open, is_active: editRestaurant.is_active, accepts_delivery: editRestaurant.accepts_delivery, accepts_pickup: editRestaurant.accepts_pickup, foodgg_url: editRestaurant.foodgg_url || null, sumup_api_key: editRestaurant.sumup_api_key || null, sumup_email: editRestaurant.sumup_email || null, sumup_merchant_code: editRestaurant.sumup_merchant_code || null }).eq('id', editRestaurant.id)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Restaurant saved!'); setEditRestaurant(null); fetchAll()
  }

  async function uploadLogo(restId: string, file: File) {
    const ext = file.name.split('.').pop()
    const path = `${restId}.${ext}`
    const { error: uploadError } = await supabase.storage.from('restaurant-logos').upload(path, file, { upsert: true })
    if (uploadError) { setMsg('Upload error: ' + uploadError.message); return }
    const { data: urlData } = supabase.storage.from('restaurant-logos').getPublicUrl(path)
    const logo_url = urlData.publicUrl
    await supabase.from('restaurants').update({ logo_url }).eq('id', restId)
    setMsg('Logo uploaded!')
    fetchAll()
  }

  async function saveMerchant() {
    if (!editMerchant) return
    await supabase.from('merchants').update({
      name: editMerchant.name,
      email: editMerchant.email,
      phone: editMerchant.phone || null,
      commission_rate: parseFloat(editMerchant.commission_rate) || 4,
      is_trial: editMerchant.is_trial || false,
    }).eq('id', editMerchant.id)
    if (merchantNewPassword) {
      await fetch('/api/admin/update-merchant-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: editMerchant.id, password: merchantNewPassword })
      })
      setMerchantNewPassword('')
    }
    setEditMerchant(null)
    fetchAll()
    setMsg('Merchant updated!')
  }

  async function deleteMerchant(id: string, name: string) {
    if (!confirm('Delete merchant ' + name + '? This cannot be undone!')) return
    await supabase.from('merchants').delete().eq('id', id)
    fetchAll()
    setMsg('Merchant deleted!')
  }

  async function addMerchant() {
    if (!newMerchant.name || !newMerchant.email || !newMerchant.password) { setMsg('Please fill in name, email and password'); return }
    const res = await fetch('/api/admin/create-merchant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMerchant) })
    const data = await res.json()
    if (!res.ok) { setMsg('Error: ' + data.error); return }
    setMsg(data.message); setShowAddMerchant(false)
    setNewMerchant({ name: '', email: '', phone: '', commission_rate: '4', password: '' }); fetchAll()
  }

  async function handleItemDrop(catId: string, overItemId: string) {
    if (!dragItem.current || dragItem.current.id === overItemId) { dragItem.current = null; setDragOverItem(null); return }
    const catItems = [...menuItems.filter(i => i.category_id === catId)]
    const dragIdx = catItems.findIndex(i => i.id === dragItem.current.id)
    const overIdx = catItems.findIndex(i => i.id === overItemId)
    if (dragIdx === -1 || overIdx === -1) { dragItem.current = null; setDragOverItem(null); return }
    const moved = catItems.splice(dragIdx, 1)[0]
    catItems.splice(overIdx, 0, moved)
    await Promise.all(catItems.map((item, idx) => supabase.from('menu_items').update({ sort_order: idx + 1 }).eq('id', item.id)))
    dragItem.current = null; setDragOverItem(null)
    fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function handleCatDrop(overCatId: string) {
    if (!dragItem.current || dragItem.current.id === overCatId) { dragItem.current = null; setDragOverItem(null); return }
    const cats = [...categories]
    const dragIdx = cats.findIndex(c => c.id === dragItem.current.id)
    const overIdx = cats.findIndex(c => c.id === overCatId)
    if (dragIdx === -1 || overIdx === -1) { dragItem.current = null; setDragOverItem(null); return }
    const moved = cats.splice(dragIdx, 1)[0]
    cats.splice(overIdx, 0, moved)
    await Promise.all(cats.map((cat, idx) => supabase.from('menu_categories').update({ sort_order: idx + 1 }).eq('id', cat.id)))
    dragItem.current = null; setDragOverItem(null)
    fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function moveItem(itemId: string, direction: 'up'|'down', catId: string) {
    const catItems = [...menuItems.filter(i => i.category_id === catId)]
    const idx = catItems.findIndex(i => i.id === itemId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === catItems.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const moved = catItems.splice(idx, 1)[0]
    catItems.splice(swapIdx, 0, moved)
    await Promise.all(catItems.map((item, i) => supabase.from('menu_items').update({ sort_order: i + 1 }).eq('id', item.id)))
    fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function moveCategory(catId: string, direction: 'up'|'down') {
    const cats = [...categories]
    const idx = cats.findIndex(c => c.id === catId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === cats.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const moved = cats.splice(idx, 1)[0]
    cats.splice(swapIdx, 0, moved)
    await Promise.all(cats.map((cat, i) => supabase.from('menu_categories').update({ sort_order: i + 1 }).eq('id', cat.id)))
    fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function addCategory() {
    if (!selectedRestaurant || !newCategory.name) { setMsg('Select a restaurant and enter category name'); return }
    const { error } = await supabase.from('menu_categories').insert({ restaurant_id: selectedRestaurant.id, name: newCategory.name, sort_order: parseInt(newCategory.sort_order), is_active: true })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Category added!'); setShowAddCategory(false)
    setNewCategory({ name: '', sort_order: '1' }); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function addMenuItem() {
    if (!selectedRestaurant || !newItem.name || !newItem.price || !newItem.category_id) { setMsg('Fill in all required fields'); return }
    const { error } = await supabase.from('menu_items').insert({ restaurant_id: selectedRestaurant.id, category_id: newItem.category_id, name: newItem.name, description: newItem.description, price: parseFloat(newItem.price), emoji: newItem.emoji, calories: newItem.calories ? parseInt(newItem.calories) : null, is_available: true, tags: [], allergens: [] })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Item added!'); setShowAddItem(false)
    setNewItem({ name: '', description: '', price: '', emoji: 'food', calories: '', category_id: '' }); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function saveMenuItem() {
    if (!editItem) return
    const { error } = await supabase.from('menu_items').update({ name: editItem.name, description: editItem.description, price: parseFloat(editItem.price), emoji: editItem.emoji, calories: editItem.calories ? parseInt(editItem.calories) : null, is_available: editItem.is_available, category_id: editItem.category_id }).eq('id', editItem.id)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Item saved!'); setEditItem(null); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function deleteMenuItem(id: string) {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setMsg('Item deleted'); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category and all its items?')) return
    await supabase.from('menu_items').delete().eq('category_id', id)
    await supabase.from('menu_categories').delete().eq('id', id)
    setMsg('Category deleted'); fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function toggleItem(id: string, current: boolean) {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id)
    fetchMenuForRestaurant(selectedRestaurant.id)
  }

  async function toggleRestaurantOpen(id: string, current: boolean) {
    await supabase.from('restaurants').update({ is_open: !current }).eq('id', id)
    fetchAll()
  }

  async function toggleRestaurantActive(id: string, current: boolean) {
    await supabase.from('restaurants').update({ is_active: !current }).eq('id', id)
    fetchAll()
  }

  const totalRevenue = orders.filter(o => ['paid','complete'].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0)
  const totalCommission = orders.filter(o => ['paid','complete'].includes(o.status)).reduce((s, o) => s + (o.commission_amount || 0), 0)
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())

  if (!authed) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>
              <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--sub)', marginTop: '4px' }}>Platform Admin</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Admin Access</h2>
            {authError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: 'var(--red)' }}>{authError}</div>}
            <div style={{ marginBottom: '16px' }}><label>Admin Password</label><input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkPassword()} /></div>
            <button className="btn-primary" onClick={checkPassword} style={{ width: '100%', padding: '13px' }}>Access Admin Panel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 800 }}>
          <span style={{ color: 'var(--green)' }}>feed</span><span style={{ color: 'var(--text)' }}>me.gg</span>
          <span style={{ fontSize: '12px', color: 'var(--sub)', marginLeft: '8px', fontFamily: 'DM Sans' }}>Admin</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{restaurants.length} restaurants - {merchants.length} merchants</div>
      </div>

      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'orders' || t === 'commissions') fetchAll() }} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--green)' : 'transparent'}`, color: tab === t ? 'var(--green)' : 'var(--sub)', padding: '12px 16px', fontSize: '13px', fontWeight: tab === t ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px' }}>
        {msg && <div onClick={() => setMsg('')} style={{ background: msg.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${msg.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: msg.includes('Error') ? 'var(--red)' : 'var(--green)', cursor: 'pointer' }}>{msg} (click to dismiss)</div>}

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Platform Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'Restaurants', value: restaurants.length, color: 'var(--green)' },
                { label: 'Active', value: restaurants.filter(r => r.is_active).length, color: 'var(--green)' },
                { label: 'Merchants', value: merchants.length, color: 'var(--blue)' },
                { label: "Today's Orders", value: todayOrders.length, color: 'var(--orange)' },
                { label: 'Total Revenue', value: 'GBP' + totalRevenue.toFixed(2), color: 'var(--green)' },
                { label: 'Commission', value: 'GBP' + totalCommission.toFixed(2), color: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--sub)', marginTop: '3px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Recent Orders</h3>
            {orders.slice(0, 10).map(o => (
              <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{o.order_number}</div>
                  <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{o.customer_name} - {new Date(o.created_at).toLocaleString('en-GB')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green)' }}>GBP{o.total?.toFixed(2)}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: ['paid','complete'].includes(o.status) ? 'rgba(34,197,94,0.15)' : o.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: ['paid','complete'].includes(o.status) ? 'var(--green)' : o.status === 'cancelled' ? 'var(--red)' : 'var(--orange)' }}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RESTAURANTS */}
        {tab === 'restaurants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Restaurants</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-ghost" onClick={() => setShowImport(true)} style={{ padding: '10px 18px' }}>Import from food.gg</button>
                <button className="btn-primary" onClick={() => setShowAddRestaurant(true)} style={{ padding: '10px 18px' }}>+ Add Restaurant</button>
              </div>
            </div>

            {restaurants.map(r => (
              <div key={r.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {r.logo_url ? <img src={r.logo_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px' }}>{r.emoji}</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{r.cuisine_type} - {r.parish} - /{r.slug}</div>
                      <div style={{ fontSize: '11px', color: 'var(--sub)' }}>Merchant: {r.merchants?.name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--sub)' }}>
                      Open
                      <div onClick={() => toggleRestaurantOpen(r.id, r.is_open)} style={{ width: '30px', height: '16px', borderRadius: '8px', background: r.is_open ? 'var(--green)' : 'var(--bg3)', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', left: r.is_open ? '16px' : '2px', width: '12px', height: '12px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--sub)' }}>
                      Visible
                      <div onClick={() => toggleRestaurantActive(r.id, r.is_active)} style={{ width: '30px', height: '16px', borderRadius: '8px', background: r.is_active ? 'var(--green)' : 'var(--bg3)', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '2px', left: r.is_active ? '16px' : '2px', width: '12px', height: '12px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                    {r.sumup_api_key && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', fontWeight: 500 }}>Card payments on</span>}
                    <label style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>
                      Logo
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) uploadLogo(r.id, e.target.files[0]) }} />
                    </label>
                    <button onClick={() => setEditRestaurant(r)} className="btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>Edit</button>
                    <button onClick={() => { setZonesRestaurant(r); setDeliveryZones(PARISHES.map(p => ({ parish: p, fee: 2.50, min_order: 10, enabled: true, restaurant_id: r.id }))); setShowZones(true); fetchZones(r.id) }} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Zones</button>
                    <button onClick={() => { setHoursRestaurant(r); setRestaurantHours(DAYS.map(d => ({ day: d, open_time: '12:00', close_time: '21:30', is_closed: false, restaurant_id: r.id }))); setShowHours(true); fetchHours(r.id) }} style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#EAB308', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Hours</button>
                    <button onClick={() => { setSelectedRestaurant(r); setTab('menus'); fetchMenuForRestaurant(r.id) }} className="btn-primary" style={{ fontSize: '11px', padding: '5px 10px' }}>Menu</button>

                    <button onClick={() => deleteRestaurant(r.id, r.name)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Import Modal */}
            {showImport && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowImport(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Import from food.gg</h3>
                  <p style={{ fontSize: '13px', color: 'var(--sub)', marginBottom: '20px' }}>Paste a food.gg restaurant URL and we will automatically import the restaurant and its full menu.</p>
                  <div style={{ marginBottom: '12px' }}><label>food.gg URL</label><input className="input" placeholder="https://www.food.gg/wickedwolf" value={importUrl} onChange={e => setImportUrl(e.target.value)} /></div>
                  <div style={{ marginBottom: '20px' }}><label>Assign to Merchant</label><select className="input" value={importMerchantId} onChange={e => setImportMerchantId(e.target.value)}><option value="">Select merchant...</option>{merchants.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}</select></div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setShowImport(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={importFromFoodGG} disabled={importing} style={{ flex: 2 }}>{importing ? 'Importing...' : 'Import Restaurant'}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Zones Modal */}
            {showZones && zonesRestaurant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 700 }}>Delivery Zones - {zonesRestaurant.name}</h3>
                    <button onClick={() => { setShowZones(false); setZonesRestaurant(null) }} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '20px', cursor: 'pointer' }}>x</button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '16px' }}>Set delivery fee and minimum order per parish. Untick to disable delivery to that parish.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 40px', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase' }}>Parish</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase' }}>Fee</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase' }}>Min Order</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase' }}>On</div>
                  </div>
                  {deliveryZones.map((zone, i) => (
                    <div key={zone.parish || zone.name || i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 40px', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '13px' }}>{zone.parish || zone.name}</div>
                      <input type="number" step="0.50" min="0" value={zone.fee} onChange={e => setDeliveryZones(zones => zones.map((z, j) => j === i ? { ...z, fee: e.target.value } : z))}
                        style={{ padding: '5px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }} />
                      <input type="number" step="1" min="0" value={zone.min_order} onChange={e => setDeliveryZones(zones => zones.map((z, j) => j === i ? { ...z, min_order: e.target.value } : z))}
                        style={{ padding: '5px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }} />
                      <input type="checkbox" checked={zone.enabled !== false} onChange={e => setDeliveryZones(zones => zones.map((z, j) => j === i ? { ...z, enabled: e.target.checked } : z))}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={saveZones} className="btn-primary" style={{ flex: 1 }}>Save Zones</button>
                    <button onClick={() => { setShowZones(false); setZonesRestaurant(null) }} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Hours Modal */}
            {showHours && hoursRestaurant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: 'Syne', fontSize: '16px', fontWeight: 700 }}>Opening Hours - {hoursRestaurant.name}</h3>
                    <button onClick={() => { setShowHours(false); setHoursRestaurant(null) }} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '20px', cursor: 'pointer' }}>x</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 50px', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase' }}>Day</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase' }}>Opens</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase' }}>Closes</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase' }}>Shut</div>
                  </div>
                  {restaurantHours.map((h, i) => (
                    <div key={h.day} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 50px', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', opacity: h.is_closed ? 0.4 : 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{h.day}</div>
                      <input type="time" value={h.open_time || '12:00'} disabled={h.is_closed} onChange={e => setRestaurantHours(hrs => hrs.map((x, j) => j === i ? { ...x, open_time: e.target.value } : x))}
                        style={{ padding: '5px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }} />
                      <input type="time" value={h.close_time || '21:30'} disabled={h.is_closed} onChange={e => setRestaurantHours(hrs => hrs.map((x, j) => j === i ? { ...x, close_time: e.target.value } : x))}
                        style={{ padding: '5px 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }} />
                      <input type="checkbox" checked={h.is_closed || false} onChange={e => setRestaurantHours(hrs => hrs.map((x, j) => j === i ? { ...x, is_closed: e.target.checked } : x))}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', margin: '0 auto' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={saveHours} className="btn-primary" style={{ flex: 1 }}>Save Hours</button>
                    <button onClick={() => { setShowHours(false); setHoursRestaurant(null) }} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Restaurant Modal */}
            {showAddRestaurant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddRestaurant(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add New Restaurant</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label>Name *</label><input className="input" placeholder="Pizza Palace" value={newRestaurant.name} onChange={e => setNewRestaurant({...newRestaurant, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')})} /></div>
                    <div><label>URL Slug *</label><input className="input" placeholder="pizza-palace" value={newRestaurant.slug} onChange={e => setNewRestaurant({...newRestaurant, slug: e.target.value})} /></div>
                    <div><label>Cuisine</label><input className="input" placeholder="Italian, Pizza" value={newRestaurant.cuisine_type} onChange={e => setNewRestaurant({...newRestaurant, cuisine_type: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" placeholder="food" value={newRestaurant.emoji} onChange={e => setNewRestaurant({...newRestaurant, emoji: e.target.value})} /></div>
                    <div><label>Parish</label><select className="input" value={newRestaurant.parish} onChange={e => setNewRestaurant({...newRestaurant, parish: e.target.value})}>{PARISHES.map(p => <option key={p}>{p}</option>)}</select></div>
                    <div><label>Postcode</label><input className="input" placeholder="GY1" value={newRestaurant.postcode} onChange={e => setNewRestaurant({...newRestaurant, postcode: e.target.value})} /></div>
                    <div><label>Min Order GBP</label><input className="input" type="number" value={newRestaurant.min_order} onChange={e => setNewRestaurant({...newRestaurant, min_order: e.target.value})} /></div>
                    <div><label>Delivery Fee GBP</label><input className="input" type="number" step="0.01" placeholder="2.50" value={newRestaurant.delivery_fee || ''} onChange={e => setNewRestaurant({...newRestaurant, delivery_fee: e.target.value})} /></div>
                    <div><label>Delivery Mins</label><input className="input" type="number" value={newRestaurant.delivery_time_mins} onChange={e => setNewRestaurant({...newRestaurant, delivery_time_mins: e.target.value})} /></div>
                    <div><label>Pickup Mins</label><input className="input" type="number" value={newRestaurant.pickup_time_mins} onChange={e => setNewRestaurant({...newRestaurant, pickup_time_mins: e.target.value})} /></div>
                    <div><label>Opens (e.g. 11:00)</label><input className="input" type="time" value={newRestaurant.opening_time || ''} onChange={e => setNewRestaurant({...newRestaurant, opening_time: e.target.value})} /></div>
                    <div><label>Closes (e.g. 22:00)</label><input className="input" type="time" value={newRestaurant.closing_time || ''} onChange={e => setNewRestaurant({...newRestaurant, closing_time: e.target.value})} /></div>
                  </div>
                  <div style={{ marginBottom: '10px' }}><label>Description</label><textarea className="input" rows={2} value={newRestaurant.description} onChange={e => setNewRestaurant({...newRestaurant, description: e.target.value})} style={{ resize: 'none' }} /></div>
                  <div style={{ marginBottom: '10px' }}><label>Custom Thank You Message</label><input className="input" value={newRestaurant.custom_message} onChange={e => setNewRestaurant({...newRestaurant, custom_message: e.target.value})} /></div>
                  <div style={{ marginBottom: '20px' }}><label>Merchant *</label><select className="input" value={newRestaurant.merchant_id} onChange={e => setNewRestaurant({...newRestaurant, merchant_id: e.target.value})}><option value="">Select merchant...</option>{merchants.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}</select></div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddRestaurant(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addRestaurant} style={{ flex: 2 }}>Add Restaurant</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Restaurant Modal */}
            {editRestaurant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setEditRestaurant(null) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Edit {editRestaurant.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label>Name</label><input className="input" value={editRestaurant.name} onChange={e => setEditRestaurant({...editRestaurant, name: e.target.value})} /></div>
                    <div><label>Cuisine</label><input className="input" value={editRestaurant.cuisine_type} onChange={e => setEditRestaurant({...editRestaurant, cuisine_type: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" value={editRestaurant.emoji} onChange={e => setEditRestaurant({...editRestaurant, emoji: e.target.value})} /></div>
                    <div><label>Parish</label><select className="input" value={editRestaurant.parish} onChange={e => setEditRestaurant({...editRestaurant, parish: e.target.value})}>{PARISHES.map(p => <option key={p}>{p}</option>)}</select></div>
                    <div><label>Min Order GBP</label><input className="input" type="number" value={editRestaurant.min_order} onChange={e => setEditRestaurant({...editRestaurant, min_order: e.target.value})} /></div>
                    <div><label>Delivery Mins</label><input className="input" type="number" value={editRestaurant.delivery_time_mins} onChange={e => setEditRestaurant({...editRestaurant, delivery_time_mins: e.target.value})} /></div>
                    <div><label>Pickup Mins</label><input className="input" type="number" value={editRestaurant.pickup_time_mins} onChange={e => setEditRestaurant({...editRestaurant, pickup_time_mins: e.target.value})} /></div>
                    <div><label>Delivery Fee GBP</label><input className="input" type="number" step="0.01" placeholder="2.50" value={editRestaurant.delivery_fee || ''} onChange={e => setEditRestaurant({...editRestaurant, delivery_fee: e.target.value})} /></div>
                    <div><label>Opens (e.g. 11:00)</label><input className="input" type="time" value={editRestaurant.opening_time || ''} onChange={e => setEditRestaurant({...editRestaurant, opening_time: e.target.value})} /></div>
                    <div><label>Closes (e.g. 22:00)</label><input className="input" type="time" value={editRestaurant.closing_time || ''} onChange={e => setEditRestaurant({...editRestaurant, closing_time: e.target.value})} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label>food.gg URL (for sync)</label><input className="input" placeholder="https://www.food.gg/restaurantname" value={editRestaurant.foodgg_url || ''} onChange={e => setEditRestaurant({...editRestaurant, foodgg_url: e.target.value})} /></div>
                    <div style={{ gridColumn: 'span 2', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SumUp Payment Settings</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><label>SumUp API Key</label><input className="input" placeholder="sup_sk_..." value={editRestaurant.sumup_api_key || ''} onChange={e => setEditRestaurant({...editRestaurant, sumup_api_key: e.target.value})} /></div>
                        <div><label>SumUp Merchant Code</label><input className="input" placeholder="e.g. MXXXXXXXX" value={editRestaurant.sumup_merchant_code || ''} onChange={e => setEditRestaurant({...editRestaurant, sumup_merchant_code: e.target.value})} /></div>
                        <div style={{ gridColumn: 'span 2' }}><label>SumUp Merchant Email</label><input className="input" placeholder="Email registered with SumUp" value={editRestaurant.sumup_email || ''} onChange={e => setEditRestaurant({...editRestaurant, sumup_email: e.target.value})} /></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}><label>Description</label><textarea className="input" rows={2} value={editRestaurant.description || ''} onChange={e => setEditRestaurant({...editRestaurant, description: e.target.value})} style={{ resize: 'none' }} /></div>
                  <div style={{ marginBottom: '14px' }}><label>Custom Thank You Message</label><input className="input" value={editRestaurant.custom_message || ''} onChange={e => setEditRestaurant({...editRestaurant, custom_message: e.target.value})} /></div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[['is_open','Open for orders'],['is_active','Visible on site'],['accepts_delivery','Delivery'],['accepts_pickup','Pickup']].map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editRestaurant[key]} onChange={e => setEditRestaurant({...editRestaurant, [key]: e.target.checked})} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setEditRestaurant(null)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={saveRestaurant} style={{ flex: 2 }}>Save Changes</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MENUS */}
        {tab === 'menus' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Menu Editor</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select className="input" style={{ width: 'auto', minWidth: '200px' }} value={selectedRestaurant?.id || ''} onChange={e => { const r = restaurants.find(r => r.id === e.target.value); setSelectedRestaurant(r); if (r) fetchMenuForRestaurant(r.id) }}>
                  <option value="">Select restaurant...</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {selectedRestaurant && <>
                  <button className="btn-ghost" onClick={() => { fetchSharedGroups(selectedRestaurant.id); setShowSharedGroups(true) }} style={{ fontSize: '12px', padding: '8px 14px' }}>Shared Items</button>
                  <button className="btn-ghost" onClick={() => setShowAddCategory(true)} style={{ fontSize: '12px', padding: '8px 14px' }}>+ Category</button>
                  <button className="btn-primary" onClick={() => setShowAddItem(true)} style={{ fontSize: '12px', padding: '8px 14px' }}>+ Item</button>
                </>}
              </div>
            </div>

            {!selectedRestaurant && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sub)' }}>Select a restaurant to edit its menu</div>}

            {selectedRestaurant && (
              <div>
                {/* Search */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input value={menuSearch} onChange={e => setMenuSearch(e.target.value)} placeholder="Search menu items..." className="input" style={{ flex: 1 }} />
                  {menuSearch && <button onClick={() => setMenuSearch('')} className="btn-ghost" style={{ fontSize: '13px', padding: '8px 14px' }}>Clear</button>}
                </div>

                {categories.map(cat => {
                  const catItems = menuItems.filter(i => i.category_id === cat.id && (!menuSearch || i.name.toLowerCase().includes(menuSearch.toLowerCase())))
                  if (menuSearch && catItems.length === 0) return null
                  return (
                    <div key={cat.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
                      <div
                        onDragOver={e => { e.preventDefault(); setDragOverItem('cat-' + cat.id) }}
                        onDragLeave={() => setDragOverItem(null)}
                        onDrop={e => { e.stopPropagation(); handleCatDrop(cat.id) }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', background: dragOverItem === 'cat-' + cat.id ? 'rgba(34,197,94,0.08)' : 'transparent', borderTop: dragOverItem === 'cat-' + cat.id ? '2px solid #22c55e' : '2px solid transparent', transition: 'all 0.1s' }}
                        onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700 }}>{cat.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--sub)' }}>{menuItems.filter(i => i.category_id === cat.id).length} items</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button onClick={e => { e.stopPropagation(); moveCategory(cat.id, 'up') }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--sub)', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}>up</button>
                          <button onClick={e => { e.stopPropagation(); moveCategory(cat.id, 'down') }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--sub)', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}>dn</button>
                          <button onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                          <span style={{ color: 'var(--sub)', fontSize: '12px' }}>{expandedCat === cat.id ? 'v' : '>'}</span>
                        </div>
                      </div>

                      {(expandedCat === cat.id || menuSearch) && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {catItems.map(item => (
                            <div key={item.id}
                              onDragOver={e => { e.preventDefault(); setDragOverItem(item.id) }}
                              onDragLeave={() => setDragOverItem(null)}
                              onDrop={() => handleItemDrop(cat.id, item.id)}
                              style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', background: dragOverItem === item.id ? 'rgba(34,197,94,0.08)' : 'transparent', borderTop: dragOverItem === item.id ? '2px solid #22c55e' : '2px solid transparent', transition: 'all 0.1s' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>{item.emoji}</span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: item.is_available ? 'var(--text)' : 'var(--sub)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {item.name}
                                    {!item.is_available && <span style={{ fontSize: '10px', padding: '1px 5px', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', borderRadius: '4px' }}>Off</span>}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{item.description}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--orange)' }}>GBP{item.price?.toFixed(2)}</span>
                                <span draggable onDragStart={() => { dragItem.current = item }} style={{ cursor: 'grab', color: 'var(--sub)', fontSize: '18px', padding: '0 6px', userSelect: 'none' }}>&#8661;</span>
                                <button onClick={() => toggleItem(item.id, item.is_available)} style={{ fontSize: '11px', padding: '3px 8px', background: item.is_available ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: item.is_available ? 'var(--green)' : 'var(--red)', border: `1px solid ${item.is_available ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '6px', cursor: 'pointer' }}>
                                  {item.is_available ? 'On' : 'Off'}
                                </button>
                                <button onClick={() => setEditItem(item)} style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                                <button onClick={() => { setEditingOptions(item); fetchOptionGroups(item.id) }} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: '12px' }}>Options</button>
                                <button onClick={() => deleteMenuItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '12px' }}>Del</button>
                              </div>
                            </div>
                          ))}
                          <div style={{ padding: '10px 16px' }}>
                            <button onClick={() => { setShowAddItem(true); setExpandedCat(cat.id) }} style={{ width: '100%', padding: '8px', background: 'none', border: '1px dashed var(--border)', color: 'var(--sub)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>+ Add item</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* SHARED TOPPINGS MODAL */}
            {showSharedGroups && selectedRestaurant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) { setShowSharedGroups(false); setLinkingGroup(null) } }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Shared Option Groups</h3>
                    <button onClick={() => { setShowSharedGroups(false); setLinkingGroup(null) }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>x</button>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--sub)', marginBottom: '20px' }}>
                    Create option groups once (like Pizza Toppings) and apply them to multiple items at once. Perfect for toppings that apply to all pizzas!
                  </p>

                  {sharedGroups.map(group => (
                    <div key={group.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>{group.name}</span>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: group.type === 'single' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)', color: group.type === 'single' ? 'var(--blue)' : '#a855f7', marginLeft: '8px' }}>{group.type}</span>
                          {group.required && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', marginLeft: '4px' }}>required</span>}
                          <span style={{ fontSize: '11px', color: 'var(--sub)', marginLeft: '8px' }}>{group.item_option_group_links?.length || 0} items linked</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openLinkGroup(group)} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--green)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>Link to items</button>
                          <button onClick={() => deleteSharedGroup(group.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {group.item_options?.map((opt: any) => (
                          <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                            <span>{opt.name}</span>
                            {opt.price_adjustment > 0 && <span style={{ color: 'var(--orange)' }}>+GBP{parseFloat(opt.price_adjustment).toFixed(2)}</span>}
                          </div>
                        ))}
                      </div>

                      {showAddSharedOption === group.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input className="input" placeholder="Option name e.g. Pepperoni" value={newSharedOption.name} onChange={e => setNewSharedOption({...newSharedOption, name: e.target.value})} style={{ flex: 2, fontSize: '12px', padding: '6px 10px' }} />
                          <input className="input" type="number" step="0.01" placeholder="Price e.g. 1.50" value={newSharedOption.price_adjustment} onChange={e => setNewSharedOption({...newSharedOption, price_adjustment: e.target.value})} style={{ flex: 1, fontSize: '12px', padding: '6px 10px' }} />
                          <button className="btn-primary" onClick={() => addSharedOption(group.id)} style={{ fontSize: '12px', padding: '6px 12px' }}>Add</button>
                          <button className="btn-ghost" onClick={() => setShowAddSharedOption(null)} style={{ fontSize: '12px', padding: '6px 10px' }}>x</button>
                        </div>
                      ) : (
                        <button onClick={() => { setShowAddSharedOption(group.id); setNewSharedOption({ name: '', price_adjustment: '0', sort_order: '1' }) }} style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--sub)', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', width: '100%' }}>+ Add option</button>
                      )}
                    </div>
                  ))}

                  {showAddSharedGroup ? (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>New Shared Option Group</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ gridColumn: 'span 2' }}><label>Group Name</label><input className="input" placeholder="e.g. Extra Toppings, Choose Your Base" value={newSharedGroup.name} onChange={e => setNewSharedGroup({...newSharedGroup, name: e.target.value})} /></div>
                        <div style={{ gridColumn: 'span 2' }}><label>Type</label><select className="input" value={newSharedGroup.type} onChange={e => setNewSharedGroup({...newSharedGroup, type: e.target.value})}>
                          <option value="multiple">Multi select (checkboxes)</option>
                          <option value="single">Single select (radio)</option>
                        </select></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" id="shreq" checked={newSharedGroup.required} onChange={e => setNewSharedGroup({...newSharedGroup, required: e.target.checked})} />
                          <label htmlFor="shreq" style={{ cursor: 'pointer', fontSize: '13px' }}>Required</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" id="shcol" checked={newSharedGroup.is_collapsible} onChange={e => setNewSharedGroup({...newSharedGroup, is_collapsible: e.target.checked})} />
                          <label htmlFor="shcol" style={{ cursor: 'pointer', fontSize: '13px' }}>Collapsible</label>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Max selections (0 = no limit)</label>
                          <input className="input" type="number" min="0" placeholder="0" value={newSharedGroup.max_selections} onChange={e => setNewSharedGroup({...newSharedGroup, max_selections: e.target.value})} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-ghost" onClick={() => setShowAddSharedGroup(false)} style={{ flex: 1 }}>Cancel</button>
                        <button className="btn-primary" onClick={addSharedGroup} style={{ flex: 2 }}>Create Group</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddSharedGroup(true)} className="btn-ghost" style={{ width: '100%', padding: '12px', borderStyle: 'dashed' }}>+ Create New Shared Group</button>
                  )}
                </div>
              </div>
            )}

            {/* LINK GROUP TO ITEMS MODAL */}
            {linkingGroup && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setLinkingGroup(null) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Link "{linkingGroup.name}" to items</h3>
                    <button onClick={() => setLinkingGroup(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>x</button>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--sub)', marginBottom: '16px' }}>Toggle which items show this option group. Ticked items will show this group to customers.</p>

                  {categories.map(cat => (
                    <div key={cat.id} style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{cat.name}</div>
                      {menuItems.filter(i => i.category_id === cat.id).map(item => (
                        <div key={item.id} onClick={() => toggleItemLink(item.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', background: linkedItems.includes(item.id) ? 'rgba(34,197,94,0.06)' : 'var(--card)', border: `1px solid ${linkedItems.includes(item.id) ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, marginBottom: '5px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${linkedItems.includes(item.id) ? 'var(--green)' : 'var(--border)'}`, background: linkedItems.includes(item.id) ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {linkedItems.includes(item.id) && <span style={{ color: '#0f172a', fontSize: '10px', fontWeight: 700 }}>v</span>}
                          </div>
                          <span style={{ fontSize: '13px' }}>{item.emoji} {item.name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--sub)', marginLeft: 'auto' }}>GBP{item.price?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  <button onClick={() => setLinkingGroup(null)} className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>Done</button>
                </div>
              </div>
            )}

            {/* Add Category Modal */}
            {showAddCategory && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddCategory(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add Category</h3>
                  <div style={{ marginBottom: '12px' }}><label>Category Name</label><input className="input" placeholder="e.g. Starters, Mains, Desserts" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} /></div>
                  <div style={{ marginBottom: '20px' }}><label>Sort Order</label><input className="input" type="number" value={newCategory.sort_order} onChange={e => setNewCategory({...newCategory, sort_order: e.target.value})} /></div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddCategory(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addCategory} style={{ flex: 2 }}>Add Category</button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Item Modal */}
            {showAddItem && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddItem(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add Menu Item</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ gridColumn: 'span 2' }}><label>Item Name *</label><input className="input" placeholder="Margherita Pizza" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
                    <div><label>Price GBP *</label><input className="input" type="number" step="0.01" placeholder="11.99" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" placeholder="food" value={newItem.emoji} onChange={e => setNewItem({...newItem, emoji: e.target.value})} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label>Description</label><input className="input" placeholder="Tomato, mozzarella, fresh basil" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} /></div>
                    <div><label>Calories (optional)</label><input className="input" type="number" placeholder="820" value={newItem.calories} onChange={e => setNewItem({...newItem, calories: e.target.value})} /></div>
                    <div><label>Category *</label><select className="input" value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})}><option value="">Select...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddItem(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addMenuItem} style={{ flex: 2 }}>Add Item</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Item Modal */}
            {editItem && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setEditItem(null) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Edit {editItem.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ gridColumn: 'span 2' }}><label>Name</label><input className="input" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} /></div>
                    <div><label>Price GBP</label><input className="input" type="number" step="0.01" value={editItem.price} onChange={e => setEditItem({...editItem, price: e.target.value})} /></div>
                    <div><label>Emoji</label><input className="input" value={editItem.emoji} onChange={e => setEditItem({...editItem, emoji: e.target.value})} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label>Description</label><input className="input" value={editItem.description || ''} onChange={e => setEditItem({...editItem, description: e.target.value})} /></div>
                    <div><label>Calories</label><input className="input" type="number" value={editItem.calories || ''} onChange={e => setEditItem({...editItem, calories: e.target.value})} /></div>
                    <div><label>Category</label><select className="input" value={editItem.category_id} onChange={e => setEditItem({...editItem, category_id: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={editItem.is_available} onChange={e => setEditItem({...editItem, is_available: e.target.checked})} />
                    Available for ordering
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setEditItem(null)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={saveMenuItem} style={{ flex: 2 }}>Save Item</button>
                  </div>
                </div>
              </div>
            )}

            {/* OPTIONS EDITOR MODAL - per item */}
            {editingOptions && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setEditingOptions(null) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Options for {editingOptions.name}</h3>
                    <button onClick={() => setEditingOptions(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>x</button>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                    Add option groups specific to this item. For options that apply to multiple items use Shared Items.
                  </div>

                  {sharedOptionGroups.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Linked Shared Items</div>
                      {sharedOptionGroups.map(group => (
                        <div key={group.id} style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#a855f7' }}>{group.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--sub)', marginLeft: '8px' }}>{group.item_options?.length} options</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: 'var(--sub)' }}>
                              <input type="checkbox" checked={group.is_collapsible || false} onChange={async e => {
                                await supabase.from('item_option_groups').update({ is_collapsible: e.target.checked }).eq('id', group.id)
                                fetchOptionGroups(editingOptions.id)
                              }} />
                              Collapsible
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--sub)' }}>
                              <span>Max:</span>
                              <input type="number" min="0" value={group.max_selections || 0} onChange={async e => {
                                await supabase.from('item_option_groups').update({ max_selections: parseInt(e.target.value) || 0 }).eq('id', group.id)
                                fetchOptionGroups(editingOptions.id)
                              }} style={{ width: '48px', padding: '2px 6px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '12px' }} />
                            </div>
                            <button onClick={async () => {
                              await supabase.from('item_option_group_links').delete().eq('menu_item_id', editingOptions.id).eq('option_group_id', group.id)
                              fetchOptionGroups(editingOptions.id)
                            }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '12px' }}>Unlink</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {optionGroups.map(group => (
                    <div key={group.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>{group.name}</span>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: group.type === 'single' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)', color: group.type === 'single' ? 'var(--blue)' : '#a855f7', marginLeft: '8px' }}>{group.type}</span>
                          {group.required && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', marginLeft: '4px' }}>required</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => moveGroup(group.id, 'up', editingOptions.id)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--sub)', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}></button>
                          <button onClick={() => moveGroup(group.id, 'down', editingOptions.id)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--sub)', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}></button>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: 'var(--sub)' }}>
                            <input type="checkbox" checked={group.is_collapsible || false} onChange={async e => {
                              await supabase.from('item_option_groups').update({ is_collapsible: e.target.checked }).eq('id', group.id)
                              fetchOptionGroups(editingOptions.id)
                            }} />
                            Collapsible
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--sub)' }}>
                            <span>Max:</span>
                            <input type="number" min="0" value={group.max_selections || 0} onChange={async e => {
                              await supabase.from('item_option_groups').update({ max_selections: parseInt(e.target.value) || 0 }).eq('id', group.id)
                              fetchOptionGroups(editingOptions.id)
                            }} style={{ width: '48px', padding: '2px 6px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '12px' }} />
                          </div>
                          <button onClick={() => deleteOptionGroup(group.id, editingOptions.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {group.item_options?.map((opt: any) => (
                          <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                            <span>{opt.name}</span>
                            {opt.price_adjustment > 0 && <span style={{ color: 'var(--orange)' }}>+GBP{parseFloat(opt.price_adjustment).toFixed(2)}</span>}
                            <button onClick={() => deleteOption(opt.id, editingOptions.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>x</button>
                          </div>
                        ))}
                      </div>
                      {showAddOption === group.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input className="input" placeholder="Option name" value={newOption.name} onChange={e => setNewOption({...newOption, name: e.target.value})} style={{ flex: 2, fontSize: '12px', padding: '6px 10px' }} />
                          <input className="input" type="number" step="0.01" placeholder="Price +/-" value={newOption.price_adjustment} onChange={e => setNewOption({...newOption, price_adjustment: e.target.value})} style={{ flex: 1, fontSize: '12px', padding: '6px 10px' }} />
                          <button className="btn-primary" onClick={() => addOption(group.id, editingOptions.id)} style={{ fontSize: '12px', padding: '6px 12px' }}>Add</button>
                          <button className="btn-ghost" onClick={() => setShowAddOption(null)} style={{ fontSize: '12px', padding: '6px 10px' }}>x</button>
                        </div>
                      ) : (
                        <button onClick={() => { setShowAddOption(group.id); setNewOption({ name: '', price_adjustment: '0', sort_order: '1' }) }} style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--sub)', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', width: '100%' }}>+ Add option</button>
                      )}
                    </div>
                  ))}

                  {showAddGroup ? (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>New Option Group</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ gridColumn: 'span 2' }}><label>Group Name</label><input className="input" placeholder="e.g. Choose Your Size" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} /></div>
                        <div style={{ gridColumn: 'span 2' }}><label>Type</label><select className="input" value={newGroup.type} onChange={e => setNewGroup({...newGroup, type: e.target.value})}>
                          <option value="single">Single select (radio)</option>
                          <option value="multiple">Multi select (checkboxes)</option>
                        </select></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" id="req" checked={newGroup.required} onChange={e => setNewGroup({...newGroup, required: e.target.checked})} />
                          <label htmlFor="req" style={{ cursor: 'pointer', fontSize: '13px' }}>Required</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" id="col" checked={newGroup.is_collapsible} onChange={e => setNewGroup({...newGroup, is_collapsible: e.target.checked})} />
                          <label htmlFor="col" style={{ cursor: 'pointer', fontSize: '13px' }}>Collapsible</label>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Max selections (0 = no limit)</label>
                          <input className="input" type="number" min="0" placeholder="0" value={newGroup.max_selections} onChange={e => setNewGroup({...newGroup, max_selections: e.target.value})} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-ghost" onClick={() => setShowAddGroup(false)} style={{ flex: 1 }}>Cancel</button>
                        <button className="btn-primary" onClick={() => addOptionGroup(editingOptions.id)} style={{ flex: 2 }}>Add Group</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddGroup(true)} className="btn-ghost" style={{ width: '100%', padding: '12px', borderStyle: 'dashed' }}>+ Add Option Group</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MERCHANTS */}
        {tab === 'merchants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Merchants</h2>
              <button className="btn-primary" onClick={() => setShowAddMerchant(true)} style={{ padding: '10px 18px' }}>+ Add Merchant</button>
            </div>
            {merchants.map(m => (
              <div key={m.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
                {editMerchant?.id === m.id ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div><label>Name</label><input className="input" value={editMerchant.name} onChange={e => setEditMerchant({...editMerchant, name: e.target.value})} /></div>
                      <div><label>Email</label><input className="input" value={editMerchant.email} onChange={e => setEditMerchant({...editMerchant, email: e.target.value})} /></div>
                      <div><label>Phone</label><input className="input" value={editMerchant.phone || ''} onChange={e => setEditMerchant({...editMerchant, phone: e.target.value})} /></div>
                      <div><label>Commission %</label><input className="input" type="number" step="0.1" value={editMerchant.commission_rate || 4} onChange={e => setEditMerchant({...editMerchant, commission_rate: e.target.value})} /></div>
                      <div><label>New Password (blank = no change)</label><input className="input" type="password" placeholder="New password" value={merchantNewPassword} onChange={e => setMerchantNewPassword(e.target.value)} /></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                        <input type="checkbox" id={`trial-${m.id}`} checked={editMerchant.is_trial || false} onChange={e => setEditMerchant({...editMerchant, is_trial: e.target.checked})} />
                        <label htmlFor={`trial-${m.id}`} style={{ cursor: 'pointer', fontSize: '13px' }}>Trial merchant</label>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-primary" onClick={saveMerchant} style={{ flex: 1 }}>Save</button>
                      <button className="btn-ghost" onClick={() => { setEditMerchant(null); setMerchantNewPassword('') }} style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{m.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{m.email}{m.phone ? ' - ' + m.phone : ''}</div>
                      <div style={{ fontSize: '11px', color: 'var(--sub)', marginTop: '3px' }}>Commission: {m.commission_rate || 4}% - Joined {new Date(m.created_at).toLocaleDateString('en-GB')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: m.is_trial ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)', color: m.is_trial ? '#EAB308' : 'var(--green)', fontWeight: 600 }}>
                        {m.is_trial ? 'Trial' : 'Live'}
                      </span>
                      <button className="btn-ghost" onClick={() => setEditMerchant({...m})} style={{ fontSize: '12px', padding: '5px 12px' }}>Edit</button>
                      <button onClick={() => deleteMerchant(m.id, m.name)} style={{ fontSize: '12px', padding: '5px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {showAddMerchant && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowAddMerchant(false) }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Add Merchant</h3>
                  <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                    <div><label>Full Name</label><input className="input" placeholder="John Smith" value={newMerchant.name} onChange={e => setNewMerchant({...newMerchant, name: e.target.value})} /></div>
                    <div><label>Email</label><input className="input" type="email" placeholder="john@restaurant.com" value={newMerchant.email} onChange={e => setNewMerchant({...newMerchant, email: e.target.value})} /></div>
                    <div><label>Phone</label><input className="input" placeholder="+44 1481 000000" value={newMerchant.phone} onChange={e => setNewMerchant({...newMerchant, phone: e.target.value})} /></div>
                    <div><label>Commission %</label><input className="input" type="number" value={newMerchant.commission_rate} onChange={e => setNewMerchant({...newMerchant, commission_rate: e.target.value})} /></div>
                    <div><label>Terminal Password</label><input className="input" type="password" placeholder="Choose a password for them" value={newMerchant.password} onChange={e => setNewMerchant({...newMerchant, password: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setShowAddMerchant(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn-primary" onClick={addMerchant} style={{ flex: 2 }}>Add Merchant</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORDERS */}
        {tab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>All Orders</h2>
              <button onClick={fetchAll} className="btn-ghost" style={{ fontSize: '13px', padding: '8px 16px' }}>Refresh</button>
            </div>
            {orders.map(o => (
              <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '8px', overflow: 'hidden' }}>
                <div onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                  style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>#{o.id?.slice(0,8).toUpperCase()} {expandedOrder === o.id ? 'v' : '>'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{o.customer_name} {o.customer_phone ? '- ' + o.customer_phone : ''}</div>
                    <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{new Date(o.created_at).toLocaleString('en-GB')} - {o.order_type || 'delivery'} - {o.payment_method || 'card'}</div>
                    {o.delivery_address && <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{o.parish} - {o.delivery_address}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green)' }}>GBP{parseFloat(o.total || 0).toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--sub)' }}>Commission: GBP{parseFloat(o.commission || 0).toFixed(2)}</div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: ['paid','complete'].includes(o.status) ? 'rgba(34,197,94,0.15)' : o.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: ['paid','complete'].includes(o.status) ? 'var(--green)' : o.status === 'cancelled' ? 'var(--red)' : 'var(--orange)' }}>{o.status}</span>
                  </div>
                </div>
                {expandedOrder === o.id && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px', background: 'var(--bg3)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Order Items</div>
                    {o.items ? (
                      (typeof o.items === 'string' ? JSON.parse(o.items) : o.items).map((item: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <span>{item.qty}x {item.name}{item.note ? <span style={{ color: 'var(--sub)', fontSize: '11px' }}> ({item.note})</span> : ''}</span>
                          <span style={{ fontWeight: 600 }}>GBP{(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      ))
                    ) : <div style={{ fontSize: '12px', color: 'var(--sub)' }}>No item details available</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--sub)' }}>Subtotal</span><span>GBP{parseFloat(o.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {o.delivery_fee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                        <span style={{ color: 'var(--sub)' }}>Delivery</span><span>GBP{parseFloat(o.delivery_fee || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {o.notes && <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--sub)', fontStyle: 'italic' }}>Note: {o.notes}</div>}
                  </div>
                )}
              </div>
            ))}
            {orders.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sub)' }}>No orders yet</div>}
          </div>
        )}

        {/* COMMISSIONS */}
        {tab === 'commissions' && (
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>Commissions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Total Commission</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)' }}>GBP{totalCommission.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Platform Revenue</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)' }}>GBP{totalRevenue.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginBottom: '6px' }}>Card Orders</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--blue)' }}>{orders.filter(o => o.payment_method === 'card').length}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--sub)', lineHeight: 1.6 }}>
              Commission is charged at 4% on food subtotal for card orders only. Cash orders are excluded. Invoices sent monthly with 7-day payment terms. Trial merchants are not invoiced.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
