import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getResend } from '@/lib/email'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profilo } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (profilo?.ruolo !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const email = user.email
  if (!email) return NextResponse.json({ error: 'Email non disponibile' }, { status: 400 })

  const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev'

  try {
    const { error } = await getResend().emails.send({
      from,
      to: email,
      subject: 'Test email — Opero Hub ✓',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1e40af">Email di test ✓</h2>
          <p>Se stai leggendo questo messaggio, la configurazione email di <strong>Opero Hub</strong> funziona correttamente.</p>
          <table style="width:100%;margin-top:16px;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Mittente</td><td style="padding:6px 0;font-size:13px">${from}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Destinatario</td><td style="padding:6px 0;font-size:13px">${email}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Inviata il</td><td style="padding:6px 0;font-size:13px">${new Date().toLocaleString('it-IT')}</td></tr>
          </table>
        </div>`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, sentTo: email })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore sconosciuto'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
