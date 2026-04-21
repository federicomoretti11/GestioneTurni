interface SwitcherVistaProps {
  vista: 'settimana' | 'mese'
  onChange: (v: 'settimana' | 'mese') => void
  dataCorrente: Date
  onPrev: () => void
  onNext: () => void
  onOggi?: () => void
}

export function SwitcherVista({ vista, onChange, dataCorrente, onPrev, onNext, onOggi }: SwitcherVistaProps) {
  const label = dataCorrente.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
        {(['settimana', 'mese'] as const).map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 capitalize ${vista === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onPrev} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">‹</button>
        <span className="text-sm font-medium text-gray-700 capitalize min-w-[140px] text-center">{label}</span>
        <button onClick={onNext} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">›</button>
        {onOggi && (
          <button
            onClick={onOggi}
            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 ml-1"
          >
            Oggi
          </button>
        )}
      </div>
    </div>
  )
}
