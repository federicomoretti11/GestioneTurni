import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white px-6 py-5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
          <span className="font-medium text-slate-500">S.I.A. S.r.l.s.</span>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span>P.IVA: 14840881008</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
          <Link href="/cookie-policy" className="hover:text-slate-600 transition-colors">Cookie Policy</Link>
          <Link href="/contatti" className="hover:text-slate-600 transition-colors">Contatti</Link>
        </div>
        <span className="text-slate-300 text-center">© 2026 Opero Hub. Tutti i diritti riservati.</span>
      </div>
    </footer>
  )
}
