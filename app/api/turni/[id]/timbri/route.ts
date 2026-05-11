// app/api/turni/[id]/timbri/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.ruolo ?? '')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  let tenantId: string
  try { tenantId = requireTenantId() } catch {
    return NextResponse.json({ error: 'Tenant non risolto' }, { status: 400 })
  }

  const { id } = params
  const body = await request.json().catch(() => ({}))
  const { ora_ingresso_effettiva, ora_uscita_effettiva } = body as {
    ora_ingresso_effettiva: string | null
    ora_uscita_effettiva: string | null
  }

  const admin = createAdminClient()

  // Legge la data del turno per costruire il timestamp
  const { data: turno, error: readErr } = await admin
    .from('turni')
    .select('data')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (readErr || !turno) {
    return NextResponse.json({ error: 'Turno non trovato' }, { status: 404 })
  }

  // Converte HH:mm in timestamp ISO, null se vuoto
  function toISO(data: string, hhmm: string | null): string | null {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null
    return `${data}T${hhmm}:00+00:00`
  }

  const { error: updErr } = await admin
    .from('turni')
    .update({
      ora_ingresso_effettiva: toISO(turno.data, ora_ingresso_effettiva),
      ora_uscita_effettiva: toISO(turno.data, ora_uscita_effettiva),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
