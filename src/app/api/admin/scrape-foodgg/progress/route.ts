import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/adminAuth'

// Lightweight endpoint the admin panel polls every second while an import
// is running, to show live progress (current step, running totals, and a
// scrolling log) instead of a static "Importing..." message with no way
// to tell whether it's still working or has silently died.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: job } = await supabase.from('scrape_jobs').select('*').eq('id', jobId).maybeSingle()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json({ job })
}
