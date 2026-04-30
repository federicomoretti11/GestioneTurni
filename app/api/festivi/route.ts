import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const anno = searchParams.get('anno')

  let query = supabase.from('festivi').select('*').order('data')
  if (anno) {
    query = query.gte('data', `${anno}-01-01`).lte('data', `${anno}-12-31`)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const tenantId = requireTenantId()
  const body = await request.json()
  if (!body.data || !body.nome) {
    return NextResponse.json({ error: 'data e nome sono obbligatori' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('festivi')
    .insert({
      data: body.data,
      nome: body.nome.trim(),
      tipo: body.tipo ?? 'patronale',
      tenant_id: tenantId,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
