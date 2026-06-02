import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
  })
  return res.text()
}

function cleanText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
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
  if (n.includes('beer') || n.includes('wine') || n.includes('alcohol') || n.includes('spirit') || n.includes('alcopop')) return '🍺'
  if (n.includes('wrap')) return '🌯'
  if (n.includes('steak') || n.includes('grill')) return '🥩'
  if (n.includes('garlic bread') || n.includes('bread') || n.includes('baguette') || n.includes('panini')) return '🥖'
  if (n.includes('wing')) return '🍗'
  if (n.includes('spring roll')) return '🥟'
  if (n.includes('mushroom')) return '🍄'
  if (n.includes('nacho')) return '🫔'
  if (n.includes('curry') || n.includes('korma') || n.includes('tikka') || n.includes('masala')) return '🍛'
  if (n.includes('noodle') || n.includes('chow mein') || n.includes('rice')) return '🍜'
  if (n.includes('breakfast') || n.includes('egg')) return '🍳'
  if (n.includes('chip') || n.includes('fries') || n.includes('side')) return '🍟'
  if (n.includes('kebab') || n.includes('doner') || n.includes('shish')) return '🌮'
  if (n.includes('children') || n.includes('kids')) return '🧒'
  if (n.includes('snack')) return '🍿'
  return '🍽'
}

interface MenuItem { name: string; description: string; price: number; tags: string[] }

function splitNameDesc(rawHtml: string, fullText: string): { name: string; desc: string } {
  // First try: look for <strong> or <b> tag for the name
  const boldMatch = rawHtml.match(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/i)
  if (boldMatch) {
    const name = cleanText(boldMatch[1]).replace(/\s*(Vegetarian|Vegan|Spicy|Contains Nuts)\s*/gi, ' ').trim()
    const desc = fullText.replace(name, '').replace(/\s*(Vegetarian|Vegan|Spicy|Contains Nuts)\s*/gi, ' ').trim()
    if (name && name.length > 1) return { name, desc }
  }

  // Second try: food.gg often wraps item name in <a> tag
  const linkMatch = rawHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
  if (linkMatch) {
    const name = cleanText(linkMatch[1]).replace(/\s*(Vegetarian|Vegan|Spicy|Contains Nuts)\s*/gi, ' ').trim()
    if (name && name.length > 1 && !name.includes('Add to basket')) {
      const desc = fullText.replace(name, '').replace(/\s*(Vegetarian|Vegan|Spicy|Contains Nuts)\s*/gi, ' ').trim()
      return { name, desc }
    }
  }

  // Third try: split on common description-starting words
  const clean = fullText.replace(/\s*(Vegetarian|Vegan|Spicy|Contains Nuts)\s*/gi, ' ').trim()
  const descWords = ['with', 'in', 'served', 'topped', 'a ', 'an ', 'the ', 'fresh', 'our', 'homemade', 'made', 'seasonal', 'traditional', 'classic', 'rich', 'creamy', 'spicy', 'crispy']
  const words = clean.split(' ')
  let splitAt = words.length

  for (let i = 1; i < words.length; i++) {
    const w = words[i].toLowerCase()
    // Split if word starts lowercase (after uppercase start)
    if (words[i].length > 1 && words[i][0] === words[i][0].toLowerCase() && words[i][0] !== words[i][0].toUpperCase() && !/^\d/.test(words[i])) {
      splitAt = i
      break
    }
    // Split on description keywords
    if (descWords.some(dw => w === dw.trim() || w.startsWith(dw.trim() + ' '))) {
      splitAt = i
      break
    }
  }

  return {
    name: words.slice(0, splitAt).join(' ').trim(),
    desc: words.slice(splitAt).join(' ').trim()
  }
}

function parseItems(html: string): MenuItem[] {
  const items: MenuItem[] = []
  const rows = html.split(/<tr[\s>]/i)

  let currentName = ''
  let currentDesc = ''
  let currentTags: string[] = []

  for (const row of rows) {
    if (row.includes('<th')) continue

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

    if (!hasBasket && !priceMatch) {
      // Name/description row - no price
      if (firstText && firstText.length > 1 && firstText !== 'Price' && !firstText.match(/^[£\d]/)) {
        const tags: string[] = []
        const allText = cleanText(row)
        if (allText.includes('Vegan')) { tags.push('veg'); tags.push('vegan') }
        else if (allText.includes('Vegetarian')) tags.push('veg')
        if (allText.toLowerCase().includes('spicy') || allText.toLowerCase().includes('chilli')) tags.push('spicy')

        const { name, desc } = splitNameDesc(tds[0], firstText)
        currentName = name
        currentDesc = desc
        currentTags = tags
      }
      continue
    }

    if (!priceMatch) continue
    const price = parseFloat(priceMatch[1])
    if (price <= 0 || price >= 500) continue

    // Check all cells for size/variant info
    // Could be: [size, price] or [variant, size, price] or [name+size, price]
    const allCellTexts = tds.slice(0, -1).map(t => cleanText(t)).filter(t => t.length > 0)
    const sizePattern = /^\d+"$|^\d+"|^Small$|^Medium$|^Large$|^Regular$|^\d+$|^\d+ piece$/i

    if (currentName) {
      if (allCellTexts.length === 0 || (allCellTexts.length === 1 && allCellTexts[0] === '')) {
        // No variant - just the item with a price
        items.push({ name: currentName, description: currentDesc, price, tags: [...currentTags] })
        currentName = ''; currentDesc = ''; currentTags = []
      } else if (allCellTexts.length === 1) {
        const cell = allCellTexts[0]
        if (sizePattern.test(cell)) {
          // Size variant: "Margherita 10""
          items.push({ name: `${currentName} ${cell}`, description: currentDesc, price, tags: [...currentTags] })
        } else {
          // Flavour/type variant: "Chicken Tikka - Chicken"
          items.push({ name: `${currentName} - ${cell}`, description: currentDesc, price, tags: [...currentTags] })
        }
      } else {
        // Multiple cells: could be variant + size e.g. ["Chicken", "10""]
        const sizePart = allCellTexts.find(t => sizePattern.test(t)) || ''
        const variantPart = allCellTexts.find(t => !sizePattern.test(t)) || ''
        let itemName = currentName
        if (variantPart) itemName += ` - ${variantPart}`
        if (sizePart) itemName += ` ${sizePart}`
        items.push({ name: itemName.trim(), description: currentDesc, price, tags: [...currentTags] })
      }
    } else if (firstText && firstText.length > 1) {
      // Single-row item with name and price on same row
      const tags: string[] = []
      if (firstText.includes('Vegan')) { tags.push('veg'); tags.push('vegan') }
      else if (firstText.includes('Vegetarian')) tags.push('veg')
      if (firstText.toLowerCase().includes('spicy')) tags.push('spicy')
      const { name, desc } = splitNameDesc(tds[0], firstText)
      items.push({ name, description: desc, price, tags })
    }
  }

  return items
}

