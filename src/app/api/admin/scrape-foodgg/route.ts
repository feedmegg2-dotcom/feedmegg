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
  if (n.includes('cake') || n.includes('dessert') || n.includes('ice cream') || n.includes('waffle')) return '🍰'
  if (n.includes('soft drink') || n.includes('cola') || n.includes('juice') || n.includes('water')) return '🥤'
  if (n.includes('beer') || n.includes('wine') || n.includes('alcohol') || n.includes('spirit')) return '🍺'
  if (n.includes('wrap')) return '🌯'
  if (n.includes('steak') || n.includes('mixed grill')) return '🥩'
  if (n.includes('garlic bread') || n.includes('bread') || n.includes('naan')) return '🥖'
  if (n.includes('wing')) return '🍗'
  if (n.includes('spring roll') || n.includes('dumpling')) return '🥟'
  if (n.includes('mushroom')) return '🍄'
  if (n.includes('nacho')) return '🫔'
  if (n.includes('curry') || n.includes('korma') || n.includes('tikka') || n.includes('masala')) return '🍛'
  if (n.includes('noodle') || n.includes('chow mein') || n.includes('rice')) return '🍜'
  if (n.includes('breakfast') || n.includes('egg')) return '🍳'
  if (n.includes('chip') || n.includes('fries') || n.includes('side')) return '🍟'
  if (n.includes('kebab') || n.includes('doner')) return '🌮'
  if (n.includes('sandwich') || n.includes('sub') || n.includes('baguette')) return '🥪'
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

function parsePageItems(html: string, categoryName: string): MenuItem[] {
  const items: MenuItem[] = []
  
  // Find the main table
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i)
  if (!tableMatch) return items
  
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
    const lastHtml = cells[cells.length - 1]
    const lastText = cleanText(lastHtml)
    
    const hasBasket = lastHtml.includes('Add to basket')
    const priceMatch = lastHtml.match(/£([\d.]+)/)
    
    if (!hasBasket && !priceMatch) {
      // Item name row
      if (firstText && firstText.length > 1 && firstText !== 'Price') {
        const tags: string[] = []
        if (row.toLowerCase().includes('vegetarian') || firstText.toLowerCase().includes('vegetarian')) tags.push('veg')
        if (row.toLowerCase().includes('vegan') || firstText.toLowerCase().includes('vegan')) { tags.push('veg'); tags.push('vegan') }
        if (row.toLowerCase().includes('spicy') || firstText.toLowerCase().includes('spicy')) tags.push('spicy')
        
        // Split first line (name) from rest (description)
        const parts = firstText.split(/\s{3,}/)
        currentName = parts[0].replace(/Vegetarian|Vegan|Spicy|Contains Nuts/gi, '').trim()
        currentDesc = parts.slice(1).join(' ').replace(/Vegetarian|Vegan|Spicy|Contains Nuts/gi, '').trim()
        currentTags = tags
      }
      continue
    }
    
    if (!priceMatch) continue
    const price = parseFloat(priceMatch[1])
    if (price <= 0 || price >= 500) continue
    
    // Check if firstText is a size indicator
    const isSize = firstText.match(/^\d+"$|^Small$|^Medium$|^Large$|^Regular$|^\d+$/i)
    
    if (currentName && isSize) {
      items.push({
        name: `${currentName} ${firstText}`,
        description: currentDesc,
        price,
        tags: [...currentTags],
      })
    } else if (currentName && (firstText === '' || firstText === currentName)) {
      items.push({
        name: currentName,
        description: currentDesc,
        price,
        tags: [...currentTags],
      })
      currentName = ''
      currentDesc = ''
      currentTags = []
    } else if (firstText && firstText.length > 1) {
      // Single-row item
      const tags: string[] = []
      if (firstText.toLowerCase().includes('vegetarian')) tags.push('veg')
      if (firstText.toLowerCase().includes('vegan')) { tags.push('veg'); tags.push('vegan') }
      if (firstText.toLowerCase().includes('spicy')) tags.push('spicy')
      
      items.push({
        name: firstText.replace(/Vegetarian|Vegan|Spicy|Contains Nuts/gi, '').trim(),
        description: '',
        price,
        tags,
      })
    }
  }
  
  return items
}

function extractCategoryName(html: string): string {
  const h2 = html.match(/<h2[^>]*>\s*([^<]+)\s*<\/h2>/i)
  if (h2) {
    const name = cleanText(h2[1])
    if (name && !['menu', 'your order', 'order'].includes(name.toLowerCase())) return name
  }
  const h3 = html.match(/<h3[^>]*>\s*([^<]+)\s*<\/h3>/i)
  if (h3) return cleanText(h3[1])
  return ''
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

    // Fetch main page
    const mainHtml = await fetchPage(baseUrl)

    // Extract restaurant name
    const nameMatch = mainHtml.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/)
    const restaurantName = nameMatch ? nameMatch[1].trim() : slug.replace(/-/g, ' ')

    // Extract cuisines
    const cuisines: string[] = []
    const cuisineRegex = /guernsey-takeaway\/[^"]+">([^<]+)<\/a>/g
    let cm
    while ((cm = cuisineRegex.exec(mainHtml)) !== null) {
      if (!cm[1].includes('Food') && cm[1].length < 30) cuisines.push(cm[1].trim())
    }

    // Extract parish
    let parish = 'St Peter Port'
    for (const p of ['St Martin','St Peter Port','St Sampson','Vale','Castel','Forest','St Saviour','Torteval','St Pierre du Bois','St Andrew']) {
      if (mainHtml.includes(p)) { parish = p; break }
    }

    // Extract ALL menu section URLs from nav - strip #menu anchors
    const sectionUrls: string[] = []
    const navRegex = /href="(https:\/\/www\.food\.gg\/[^"#]+\/menu\/\d+)[^"]*"/g
    let nm
    const seen = new Set<string>()
    
    while ((nm = navRegex.exec(mainHtml)) !== null) {
      const secUrl = nm[1]
      if (!seen.has(secUrl)) {
        seen.add(secUrl)
        sectionUrls.push(secUrl)
      }
    }

    // Check slug doesn't already exist
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

    // Parse main page (Pizzas section)
    const mainCatName = extractCategoryName(mainHtml) || 'Pizzas'
    const mainItems = parsePageItems(mainHtml, mainCatName)
    if (mainItems.length > 0) {
      const { data: cat } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name: mainCatName,
        sort_order: totalCategories + 1,
        is_active: true,
      }).select().single()
      if (cat) {
        totalCategories++
        for (const item of mainItems) {
          await supabase.from('menu_items').insert({
            restaurant_id: restaurantId,
            category_id: cat.id,
            name: item.name,
            description: item.description,
            price: item.price,
            emoji: getEmoji(mainCatName + ' ' + item.name),
            is_available: true,
            tags: item.tags,
            allergens: [],
          })
          totalItems++
        }
      }
    }

    // Parse each section page
    for (const secUrl of sectionUrls) {
      try {
        const secHtml = await fetchPage(secUrl)
        const catName = extractCategoryName(secHtml)
        if (!catName) continue
        
        const items = parsePageItems(secHtml, catName)
        if (items.length === 0) continue

        const { data: cat } = await supabase.from('menu_categories').insert({
          restaurant_id: restaurantId,
          name: catName,
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
              emoji: getEmoji(catName + ' ' + item.name),
              is_available: true,
              tags: item.tags,
              allergens: [],
            })
            totalItems++
          }
        }
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
