import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { toDateString } from '@/lib/utils/date'
import { requireTenantId } from '@/lib/tenant'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profile?.ruolo !== 'admin') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })

  const tenantId = requireTenantId()
  const body = await request.json().catch(() => ({}))
  const { origine_inizio, origine_fine, destinazione_inizio } = body
  const re = /^\d{4}-\d{2}-\d{2}$/
  if (!re.test(origine_inizio) || !re.test(origine_fine) || !re.test(destinazione_inizio)) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 400 })
  }
  if (origine_fine < origine_inizio) {
    return NextResponse.json({ error: 'origine_fine precede origine_inizio' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: origine, error: readErr } = await admin
    .from('turni')
    .select('dipendente_id, template_id, ora_inizio, ora_fine, posto_id, note, data')
    .eq('stato', 'confermato')
    .eq('tenant_id', tenantId)
    .gte('data', origine_inizio)
    .lte('data', origine_fine)
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!origine || origine.length === 0) {
    return NextResponse.json({ copiati: 0 })
  }

  const giornoMs = 1000 * 60 * 60 * 24
  const shiftGiorni = Math.round(
    (new Date(destinazione_inizio).getTime() - new Date(origine_inizio).getTime()) / giornoMs
  )

  const nuove = origine.map(t => {
    const d = new Date(t.data + 'T00:00:00')
    d.setDate(d.getDate() + shiftGiorni)
    return {
      dipendente_id: t.dipendente_id,
      template_id: t.template_id,
      ora_inizio: t.ora_inizio,
      ora_fine: t.ora_fine,
      posto_id: t.posto_id,
      note: t.note,
      data: toDateString(d),
      stato: 'bozza' as const,
      creato_da: user.id,
      tenant_id: tenantId,
    }
  })

  const { error: insErr } = await admin.from('turni').insert(nuove)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ copiati: nuove.length })
}
