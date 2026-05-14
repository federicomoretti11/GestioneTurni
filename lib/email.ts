import 'server-only'
import { Resend } from 'resend'
import type { TipoRichiesta } from '@/lib/types'

const FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev'

export function getResend() {
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

export async function sendEmailTurniPubblicati(params: {
  toEmail: string
  dataInizio: string
  dataFine: string
  turni: Array<{ data: string; ora_inizio: string; ora_fine: string; posto_nome?: string | null }>
}) {
  const formatData = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const formatPeriodo = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const righe = params.turni
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(t => {
      const isRiposo = t.ora_inizio === t.ora_fine
      const orario = isRiposo ? 'Riposo' : `${t.ora_inizio.slice(0, 5)} – ${t.ora_fine.slice(0, 5)}`
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#374151">${formatData(t.data)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#374151;font-weight:600">${orario}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280">${t.posto_nome ?? '—'}</td>
      </tr>`
    })
    .join('')
  try {
    await getResend().emails.send({
      from: FROM,
      to: params.toEmail,
      subject: `Turni pubblicati — dal ${formatPeriodo(params.dataInizio)} al ${formatPeriodo(params.dataFine)}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#1e40af;margin-bottom:4px">Turni pubblicati 📅</h2>
          <p style="color:#6b7280;margin-top:0">Dal <strong>${formatPeriodo(params.dataInizio)}</strong> al <strong>${formatPeriodo(params.dataFine)}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Giorno</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Orario</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Posto</th>
              </tr>
            </thead>
            <tbody>${righe}</tbody>
          </table>
          <p style="color:#6b7280;font-size:14px;margin-top:20px">Accedi all'app per visualizzare tutti i dettagli.</p>
        </div>`,
    })
  } catch (e) {
    console.error('[email] sendEmailTurniPubblicati fallita', e)
  }
}

export async function sendEmailAttivazioneAccount(params: {
  toEmail: string
  nome: string
  cognome: string
  linkAttivazione: string
}) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: params.toEmail,
      subject: 'Attiva il tuo account Opero Hub',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1e40af">Benvenuto in Opero Hub 👋</h2>
          <p>Ciao <strong>${params.nome} ${params.cognome}</strong>,</p>
          <p>Il tuo account è stato creato. Clicca sul pulsante qui sotto per attivarlo e impostare la tua password.</p>
          <a href="${params.linkAttivazione}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Attiva account</a>
          <p style="color:#6b7280;font-size:13px;margin-top:24px">Se non riesci a cliccare il pulsante, copia questo link nel browser:</p>
          <p style="color:#6b7280;font-size:12px;word-break:break-all">${params.linkAttivazione}</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Il link scade dopo 24 ore.</p>
        </div>`,
    })
  } catch (e) {
    console.error('[email] sendEmailAttivazioneAccount fallita', e)
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

export async function sendEmailNuovaRichiestaDemo(params: {
  nome: string
  email: string
  azienda: string
  dipendenti: string
}) {
  const to = process.env.DEMO_NOTIFICATION_EMAIL ?? 'info@operohub.com'
  try {
    await getResend().emails.send({
      from: FROM,
      to,
      subject: `Nuova richiesta demo — ${params.azienda}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#045dcc">Nuova richiesta demo 🎯</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px">Nome</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${params.nome}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Email</td><td style="padding:8px 0;font-weight:600;color:#0f172a"><a href="mailto:${params.email}" style="color:#045dcc">${params.email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Azienda</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${params.azienda}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Dipendenti</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${params.dipendenti}</td></tr>
          </table>
        </div>`,
    })
  } catch (e) {
    console.error('[email] sendEmailNuovaRichiestaDemo fallita', e)
  }
}

export async function sendEmailChatMessaggio(params: {
  nomeUtente: string
  nomeAzienda: string
  testo: string
}) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  if (!superAdminEmail) return
  try {
    await getResend().emails.send({
      from: FROM,
      to: superAdminEmail,
      subject: `Nuovo messaggio da ${params.nomeUtente} - ${params.nomeAzienda}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1e40af">Nuovo messaggio chat 💬</h2>
          <p><strong>${params.nomeUtente}</strong> (${params.nomeAzienda}) ha scritto:</p>
          <div style="background:#f1f5f9;border-left:4px solid #3b82f6;padding:12px;margin-top:12px;border-radius:4px">
            ${params.testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://operohub.com'}/super-admin/chat"
             style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Rispondi nella chat
          </a>
        </div>`,
    })
  } catch (e) {
    console.error('[email] sendEmailChatMessaggio fallita', e)
  }
}
