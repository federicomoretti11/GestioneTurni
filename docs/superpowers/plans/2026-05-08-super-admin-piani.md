# Super-Admin Piani e Abbonamenti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere al pannello super-admin la gestione di piani (starter/professional/enterprise) per ogni tenant, con cambio piano che applica automaticamente i feature flag corretti, storico modifiche e card in home.

**Architecture:** Migration DB aggiunge colonne `piano`, `piano_scadenza`, `piano_note` a `tenants` e 3 nuovi flag a `impostazioni`, più tabella `tenant_piano_log` immutabile. Nuova API route `[id]` serve GET dettaglio e PATCH piano/flags con service role. Pagina dettaglio `[id]/page.tsx` (client component) a due colonne. La lista tenant esistente viene aggiornata con colonne piano/scadenza e il nome diventa link.

**Tech Stack:** Next.js 14 App Router, Supabase (createAdminClient per service role), TypeScript, Tailwind CSS

---

## File Map

| File | Azione |
|------|--------|
| `supabase/migrations/024_piani.sql` | Crea |
| `lib/types.ts` | Modifica — nuovi campi `ImpostazioniTenant`, tipi `TenantConPiano`, `TenantPianoLog` |
| `app/api/super-admin/tenants/[id]/route.ts` | Crea — GET dettaglio + PATCH piano/flags |
| `app/super-admin/tenants/[id]/page.tsx` | Crea — pagina dettaglio due colonne |
| `app/super-admin/tenants/page.tsx` | Modifica — colonne piano/scadenza, nome come link |
| `app/home/page.tsx` | Modifica — AreaCard "Gestione tenant" per super admin |

---

## Task 1: Migration 024_piani.sql

**Files:**
- Create: `supabase/migrations/024_piani.sql`

- [ ] **Step 1: Crea il file migration**

```sql
-- supabase/migrations/024_piani.sql

-- Aggiungi colonne piano a tenants
ALTER TABLE tenants ADD COLUMN piano TEXT NOT NULL DEFAULT 'starter'
  CHECK (piano IN ('starter', 'professional', 'enterprise'));
ALTER TABLE tenants ADD COLUMN piano_scadenza TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN piano_note TEXT;

-- Aggiungi i 3 flag enterprise mancanti a impostazioni
ALTER TABLE impostazioni ADD COLUMN modulo_paghe_abilitato BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE impostazioni ADD COLUMN modulo_ai_copilot_abilitato BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE impostazioni ADD COLUMN white_label_abilitato BOOLEAN NOT NULL DEFAULT false;

-- Storico cambi piano (immutabile, solo insert)
CREATE TABLE tenant_piano_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  piano       TEXT NOT NULL,
  cambiato_da UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tenant_piano_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo_super_admin" ON tenant_piano_log
  FOR ALL USING (get_is_super_admin());
```

- [ ] **Step 2: Applica la migration in Supabase Dashboard**

Apri Supabase Dashboard → SQL Editor, incolla e lancia il contenuto del file.

Verifica: `SELECT piano, piano_scadenza, piano_note FROM tenants LIMIT 3;` — deve restituire righe con `piano = 'starter'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/024_piani.sql
git commit -m "feat(db): aggiungi piano/scadenza/note a tenants, 3 flag enterprise, tenant_piano_log"
```

---

## Task 2: Aggiorna lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Aggiungi i nuovi tipi in fondo al file**

Apri `lib/types.ts` e:

1. Estendi `ImpostazioniTenant` con i 3 nuovi flag:

```typescript
export interface ImpostazioniTenant {
  gps_checkin_abilitato: boolean
  email_notifiche_abilitato: boolean
  modulo_cedolini_abilitato: boolean
  modulo_analytics_abilitato: boolean
  modulo_tasks_abilitato: boolean
  modulo_documenti_abilitato: boolean
  modulo_paghe_abilitato: boolean
  modulo_ai_copilot_abilitato: boolean
  white_label_abilitato: boolean
}
```

2. Aggiungi in fondo al file:

