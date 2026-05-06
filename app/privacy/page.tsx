import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">← Torna alla home</Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-[13px] text-slate-400 mb-10">Ultimo aggiornamento: 2025</p>

        <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-[14px] text-slate-500 space-y-4"
          style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
          <p className="font-medium text-slate-700">Questa pagina è in fase di redazione.</p>
          <p>Il contenuto della Privacy Policy sarà disponibile a breve. Per qualsiasi informazione sul trattamento dei dati personali, contattaci all'indirizzo indicato nella sezione Contatti.</p>
          <p>Opero Hub S.r.l. — P.IVA: [LA TUA P.IVA]</p>
        </div>
      </div>
    </div>
  )
}
