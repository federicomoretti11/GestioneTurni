import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getFestiviAnno } from '@/lib/utils/festivi'
import { requireTenantId } from '@/lib/tenant'

export async function POST(request: Request) {
  const supabase = createClient()
  const tenantId = requireTenantId()
  const body = await request.json()
  const anno = Number(body.anno)
  if (!Number.isFinite(anno) || anno < 2000 || anno > 2100) {
    return NextResponse.json({ error: 'Anno non valido' }, { status: 400 })
  }

  const festivi = getFestiviAnno(anno).map(f => ({
    data: f.data,
    nome: f.nome,
    tipo: 'nazionale' as const,
    tenant_id: tenantId,
  }))

  // Upsert per (tenant_id, data): re-esegue idempotentemente senza duplicare
  const { data, error } = await supabase
    .from('festivi')
    .upsert(festivi, { onConflict: 'tenant_id,data' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ aggiornati: data?.length ?? 0 }, { status: 200 })
}
