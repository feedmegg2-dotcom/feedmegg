import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feedmegg/1.0)' },
  })
  return res.text()
}

function cleanText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('pizza')) return '🍕'
  if (n.includes('burger')) return '🍔'
  if (n.includes('chicken')) return '🍗'
  if (n.includes('fish') || n.includes('prawn') || n.includes('seafood')) return '🐟'
  if (n.includes('pasta') || n.includes('spaghetti')) return '🍝'
  if (n.includes('salad')) return '🥗'
  if (n.includes('soup')) return '🍲'
  if (n.includes('cake') || n.includes('dessert') || n.includes('ice cream')) return '🍰'
  if (n.includes('soft drink') || n.includes('cola') || n.includes('juice') || n.includes('water')) return '🥤'
  if (n.includes('beer') || n.includes('wine') || n.includes('alcohol') || n.includes('spirit')) return '🍺'
  if (n.includes('wrap')) return '🌯'
  if (n.includes('steak') || n.includes('grill')) return '🥩'
  if (n.includes('garlic bread') || n.includes('bread')) return '🥖'
  if (n.includes('wing')) return '🍗'
  if (n.includes('spring roll') || n.includes('dumpling')) return '🥟'
  if (n.includes('mushroom')) return '🍄'
  if (n.includes('nacho')) return '🫔'
  if (n.includes('curry') || n.includes('korma') || n.includes('tikka')) return '🍛'
  if (n.includes('noodle') || n.includes('chow mein') || n.includes('rice')) return '🍜'
  if (n.includes('breakfast') || n.includes('egg')) return '🍳'
  if (n.includes('chip') || n.includes('fries') || n.includes('side')) return '🍟'
  if (n.includes('kebab') || n.includes('doner')) return '🌮'
  if (n.includes('children') || n.includes('kids')) return '🧒'
  if (n.includes('snack')) return '🍿'
  return '🍽'
}

interface MenuItem {
  name: string
  description: string
  price: number
  tags: string[]
}

function parseItems(html: string): MenuItem[] {
  const items: MenuItem[] = []

  // Find all tables on the page
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1]
    const rows = tableHtml.split(/<tr[^>]*>/i).slice(1)
    
    let currentName = ''
    let currentDesc = ''
    let currentTags: string[] = []
    
    for (const row of rows) {
      if (row.includes('<th')) continue
      
      const cells: string[] = []
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let cm
      while ((cm = cellRegex.exec(row)) !== null) {
        cells.push(cm[1])
      }
      
      if (cells.length === 0) continue
      
      const firstText = cleanText(cells[0])
      const lastHtml = cells[cells.length - 1] || ''
      const priceMatch = lastHtml.match(/£([\d.]+)/)
      const hasBasket = lastHtml.includes('Add to basket')
      
      if (!hasBasket && !priceMatch) {
        // Item name/description row
        if (firstText && firstText.length > 1 && firstText !== 'Price' && !firstText.match(/^£/)) {
          const tags: string[] = []
          const rowLower = row.toLowerCase()
          const textLower = firstText.toLowerCase()
          if (textLower.includes('vegan') || rowLower.includes('vegan')) { tags.push('veg'); tags.push('vegan') }
          else if (textLower.includes('vegetarian') || rowLower.includes('vegetarian')) tags.push('veg')
          if (textLower.includes('spicy') || rowLower.includes('spicy')) tags.push('spicy')
          
          // First word block = name, rest = description
          const parts = firstText.replace(/Vegetarian|Vegan|Spicy|Contains Nuts/gi, '').trim().split(/\s{2,}/)
          currentName = parts[0]?.trim() || ''
          currentDesc = parts.slice(1).join(' ').trim()
          currentTags = tags
        }
        continue
      }
      
      if (!priceMatch) continue
      const price = parseFloat(priceMatch[1])
      if (price <= 0 || price >= 500) continue
      
      const isSize = firstText.match(/^\d+"$|^Small$|^Medium$|^Large$|^Regular$|^\d+$/)
      
      if (currentName && isSize) {
        // Size variant of current item
        items.push({
          name: `${currentName} ${firstText}`,
          description: currentDesc,
          price,
          tags: [...currentTags],
        })
      } else if (currentName && (!firstText || firstText === currentName || firstText.length < 3)) {
        // Same item, single size
        items.push({
          name: currentName,
          description: currentDesc,
          price,
          tags: [...currentTags],
        })
        currentName = ''
        currentDesc = ''
        currentTags = []
      } else if (firstText && firstText.length > 2) {
        // Inline item with name and price on same row
        const tags: string[] = []
        const textLower = firstText.toLowerCase()
        if (textLower.includes('vegan')) { tags.push('veg'); tags.push('vegan') }
        else if (textLower.includes('vegetarian')) tags.push('veg')
        if (textLower.includes('spicy')) tags.push('spicy')
        
        const parts = firstText.replace(/Vegetarian|Vegan|Spicy|Contains Nuts/gi, '').trim().split(/\s{2,}/)
        const name = parts[0]?.trim() || firstText
        const desc = parts.slice(1).join(' ').trim()
        
        items.push({ name, description: desc, price, tags })
      }
    }
  }
  
  return items
}

