'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-slate-200">!</p>
        <h1 className="text-xl font-semibold text-slate-800">Qualcosa è andato storto</h1>
        <p className="text-sm text-slate-500">Si è verificato un errore inaspettato.</p>
        <button
          onClick={reset}
          className="inline-block mt-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Riprova
        </button>
      </div>
    </div>
  )
}