```typescript
export type PianoTenant = 'starter' | 'professional' | 'enterprise'

export interface TenantConPiano {
  id: string
  nome: string
  slug: string
  attivo: boolean
  piano: PianoTenant
  piano_scadenza: string | null
  piano_note: string | null
  created_at: string
}

export interface TenantDettaglio extends TenantConPiano {
  impostazioni: ImpostazioniTenant
  utenti_count: number
  piano_log: TenantPianoLog[]
}

export interface TenantPianoLog {
  id: string
  tenant_id: string
  piano: PianoTenant
  cambiato_da: string | null
  note: string | null
  created_at: string
}
```

- [ ] **Step 2: Verifica che TypeScript compili**

```bash
npx tsc --noEmit
```

Atteso: nessun errore relativo a `lib/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): TenantConPiano, TenantDettaglio, TenantPianoLog, 3 nuovi flag ImpostazioniTenant"
```

---

## Task 3: Nuova API app/api/super-admin/tenants/[id]/route.ts

**Files:**
- Create: `app/api/super-admin/tenants/[id]/route.ts`

Questa route usa `createAdminClient()` (service role) per bypassare RLS su tutte le operazioni.

La mappatura piano → flag è:

```
starter:      gps=true, tasks=false, documenti=false, cedolini=false, analytics=false, paghe=false, ai=false, white=false
professional: gps=true, tasks=true,  documenti=true,  cedolini=true,  analytics=true,  paghe=false, ai=false, white=false
enterprise:   gps=true, tasks=true,  documenti=true,  cedolini=true,  analytics=true,  paghe=true,  ai=true,  white=true
```

- [ ] **Step 1: Crea la directory e il file**

