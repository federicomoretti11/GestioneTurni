import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posti_di_servizio')
    .select('*')
    .order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('posti_di_servizio')
    .insert({
      nome: body.nome,
      descrizione: body.descrizione ?? null,
      latitudine: body.latitudine ?? null,
      longitudine: body.longitudine ?? null,
      raggio_metri: body.raggio_metri ?? 200,
      geo_check_abilitato: body.geo_check_abilitato ?? false,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
