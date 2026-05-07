import Link from 'next/link'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">← Torna alla home</Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Cookie Policy</h1>
        <p className="text-[13px] text-slate-400 mb-10">Ultimo aggiornamento: maggio 2025</p>

        <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-[14px] text-slate-600 space-y-8"
          style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">1. Cosa sono i cookie</h2>
            <p>
              I cookie sono piccoli file di testo che i siti web salvano nel browser dell&apos;utente durante la navigazione.
              Vengono utilizzati per far funzionare correttamente il sito, ricordare le preferenze dell&apos;utente e, in alcuni casi, raccogliere informazioni statistiche.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">2. Cookie utilizzati da Opero Hub</h2>
            <p>
              <strong>Opero Hub</strong> utilizza esclusivamente <strong>cookie tecnici strettamente necessari</strong> al funzionamento del servizio. Non vengono utilizzati cookie di profilazione, di marketing o di tracciamento pubblicitario.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Nome</th>
                    <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Tipologia</th>
                    <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Finalità</th>
                    <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Durata</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-slate-200 text-slate-500"><code className="text-xs bg-slate-100 px-1 rounded">sb-*</code></td>
                    <td className="p-3 border border-slate-200 text-slate-500">Tecnico</td>
                    <td className="p-3 border border-slate-200 text-slate-500">Gestione sessione di autenticazione (Supabase Auth)</td>
                    <td className="p-3 border border-slate-200 text-slate-500">Sessione / 1 settimana</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 border border-slate-200 text-slate-500"><code className="text-xs bg-slate-100 px-1 rounded">__Secure-*</code></td>
                    <td className="p-3 border border-slate-200 text-slate-500">Tecnico</td>
                    <td className="p-3 border border-slate-200 text-slate-500">Sicurezza della sessione HTTPS</td>
                    <td className="p-3 border border-slate-200 text-slate-500">Sessione</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">3. Cookie di terze parti</h2>
            <p>
              Opero Hub non installa cookie di terze parti per finalità di profilazione o pubblicità.
              L&apos;infrastruttura di autenticazione è fornita da <strong>Supabase Inc.</strong>: i cookie tecnici da essa generati sono necessari al login e alla gestione della sessione utente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">4. Consenso e gestione dei cookie</h2>
            <p>
              Poiché Opero Hub utilizza esclusivamente cookie tecnici necessari, non è richiesto il consenso dell&apos;utente ai sensi dell&apos;art. 122 del Codice Privacy e delle Linee guida del Garante.
            </p>
            <p>
              L&apos;utente può comunque gestire o disabilitare i cookie direttamente dal proprio browser. Si tenga presente che la disabilitazione dei cookie tecnici potrebbe compromettere il corretto funzionamento del servizio, in particolare la funzione di login.
            </p>
            <p>Istruzioni per i principali browser:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/it/kb/Attivare%20e%20disattivare%20i%20cookie" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Microsoft Edge</a></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">5. Titolare del trattamento</h2>
            <p>
              <strong>S.I.A. S.r.l.s.</strong> — P.IVA 14840881008<br />
              Per informazioni: <Link href="/contatti" className="text-blue-600 hover:underline">sezione Contatti</Link>
            </p>
            <p>
              Per ulteriori informazioni sul trattamento dei dati personali, consultare la{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
