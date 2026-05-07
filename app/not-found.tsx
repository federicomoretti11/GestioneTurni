import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-slate-200">404</p>
        <h1 className="text-xl font-semibold text-slate-800">Pagina non trovata</h1>
        <p className="text-sm text-slate-500">La pagina che cerchi non esiste o è stata spostata.</p>
        <Link href="/home" className="inline-block mt-2 text-sm text-blue-600 hover:underline">
          ← Torna alla home
        </Link>
      </div>
    </div>
  )
}
