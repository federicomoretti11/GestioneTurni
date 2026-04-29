import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('posti_di_servizio')
    .update({
      nome: body.nome,
      descrizione: body.descrizione ?? null,
      attivo: body.attivo ?? true,
      latitudine: body.latitudine ?? null,
      longitudine: body.longitudine ?? null,
      raggio_metri: body.raggio_metri ?? 200,
      geo_check_abilitato: body.geo_check_abilitato ?? false,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('posti_di_servizio').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
