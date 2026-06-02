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

interface MenuSection {
  name: string
  items: MenuItem[]
}

function parseSections(html: string): MenuSection[] {
  const sections: MenuSection[] = []

  // Split by h2 (main category) and h3 (subcategory)
  // First find all sections using h2/h3 headers
  const sectionRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>([\s\S]*?)(?=<h[23]|$)/gi
  let match

  while ((match = sectionRegex.exec(html)) !== null) {
    const sectionName = cleanText(match[1])
    const sectionContent = match[2]

    if (!sectionName || sectionName.toLowerCase().includes('order') || sectionName.toLowerCase() === 'menu') continue

    const items = parseItems(sectionContent)
    if (items.length > 0) {
      sections.push({ name: sectionName, items })
    }
  }

  return sections
}

function parseItems(html: string): MenuItem[] {
  const items: MenuItem[] = []
  
  // Find all table rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  let currentItem: { name: string; description: string; tags: string[] } | null = null

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1]
    if (rowHtml.includes('<th')) continue

    const cells: string[] = []
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let cellMatch

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1])
    }

    if (cells.length === 0) continue

    const firstCell = cleanText(cells[0])
    const lastCell = cleanText(cells[cells.length - 1])

    // Check if this is a price row (has Add to basket)
    const hasPrice = cells[cells.length - 1].includes('Add to basket') || lastCell.match(/£[\d.]+/)
    const priceMatch = cells[cells.length - 1].match(/£([\d.]+)/)

    if (!hasPrice || !priceMatch) {
      // This might be an item name row
      if (firstCell && firstCell.length > 1 && !firstCell.match(/^£/) && !firstCell.includes('Add to basket') && firstCell !== 'Price') {
        // Detect tags
        const tags: string[] = []
        if (rowHtml.toLowerCase().includes('vegetarian') || firstCell.toLowerCase().includes('vegetarian') || firstCell.toLowerCase().includes('vegan')) {
          if (firstCell.toLowerCase().includes('vegan')) tags.push('vegan')
          tags.push('veg')
        }
        if (firstCell.toLowerCase().includes('spicy') || rowHtml.toLowerCase().includes('spicy')) tags.push('spicy')

        // Split name from description
        const lines = firstCell.split(/\s{2,}/).filter(l => l.trim())
        const cleanName = lines[0]?.replace(/Vegetarian|Vegan|Spicy|Contains Nuts/g, '').trim() || firstCell
        const desc = lines.slice(1).join(' ').replace(/Vegetarian|Vegan|Spicy|Contains Nuts/g, '').trim()

        currentItem = { name: cleanName, description: desc, tags }
      }
      continue
    }

    const price = parseFloat(priceMatch[1])
    if (price <= 0 || price >= 200) continue

    if (currentItem) {
      // Size variant — append size to name
      const sizeName = firstCell && firstCell.match(/^\d+"|^Small|^Medium|^Large|^Regular/i)
        ? `${currentItem.name} ${firstCell}`
        : currentItem.name

      items.push({
        name: sizeName,
        description: currentItem.description,
        price,
        tags: currentItem.tags,
      })
    } else if (firstCell && firstCell.length > 1) {
      // Single row item with price
      const tags: string[] = []
      if (firstCell.toLowerCase().includes('vegan')) tags.push('vegan', 'veg')
      else if (firstCell.toLowerCase().includes('vegetarian')) tags.push('veg')
      if (firstCell.toLowerCase().includes('spicy')) tags.push('spicy')

      const cleanName = firstCell.replace(/Vegetarian|Vegan|Spicy|Contains Nuts/g, '').trim()

      items.push({
        name: cleanName,
        description: '',
        price,
        tags,
      })
    }
  }

  return items
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

    // Extract cuisine
    const cuisines: string[] = []
    const cuisineRegex = /guernsey-takeaway\/([^"]+)"[^>]*>([^<]+)<\/a>/g
    let cm
    while ((cm = cuisineRegex.exec(mainHtml)) !== null) {
      if (!cm[2].includes('Food.gg')) cuisines.push(cm[2].trim())
    }

    // Extract parish
    let parish = 'St Peter Port'
    const parishes = ['St Martin', 'St Peter Port', 'St Sampson', 'Vale', 'Castel', 'Forest', 'St Saviour', 'Torteval', 'St Pierre du Bois', 'St Andrew']
    for (const p of parishes) {
      if (mainHtml.includes(p)) { parish = p; break }
    }

    // Find all menu section URLs
    const sectionUrls: string[] = []
    const sectionNames: Record<string, string> = {}
    const sectionRegex2 = /href="(https:\/\/www\.food\.gg\/[^/]+\/menu\/(\d+))[^"#]*(?:#[^"]*)?"\s*>([^<]+)</g
    let sm
    const seen = new Set<string>([baseUrl])

    while ((sm = sectionRegex2.exec(mainHtml)) !== null) {
      const secUrl = sm[1]
      const secId = sm[2]
      const secName = sm[3].trim()
      if (!seen.has(secUrl)) {
        seen.add(secUrl)
        sectionUrls.push(secUrl)
        sectionNames[secId] = secName
      }
    }

    // Check if slug already exists
    const restaurantSlug = slug + '-gg'
    const { data: existing } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single()
    if (existing) {
      return NextResponse.json({ error: 'Restaurant already imported: ' + restaurantSlug }, { status: 400 })
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

    // Parse main page sections first
    const mainSections = parseSections(mainHtml)
    for (const section of mainSections) {
      if (section.items.length === 0) continue
      const { data: cat } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name: section.name,
        sort_order: totalCategories + 1,
        is_active: true,
      }).select().single()

      if (cat) {
        totalCategories++
        for (const item of section.items) {
          await supabase.from('menu_items').insert({
            restaurant_id: restaurantId,
            category_id: cat.id,
            name: item.name,
            description: item.description,
            price: item.price,
            emoji: getEmoji(section.name + ' ' + item.name),
            is_available: true,
            tags: item.tags,
            allergens: [],
          })
          totalItems++
        }
      }
    }

    // Fetch and parse each additional section
    for (const secUrl of sectionUrls) {
      const secHtml = await fetchPage(secUrl)
      const sections = parseSections(secHtml)

      for (const section of sections) {
        if (section.items.length === 0) continue
        const { data: cat } = await supabase.from('menu_categories').insert({
          restaurant_id: restaurantId,
          name: section.name,
          sort_order: totalCategories + 1,
          is_active: true,
        }).select().single()

        if (cat) {
          totalCategories++
          for (const item of section.items) {
            await supabase.from('menu_items').insert({
              restaurant_id: restaurantId,
              category_id: cat.id,
              name: item.name,
              description: item.description,
              price: item.price,
              emoji: getEmoji(section.name + ' ' + item.name),
              is_available: true,
              tags: item.tags,
              allergens: [],
            })
            totalItems++
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
