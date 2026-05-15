# Chat Assistenza Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare una chat live di assistenza che permette a qualsiasi utente di ogni tenant di scrivere al super-admin, con pannello slide laterale lato utente e inbox messaggistica lato super-admin.

**Architecture:** Supabase Realtime su tabella `chat_messaggi`; messaggi persistiti nel DB con archiviazione; notifiche super-admin via badge + suono + email Resend; pannello slide per utenti in tutti i layout autenticati.

**Tech Stack:** Next.js 14 App Router, Supabase Realtime (`postgres_changes`), Resend, TypeScript

---

## File Map

| File | Azione |
|---|---|
| `supabase/migrations/031_chat.sql` | Crea — tabelle + RLS + trigger + realtime |
| `app/api/chat/conversazione/route.ts` | Crea — GET + POST |
| `app/api/chat/messaggi/route.ts` | Crea — GET + POST (con email notifica) |
| `app/api/chat/conversazione/[id]/route.ts` | Crea — PATCH archivia |
| `app/api/super-admin/chat/conversazioni/route.ts` | Crea — GET lista tutte |
| `app/api/super-admin/chat/messaggi/letti/route.ts` | Crea — PATCH segna letti |
| `components/chat/ChatMessage.tsx` | Crea — bolla singolo messaggio |
| `components/chat/ChatPanelSlide.tsx` | Crea — pannello slide con realtime |
| `app/super-admin/chat/page.tsx` | Crea — inbox super-admin |
| `app/admin/layout.tsx` | Modifica — aggiunge `<ChatPanelSlide />` |
| `app/manager/layout.tsx` | Modifica — aggiunge `<ChatPanelSlide />` |
| `app/dipendente/layout.tsx` | Modifica — aggiunge `<ChatPanelSlide />` |
| `app/super-admin/layout.tsx` | Modifica — aggiunge link Chat con badge |
| `public/sounds/chat-notification.mp3` | Aggiunge — file audio notifica |
| `lib/email.ts` | Modifica — aggiunge `sendEmailChatMessaggio` |

---

## Task 1: Migration 031_chat.sql

**Files:**
- Create: `supabase/migrations/031_chat.sql`

- [ ] **Step 1: Crea il file di migrazione**

```sql
-- supabase/migrations/031_chat.sql

CREATE TABLE chat_conversazioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  utente_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stato       TEXT NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'archiviata')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX chat_conv_utente_aperta ON chat_conversazioni(utente_id) WHERE stato = 'aperta';

CREATE TABLE chat_messaggi (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversazione_id UUID NOT NULL REFERENCES chat_conversazioni(id) ON DELETE CASCADE,
  mittente_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  testo            TEXT NOT NULL,
  letto_superadmin BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chat_msg_conv ON chat_messaggi(conversazione_id, created_at);

-- RLS
ALTER TABLE chat_conversazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messaggi      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utente_chat_conv" ON chat_conversazioni
  FOR ALL USING (utente_id = auth.uid());

CREATE POLICY "superadmin_chat_conv" ON chat_conversazioni
  FOR ALL USING (get_is_super_admin());

CREATE POLICY "utente_chat_msg" ON chat_messaggi
  FOR ALL USING (
    conversazione_id IN (
      SELECT id FROM chat_conversazioni WHERE utente_id = auth.uid()
    )
  );

CREATE POLICY "superadmin_chat_msg" ON chat_messaggi
  FOR ALL USING (get_is_super_admin());

-- Trigger: aggiorna updated_at su chat_conversazioni ad ogni nuovo messaggio
CREATE OR REPLACE FUNCTION chat_aggiorna_conv_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chat_conversazioni SET updated_at = now() WHERE id = NEW.conversazione_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_msg_aggiorna_conv
  AFTER INSERT ON chat_messaggi
  FOR EACH ROW EXECUTE FUNCTION chat_aggiorna_conv_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messaggi;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversazioni;
```

- [ ] **Step 2: Applica la migrazione al DB di dev**

```bash
npx supabase db push
```

Output atteso: `Applying migration 031_chat.sql... done`

- [ ] **Step 3: Verifica le tabelle nel dashboard Supabase**

