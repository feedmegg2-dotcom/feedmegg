// =============================================
// What3Words Integration
// Converts addresses to W3W and back
// =============================================

const W3W_API_KEY = process.env.NEXT_PUBLIC_W3W_API_KEY
const W3W_BASE = 'https://api.what3words.com/v3'

// Convert lat/lng to What3Words address
export async function coordsToW3W(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `${W3W_BASE}/convert-to-3wa?coordinates=${lat},${lng}&language=en&key=${W3W_API_KEY}`
    )
    const data = await res.json()
    return data.words || null
  } catch {
    return null
  }
}

// Convert What3Words to lat/lng
export async function w3wToCoords(words: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const cleanWords = words.replace(/^\/\/\//, '')
    const res = await fetch(
      `${W3W_BASE}/convert-to-coordinates?words=${cleanWords}&key=${W3W_API_KEY}`
    )
    const data = await res.json()
    if (data.coordinates) {
      return { lat: data.coordinates.lat, lng: data.coordinates.lng }
    }
    return null
  } catch {
    return null
  }
}

// Convert a UK postcode to W3W (approximation using geocoding)
export async function postcodeToW3W(postcode: string): Promise<string | null> {
  try {
    // First get lat/lng from postcode
    const geocodeRes = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`
    )
    const geocodeData = await geocodeRes.json()
    
    if (geocodeData.status !== 200) return null
    
    const { latitude, longitude } = geocodeData.result
    return await coordsToW3W(latitude, longitude)
  } catch {
    return null
  }
}

// Autosuggest W3W addresses
export async function suggestW3W(input: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${W3W_BASE}/autosuggest?input=${encodeURIComponent(input)}&focus=49.455,-2.536&country=GB&key=${W3W_API_KEY}`
    )
    const data = await res.json()
    return data.suggestions?.map((s: any) => s.words) || []
  } catch {
    return []
  }
}

// Format W3W for display
export function formatW3W(words: string): string {
  const clean = words.replace(/^\/\/\//, '')
  return `///${clean}`
}
