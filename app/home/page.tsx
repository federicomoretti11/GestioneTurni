import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HomeLogout } from '@/components/layout/HomeLogout'
import { Logo } from '@/components/ui/Logo'

function saluto() {
  const h = new Date().getHours()
  if (h < 13) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function ModuloCard({
  icon, titolo, descrizione, href, colore, badge,
}: {
  icon: string; titolo: string; descrizione: string; href: string; colore: string; badge?: number
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
    >
      <div className={`w-11 h-11 rounded-xl ${colore} flex items-center justify-center text-xl`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{titolo}</p>
        <p className="text-sm text-gray-500 mt-0.5 leading-snug">{descrizione}</p>
      </div>
      {!!badge && (
        <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

type Modulo = { icon: string; titolo: string; descrizione: string; href: string; colore: string; badge?: number }

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cognome, ruolo, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { ruolo } = profile
  const isSuperAdmin = profile.is_super_admin === true
  const isAdmin = ruolo === 'admin' || isSuperAdmin

  // Richieste in attesa per admin/manager
  let richiesteInAttesa = 0
  if (isAdmin || ruolo === 'manager') {
    const stati = isAdmin ? ['in_attesa', 'in_approvazione'] : ['in_attesa']
    const { count } = await supabase
      .from('richieste')
      .select('*', { count: 'exact', head: true })
      .in('stato', stati)
    richiesteInAttesa = count ?? 0
  }

  // Prossimo turno per dipendente
  type ProssimoTurno = { data: string; ora_inizio: string; ora_fine: string; template: { nome: string; colore: string } | null }
  let prossimoTurno: ProssimoTurno | null = null
  if (ruolo === 'dipendente') {
    const oggi = new Date().toISOString().slice(0, 10)
    const { data: t } = await supabase
      .from('turni')
      .select('data, ora_inizio, ora_fine, template:turni_template(nome, colore)')
      .eq('dipendente_id', user.id)
      .eq('stato', 'confermato')
      .gte('data', oggi)
      .order('data')
      .order('ora_inizio')
      .limit(1)
    if (t?.[0]) prossimoTurno = t[0] as unknown as ProssimoTurno
  }

  const moduli: Modulo[] = isAdmin
    ? [
        { icon: '📅', titolo: 'Turni',        descrizione: 'Pianifica e gestisci i calendari',      href: '/admin/dashboard',    colore: 'bg-blue-50' },
        { icon: '📋', titolo: 'Richieste',     descrizione: 'Approva ferie, permessi e cambi turno', href: '/admin/richieste',    colore: 'bg-amber-50', badge: richiesteInAttesa },
        { icon: '🗄️', titolo: 'Documenti',     descrizione: 'Archivio documenti aziendali',           href: '/admin/documenti',    colore: 'bg-slate-50' },
        { icon: '📤', titolo: 'Export',         descrizione: 'Report turni in PDF, Excel e CSV',       href: '/admin/export',       colore: 'bg-emerald-50' },
        { icon: '👥', titolo: 'Dipendenti',     descrizione: 'Gestione utenti e ruoli',                href: '/admin/utenti',       colore: 'bg-violet-50' },
        { icon: '⚙️', titolo: 'Impostazioni',  descrizione: 'Configurazione e preferenze',             href: '/admin/impostazioni', colore: 'bg-gray-50' },
      ]
    : ruolo === 'manager'
    ? [
        { icon: '📅', titolo: 'Calendario',     descrizione: 'Visualizza e modifica i turni',          href: '/manager/calendario',                  colore: 'bg-blue-50' },
        { icon: '📋', titolo: 'Richieste',      descrizione: 'Approva ferie, permessi e cambi turno',  href: '/manager/richieste',                   colore: 'bg-amber-50', badge: richiesteInAttesa },
        { icon: '📝', titolo: 'Programmazione', descrizione: 'Pianifica i turni settimanali',           href: '/manager/calendario-programmazione',   colore: 'bg-indigo-50' },
        { icon: '📤', titolo: 'Export',          descrizione: 'Report turni in PDF, Excel e CSV',       href: '/manager/export',                      colore: 'bg-emerald-50' },
      ]
    : [
        { icon: '📅', titolo: 'I miei turni', descrizione: 'Visualizza il tuo calendario turni',  href: '/dipendente/turni',    colore: 'bg-blue-50' },
        { icon: '✉️', titolo: 'Richieste',    descrizione: 'Invia richieste di ferie e permessi', href: '/dipendente/richieste', colore: 'bg-amber-50' },
        { icon: '👤', titolo: 'Profilo',       descrizione: 'I tuoi dati personali',               href: '/dipendente/profilo',  colore: 'bg-violet-50' },
      ]

  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header gradient */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-500 px-5 pt-8 pb-16 relative">
        {/* Logout in alto a destra */}
        <div className="absolute top-4 right-5">
          <HomeLogout />
        </div>
        {/* Logo centrato */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logo size={64} variant="white" />
          <span className="text-white font-bold text-2xl tracking-tight">Opero Hub</span>
        </div>
        <p className="text-white/60 text-[13px] capitalize text-center">{oggi}</p>
        <h1 className="text-xl font-bold text-white mt-1 text-center">
          {saluto()}, {profile.nome} 👋
        </h1>
        <p className="text-white/50 text-sm mt-1 capitalize text-center">
          {isSuperAdmin ? 'Super Admin' : ruolo}
        </p>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 -mt-8 pb-12 max-w-2xl mx-auto">

        {/* Banner prossimo turno (dipendente) */}
        {prossimoTurno && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
              ⏰
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Prossimo turno</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {new Date(prossimoTurno.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}
                {' · '}{prossimoTurno.ora_inizio.slice(0, 5)}–{prossimoTurno.ora_fine.slice(0, 5)}
              </p>
              {prossimoTurno.template?.nome && (
                <p className="text-xs text-gray-400 mt-0.5">{prossimoTurno.template.nome}</p>
              )}
            </div>
          </div>
        )}

        {/* Banner richieste in attesa (admin/manager) */}
        {richiesteInAttesa > 0 && (
          <Link
            href={isAdmin ? '/admin/richieste' : '/manager/richieste'}
            className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 hover:bg-amber-100 transition-colors"
          >
            <span className="text-amber-500 text-lg">🔔</span>
            <p className="text-sm font-semibold text-amber-800">
              {richiesteInAttesa === 1
                ? '1 richiesta in attesa di approvazione'
                : `${richiesteInAttesa} richieste in attesa di approvazione`}
            </p>
          </Link>
        )}

        {/* Griglia moduli */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {moduli.map(m => <ModuloCard key={m.href} {...m} />)}
        </div>
      </div>
    </div>
  )
}
