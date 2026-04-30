import 'server-only'
import { Resend } from 'resend'
import type { TipoRichiesta } from '@/lib/types'

const FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? '')
}

const TIPO_LABEL: Record<TipoRichiesta, string> = {
  ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', cambio_turno: 'Cambio turno', sblocco_checkin: 'Sblocco check-in',
}

function htmlApprovata(tipo: TipoRichiesta, dataInizio: string, dataFine: string | null): string {
  const date = dataFine && dataFine !== dataInizio
    ? `dal <strong>${dataInizio}</strong> al <strong>${dataFine}</strong>`
    : `del <strong>${dataInizio}</strong>`
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#16a34a">Richiesta approvata ✓</h2>
      <p>La tua richiesta di <strong>${TIPO_LABEL[tipo]}</strong> ${date} è stata approvata.</p>
      <p style="color:#6b7280;font-size:14px">Puoi visualizzarla nella sezione Richieste della tua app.</p>
    </div>`
}

function htmlRifiutata(tipo: TipoRichiesta, motivazione: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#dc2626">Richiesta rifiutata</h2>
      <p>La tua richiesta di <strong>${TIPO_LABEL[tipo]}</strong> è stata rifiutata.</p>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;margin-top:12px">
        <strong>Motivazione:</strong> ${motivazione}
      </div>
    </div>`
}

export async function sendEmailRichiestaApprovata(params: {
  toEmail: string
  tipo: TipoRichiesta
  dataInizio: string
  dataFine: string | null
}) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: params.toEmail,
      subject: `Richiesta ${TIPO_LABEL[params.tipo]} approvata`,
      html: htmlApprovata(params.tipo, params.dataInizio, params.dataFine),
    })
  } catch (e) {
    console.error('[email] sendEmailRichiestaApprovata fallita', e)
  }
}

export async function sendEmailRichiestaRifiutata(params: {
  toEmail: string
  tipo: TipoRichiesta
  motivazione: string
}) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: params.toEmail,
      subject: `Richiesta ${TIPO_LABEL[params.tipo]} rifiutata`,
      html: htmlRifiutata(params.tipo, params.motivazione),
    })
  } catch (e) {
    console.error('[email] sendEmailRichiestaRifiutata fallita', e)
  }
}

export async function sendEmailSbloccoApprovato(params: {
  toEmail: string
  dataTurno: string
}) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: params.toEmail,
      subject: 'Sblocco check-in approvato — hai 30 minuti',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#d97706">Sblocco check-in approvato 🔓</h2>
          <p>Il tuo sblocco per il turno del <strong>${params.dataTurno}</strong> è stato approvato.</p>
          <p>Hai <strong>30 minuti</strong> per effettuare il check-in dall'app.</p>
          <p style="color:#6b7280;font-size:14px">Passati i 30 minuti il token scade e dovrai richiedere un nuovo sblocco.</p>
        </div>`,
    })
  } catch (e) {
    console.error('[email] sendEmailSbloccoApprovato fallita', e)
  }
}
