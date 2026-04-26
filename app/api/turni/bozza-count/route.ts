import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0, primaData: null })

  const [{ count, error }, { data: prima }] = await Promise.all([
    supabase.from('turni').select('id', { count: 'exact', head: true }).eq('stato', 'bozza'),
    supabase.from('turni').select('data').eq('stato', 'bozza').order('data', { ascending: true }).limit(1).maybeSingle(),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: count ?? 0, primaData: prima?.data ?? null })
}
