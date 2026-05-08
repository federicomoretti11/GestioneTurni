import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HomeLogout } from '@/components/layout/HomeLogout'
import { Avatar } from '@/components/ui/Avatar'
import { Notifiche } from '@/components/layout/Notifiche'
import { Footer } from '@/components/layout/Footer'
import { isAnalyticsAbilitato } from '@/lib/impostazioni'

// ── Icone SVG ────────────────────────────────────────────────
const ICalendar = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" />
  </svg>
)
const IInbox = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 13l2.5-7.5A2 2 0 017.4 4h9.2a2 2 0 011.9 1.5L21 13" />
    <path d="M3 13h5l1.5 2.5h5L16 13h5v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z" />
  </svg>
)
const IDoc = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
)
const ISettings = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.4 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001 1.51H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const ISend = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)
const IExport = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
)
const IArrow = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)
const IUser = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)
const ITask = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
)

// ── Accents ──────────────────────────────────────────────────
const A = {
  blue:   { tint: '#EEF3FF', icon: '#3B5BDB', text: '#2A3FAE' },
  amber:  { tint: '#FBF3E5', icon: '#A87420', text: '#7C5414' },
  green:  { tint: '#ECF6F0', icon: '#2F8A55', text: '#206B40' },
  slate:  { tint: '#F1F2F4', icon: '#475569', text: '#334155' },
  violet: { tint: '#F3F0FF', icon: '#6741D9', text: '#4C2FA1' },
  teal:   { tint: '#E6F8F5', icon: '#0D9488', text: '#0A7A71' },
}
type AccentKey = keyof typeof A

// ── AreaCard ─────────────────────────────────────────────────
function AreaCard({ titolo, descrizione, href, IconComp, accent, badge }: {
  titolo: string; descrizione: string; href: string
  IconComp: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement
  accent: AccentKey; badge?: number
}) {
  const a = A[accent]
  return (
    <Link
      href={href}
      className="group block rounded-xl bg-white border border-slate-900/20 p-4 sm:p-5 hover:border-slate-300 transition-colors relative"
      style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ backgroundColor: a.tint, color: a.icon }}>
          <IconComp className="w-[18px] h-[18px]" />
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="text-[11px] font-semibold text-slate-400 tabular-nums">{badge}</span>
        )}
      </div>
      <div className="text-[15px] font-semibold tracking-tight text-slate-900">
        {titolo}
        {badge !== undefined && badge > 0 && (
          <span className="ml-1.5 text-[13px] font-normal text-slate-400">{badge}</span>
        )}
      </div>
      <div className="text-[12.5px] text-slate-500 mt-0.5">{descrizione}</div>
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1 text-[12px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
        Apri <IArrow className="w-3.5 h-3.5" />
      </div>
    </Link>
  )
}

// ── NudgeCard ────────────────────────────────────────────────
function NudgeCard({ accent, eyebrow, big, meta, ctaLabel, ctaHref, footer }: {
  accent: AccentKey; eyebrow: string; big: string; meta: string
  ctaLabel: string; ctaHref: string; footer?: string
}) {
  const a = A[accent]
  return (
    <div className="rounded-xl bg-white border border-slate-900/20 p-5" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: a.icon }} />
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: a.text }}>{eyebrow}</span>
          </div>
          <div className="text-[20px] font-semibold tracking-tight text-slate-900 leading-tight">{big}</div>
          <div className="text-[12.5px] text-slate-500 mt-1">{meta}</div>
        </div>
        <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: a.tint, color: a.icon }}>
          {accent === 'amber' ? <IInbox className="w-4 h-4" /> : <ICalendar className="w-4 h-4" />}
        </div>
      </div>
      {footer && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-[12px] text-slate-500">{footer}</div>
      )}
      <div className="mt-3">
        <Link href={ctaHref} className="text-[12.5px] font-medium inline-flex items-center gap-1" style={{ color: a.text }}>
          {ctaLabel} <IArrow className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

