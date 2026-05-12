import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmailChatMessaggio } from '@/lib/email'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const conversazione_id = searchParams.get('conversazione_id')
  if (!conversazione_id) return NextResponse.json({ error: 'conversazione_id obbligatorio' }, { status: 400 })

  // Verifica appartenenza conversazione all'utente
  const { data: conv } = await supabase
    .from('chat_conversazioni')
    .select('id')
    .eq('id', conversazione_id)
    .eq('utente_id', user.id)
    .maybeSingle()
  if (!conv) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data, error } = await supabase
    .from('chat_messaggi')
    .select('*')
    .eq('conversazione_id', conversazione_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const { conversazione_id, testo } = body
  if (!conversazione_id || !testo?.trim()) {
    return NextResponse.json({ error: 'conversazione_id e testo obbligatori' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cognome, is_super_admin, tenants(nome)')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('chat_messaggi')
    .insert({ conversazione_id, mittente_id: user.id, testo: testo.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica email al super-admin solo se il mittente NON è super-admin
  if (!profile?.is_super_admin) {
    const nomeAzienda = (profile?.tenants as { nome?: string } | null)?.nome ?? ''
    await sendEmailChatMessaggio({
      nomeUtente: `${profile?.nome ?? ''} ${profile?.cognome ?? ''}`.trim(),
      nomeAzienda,
      testo: testo.trim(),
    })
  }

  return NextResponse.json(data, { status: 201 })
}
