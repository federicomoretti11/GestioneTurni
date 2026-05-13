import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function getUtenteAutenticato() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('ruolo')
    .eq('id', user.id)
    .single()
  if (!data) return null
  return { id: user.id, ruolo: data.ruolo as string }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const utente = await getUtenteAutenticato()
  if (!utente) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const tenantId = requireTenantId()
  const admin = createAdminClient()

  // Fetch il record per verificare esistenza e ownership
  const { data: record, error: fetchError } = await admin
    .from('indisponibilita')
    .select('id, dipendente_id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !record) {
    return NextResponse.json({ error: 'Indisponibilità non trovata' }, { status: 404 })
  }

  // Solo admin può cancellare record di altri dipendenti
  if (utente.ruolo !== 'admin' && record.dipendente_id !== utente.id) {
    return NextResponse.json(
      { error: 'Non autorizzato a eliminare questa indisponibilità' },
      { status: 403 }
    )
  }

  const { error: deleteError } = await admin
    .from('indisponibilita')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