function getCategoryName(html: string): string {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (titleMatch) {
    const parts = titleMatch[1].split(' - ')
    if (parts.length >= 2) {
      const catPart = parts[1].trim()
      if (catPart && !catPart.includes('Food.gg') && !catPart.toLowerCase().includes('menu')) return catPart
    }
  }
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
    if (!url || !merchantId) return NextResponse.json({ error: 'URL and merchantId required' }, { status: 400 })

    const baseUrl = url.replace(/\/$/, '').replace(/#.*$/, '')
    const slug = baseUrl.split('/').pop() || ''

    const mainHtml = await fetchPage(baseUrl)

    const nameMatch = mainHtml.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/)
    const restaurantName = nameMatch ? nameMatch[1].trim() : slug.replace(/-/g, ' ')

    const cuisines: string[] = []
    const cuisineRegex = /guernsey-takeaway\/[^"]+">([^<]+)<\/a>/g
    let cm
    while ((cm = cuisineRegex.exec(mainHtml)) !== null) {
      if (!cm[1].includes('Food') && cm[1].length < 30) cuisines.push(cm[1].trim())
    }

    let parish = 'St Peter Port'
    for (const p of ['St Martin','St Peter Port','St Sampson','Vale','Castel','Forest','St Saviour','Torteval','St Pierre du Bois','St Andrew']) {
      if (mainHtml.includes(p)) { parish = p; break }
    }

    // Extract section URLs
    const sectionUrls: string[] = []
    const seen = new Set<string>()
    const menuNumRegex = /\/menu\/(\d+)/g
    let mu
    while ((mu = menuNumRegex.exec(mainHtml)) !== null) {
      const secUrl = `https://www.food.gg/${slug}/menu/${mu[1]}`
      if (!seen.has(secUrl)) { seen.add(secUrl); sectionUrls.push(secUrl) }
    }

    // Check not already imported
    const restaurantSlug = slug + '-gg'
    const { data: existing } = await supabase.from('restaurants').select('id').eq('slug', restaurantSlug).single()
    if (existing) return NextResponse.json({ error: 'Already imported: ' + restaurantSlug }, { status: 400 })

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

    if (restError || !restaurant) return NextResponse.json({ error: 'Failed: ' + restError?.message }, { status: 500 })

    const restaurantId = restaurant.id
    let totalItems = 0
    let totalCategories = 0

    async function saveCategory(name: string, items: MenuItem[]) {
      if (items.length === 0 || !name) return
      const catName = name === 'Menu' ? 'Menu Items' : name
      const { data: cat } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId, name: catName,
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

    // Main page - check for h3 subsections
    if (mainHtml.includes('<h3')) {
      const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<h2|$)/gi
      let h3Match
      while ((h3Match = h3Regex.exec(mainHtml)) !== null) {
        const subName = cleanText(h3Match[1])
        if (subName && subName.length > 1) {
          await saveCategory(subName, parseItems(h3Match[2]))
        }
      }
    } else {
      const mainCat = getCategoryName(mainHtml)
      await saveCategory(mainCat, parseItems(mainHtml))
    }

    // Each section page - fetch ALL with no skipping
    for (const secUrl of sectionUrls) {
      try {
        const secHtml = await fetchPage(secUrl)
        // Check for h3 subsections within section
        if (secHtml.includes('<h3')) {
          const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<h2|$)/gi
          let h3Match
          let foundSub = false
          while ((h3Match = h3Regex.exec(secHtml)) !== null) {
            const subName = cleanText(h3Match[1])
            if (subName && subName.length > 1) {
              foundSub = true
              await saveCategory(subName, parseItems(h3Match[2]))
            }
          }
          if (!foundSub) {
            const catName = getCategoryName(secHtml)
            await saveCategory(catName, parseItems(secHtml))
          }
        } else {
          const catName = getCategoryName(secHtml)
          await saveCategory(catName, parseItems(secHtml))
        }
      } catch (e) { /* skip failed sections */ }
    }

    return NextResponse.json({
      success: true, restaurantId, restaurantName,
      categories: totalCategories, items: totalItems,
      sectionsFound: sectionUrls.length,
      message: `Imported ${restaurantName} with ${totalCategories} categories and ${totalItems} menu items!`,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
