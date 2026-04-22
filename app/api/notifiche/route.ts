import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const soloNonLette = searchParams.get('non_lette') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200)

  let query = supabase
    .from('notifiche')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (soloNonLette) query = query.eq('letta', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
