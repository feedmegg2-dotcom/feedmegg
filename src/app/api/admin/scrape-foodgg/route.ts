import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
  })
  return res.text()
}

function cleanText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
}

function splitNameDesc(text: string): { name: string; desc: string; size?: string } {
  // Decode HTML entities first
  const decoded = text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  
  // food.gg format: "Name Description - 9"" or "Name Description - 12""
  // Extract size from end (e.g., 9", 12")
  const sizeMatch = decoded.match(/\s*-\s*(\d+")$/)
  let size = ''
  let withoutSize = decoded
  
  if (sizeMatch) {
    size = sizeMatch[1]
    withoutSize = decoded.substring(0, sizeMatch.index).trim()
  }
  
  // Split "Name Description" on first space
  // Name is first word, Description is the rest
  const firstSpaceIdx = withoutSize.indexOf(' ')
  if (firstSpaceIdx > 0) {
    return {
      name: withoutSize.substring(0, firstSpaceIdx).trim(),
      desc: withoutSize.substring(firstSpaceIdx).trim(),
      size: size || undefined
    }
  }
  
  // No space found (single word name)
  return { 
    name: withoutSize, 
    desc: '', 
    size: size || undefined 
  }
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
  if (n.includes('spring roll')) return '🥟'
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

interface MenuItem { name: string; description: string; price: number; tags: string[] }

function parseItems(html: string): MenuItem[] {
  const items: MenuItem[] = []
  const rows = html.split(/<tr[\s>]/i)
  
  let currentName = ''
  let currentDesc = ''
  let currentTags: string[] = []
  
  for (const row of rows) {
    if (row.includes('<th')) continue
    
    // Extract all td contents
    const tds: string[] = []
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let tdm
    while ((tdm = tdRegex.exec(row)) !== null) {
      tds.push(tdm[1])
    }
    if (tds.length === 0) continue
    
    const firstText = cleanText(tds[0])
    const lastHtml = tds[tds.length - 1] || ''
    const priceMatch = lastHtml.match(/£([\d.]+)/)
    const hasBasket = lastHtml.includes('Add to basket') || lastHtml.includes('add/')
    
    // Row with name/description but no price (first row of item group)
    if (!hasBasket && !priceMatch) {
      if (firstText && firstText.length > 1 && firstText !== 'Price' && !firstText.match(/^[£\d]/)) {
        const tags: string[] = []
        const allText = cleanText(row)
        if (allText.includes('Vegan')) { tags.push('veg'); tags.push('vegan') }
        else if (allText.includes('Vegetarian')) tags.push('veg')
        if (allText.includes('Spicy') || firstText.toLowerCase().includes('spicy') || firstText.toLowerCase().includes('chilli')) tags.push('spicy')
        
        // Use splitNameDesc helper to extract name, description, and size
        const clean = firstText.replace(/\s*(Vegetarian|Vegan|Spicy|Contains Nuts)\s*/g, ' ').trim()
        const split = splitNameDesc(clean)
        currentName = split.name
        currentDesc = split.desc
        // If size was extracted (e.g., "9""), add it to name
        if (split.size) {
          currentName = split.name + ' ' + split.size
        }
        currentTags = tags
      }
      continue
    }
    
    // Row with price but not a size variant
    if (!priceMatch) continue
    const price = parseFloat(priceMatch[1])
    if (price <= 0 || price >= 500) continue
    
    // Check if first cell is a size (e.g., "9"", "Small", "Medium")
    const isSize = !firstText || /^\d+"$|^Small$|^Medium$|^Large$|^Regular$|^\d+$/.test(firstText)
    
    // Row with size and price
    if (currentName && firstText && /^\d+"$|^Small$|^Medium$|^Large$|^Regular$|^\d+$/.test(firstText)) {
      items.push({ 
        name: currentName + ' ' + firstText, 
        description: currentDesc, 
        price, 
        tags: [...currentTags] 
      })
    } 
    // Row with price but no size in first cell (single price item)
    else if (currentName && !firstText) {
      items.push({ 
        name: currentName, 
        description: currentDesc, 
        price, 
        tags: [...currentTags] 
      })
      currentName = ''; currentDesc = ''; currentTags = []
    } 
    // Variant row (e.g., "Gravy", "Bacon", "Extra Cheese")
    else if (currentName && firstText && firstText.length > 0 && firstText.length < 30 && !isSize) {
      items.push({ 
        name: currentName + ' - ' + firstText, 
        description: currentDesc, 
        price, 
        tags: [...currentTags] 
      })
    } 
    // New item without currentName set (fallback - treat first cell as full name)
    else if (firstText && firstText.length > 2) {
      const tags: string[] = []
      if (firstText.includes('Vegan')) { tags.push('veg'); tags.push('vegan') }
      else if (firstText.includes('Vegetarian')) tags.push('veg')
      if (firstText.toLowerCase().includes('spicy')) tags.push('spicy')
      const clean = firstText.replace(/\s*(Vegetarian|Vegan|Spicy|Contains Nuts)\s*/g, ' ').trim()
      const split = splitNameDesc(clean)
      let itemName = split.name
      if (split.size) {
        itemName = split.name + ' ' + split.size
      }
      items.push({ 
        name: itemName, 
        description: split.desc, 
        price, 
        tags 
      })
    }
  }
  
  return items
}

function getCategoryName(html: string): string {
  // Try title tag first - most reliable
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (titleMatch) {
    const title = titleMatch[1]
    // Format: "Restaurant Name Menu - Category - Food.gg"
    const parts = title.split(' - ')
    if (parts.length >= 2) {
      const catPart = parts[1].trim()
      if (catPart && !catPart.includes('Food.gg') && !catPart.toLowerCase().includes('menu')) {
        return catPart
      }
    }
  }
  // Fallback to h2
  const h2 = html.match(/<h2[^>]*>([^<]+)<\/h2>/i)
  if (h2) {
    const text = cleanText(h2[1])
    if (text && !['menu', 'your order'].includes(text.toLowerCase())) return text
  }
  return 'Menu'
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
    // Restaurant name from h1
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
    // Extract ALL /menu/NUMBER URLs
    // food.gg uses both absolute and relative URLs, with #menu anchors
    const sectionUrls: string[] = []
    const seen = new Set<string>()
    // Match /menu/NUMBER anywhere in the HTML (handles #menu suffix)
    const menuNumRegex = /\/menu\/(\d+)/g
    let mu
    while ((mu = menuNumRegex.exec(mainHtml)) !== null) {
      const secUrl = `https://www.food.gg/${slug}/menu/${mu[1]}`
      if (!seen.has(secUrl)) { seen.add(secUrl); sectionUrls.push(secUrl) }
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
      parish, postcode: 'GY1', min_order: 10,
      delivery_time_mins: 45, pickup_time_mins: 20,
      is_open: false, is_active: true,
      accepts_delivery: true, accepts_pickup: true, accepts_preorders: true,
      slot_capacity: 5,
      custom_message: `Thank you for ordering from ${restaurantName}!`,
    }).select().single()
    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Failed: ' + restError?.message }, { status: 500 })
    }
    const restaurantId = restaurant.id
    let totalItems = 0
    let totalCategories = 0
    async function saveCategory(name: string, items: MenuItem[]) {
      if (items.length === 0 || !name || name === 'Menu') return
      const { data: cat } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId, name,
        sort_order: totalCategories + 1, is_active: true,
      }).select().single()
      if (!cat) return
      totalCategories++
      for (const item of items) {
        await supabase.from('menu_items').insert({
          restaurant_id: restaurantId, category_id: cat.id,
          name: item.name, description: item.description, price: item.price,
          emoji: getEmoji(name + ' ' + item.name),
          is_available: true, tags: item.tags, allergens: [],
        })
        totalItems++
      }
    }
    // Main page - get category name from title
    const mainCat = getCategoryName(mainHtml)
    await saveCategory(mainCat, parseItems(mainHtml))
    // Each section page
    for (const secUrl of sectionUrls) {
      try {
        const secHtml = await fetchPage(secUrl)
        const catName = getCategoryName(secHtml)
        await saveCategory(catName, parseItems(secHtml))
      } catch (e) { /* skip */ }
    }
    return NextResponse.json({
      success: true, restaurantId, restaurantName,
      categories: totalCategories, items: totalItems,
      sectionsFound: sectionUrls.length,
      sectionUrls,
      message: `Imported ${restaurantName} with ${totalCategories} categories and ${totalItems} menu items! (Found ${sectionUrls.length} sections)`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