Aprire Table Editor e verificare che `chat_conversazioni` e `chat_messaggi` esistano con tutte le colonne.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/031_chat.sql
git commit -m "feat(chat): migration 031 — chat_conversazioni e chat_messaggi"
```

---

## Task 2: API GET/POST /api/chat/conversazione

**Files:**
- Create: `app/api/chat/conversazione/route.ts`

- [ ] **Step 1: Crea la route**

```typescript
// app/api/chat/conversazione/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data, error } = await supabase
    .from('chat_conversazioni')
    .select('*')
    .eq('utente_id', user.id)
    .eq('stato', 'aperta')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('chat_conversazioni')
    .insert({ tenant_id: profile.tenant_id, utente_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Test manuale**

```bash
# GET — nessuna conversazione aperta, deve restituire null
curl http://localhost:3000/api/chat/conversazione \
  -H "Cookie: <session-cookie>"
# Risposta attesa: null

# POST — crea conversazione
curl -X POST http://localhost:3000/api/chat/conversazione \
  -H "Cookie: <session-cookie>"
# Risposta attesa: { id, tenant_id, utente_id, stato: "aperta", ... }

# GET — ora restituisce la conversazione appena creata
curl http://localhost:3000/api/chat/conversazione \
  -H "Cookie: <session-cookie>"
# Risposta attesa: { id, stato: "aperta", ... }
```

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/conversazione/route.ts
git commit -m "feat(chat): API GET/POST /api/chat/conversazione"
```

---

## Task 3: API GET/POST /api/chat/messaggi

**Files:**
- Create: `app/api/chat/messaggi/route.ts`
- Modify: `lib/email.ts`

- [ ] **Step 1: Aggiungi `sendEmailChatMessaggio` in `lib/email.ts`**

Aggiungere alla fine del file:

```typescript
export async function sendEmailChatMessaggio(params: {
  nomeUtente: string
  nomeAzienda: string
  testo: string
}) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  if (!superAdminEmail) return
  try {
    await getResend().emails.send({
      from: FROM,
      to: superAdminEmail,
      subject: `Nuovo messaggio da ${params.nomeUtente} - ${params.nomeAzienda}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1e40af">Nuovo messaggio chat 💬</h2>
          <p><strong>${params.nomeUtente}</strong> (${params.nomeAzienda}) ha scritto:</p>
          <div style="background:#f1f5f9;border-left:4px solid #3b82f6;padding:12px;margin-top:12px;border-radius:4px">
            ${params.testo}
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://operohub.com'}/super-admin/chat"
             style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Rispondi nella chat
          </a>
        </div>`,
    })
  } catch (e) {
    console.error('[email] sendEmailChatMessaggio fallita', e)
  }
}
```

- [ ] **Step 2: Aggiungi `SUPER_ADMIN_EMAIL` a `.env.local`**

Aprire `.env.local` e aggiungere:

```
SUPER_ADMIN_EMAIL=federicomoretti.jw@gmail.com
```

- [ ] **Step 3: Crea la route messaggi**

```typescript
// app/api/chat/messaggi/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendEmailChatMessaggio } from '@/lib/email'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const conversazione_id = searchParams.get('conversazione_id')
  if (!conversazione_id) return NextResponse.json({ error: 'conversazione_id obbligatorio' }, { status: 400 })

  // Verifica appartenenza
  const { data: conv } = await supabase
    .from('chat_conversazioni')
    .select('id')
    .eq('id', conversazione_id)
    .eq('utente_id', user.id)
    .maybeSingle()
  if (!conv) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data, error } = await supabase
    .from('chat_messaggi')
    .select('*')
    .eq('conversazione_id', conversazione_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const { conversazione_id, testo } = body
  if (!conversazione_id || !testo?.trim()) {
    return NextResponse.json({ error: 'conversazione_id e testo obbligatori' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cognome, is_super_admin, tenants(nome)')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('chat_messaggi')
    .insert({ conversazione_id, mittente_id: user.id, testo: testo.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica email al super-admin solo se il mittente NON è super-admin
  if (!profile?.is_super_admin) {
    const nomeAzienda = (profile?.tenants as { nome?: string } | null)?.nome ?? ''
    await sendEmailChatMessaggio({
      nomeUtente: `${profile?.nome ?? ''} ${profile?.cognome ?? ''}`.trim(),
      nomeAzienda,
      testo: testo.trim(),
    })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 4: Test manuale**

```bash
# POST messaggio
curl -X POST http://localhost:3000/api/chat/messaggi \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"conversazione_id": "<id>", "testo": "Ciao, ho bisogno di aiuto"}'
# Risposta attesa: { id, conversazione_id, mittente_id, testo, letto_superadmin: false, ... }

# GET messaggi
curl "http://localhost:3000/api/chat/messaggi?conversazione_id=<id>" \
  -H "Cookie: <session-cookie>"
# Risposta attesa: array con il messaggio appena inserito
```

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/messaggi/route.ts lib/email.ts
git commit -m "feat(chat): API GET/POST messaggi + email notifica super-admin"
```

---

## Task 4: API PATCH /api/chat/conversazione/[id]

**Files:**
- Create: `app/api/chat/conversazione/[id]/route.ts`

- [ ] **Step 1: Crea la route**

```typescript
// app/api/chat/conversazione/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  if (body.stato !== 'archiviata') {
    return NextResponse.json({ error: 'Solo archiviata è un valore valido' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()

  // Se super-admin bypassa; altrimenti verifica proprietà
  if (!profile?.is_super_admin) {
    const { data: conv } = await supabase
      .from('chat_conversazioni')
      .select('id')
      .eq('id', params.id)
      .eq('utente_id', user.id)
      .maybeSingle()
    if (!conv) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('chat_conversazioni')
    .update({ stato: 'archiviata' })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Test manuale**

```bash
curl -X PATCH http://localhost:3000/api/chat/conversazione/<id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"stato": "archiviata"}'
# Risposta attesa: { id, stato: "archiviata", ... }
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/chat/conversazione/[id]/route.ts"
git commit -m "feat(chat): API PATCH archivia conversazione"
```

---

## Task 5: API Super-admin — lista conversazioni + segna letti

**Files:**
- Create: `app/api/super-admin/chat/conversazioni/route.ts`
- Create: `app/api/super-admin/chat/messaggi/letti/route.ts`

- [ ] **Step 1: Crea `conversazioni/route.ts`**

```typescript
// app/api/super-admin/chat/conversazioni/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) return null
  return user
}

export async function GET() {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('chat_conversazioni')
    .select(`
      id,
      stato,
      created_at,
      updated_at,
      utente:profiles!chat_conversazioni_utente_id_fkey(
        id, nome, cognome, ruolo,
        tenant:tenants!profiles_tenant_id_fkey(nome)
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggiungi count messaggi non letti per ogni conversazione
  const { data: nonLetti } = await admin
    .from('chat_messaggi')
    .select('conversazione_id')
    .eq('letto_superadmin', false)

  const countPerConv: Record<string, number> = {}
  for (const m of nonLetti ?? []) {
    countPerConv[m.conversazione_id] = (countPerConv[m.conversazione_id] ?? 0) + 1
  }

  const result = (data ?? []).map(conv => ({
    ...conv,
    messaggi_non_letti: countPerConv[conv.id] ?? 0,
  }))

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Crea `messaggi/letti/route.ts`**

```typescript
// app/api/super-admin/chat/messaggi/letti/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function checkSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!data?.is_super_admin) return null
  return user
}

export async function PATCH(request: Request) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await request.json()
  const { conversazione_id } = body
  if (!conversazione_id) return NextResponse.json({ error: 'conversazione_id obbligatorio' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('chat_messaggi')
    .update({ letto_superadmin: true })
    .eq('conversazione_id', conversazione_id)
    .eq('letto_superadmin', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Test manuale**

```bash
# GET lista conversazioni (da account super-admin)
curl http://localhost:3000/api/super-admin/chat/conversazioni \
  -H "Cookie: <super-admin-session>"
# Risposta attesa: array di conversazioni con messaggi_non_letti

# PATCH segna letti
curl -X PATCH http://localhost:3000/api/super-admin/chat/messaggi/letti \
  -H "Content-Type: application/json" \
  -H "Cookie: <super-admin-session>" \
  -d '{"conversazione_id": "<id>"}'
# Risposta attesa: 204 No Content
```

- [ ] **Step 4: Commit**

```bash
git add app/api/super-admin/chat/
git commit -m "feat(chat): API super-admin — lista conversazioni + segna letti"
```

---

## Task 6: Componente ChatMessage

**Files:**
- Create: `components/chat/ChatMessage.tsx`

- [ ] **Step 1: Crea la directory e il componente**

```typescript
// components/chat/ChatMessage.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/ChatMessage.tsx
git commit -m "feat(chat): componente ChatMessage"
```

---

## Task 7: ChatPanelSlide (lato utente)

**Files:**
- Create: `components/chat/ChatPanelSlide.tsx`

- [ ] **Step 1: Crea il componente**

```typescript
// components/chat/ChatPanelSlide.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from './ChatMessage'

interface Messaggio {
  id: string
  conversazione_id: string
  mittente_id: string
  testo: string
  letto_superadmin: boolean
  created_at: string
}

interface Conversazione {
  id: string
  stato: string
}

export function ChatPanelSlide({ userId }: { userId: string }) {
  const [aperto, setAperto] = useState(false)
  const [conv, setConv] = useState<Conversazione | null>(null)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [caricamento, setCaricamento] = useState(true)
  const [invio, setInvio] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Carica conversazione al mount
  useEffect(() => {
    fetch('/api/chat/conversazione')
      .then(r => r.json())
      .then(data => {
        setConv(data)
        setCaricamento(false)
        if (data?.id) caricaMessaggi(data.id)
      })
      .catch(() => setCaricamento(false))
  }, [])

  // Scroll to bottom quando arrivano messaggi
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!conv?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-conv-${conv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi', filter: `conversazione_id=eq.${conv.id}` },
        payload => {
          setMessaggi(prev => [...prev, payload.new as Messaggio])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conv?.id])

  async function caricaMessaggi(convId: string) {
    const r = await fetch(`/api/chat/messaggi?conversazione_id=${convId}`)
    if (r.ok) setMessaggi(await r.json())
  }

  async function handleInvia() {
    if (!testo.trim() || invio) return
    setInvio(true)

    let convId = conv?.id
    if (!convId) {
      // Prima volta: crea la conversazione
      const r = await fetch('/api/chat/conversazione', { method: 'POST' })
      if (!r.ok) { setInvio(false); return }
      const nuovaConv = await r.json()
      setConv(nuovaConv)
      convId = nuovaConv.id
      caricaMessaggi(convId)
    }

    const r = await fetch('/api/chat/messaggi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversazione_id: convId, testo: testo.trim() }),
    })
    if (r.ok) setTesto('')
    setInvio(false)
  }

  async function handleArchivia() {
    if (!conv?.id) return
    const r = await fetch(`/api/chat/conversazione/${conv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'archiviata' }),
    })
    if (r.ok) setConv(prev => prev ? { ...prev, stato: 'archiviata' } : null)
  }

  return (
    <>
      {/* Tab laterale fisso */}
      <button
        onClick={() => setAperto(v => !v)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-blue-500 text-white text-xs px-1.5 py-3 rounded-l-lg shadow-lg"
        style={{ writingMode: 'vertical-rl' }}
        aria-label="Apri chat di supporto"
      >
        💬 Aiuto
      </button>

      {/* Pannello slide */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ${aperto ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold">💬 Supporto OperoHub</span>
          <button onClick={() => setAperto(false)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Messaggi */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {caricamento && (
            <p className="text-xs text-slate-400 text-center mt-4">Caricamento…</p>
          )}
          {!caricamento && messaggi.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-4">
              Scrivi per iniziare la conversazione con il supporto.
            </p>
          )}
          {messaggi.map(m => (
            <ChatMessage
              key={m.id}
              testo={m.testo}
              mittente={m.mittente_id === userId ? 'io' : 'altro'}
              timestamp={m.created_at}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-2 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleInvia()}
            placeholder="Scrivi un messaggio…"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
            disabled={conv?.stato === 'archiviata'}
          />
          <button
            onClick={handleInvia}
            disabled={invio || !testo.trim() || conv?.stato === 'archiviata'}
            className="w-9 h-9 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg flex items-center justify-center flex-shrink-0"
            aria-label="Invia"
          >
            →
          </button>
        </div>

        {/* Archivia */}
        {conv?.stato === 'aperta' && (
          <div className="px-3 pb-2 flex-shrink-0">
            <button
              onClick={handleArchivia}
              className="text-xs text-slate-400 hover:text-slate-600 underline w-full text-right"
            >
              🗄 Archivia conversazione
            </button>
          </div>
        )}
        {conv?.stato === 'archiviata' && (
          <p className="text-xs text-slate-400 text-center pb-2">Conversazione archiviata</p>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/ChatPanelSlide.tsx
git commit -m "feat(chat): componente ChatPanelSlide con realtime"
```

---

## Task 8: Pagina inbox super-admin

**Files:**
- Create: `app/super-admin/chat/page.tsx`

- [ ] **Step 1: Crea la directory e la pagina**

```typescript
// app/super-admin/chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from '@/components/chat/ChatMessage'

interface Utente {
  id: string
  nome: string
  cognome: string
  ruolo: string
  tenant: { nome: string } | null
}

interface ConvListItem {
  id: string
  stato: string
  updated_at: string
  messaggi_non_letti: number
  utente: Utente
}

interface Messaggio {
  id: string
  conversazione_id: string
  mittente_id: string
  testo: string
  letto_superadmin: boolean
  created_at: string
}

// Supabase user id del super-admin (risolto a runtime)
let _mioId: string | null = null
async function getMioId(): Promise<string | null> {
  if (_mioId) return _mioId
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  _mioId = user?.id ?? null
  return _mioId
}

export default function SuperAdminChatPage() {
  const [conversazioni, setConversazioni] = useState<ConvListItem[]>([])
  const [selezionata, setSelezionata] = useState<ConvListItem | null>(null)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [invio, setInvio] = useState(false)
  const [mioId, setMioId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    getMioId().then(setMioId)
    caricaConversazioni()
    audioRef.current = new Audio('/sounds/chat-notification.mp3')
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  // Realtime: canale globale super-admin
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('chat-superadmin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        payload => {
          const msg = payload.new as Messaggio
          // Se la conversazione è quella selezionata, aggiungi il messaggio
          if (selezionata && msg.conversazione_id === selezionata.id) {
            setMessaggi(prev => [...prev, msg])
          }
          // Suono + aggiorna lista se il messaggio non è del super-admin
          if (!msg.letto_superadmin) {
            audioRef.current?.play().catch(() => {})
            caricaConversazioni()
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selezionata?.id])

  async function caricaConversazioni() {
    const r = await fetch('/api/super-admin/chat/conversazioni')
    if (r.ok) setConversazioni(await r.json())
  }

  async function selezionaConversazione(conv: ConvListItem) {
    setSelezionata(conv)
    setMessaggi([])
    // Carica messaggi
    const r = await fetch(`/api/chat/messaggi?conversazione_id=${conv.id}`)
    if (r.ok) setMessaggi(await r.json())
    // Segna letti
    if (conv.messaggi_non_letti > 0) {
      await fetch('/api/super-admin/chat/messaggi/letti', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversazione_id: conv.id }),
      })
      setConversazioni(prev => prev.map(c =>
        c.id === conv.id ? { ...c, messaggi_non_letti: 0 } : c
      ))
    }
  }

  async function handleInvia() {
    if (!selezionata || !testo.trim() || invio) return
    setInvio(true)
    const r = await fetch('/api/chat/messaggi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversazione_id: selezionata.id, testo: testo.trim() }),
    })
    if (r.ok) setTesto('')
    setInvio(false)
  }

  async function handleArchivia() {
    if (!selezionata) return
    const r = await fetch(`/api/chat/conversazione/${selezionata.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'archiviata' }),
    })
    if (r.ok) {
      setSelezionata(prev => prev ? { ...prev, stato: 'archiviata' } : null)
      caricaConversazioni()
    }
  }

  const aperte = conversazioni.filter(c => c.stato === 'aperta')
  const archiviate = conversazioni.filter(c => c.stato === 'archiviata')
  const totaleNonLetti = conversazioni.reduce((s, c) => s + c.messaggi_non_letti, 0)

  function nomeConv(c: ConvListItem) {
    return `${c.utente.nome} ${c.utente.cognome}`
  }
  function aziendaConv(c: ConvListItem) {
    return c.utente.tenant?.nome ?? ''
  }

  return (
    <div className="flex h-[calc(100vh-120px)] border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Lista conversazioni */}
      <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="bg-slate-900 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Chat Supporto</h2>
          {totaleNonLetti > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{totaleNonLetti} non {totaleNonLetti === 1 ? 'letto' : 'letti'}</p>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {aperte.map(conv => (
            <button
              key={conv.id}
              onClick={() => selezionaConversazione(conv)}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors ${selezionata?.id === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm font-semibold text-slate-800 ${conv.messaggi_non_letti > 0 ? 'font-bold' : ''}`}>
                  {nomeConv(conv)}
                </span>
                {conv.messaggi_non_letti > 0 && (
                  <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 ml-1 flex-shrink-0">
                    {conv.messaggi_non_letti}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-600 font-medium">{aziendaConv(conv)} · {conv.utente.ruolo}</p>
            </button>
          ))}

          {archiviate.length > 0 && (
            <>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Archiviate</span>
              </div>
              {archiviate.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selezionaConversazione(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 opacity-60 hover:opacity-80 transition-opacity ${selezionata?.id === conv.id ? 'bg-blue-50' : ''}`}
                >
                  <span className="text-sm text-slate-600">{nomeConv(conv)}</span>
                  <p className="text-xs text-slate-400">{aziendaConv(conv)}</p>
                </button>
              ))}
            </>
          )}

          {conversazioni.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-8 px-4">Nessuna conversazione ancora.</p>
          )}
        </div>
      </div>

      {/* Area chat */}
      {selezionata ? (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{nomeConv(selezionata)}</h3>
              <p className="text-xs text-blue-600">{aziendaConv(selezionata)} · {selezionata.utente.ruolo}</p>
            </div>
            {selezionata.stato === 'aperta' && (
              <button onClick={handleArchivia} className="text-slate-400 hover:text-slate-600 text-sm" title="Archivia">
                🗄
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messaggi.map(m => (
              <ChatMessage
                key={m.id}
                testo={m.testo}
                mittente={m.mittente_id === mioId ? 'io' : 'altro'}
                timestamp={m.created_at}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {selezionata.stato === 'aperta' && (
            <div className="border-t border-slate-100 p-3 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={testo}
                onChange={e => setTesto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleInvia()}
                placeholder="Rispondi…"
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={handleInvia}
                disabled={invio || !testo.trim()}
                className="w-9 h-9 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg flex items-center justify-center flex-shrink-0"
              >
                →
              </button>
            </div>
          )}
          {selezionata.stato === 'archiviata' && (
            <p className="text-xs text-slate-400 text-center py-3 border-t border-slate-100">Conversazione archiviata</p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-400">Seleziona una conversazione</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/super-admin/chat/page.tsx
git commit -m "feat(chat): pagina inbox super-admin"
```

---

## Task 9: Integrazione layout + audio + super-admin header

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `app/manager/layout.tsx`
- Modify: `app/dipendente/layout.tsx`
- Modify: `app/super-admin/layout.tsx`
- Add: `public/sounds/chat-notification.mp3`

- [ ] **Step 1: Scarica un file audio mp3 per le notifiche**

Scaricare un suono di notifica (breve, ~1 secondo) in formato mp3 da una fonte libera (es. Mixkit, Freesound) oppure generarne uno con un tool online. Salvarlo come `public/sounds/chat-notification.mp3`.

In alternativa, creare un file mp3 silenzioso come placeholder:

```bash
# Se ffmpeg è disponibile, genera un beep di 0.3 secondi a 880Hz
ffmpeg -f lavfi -i "sine=frequency=880:duration=0.3" public/sounds/chat-notification.mp3
```

- [ ] **Step 2: Modifica `app/admin/layout.tsx`**

Il layout è un Server Component. `ChatPanelSlide` richiede `userId` che viene letto dal profilo già presente.

Aggiungere import e `<ChatPanelSlide />` dentro `<main>`:

```typescript
// Aggiungere import
import { ChatPanelSlide } from '@/components/chat/ChatPanelSlide'
```

Sostituire il blocco `<main>` esistente:

```tsx
<main className="flex-1 overflow-auto flex flex-col" style={{ backgroundImage: 'url(/circuit-pattern.svg)', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
  <div className="flex-1 flex flex-col px-4 sm:px-6 pt-6 pb-8">
    <div className="flex-1">{children}</div>
    <Footer />
  </div>
  <ChatPanelSlide userId={user!.id} />
</main>
```

- [ ] **Step 3: Leggi e modifica `app/manager/layout.tsx`**

Aprire il file, aggiungere il medesimo import, e inserire `<ChatPanelSlide userId={user!.id} />` come ultimo elemento dentro `<main>`, prima del tag di chiusura.

- [ ] **Step 4: Leggi e modifica `app/dipendente/layout.tsx`**

Aprire il file, aggiungere il medesimo import, e inserire `<ChatPanelSlide userId={user!.id} />` come ultimo elemento dentro `<main>`, prima del tag di chiusura.

- [ ] **Step 5: Modifica `app/super-admin/layout.tsx` — aggiunge link Chat con badge**

Il badge richiede dati realtime (count messaggi non letti), quindi va gestito come Client Component separato. Creare prima il badge component:

```typescript
// components/chat/SuperAdminChatBadge.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SuperAdminChatBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function carica() {
      const r = await fetch('/api/super-admin/chat/conversazioni')
      if (!r.ok) return
      const data = await r.json()
      const tot = data.reduce((s: number, c: { messaggi_non_letti: number }) => s + c.messaggi_non_letti, 0)
      setCount(tot)
    }
    carica()

    const supabase = createClient()
    const channel = supabase
      .channel('chat-badge-superadmin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        () => carica()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <a href="/super-admin/chat" className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors">
      💬 Chat
      {count > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
          {count}
        </span>
      )}
    </a>
  )
}
```

Modificare `app/super-admin/layout.tsx` per aggiungere il badge nell'header, dopo il link "← Home":

```typescript
// Aggiungere import
import { SuperAdminChatBadge } from '@/components/chat/SuperAdminChatBadge'
```

Sostituire il blocco `<header>`:

```tsx
<header className="bg-slate-900 text-white px-6 py-3 flex items-center gap-4">
  <Logo size={28} variant="white" />
  <span className="font-bold text-sm tracking-tight">Opero Hub</span>
  <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">Super Admin</span>
  <div className="ml-auto flex items-center gap-4">
    <SuperAdminChatBadge />
    <a href="/home" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
      ← Home
    </a>
  </div>
  <span className="text-xs text-slate-400">{profile.nome} {profile.cognome}</span>
</header>
```

- [ ] **Step 6: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Output atteso: nessun errore. Correggere eventuali type error (tipicamente i join Supabase richiedono cast espliciti).

- [ ] **Step 7: Commit finale**

```bash
git add app/admin/layout.tsx app/manager/layout.tsx app/dipendente/layout.tsx
git add app/super-admin/layout.tsx
git add components/chat/SuperAdminChatBadge.tsx
git add public/sounds/chat-notification.mp3
git commit -m "feat(chat): integrazione layout utenti + badge super-admin + audio"
```

---

## Verifica end-to-end

- [ ] Avviare il dev server: `npm run dev`
- [ ] Login come utente normale (dipendente/manager/admin) → verificare tab "💬 Aiuto" sul bordo destro della pagina
- [ ] Aprire il pannello → scrivere un messaggio → verificare comparsa della bolla
- [ ] Login come super-admin in un secondo browser → aprire `/super-admin/chat` → verificare comparsa della conversazione con badge non letti
- [ ] Rispondere dal super-admin → verificare ricezione realtime nel pannello utente
- [ ] Super-admin archivia conversazione → verificare spostamento in sezione "Archiviate"
- [ ] Verificare che il badge nell'header super-admin si aggiorni in tempo reale
