'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────
interface Assegnato { dipendente_id: string; profile: { nome: string; cognome: string } }
interface Task {
  id: string; titolo: string; descrizione: string | null
  stato: 'da_fare' | 'in_corso' | 'in_revisione' | 'completato'
  priorita: 'bassa' | 'media' | 'alta'
  scadenza: string | null; created_at: string
  task_assegnazioni: Assegnato[]
  task_commenti: { id: string }[]
}
interface Commento {
  id: string; testo: string; created_at: string
  profile: { nome: string; cognome: string } | null
}
interface Utente { id: string; nome: string; cognome: string; ruolo: string }

// ── Constants ────────────────────────────────────────────────
const COLUMNS = [
  { key: 'da_fare'     as const, label: 'Da fare',       dot: 'bg-slate-400',   max: null },
  { key: 'in_corso'    as const, label: 'In corso',      dot: 'bg-indigo-500',  max: 5 },
  { key: 'in_revisione'as const, label: 'In revisione',  dot: 'bg-amber-500',   max: 3 },
  { key: 'completato'  as const, label: 'Completato',    dot: 'bg-emerald-500', max: null },
]
type Stato = typeof COLUMNS[number]['key']

const P = {
  alta:  { label: 'Alta',  pill: 'text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200',     bar: 'bg-rose-500' },
  media: { label: 'Media', pill: 'text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200',  bar: 'bg-amber-500' },
  bassa: { label: 'Bassa', pill: 'text-slate-600 bg-slate-50 ring-1 ring-inset ring-slate-200',  bar: 'bg-indigo-500' },
}

