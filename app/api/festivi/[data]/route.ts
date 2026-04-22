import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(_: Request, { params }: { params: { data: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('festivi').delete().eq('data', params.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
