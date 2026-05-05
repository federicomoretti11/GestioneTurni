# Archivio Documenti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un modulo archivio documenti aziendali all'area admin, con categorie, upload file, anteprima e download.

**Architecture:** Supabase Storage (bucket `documenti`, privato) per i file; due tabelle Postgres (`categorie_documenti`, `documenti`) con RLS per isolamento tenant. API Next.js App Router servono l'UI client-side. Signed URL server-side per accesso sicuro ai file.

**Tech Stack:** Next.js 14 App Router, Supabase Storage, Supabase Postgres + RLS, TypeScript, Tailwind CSS.

---

## File Map

| File | Azione |
|------|--------|
| `supabase/migrations/018_archivio_documenti.sql` | Crea — tabelle + RLS |
| `app/api/admin/categorie-documenti/route.ts` | Crea — GET lista, POST crea |
| `app/api/admin/categorie-documenti/[id]/route.ts` | Crea — PATCH rinomina, DELETE elimina |
| `app/api/admin/documenti/route.ts` | Crea — GET lista, POST upload |
| `app/api/admin/documenti/[id]/route.ts` | Crea — DELETE |
| `app/api/admin/documenti/[id]/url/route.ts` | Crea — GET signed URLs |
| `app/admin/documenti/page.tsx` | Crea — UI completa |
| `components/layout/SidebarAdmin.tsx` | Modifica — aggiungi voce "Documenti" |

---

## Task 1: Migration SQL

**Files:**
- Create: `supabase/migrations/018_archivio_documenti.sql`

- [ ] **Step 1: Crea il file di migration**

```sql
-- supabase/migrations/018_archivio_documenti.sql

CREATE TABLE categorie_documenti (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  ordine     INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  categoria_id     UUID NOT NULL REFERENCES categorie_documenti(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  storage_path     TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  dimensione_bytes BIGINT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE categorie_documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_categorie_documenti" ON categorie_documenti FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND (get_is_super_admin() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
    ))
  );

CREATE POLICY "admin_documenti" ON documenti FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND (get_is_super_admin() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND ruolo = 'admin'
    ))
  );
```

- [ ] **Step 2: Applica la migration nel SQL Editor di Supabase Dashboard**

Vai su Supabase Dashboard → SQL Editor → incolla il contenuto del file → Run.
Verifica che non ci siano errori.

- [ ] **Step 3: Crea il bucket Storage manualmente**

Supabase Dashboard → Storage → New bucket:
- Name: `documenti`
- Public bucket: **OFF** (privato)
- Clicca "Save"

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/018_archivio_documenti.sql
git commit -m "feat(db): migration 018 - tabelle archivio documenti + RLS"
```

---

## Task 2: API Categorie — lista e crea

**Files:**
- Create: `app/api/admin/categorie-documenti/route.ts`

- [ ] **Step 1: Crea il file**

```typescript
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin') return null
  return { user, supabase }
}

