import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const tenantId = requireTenantId()
  const body = await request.json()
  const isAdminOrManager = ctx.ruolo === 'admin' || ctx.ruolo === 'manager' || ctx.isSuperAdmin

  if (isAdminOrManager) {
    const { titolo, descrizione, stato, priorita, scadenza, assegnati } = body
    const updates: Record<string, unknown> = {}
    if (titolo !== undefined) updates.titolo = titolo?.trim()
    if (descrizione !== undefined) updates.descrizione = descrizione?.trim() || null
    if (stato !== undefined) updates.stato = stato
    if (priorita !== undefined) updates.priorita = priorita
    if (scadenza !== undefined) updates.scadenza = scadenza || null

    const { error } = await ctx.supabase
      .from('tasks').update(updates).eq('id', params.id).eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (assegnati !== undefined) {
      const { data: esistenti } = await ctx.supabase
        .from('task_assegnazioni').select('dipendente_id').eq('task_id', params.id)
      const idEsistenti = new Set((esistenti ?? []).map((r: { dipendente_id: string }) => r.dipendente_id))
      const nuovi = (assegnati as string[]).filter(id => !idEsistenti.has(id))

      await ctx.supabase.from('task_assegnazioni').delete().eq('task_id', params.id)
      if (assegnati.length > 0) {
        const rows = (assegnati as string[]).map(id => ({ task_id: params.id, dipendente_id: id }))
        await ctx.supabase.from('task_assegnazioni').insert(rows)
      }

      if (nuovi.length > 0) {
        const { data: task } = await ctx.supabase.from('tasks').select('titolo').eq('id', params.id).single()
        const admin = createAdminClient()
        const notifiche = nuovi
          .filter(id => id !== ctx.user.id)
          .map(id => ({
            destinatario_id: id,
            tipo: 'task_assegnato',
            titolo: 'Sei stato assegnato a un task',
            messaggio: `Task: "${task?.titolo ?? ''}"`,
            tenant_id: tenantId,
          }))
        if (notifiche.length > 0) await admin.from('notifiche').insert(notifiche)
      }
    }
  } else {
    // Dipendente: può solo aggiornare lo stato
    const { stato } = body
    if (!stato) return NextResponse.json({ error: 'stato obbligatorio' }, { status: 400 })

    const { error } = await ctx.supabase
      .from('tasks').update({ stato }).eq('id', params.id).eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getCtx()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const isAdminOrManager = ctx.ruolo === 'admin' || ctx.ruolo === 'manager' || ctx.isSuperAdmin
  if (!isAdminOrManager) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { error } = await ctx.supabase
    .from('tasks').delete().eq('id', params.id).eq('tenant_id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
