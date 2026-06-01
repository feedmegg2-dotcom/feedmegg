import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; feedmegg/1.0)',
    },
  })
  return res.text()
}

function parsePrice(str: string): number {
  const match = str.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

function parseItems(html: string): { name: string; description: string; price: number; tags: string[] }[] {
  const items: { name: string; description: string; price: number; tags: string[] }[] = []
  
  // Match table rows with prices
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1]
    
    // Skip header rows
    if (row.includes('<th')) continue
    
    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    const cells: string[] = []
    let cellMatch
    
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      const text = cellMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (text) cells.push(text)
    }
    
    if (cells.length >= 2) {
      const nameCell = cells[0]
      const priceCell = cells[cells.length - 1]
      
      if (priceCell.includes('Add to basket') || priceCell.match(/£[\d.]+/)) {
        // Extract name and description
        const lines = nameCell.split(/\n|  +/).filter(l => l.trim())
        const name = lines[0]?.trim() || ''
        const description = lines.slice(1).join(' ').replace(/Vegetarian|Spicy|Contains Nuts/g, '').trim()
        
        // Extract price
        const priceMatch = priceCell.match(/£([\d.]+)/)
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0
        
        // Detect tags
        const tags: string[] = []
        if (nameCell.toLowerCase().includes('vegetarian') || nameCell.includes('Vegetarian')) tags.push('veg')
        if (nameCell.toLowerCase().includes('vegan')) tags.push('vegan')
        if (nameCell.toLowerCase().includes('spicy') || nameCell.toLowerCase().includes('chilli')) tags.push('spicy')
        
        if (name && price > 0 && price < 100) {
          items.push({ name, description, price, tags })
        }
      }
    }
  }
  
  return items
}

