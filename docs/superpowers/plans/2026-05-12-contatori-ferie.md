# Feature 3: Contatori Ferie/Permessi/ROL — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Budget annuale ferie/permesso/ROL per dipendente, con saldo residuo calcolato dalle richieste approvate.

**Architecture:** Nuova tabella `contatori_ferie` con UNIQUE(tenant_id, dipendente_id, anno). API upsert GET+PUT. Card in admin utenti/[id] (editabile) e dipendente/profilo (sola lettura), entrambe gated da `modulo_ferie_contatori_abilitato`.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript. Pattern identico a Feature 1 (contratti).

---

### Task 1: Migration `039_contatori_ferie.sql`

**Files:**
- Create: `supabase/migrations/039_contatori_ferie.sql`

- [ ] **Step 1: Creare il file**

```sql
CREATE TABLE IF NOT EXISTS contatori_ferie (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dipendente_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anno             INT NOT NULL,
  ferie_giorni     NUMERIC(6,2) NOT NULL DEFAULT 0,
  permesso_ore     NUMERIC(6,2) NOT NULL DEFAULT 0,
  rol_ore          NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dipendente_id, anno)
);

ALTER TABLE contatori_ferie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_contatori" ON contatori_ferie
  FOR ALL USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
  ));

CREATE POLICY "manager_contatori_select" ON contatori_ferie
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo IN ('admin','manager')
  ));

CREATE POLICY "dipendente_contatori_select" ON contatori_ferie
  FOR SELECT USING (tenant_id = get_my_tenant_id() AND dipendente_id = auth.uid());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/039_contatori_ferie.sql
git commit -m "feat(contatori): migration tabella contatori_ferie con RLS"
```

---

### Task 2: Tipo TypeScript `ContatoreFerie`

**Files:**
- Modify: `lib/types.ts` — aggiungere alla fine del file

- [ ] **Step 1: Aggiungere tipo in `lib/types.ts`** (dopo `ContrattoDipendente`)

```typescript
export interface ContatoreFerie {
  id: string
  tenant_id: string
  dipendente_id: string
  anno: number
  ferie_giorni: number
  permesso_ore: number
  rol_ore: number
  created_at: string
  updated_at: string
}

export interface ContatoreFerieSaldo extends ContatoreFerie {
  ferie_usate: number
  permesso_usate: number
  rol_usate: number
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(contatori): tipi ContatoreFerie e ContatoreFerieSaldo"
```

---

### Task 3: API `GET /api/admin/contatori/[id]` e `PUT`

**Files:**
- Create: `app/api/admin/contatori/[id]/route.ts`

Il GET deve:
1. Verificare auth (admin o manager)
2. Leggere `anno` dal query param (default anno corrente)
3. Fetchare il record `contatori_ferie` per (dipendente_id, anno, tenant_id)
4. Calcolare saldo usato dalle richieste approvate nell'anno
5. Restituire budget + saldo

Per calcolare `permesso_usate`:
- richiesta con `permesso_tipo = 'giornata'` → 8 ore
- richiesta con `permesso_tipo = 'mezza_mattina'` o `'mezza_pomeriggio'` → 4 ore
- richiesta con `permesso_tipo = 'ore'` → calcola da `ora_inizio` e `ora_fine` (formato "HH:MM:SS")

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

