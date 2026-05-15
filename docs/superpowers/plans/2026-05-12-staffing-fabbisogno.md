# Feature 4: Staffing/Fabbisogno — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Definire il minimo di persone per posto×giorno settimana e visualizzare copertura vs fabbisogno in una pagina dedicata.

**Architecture:** Tabella `staffing_fabbisogno`, due API (configurazione per posto, report settimanale), pagina `/admin/staffing` con view settimanale + sezione configurazione, link in sidebar gated da `modulo_staffing_abilitato`.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript.

---

### Task 1: Migration `040_staffing_fabbisogno.sql`

**Files:**
- Create: `supabase/migrations/040_staffing_fabbisogno.sql`

- [ ] **Step 1: Creare il file**

```sql
CREATE TABLE IF NOT EXISTS staffing_fabbisogno (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  posto_id         UUID NOT NULL REFERENCES posti_di_servizio(id) ON DELETE CASCADE,
  giorno_settimana INT NOT NULL CHECK (giorno_settimana BETWEEN 0 AND 6),
  min_persone      INT NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, posto_id, giorno_settimana)
);

ALTER TABLE staffing_fabbisogno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_staffing" ON staffing_fabbisogno
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

CREATE POLICY "manager_staffing_select" ON staffing_fabbisogno
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin','manager')
  ));
```

Note: `giorno_settimana` usa convenzione ISO: 0 = Lunedì, 6 = Domenica.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/040_staffing_fabbisogno.sql
git commit -m "feat(staffing): migration tabella staffing_fabbisogno"
```

---

### Task 2: API configurazione `GET/PUT /api/admin/staffing/posti/[id]`

**Files:**
- Create: `app/api/admin/staffing/posti/[id]/route.ts`

- [ ] **Step 1: Creare il file**

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAccesso() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return { ruolo: data.ruolo as string }
}

const GIORNI = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica']

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { data } = await createAdminClient()
    .from('staffing_fabbisogno')
    .select('giorno_settimana, min_persone')
    .eq('posto_id', params.id)
    .eq('tenant_id', tenantId)
    .order('giorno_settimana')

  const map = new Map((data ?? []).map(r => [r.giorno_settimana as number, r.min_persone as number]))
  const fabbisogno = Array.from({ length: 7 }, (_, i) => ({
    giorno_settimana: i,
    label: GIORNI[i],
    min_persone: map.get(i) ?? 0,
  }))

  return NextResponse.json(fabbisogno)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  if (ctx.ruolo !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const tenantId = requireTenantId()
  const { fabbisogno } = await req.json() as {
    fabbisogno: Array<{ giorno_settimana: number; min_persone: number }>
  }

  const rows = fabbisogno.map(f => ({
    tenant_id: tenantId,
    posto_id: params.id,
    giorno_settimana: f.giorno_settimana,
    min_persone: Math.max(0, f.min_persone),
  }))

  const { error } = await createAdminClient()
    .from('staffing_fabbisogno')
    .upsert(rows, { onConflict: 'tenant_id,posto_id,giorno_settimana' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/admin/staffing/posti/[id]/route.ts"
git commit -m "feat(staffing): API configurazione fabbisogno per posto"
```

---

### Task 3: API report `GET /api/admin/staffing`

**Files:**
- Create: `app/api/admin/staffing/route.ts`

Dato un lunedì di settimana (`?settimana=YYYY-MM-DD`), restituisce per ogni posto attivo i 7 giorni con `confermati` e `minimo`.

- [ ] **Step 1: Creare il file**

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAccesso() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin' && data?.ruolo !== 'manager') return null
  return user
}

