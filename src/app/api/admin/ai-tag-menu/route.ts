import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Allergen keyword detection
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten: ['bread','bun','baguette','wrap','pasta','pizza','dough','flour','pastry','batter','crumb','breadcrumb','panini','naan','pita','pitta','tortilla','calzone','stromboli','crouton','wafer','biscuit','cake','muffin','scone','dumpling','spring roll','wonton','coating','breaded','crispy','crunchy','fried chicken','fish finger','chicken strip','chicken tender','onion ring','samosa','pakora'],
  dairy: ['cheese','cream','milk','butter','yogurt','yoghurt','mozzarella','cheddar','brie','camembert','parmesan','ricotta','bechamel','white sauce','cheese sauce','creamy','dairy','ghee','custard','ice cream','cheesecake','tiramisu'],
  eggs: ['egg','omelette','omelet','frittata','quiche','mayonnaise','mayo','aioli','hollandaise','meringue','scrambled','poached egg','fried egg','boiled egg'],
  nuts: ['almond','walnut','cashew','pistachio','pecan','hazelnut','macadamia','pine nut','mixed nuts','nut'],
  peanuts: ['peanut','satay','pad thai','kung pao'],
  fish: ['fish','cod','haddock','salmon','tuna','sea bass','mackerel','trout','tilapia','anchov','sardine','whitebait','fish cake','fish finger','calamari','squid'],
  shellfish: ['prawn','shrimp','crab','lobster','langoustine','scallop','mussel','oyster','clam','crawfish','crayfish'],
  celery: ['celery','celeriac'],
  mustard: ['mustard'],
  sesame: ['sesame','tahini','hummus','houmous'],
  sulphites: ['wine','vinegar','dried fruit','pickle','pickled'],
  soy: ['soy','soya','tofu','edamame','miso','teriyaki','sushi'],
  molluscs: ['squid','octopus','mussel','oyster','clam','scallop','snail','abalone'],
}

// Calorie estimates per food type
const CALORIE_ESTIMATES: Array<{ keywords: string[], calories: number }> = [
  { keywords: ['salad'], calories: 150 },
  { keywords: ['soup'], calories: 200 },
  { keywords: ['side salad'], calories: 80 },
  { keywords: ['coleslaw'], calories: 120 },
  { keywords: ['garlic bread'], calories: 280 },
  { keywords: ['bread','baguette','roll'], calories: 250 },
  { keywords: ['spring roll'], calories: 180 },
  { keywords: ['chicken wing','wings'], calories: 420 },
  { keywords: ['chicken nugget','chicken strip','chicken tender','chicken goujons'], calories: 380 },
  { keywords: ['chicken tikka','tikka masala'], calories: 480 },
  { keywords: ['chicken burger'], calories: 520 },
  { keywords: ['chicken'], calories: 420 },
  { keywords: ['fish and chips','fish & chips'], calories: 800 },
  { keywords: ['fish cake'], calories: 320 },
  { keywords: ['fish finger'], calories: 280 },
  { keywords: ['fish'], calories: 380 },
  { keywords: ['prawn','shrimp'], calories: 200 },
  { keywords: ['steak'], calories: 650 },
  { keywords: ['mixed grill'], calories: 900 },
  { keywords: ['burger'], calories: 600 },
  { keywords: ['hot dog'], calories: 380 },
  { keywords: ['pizza 9'], calories: 700 },
  { keywords: ['pizza 12'], calories: 1100 },
  { keywords: ['pizza 14'], calories: 1400 },
  { keywords: ['pizza'], calories: 900 },
  { keywords: ['pasta','spaghetti','linguine','penne','tagliatelle','fettuccine'], calories: 520 },
  { keywords: ['lasagne','lasagna'], calories: 580 },
  { keywords: ['risotto'], calories: 480 },
  { keywords: ['curry','korma','tikka','masala','biryani','balti'], calories: 550 },
  { keywords: ['naan'], calories: 280 },
  { keywords: ['rice'], calories: 280 },
  { keywords: ['chips','fries'], calories: 380 },
  { keywords: ['jacket potato','baked potato'], calories: 320 },
  { keywords: ['potato skin'], calories: 280 },
  { keywords: ['nachos'], calories: 450 },
  { keywords: ['wrap'], calories: 480 },
  { keywords: ['sandwich','sub'], calories: 420 },
  { keywords: ['panini'], calories: 380 },
  { keywords: ['kebab','doner'], calories: 580 },
  { keywords: ['shish'], calories: 420 },
  { keywords: ['lamb'], calories: 520 },
  { keywords: ['pork'], calories: 480 },
  { keywords: ['sausage'], calories: 380 },
  { keywords: ['bacon'], calories: 300 },
  { keywords: ['duck'], calories: 480 },
  { keywords: ['mushroom'], calories: 80 },
  { keywords: ['onion ring'], calories: 320 },
  { keywords: ['mozzarella stick'], calories: 350 },
  { keywords: ['brie','camembert'], calories: 280 },
  { keywords: ['ice cream','gelato'], calories: 280 },
  { keywords: ['cheesecake'], calories: 420 },
  { keywords: ['cake','brownie','muffin'], calories: 380 },
  { keywords: ['waffle'], calories: 350 },
  { keywords: ['pancake'], calories: 300 },
  { keywords: ['tiramisu'], calories: 380 },
  { keywords: ['profiterole'], calories: 320 },
  { keywords: ['sorbet'], calories: 150 },
  { keywords: ['fruit salad'], calories: 120 },
  { keywords: ['dessert'], calories: 350 },
  { keywords: ['kids','children'], calories: 350 },
  { keywords: ['breakfast'], calories: 650 },
  { keywords: ['full english'], calories: 850 },
  { keywords: ['smoothie'], calories: 200 },
  { keywords: ['juice'], calories: 120 },
  { keywords: ['milkshake'], calories: 380 },
  { keywords: ['soft drink','cola','lemonade'], calories: 140 },
  { keywords: ['water'], calories: 0 },
  { keywords: ['beer','lager','ale'], calories: 180 },
  { keywords: ['wine'], calories: 160 },
  { keywords: ['spirit','vodka','gin','rum','whisky'], calories: 100 },
  { keywords: ['cocktail'], calories: 220 },
]

function detectAllergens(name: string, description: string): string[] {
  const text = (name + ' ' + (description || '')).toLowerCase()
  const found: string[] = []
  for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        found.push(allergen)
        break
      }
    }
  }
  return [...new Set(found)]
}

function estimateCalories(name: string, description: string): number | null {
  const text = (name + ' ' + (description || '')).toLowerCase()
  for (const entry of CALORIE_ESTIMATES) {
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) {
        return entry.calories
      }
    }
  }
  return null
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

    for (const item of items) {
      const allergens = detectAllergens(item.name, item.description || '')
      const calories = estimateCalories(item.name, item.description || '')
      await supabase.from('menu_items').update({ allergens, calories }).eq('id', item.id)
      tagged++
    }

    return NextResponse.json({
      success: true,
      tagged,
      total: items.length,
      message: `Tagged ${tagged} items with allergens and calorie estimates!`
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
