// =============================================
// food.gg Menu Scraper
// Syncs restaurant menus from food.gg
// =============================================

interface ScrapedItem {
  name: string
  description: string
  price: number
  category: string
  isAvailable: boolean
  foodggId: string
}

interface ScrapedMenu {
  restaurantName: string
  items: ScrapedItem[]
  scrapedAt: string
}

// Full menu scrape (run once on signup, then every 6 hours for changes)
export async function scrapeFullMenu(foodggUrl: string): Promise<ScrapedMenu | null> {
  try {
    // In production this would use a headless browser or parsing library
    // to scrape the food.gg restaurant page
    // For now we simulate the structure
    
    const response = await fetch(foodggUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; feedme.gg menu sync)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch food.gg page: ${response.status}`)
    }
    
    const html = await response.text()
    
    // Parse the HTML to extract menu items
    // food.gg uses structured data that we can extract
    const items = parseMenuFromHTML(html)
    
    return {
      restaurantName: extractRestaurantName(html),
      items,
      scrapedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('food.gg scrape failed:', error)
    return null
  }
}

// Check just availability (run every 2 minutes)
export async function checkAvailability(foodggUrl: string): Promise<Map<string, boolean>> {
  const availability = new Map<string, boolean>()
  
  try {
    const response = await fetch(foodggUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; feedme.gg availability sync)',
      },
    })
    
    if (!response.ok) return availability
    
    const html = await response.text()
    
    // Extract just availability status for each item
    // food.gg marks unavailable items with specific CSS classes
    const items = parseAvailabilityFromHTML(html)
    items.forEach(item => {
      availability.set(item.foodggId, item.isAvailable)
    })
    
  } catch (error) {
    console.error('food.gg availability check failed:', error)
  }
  
  return availability
}

// Parse full menu from HTML
function parseMenuFromHTML(html: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  
  // In production: use cheerio or similar to parse the HTML
  // food.gg uses JSON-LD structured data that's easy to extract
  
  // Extract JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[0].replace(/<script[^>]*>|<\/script>/g, ''))
      if (jsonLd['@type'] === 'Restaurant' && jsonLd.hasMenu) {
        // Parse menu sections
        const menu = jsonLd.hasMenu
        if (menu.hasMenuSection) {
          menu.hasMenuSection.forEach((section: any) => {
            section.hasMenuItem?.forEach((item: any) => {
              items.push({
                name: item.name || '',
                description: item.description || '',
                price: parseFloat(item.offers?.price || '0'),
                category: section.name || 'Menu',
                isAvailable: item.offers?.availability !== 'https://schema.org/OutOfStock',
                foodggId: item['@id'] || item.name,
              })
            })
          })
        }
      }
    } catch {}
  }
  
  return items
}

// Parse just availability from HTML
function parseAvailabilityFromHTML(html: string): { foodggId: string; isAvailable: boolean }[] {
  const availability: { foodggId: string; isAvailable: boolean }[] = []
  
  // Look for items marked as unavailable/sold out
  // food.gg typically uses data attributes or specific classes
  const unavailablePattern = /data-item-id="([^"]+)"[^>]*class="[^"]*unavailable[^"]*"/g
  let match
  
  while ((match = unavailablePattern.exec(html)) !== null) {
    availability.push({ foodggId: match[1], isAvailable: false })
  }
  
  return availability
}

// Extract restaurant name from HTML
function extractRestaurantName(html: string): string {
  const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
  return match ? match[1].trim() : 'Unknown Restaurant'
}

// Sync scraped menu into our database
export async function syncMenuToDatabase(
  restaurantId: string,
  scrapedMenu: ScrapedMenu,
  supabase: any
) {
  // Group items by category
  const categories = new Map<string, ScrapedItem[]>()
  scrapedMenu.items.forEach(item => {
    if (!categories.has(item.category)) categories.set(item.category, [])
    categories.get(item.category)!.push(item)
  })

  // For each category
  let sortOrder = 0
  for (const [categoryName, items] of categories) {
    // Upsert category
    const { data: category } = await supabase
      .from('menu_categories')
      .upsert({ restaurant_id: restaurantId, name: categoryName, sort_order: sortOrder++ })
      .select()
      .single()

    if (!category) continue

    // Upsert items
    for (const item of items) {
      await supabase.from('menu_items').upsert({
        category_id: category.id,
        restaurant_id: restaurantId,
        name: item.name,
        description: item.description,
        price: item.price,
        is_available: item.isAvailable,
        foodgg_id: item.foodggId,
      }, { onConflict: 'restaurant_id,foodgg_id' })
    }
  }
  
  // Update last sync time
  await supabase
    .from('restaurants')
    .update({ foodgg_last_sync: new Date().toISOString() })
    .eq('id', restaurantId)
}

// Update availability only (lightweight sync every 2 mins)
export async function syncAvailabilityToDatabase(
  restaurantId: string,
  availability: Map<string, boolean>,
  supabase: any
) {
  for (const [foodggId, isAvailable] of availability) {
    await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('restaurant_id', restaurantId)
      .eq('foodgg_id', foodggId)
  }
}