function lunediSettimana(dateStr?: string | null): Date {
  const d = dateStr ? new Date(dateStr) : new Date()
  const day = d.getDay() // 0=dom, 1=lun...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const user = await checkAccesso()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { searchParams } = new URL(req.url)
  const lun = lunediSettimana(searchParams.get('settimana'))

  const giorni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lun)
    d.setDate(lun.getDate() + i)
    return toDateStr(d)
  })

  const admin = createAdminClient()

  const [{ data: posti }, { data: fabbisogni }, { data: turni }] = await Promise.all([
    admin.from('posti_di_servizio').select('id, nome').eq('tenant_id', tenantId).eq('attivo', true).order('nome'),
    admin.from('staffing_fabbisogno').select('posto_id, giorno_settimana, min_persone').eq('tenant_id', tenantId),
    admin.from('turni').select('posto_id, data').eq('tenant_id', tenantId).eq('stato', 'confermato')
      .gte('data', giorni[0]).lte('data', giorni[6]).not('posto_id', 'is', null),
  ])

  const fabMap = new Map<string, number>()
  for (const f of fabbisogni ?? []) {
    fabMap.set(`${f.posto_id}-${f.giorno_settimana}`, f.min_persone as number)
  }

  const turniMap = new Map<string, number>()
  for (const t of turni ?? []) {
    const key = `${t.posto_id}-${t.data}`
    turniMap.set(key, (turniMap.get(key) ?? 0) + 1)
  }

  const result = (posti ?? []).map(posto => ({
    posto_id: posto.id,
    posto_nome: posto.nome,
    giorni: giorni.map((data, i) => {
      const confermati = turniMap.get(`${posto.id}-${data}`) ?? 0
      const minimo = fabMap.get(`${posto.id}-${i}`) ?? 0
      return { data, giorno: i, confermati, minimo, ok: confermati >= minimo }
    }),
  }))

  return NextResponse.json({ settimana: giorni[0], posti: result })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/staffing/route.ts