function calcolaOrePermesso(tipo: string | null, oraInizio: string | null, oraFine: string | null): number {
  if (tipo === 'giornata') return 8
  if (tipo === 'mezza_mattina' || tipo === 'mezza_pomeriggio') return 4
  if (tipo === 'ore' && oraInizio && oraFine) {
    const [hI, mI] = oraInizio.slice(0, 5).split(':').map(Number)
    const [hF, mF] = oraFine.slice(0, 5).split(':').map(Number)
    return Math.max(0, (hF * 60 + mF - hI * 60 - mI) / 60)
  }
  return 0
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { searchParams } = new URL(req.url)
  const anno = parseInt(searchParams.get('anno') ?? String(new Date().getFullYear()), 10)

  const admin = createAdminClient()

  const [{ data: contatore }, { data: richieste }] = await Promise.all([
    admin
      .from('contatori_ferie')
      .select('*')
      .eq('dipendente_id', params.id)
      .eq('tenant_id', tenantId)
      .eq('anno', anno)
      .single(),
    admin
      .from('richieste')
      .select('tipo, permesso_tipo, ora_inizio, ora_fine, data_inizio')
      .eq('dipendente_id', params.id)
      .eq('tenant_id', tenantId)
      .eq('stato', 'approvata')
      .in('tipo', ['ferie', 'permesso'])
      .gte('data_inizio', `${anno}-01-01`)
      .lte('data_inizio', `${anno}-12-31`),
  ])

  const ferie_usate = (richieste ?? []).filter(r => r.tipo === 'ferie').length
  const permesso_usate = (richieste ?? [])
    .filter(r => r.tipo === 'permesso')
    .reduce((acc, r) => acc + calcolaOrePermesso(r.permesso_tipo, r.ora_inizio, r.ora_fine), 0)

  const base = {
    anno,
    ferie_giorni: contatore?.ferie_giorni ?? 0,
    permesso_ore: contatore?.permesso_ore ?? 0,
    rol_ore: contatore?.rol_ore ?? 0,
  }

  return NextResponse.json({
    ...base,
    ferie_usate,
    permesso_usate,
    rol_usate: 0,
  })
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await checkAccesso()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  if (ctx.ruolo !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const tenantId = requireTenantId()
  const body = await req.json() as {
    anno: number
    ferie_giorni: number
    permesso_ore: number
    rol_ore: number
  }

  const { data, error } = await createAdminClient()
    .from('contatori_ferie')
    .upsert({
      tenant_id: tenantId,
      dipendente_id: params.id,
      anno: body.anno,
      ferie_giorni: body.ferie_giorni,
      permesso_ore: body.permesso_ore,
      rol_ore: body.rol_ore,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,dipendente_id,anno' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/admin/contatori/[id]/route.ts"
git commit -m "feat(contatori): API GET+PUT contatori ferie dipendente"
```

---

### Task 4: Card admin in `app/admin/utenti/[id]/page.tsx`

**Files:**
- Modify: `app/admin/utenti/[id]/page.tsx`

La pagina è già un Client Component con pattern fetch/state esistente (vedi Feature 1 contratti).

- [ ] **Step 1: Aggiungere import tipo**

Dopo `import type { ContrattoDipendente } from '@/lib/types'`, aggiungere:
```typescript
import type { ContatoreFerieSaldo } from '@/lib/types'
```

- [ ] **Step 2: Aggiungere state contatori**

Dopo gli state del contratto, aggiungere:
```typescript
  const [contatoriAbilitato, setContatoriAbilitato] = useState(false)
  const [annoContatori, setAnnoContatori] = useState(new Date().getFullYear())
  const [contatoriSaldo, setContatoriSaldo] = useState<ContatoreFerieSaldo | null>(null)
  const [contatoriForm, setContatoriForm] = useState({ ferie_giorni: 0, permesso_ore: 0, rol_ore: 0 })
  const [salvandoContatori, setSalvandoContatori] = useState(false)
```

- [ ] **Step 3: Aggiungere fetch contatori nell'useEffect**

Modificare il Promise.all esistente per aggiungere una quarta fetch:
```typescript
    Promise.all([
      fetch('/api/utenti').then(r => r.json()),
      fetch('/api/impostazioni').then(r => r.json()),
      fetch(`/api/admin/contratti/${id}`).then(r => r.json()),
      fetch(`/api/admin/contatori/${id}?anno=${new Date().getFullYear()}`).then(r => r.json()),
    ]).then(([utenti, imp, c, cnt]: [Profile[], { modulo_contratti_abilitato?: boolean; modulo_ferie_contatori_abilitato?: boolean }, ContrattoDipendente | null, ContatoreFerieSaldo]) => {
      const u = utenti.find(u => u.id === id)
      if (u) setForm({ nome: u.nome, cognome: u.cognome, ruolo: u.ruolo, attivo: u.attivo, includi_in_turni: u.includi_in_turni, matricola: (u as unknown as { matricola?: string }).matricola ?? '' })
      setContrattiAbilitato(imp?.modulo_contratti_abilitato ?? false)
      setContatoriAbilitato(imp?.modulo_ferie_contatori_abilitato ?? false)
      if (c) {
        setContratto(c)
        setContrattoForm({ tipo: c.tipo, ore_settimanali: c.ore_settimanali, ore_giornaliere: c.ore_giornaliere, data_inizio: c.data_inizio })
      }
      if (cnt) {
        setContatoriSaldo(cnt)
        setContatoriForm({ ferie_giorni: cnt.ferie_giorni, permesso_ore: cnt.permesso_ore, rol_ore: cnt.rol_ore })
      }
    }).catch(err => console.error('Errore caricamento dati:', err))
```

- [ ] **Step 4: Aggiungere funzione per cambio anno contatori**

Dopo la funzione `salvaContratto`, aggiungere:
```typescript
  async function cambiaAnnoContatori(nuovoAnno: number) {
    setAnnoContatori(nuovoAnno)
    const res = await fetch(`/api/admin/contatori/${id}?anno=${nuovoAnno}`)
    if (res.ok) {
      const cnt = await res.json() as ContatoreFerieSaldo
      setContatoriSaldo(cnt)
      setContatoriForm({ ferie_giorni: cnt.ferie_giorni, permesso_ore: cnt.permesso_ore, rol_ore: cnt.rol_ore })
    }
  }

  async function salvaContatori(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoContatori(true)
    try {
      const res = await fetch(`/api/admin/contatori/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anno: annoContatori, ...contatoriForm }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        alert(json.error ?? 'Impossibile salvare i contatori.')
        return
      }
    } finally {
      setSalvandoContatori(false)
    }
  }
```

- [ ] **Step 5: Aggiungere card JSX**

Dopo la card contratto nel return JSX, aggiungere:
```tsx
      {contatoriAbilitato && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Ferie e permessi</h2>
            <select
              className="text-sm border border-gray-200 rounded-lg px-2 py-1"
              value={annoContatori}
              onChange={e => cambiaAnnoContatori(parseInt(e.target.value, 10))}
            >
              {[annoContatori - 1, annoContatori, annoContatori + 1].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <form onSubmit={salvaContatori} className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 pb-1">
              <span>Tipo</span><span>Budget</span><span>Usato / Residuo</span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm text-gray-700">Ferie (giorni)</span>
              <Input
                type="number" min={0} max={365} step={0.5}
                value={contatoriForm.ferie_giorni}
                onChange={e => setContatoriForm(f => ({ ...f, ferie_giorni: parseFloat(e.target.value) }))}
              />
              <span className="text-sm text-gray-600">
                {contatoriSaldo?.ferie_usate ?? 0} / {Math.max(0, contatoriForm.ferie_giorni - (contatoriSaldo?.ferie_usate ?? 0))}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm text-gray-700">Permesso (ore)</span>
              <Input
                type="number" min={0} max={999} step={0.5}
                value={contatoriForm.permesso_ore}
                onChange={e => setContatoriForm(f => ({ ...f, permesso_ore: parseFloat(e.target.value) }))}
              />
              <span className="text-sm text-gray-600">
                {contatoriSaldo?.permesso_usate ?? 0} / {Math.max(0, contatoriForm.permesso_ore - (contatoriSaldo?.permesso_usate ?? 0))}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm text-gray-700">ROL (ore)</span>
              <Input
                type="number" min={0} max={999} step={0.5}
                value={contatoriForm.rol_ore}
                onChange={e => setContatoriForm(f => ({ ...f, rol_ore: parseFloat(e.target.value) }))}
              />
              <span className="text-sm text-gray-400 text-xs">tracking futuro</span>
            </div>
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={salvandoContatori}>
                {salvandoContatori ? 'Salvataggio...' : 'Salva budget'}
              </Button>
            </div>
          </form>
        </div>
      )}
```

- [ ] **Step 6: Commit**

```bash
git add "app/admin/utenti/[id]/page.tsx"
git commit -m "feat(contatori): card ferie/permessi/ROL nella pagina admin utente"
```

---

### Task 5: Card read-only in `app/dipendente/profilo/page.tsx`

**Files:**
- Modify: `app/dipendente/profilo/page.tsx`

- [ ] **Step 1: Aggiungere import tipo e state**

Dopo gli import esistenti, aggiungere:
```typescript
import type { ContatoreFerieSaldo } from '@/lib/types'
```

Nel componente, dopo `const supabase = createClient()`, aggiungere:
```typescript
  const [contatoriAbilitato, setContatoriAbilitato] = useState(false)
  const [contatori, setContatori] = useState<ContatoreFerieSaldo | null>(null)
  const annoCorrente = new Date().getFullYear()
```

- [ ] **Step 2: Aggiungere fetch nell'useEffect**

Modificare l'useEffect esistente per fetchare anche impostazioni e contatori:
```typescript
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => data),
        fetch('/api/impostazioni').then(r => r.json()),
        fetch(`/api/admin/contatori/${user.id}?anno=${new Date().getFullYear()}`).then(r => r.json()),
      ]).then(([p, imp, cnt]: [Profile | null, { modulo_ferie_contatori_abilitato?: boolean }, ContatoreFerieSaldo]) => {
        setProfilo(p)
        setContatoriAbilitato(imp?.modulo_ferie_contatori_abilitato ?? false)
        if (cnt) setContatori(cnt)
      }).catch(err => console.error('Errore caricamento profilo:', err))
    })
  }, [])
```

- [ ] **Step 3: Aggiungere card JSX (sola lettura)**

Nel return, dopo la card "Dati personali" (dopo il primo `</div>` che chiude quella card) e prima della card "Cambia password", aggiungere:
```tsx
      {contatoriAbilitato && contatori && (
        <div className="bg-white rounded-xl border border-slate-900/20 p-6 space-y-3" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
          <h2 className="font-semibold text-slate-800">Ferie e permessi {annoCorrente}</h2>
          <div className="space-y-2">
            {[
              { label: 'Ferie', usate: contatori.ferie_usate, totale: contatori.ferie_giorni, unita: 'gg' },
              { label: 'Permesso', usate: contatori.permesso_usate, totale: contatori.permesso_ore, unita: 'h' },
              { label: 'ROL', usate: contatori.rol_usate, totale: contatori.rol_ore, unita: 'h' },
            ].map(({ label, usate, totale, unita }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${totale > 0 ? Math.min(100, (usate / totale) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-20 text-right">
                    {usate}/{totale} {unita}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Commit**

```bash
git add app/dipendente/profilo/page.tsx
git commit -m "feat(contatori): card saldo ferie/permessi nel profilo dipendente"
```
