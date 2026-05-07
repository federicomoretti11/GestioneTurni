import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function getCtx() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('ruolo, is_super_admin').eq('id', user.id).single()
  if (!profile) return null
  return { user, supabase, ruolo: profile.ruolo as string, isSuperAdmin: profile.is_super_admin === true }
}

export async function GET() {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const tenantId = requireTenantId()

  const { data, error } = await ctx.supabase
    .from('tasks')
    .select(`
      id, titolo, descrizione, stato, priorita, scadenza, created_at, updated_at,
      created_by,
      created_by_profile:profiles!tasks_created_by_fkey(nome, cognome),
      task_assegnazioni(
        dipendente_id,
        profile:profiles!task_assegnazioni_dipendente_id_fkey(nome, cognome)
      ),
      task_commenti(id)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const isAdminOrManager = ctx.ruolo === 'admin' || ctx.ruolo === 'manager' || ctx.isSuperAdmin
  if (!isAdminOrManager) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()

  let body: { titolo?: string; descrizione?: string; priorita?: string; scadenza?: string; assegnati?: string[] }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON non valido' }, { status: 400 }) }
  const { titolo, descrizione, priorita, scadenza, assegnati } = body

  if (!titolo?.trim()) return NextResponse.json({ error: 'titolo obbligatorio' }, { status: 400 })

  const { data: task, error } = await ctx.supabase
    .from('tasks')
    .insert({
      tenant_id: tenantId,
      titolo: titolo.trim(),
      descrizione: descrizione?.trim() || null,
      priorita: priorita || 'media',
      scadenza: scadenza || null,
      created_by: ctx.user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (assegnati && assegnati.length > 0) {
    const rows = (assegnati as string[]).map(id => ({ task_id: task.id, dipendente_id: id }))
    await ctx.supabase.from('task_assegnazioni').insert(rows)
  }

  return NextResponse.json(task, { status: 201 })
}
