'use client'
import { createContext, useCallback, useContext, useState } from 'react'

type Tipo = 'successo' | 'errore'

interface Toast {
  id: number
  messaggio: string
  tipo: Tipo
}

interface ToastCtx {
  mostra: (messaggio: string, tipo?: Tipo) => void
}

const Ctx = createContext<ToastCtx>({ mostra: () => {} })

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([])

  const mostra = useCallback((messaggio: string, tipo: Tipo = 'successo') => {
    const id = ++nextId
    setLista(prev => [...prev, { id, messaggio, tipo }])
    setTimeout(() => setLista(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const rimuovi = (id: number) => setLista(prev => prev.filter(t => t.id !== id))

  return (
    <Ctx.Provider value={{ mostra }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {lista.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg border text-sm animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              t.tipo === 'errore'
                ? 'bg-white border-red-200 text-red-800'
                : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            <span className="mt-0.5 text-base leading-none">
              {t.tipo === 'errore' ? '⚠️' : '✓'}
            </span>
            <span className="flex-1 leading-snug">{t.messaggio}</span>
            <button
              onClick={() => rimuovi(t.id)}
              className="text-gray-400 hover:text-gray-600 leading-none mt-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}
