import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data } = await supabase
    .from('impostazioni')
    .select('gps_checkin_abilitato, email_notifiche_abilitato')
    .single()
  return NextResponse.json({
    gps_checkin_abilitato: data?.gps_checkin_abilitato ?? true,
    email_notifiche_abilitato: data?.email_notifiche_abilitato ?? false,
  })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if ((profile as { ruolo?: string } | null)?.ruolo !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const body = await req.json() as { gps_checkin_abilitato?: boolean; email_notifiche_abilitato?: boolean }
  const update: Record<string, boolean> = {}
  if (typeof body.gps_checkin_abilitato === 'boolean') update.gps_checkin_abilitato = body.gps_checkin_abilitato
  if (typeof body.email_notifiche_abilitato === 'boolean') update.email_notifiche_abilitato = body.email_notifiche_abilitato
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('impostazioni').update(update).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
