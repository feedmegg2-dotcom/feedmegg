import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const ALLERGENS = ['gluten','dairy','eggs','nuts','peanuts','soy','fish','shellfish','celery','mustard','sesame','sulphites','lupin','molluscs']

async function tagItem(name: string, description: string): Promise<{ allergens: string[], calories: number | null }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are a food allergen and nutrition expert. For this menu item, return ONLY a JSON object with no other text.

Item: ${name}
Description: ${description || 'No description'}

Return exactly this format:
{"allergens":["gluten","dairy"],"calories":450}

Allergens to check (only include if likely present): gluten, dairy, eggs, nuts, peanuts, soy, fish, shellfish, celery, mustard, sesame, sulphites, lupin, molluscs

For calories, always provide a number estimate based on typical restaurant portion size. Never use null - always give your best estimate as a number.
Return ONLY the JSON object, nothing else.`
        }]
      })
    })
    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return {
      allergens: (parsed.allergens || []).filter((a: string) => ALLERGENS.includes(a.toLowerCase())),
      calories: parsed.calories ? parseInt(String(parsed.calories)) : null
    }
  } catch (e) {
    return { allergens: [], calories: null }
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const { restaurantId } = await request.json()
    if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })

    const { data: items } = await supabase
      .from('menu_items')
      .select('id, name, description')
      .eq('restaurant_id', restaurantId)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items found' }, { status: 404 })
    }

    let tagged = 0
    let failed = 0

    for (const item of items) {
      try {
        const { allergens, calories } = await tagItem(item.name, item.description || '')
        await supabase.from('menu_items').update({ allergens, calories }).eq('id', item.id)
        tagged++
      } catch (e) {
        failed++
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100))
    }

    return NextResponse.json({
      success: true,
      tagged,
      failed,
      total: items.length,
      message: `AI tagged ${tagged} of ${items.length} items with allergens and calories!`
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