function getEmoji(categoryName: string, itemName: string): string {
  const n = (categoryName + ' ' + itemName).toLowerCase()
  if (n.includes('pizza')) return '🍕'
  if (n.includes('burger')) return '🍔'
  if (n.includes('chicken')) return '🍗'
  if (n.includes('fish') || n.includes('prawn') || n.includes('seafood')) return '🐟'
  if (n.includes('pasta') || n.includes('spaghetti')) return '🍝'
  if (n.includes('salad')) return '🥗'
  if (n.includes('soup')) return '🍲'
  if (n.includes('cake') || n.includes('dessert') || n.includes('ice cream')) return '🍰'
  if (n.includes('drink') || n.includes('cola') || n.includes('beer') || n.includes('wine')) return '🥤'
  if (n.includes('wrap')) return '🌯'
  if (n.includes('steak')) return '🥩'
  if (n.includes('garlic bread') || n.includes('bread')) return '🥖'
  if (n.includes('wing')) return '🍗'
  if (n.includes('spring roll') || n.includes('dumpling')) return '🥟'
  if (n.includes('mushroom')) return '🍄'
  if (n.includes('nacho')) return '🫔'
  if (n.includes('curry')) return '🍛'
  if (n.includes('noodle') || n.includes('rice')) return '🍜'
  if (n.includes('breakfast')) return '🍳'
  if (n.includes('side') || n.includes('chip') || n.includes('fries')) return '🍟'
  return '🍽'
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  
  try {
    const { url, merchantId } = await request.json()
    
    if (!url || !merchantId) {
      return NextResponse.json({ error: 'URL and merchantId required' }, { status: 400 })
    }
    
    // Normalize URL
    const baseUrl = url.replace(/\/$/, '')
    const slug = baseUrl.split('/').pop() || ''
    
    // Fetch main page
    const mainHtml = await fetchPage(baseUrl)
    
    // Extract restaurant name
    const nameMatch = mainHtml.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/)
    const restaurantName = nameMatch ? nameMatch[1].trim() : slug
    
    // Extract cuisine types
    const cuisineMatch = mainHtml.match(/guernsey-takeaway[^"]*">([^<]+)<\/a>/g)
    const cuisines = cuisineMatch ? cuisineMatch.map(m => m.replace(/.*">([^<]+)<\/a>/, '$1')).join(', ') : ''
    
    // Extract parish
    let parish = 'St Peter Port'
    const parishes = ['St Martin', 'St Peter Port', 'St Sampson', 'Vale', 'Castel', 'Forest', 'St Saviour', 'Torteval', 'St Pierre du Bois', 'St Andrew']
    for (const p of parishes) {
      if (mainHtml.includes(p)) { parish = p; break }
    }
    
    // Extract menu section URLs
    const menuSectionRegex = /href="(https:\/\/www\.food\.gg\/[^/]+\/menu\/\d+)[^"]*"/g
    const sectionUrls: string[] = [baseUrl]
    let sectionMatch
    const seen = new Set<string>()
    seen.add(baseUrl)
    
    while ((sectionMatch = menuSectionRegex.exec(mainHtml)) !== null) {
      const sectionUrl = sectionMatch[1]
      if (!seen.has(sectionUrl)) {
        seen.add(sectionUrl)
        sectionUrls.push(sectionUrl)
      }
    }
    
    // Extract category names from nav
    const categoryNavRegex = /menu\/(\d+)[^"]*"[^>]*>\s*([^<]+)\s*<\/a>/g
    const categoryMap: Record<string, string> = {}
    let catMatch
    while ((catMatch = categoryNavRegex.exec(mainHtml)) !== null) {
      categoryMap[catMatch[1]] = catMatch[2].trim()
    }
    
    // Create restaurant
    const restaurantSlug = slug + '-gg'
    
    const { data: existing } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single()
    if (existing) {
      return NextResponse.json({ error: 'Restaurant with this slug already exists: ' + restaurantSlug }, { status: 400 })
    }
    
    const { data: restaurant, error: restError } = await supabase.from('restaurants').insert({
      merchant_id: merchantId,
      name: restaurantName,
      slug: restaurantSlug,
      cuisine_type: cuisines,
      emoji: '🍽',
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
    
    // Fetch each section and extract items
    for (const sectionUrl of sectionUrls) {
      const html = await fetchPage(sectionUrl)
      
      // Get category name
      let categoryName = 'Menu'
      const h2Match = html.match(/<h2[^>]*>\s*([^<]+)\s*<\/h2>/)
      if (h2Match) categoryName = h2Match[1].trim()
      
      // Skip if it says "Menu" generically  
      if (categoryName === 'Menu') continue
      
      // Also look for subsections (h3)
      const subsectionRegex = /<h3[^>]*>\s*([^<]+)\s*<\/h3>([\s\S]*?)(?=<h3|<\/table|$)/gi
      const hasSubsections = html.includes('<h3')
      
      if (hasSubsections) {
        let subMatch
        while ((subMatch = subsectionRegex.exec(html)) !== null) {
          const subName = subMatch[1].trim()
          const subHtml = subMatch[2]
          const items = parseItems(subHtml)
          
          if (items.length > 0) {
            const { data: cat } = await supabase.from('menu_categories').insert({
              restaurant_id: restaurantId,
              name: subName,
              sort_order: totalCategories + 1,
              is_active: true,
            }).select().single()
            
            if (cat) {
              totalCategories++
              for (const item of items) {
                await supabase.from('menu_items').insert({
                  restaurant_id: restaurantId,
                  category_id: cat.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  emoji: getEmoji(subName, item.name),
                  is_available: true,
                  tags: item.tags,
                  allergens: [],
                })
                totalItems++
              }
            }
          }
        }
      } else {
        const items = parseItems(html)
        
        if (items.length > 0) {
          const { data: cat } = await supabase.from('menu_categories').insert({
            restaurant_id: restaurantId,
            name: categoryName,
            sort_order: totalCategories + 1,
            is_active: true,
          }).select().single()
          
          if (cat) {
            totalCategories++
            for (const item of items) {
              await supabase.from('menu_items').insert({
                restaurant_id: restaurantId,
                category_id: cat.id,
                name: item.name,
                description: item.description,
                price: item.price,
                emoji: getEmoji(categoryName, item.name),
                is_available: true,
                tags: item.tags,
                allergens: [],
              })
              totalItems++
            }
          }
        }
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
