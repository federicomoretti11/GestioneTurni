import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">← Torna alla home</Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-[13px] text-slate-400 mb-10">Ultimo aggiornamento: maggio 2025</p>

        <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-[14px] text-slate-600 space-y-8"
          style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali è <strong>S.I.A. S.r.l.s.</strong>, con sede legale in Italia, P.IVA 14840881008.
            </p>
            <p>
              Per qualsiasi richiesta relativa al trattamento dei dati personali è possibile contattarci tramite la sezione{' '}
              <Link href="/contatti" className="text-blue-600 hover:underline">Contatti</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">2. Tipologia di dati trattati</h2>
            <p>Nell&apos;ambito dell&apos;utilizzo di <strong>Opero Hub</strong> vengono trattate le seguenti categorie di dati personali:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li><strong className="text-slate-700">Dati identificativi:</strong> nome, cognome, indirizzo email</li>
              <li><strong className="text-slate-700">Dati di accesso:</strong> credenziali di autenticazione (gestite tramite Supabase Auth)</li>
              <li><strong className="text-slate-700">Dati relativi all&apos;attività lavorativa:</strong> turni, presenze, orari, check-in/check-out</li>
              <li><strong className="text-slate-700">Dati di geolocalizzazione:</strong> coordinate GPS rilevate al momento del check-in (solo se la funzione è abilitata dall&apos;azienda)</li>
              <li><strong className="text-slate-700">Dati di navigazione:</strong> log di sistema, indirizzi IP, timestamp delle operazioni</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">3. Finalità e base giuridica del trattamento</h2>
            <div className="space-y-2">
              <p><strong className="text-slate-700">Erogazione del servizio</strong> — gestione dei turni, presenze, comunicazioni interne e notifiche. Base giuridica: esecuzione del contratto (art. 6, par. 1, lett. b GDPR).</p>
              <p><strong className="text-slate-700">Adempimenti di legge</strong> — conservazione dei dati richiesta dalla normativa sul lavoro e fiscale. Base giuridica: obbligo legale (art. 6, par. 1, lett. c GDPR).</p>
              <p><strong className="text-slate-700">Sicurezza del servizio</strong> — rilevazione e prevenzione di accessi non autorizzati. Base giuridica: legittimo interesse (art. 6, par. 1, lett. f GDPR).</p>
              <p><strong className="text-slate-700">Notifiche transazionali</strong> — invio di email relative a turni, richieste e comunicazioni di servizio. Base giuridica: esecuzione del contratto.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">4. Modalità di trattamento e conservazione</h2>
            <p>
              I dati sono trattati con strumenti elettronici e conservati su infrastruttura cloud fornita da <strong>Supabase Inc.</strong> (database e autenticazione) con sede negli Stati Uniti, nel rispetto delle garanzie previste dal GDPR per i trasferimenti internazionali (Standard Contractual Clauses).
            </p>
            <p>
              Le email transazionali sono inviate tramite <strong>Resend Inc.</strong>, anch&apos;essa soggetta alle medesime garanzie contrattuali.
            </p>
            <p>
              I dati sono conservati per tutta la durata del rapporto contrattuale con l&apos;azienda cliente e per i successivi periodi previsti dalla normativa applicabile. Al termine, i dati vengono cancellati o anonimizzati.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">5. Comunicazione e diffusione dei dati</h2>
            <p>I dati personali non vengono venduti né ceduti a terzi per finalità commerciali. Possono essere comunicati a:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Responsabili del trattamento designati (fornitori di infrastruttura cloud)</li>
              <li>Autorità competenti, nei casi previsti dalla legge</li>
              <li>Personale autorizzato dell&apos;azienda cliente (amministratori e manager) limitatamente ai dati necessari alla gestione dei turni</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">6. Diritti degli interessati</h2>
            <p>Ai sensi degli artt. 15–22 del GDPR, l&apos;interessato ha diritto di:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Accedere ai propri dati personali (art. 15)</li>
              <li>Ottenere la rettifica di dati inesatti (art. 16)</li>
              <li>Ottenere la cancellazione dei dati («diritto all&apos;oblio», art. 17)</li>
              <li>Richiedere la limitazione del trattamento (art. 18)</li>
              <li>Ricevere i propri dati in formato portabile (art. 20)</li>
              <li>Opporsi al trattamento (art. 21)</li>
              <li>Proporre reclamo all&apos;Autorità Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.garanteprivacy.it</a>)</li>
            </ul>
            <p>Per esercitare i propri diritti, contattare il titolare tramite la sezione <Link href="/contatti" className="text-blue-600 hover:underline">Contatti</Link>.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">7. Modifiche alla presente informativa</h2>
            <p>
              Il titolare si riserva il diritto di aggiornare la presente informativa. Le modifiche sostanziali saranno comunicate agli utenti tramite notifica in-app o via email. La data di ultimo aggiornamento è indicata in cima alla pagina.
            </p>
          </section>

        </div>
      </div>
      <Footer />
    </div>
  )
}
