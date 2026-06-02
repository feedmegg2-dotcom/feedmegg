import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// ============================================================
// COMPREHENSIVE ALLERGEN DETECTION
// ============================================================

// Base allergens that are ALWAYS present for certain food types
// unless overridden by gluten-free/dairy-free/vegan indicators
const BASE_ALLERGENS: Array<{ keywords: string[], allergens: string[], overrides?: string[] }> = [
  // Pizza - always gluten + dairy unless specified
  { keywords: ['pizza'], allergens: ['gluten','dairy'], overrides: ['gluten free','gf','vegan'] },
  { keywords: ['vegan pizza'], allergens: ['gluten'] },
  { keywords: ['gluten free pizza'], allergens: ['dairy'] },
  // Pasta - always gluten, usually eggs, usually dairy
  { keywords: ['pasta','spaghetti','linguine','penne','tagliatelle','fettuccine','rigatoni','fusilli','farfalle','lasagne','lasagna'], allergens: ['gluten','eggs','dairy'] },
  // Bread based
  { keywords: ['burger','bun','sandwich','sub','baguette','panini','wrap','flatbread','focaccia','ciabatta','sourdough'], allergens: ['gluten'] },
  { keywords: ['naan','pitta','pita','chapati','roti'], allergens: ['gluten','dairy'] },
  { keywords: ['garlic bread'], allergens: ['gluten','dairy'] },
  { keywords: ['breadcrumb','breaded','crispy coated','battered'], allergens: ['gluten','eggs'] },
  // Pastry
  { keywords: ['pie','pastry','quiche','sausage roll','pasty'], allergens: ['gluten','dairy','eggs'] },
  { keywords: ['spring roll','spring rolls','samosa','samosas'], allergens: ['gluten'] },
  { keywords: ['dumpling','gyoza','wonton'], allergens: ['gluten','eggs'] },
  // Dairy based dishes
  { keywords: ['mac and cheese','mac & cheese','macaroni cheese'], allergens: ['gluten','dairy'] },
  { keywords: ['cheesecake'], allergens: ['gluten','dairy','eggs'] },
  { keywords: ['cream','creamy','white sauce','bechamel','carbonara','alfredo'], allergens: ['dairy'] },
  { keywords: ['cheese sauce'], allergens: ['dairy'] },
  { keywords: ['risotto'], allergens: ['dairy'] },
  { keywords: ['gratin'], allergens: ['dairy','gluten'] },
  { keywords: ['ice cream','gelato'], allergens: ['dairy','eggs'] },
  { keywords: ['milkshake'], allergens: ['dairy'] },
  // Egg based
  { keywords: ['omelette','omelet','frittata','scrambled egg','fried egg','poached egg','boiled egg','eggs benedict'], allergens: ['eggs','dairy'] },
  { keywords: ['mayonnaise','mayo','aioli'], allergens: ['eggs'] },
  { keywords: ['hollandaise'], allergens: ['eggs','dairy'] },
  { keywords: ['meringue'], allergens: ['eggs'] },
  { keywords: ['scotch egg'], allergens: ['gluten','eggs'] },
  // Fish
  { keywords: ['fish and chips','fish & chips'], allergens: ['fish','gluten'] },
  { keywords: ['fish cake','fishcake'], allergens: ['fish','gluten','eggs'] },
  { keywords: ['fish finger'], allergens: ['fish','gluten'] },
  { keywords: ['scampi'], allergens: ['shellfish','gluten'] },
  { keywords: ['prawn'], allergens: ['shellfish'] },
  { keywords: ['king prawn'], allergens: ['shellfish'] },
  { keywords: ['crab'], allergens: ['shellfish'] },
  { keywords: ['lobster'], allergens: ['shellfish'] },
  { keywords: ['squid','calamari'], allergens: ['molluscs'] },
  { keywords: ['octopus'], allergens: ['molluscs'] },
  { keywords: ['mussel','oyster','clam','scallop'], allergens: ['molluscs','shellfish'] },
  { keywords: ['anchov'], allergens: ['fish'] },
  { keywords: ['tuna'], allergens: ['fish'] },
  { keywords: ['salmon'], allergens: ['fish'] },
  { keywords: ['cod'], allergens: ['fish'] },
  { keywords: ['haddock'], allergens: ['fish'] },
  { keywords: ['sea bass'], allergens: ['fish'] },
  { keywords: ['mackerel'], allergens: ['fish'] },
  { keywords: ['whitebait'], allergens: ['fish','gluten'] },
  // Nuts
  { keywords: ['satay'], allergens: ['peanuts','soy'] },
  { keywords: ['pad thai'], allergens: ['peanuts','soy','eggs'] },
  { keywords: ['kung pao'], allergens: ['peanuts','soy'] },
  { keywords: ['peking'], allergens: ['soy','gluten'] },
  { keywords: ['peanut butter'], allergens: ['peanuts'] },
  { keywords: ['almond'], allergens: ['nuts'] },
  { keywords: ['walnut'], allergens: ['nuts'] },
  { keywords: ['cashew'], allergens: ['nuts'] },
  { keywords: ['pistachio'], allergens: ['nuts'] },
  { keywords: ['hazelnut'], allergens: ['nuts','dairy'] },
  { keywords: ['pecan'], allergens: ['nuts'] },
  { keywords: ['pine nut'], allergens: ['nuts'] },
  { keywords: ['mixed nut'], allergens: ['nuts','peanuts'] },
  // Sesame
  { keywords: ['sesame'], allergens: ['sesame'] },
  { keywords: ['tahini'], allergens: ['sesame'] },
  { keywords: ['hummus','houmous'], allergens: ['sesame'] },
  { keywords: ['falafel'], allergens: ['gluten','sesame'] },
  // Soy
  { keywords: ['tofu'], allergens: ['soy'] },
  { keywords: ['edamame'], allergens: ['soy'] },
  { keywords: ['miso'], allergens: ['soy','gluten'] },
  { keywords: ['teriyaki'], allergens: ['soy','gluten'] },
  { keywords: ['soy sauce','oyster sauce','hoisin'], allergens: ['soy','gluten'] },
  // Mustard
  { keywords: ['mustard'], allergens: ['mustard'] },
  { keywords: ['hot dog'], allergens: ['gluten','mustard'] },
  // Celery
  { keywords: ['celery'], allergens: ['celery'] },
  { keywords: ['celeriac'], allergens: ['celery'] },
  { keywords: ['bolognese','ragu'], allergens: ['gluten','celery'] },
  { keywords: ['stock','broth'], allergens: ['celery'] },
  // Sulphites
  { keywords: ['wine sauce','red wine','white wine'], allergens: ['sulphites'] },
  { keywords: ['pickle','pickled'], allergens: ['sulphites'] },
  // Curry dishes
  { keywords: ['curry','korma','tikka masala','balti','jalfrezi','rogan josh','vindaloo','madras','dopiaza'], allergens: ['dairy','celery'] },
  { keywords: ['tikka'], allergens: ['dairy'] },
  { keywords: ['biryani'], allergens: ['dairy'] },
  // Kebab
  { keywords: ['doner','donor'], allergens: ['gluten'] },
  { keywords: ['shish kebab','shish'], allergens: ['celery'] },
  // Breakfast
  { keywords: ['full breakfast','full english','full irish','fry up'], allergens: ['gluten','eggs','dairy','mustard'] },
  { keywords: ['french toast','eggy bread'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['pancake','waffle'], allergens: ['gluten','eggs','dairy'] },
  // Desserts
  { keywords: ['tiramisu'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['profiterole'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['eclair'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['brownie'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['muffin'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['cake'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['cookie','biscuit'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['doughnut','donut'], allergens: ['gluten','eggs','dairy'] },
  { keywords: ['churros'], allergens: ['gluten','eggs'] },
  { keywords: ['crumble'], allergens: ['gluten','dairy'] },
  // Starters
  { keywords: ['mozzarella stick'], allergens: ['gluten','dairy','eggs'] },
  { keywords: ['brie'], allergens: ['dairy'] },
  { keywords: ['camembert'], allergens: ['dairy'] },
  { keywords: ['soup'], allergens: ['celery','gluten'] },
  { keywords: ['nachos'], allergens: ['dairy'] },
  { keywords: ['chicken wing','chicken wings'], allergens: [] },
  { keywords: ['potato skin'], allergens: ['dairy'] },
]

// Extra individual allergen keywords
const INDIVIDUAL_ALLERGENS: Record<string, string[]> = {
  gluten: ['gluten','flour','wheat','rye','barley','oat','seitan','crouton'],
  dairy: ['cheese','cream','milk','butter','yogurt','yoghurt','mozzarella','cheddar','brie','parmesan','ricotta','mascarpone','ghee','custard','whey'],
  eggs: ['egg','eggs'],
  nuts: ['almond','walnut','cashew','pistachio','pecan','hazelnut','macadamia','pine nut','pecan','chestnut','praline'],
  peanuts: ['peanut','groundnut'],
  fish: ['fish','cod','haddock','salmon','tuna','sea bass','mackerel','trout','tilapia','anchov','sardine','halibut','plaice','monkfish','swordfish'],
  shellfish: ['prawn','shrimp','crab','lobster','langoustine','crawfish','crayfish','barnacle'],
  celery: ['celery','celeriac'],
  mustard: ['mustard','dijon'],
  sesame: ['sesame','tahini'],
  sulphites: ['sulphite','sulfite','wine','vinegar','dried fruit','raisin','sultana'],
  soy: ['soy','soya','tofu','edamame','miso','tempeh'],
  molluscs: ['squid','octopus','mussel','oyster','clam','scallop','snail','whelk','abalone','cuttlefish'],
}

// ============================================================
// COMPREHENSIVE CALORIE ESTIMATION
// ============================================================

const CALORIE_MAP: Array<{ keywords: string[], cal: number }> = [
  // Drinks - zero or low
  { keywords: ['still water','sparkling water','tap water'], cal: 0 },
  { keywords: ['diet coke','diet pepsi','zero sugar','sugar free'], cal: 5 },
  { keywords: ['water'], cal: 0 },
  { keywords: ['black coffee','espresso','americano'], cal: 5 },
  { keywords: ['tea'], cal: 10 },
  { keywords: ['juice','orange juice','apple juice'], cal: 130 },
  { keywords: ['smoothie'], cal: 220 },
  { keywords: ['milkshake','shake'], cal: 450 },
  { keywords: ['latte','cappuccino','flat white'], cal: 180 },
  { keywords: ['hot chocolate'], cal: 280 },
  { keywords: ['soft drink','cola','lemonade','fizzy'], cal: 140 },
  { keywords: ['beer','lager','ale','stout'], cal: 200 },
  { keywords: ['wine'], cal: 170 },
  { keywords: ['prosecco','champagne','cava'], cal: 130 },
  { keywords: ['spirit','vodka','gin','rum','whisky','bourbon'], cal: 110 },
  { keywords: ['cocktail'], cal: 250 },
  { keywords: ['alcopop'], cal: 220 },
  // Salads and light
  { keywords: ['side salad','green salad','garden salad'], cal: 80 },
  { keywords: ['caesar salad'], cal: 320 },
  { keywords: ['greek salad'], cal: 280 },
  { keywords: ['nicoise'], cal: 350 },
  { keywords: ['salad'], cal: 200 },
  { keywords: ['coleslaw'], cal: 140 },
  { keywords: ['soup'], cal: 220 },
  // Bread and starters
  { keywords: ['garlic bread with cheese'], cal: 360 },
  { keywords: ['garlic bread'], cal: 280 },
  { keywords: ['garlic pizza bread'], cal: 520 },
  { keywords: ['bruschetta'], cal: 220 },
  { keywords: ['bread roll','dinner roll'], cal: 180 },
  { keywords: ['naan bread'], cal: 300 },
  { keywords: ['poppadom'], cal: 60 },
  { keywords: ['nachos'], cal: 520 },
  { keywords: ['potato skin','potato skins'], cal: 320 },
  { keywords: ['onion ring','onion rings'], cal: 380 },
  { keywords: ['mozzarella stick'], cal: 380 },
  { keywords: ['brie'], cal: 300 },
  { keywords: ['camembert'], cal: 320 },
  { keywords: ['spring roll'], cal: 200 },
  { keywords: ['samosa'], cal: 220 },
  { keywords: ['pakora'], cal: 200 },
  { keywords: ['tempura'], cal: 280 },
  { keywords: ['gyoza','dumpling'], cal: 220 },
  { keywords: ['prawn toast'], cal: 280 },
  { keywords: ['chicken satay'], cal: 320 },
  { keywords: ['chicken wing','chicken wings'], cal: 480 },
  // Pizza - size specific
  { keywords: ['pizza 9"','pizza 9 inch','9" pizza'], cal: 750 },
  { keywords: ['pizza 10"','pizza 10 inch','10" pizza'], cal: 900 },
  { keywords: ['pizza 12"','pizza 12 inch','12" pizza'], cal: 1200 },
  { keywords: ['pizza 14"','pizza 14 inch','14" pizza'], cal: 1500 },
  { keywords: ['pizza 16"','pizza 16 inch','16" pizza'], cal: 1800 },
  { keywords: ['vegan pizza'], cal: 900 },
  { keywords: ['gluten free pizza'], cal: 800 },
  { keywords: ['pizza'], cal: 1000 },
  { keywords: ['calzone'], cal: 1100 },
  // Burgers
  { keywords: ['double burger','double beef'], cal: 800 },
  { keywords: ['chicken burger','crispy chicken'], cal: 580 },
  { keywords: ['veggie burger','vegan burger','plant burger'], cal: 480 },
  { keywords: ['fish burger'], cal: 520 },
  { keywords: ['burger'], cal: 650 },
  { keywords: ['hot dog'], cal: 400 },
  { keywords: ['wrap'], cal: 500 },
  // Sandwiches
  { keywords: ['baguette'], cal: 420 },
  { keywords: ['panini'], cal: 400 },
  { keywords: ['sandwich','sub'], cal: 420 },
  { keywords: ['toastie'], cal: 380 },
  // Pasta
  { keywords: ['lasagne','lasagna'], cal: 620 },
  { keywords: ['spaghetti bolognese'], cal: 580 },
  { keywords: ['carbonara'], cal: 650 },
  { keywords: ['pasta'], cal: 550 },
  { keywords: ['risotto'], cal: 520 },
  // Fish dishes
  { keywords: ['fish and chips','fish & chips'], cal: 900 },
  { keywords: ['scampi'], cal: 520 },
  { keywords: ['salmon'], cal: 450 },
  { keywords: ['sea bass'], cal: 380 },
  { keywords: ['cod'], cal: 350 },
  { keywords: ['haddock'], cal: 350 },
  { keywords: ['fishcake','fish cake'], cal: 320 },
  { keywords: ['prawn','king prawn'], cal: 180 },
  { keywords: ['calamari','squid'], cal: 280 },
  // Chicken
  { keywords: ['chicken tikka masala','butter chicken'], cal: 580 },
  { keywords: ['chicken tikka'], cal: 420 },
  { keywords: ['chicken korma'], cal: 550 },
  { keywords: ['chicken jalfrezi'], cal: 480 },
  { keywords: ['roast chicken'], cal: 480 },
  { keywords: ['chicken'], cal: 450 },
  // Meat dishes
  { keywords: ['mixed grill'], cal: 1050 },
  { keywords: ['sirloin steak'], cal: 720 },
  { keywords: ['ribeye steak'], cal: 780 },
  { keywords: ['fillet steak'], cal: 650 },
  { keywords: ['steak'], cal: 700 },
  { keywords: ['rack of ribs','baby back ribs'], cal: 900 },
  { keywords: ['ribs'], cal: 750 },
  { keywords: ['lamb chop'], cal: 580 },
  { keywords: ['lamb shank'], cal: 650 },
  { keywords: ['lamb'], cal: 550 },
  { keywords: ['pork chop'], cal: 520 },
  { keywords: ['pulled pork'], cal: 480 },
  { keywords: ['pork'], cal: 500 },
  { keywords: ['duck'], cal: 520 },
  { keywords: ['beef'], cal: 550 },
  // Kebabs
  { keywords: ['doner kebab','donor kebab'], cal: 680 },
  { keywords: ['shish kebab'], cal: 420 },
  { keywords: ['mixed kebab'], cal: 750 },
  { keywords: ['kebab'], cal: 600 },
  // Indian
  { keywords: ['biryani'], cal: 620 },
  { keywords: ['korma'], cal: 550 },
  { keywords: ['tikka masala'], cal: 580 },
  { keywords: ['balti'], cal: 520 },
  { keywords: ['vindaloo','madras'], cal: 480 },
  { keywords: ['jalfrezi','rogan josh'], cal: 490 },
  { keywords: ['curry'], cal: 520 },
  // Chinese/Asian
  { keywords: ['chow mein'], cal: 520 },
  { keywords: ['fried rice'], cal: 480 },
  { keywords: ['pad thai'], cal: 550 },
  { keywords: ['noodle'], cal: 480 },
  { keywords: ['sweet and sour','sweet & sour'], cal: 520 },
  { keywords: ['kung pao'], cal: 480 },
  { keywords: ['peking duck'], cal: 520 },
  { keywords: ['dim sum'], cal: 280 },
  // Sides
  { keywords: ['chips','fries','french fries'], cal: 400 },
  { keywords: ['sweet potato fries'], cal: 380 },
  { keywords: ['wedges'], cal: 360 },
  { keywords: ['jacket potato','baked potato'], cal: 350 },
  { keywords: ['mashed potato','mash'], cal: 280 },
  { keywords: ['new potato'], cal: 220 },
  { keywords: ['rice'], cal: 280 },
  { keywords: ['mushroom'], cal: 80 },
  { keywords: ['vegetables','veg'], cal: 120 },
  { keywords: ['side'], cal: 200 },
  // Breakfast
  { keywords: ['full english','full breakfast','fry up'], cal: 900 },
  { keywords: ['french toast','eggy bread'], cal: 420 },
  { keywords: ['pancake'], cal: 320 },
  { keywords: ['waffle'], cal: 380 },
  { keywords: ['eggs benedict'], cal: 480 },
  { keywords: ['scrambled egg'], cal: 250 },
  { keywords: ['omelette'], cal: 350 },
  // Desserts
  { keywords: ['sticky toffee pudding'], cal: 520 },
  { keywords: ['chocolate brownie','brownie'], cal: 450 },
  { keywords: ['cheesecake'], cal: 480 },
  { keywords: ['tiramisu'], cal: 420 },
  { keywords: ['profiterole'], cal: 380 },
  { keywords: ['ice cream'], cal: 320 },
  { keywords: ['sorbet'], cal: 150 },
  { keywords: ['gelato'], cal: 300 },
  { keywords: ['sundae'], cal: 520 },
  { keywords: ['cake'], cal: 420 },
  { keywords: ['muffin'], cal: 380 },
  { keywords: ['cookie'], cal: 280 },
  { keywords: ['doughnut','donut'], cal: 380 },
  { keywords: ['churros'], cal: 350 },
  { keywords: ['apple pie'], cal: 380 },
  { keywords: ['fruit crumble'], cal: 380 },
  { keywords: ['fruit salad'], cal: 120 },
  { keywords: ['dessert'], cal: 380 },
  // Kids
  { keywords: ["kid's meal","kids meal","children's meal"], cal: 400 },
  { keywords: ['nugget'], cal: 350 },
]

function detectAllergens(name: string, description: string): string[] {
  const text = (name + ' ' + (description || '')).toLowerCase()
  const found = new Set<string>()

  // Check for gluten-free/dairy-free/vegan overrides
  const isGlutenFree = text.includes('gluten free') || text.includes('gluten-free') || text.match(/\bgf\b/)
  const isDairyFree = text.includes('dairy free') || text.includes('dairy-free')
  const isVegan = text.includes('vegan')

  // Apply base allergens from food category rules
  for (const rule of BASE_ALLERGENS) {
    const matches = rule.keywords.some(k => text.includes(k))
    if (matches) {
      // Check if any override keywords are present
      const overrideActive = rule.overrides?.some(o => text.includes(o))
      if (!overrideActive) {
        rule.allergens.forEach(a => found.add(a))
      }
    }
  }

  // Apply individual allergen keywords
  for (const [allergen, keywords] of Object.entries(INDIVIDUAL_ALLERGENS)) {
    if (keywords.some(k => text.includes(k))) {
      found.add(allergen)
    }
  }

  // Remove overridden allergens
  if (isGlutenFree) found.delete('gluten')
  if (isDairyFree) found.delete('dairy')
  if (isVegan) { found.delete('dairy'); found.delete('eggs') }

  return [...found]
}

function estimateCalories(name: string, description: string): number {
  const text = (name + ' ' + (description || '')).toLowerCase()

  // Try most specific match first (longer keyword = more specific)
  const sorted = [...CALORIE_MAP].sort((a, b) => b.keywords[0].length - a.keywords[0].length)

  for (const entry of sorted) {
    if (entry.keywords.some(k => text.includes(k))) {
      return entry.cal
    }
  }

  // Default fallback based on broad category
  if (text.includes('drink') || text.includes('beverage')) return 150
  if (text.includes('starter') || text.includes('appetizer')) return 280
  if (text.includes('main') || text.includes('dish')) return 520
  if (text.includes('dessert') || text.includes('sweet')) return 380
  if (text.includes('side')) return 200

  return 400 // General fallback
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
