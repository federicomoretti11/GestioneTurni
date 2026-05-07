'use client'
import { formatDateIT } from '@/lib/utils/date'

interface Props {
  open: boolean
  periodo: { inizio: string; fine: string }
  bozze: number
  onConferma: () => void
  onAnnulla: () => void
  loading: boolean
}

export function ModaleSvuotaBozza({ open, periodo, bozze, onConferma, onAnnulla, loading }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Svuota bozza del periodo</h2>
        <p className="text-sm text-gray-700 mt-3">
          Eliminare <strong>{bozze} turni bozza</strong> dal {formatDateIT(periodo.inizio)} al {formatDateIT(periodo.fine)}?
        </p>
        <p className="text-xs text-red-600 mt-2">
          L&apos;operazione è irreversibile. I turni ufficiali non vengono toccati.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onAnnulla} disabled={loading} className="px-4 py-2 text-sm rounded-lg border border-slate-200/60 hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={onConferma} disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold disabled:opacity-50">
            {loading ? 'Eliminazione…' : 'Svuota'}
          </button>
        </div>
      </div>
    </div>
  )
}