git commit -m "feat(staffing): API report settimanale turni vs fabbisogno"
```

---

### Task 4: Pagina `/admin/staffing`

**Files:**
- Create: `app/admin/staffing/page.tsx`

La pagina ha due sezioni:
1. **View settimanale** — tabella posti × giorni con badge verde/rosso
2. **Configurazione** — accordion per ogni posto con 7 input numerici (visibile solo se admin)

- [ ] **Step 1: Creare il file**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

type GiornoReport = { data: string; giorno: number; confermati: number; minimo: number; ok: boolean }
type PostoReport = { posto_id: string; posto_nome: string; giorni: GiornoReport[] }
type FabbisognoGiorno = { giorno_settimana: number; label: string; min_persone: number }

const GIORNI_BREVI = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

function lunediCorrente(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function StaffingPage() {
  const [settimana, setSettimana] = useState(lunediCorrente)
  const [report, setReport] = useState<PostoReport[]>([])
  const [loading, setLoading] = useState(false)
  const [configAperto, setConfigAperto] = useState<string | null>(null)
  const [fabbisogni, setFabbisogni] = useState<Record<string, FabbisognoGiorno[]>>({})
  const [salvando, setSalvando] = useState(false)

  async function caricaReport(s: string) {
    setLoading(true)
    const res = await fetch(`/api/admin/staffing?settimana=${s}`)
    if (res.ok) {
      const data = await res.json() as { posti: PostoReport[] }
      setReport(data.posti)
    }
    setLoading(false)
  }

  useEffect(() => { caricaReport(settimana) }, [settimana])

  async function apriConfig(postoId: string) {
    if (configAperto === postoId) { setConfigAperto(null); return }
    setConfigAperto(postoId)
    if (!fabbisogni[postoId]) {
      const res = await fetch(`/api/admin/staffing/posti/${postoId}`)
      if (res.ok) {
        const data = await res.json() as FabbisognoGiorno[]
        setFabbisogni(f => ({ ...f, [postoId]: data }))
      }
    }
  }

  async function salvaFabbisogno(postoId: string) {
    setSalvando(true)
    try {
      const res = await fetch(`/api/admin/staffing/posti/${postoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fabbisogno: fabbisogni[postoId] }),
      })
      if (!res.ok) { alert('Errore salvataggio'); return }
      caricaReport(settimana)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Staffing</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSettimana(s => addDays(s, -7))}>← Prec.</Button>
          <span className="text-sm text-gray-600 font-medium">{settimana} — {addDays(settimana, 6)}</span>
          <Button variant="secondary" size="sm" onClick={() => setSettimana(s => addDays(s, 7))}>Succ. →</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-3 font-medium text-gray-700">Posto</th>
                {GIORNI_BREVI.map((g, i) => (
                  <th key={i} className="text-center p-3 font-medium text-gray-700 min-w-[70px]">{g}</th>
                ))}
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {report.map(posto => (
                <>
                  <tr key={posto.posto_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{posto.posto_nome}</td>
                    {posto.giorni.map(g => (
                      <td key={g.giorno} className="p-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          g.minimo === 0 ? 'bg-gray-100 text-gray-500'
                          : g.ok ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                          {g.confermati}/{g.minimo}
                        </span>
                      </td>
                    ))}
                    <td className="p-2">
                      <button
                        onClick={() => apriConfig(posto.posto_id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {configAperto === posto.posto_id ? 'Chiudi' : 'Configura'}
                      </button>
                    </td>
                  </tr>
                  {configAperto === posto.posto_id && fabbisogni[posto.posto_id] && (
                    <tr key={`${posto.posto_id}-config`} className="bg-blue-50">
                      <td colSpan={9} className="p-4">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Minimo persone per giorno:</p>
                          <div className="grid grid-cols-7 gap-2">
                            {fabbisogni[posto.posto_id].map(f => (
                              <div key={f.giorno_settimana} className="space-y-1">
                                <label className="text-xs text-gray-500">{f.label.slice(0,3)}</label>
                                <input
                                  type="number" min={0} max={99}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center"
                                  value={f.min_persone}
                                  onChange={e => setFabbisogni(prev => ({
                                    ...prev,
                                    [posto.posto_id]: prev[posto.posto_id].map(x =>
                                      x.giorno_settimana === f.giorno_settimana
                                        ? { ...x, min_persone: parseInt(e.target.value) || 0 }
                                        : x
                                    )
                                  }))}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button size="sm" onClick={() => salvaFabbisogno(posto.posto_id)} disabled={salvando}>
                              {salvando ? 'Salvataggio...' : 'Salva'}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {report.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-sm text-gray-400">
                    Nessun posto di servizio attivo.
                  </td>
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

- [ ] **Step 2: Commit**

```bash
git add app/admin/staffing/page.tsx
git commit -m "feat(staffing): pagina report settimanale staffing"
```

---

### Task 5: Sidebar e layout

**Files:**
- Modify: `components/layout/SidebarAdmin.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Aggiungere `staffing` all'interfaccia Moduli in `SidebarAdmin.tsx`**

Trovare:
```typescript
interface Moduli {
  tasks?: boolean
  documenti?: boolean
  cedolini?: boolean
  analytics?: boolean
  paghe?: boolean
  whiteLabelAbilitato?: boolean
}
```
Sostituire con:
```typescript
interface Moduli {
  tasks?: boolean
  documenti?: boolean
  cedolini?: boolean
  analytics?: boolean
  paghe?: boolean
  staffing?: boolean
  whiteLabelAbilitato?: boolean
}
```

- [ ] **Step 2: Aggiungere item staffing negli items in `SidebarAdmin.tsx`**

Trovare la riga:
```typescript
    ...(moduli?.analytics           ? [{ section: 'Gestione', label: 'Analytics', href: '/admin/analytics', icon: '📊' }] : []),
```
Dopo quella riga, aggiungere:
```typescript
    ...(moduli?.staffing            ? [{ section: 'Gestione', label: 'Staffing',  href: '/admin/staffing',  icon: '👥' }] : []),
```

- [ ] **Step 3: Passare il flag in `app/admin/layout.tsx`**

Trovare nel JSX:
```typescript
      <SidebarAdmin moduli={{ tasks: moduli.modulo_tasks_abilitato, documenti: moduli.modulo_documenti_abilitato, cedolini: moduli.modulo_cedolini_abilitato, analytics: moduli.modulo_analytics_abilitato, paghe: moduli.modulo_paghe_abilitato, whiteLabelAbilitato: imp.white_label_abilitato }} />
```
Sostituire con:
```typescript
      <SidebarAdmin moduli={{ tasks: moduli.modulo_tasks_abilitato, documenti: moduli.modulo_documenti_abilitato, cedolini: moduli.modulo_cedolini_abilitato, analytics: moduli.modulo_analytics_abilitato, paghe: moduli.modulo_paghe_abilitato, staffing: imp.modulo_staffing_abilitato, whiteLabelAbilitato: imp.white_label_abilitato }} />
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/SidebarAdmin.tsx app/admin/layout.tsx
git commit -m "feat(staffing): link staffing in sidebar admin"
```
