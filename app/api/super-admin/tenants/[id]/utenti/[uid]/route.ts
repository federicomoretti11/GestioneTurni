import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
  return data?.is_super_admin ? true : null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: Request, { params }: { params: { id: string; uid: string } }) {
  const ok = await checkSuperAdmin()
  if (!ok) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id, uid } = params
  if (!UUID_RE.test(id) || !UUID_RE.test(uid)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verifica che l'utente appartenga al tenant
  const { data: profile } = await admin
    .from('profiles')
    .select('id, ruolo, attivo, nome, cognome')
    .eq('id', uid)
    .eq('tenant_id', id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const body = await req.json()
  const { azione } = body

  if (azione === 'reset_password') {
    const { data: authUser } = await admin.auth.admin.getUserById(uid)
    if (!authUser.user?.email) return NextResponse.json({ error: 'Email non trovata' }, { status: 400 })
    const { error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, messaggio: `Email reset inviata a ${authUser.user.email}` })
  }

  if (azione === 'set_password') {
    const { password } = body
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password minimo 8 caratteri' }, { status: 422 })
    }
    const { error } = await admin.auth.admin.updateUserById(uid, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (azione === 'cambia_ruolo') {
    const { ruolo } = body
    if (!['admin', 'manager', 'dipendente'].includes(ruolo)) {
      return NextResponse.json({ error: 'Ruolo non valido' }, { status: 422 })
    }
    const { error } = await admin.from('profiles').update({ ruolo }).eq('id', uid).eq('tenant_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (azione === 'toggle_attivo') {
    const nuovoAttivo = !profile.attivo
    const { error } = await admin.from('profiles').update({ attivo: nuovoAttivo }).eq('id', uid).eq('tenant_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, attivo: nuovoAttivo })
  }

  return NextResponse.json({ error: 'Azione non riconosciuta' }, { status: 400 })
}
