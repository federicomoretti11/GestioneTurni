import Link from 'next/link'

function CardLink({ icon, titolo, descrizione, href }: {
  icon: string; titolo: string; descrizione: string; href: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{titolo}</p>
        <p className="text-xs text-gray-500 mt-0.5">{descrizione}</p>
      </div>
      <span className="text-xs text-blue-600 font-medium mt-auto">Apri →</span>
    </Link>
  )
}

export default function ManagerImpostazioniPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Impostazioni</h1>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Strumenti</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardLink
            icon="📤"
            titolo="Export turni"
            descrizione="Esporta presenze e ore in PDF, Excel o CSV"
            href="/manager/export"
          />
          <CardLink
            icon="🏷️"
            titolo="Modelli turno"
            descrizione="Template riutilizzabili per la pianificazione"
            href="/manager/template"
          />
        </div>
      </section>
    </div>
  )
}
