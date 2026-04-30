import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { dateRange } from '@/lib/richieste/turni'
import { requireTenantId } from '@/lib/tenant'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.ruolo ?? '')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const tenantId = requireTenantId()
  const { data_fine } = await request.json()
  if (!data_fine) return NextResponse.json({ error: 'data_fine obbligatoria' }, { status: 422 })

  const { data: richiesta } = await supabase
    .from('richieste')
    .select('*')
    .eq('id', params.id)
    .eq('tipo', 'malattia')
    .eq('stato', 'comunicata')
    .is('data_fine', null)
    .single()

  if (!richiesta) return NextResponse.json({ error: 'Richiesta non trovata o già chiusa' }, { status: 404 })

  const { error: updateErr } = await supabase
    .from('richieste')
    .update({ data_fine })
    .eq('id', params.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Elimina turni malattia creati oltre la data di rientro
  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _giorni = dateRange(richiesta.data_inizio, data_fine)

  await adminClient
    .from('turni')
    .delete()
    .eq('dipendente_id', richiesta.dipendente_id)
    .eq('stato', 'confermato')
    .eq('tenant_id', tenantId)
    .gt('data', data_fine)
    .like('note', `Da richiesta malattia #${richiesta.id.slice(0, 8)}%`)

  await adminClient.from('notifiche').insert({
    destinatario_id: richiesta.dipendente_id,
    tipo: 'richiesta_approvata',
    titolo: 'Data rientro malattia aggiornata',
    messaggio: `Il tuo rientro dalla malattia è stato impostato al ${data_fine}`,
    tenant_id: tenantId,
  })

  return NextResponse.json({ ok: true })
}
