'use client'
import { useEffect, useState } from 'react'

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const SEQ = [
  { day: 0, name: 'M. Rossi',   time: '08–16', c: 'i' },
  { day: 2, name: 'G. Bianchi', time: '07–15', c: 'v' },
  { day: 1, name: 'M. Rossi',   time: '08–16', c: 'i' },
  { day: 4, name: 'L. Ferrari', time: '14–22', c: 'e' },
  { day: 3, name: 'G. Bianchi', time: '07–15', c: 'v' },
  { day: 0, name: 'L. Ferrari', time: '14–22', c: 'e' },
  { day: 2, name: 'M. Rossi',   time: '08–16', c: 'i' },
] as const

type C = 'i' | 'v' | 'e'

const CHIP: Record<C, string> = {
  i: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  v: 'bg-violet-50 border-violet-200 text-violet-700',
  e: 'bg-emerald-50 border-emerald-200 text-emerald-700',
}
const DOT: Record<C, string> = {
  i: 'bg-indigo-400',
  v: 'bg-violet-400',
  e: 'bg-emerald-400',
}

type Phase = 'filling' | 'publishing' | 'published' | 'resetting'

export function HeroCalendar() {
  const [phase, setPhase] = useState<Phase>('filling')
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (phase === 'filling') {
      if (count < SEQ.length) {
        const t = setTimeout(() => setCount(c => c + 1), count === 0 ? 900 : 480)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('publishing'), 700)
      return () => clearTimeout(t)
    }
    if (phase === 'publishing') {
      const t = setTimeout(() => setPhase('published'), 850)
      return () => clearTimeout(t)
    }
    if (phase === 'published') {
      const t = setTimeout(() => setPhase('resetting'), 2500)
      return () => clearTimeout(t)
    }
    if (phase === 'resetting') {
      setCount(0)
      const t = setTimeout(() => setPhase('filling'), 120)
      return () => clearTimeout(t)
    }
  }, [phase, count])

  const visible = SEQ.slice(0, count)
  const isPublishing = phase === 'publishing'
  const isPublished = phase === 'published'

  const byDay: Record<number, { name: string; time: string; c: C }[]> = {}
  visible.forEach(s => {
    if (!byDay[s.day]) byDay[s.day] = []
    byDay[s.day].push({ name: s.name, time: s.time, c: s.c })
  })

  return (
    <>
      <style>{`
        @keyframes chip-in {
          from { opacity: 0; transform: translateY(-5px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .chip-in { animation: chip-in 0.22s ease-out both; }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[360px]">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col gap-1.5 p-4 border-r hairline bg-slate-50/40">
          <div className="h-6 w-24 rounded bg-slate-200/70" />
          <div className="mt-3 space-y-1.5">
            <div className="h-7 rounded bg-brand-dark w-full" />
            <div className="h-7 rounded bg-slate-100 w-full" />
            <div className="h-7 rounded bg-slate-100 w-full" />
            <div className="h-7 rounded bg-slate-100 w-full" />
            <div className="h-7 rounded bg-slate-100 w-3/4" />
          </div>
        </div>

        {/* Calendar area */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="mono text-[11px] uppercase tracking-[0.16em] text-slate-400">Settimana 18</div>
              <div className="serif text-3xl text-slate-900 mt-1">Pianificazione turni</div>
            </div>
            <div className="hidden sm:flex gap-2 items-center">
              <div className="h-8 w-20 rounded border hairline bg-white text-xs text-slate-400 flex items-center justify-center select-none">← →</div>
              <div className={`h-8 px-4 rounded text-sm font-medium transition-all duration-500 flex items-center gap-1.5 select-none ${
                isPublished
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : isPublishing
                  ? 'bg-brand-blue text-white ring-4 ring-brand-blue/20 scale-105 shadow-lg'
                  : 'bg-brand-blue text-white opacity-50'
              }`}>
                {isPublished ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                    Pubblicato
                  </>
                ) : 'Pubblica'}
              </div>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {DAYS.map(d => (
              <div key={d} className="mono text-[10px] uppercase text-slate-400 tracking-widest text-center">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d, i) => {
              const shifts = byDay[i] ?? []
              const isWeekend = i >= 5
              return (
                <div
                  key={d}
                  className={`min-h-[90px] rounded-md border p-1.5 transition-colors duration-500 ${
                    isWeekend
                      ? 'bg-slate-50 border-slate-100'
                      : isPublished && shifts.length > 0
                      ? 'bg-emerald-50/50 border-emerald-200/60'
                      : 'bg-white border-slate-200/70'
                  }`}
                >
                  {shifts.map((s, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={`chip-in mb-1 p-1 rounded border text-[9px] font-medium ${CHIP[s.c]}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[s.c]}`} />
                        <span className="truncate leading-tight">{s.name}</span>
                      </div>
                      <div className="opacity-70 pl-2.5 font-mono">{s.time}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