export async function GET() {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { data, error } = await ctx.supabase
    .from('categorie_documenti')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('ordine')
    .order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const { nome } = await request.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'nome obbligatorio' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('categorie_documenti')
    .insert({ tenant_id: tenantId, nome: nome.trim() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Verifica manualmente**

Avvia `npm run dev`, apri `http://localhost:3000/api/admin/categorie-documenti` da browser mentre sei loggato come admin → deve restituire `[]`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/categorie-documenti/route.ts
git commit -m "feat(api): GET/POST categorie-documenti"
```

---

## Task 3: API Categorie — modifica e elimina

**Files:**
- Create: `app/api/admin/categorie-documenti/[id]/route.ts`

- [ ] **Step 1: Crea il file**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin') return null
  return { supabase }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { nome } = await request.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'nome obbligatorio' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('categorie_documenti')
    .update({ nome: nome.trim() })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { count } = await ctx.supabase
    .from('documenti')
    .select('*', { count: 'exact', head: true })
    .eq('categoria_id', params.id)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Impossibile eliminare: la categoria contiene documenti' },
      { status: 409 }
    )
  }

  const { error } = await ctx.supabase
    .from('categorie_documenti')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/admin/categorie-documenti/[id]/route.ts"
git commit -m "feat(api): PATCH/DELETE categorie-documenti/[id]"
```

---

## Task 4: API Documenti — lista e upload

**Files:**
- Create: `app/api/admin/documenti/route.ts`

- [ ] **Step 1: Crea il file**

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin') return null
  return { user, supabase }
}

export async function GET(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const categoriaId = searchParams.get('categoria_id')
  if (!categoriaId) return NextResponse.json({ error: 'categoria_id obbligatorio' }, { status: 400 })

  const { data, error } = await ctx.supabase
    .from('documenti')
    .select('*')
    .eq('categoria_id', categoriaId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const tenantId = requireTenantId()
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const categoriaId = formData.get('categoria_id') as string | null

  if (!file || !categoriaId) {
    return NextResponse.json({ error: 'file e categoria_id obbligatori' }, { status: 400 })
  }

  const docId = crypto.randomUUID()
  const storagePath = `${tenantId}/${docId}/${file.name}`
  const bytes = await file.arrayBuffer()

  const adminClient = createAdminClient()
  const { error: uploadError } = await adminClient.storage
    .from('documenti')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data, error } = await ctx.supabase
    .from('documenti')
    .insert({
      id: docId,
      tenant_id: tenantId,
      categoria_id: categoriaId,
      nome: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      dimensione_bytes: file.size,
      created_by: ctx.user.id,
    })
    .select()
    .single()
  if (error) {
    await adminClient.storage.from('documenti').remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/documenti/route.ts
git commit -m "feat(api): GET/POST documenti con upload su Supabase Storage"
```

---

## Task 5: API Documenti — elimina e signed URL

**Files:**
- Create: `app/api/admin/documenti/[id]/route.ts`
- Create: `app/api/admin/documenti/[id]/url/route.ts`

- [ ] **Step 1: Crea il file DELETE**

```typescript
// app/api/admin/documenti/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin') return null
  return { supabase }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data: doc } = await ctx.supabase
    .from('documenti')
    .select('storage_path')
    .eq('id', params.id)
    .single()

  const { error } = await ctx.supabase
    .from('documenti')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (doc?.storage_path) {
    const adminClient = createAdminClient()
    await adminClient.storage.from('documenti').remove([doc.storage_path])
  }

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Crea il file URL**

```typescript
// app/api/admin/documenti/[id]/url/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('ruolo').eq('id', user.id).single()
  if (data?.ruolo !== 'admin') return null
  return { supabase }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data: doc } = await ctx.supabase
    .from('documenti')
    .select('storage_path, nome')
    .eq('id', params.id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })

  const adminClient = createAdminClient()

  const { data: previewData } = await adminClient.storage
    .from('documenti')
    .createSignedUrl(doc.storage_path, 3600)

  const { data: downloadData } = await adminClient.storage
    .from('documenti')
    .createSignedUrl(doc.storage_path, 3600, { download: doc.nome })

  return NextResponse.json({
    preview_url: previewData?.signedUrl ?? null,
    download_url: downloadData?.signedUrl ?? null,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/admin/documenti/[id]/route.ts" "app/api/admin/documenti/[id]/url/route.ts"
git commit -m "feat(api): DELETE documenti e GET signed URL preview/download"
```

---

## Task 6: UI Pagina Documenti

**Files:**
- Create: `app/admin/documenti/page.tsx`

- [ ] **Step 1: Crea il file**

```typescript
'use client'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Categoria {
  id: string
  nome: string
  ordine: number
}

interface Documento {
  id: string
  nome: string
  mime_type: string
  dimensione_bytes: number
  created_at: string
}

function iconaFile(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  return '📁'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentiPage() {
  const [categorie, setCategorie] = useState<Categoria[]>([])
  const [categoriaAttiva, setCategoriaAttiva] = useState<string | null>(null)
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [nuovaCategoria, setNuovaCategoria] = useState('')
  const [addingCategoria, setAddingCategoria] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [erroreUpload, setErroreUpload] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function caricaCategorie() {
    const res = await fetch('/api/admin/categorie-documenti')
    if (res.ok) {
      const data: Categoria[] = await res.json()
      setCategorie(data)
      if (data.length > 0 && !categoriaAttiva) setCategoriaAttiva(data[0].id)
    }
  }

  async function caricaDocumenti(catId: string) {
    const res = await fetch(`/api/admin/documenti?categoria_id=${catId}`)
    if (res.ok) setDocumenti(await res.json())
  }

  useEffect(() => { caricaCategorie() }, [])

  useEffect(() => {
    if (categoriaAttiva) caricaDocumenti(categoriaAttiva)
    else setDocumenti([])
  }, [categoriaAttiva])

  async function creaCategoria(e: React.FormEvent) {
    e.preventDefault()
    if (!nuovaCategoria.trim()) return
    const res = await fetch('/api/admin/categorie-documenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nuovaCategoria.trim() }),
    })
    if (res.ok) {
      const cat: Categoria = await res.json()
      setNuovaCategoria('')
      setAddingCategoria(false)
      await caricaCategorie()
      setCategoriaAttiva(cat.id)
    }
  }

  async function eliminaCategoria(cat: Categoria) {
    if (!confirm(`Eliminare la categoria "${cat.nome}"?`)) return
    const res = await fetch(`/api/admin/categorie-documenti/${cat.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      alert('Impossibile eliminare: la categoria contiene documenti.')
      return
    }
    if (res.ok) {
      if (categoriaAttiva === cat.id) setCategoriaAttiva(null)
      await caricaCategorie()
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !categoriaAttiva) return
    setUploading(true)
    setErroreUpload('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('categoria_id', categoriaAttiva)
    const res = await fetch('/api/admin/documenti', { method: 'POST', body: fd })
    if (res.ok) {
      await caricaDocumenti(categoriaAttiva)
    } else {
      const d = await res.json()
      setErroreUpload(d.error ?? 'Errore durante il caricamento')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function eliminaDocumento(doc: Documento) {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return
    const res = await fetch(`/api/admin/documenti/${doc.id}`, { method: 'DELETE' })
    if (res.ok && categoriaAttiva) await caricaDocumenti(categoriaAttiva)
  }

  async function apriUrl(docId: string, tipo: 'preview' | 'download') {
    const res = await fetch(`/api/admin/documenti/${docId}/url`)
    if (!res.ok) return
    const { preview_url, download_url } = await res.json()
    const url = tipo === 'preview' ? preview_url : download_url
    if (url) window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Archivio documenti</h1>
      <div className="flex gap-6 min-h-[500px]">

        {/* Sidebar categorie */}
        <div className="w-52 shrink-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Categorie</p>
          {categorie.map(cat => (
            <div
              key={cat.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                categoriaAttiva === cat.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setCategoriaAttiva(cat.id)}
            >
              <span className="truncate">{cat.nome}</span>
              <button
                onClick={ev => { ev.stopPropagation(); eliminaCategoria(cat) }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs ml-1"
              >✕</button>
            </div>
          ))}

          {addingCategoria ? (
            <form onSubmit={creaCategoria} className="pt-1">
              <input
                autoFocus
                value={nuovaCategoria}
                onChange={e => setNuovaCategoria(e.target.value)}
                placeholder="Nome categoria"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm mb-1"
              />
              <div className="flex gap-1">
                <Button type="submit" size="sm">Crea</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setAddingCategoria(false)}>✕</Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingCategoria(true)}
              className="w-full text-left text-sm text-gray-400 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              + Nuova categoria
            </button>
          )}
        </div>

        {/* Area documenti */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5">
          {!categoriaAttiva ? (
            <p className="text-sm text-gray-400 text-center pt-12">Seleziona una categoria</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {categorie.find(c => c.id === categoriaAttiva)?.nome}
                </p>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={uploadFile}
                  />
                  <Button
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? 'Caricamento…' : '+ Carica documento'}
                  </Button>
                </div>
              </div>

              {erroreUpload && (
                <p className="text-sm text-red-600">{erroreUpload}</p>
              )}

              {documenti.length === 0 ? (
                <p className="text-sm text-gray-400 text-center pt-8">Nessun documento in questa categoria</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {documenti.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 py-3">
                      <span className="text-xl">{iconaFile(doc.mime_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(doc.dimensione_bytes)} · {new Date(doc.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => apriUrl(doc.id, 'preview')}
                          className="text-xs text-blue-600 hover:underline"
                        >Anteprima</button>
                        <button
                          onClick={() => apriUrl(doc.id, 'download')}
                          className="text-xs text-blue-600 hover:underline"
                        >Scarica</button>
                        <button
                          onClick={() => eliminaDocumento(doc)}
                          className="text-xs text-red-500 hover:underline"
                        >Elimina</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifica in browser**

Avvia `npm run dev`, vai su `http://localhost:3000/admin/documenti`:
- Deve mostrare la pagina con sidebar vuota e area destra con "Seleziona una categoria"
- Crea una categoria → compare nella sidebar
- Selezionala → appare il pulsante "Carica documento"
- Carica un PDF → compare nella lista con nome, dimensione, data
- Clicca "Anteprima" → si apre in nuova tab
- Clicca "Scarica" → parte il download
- Clicca "Elimina" → scompare dalla lista
- Clicca ✕ su una categoria vuota → viene eliminata; su una con documenti → messaggio di errore

- [ ] **Step 3: Commit**

```bash
git add app/admin/documenti/page.tsx
git commit -m "feat(ui): pagina archivio documenti con categorie e upload"
```

---

## Task 7: Collegamento alla navigazione

**Files:**
- Modify: `components/layout/SidebarAdmin.tsx`

- [ ] **Step 1: Aggiungi la voce nella sidebar**

In [components/layout/SidebarAdmin.tsx](components/layout/SidebarAdmin.tsx), nella costante `BASE_ITEMS`, aggiungi la voce Documenti nella sezione Gestione (dopo la voce Export):

```typescript
const BASE_ITEMS = [
  { label: 'Dashboard',        href: '/admin/dashboard',                         icon: '📊' },
  { section: 'Calendario',     label: 'Per dipendente', href: '/admin/calendario',                        icon: '📅' },
  {                             label: 'Per posto',      href: '/admin/calendario-posti',                  icon: '📍' },
  { section: 'Programmazione', label: 'Per dipendente', href: '/admin/calendario-programmazione',         icon: '📝' },
  {                             label: 'Per posto',      href: '/admin/calendario-programmazione-posti',   icon: '🗂️' },
  { section: 'Gestione',       label: 'Richieste',      href: '/admin/richieste',                         icon: '📋' },
  {                             label: 'Export',         href: '/admin/export',                            icon: '📤' },
  {                             label: 'Documenti',      href: '/admin/documenti',                         icon: '🗄️' },
  {                             label: 'Impostazioni',   href: '/admin/impostazioni',                      icon: '⚙️' },
]
```

- [ ] **Step 2: Verifica in browser**

Ricarica `http://localhost:3000/admin/dashboard` → nella sidebar deve apparire la voce "Documenti" sotto Export. Cliccandola arriva alla pagina corretta.

- [ ] **Step 3: Commit finale**

```bash
git add components/layout/SidebarAdmin.tsx
git commit -m "feat(nav): aggiungi voce Documenti nella sidebar admin"
```
