// app/api/richieste/calendario/route.ts
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const data_inizio = searchParams.get('data_inizio')
  const data_fine = searchParams.get('data_fine')

  if (!data_inizio || !data_fine ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data_inizio) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data_fine)) {
    return NextResponse.json({ error: 'data_inizio e data_fine (YYYY-MM-DD) richiesti' }, { status: 400 })
  }
  if (data_inizio > data_fine) {
    return NextResponse.json({ error: 'data_inizio deve essere <= data_fine' }, { status: 400 })
  }

  // Overlap: l'assenza è attiva nel periodo se inizia prima della fine e finisce dopo l'inizio
  const { data, error } = await supabase
    .from('richieste')
    .select('id, dipendente_id, tipo, data_inizio, data_fine, note')
    .eq('tenant_id', tenantId)
    .eq('stato', 'approvata')
    .in('tipo', ['ferie', 'permesso', 'malattia'])
    .lte('data_inizio', data_fine)
    .gte('data_fine', data_inizio)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
