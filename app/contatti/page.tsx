import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'

export default function ContattiPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">← Torna alla home</Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Contatti</h1>
        <p className="text-[13px] text-slate-400 mb-10">Hai domande o hai bisogno di assistenza? Scrivici.</p>

        <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-[14px] text-slate-600 space-y-6"
          style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Ragione sociale</p>
            <p className="text-slate-800 font-medium">S.I.A. S.r.l.s.</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">P.IVA</p>
            <p className="text-slate-800">14840881008</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sede legale</p>
            <p className="text-slate-400 italic">[Indirizzo da inserire]</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Email</p>
            <p className="text-slate-400 italic">[email@dominio.it]</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Telefono</p>
            <p className="text-slate-400 italic">[+39 000 000 0000]</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">PEC</p>
            <p className="text-slate-400 italic">[pec@dominio.it]</p>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  )
}
