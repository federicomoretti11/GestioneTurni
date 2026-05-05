import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('profiles')
    .update({ nome: body.nome, cognome: body.cognome, ruolo: body.ruolo })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()

  if (body.anonimizza) {
    const adminClient = createAdminClient()
    await adminClient.auth.admin.updateUserById(params.id, {
      email: `deleted-${params.id}@deleted.local`,
    })
    const { data, error } = await adminClient
      .from('profiles')
      .update({ nome: 'Utente', cognome: 'Eliminato', attivo: false })
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ attivo: body.attivo })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const adminClient = createAdminClient()
  const { error: authError } = await adminClient.auth.admin.deleteUser(params.id)
  if (authError) {
    // Profilo orfano: l'utente auth non esiste più, cancella solo il record profiles
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', params.id)
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