function saluto() {
  const h = new Date().getHours()
  if (h < 13) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// ── Page ─────────────────────────────────────────────────────
export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cognome, ruolo, is_super_admin')
    .eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { ruolo } = profile
  const isSuperAdmin = profile.is_super_admin === true
  const isAdmin = ruolo === 'admin' || isSuperAdmin
  const isManager = ruolo === 'manager'
  const isDipendente = ruolo === 'dipendente'

  // Analytics flag + turni mese corrente (solo admin)
  const analyticsAbilitato = isAdmin ? await isAnalyticsAbilitato() : false
  let turniMese = 0
  if (isAdmin && analyticsAbilitato) {
    const d = new Date()
    const meseInizio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const meseFine = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    const { count } = await supabase.from('turni').select('*', { count: 'exact', head: true })
      .eq('stato', 'confermato').gte('data', meseInizio).lte('data', meseFine)
    turniMese = count ?? 0
  }

  // Richieste in attesa
  let richiesteInAttesa = 0
  if (isAdmin || isManager) {
    const stati = isAdmin ? ['in_attesa', 'in_approvazione'] : ['in_attesa']
    const { count } = await supabase.from('richieste').select('*', { count: 'exact', head: true }).in('stato', stati)
    richiesteInAttesa = count ?? 0
  }

  // Prossimo turno dipendente
  type ProssimoTurno = { data: string; ora_inizio: string; ora_fine: string; template: { nome: string } | null }
  let prossimoTurno: ProssimoTurno | null = null
  if (isDipendente) {
    const oggi = new Date().toISOString().slice(0, 10)
    const { data: t } = await supabase
      .from('turni').select('data, ora_inizio, ora_fine, template:turni_template(nome, colore)')
      .eq('dipendente_id', user.id).eq('stato', 'confermato')
      .gte('data', oggi).order('data').order('ora_inizio').limit(1)
    if (t?.[0]) prossimoTurno = t[0] as unknown as ProssimoTurno
  }

  // Attività recente (richieste recenti con autore)
  type AttivitaItem = { id: string; tipo: string; stato: string; created_at: string; profiles: { nome: string; cognome: string } | null }
  let attivita: AttivitaItem[] = []
  if (isAdmin || isManager) {
    const { data } = await supabase
      .from('richieste')
      .select('id, tipo, stato, created_at, profiles:dipendente_id(nome, cognome)')
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) attivita = data as unknown as AttivitaItem[]
  }

  // Conteggio task
  let taskDaFare = 0
  let taskInCorso = 0
  let taskMiei = 0
  if (isAdmin || isManager) {
    const { data: tCounts } = await supabase
      .from('tasks')
      .select('stato')
    if (tCounts) {
      taskDaFare = tCounts.filter(t => t.stato === 'da_fare').length
      taskInCorso = tCounts.filter(t => t.stato === 'in_corso').length
    }
  }
  if (isDipendente) {
    const { count } = await supabase
      .from('task_assegnazioni')
      .select('*', { count: 'exact', head: true })
      .eq('dipendente_id', user.id)
    taskMiei = count ?? 0
  }

  // Dati operativi giornalieri (solo admin — sostituisce dashboard)
  type TurnoOggiType = {
    id: string; ora_inizio: string; ora_fine: string
    profile: { nome: string; cognome: string }
    template: { colore?: string; nome?: string } | null
    posto: { nome: string } | null
  }
  let turniOggi: TurnoOggiType[] = []
  if (isAdmin) {
    const todayISO = new Date().toISOString().slice(0, 10)
    const { data: tOggi } = await supabase
      .from('turni')
      .select('id, ora_inizio, ora_fine, profile:profiles!turni_dipendente_id_fkey(nome, cognome), template:turni_template(colore, nome), posto:posti_di_servizio(nome)')
      .eq('stato', 'confermato').eq('data', todayISO).order('ora_inizio')
    turniOggi = (tOggi ?? []) as unknown as TurnoOggiType[]
  }

  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  // Area cards per ruolo
  type AreaDef = {
    titolo: string; descrizione: string; href: string
    IconComp: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement
    accent: AccentKey; badge?: number
  }

  const taskDescAdmin = taskInCorso > 0 || taskDaFare > 0
    ? `${taskInCorso} in corso · ${taskDaFare} da fare`
    : 'Nessun task aperto al momento.'

  const aree: AreaDef[] = isAdmin
    ? [
        { titolo: 'Turni',          descrizione: 'Visualizza e gestisci i turni.',       href: '/admin/calendario',                 IconComp: ICalendar, accent: 'blue' },
        { titolo: 'Pianificazione', descrizione: 'Programma i turni settimanali.',      href: '/admin/calendario-programmazione',  IconComp: IDoc,      accent: 'violet' },
        { titolo: 'Richieste',      descrizione: 'Approva ferie, permessi, cambi.',     href: '/admin/richieste',                  IconComp: IInbox,    accent: 'amber', badge: richiesteInAttesa || undefined },
        { titolo: 'Task',           descrizione: taskDescAdmin,                          href: '/admin/task',                       IconComp: ITask,     accent: 'teal',  badge: taskInCorso || undefined },
        { titolo: 'Documenti',      descrizione: 'Carica e distribuisci documenti.',    href: '/admin/documenti',                  IconComp: IDoc,      accent: 'slate' },
        { titolo: 'Impostazioni',   descrizione: 'Persone, ruoli, sedi, integrazioni.', href: '/admin/impostazioni',               IconComp: ISettings, accent: 'slate' },
      ]
    : isManager
    ? [
        { titolo: 'Calendario',     descrizione: 'Visualizza e modifica i turni.',    href: '/manager/calendario',                  IconComp: ICalendar, accent: 'blue' },
        { titolo: 'Richieste',      descrizione: 'Approva ferie e cambi turno.',      href: '/manager/richieste',                   IconComp: IInbox,    accent: 'amber', badge: richiesteInAttesa || undefined },
        { titolo: 'Task',           descrizione: taskDescAdmin,                        href: '/manager/task',                        IconComp: ITask,     accent: 'teal',  badge: taskInCorso || undefined },
        { titolo: 'Programmazione', descrizione: 'Pianifica i turni settimanali.',    href: '/manager/calendario-programmazione',   IconComp: IDoc,      accent: 'slate' },
        { titolo: 'Export',         descrizione: 'Report turni in PDF, Excel, CSV.',  href: '/manager/export',                      IconComp: IExport,   accent: 'teal' },
      ]
    : [
        { titolo: 'I miei turni', descrizione: 'Il tuo calendario turni.',                                  href: '/dipendente/turni',     IconComp: ICalendar, accent: 'blue' },
        { titolo: 'Richieste',    descrizione: 'Ferie, permessi e cambi turno.',                            href: '/dipendente/richieste', IconComp: ISend,     accent: 'amber' },
        { titolo: 'Task',         descrizione: taskMiei > 0 ? `${taskMiei} task assegnati a te` : 'Nessun task assegnato.', href: '/dipendente/task', IconComp: ITask, accent: 'teal', badge: taskMiei || undefined },
        { titolo: 'Profilo',      descrizione: 'I tuoi dati personali.',                                    href: '/dipendente/profilo',   IconComp: IUser,     accent: 'violet' },
      ]

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m} min fa`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h fa`
    return `${Math.floor(h / 24)} giorni fa`
  }

  function tipoLabel(tipo: string) {
    if (tipo === 'ferie') return 'ha richiesto ferie'
    if (tipo === 'permesso') return 'ha richiesto un permesso'
    if (tipo === 'cambio_turno') return 'ha richiesto cambio turno'
    if (tipo === 'malattia') return 'ha segnalato malattia'
    return 'ha inviato una richiesta'
  }

  const accentAttivita: AccentKey[] = ['amber', 'blue', 'green', 'slate', 'violet']

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col" style={{ backgroundImage: 'url(/circuit-pattern.svg)', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>

      {/* ── TopBar ── */}
      <div className="h-20 bg-white/80 backdrop-blur border-b border-slate-200/70 flex items-center px-4 md:px-6 sticky top-0 z-30">
        {/* Sinistra: ruolo */}
        <div className="flex items-center shrink-0 w-1/3">
          <span className="text-[13px] text-slate-500 capitalize">{isSuperAdmin ? 'Super Admin' : ruolo}</span>
        </div>

        {/* Centro: logo */}
        <div className="flex-1 flex justify-center">
          <img src="/logo-extended-dark.svg" alt="Opero Hub" className="h-16 w-auto" />
        </div>

        {/* Destra: notifiche + avatar + logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-1/3 justify-end">
          <Notifiche userId={user.id} ruolo={ruolo} />
          <Avatar nome={profile.nome} cognome={profile.cognome} size={28} />
          <HomeLogout />
        </div>
      </div>

      {/* ── Contenuto ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 md:pt-10 pb-8">

        {/* Greeting */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-[36px] leading-tight font-semibold tracking-tight text-slate-900">
            {saluto()}, {profile.nome} 👋
          </h1>
          <p className="text-[12px] sm:text-[13px] text-slate-400 mt-1 capitalize">{oggi}</p>
        </div>

        {/* Layout principale: sinistra + destra */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

          {/* ── Colonna sinistra (2/3) ── */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">

{isDipendente && prossimoTurno && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NudgeCard
                  accent="blue"
                  eyebrow="Prossimo turno"
                  big={`${prossimoTurno.ora_inizio.slice(0,5)} — ${prossimoTurno.ora_fine.slice(0,5)}`}
                  meta={new Date(prossimoTurno.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  ctaLabel="Vedi turni"
                  ctaHref="/dipendente/turni"
                  footer={prossimoTurno.template?.nome ?? undefined}
                />
                <NudgeCard
                  accent="green"
                  eyebrow="Richieste"
                  big="Le tue richieste"
                  meta="Invia ferie, permessi o cambi turno"
                  ctaLabel="Vai alle richieste"
                  ctaHref="/dipendente/richieste"
                />
              </div>
            )}

            {isDipendente && !prossimoTurno && (
              <NudgeCard
                accent="slate"
                eyebrow="Turni"
                big="Nessun turno programmato"
                meta="Non hai turni confermati nei prossimi giorni"
                ctaLabel="Vedi calendario"
                ctaHref="/dipendente/turni"
              />
            )}

            {/* Aree */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {aree.map(a => <AreaCard key={a.href} {...a} />)}
            </div>

          </div>

          {/* ── Colonna destra (1/3) ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Turni di oggi — solo admin */}
            {isAdmin && (
              <div className="rounded-xl bg-white border border-slate-900/20 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-[12px] uppercase tracking-[0.14em] font-semibold text-slate-400">Turni di oggi</h3>
                  <span className="text-[12px] font-mono text-slate-400">{turniOggi.length}</span>
                </div>
                {turniOggi.length === 0 ? (
                  <p className="text-[13px] text-slate-400 px-4 py-4">Nessun turno confermato oggi.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {turniOggi.slice(0, 6).map(t => (
                      <li key={t.id} className="px-4 py-2.5 flex items-center gap-2.5">
                        <Avatar nome={t.profile.nome} cognome={t.profile.cognome} size={26} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-800 truncate">{t.profile.cognome} {t.profile.nome}</p>
                          <p className="text-[11px] text-slate-400">{t.ora_inizio.slice(0,5)}–{t.ora_fine.slice(0,5)}{t.posto?.nome ? ` · ${t.posto.nome}` : ''}</p>
                        </div>
                        {t.template?.colore && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.template.colore }} />
                        )}
                      </li>
                    ))}
                    {turniOggi.length > 6 && (
                      <li className="px-4 py-2.5">
                        <Link href="/admin/calendario" className="text-[12px] text-slate-500 hover:text-slate-800">
                          +{turniOggi.length - 6} altri →
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {/* Attività recente — solo manager e dipendente */}
            {!isAdmin && (
              <div className="rounded-xl bg-white border border-slate-900/20 p-4 md:p-5" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[12px] uppercase tracking-[0.14em] font-semibold text-slate-400">Attività recente</h3>
                  {isManager && (
                    <Link href="/manager/richieste" className="text-[12px] text-slate-500 hover:text-slate-800">Tutto</Link>
                  )}
                </div>
                {attivita.length > 0 ? (
                  <ul className="space-y-1">
                    {attivita.map((a, i) => (
                      <li key={a.id} className="py-2.5 border-t border-slate-100 first:border-t-0">
                        <div className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: A[accentAttivita[i % 5]].icon }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] text-slate-800 font-medium">{a.profiles?.nome} {a.profiles?.cognome}</span>
                            <span className="text-[13px] text-slate-500"> {tipoLabel(a.tipo)}</span>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{timeAgo(a.created_at)}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : isDipendente ? (
                  <div className="space-y-3">
                    <p className="text-[13px] text-slate-500">Le tue ultime azioni appariranno qui.</p>
                    <Link href="/dipendente/richieste" className="text-[12.5px] font-medium inline-flex items-center gap-1" style={{ color: A.blue.text }}>
                      Vai alle richieste <IArrow className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <p className="text-[13px] text-slate-400">Nessuna attività recente.</p>
                )}
              </div>
            )}

            {/* Da approvare */}
            {(isAdmin || isManager) && (
              <NudgeCard
                accent="amber"
                eyebrow="Da approvare"
                big={richiesteInAttesa > 0 ? `${richiesteInAttesa} richieste in attesa` : 'Nessuna richiesta'}
                meta={richiesteInAttesa > 0 ? 'Ferie, permessi o cambi turno da rivedere' : 'Tutto in ordine al momento'}
                ctaLabel="Apri richieste"
                ctaHref={isAdmin ? '/admin/richieste' : '/manager/richieste'}
              />
            )}

            {/* Analytics */}
            {isAdmin && analyticsAbilitato && (
              <NudgeCard
                accent="teal"
                eyebrow="Analytics"
                big={turniMese > 0 ? `${turniMese} turni questo mese` : 'Nessun turno questo mese'}
                meta="Ore, presenze e anomalie GPS"
                ctaLabel="Apri analytics"
                ctaHref="/admin/analytics"
              />
            )}

          </div>

        </div>
      </div>
      <Footer />
    </div>
  )
}
