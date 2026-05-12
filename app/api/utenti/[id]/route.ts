import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'

async function checkAdminOrManager() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return { user, supabase }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdminOrManager()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const tenantId = requireTenantId()
  const supabase = ctx.supabase
  const body = await request.json()
  const { data, error } = await supabase
    .from('profiles')
    .update({ nome: body.nome, cognome: body.cognome, ruolo: body.ruolo, includi_in_turni: body.includi_in_turni, matricola: body.matricola ?? undefined })
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdminOrManager()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const tenantId = requireTenantId()
  const body = await request.json()

  if (body.anonimizza) {
    const adminClient = createAdminClient()
    const { data: target } = await adminClient
      .from('profiles').select('tenant_id').eq('id', params.id).single()
    if (target?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }
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

  const { data, error } = await ctx.supabase
    .from('profiles')
    .update({ attivo: body.attivo })
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdminOrManager()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const tenantId = requireTenantId()

  const { data: target } = await ctx.supabase
    .from('profiles').select('tenant_id').eq('id', params.id).single()
  if (target?.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { error: authError } = await adminClient.auth.admin.deleteUser(params.id)
  if (authError) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', params.id)
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
