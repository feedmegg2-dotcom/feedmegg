import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { scrapeFullMenu, checkAvailability, syncMenuToDatabase, syncAvailabilityToDatabase } from '@/lib/foodgg-scraper'

// POST /api/restaurants/sync
// Called by Vercel cron every 2 minutes
export async function POST(request: NextRequest) {
  // Verify this is coming from Vercel cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'availability' // 'availability' or 'full'

  // Get all restaurants with food.gg sync enabled
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, foodgg_url, foodgg_last_sync')
    .eq('foodgg_sync_enabled', true)
    .not('foodgg_url', 'is', null)

  if (!restaurants?.length) {
    return NextResponse.json({ message: 'No restaurants to sync' })
  }

  const results = []

  for (const restaurant of restaurants) {
    try {
      if (type === 'availability') {
        // Quick availability check (every 2 mins)
        const availability = await checkAvailability(restaurant.foodgg_url!)
        await syncAvailabilityToDatabase(restaurant.id, availability, supabase)
        results.push({ id: restaurant.id, name: restaurant.name, status: 'availability_synced', count: availability.size })
        
      } else if (type === 'full') {
        // Full menu sync (every 6 hours)
        const lastSync = restaurant.foodgg_last_sync 
          ? new Date(restaurant.foodgg_last_sync) 
          : new Date(0)
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
        
        if (lastSync < sixHoursAgo) {
          const menu = await scrapeFullMenu(restaurant.foodgg_url!)
          if (menu) {
            await syncMenuToDatabase(restaurant.id, menu, supabase)
            results.push({ id: restaurant.id, name: restaurant.name, status: 'full_sync', items: menu.items.length })
          }
        } else {
          results.push({ id: restaurant.id, name: restaurant.name, status: 'skipped', reason: 'synced recently' })
        }
      }
    } catch (error: any) {
      console.error(`Sync failed for ${restaurant.name}:`, error)
      results.push({ id: restaurant.id, name: restaurant.name, status: 'failed', error: error.message })
    }
  }

  return NextResponse.json({ success: true, synced: results.length, results })
}

// GET /api/restaurants/sync?restaurantId=xxx — manual sync trigger
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurantId')

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, foodgg_url')
    .eq('id', restaurantId)
    .single()

  if (!restaurant?.foodgg_url) {
    return NextResponse.json({ error: 'No food.gg URL configured' }, { status: 400 })
  }

  const menu = await scrapeFullMenu(restaurant.foodgg_url)
  if (!menu) {
    return NextResponse.json({ error: 'Failed to scrape food.gg menu' }, { status: 500 })
  }

  await syncMenuToDatabase(restaurant.id, menu, supabase)

  return NextResponse.json({
    success: true,
    itemsImported: menu.items.length,
    message: `Successfully imported ${menu.items.length} items from food.gg`,
  })
}