function getPageCategoryName(html: string, fallback: string): string {
  // Look for h2 that's NOT "Menu" or "Your Order"
  const h2s = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)
  for (const m of h2s) {
    const text = cleanText(m[1])
    if (text && !['menu', 'your order', 'order'].includes(text.toLowerCase())) {
      return text
    }
  }
  return fallback
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { url, merchantId } = await request.json()
    if (!url || !merchantId) {
      return NextResponse.json({ error: 'URL and merchantId required' }, { status: 400 })
    }

    const baseUrl = url.replace(/\/$/, '').replace(/#.*$/, '')
    const slug = baseUrl.split('/').pop() || ''

    const mainHtml = await fetchPage(baseUrl)

    // Restaurant name
    const nameMatch = mainHtml.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/)
    const restaurantName = nameMatch ? nameMatch[1].trim() : slug.replace(/-/g, ' ')

    // Cuisines
    const cuisines: string[] = []
    const cuisineRegex = /guernsey-takeaway\/[^"]+">([^<]+)<\/a>/g
    let cm
    while ((cm = cuisineRegex.exec(mainHtml)) !== null) {
      if (!cm[1].includes('Food') && cm[1].length < 30) cuisines.push(cm[1].trim())
    }

    // Parish
    let parish = 'St Peter Port'
    for (const p of ['St Martin','St Peter Port','St Sampson','Vale','Castel','Forest','St Saviour','Torteval','St Pierre du Bois','St Andrew']) {
      if (mainHtml.includes(p)) { parish = p; break }
    }

    // Get section nav links — each is a separate category page
    // Format: /wickedwolf/menu/2408#menu  or /wickedwolf#menu (main page)
    const navSections: { url: string; name: string }[] = []
    const navRegex = /href="(https:\/\/www\.food\.gg\/[^"#]+(?:\/menu\/\d+)?)[^"#]*(?:#[^"]*)?"\s*>\s*([^<]+)\s*<\/a>/g
    let nm
    const seen = new Set<string>([baseUrl])

    while ((nm = navRegex.exec(mainHtml)) !== null) {
      const secUrl = nm[1]
      const secName = nm[2].trim()
      if (secUrl.includes('/menu/') && !seen.has(secUrl) && secName.length < 50) {
        seen.add(secUrl)
        navSections.push({ url: secUrl, name: secName })
      }
    }

    // Check not already imported
    const restaurantSlug = slug + '-gg'
    const { data: existing } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single()
    if (existing) {
      return NextResponse.json({ error: 'Already imported: ' + restaurantSlug }, { status: 400 })
    }

    // Create restaurant
    const { data: restaurant, error: restError } = await supabase.from('restaurants').insert({
      merchant_id: merchantId,
      name: restaurantName,
      slug: restaurantSlug,
      cuisine_type: cuisines.slice(0, 4).join(', '),
      emoji: getEmoji(cuisines.join(' ')),
      description: `Order from ${restaurantName} in Guernsey`,
      parish,
      postcode: 'GY1',
      min_order: 10,
      delivery_time_mins: 45,
      pickup_time_mins: 20,
      is_open: false,
      is_active: true,
      accepts_delivery: true,
      accepts_pickup: true,
      accepts_preorders: true,
      slot_capacity: 5,
      custom_message: `Thank you for ordering from ${restaurantName}!`,
    }).select().single()

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Failed to create restaurant: ' + restError?.message }, { status: 500 })
    }

    const restaurantId = restaurant.id
    let totalItems = 0
    let totalCategories = 0

    // Helper to save a category + items
    async function saveCategory(name: string, items: MenuItem[]) {
      if (items.length === 0) return
      const { data: cat } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name,
        sort_order: totalCategories + 1,
        is_active: true,
      }).select().single()
      if (!cat) return
      totalCategories++
      for (const item of items) {
        await supabase.from('menu_items').insert({
          restaurant_id: restaurantId,
          category_id: cat.id,
          name: item.name,
          description: item.description,
          price: item.price,
          emoji: getEmoji(name + ' ' + item.name),
          is_available: true,
          tags: item.tags,
          allergens: [],
        })
        totalItems++
      }
    }

    // Parse main page - use "Pizzas" or first h2 as category name
    const mainCatName = getPageCategoryName(mainHtml, 'Menu')
    const mainItems = parseItems(mainHtml)
    await saveCategory(mainCatName, mainItems)

    // Parse each section page
    for (const section of navSections) {
      try {
        const secHtml = await fetchPage(section.url)
        // Use the nav name as category (most reliable)
        const catName = section.name || getPageCategoryName(secHtml, section.name)
        const items = parseItems(secHtml)
        await saveCategory(catName, items)
      } catch (e) {
        // Skip failed sections
      }
    }

    return NextResponse.json({
      success: true,
      restaurantId,
      restaurantName,
      categories: totalCategories,
      items: totalItems,
      message: `Imported ${restaurantName} with ${totalCategories} categories and ${totalItems} menu items!`,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
