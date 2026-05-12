'use client'

interface ChatMessageProps {
  testo: string
  mittente: 'io' | 'altro'
  timestamp: string
}

export function ChatMessage({ testo, mittente, timestamp }: ChatMessageProps) {
  const ora = new Date(timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  if (mittente === 'io') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-blue-100 rounded-2xl rounded-br-sm px-3 py-2">
          <p className="text-sm text-blue-900">{testo}</p>
          <p className="text-[10px] text-blue-400 mt-1 text-right">{ora}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
        <p className="text-sm text-slate-700">{testo}</p>
        <p className="text-[10px] text-slate-400 mt-1">{ora}</p>
      </div>
    </div>
  )
}