const AC = ['bg-indigo-100 text-indigo-700','bg-rose-100 text-rose-700','bg-amber-100 text-amber-700','bg-emerald-100 text-emerald-700','bg-sky-100 text-sky-700','bg-violet-100 text-violet-700']
function aColor(id: string) { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))|0; return AC[Math.abs(h)%AC.length] }
function ini(n:string,c:string) { return `${(n[0]??'').toUpperCase()}${(c[0]??'').toUpperCase()}` }
function fmtDate(iso: string) { return new Date(iso+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'}) }
function shortId(id: string) { return `GT-${id.slice(0,4).toUpperCase()}` }
function timeAgo(iso: string) {
  const d=Date.now()-new Date(iso).getTime(), m=Math.floor(d/60000)
  if(m<60) return `${m}m fa`; const h=Math.floor(m/60)
  if(h<24) return `${h}h fa`; return `${Math.floor(h/24)}g fa`
}

// ── Icons ────────────────────────────────────────────────────
function Ic({ d, d2, size=14, sw=1.6, c='' }: { d: string; d2?: string; size?: number; sw?: number; c?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={c}>
      <path d={d}/>{d2 && <path d={d2}/>}
    </svg>
  )
}
function IcCircle({ cx, cy, r, d, size=14, sw=1.6 }: { cx:number;cy:number;r:number;d?:string;size?:number;sw?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={cx} cy={cy} r={r}/>{d&&<path d={d}/>}
    </svg>
  )
}

// ── Avatar ───────────────────────────────────────────────────
function Av({ nome, cognome, id, size='sm' }: { nome:string; cognome:string; id:string; size?:'xs'|'sm'|'md' }) {
  const s = size==='xs' ? 'w-5 h-5 text-[9px]' : size==='md' ? 'w-7 h-7 text-[11px]' : 'w-6 h-6 text-[10px]'
  return <span className={`inline-flex items-center justify-center rounded-full font-semibold tracking-tight shrink-0 ${aColor(id)} ${s}`}>{ini(nome,cognome)}</span>
}

// ── Priority pill ────────────────────────────────────────────
function PPill({ p }: { p: 'bassa'|'media'|'alta' }) {
  return <span className={`inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium ${P[p].pill}`}>{P[p].label}</span>
}

// ── Task Card ────────────────────────────────────────────────
function TaskCard({ task, draggable, onDragStart, onClick }: {
  task: Task; draggable?: boolean; onDragStart?: () => void; onClick: () => void
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="group relative w-full text-left bg-white border border-slate-900/20 rounded-lg p-4 hover:border-slate-300 hover:shadow-[0_1px_0_rgba(15,23,42,.04),0_4px_12px_-6px_rgba(15,23,42,.18)] transition cursor-pointer select-none"
    >
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg ${P[task.priorita].bar}`} />
      <div className="flex items-center justify-between mb-2 ml-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">TASK · {shortId(task.id)}</span>
        <PPill p={task.priorita} />
      </div>
      <div className="ml-2 text-[14px] font-medium text-slate-900 leading-snug">{task.titolo}</div>
      {task.descrizione && (
        <div className="ml-2 mt-1.5 text-[12.5px] text-slate-500 line-clamp-3 leading-snug">{task.descrizione}</div>
      )}
      <div className="ml-2 mt-3 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {task.task_assegnazioni.slice(0,3).map(a => (
            <Av key={a.dipendente_id} nome={a.profile.nome} cognome={a.profile.cognome} id={a.dipendente_id} size="xs" />
          ))}
          {task.task_assegnazioni.length > 3 && (
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-semibold inline-flex items-center justify-center ring-1 ring-white">+{task.task_assegnazioni.length-3}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          {task.task_commenti.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <IcCircle cx={9} cy={9} r={7} d="M17 17l-3-3" size={12}/>
              {task.task_commenti.length}
            </span>
          )}
          {task.scadenza && (
            <span className="inline-flex items-center gap-1">
              <Ic d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" size={11}/>
              {fmtDate(task.scadenza)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Column ───────────────────────────────────────────────────
function KanbanColumn({ col, tasks, canManage, dragOver, onDragOver, onDrop, onCardClick, onAddClick }: {
  col: typeof COLUMNS[number]; tasks: Task[]
  canManage: boolean; dragOver: boolean
  onDragOver: (e: React.DragEvent) => void; onDrop: () => void
  onCardClick: (t: Task) => void; onAddClick: () => void
}) {
  const over = col.max && tasks.length > col.max
  return (
    <div className="flex flex-col min-w-[340px] w-[340px] shrink-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-700 font-semibold">{col.label}</span>
          <span className={`font-mono text-[11px] tabular-nums ${over ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
            {tasks.length}{col.max ? `/${col.max}` : ''}
          </span>
        </div>
        {canManage && (
          <button onClick={onAddClick} className="inline-flex items-center justify-center w-5 h-5 text-slate-400 hover:text-slate-700 rounded transition">
            <Ic d="M12 5v14M5 12h14" sw={1.8} />
          </button>
        )}
      </div>
      <div
        onDragOver={onDragOver} onDrop={onDrop}
        className={`rounded-md border p-2 flex flex-col gap-2 min-h-[120px] transition-colors ${dragOver ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50/70 border-slate-200/70'}`}
      >
        {tasks.length === 0
          ? <div className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300">Nessun task</div>
          : tasks.map(t => <TaskCard key={t.id} task={t} draggable onClick={() => onCardClick(t)} onDragStart={() => {}} />)}
      </div>
    </div>
  )
}

// ── Board view ───────────────────────────────────────────────
function BoardView({ tasks, canManage, onCardClick, onStatusChange, onAddClick }: {
  tasks: Task[]; canManage: boolean
  onCardClick: (t: Task) => void
  onStatusChange: (id: string, stato: Stato) => Promise<void>
  onAddClick: () => void
}) {
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<Stato | null>(null)

  return (
    <div className="overflow-x-auto flex-1">
      <div className="min-w-max px-5 py-5 flex gap-4 h-full">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.stato === col.key)
          return (
            <KanbanColumn
              key={col.key} col={col} tasks={colTasks}
              canManage={canManage} dragOver={dragOver === col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.key) }}
              onDrop={async () => {
                if (dragId.current) await onStatusChange(dragId.current, col.key)
                dragId.current = null; setDragOver(null)
              }}
              onCardClick={onCardClick}
              onAddClick={onAddClick}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────
function ListView({ tasks, onCardClick }: { tasks: Task[]; onCardClick: (t: Task) => void }) {
  return (
    <div className="px-5 py-5 flex-1 overflow-auto">
      <div className="rounded-lg border border-slate-900/20 bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50/60 border-b border-slate-200">
            <tr>
              {['','ID','Titolo','Stato','Priorità','Assegnato','Scadenza',''].map((h,i) => (
                <th key={i} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium px-3 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => {
              const col = COLUMNS.find(c => c.key === t.stato)!
              return (
                <tr key={t.id} onClick={() => onCardClick(t)}
                  className={`cursor-pointer hover:bg-slate-50 ${i>0?'border-t border-slate-100':''}`}>
                  <td className="px-3 py-2 w-[6px]">
                    <span className={`block w-[3px] h-5 rounded-sm ${P[t.priorita].bar}`}/>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">{shortId(t.id)}</td>
                  <td className="px-3 py-2 text-slate-900 max-w-[380px]">
                    <div className="truncate font-medium">{t.titolo}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`}/>
                      <span className="text-slate-700">{col.label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2"><PPill p={t.priorita}/></td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex -space-x-1.5">
                      {t.task_assegnazioni.slice(0,3).map(a => (
                        <Av key={a.dipendente_id} nome={a.profile.nome} cognome={a.profile.cognome} id={a.dipendente_id} size="xs"/>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {t.scadenza ? fmtDate(t.scadenza) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300 group-hover:text-slate-500">
                    <Ic d="M5 12h14M13 5l7 7-7 7"/>
                  </td>
                </tr>
              )
            })}
            {tasks.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center font-mono text-[11px] uppercase tracking-widest text-slate-300">Nessun task trovato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────
function DetailPanel({ task, canManage, utenti, onClose, onEdit, onDelete, onStatusChange }: {
  task: Task; canManage: boolean; utenti: Utente[]
  onClose: () => void; onEdit: (t: Task) => void; onDelete: (id: string) => void
  onStatusChange: (id: string, stato: Stato) => Promise<void>
}) {
  const [commenti, setCommenti] = useState<Commento[]>([])
  const [testo, setTesto] = useState('')
  const [sending, setSending] = useState(false)
  const [localStato, setLocalStato] = useState<Stato>(task.stato)
  const [savingStato, setSavingStato] = useState(false)
  const statoChanged = localStato !== task.stato
  const col = COLUMNS.find(c => c.key === task.stato)!

  useEffect(() => { setLocalStato(task.stato) }, [task.stato])

  useEffect(() => {
    fetch(`/api/tasks/${task.id}/commenti`)
      .then(r => r.ok ? r.json() : [])
      .then(setCommenti)
  }, [task.id])

  async function invia() {
    if (!testo.trim()) return
    setSending(true)
    const res = await fetch(`/api/tasks/${task.id}/commenti`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testo }),
    })
    setSending(false)
    if (res.ok) { const c = await res.json(); setCommenti(p => [...p, c]); setTesto('') }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 z-40" onClick={onClose}/>
      <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${P[task.priorita].bar}`}/>

        {/* Header */}
        <header className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">TASK · {shortId(task.id)}</span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`}/>{col.label}
              </span>
            </div>
            <h2 className="text-[17px] font-semibold text-slate-900 leading-snug pr-4">{task.titolo}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canManage && (
              <>
                <button onClick={() => onEdit(task)} className="inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition">
                  <Ic d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" size={15}/>
                </button>
                <button onClick={() => { if(confirm('Eliminare questo task?')) { onDelete(task.id); onClose() } }}
                  className="inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition">
                  <Ic d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={15}/>
                </button>
              </>
            )}
            <button onClick={onClose} className="inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition">
              <Ic d="M6 6l12 12M6 18L18 6" size={15}/>
            </button>
          </div>
        </header>

        {/* Meta grid */}
        <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-3 border-b border-slate-100 bg-slate-50/40">
          <MetaCell label="Stato">
            <div className="flex items-center gap-2">
              <select value={localStato}
                onChange={e => setLocalStato(e.target.value as Stato)}
                className="text-[12px] border border-slate-900/20 rounded-md px-2 py-0.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              {statoChanged && (
                <button
                  onClick={async () => { setSavingStato(true); await onStatusChange(task.id, localStato); setSavingStato(false) }}
                  disabled={savingStato}
                  className="h-6 px-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium disabled:opacity-50 transition">
                  {savingStato ? '…' : 'Salva'}
                </button>
              )}
            </div>
          </MetaCell>
          <MetaCell label="Priorità"><PPill p={task.priorita}/></MetaCell>
          {task.scadenza && (
            <MetaCell label="Scadenza">
              <span className="font-mono text-[11px] text-slate-700">{fmtDate(task.scadenza)}</span>
            </MetaCell>
          )}
          {task.task_assegnazioni.length > 0 && (
            <MetaCell label="Assegnato">
              <div className="flex flex-wrap gap-1">
                {task.task_assegnazioni.map(a => (
                  <span key={a.dipendente_id} className="inline-flex items-center gap-1 text-[11px] text-slate-700">
                    <Av nome={a.profile.nome} cognome={a.profile.cognome} id={a.dipendente_id} size="xs"/>
                    {a.profile.nome} {a.profile.cognome}
                  </span>
                ))}
              </div>
            </MetaCell>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {task.descrizione && (
            <section>
              <SectLabel>Descrizione</SectLabel>
              <p className="mt-2 text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{task.descrizione}</p>
            </section>
          )}

          <section>
            <SectLabel>Commenti</SectLabel>
            {commenti.length === 0 && (
              <p className="mt-2 text-[12px] text-slate-400">Nessun commento.</p>
            )}
            <ol className="mt-3 space-y-3">
              {commenti.map(c => (
                <li key={c.id} className="flex items-start gap-2.5">
                  {c.profile && <Av nome={c.profile.nome} cognome={c.profile.cognome} id={c.id} size="xs"/>}
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12px] font-medium text-slate-900">
                        {c.profile ? `${c.profile.nome} ${c.profile.cognome}` : 'Utente'}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-[12.5px] text-slate-700 mt-0.5">{renderMentions(c.testo)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Comment composer */}
        <footer className="border-t border-slate-200 px-6 py-3 bg-white">
          <div className="flex items-end gap-2">
            <MentionTextarea
              value={testo} onChange={setTesto} onEnter={invia} users={utenti}
              placeholder="Aggiungi un commento… usa @ per menzionare"
            />
            <button onClick={invia} disabled={sending || !testo.trim()}
              className="h-9 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-medium disabled:opacity-40 transition shrink-0">
              Invia
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-1">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function SectLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold">{children}</div>
}

function renderMentions(text: string) {
  const parts = text.split(/(@[A-Za-zÀ-ÿÀ-ɏ]+ [A-Za-zÀ-ÿÀ-ɏ]+)/g)
  return parts.map((p, i) =>
    p.startsWith('@')
      ? <span key={i} className="text-indigo-600 font-medium">{p}</span>
      : p
  )
}

function MentionTextarea({ value, onChange, onEnter, users, placeholder }: {
  value: string; onChange: (v: string) => void; onEnter: () => void
  users: Utente[]; placeholder?: string
}) {
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    const cursor = e.target.selectionStart ?? v.length
    const m = v.slice(0, cursor).match(/@([\p{L}\p{M}]*)$/u)
    if (m && m.index !== undefined) { setMentionStart(m.index); setMentionQuery(m[1]) }
    else { setMentionStart(null); setMentionQuery('') }
    onChange(v)
  }

  function pick(u: Utente) {
    if (mentionStart === null) return
    const before = value.slice(0, mentionStart)
    const after = value.slice(mentionStart + 1 + mentionQuery.length)
    onChange(`${before}@${u.nome} ${u.cognome} ${after.trimStart()}`)
    setMentionStart(null); setMentionQuery('')
    setTimeout(() => { ref.current?.focus() }, 0)
  }

  const q = mentionQuery.toLowerCase()
  const filtered = mentionStart !== null
    ? users.filter(u => !q || u.nome.toLowerCase().startsWith(q) || u.cognome.toLowerCase().startsWith(q) || `${u.nome} ${u.cognome}`.toLowerCase().includes(q)).slice(0, 6)
    : []

  return (
    <div className="relative flex-1">
      {filtered.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 w-60 bg-white border border-slate-900/20 rounded-lg shadow-xl overflow-hidden z-20">
          {filtered.map(u => (
            <button key={u.id} type="button" onMouseDown={e => { e.preventDefault(); pick(u) }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 transition text-left">
              <Av nome={u.nome} cognome={u.cognome} id={u.id} size="xs"/>
              <span className="text-[12px] font-medium text-slate-800">{u.nome} {u.cognome}</span>
              {u.ruolo && <span className="ml-auto font-mono text-[10px] uppercase text-slate-400">{u.ruolo}</span>}
            </button>
          ))}
        </div>
      )}
      <textarea ref={ref} value={value} onChange={handleChange} rows={2}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter() }
          if (e.key === 'Escape') { setMentionStart(null); setMentionQuery('') }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md border border-slate-900/20 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
      />
    </div>
  )
}

// ── Task form (create / edit) ─────────────────────────────────
function TaskForm({ task, utenti, onClose, onSaved }: {
  task: Task | null; utenti: Utente[]; onClose: () => void; onSaved: () => void
}) {
  const [titolo, setTitolo] = useState(task?.titolo ?? '')
  const [desc, setDesc] = useState(task?.descrizione ?? '')
  const [priorita, setPriorita] = useState<'bassa'|'media'|'alta'>(task?.priorita ?? 'media')
  const [scadenza, setScadenza] = useState(task?.scadenza ?? '')
  const [assegnati, setAssegnati] = useState<string[]>(task?.task_assegnazioni.map(a => a.dipendente_id) ?? [])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function toggle(id: string) { setAssegnati(p => p.includes(id) ? p.filter(x => x!==id) : [...p,id]) }

  async function salva() {
    if (!titolo.trim()) { setErr('Il titolo è obbligatorio.'); return }
    setSaving(true); setErr('')
    const body = { titolo, descrizione: desc, priorita, scadenza: scadenza || null, assegnati }
    const res = task
      ? await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      : await fetch('/api/tasks', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
    setSaving(false)
    if (!res.ok) { const j = await res.json(); setErr(j.error ?? 'Errore.'); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-semibold text-slate-900">{task ? 'Modifica task' : 'Nuovo task'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <Ic d="M6 6l12 12M6 18L18 6" size={16}/>
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-slate-600 mb-1">Titolo *</label>
            <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)}
              className="w-full border border-slate-900/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Descrivi il task…"/>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-slate-600 mb-1">Descrizione</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              className="w-full border border-slate-900/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="Dettagli aggiuntivi…"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Priorità</label>
              <select value={priorita} onChange={e => setPriorita(e.target.value as typeof priorita)}
                className="w-full border border-slate-900/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                <option value="bassa">Bassa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">Scadenza</label>
              <input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)}
                className="w-full border border-slate-900/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"/>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-slate-600 mb-2">Assegna a</label>
            <div className="max-h-40 overflow-y-auto border border-slate-900/20 rounded-lg divide-y divide-slate-100">
              {utenti.map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={assegnati.includes(u.id)} onChange={() => toggle(u.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/>
                  <Av nome={u.nome} cognome={u.cognome} id={u.id} size="xs"/>
                  <span className="text-[13px] text-slate-700">{u.nome} {u.cognome}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase text-slate-400">{u.ruolo}</span>
                </label>
              ))}
            </div>
          </div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800 px-4 py-2 transition">Annulla</button>
          <button onClick={salva} disabled={saving}
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? 'Salvataggio…' : task ? 'Salva' : 'Crea task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export function TaskBoard({ canManage }: { canManage: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'board'|'list'>('board')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const supabase = createClient()

  const carica = useCallback(async () => {
    setLoading(true)
    const [tr, ur] = await Promise.all([fetch('/api/tasks'), canManage ? fetch('/api/tasks/utenti') : Promise.resolve(null)])
    if (tr.ok) setTasks(await tr.json())
    if (ur?.ok) setUtenti(await ur.json())
    setLoading(false)
  }, [canManage])

  useEffect(() => { carica() }, [carica])

  useEffect(() => {
    const ch = supabase.channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, carica)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assegnazioni' }, carica)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carica])

  async function cambiaStato(id: string, stato: Stato) {
    await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ stato }) })
    setTasks(p => p.map(t => t.id === id ? {...t, stato} : t))
    setSelected(p => p?.id === id ? {...p, stato} : p)
  }

  async function elimina(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(p => p.filter(t => t.id !== id))
  }

  const filtered = tasks.filter(t =>
    !search || t.titolo.toLowerCase().includes(search.toLowerCase()) ||
    t.descrizione?.toLowerCase().includes(search.toLowerCase())
  )

  const active = tasks.filter(t => t.stato !== 'completato').length

  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Caricamento…</div>

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-5 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">Task</h1>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">{tasks.length} totali · {active} attivi</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden md:block">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <IcCircle cx={11} cy={11} r={7} d="M20 20l-3.5-3.5" size={14}/>
            </span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca task…"
              className="h-8 pl-8 pr-3 w-52 rounded-md border border-slate-900/20 bg-white text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/>
          </div>
          {/* View toggle */}
          <div className="inline-flex items-center h-8 p-0.5 rounded-md border border-slate-900/20 bg-slate-50">
            <button onClick={() => setView('board')}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[12px] transition ${view==='board' ? 'bg-white text-slate-900 shadow-sm border border-slate-900/20' : 'text-slate-500 hover:text-slate-800'}`}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="5" height="14" rx="1"/><rect x="10" y="4" width="5" height="9" rx="1"/><rect x="17" y="4" width="4" height="6" rx="1"/>
              </svg>
              Board
            </button>
            <button onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[12px] transition ${view==='list' ? 'bg-white text-slate-900 shadow-sm border border-slate-900/20' : 'text-slate-500 hover:text-slate-800'}`}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>
              </svg>
              Lista
            </button>
          </div>
          {/* New task */}
          {canManage && (
            <button onClick={() => { setEditTask(null); setShowForm(true) }}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-medium transition">
              <Ic d="M12 5v14M5 12h14" sw={2} size={13}/> Nuovo task
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {view === 'board'
        ? <BoardView tasks={filtered} canManage={canManage} onCardClick={setSelected} onStatusChange={cambiaStato} onAddClick={() => { setEditTask(null); setShowForm(true) }}/>
        : <ListView tasks={filtered} onCardClick={setSelected}/>
      }

      {/* Detail panel */}
      {selected && !showForm && (
        <DetailPanel
          task={selected} canManage={canManage}
          utenti={canManage ? utenti : selected.task_assegnazioni.map(a => ({ id: a.dipendente_id, nome: a.profile.nome, cognome: a.profile.cognome, ruolo: '' }))}
          onClose={() => setSelected(null)}
          onEdit={t => { setEditTask(t); setShowForm(true); setSelected(null) }}
          onDelete={id => { elimina(id); setSelected(null) }}
          onStatusChange={cambiaStato}
        />
      )}

      {/* Form */}
      {showForm && canManage && (
        <TaskForm task={editTask} utenti={utenti} onClose={() => setShowForm(false)} onSaved={carica}/>
      )}
    </div>
  )
}
