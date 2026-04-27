// Placeholder — full implementation in Task 8
'use client'

interface Props {
  tipo: 'ferie' | 'permesso' | 'malattia'
  onClose: () => void
  onSuccess: () => void
}

export function FormNuovaRichiesta({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5">
        <p className="text-gray-500">Form in costruzione...</p>
        <button onClick={onClose} className="mt-2 text-sm text-blue-600">Chiudi</button>
      </div>
    </div>
  )
}
