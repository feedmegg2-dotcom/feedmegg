import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
    next: { revalidate: 0 }
  })
  return res.text()
}

function cleanText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { restaurantId } = await request.json()
    if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })

    // Get restaurant from database
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*, menu_items(id, name)')
      .eq('id', restaurantId)
      .maybeSingle()

    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    // Use manually set food.gg URL if available, otherwise derive from slug
    const foodggUrl = restaurant.foodgg_url || `https://www.food.gg/${restaurant.slug.replace(/-gg$/, '')}`

    // Fetch food.gg main page
    const html = await fetchPage(foodggUrl)

    const changes: string[] = []

    // 1. CHECK OPEN/CLOSED STATUS
    // food.gg shows "Open Closes X:XXpm" when open, "Closed Opens X:XXpm" when closed
    const isOpen = html.includes('Open Closes') || html.includes('*Open')
    const isClosed = html.includes('Closed Opens') || html.includes('*Closed') || html.includes('Currently closed')
    const newOpenStatus = isOpen && !isClosed

    if (restaurant.is_open !== newOpenStatus) {
      await supabase.from('restaurants').update({ is_open: newOpenStatus }).eq('id', restaurantId)
      changes.push(newOpenStatus ? 'Marked as open' : 'Marked as closed')
    }

    // 2. CHECK DELIVERY/PICKUP TIMES
    // food.gg shows "Average delivery: X minutes" and "Average collection: X minutes"
    // These appear on both the main page and the /info page
    const delivMatch = html.match(/Average delivery[^\d]+(\d+)\s*minutes?/i)
    const pickMatch = html.match(/Average collection[^\d]+(\d+)\s*minutes?/i)

    if (delivMatch) {
      const newDelivTime = parseInt(delivMatch[1])
      if (restaurant.delivery_time_mins !== newDelivTime) {
        await supabase.from('restaurants').update({ delivery_time_mins: newDelivTime }).eq('id', restaurantId)
        changes.push(`Delivery time updated to ${newDelivTime} mins`)
      }
    }

    if (pickMatch) {
      const newPickTime = parseInt(pickMatch[1])
      if (restaurant.pickup_time_mins !== newPickTime) {
        await supabase.from('restaurants').update({ pickup_time_mins: newPickTime }).eq('id', restaurantId)
        changes.push(`Pickup time updated to ${newPickTime} mins`)
      }
    }

    // 3. CHECK ITEM AVAILABILITY
    // Only check if restaurant is open - no point checking items if closed
    if (isOpen && restaurant.menu_items?.length > 0) {
      // Fetch all menu section pages
      const sectionUrls: string[] = []
      const seen = new Set<string>()
      const menuNumRegex = /\/menu\/(\d+)/g
      let mu
      while ((mu = menuNumRegex.exec(html)) !== null) {
        const secUrl = `${foodggUrl.replace(/#.*$/, '')}/menu/${mu[1]}`
        if (!seen.has(secUrl)) { seen.add(secUrl); sectionUrls.push(secUrl) }
      }

      // Collect all pages HTML
      const allHtml = [html]
      for (const secUrl of sectionUrls) {
        try {
          const secHtml = await fetchPage(secUrl)
          allHtml.push(secHtml)
        } catch (e) { /* skip */ }
      }

      const combinedHtml = allHtml.join('\n')

      // Find unavailable items on food.gg
      // food.gg marks unavailable items with class "unavailable" or "sold-out" or similar
      const unavailablePattern = /class="[^"]*(?:unavailable|sold-out|out-of-stock)[^"]*"[^>]*>([\s\S]*?)<\/(?:tr|div)/gi
      const unavailableItems = new Set<string>()
      let uMatch
      while ((uMatch = unavailablePattern.exec(combinedHtml)) !== null) {
        const itemText = cleanText(uMatch[1]).toLowerCase()
        if (itemText) unavailableItems.add(itemText)
      }

      // Also check for "Add to basket" buttons being disabled/missing
      // Items without "Add to basket" are unavailable
      const availableItemsOnFoodgg = new Set<string>()
      const basketRegex = /([^|<]+)\s*\|\s*[£\d].*?Add to basket/gi
      let bMatch
      while ((bMatch = basketRegex.exec(combinedHtml)) !== null) {
        availableItemsOnFoodgg.add(cleanText(bMatch[1]).toLowerCase().trim())
      }

      // Find unavailable items - food.gg shows "Unavailable" text next to item names
      // Pattern: item name followed by "Unavailable" in the HTML
      const unavailableItemNames = new Set<string>()

      // Look for rows containing "Unavailable" text
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let rowMatch
      while ((rowMatch = rowRegex.exec(combinedHtml)) !== null) {
        const rowHtml = rowMatch[1]
        if (rowHtml.toLowerCase().includes('unavailable')) {
          // Extract the item name from this row
          const nameMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i)
          if (nameMatch) {
            const name = cleanText(nameMatch[1]).toLowerCase().replace(/unavailable/gi, '').trim()
            if (name && name.length > 1) {
              unavailableItemNames.add(name)
            }
          }
        }
      }

      // Update our items based on food.gg availability
      let itemsUpdated = 0
      for (const item of restaurant.menu_items) {
        const itemNameLower = item.name.toLowerCase()

        // Check if this item name matches any unavailable item on food.gg
        let shouldBeAvailable = true
        for (const unavailName of unavailableItemNames) {
          // Match if names overlap significantly
          if (
            unavailName.includes(itemNameLower) ||
            itemNameLower.includes(unavailName) ||
            // Also try matching just the first word (base pizza name etc)
            itemNameLower.split(' ')[0] === unavailName.split(' ')[0]
          ) {
            shouldBeAvailable = false
            break
          }
        }

        // Only update if status changed
        const { data: currentItem } = await supabase
          .from('menu_items')
          .select('is_available')
          .eq('id', item.id)
          .maybeSingle()

        if (currentItem && currentItem.is_available !== shouldBeAvailable) {
          await supabase.from('menu_items').update({ is_available: shouldBeAvailable }).eq('id', item.id)
          itemsUpdated++
          changes.push(`${item.name} marked ${shouldBeAvailable ? 'available' : 'unavailable'}`)
        }
      }

      if (itemsUpdated > 0 && !changes.find(c => c.includes('marked'))) {
        changes.push(`Updated ${itemsUpdated} item availabilities`)
      }
    }

    // Update last sync time
    await supabase.from('restaurants').update({ updated_at: new Date().toISOString() }).eq('id', restaurantId)

    return NextResponse.json({
      success: true,
      isOpen,
      changes,
      message: changes.length > 0 ? changes.join(', ') : 'All up to date'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
