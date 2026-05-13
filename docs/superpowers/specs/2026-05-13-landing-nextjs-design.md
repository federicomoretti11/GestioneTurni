# Landing Page Next.js — Design Spec

> Data: 2026-05-13 · Branch: dev · Solo sviluppo locale (NO push finché non autorizzato)

---

## Obiettivo

Convertire `Opero_Hub_Landing.html` (HTML standalone con Tailwind CDN) in una pagina Next.js pubblica su `app/page.tsx`. Il form demo invia a `POST /api/demo-request` che salva il lead su Supabase. Stile e struttura HTML invariati.

---

## Routing & Middleware

### Comportamento di `/`

| Contesto | Non autenticato | Autenticato |
|----------|----------------|-------------|
| `localhost` | mostra landing | redirect `/home` |
| `operohub.com` / `www.operohub.com` | mostra landing | redirect `/home` |
| `rossi.operohub.com` (sottodominio tenant) | redirect `/login` | redirect `/home` |

### Modifica middleware.ts

Aggiungere logica nella sezione auth: se `path === '/'`, determinare se siamo su root domain o sottodominio tenant.

```typescript
function isRootDomain(host: string): boolean {
  return (
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host === 'operohub.com' ||
    host === 'www.operohub.com'
  )
}
```

- Root domain + non autenticato + `path === '/'` → `NextResponse.next()` (mostra landing)
- Sottodominio tenant + non autenticato + `path === '/'` → redirect `/login`
- Qualsiasi + autenticato + `path === '/'` → redirect `/home` (comportamento invariato)

Il pulsante "Accedi alla piattaforma" nella landing linka a `/login`.

---

## Struttura file

```
app/
  page.tsx                        Server Component — markup statico landing
  _components/
    DemoForm.tsx                  'use client' — form con stato + fetch
  globals.css                     + classi custom CSS (serif, mono, dot-grid, ecc.)
  layout.tsx                      + next/font/google (Inter, Instrument Serif, JetBrains Mono)

api/
  demo-request/
    route.ts                      POST pubblico — inserisce su demo_requests

supabase/migrations/
  042_demo_requests.sql           nuova tabella lead marketing
```

---

## CSS & Font

### Font

Rimosso il link Google Fonts CDN dall'HTML. Caricati via `next/font/google` in `app/layout.tsx`:

```typescript
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const instrumentSerif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-serif' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
```

Variabili CSS applicate su `<html>` tramite `className`.

### Classi custom in globals.css

```css
.serif  { font-family: var(--font-serif); font-style: italic; ... }
.mono   { font-family: var(--font-mono); }
.dot-grid { background-image: radial-gradient(...); background-size: 16px 16px; }
.hairline { border-color: #e2e8f0; }
.brand-blue { color: #045dcc; }
.bg-brand-blue { background-color: #045dcc; }
.bg-brand-dark { background-color: #010b15; }
.border-brand-blue { border-color: #045dcc; }
.pricing-featured { background: #010b15; color: white; box-shadow: ...; }
.faq-item summary { list-style: none; cursor: pointer; }
.faq-item[open] .faq-icon { transform: rotate(45deg); }
.faq-icon { transition: transform 0.2s ease; }
@keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
.fade-up { animation: fadeUp 0.5s ease both; }
```

Rimosso lo `<script src="https://cdn.tailwindcss.com">` — il progetto ha già Tailwind configurato.

---

## Componente DemoForm

**File:** `app/_components/DemoForm.tsx`  
**Direttiva:** `'use client'`

### State
```typescript
nome, email, azienda, dipendenti  — valori campi
loading: boolean
error: string | null
success: boolean
```

### Logica submit
1. Validazione client: tutti i campi presenti + regex email
2. Se invalido: imposta `error` con messaggio inline (no `alert`)
3. `fetch('POST /api/demo-request', { body: JSON.stringify({ nome, email, azienda, dipendenti }) })`
4. Se `ok`: `success = true` → mostra il div success già presente nell'HTML
5. Se errore server: imposta `error` con messaggio inline

### Render
- Quando `!success`: form identico all'HTML originale + eventuale `<p class="text-red-400 text-sm">` per errori
- Quando `success`: div success identico all'HTML originale

---

## API Route POST /api/demo-request

**File:** `app/api/demo-request/route.ts`  
**Auth:** nessuna (route pubblica)  
**Client:** `createAdminClient()` (service_role, bypass RLS)

### Validazione
- `nome`, `email`, `azienda`, `dipendenti`: tutti required
- Email: validazione regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Se invalido: `400 { error: 'Campi mancanti o email non valida' }`

### Inserimento
```typescript
await adminClient.from('demo_requests').insert({ nome, email, azienda, dipendenti })
```

### Risposte
- `200 { ok: true }` — successo
- `400 { error: '...' }` — validazione fallita
- `500 { error: 'Errore interno' }` — errore Supabase

---

## Migration 042_demo_requests.sql

```sql
CREATE TABLE IF NOT EXISTS demo_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  azienda     TEXT NOT NULL,
  dipendenti  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nessuna RLS: inserimento solo via service_role dalla API route
-- Nessun tenant_id: lead marketing pre-onboarding
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
```

Nessuna policy pubblica — la tabella è accessibile solo via `service_role`.

---

## Note implementative

- `app/page.tsx` è un Server Component: nessuna direttiva `'use client'`, nessuno stato. Importa `DemoForm` e lo monta nella sezione `#demo`.
- Il Tailwind CDN script (`<script src="https://cdn.tailwindcss.com">`) viene rimosso.
- Il tag `<html lang="it">` e `<meta>` del file HTML originale non vanno in `page.tsx` ma nel `layout.tsx` esistente (o in un layout dedicato alla landing se necessario).
- Le sezioni FAQ con `<details>/<summary>` funzionano nativamente in JSX senza JS aggiuntivo.
- Il body `data-screen-label="Landing"` dell'HTML originale viene omesso (non serve).
