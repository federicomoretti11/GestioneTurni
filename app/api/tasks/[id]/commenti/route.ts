import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function getCtx() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { user, supabase }
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  requireTenantId()

  const { data, error } = await ctx.supabase
    .from('task_commenti')
    .select('id, testo, created_at, profile:profiles!task_commenti_autore_id_fkey(nome, cognome)')
    .eq('task_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const tenantId = requireTenantId()
  const { testo } = await request.json()
  if (!testo?.trim()) return NextResponse.json({ error: 'testo obbligatorio' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('task_commenti')
    .insert({ task_id: params.id, autore_id: ctx.user.id, testo: testo.trim() })
    .select('id, testo, created_at, profile:profiles!task_commenti_autore_id_fkey(nome, cognome)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Invia notifiche agli utenti menzionati con @Nome Cognome
  const mentionedNames = new Set<string>()
  testo.trim().split('@').slice(1).forEach((part: string) => {
    const words = part.trimStart().split(/\s+/)
    if (words[0] && words[1]) mentionedNames.add(`${words[0]}|${words[1]}`)
  })

  if (mentionedNames.size > 0) {
    const admin = createAdminClient()
    const { data: task } = await ctx.supabase.from('tasks').select('titolo').eq('id', params.id).single()
    for (const key of mentionedNames) {
      const [nome, cognome] = key.split('|')
      const { data: profile } = await admin
        .from('profiles').select('id').eq('tenant_id', tenantId).ilike('nome', nome).ilike('cognome', cognome).single()
      if (profile && profile.id !== ctx.user.id) {
        await admin.from('notifiche').insert({
          destinatario_id: profile.id,
          tipo: 'menzione_task',
          titolo: 'Sei stato menzionato in un commento',
          messaggio: `Menzione nel task "${task?.titolo ?? ''}"`,
          tenant_id: tenantId,
        })
      }
    }
  }

  return NextResponse.json(data, { status: 201 })
}
