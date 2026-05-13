// app/page.tsx
import DemoForm from './_components/DemoForm'

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

        {/* Hero product mockup */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
          <div className="rounded-xl border hairline bg-white overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-2 px-4 h-9 border-b hairline bg-slate-50/60">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              <span className="ml-3 mono text-[11px] text-slate-400">operohub.com</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[360px]">
              <div className="hidden md:flex flex-col gap-1.5 p-4 border-r hairline bg-slate-50/40">
                <div className="h-6 w-24 rounded bg-slate-200/70"></div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-7 rounded bg-brand-dark w-full"></div>
                  <div className="h-7 rounded bg-slate-100 w-full"></div>
                  <div className="h-7 rounded bg-slate-100 w-full"></div>
                  <div className="h-7 rounded bg-slate-100 w-full"></div>
                  <div className="h-7 rounded bg-slate-100 w-3/4"></div>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mono text-[11px] uppercase tracking-[0.16em] text-slate-400">Settimana 18</div>
                    <div className="serif text-3xl text-slate-900 mt-1">Pianificazione turni</div>
                  </div>
                  <div className="hidden sm:flex gap-2">
                    <div className="h-8 w-20 rounded border hairline bg-white"></div>
                    <div className="h-8 w-24 rounded bg-brand-blue"></div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-7 gap-2">
                  {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(g => (
                    <div key={g} className="mono text-[10px] uppercase text-slate-400 tracking-widest">{g}</div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-8 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-12 rounded-full bg-slate-200"></div></div>
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-10 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-9 rounded-full bg-slate-200"></div></div>
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-7 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-12 rounded-full bg-slate-200"></div><div className="h-2 w-8 rounded-full bg-slate-200 mt-1.5"></div></div>
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-9 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-10 rounded-full bg-slate-200"></div></div>
                  <div className="h-20 rounded-md border hairline bg-white p-2"><div className="h-2 w-12 rounded-full mb-1.5" style={{ background: '#045dcc33' }}></div><div className="h-2 w-8 rounded-full bg-slate-200"></div><div className="h-2 w-10 rounded-full bg-slate-200 mt-1.5"></div></div>
                  <div className="h-20 rounded-md border hairline bg-slate-50"></div>
                  <div className="h-20 rounded-md border hairline bg-slate-50"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="border-t hairline bg-slate-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: '📋', title: 'Basta fogli Excel', body: 'Turni copiati, cancellati, smarriti. Un calendario condiviso e sempre aggiornato, accessibile da qualsiasi dispositivo.' },
              { emoji: '📱', title: 'Timbrature senza carta', body: 'I dipendenti timbrano entrata e uscita dal telefono, con validazione GPS opzionale. Niente fogli firma, niente manomissioni.' },
              { emoji: '💬', title: 'Ferie e permessi tracciati', body: 'Niente richieste via WhatsApp dimenticate. Ogni richiesta ha un flusso di approvazione chiaro e uno storico consultabile.' },
            ].map(({ emoji, title, body }) => (
              <div key={title} className="flex gap-4 items-start p-6 bg-white rounded-xl border hairline">
                <span className="mt-0.5 text-2xl">{emoji}</span>
                <div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
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
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t hairline">
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
              { n: '03', tag: 'Monitora', title: 'Controlla e approva', body: 'Approva richieste, verifica presenze in tempo reale ed esporta i report. Tutto in un’unica dashboard.' },
            ].map(({ n, tag, title, body }) => (
              <li key={n} className="relative rounded-xl border hairline bg-white p-7">
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
              { q: "I dipendenti devono installare un’app?", a: "No. Opero Hub è una web app che funziona su qualsiasi browser, da smartphone o PC. I dipendenti ricevono un link via email e accedono senza installare nulla." },
              { q: "Serve un reparto IT per configurarlo?", a: "Assolutamente no. La configurazione iniziale richiede circa 30–60 minuti: aggiungi i dipendenti, definisci i posti di servizio e sei pronto. Durante la demo ti accompagniamo passo per passo." },
              { q: "Posso importare i dati da Excel?", a: "Sì. Puoi importare l’elenco dei dipendenti tramite CSV. Per i turni storici, durante l’onboarding valutiamo insieme la migrazione più adatta alla tua situazione." },
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
                <a href="#" className="underline decoration-slate-600 hover:text-white">Privacy Policy</a>.
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
                <li><a href="#" className="hover:text-slate-900">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-slate-900">Cookie Policy</a></li>
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
