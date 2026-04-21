interface AlertErroreProps {
  messaggio: string
  onRetry?: () => void
}

export function AlertErrore({ messaggio, onRetry }: AlertErroreProps) {
  return (
    <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      <span>{messaggio}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-medium underline hover:no-underline whitespace-nowrap">
          Riprova
        </button>
      )}
    </div>
  )
}
