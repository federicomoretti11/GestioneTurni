// app/page.tsx
import DemoForm from './_components/DemoForm'
import { HeroCalendar } from './_components/HeroCalendar'

export const metadata = {
  title: 'Opero Hub — Gestione turni per PMI italiane',
  description: 'Turni, presenze, ferie e documenti in un solo posto. La piattaforma operativa per piccole e medie imprese italiane.',
}

export default function LandingPage() {
  return (
    <div className="bg-[#FAFAF8] text-slate-900">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-30 bg-[#FAFAF8]/85 backdrop-blur border-b hairline">
        <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <a href="#">
            <img src="/logo-extended-dark.svg" alt="Opero Hub" height={36} width={167} />
          </a>

          <ul className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <li><a href="#funzionalita" className="hover:text-slate-900 transition">Funzionalità</a></li>
            <li><a href="#prezzi" className="hover:text-slate-900 transition">Prezzi</a></li>
            <li><a href="#faq" className="hover:text-slate-900 transition">FAQ</a></li>
            <li><a href="#contatti" className="hover:text-slate-900 transition">Contatti</a></li>
          </ul>

          <div className="flex items-center gap-2">
            <a href="/login" className="hidden sm:inline-flex items-center h-9 px-3.5 text-sm text-slate-700 hover:text-slate-900 transition">Accedi</a>
            <a href="#demo" className="inline-flex items-center h-9 px-3.5 rounded-md bg-brand-dark text-white text-sm font-medium hover:opacity-90 transition">
              <span className="hidden sm:inline">Richiedi una demo</span>
              <span className="sm:hidden">Demo</span>
            </a>
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="hidden lg:block absolute right-0 top-24 w-[420px] h-[420px] dot-grid opacity-60 pointer-events-none"
          style={{ maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)' }}
        />

        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-16 sm:pb-24 relative">
          <div className="inline-flex items-center gap-2 mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
            <span className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Operations platform · Italia</span>
          </div>

          <h1 className="max-w-3xl text-[40px] leading-[1.05] sm:text-6xl sm:leading-[1.02] tracking-tight text-slate-900">
            Gestisci il tuo team,<br/>
            <span className="serif text-slate-900">senza</span> caos.
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
            Turni, presenze, ferie e documenti in un solo posto. Opero Hub semplifica le operazioni quotidiane delle PMI italiane — dall&apos;assegnazione del turno all&apos;export per il commercialista.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
            <a href="#demo" className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-brand-blue text-white text-sm font-medium hover:opacity-90 transition shadow-sm">
              Richiedi una demo
              <svg aria-hidden="true" className="ml-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M13 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="/login" className="inline-flex items-center justify-center h-11 px-5 rounded-md border hairline bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 transition">
              Accedi alla piattaforma
            </a>
          </div>

          <div className="mt-14 sm:mt-20 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-slate-500">
            <span className="mono uppercase tracking-[0.16em] text-slate-400">Usato da team di</span>
            <span className="text-slate-600">Vigilanza</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Ristorazione</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Retail</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Logistica</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Facility management</span>
          </div>
        </div>

        {/* Hero product mockup — calendario animato */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="rounded-xl border hairline bg-white overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-2 px-4 h-9 border-b hairline bg-slate-50/60">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="ml-3 mono text-[11px] text-slate-400">operohub.com</span>
            </div>
            <HeroCalendar />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funzionalita" className="border-t hairline bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ Funzionalità</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Tutto quello che serve, <span className="serif">niente di più.</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Moduli pensati per chi gestisce piccoli e medi team operativi. Configurazione in meno di un&apos;ora, zero consulenti IT.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border hairline rounded-xl overflow-hidden">
            {[
              {
                icon: (<><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></>),
                title: 'Turni & Calendario',
                body: 'Pianifica turni settimanali con drag & drop, copia settimane, pubblica con un click. Vista per dipendente o per posto di servizio.',
              },
              {
                icon: (<><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></>),
                title: 'Timbrature GPS',
                body: 'Entrata e uscita dal telefono, con verifica della posizione sul posto di servizio. Badge visuale in tempo reale sulla griglia turni.',
              },
              {
                icon: (<><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 9.5"/></>),
                title: 'Richieste & approvazioni',
                body: 'Ferie, permessi, malattia e cambio turno con catena di approvazione manager → admin. Notifiche automatiche ad ogni passaggio.',
              },
              {
                icon: (<><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></>),
                title: 'Cedolini & documenti',
                body: 'Carica buste paga e documenti aziendali in modo sicuro. Ogni dipendente accede solo ai propri file, da qualsiasi dispositivo.',
              },
              {
                icon: (<><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16V11"/><path d="M13 16V8"/><path d="M18 16v-3"/></>),
                title: 'Analytics & export',
                body: 'Ore lavorate, presenze, straordinari e costi per dipendente. Export CSV pronto per il commercialista o il gestionale paghe.',
              },
              {
                icon: (<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>),
                title: 'Task & comunicazioni',
                body: 'Assegna task con scadenze e priorità, commenta con menzioni. Notifiche in-app e via email per tutto il team.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="bg-white p-7 sm:p-9">
                <div className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-dark text-white shrink-0">
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {icon}
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <p className="mt-2 text-slate-600 leading-relaxed text-[15px]">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pain points — icone SVG come le feature card */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>),
                title: 'Basta fogli Excel',
                body: 'Turni copiati, cancellati, smarriti. Un calendario condiviso e sempre aggiornato, accessibile da qualsiasi dispositivo.',
              },
              {
                icon: (<><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></>),
                title: 'Timbrature senza carta',
                body: 'I dipendenti timbrano entrata e uscita dal telefono, con validazione GPS opzionale. Niente fogli firma, niente manomissioni.',
              },
              {
                icon: (<><rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/><path d="M8.5 15.5l2.5 2L16 12"/></>),
                title: 'Ferie e permessi tracciati',
                body: 'Niente richieste via WhatsApp dimenticate. Ogni richiesta ha un flusso di approvazione chiaro e uno storico consultabile.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex gap-4 items-start p-6 bg-slate-50 rounded-xl border hairline">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-dark text-white shrink-0 mt-0.5">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {icon}
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UI PERSONALIZZABILE ── */}
      <section className="border-t hairline">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
            <div>
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ Personalizzazione</div>
              <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
                La tua piattaforma,<br/><span className="serif">il tuo brand.</span>
              </h2>
              <p className="mt-5 text-slate-600 leading-relaxed">
                Subdomain dedicato, logo aziendale e palette colori personalizzata. L&apos;esperienza Opero Hub si adatta alla tua identità, non il contrario.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  'Logo e nome azienda in ogni pagina',
                  'Colori primari personalizzati',
                  'Subdomain dedicato (tuaazienda.operohub.com)',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <svg aria-hidden="true" className="shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mockup due skin affiancati */}
            <div className="flex gap-4">
              {/* Skin 1 — navy */}
              <div className="flex-1 rounded-xl border hairline overflow-hidden shadow-[0_4px_24px_-8px_rgba(15,23,42,0.14)]">
                <div className="flex items-center gap-1.5 px-3 h-7 bg-slate-100 border-b hairline">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                </div>
                <div className="flex min-h-[180px]">
                  <div className="w-[52px] bg-[#0f172a] p-2 flex flex-col gap-1.5">
                    <div className="w-full h-5 rounded bg-white/10 flex items-center justify-center">
                      <span className="text-[6px] font-bold text-white/70 tracking-widest">AZ</span>
                    </div>
                    <div className="h-0.5 bg-white/10 rounded my-0.5"></div>
                    {[1,2,3,4].map(i => <div key={i} className="h-4 rounded bg-white/10 w-full" />)}
                  </div>
                  <div className="flex-1 bg-white p-3 space-y-2">
                    <div className="h-3 w-20 rounded bg-slate-200" />
                    <div className="h-2 w-28 rounded bg-slate-100" />
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="h-8 rounded bg-slate-100" />)}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 border-t hairline">
                  <span className="mono text-[9px] uppercase tracking-[0.14em] text-slate-400">Tema scuro</span>
                </div>
              </div>

              {/* Skin 2 — indigo/brand */}
              <div className="flex-1 rounded-xl border hairline overflow-hidden shadow-[0_4px_24px_-8px_rgba(15,23,42,0.14)]">
                <div className="flex items-center gap-1.5 px-3 h-7 bg-slate-100 border-b hairline">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                </div>
                <div className="flex min-h-[180px]">
                  <div className="w-[52px] bg-indigo-600 p-2 flex flex-col gap-1.5">
                    <div className="w-full h-5 rounded bg-white/20 flex items-center justify-center">
                      <span className="text-[6px] font-bold text-white/90 tracking-widest">MN</span>
                    </div>
                    <div className="h-0.5 bg-white/20 rounded my-0.5"></div>
                    {[1,2,3,4].map(i => <div key={i} className={`h-4 rounded w-full ${i===1?'bg-white/30':'bg-white/15'}`} />)}
                  </div>
                  <div className="flex-1 bg-white p-3 space-y-2">
                    <div className="h-3 w-20 rounded bg-slate-200" />
                    <div className="h-2 w-28 rounded bg-slate-100" />
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {[1,2,3,4,5,6].map(i => <div key={i} className={`h-8 rounded ${i===1?'bg-indigo-100':'bg-slate-100'}`} />)}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 border-t hairline">
                  <span className="mono text-[9px] uppercase tracking-[0.14em] text-slate-400">Tema brand</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t hairline bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ Come funziona</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Tre passi e <span className="serif">sei operativo.</span>
            </h2>
          </div>

          <ol className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { n: '01', tag: 'Configura', title: 'Imposta sedi e team', body: 'Aggiungi le sedi, definisci ruoli e orari standard. Invita i collaboratori via email in pochi minuti.' },
              { n: '02', tag: 'Assegna', title: 'Pianifica i turni', body: 'Crea il calendario settimanale, assegna i turni e pubblica. Ogni dipendente riceve notifica della propria pianificazione.' },
              { n: '03', tag: 'Monitora', title: 'Controlla e approva', body: "Approva richieste, verifica presenze in tempo reale ed esporta i report. Tutto in un’unica dashboard." },
            ].map(({ n, tag, title, body }) => (
              <li key={n} className="relative rounded-xl border hairline bg-slate-50/60 p-7">
                <div className="flex items-baseline justify-between">
                  <span className="serif text-5xl text-slate-900 leading-none">{n}</span>
                  <span className="mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{tag}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── TRE INTERFACCE ── */}
      <section className="border-t hairline">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ Ruoli</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Tre interfacce, <span className="serif">un&apos;unica piattaforma.</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Ogni ruolo vede solo ciò che gli serve. Nessuna complessità inutile, nessuna funzione nascosta.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                role: 'Admin',
                color: 'bg-brand-dark',
                icon: (<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M19 8l2 2-2 2M21 10h-4"/></>),
                desc: 'Controllo totale sull\'azienda',
                items: ['Gestione dipendenti e ruoli', 'Impostazioni piattaforma e branding', 'Analytics e report completi', 'Configurazione turni e sedi', 'Export paghe e presenze'],
              },
              {
                role: 'Manager',
                color: 'bg-indigo-600',
                icon: (<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
                desc: 'Supervisione del team operativo',
                items: ['Pianificazione e pubblicazione turni', 'Approvazione richieste ferie e permessi', 'Monitoraggio presenze in tempo reale', 'Verifica timbrature', 'Assegnazione e gestione task'],
              },
              {
                role: 'Dipendente',
                color: 'bg-emerald-600',
                icon: (<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>),
                desc: 'La propria area personale',
                items: ['Visualizzazione turni personali', 'Timbratura entrata/uscita', 'Richieste ferie, permessi e malattia', 'Accesso cedolini e documenti', 'Task e comunicazioni team'],
              },
            ].map(({ role, color, icon, desc, items }) => (
              <div key={role} className="rounded-xl border hairline bg-white p-7 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${color} text-white shrink-0`}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {icon}
                    </svg>
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-slate-900">{role}</div>
                    <div className="text-[12px] text-slate-500">{desc}</div>
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {items.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <svg aria-hidden="true" className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="prezzi" className="border-t hairline bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ Prezzi</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Semplice, <span className="serif">senza sorprese.</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Prezzo fisso mensile, indipendentemente da quante volte usi la piattaforma. Nessun costo nascosto, nessun vincolo annuale.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Starter */}
            <div className="rounded-xl border hairline bg-white p-7 sm:p-8 flex flex-col">
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-3">Starter</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">€49</span>
                <span className="text-slate-500 text-sm">/mese</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Fino a 15 dipendenti</p>
              <div className="mt-6 border-t hairline pt-6 space-y-3 flex-1">
                {['Turni e calendario','Timbrature GPS','Richieste ferie e permessi','Notifiche in-app ed email','Export CSV'].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <svg aria-hidden="true" className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#demo" className="mt-8 inline-flex items-center justify-center h-10 px-5 rounded-md border border-slate-900 text-slate-900 text-sm font-medium hover:bg-slate-50 transition">Richiedi una demo</a>
            </div>

            {/* Professional */}
            <div className="pricing-featured rounded-xl p-7 sm:p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center h-6 px-3 rounded-full bg-brand-blue text-white text-[11px] font-medium mono uppercase tracking-[0.12em]">Più funzionale</span>
              </div>
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-3">Professional</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">€99</span>
                <span className="text-slate-400 text-sm">/mese</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Fino a 50 dipendenti</p>
              <div className="mt-6 border-t border-slate-700 pt-6 space-y-3 flex-1">
                {['Tutto di Starter','Cedolini e documenti','Task management','Analytics & consuntivi paghe','Contatori ferie / ROL','Contratti e straordinari automatici'].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <svg aria-hidden="true" className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#demo" className="mt-8 inline-flex items-center justify-center h-10 px-5 rounded-md bg-brand-blue text-white text-sm font-medium hover:opacity-90 transition">Richiedi una demo</a>
            </div>

            {/* Enterprise */}
            <div className="rounded-xl border hairline bg-white p-7 sm:p-8 flex flex-col">
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-3">Enterprise</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">Su richiesta</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Oltre 50 dipendenti</p>
              <div className="mt-6 border-t hairline pt-6 space-y-3 flex-1">
                {['Tutto di Professional','AI Copilot per la pianificazione','White label (dominio personalizzato)','Fabbisogno staffing','Onboarding e supporto dedicato'].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <svg aria-hidden="true" className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {f}
                  </div>
                ))}
              </div>
              <a href="#demo" className="mt-8 inline-flex items-center justify-center h-10 px-5 rounded-md border border-slate-900 text-slate-900 text-sm font-medium hover:bg-slate-50 transition">Contattaci</a>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Tutti i piani includono subdomain dedicato, SSL, backup giornalieri e aggiornamenti automatici. Nessun contratto annuale obbligatorio.
          </p>
        </div>
      </section>

      {/* ── SUPPORTO BANNER ── */}
      <section className="border-t hairline bg-brand-dark text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white shrink-0">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </span>
                <span className="mono text-[11px] uppercase tracking-[0.18em] text-slate-400">/ Supporto</span>
              </div>
              <h2 className="text-2xl sm:text-3xl tracking-tight">
                Il team Opero Hub <span className="serif text-white/90">è al tuo fianco.</span>
              </h2>
              <p className="mt-3 text-slate-300 max-w-xl leading-relaxed">
                Dalla configurazione iniziale all&apos;uso quotidiano, hai sempre qualcuno con cui parlare. Non un bot, non un ticket da aspettare settimane.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-4 md:gap-3 shrink-0">
              {[
                { icon: <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>, text: 'Risposta entro 24h lavorative' },
                { icon: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>, text: 'Supporto via chat ed email' },
                { icon: <><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></>, text: 'Onboarding guidato incluso' },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <svg aria-hidden="true" className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-t hairline">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">/ FAQ</div>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-slate-900">
              Domande <span className="serif">frequenti.</span>
            </h2>
          </div>

          <div className="mt-12 max-w-3xl space-y-3">
            {[
              { q: "I dipendenti devono installare un'app?", a: "No. Opero Hub è una web app che funziona su qualsiasi browser, da smartphone o PC. I dipendenti ricevono un link via email e accedono senza installare nulla." },
              { q: "Serve un reparto IT per configurarlo?", a: "Assolutamente no. La configurazione iniziale richiede circa 30–60 minuti: aggiungi i dipendenti, definisci i posti di servizio e sei pronto. Durante la demo ti accompagniamo passo per passo." },
              { q: "Posso importare i dati da Excel?", a: "Sì. Puoi importare l'elenco dei dipendenti tramite CSV. Per i turni storici, durante l'onboarding valutiamo insieme la migrazione più adatta alla tua situazione." },
              { q: "I dati della mia azienda sono al sicuro?", a: "Ogni azienda ha un ambiente completamente isolato (multi-tenant con RLS a livello database). I dati sono ospitati su infrastruttura europea, con backup giornalieri e connessioni cifrate." },
              { q: "Posso disdire quando voglio?", a: "Sì, nessun vincolo contrattuale. Puoi disdire in qualsiasi momento dalla dashboard. Prima della disdetta puoi esportare tutti i tuoi dati in formato CSV." },
              { q: "Come funziona la demo?", a: "Compila il modulo con i tuoi dati e una breve descrizione della tua azienda. Ti ricontattiamo noi entro 24 ore lavorative per organizzare una call illustrativa, senza fretta e senza impegno." },
            ].map(({ q, a }) => (
              <details key={q} className="faq-item rounded-xl border hairline bg-white overflow-hidden">
                <summary className="flex items-center justify-between p-6 gap-4">
                  <span className="font-semibold text-slate-900">{q}</span>
                  <span aria-hidden="true" className="faq-icon shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-lg font-light">+</span>
                </summary>
                <div className="px-6 pb-6 text-[15px] text-slate-600 leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO CTA ── */}
      <section id="demo" className="border-t hairline bg-brand-dark text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
            <div>
              <div className="mono text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-4">/ Inizia oggi</div>
              <h2 className="text-3xl sm:text-5xl tracking-tight">
                Pronto a mettere ordine? <span className="serif text-white/90">Iniziamo.</span>
              </h2>
              <p className="mt-5 text-slate-300 max-w-lg leading-relaxed">
                Compila il modulo con i tuoi dati. Ti ricontatteremo noi per organizzare una call illustrativa, così possiamo capire insieme le esigenze della tua azienda e mostrarti la piattaforma nel modo più utile.
              </p>
              <ul className="mt-6 space-y-2">
                {['Nessuna carta di credito richiesta','Ti ricontattiamo entro 24 ore lavorative','Call su misura per il tuo settore'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#045dcc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 sm:p-7">
              <DemoForm />
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Inviando la richiesta accetti la nostra{' '}
                <a href="/privacy" className="underline decoration-slate-600 hover:text-white">Privacy Policy</a>.
                {' '}Niente spam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contatti" className="bg-[#FAFAF8] border-t hairline">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-2 flex flex-col items-center text-center">
              <a href="#">
                <img src="/LOGO COMPATTO.svg" alt="Opero Hub" width={200} height={126} />
              </a>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed max-w-xs">
                La piattaforma di gestione turni e operazioni per PMI italiane.
              </p>
              <div className="mt-5 mono text-[10px] uppercase tracking-[0.16em] text-slate-400 leading-relaxed">
                S.I.A. S.r.l.s.<br/>
                P.IVA 14840881008
              </div>
            </div>

            <div>
              <div className="mono text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-4">Prodotto</div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li><a href="#funzionalita" className="hover:text-slate-900">Funzionalità</a></li>
                <li><a href="#prezzi" className="hover:text-slate-900">Prezzi</a></li>
                <li><a href="#faq" className="hover:text-slate-900">FAQ</a></li>
                <li><a href="/login" className="hover:text-slate-900">Accedi</a></li>
              </ul>
            </div>

            <div>
              <div className="mono text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-4">Legale</div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li><a href="/privacy" className="hover:text-slate-900">Privacy Policy</a></li>
                <li><a href="/cookie-policy" className="hover:text-slate-900">Cookie Policy</a></li>
                <li><a href="mailto:info@operohub.com" className="hover:text-slate-900">info@operohub.com</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="mono text-[11px] uppercase tracking-[0.16em] text-slate-400">© 2026 Opero Hub — Tutti i diritti riservati</span>
            <span className="mono text-[11px] uppercase tracking-[0.16em] text-slate-400">Made in Italy</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
