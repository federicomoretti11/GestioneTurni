import { NextResponse } from 'next/server'
import { getResend } from '@/lib/email'

export async function POST(req: Request) {
  const { nome, azienda, email, messaggio } = await req.json()

  if (!nome || !email || !messaggio) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev'
  const to = process.env.RESEND_CONTACT_TO ?? from

  try {
    const { error } = await getResend().emails.send({
      from,
      to,
      subject: `Nuova richiesta di contatto — ${nome}${azienda ? ` (${azienda})` : ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#1e293b;margin:0 0 16px">Nuova richiesta di contatto</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;white-space:nowrap;padding-right:16px">Nome</td><td style="padding:8px 0;font-size:14px">${nome}</td></tr>
            ${azienda ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;white-space:nowrap;padding-right:16px">Azienda</td><td style="padding:8px 0;font-size:14px">${azienda}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;white-space:nowrap;padding-right:16px">Email</td><td style="padding:8px 0;font-size:14px"><a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
          <p style="font-size:14px;color:#334155;white-space:pre-wrap;line-height:1.6">${messaggio}</p>
        </div>`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore sconosciuto'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
