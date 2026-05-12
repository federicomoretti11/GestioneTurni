import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin') return null
  return user
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const tenantId = requireTenantId()
  const { data } = await createAdminClient()
    .from('tenants').select('sigla, nome').eq('id', tenantId).single()
  return NextResponse.json({ sigla: data?.sigla ?? null, nomeTenant: data?.nome ?? '' })
}

export async function PATCH(req: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const tenantId = requireTenantId()
  const { sigla } = await req.json()
  if (typeof sigla !== 'string' || !/^[A-Z0-9]{2,5}$/.test(sigla.toUpperCase())) {
    return NextResponse.json({ error: 'Sigla non valida (2-5 caratteri alfanumerici)' }, { status: 400 })
  }
  const { error } = await createAdminClient()
    .from('tenants').update({ sigla: sigla.toUpperCase() }).eq('id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
