import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { count, error } = await supabase
    .from('turni')
    .select('id', { count: 'exact', head: true })
    .eq('stato', 'bozza')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: count ?? 0 })
}