```typescript
// app/api/super-admin/tenants/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { PianoTenant } from '@/lib/types'

async function checkSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('id, is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) return null
  return { userId: user.id }
}

const PIANO_FLAGS: Record<PianoTenant, Record<string, boolean>> = {
  starter: {
    gps_checkin_abilitato: true,
    modulo_tasks_abilitato: false,
    modulo_documenti_abilitato: false,
    modulo_cedolini_abilitato: false,
    modulo_analytics_abilitato: false,
    modulo_paghe_abilitato: false,
    modulo_ai_copilot_abilitato: false,
    white_label_abilitato: false,
  },
  professional: {
    gps_checkin_abilitato: true,
    modulo_tasks_abilitato: true,
    modulo_documenti_abilitato: true,
    modulo_cedolini_abilitato: true,
    modulo_analytics_abilitato: true,
    modulo_paghe_abilitato: false,
    modulo_ai_copilot_abilitato: false,
    white_label_abilitato: false,
  },
  enterprise: {
    gps_checkin_abilitato: true,
    modulo_tasks_abilitato: true,
    modulo_documenti_abilitato: true,
    modulo_cedolini_abilitato: true,
    modulo_analytics_abilitato: true,
    modulo_paghe_abilitato: true,
    modulo_ai_copilot_abilitato: true,
    white_label_abilitato: true,
  },
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await checkSuperAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const admin = createAdminClient()
  const { id } = params

  const { data: tenant, error } = await admin
    .from('tenants')
    .select('id, nome, slug, attivo, piano, piano_scadenza, piano_note, created_at')
    .eq('id', id)
    .single()
  if (error || !tenant) return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })

  const { data: imp } = await admin
    .from('impostazioni')
    .select('gps_checkin_abilitato, email_notifiche_abilitato, modulo_tasks_abilitato, modulo_documenti_abilitato, modulo_cedolini_abilitato, modulo_analytics_abilitato, modulo_paghe_abilitato, modulo_ai_copilot_abilitato, white_label_abilitato')
    .eq('tenant_id', id)
    .single()

  const { count: utenti_count } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', id)
    .eq('attivo', true)

  const { data: piano_log } = await admin
    .from('tenant_piano_log')
    .select('id, piano, cambiato_da, note, created_at')
    .eq('tenant_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    ...tenant,
    impostazioni: imp ?? null,
    utenti_count: utenti_count ?? 0,
    piano_log: piano_log ?? [],
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await checkSuperAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const { id } = params
  const admin = createAdminClient()

  // Aggiornamento piano (applica flag automaticamente)
  if (body.piano !== undefined) {
    const piano = body.piano as PianoTenant
    if (!['starter', 'professional', 'enterprise'].includes(piano)) {
      return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
    }

    const tenantUpdates: Record<string, unknown> = { piano }
    if ('piano_scadenza' in body) tenantUpdates.piano_scadenza = body.piano_scadenza ?? null
    if ('piano_note' in body) tenantUpdates.piano_note = body.piano_note ?? null

    const { error: tErr } = await admin.from('tenants').update(tenantUpdates).eq('id', id)
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })

    await admin.from('impostazioni').upsert(
      { tenant_id: id, ...PIANO_FLAGS[piano] },
      { onConflict: 'tenant_id' }
    )

    await admin.from('tenant_piano_log').insert({
      tenant_id: id,
      piano,
      cambiato_da: ctx.userId,
      note: body.piano_note ?? null,
    })

    return NextResponse.json({ ok: true })
  }

  // Aggiornamento metadata senza cambio piano
  if ('piano_scadenza' in body || 'piano_note' in body) {
    const updates: Record<string, unknown> = {}
    if ('piano_scadenza' in body) updates.piano_scadenza = body.piano_scadenza ?? null
    if ('piano_note' in body) updates.piano_note = body.piano_note ?? null
    await admin.from('tenants').update(updates).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Override manuale singolo flag
  const FLAG_KEYS = [
    'gps_checkin_abilitato', 'email_notifiche_abilitato',
    'modulo_tasks_abilitato', 'modulo_documenti_abilitato',
    'modulo_cedolini_abilitato', 'modulo_analytics_abilitato',
    'modulo_paghe_abilitato', 'modulo_ai_copilot_abilitato', 'white_label_abilitato',
  ]
  const flagUpdates: Record<string, boolean> = {}
  for (const key of FLAG_KEYS) {
    if (key in body && typeof body[key] === 'boolean') flagUpdates[key] = body[key]
  }
  if (Object.keys(flagUpdates).length > 0) {
    await admin.from('impostazioni').upsert(
      { tenant_id: id, ...flagUpdates },
      { onConflict: 'tenant_id' }
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore sul nuovo file.

- [ ] **Step 3: Verifica manuale**

Avvia `npm run dev`. Apri una sessione super-admin e chiama:
```
GET /api/super-admin/tenants/<id_tenant>
```
Atteso: JSON con `nome`, `piano`, `impostazioni`, `utenti_count`, `piano_log`.

- [ ] **Step 4: Commit**

```bash
git add app/api/super-admin/tenants/
git commit -m "feat(api): GET/PATCH dettaglio tenant con gestione piano e flag"
```

---

## Task 4: Pagina dettaglio app/super-admin/tenants/[id]/page.tsx

**Files:**
- Create: `app/super-admin/tenants/[id]/page.tsx`

- [ ] **Step 1: Crea il file**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { TenantDettaglio, PianoTenant } from '@/lib/types'

const PIANO_COLORS: Record<PianoTenant, string> = {
  starter:      'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise:   'bg-amber-100 text-amber-700',
}

const FLAG_LABELS: Record<string, { label: string; piano: PianoTenant | null }> = {
  gps_checkin_abilitato:       { label: 'GPS Check-in',      piano: 'starter' },
  email_notifiche_abilitato:   { label: 'Email notifiche',   piano: 'starter' },
  modulo_tasks_abilitato:      { label: 'Modulo Task',       piano: 'professional' },
  modulo_documenti_abilitato:  { label: 'Modulo Documenti',  piano: 'professional' },
  modulo_cedolini_abilitato:   { label: 'Modulo Cedolini',   piano: 'professional' },
  modulo_analytics_abilitato:  { label: 'Modulo Analytics',  piano: 'professional' },
  modulo_paghe_abilitato:      { label: 'Modulo Paghe',      piano: 'enterprise' },
  modulo_ai_copilot_abilitato: { label: 'AI Copilot',        piano: 'enterprise' },
  white_label_abilitato:       { label: 'White Label',       piano: 'enterprise' },
}

export default function TenantDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tenant, setTenant] = useState<TenantDettaglio | null>(null)
  const [loading, setLoading] = useState(true)
  const [pianoDraft, setPianoDraft] = useState<PianoTenant>('starter')
  const [scadenzaDraft, setScadenzaDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [savingPiano, setSavingPiano] = useState(false)
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null)

  async function carica() {
    setLoading(true)
    const res = await fetch(`/api/super-admin/tenants/${id}`)
    if (res.ok) {
      const data: TenantDettaglio = await res.json()
      setTenant(data)
      setPianoDraft(data.piano)
      setScadenzaDraft(data.piano_scadenza ? data.piano_scadenza.slice(0, 10) : '')
      setNoteDraft(data.piano_note ?? '')
    }
    setLoading(false)
  }

  useEffect(() => { carica() }, [id])

  async function salvaPiano() {
    if (!tenant) return
    setSavingPiano(true)
    await fetch(`/api/super-admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        piano: pianoDraft,
        piano_scadenza: scadenzaDraft || null,
        piano_note: noteDraft || null,
      }),
    })
    await carica()
    setSavingPiano(false)
  }

  async function toggleFlag(key: string, currentValue: boolean) {
    setTogglingFlag(key)
    await fetch(`/api/super-admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: !currentValue }),
    })
    setTenant(prev => prev ? {
      ...prev,
      impostazioni: { ...prev.impostazioni, [key]: !currentValue }
    } : prev)
    setTogglingFlag(null)
  }

  if (loading) return <p className="text-sm text-gray-500 p-6">Caricamento…</p>
  if (!tenant) return <p className="text-sm text-red-500 p-6">Tenant non trovato.</p>

  const imp = tenant.impostazioni

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/super-admin/tenants" className="text-sm text-slate-500 hover:text-slate-800">← Tenant</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{tenant.nome}</h1>
        <span className="font-mono text-xs text-gray-400">{tenant.slug}</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tenant.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {tenant.attivo ? 'Attivo' : 'Disattivo'}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PIANO_COLORS[tenant.piano]}`}>
          {tenant.piano}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Colonna sinistra ── */}
        <div className="space-y-6">

          {/* Card Piano */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Piano abbonamento</h2>

            <div className="flex gap-2 mb-4">
              {(['starter', 'professional', 'enterprise'] as PianoTenant[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPianoDraft(p)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
                    pianoDraft === p
                      ? p === 'starter'   ? 'bg-slate-800 text-white border-slate-800'
                      : p === 'professional' ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data scadenza</label>
                <input
                  type="date"
                  value={scadenzaDraft}
                  onChange={e => setScadenzaDraft(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
                <textarea
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Note per uso interno…"
                />
              </div>
            </div>

            <button
              onClick={salvaPiano}
              disabled={savingPiano}
              className="w-full py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {savingPiano ? 'Salvataggio…' : 'Salva piano'}
            </button>
          </div>

          {/* Card Storico */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Storico piano</h2>
            {tenant.piano_log.length === 0 ? (
              <p className="text-xs text-gray-400">Nessuna modifica registrata.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {tenant.piano_log.map(log => (
                  <li key={log.id} className="py-2.5 flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold capitalize ${PIANO_COLORS[log.piano as PianoTenant]}`}>
                      {log.piano}
                    </span>
                    <div className="flex-1 min-w-0">
                      {log.note && <p className="text-xs text-gray-600 truncate">{log.note}</p>}
                      <p className="text-[11px] text-gray-400 font-mono">
                        {new Date(log.created_at).toLocaleString('it-IT')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        {/* ── Colonna destra ── */}
        <div className="space-y-6">

          {/* Card Moduli */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Moduli attivi</h2>
            {imp ? (
              <ul className="space-y-3">
                {Object.entries(FLAG_LABELS).map(([key, meta]) => {
                  const val = (imp as Record<string, boolean>)[key] ?? false
                  const isToggling = togglingFlag === key
                  return (
                    <li key={key} className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-800">{meta.label}</span>
                        {meta.piano && (
                          <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded capitalize ${PIANO_COLORS[meta.piano]}`}>
                            {meta.piano}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFlag(key, val)}
                        disabled={isToggling}
                        className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${val ? 'bg-slate-900' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">Impostazioni non trovate.</p>
            )}
          </div>

          {/* Card Utenti */}
          <div className="bg-white rounded-xl border border-slate-900/20 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Utenti</h2>
            <p className="text-2xl font-bold text-slate-900">{tenant.utenti_count}</p>
            <p className="text-xs text-gray-400 mb-3">utenti attivi</p>
            <p className="text-xs text-gray-400 italic">Lista utenti — disponibile prossimamente</p>
          </div>

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifica manuale**

Avvia `npm run dev`. Naviga a `/super-admin/tenants/<id_tenant>`.
- Header mostra nome, slug, badge stato e badge piano
- Pulsanti piano selezionano il piano corretto (evidenziato)
- Salva piano: verifica che i flag nella card Moduli cambino secondo la mappatura
- Toggle singolo flag: si aggiorna immediatamente senza ricaricare la pagina
- Storico mostra le righe inserite in `tenant_piano_log`

- [ ] **Step 3: Commit**

```bash
git add app/super-admin/tenants/
git commit -m "feat(super-admin): pagina dettaglio tenant con gestione piano e toggle moduli"
```

---

## Task 5: Aggiorna app/super-admin/tenants/page.tsx

**Files:**
- Modify: `app/super-admin/tenants/page.tsx`

Cambiamenti:
1. Tipo `Tenant` esteso con `piano`, `piano_scadenza`
2. Colonna "Piano" con badge colorato
3. Colonna "Scadenza" (data o "—")
4. Nome diventa `<Link href={/super-admin/tenants/${t.id}}>`
5. Rimuovere il form inline di modifica nome (stato `modificando`, `nomeEdit`, `salvandoEdit`, `avviaModifica`, `salvaModifica`) — la modifica si fa dalla pagina dettaglio
6. Rimuovere il pulsante "Modifica" dalla riga tabella

- [ ] **Step 1: Sostituisci il contenuto del file**

```typescript
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { TenantConPiano, PianoTenant } from '@/lib/types'

const PIANO_COLORS: Record<PianoTenant, string> = {
  starter:      'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise:   'bg-amber-100 text-amber-700',
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantConPiano[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '', slug: '', email_admin: '', password_admin: '', nome_admin: '', cognome_admin: '',
  })

  async function carica() {
    const res = await fetch('/api/super-admin/tenants')
    if (res.ok) setTenants(await res.json())
    setLoading(false)
  }

  useEffect(() => { carica() }, [])

  function onNomeChange(nome: string) {
    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setForm(f => ({ ...f, nome, slug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrore('')
    const res = await fetch('/api/super-admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ nome: '', slug: '', email_admin: '', password_admin: '', nome_admin: '', cognome_admin: '' })
      carica()
    } else {
      const d = await res.json()
      setErrore(d.error ?? 'Errore')
    }
    setSaving(false)
  }

  async function elimina(tenant: TenantConPiano) {
    if (!confirm(`Eliminare "${tenant.nome}"?\n\nQuesta azione è irreversibile.`)) return
    setEliminando(tenant.id)
    await fetch(`/api/super-admin/tenants?id=${tenant.id}`, { method: 'DELETE' })
    setEliminando(null)
    carica()
  }

  async function toggleAttivo(tenant: TenantConPiano) {
    await fetch('/api/super-admin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, attivo: !tenant.attivo }),
    })
    carica()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Tenant</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Annulla' : '+ Nuovo tenant'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-900/20 p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nuovo tenant</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome azienda *</label>
              <input
                required
                value={form.nome}
                onChange={e => onNomeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Rossi Srl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL) *</label>
              <input
                required
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                pattern="^[a-z0-9-]+$"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="rossi-srl"
              />
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-3">Utente admin (opzionale)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input value={form.nome_admin} onChange={e => setForm(f => ({ ...f, nome_admin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cognome</label>
                <input value={form.cognome_admin} onChange={e => setForm(f => ({ ...f, cognome_admin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email_admin} onChange={e => setForm(f => ({ ...f, email_admin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input type="password" value={form.password_admin} onChange={e => setForm(f => ({ ...f, password_admin: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
          {errore && <p className="text-sm text-red-600">{errore}</p>}
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Creazione…' : 'Crea tenant'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-900/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Piano</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scadenza</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/super-admin/tenants/${t.id}`} className="hover:underline text-blue-600">
                      {t.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{t.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PIANO_COLORS[t.piano as PianoTenant] ?? 'bg-gray-100 text-gray-500'}`}>
                      {t.piano}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {t.piano_scadenza
                      ? new Date(t.piano_scadenza).toLocaleDateString('it-IT')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.attivo ? 'Attivo' : 'Disattivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-3">
                    <Link href={`/super-admin/tenants/${t.id}`}
                      className="text-xs text-blue-500 hover:text-blue-700 underline">
                      Gestisci
                    </Link>
                    <button onClick={() => toggleAttivo(t)}
                      className="text-xs text-gray-500 hover:text-gray-800 underline">
                      {t.attivo ? 'Disattiva' : 'Attiva'}
                    </button>
                    <button onClick={() => elimina(t)} disabled={eliminando === t.id}
                      className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-40">
                      {eliminando === t.id ? 'Eliminazione…' : 'Elimina'}
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Nessun tenant</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verifica manuale**

Naviga a `/super-admin/tenants`.
- Colonna "Piano" mostra badge colorato (slate/blue/amber)
- Colonna "Scadenza" mostra "—" o data
- Clic sul nome naviga a `/super-admin/tenants/[id]`
- Il pulsante "Gestisci" naviga alla stessa pagina
- Form nuovo tenant funziona ancora

- [ ] **Step 3: Commit**

```bash
git add app/super-admin/tenants/page.tsx
git commit -m "feat(super-admin): colonne piano/scadenza in lista tenant, nome come link"
```

---

## Task 6: Aggiorna app/home/page.tsx

**Files:**
- Modify: `app/home/page.tsx`

Aggiungere una `AreaCard` nella sezione admin quando `isSuperAdmin === true`, con conteggio tenant attivi.

- [ ] **Step 1: Aggiungi la query tenant attivi e la card**

In `app/home/page.tsx`, dopo la riga `const isSuperAdmin = profile.is_super_admin === true`:

```typescript
  // Conteggio tenant attivi (solo super admin)
  let tenantsAttivi = 0
  if (isSuperAdmin) {
    const { count } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('attivo', true)
    tenantsAttivi = count ?? 0
  }
```

Poi nell'array `aree` per `isAdmin`, aggiungi come **primo elemento** quando `isSuperAdmin`:

```typescript
  const aree: AreaDef[] = isAdmin
    ? [
        ...(isSuperAdmin ? [{
          titolo: 'Gestione tenant',
          descrizione: `${tenantsAttivi} tenant attiv${tenantsAttivi === 1 ? 'o' : 'i'} sulla piattaforma`,
          href: '/super-admin/tenants',
          IconComp: ISettings,
          accent: 'violet' as AccentKey,
        }] : []),
        { titolo: 'Turni', ... },  // resto invariato
        ...
      ]
```

> **Nota:** non riscrivere l'intero array — aggiungi solo il blocco `...(isSuperAdmin ? [...] : [])` come primo elemento dell'array esistente.

- [ ] **Step 2: Verifica manuale**

Login come super admin su `/home`. La card "Gestione tenant" appare con sfondo violet. Il conteggio mostra i tenant attivi reali. Clic naviga a `/super-admin/tenants`.

Login come admin normale: la card non appare.

- [ ] **Step 3: Commit**

```bash
git add app/home/page.tsx
git commit -m "feat(home): AreaCard Gestione tenant per super admin con conteggio"
```

---

## Self-Review

**Spec coverage:**
1. ✅ Migration 024 con colonne piano/scadenza/note, 3 flag enterprise, tenant_piano_log con RLS → Task 1
2. ✅ API GET dettaglio (impostazioni, utenti_count, piano_log) → Task 3
3. ✅ API PATCH piano (applica flag automaticamente + log) → Task 3
4. ✅ API PATCH override singolo flag → Task 3
5. ✅ Pagina dettaglio due colonne con piano card, storico, toggle moduli, utenti → Task 4
6. ✅ Lista tenant con colonne piano/scadenza, nome link, rimozione form inline → Task 5
7. ✅ Home AreaCard super admin → Task 6
8. ✅ Non toccato: middleware.ts, lib/tenant.ts, API esistente tenants route.ts

**Placeholder scan:** nessun TBD o TODO nel piano.

**Type consistency:**
- `PianoTenant` definita in Task 2, usata in Task 3, 4, 5 ✅
- `TenantConPiano` definita in Task 2, usata in Task 5 ✅
- `TenantDettaglio` definita in Task 2, usata in Task 4 ✅
- `PIANO_FLAGS` in Task 3 usa le stesse chiavi di `ImpostazioniTenant` estesa in Task 2 ✅
- `FLAG_LABELS` in Task 4 usa le stesse chiavi ✅
