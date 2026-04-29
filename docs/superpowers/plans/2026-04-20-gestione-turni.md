# Gestione Turni — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire un'applicazione web Next.js 14 + Supabase per la gestione turni dipendenti con ruoli Admin, Manager e Dipendente.

**Architecture:** Next.js 14 App Router con API Routes per il backend, Supabase per database PostgreSQL e autenticazione, middleware Next.js per la protezione delle route per ruolo. Export PDF/Excel generato lato client senza logica server.

**Tech Stack:** Next.js 14, React, Tailwind CSS, Supabase (@supabase/ssr), TypeScript, jsPDF, xlsx, Vitest, Playwright

---

## File Structure

```
/app
  layout.tsx
  page.tsx                              → redirect a /login
  /(auth)/login/page.tsx
  /(admin)/layout.tsx
  /(admin)/dashboard/page.tsx
  /(admin)/utenti/page.tsx
  /(admin)/utenti/nuovo/page.tsx
  /(admin)/utenti/[id]/page.tsx
  /(admin)/reparti/page.tsx
  /(admin)/reparti/nuovo/page.tsx
  /(admin)/reparti/[id]/page.tsx
  /(manager)/layout.tsx
  /(manager)/calendario/page.tsx
  /(manager)/template/page.tsx
  /(manager)/export/page.tsx
  /(dipendente)/layout.tsx
  /(dipendente)/turni/page.tsx
  /(dipendente)/profilo/page.tsx
  /api/reparti/route.ts
  /api/reparti/[id]/route.ts
  /api/template/route.ts
  /api/template/[id]/route.ts
  /api/turni/route.ts
  /api/turni/[id]/route.ts
  /api/utenti/route.ts
  /api/utenti/[id]/route.ts

/components
  /calendario
    GrigliaCalendario.tsx
    CellaCalendario.tsx
    BadgeTurno.tsx
    ModaleTurno.tsx
    SwitcherVista.tsx
  /layout
    Sidebar.tsx
    BottomNav.tsx
    Header.tsx
  /ui
    Button.tsx
    Input.tsx
    Modal.tsx
    Badge.tsx

/lib
  supabase/client.ts
  supabase/server.ts
  utils/date.ts
  utils/turni.ts
  utils/export.ts
  types.ts

/middleware.ts
/supabase/migrations/001_init.sql
/supabase/migrations/002_rls.sql

/tests
  unit/date.test.ts
  unit/turni.test.ts
  unit/export.test.ts
  e2e/login.spec.ts
  e2e/calendario.spec.ts
  e2e/export.spec.ts
```

---

## Task 1: Inizializzazione progetto

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `.env.local.example`

- [ ] **Step 1: Crea il progetto Next.js**

```bash
cd C:/Progetti/GestioneTurni
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*"
```

- [ ] **Step 2: Installa dipendenze**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install jspdf jspdf-autotable xlsx
npm install -D vitest @vitejs/plugin-react jsdom @vitest/coverage-v8
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 3: Crea `.env.local.example`**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Copia in `.env.local` e compila con le credenziali del tuo progetto Supabase.

- [ ] **Step 4: Configura Vitest — crea `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 5: Aggiungi script a `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 6: Inizializza git e primo commit**

```bash
git init
echo ".env.local\n.next\nnode_modules" >> .gitignore
git add .
git commit -m "chore: setup Next.js 14 + Supabase + Vitest + Playwright"
```

---

## Task 2: Schema database Supabase

**Files:**
- Create: `supabase/migrations/001_init.sql`

> **Prerequisito:** Crea un progetto su https://supabase.com e copia le credenziali in `.env.local`.

- [ ] **Step 1: Crea il file di migrazione**

```sql
-- supabase/migrations/001_init.sql

-- Enum per i ruoli
create type ruolo_utente as enum ('admin', 'manager', 'dipendente');

-- Tabella reparti (prima di profiles perché profiles la referenzia)
create table reparti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  manager_id uuid,
  created_at timestamptz not null default now()
);

-- Tabella profiles (estende auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cognome text not null,
  ruolo ruolo_utente not null default 'dipendente',
  reparto_id uuid references reparti(id) on delete set null,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

-- FK da reparti a profiles (aggiunta dopo perché profiles era da creare prima)
alter table reparti
  add constraint fk_reparti_manager
  foreign key (manager_id) references profiles(id) on delete set null;

-- Tabella turni_template
create table turni_template (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ora_inizio time not null,
  ora_fine time not null,
  colore text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

-- Tabella turni
create table turni (
  id uuid primary key default gen_random_uuid(),
  dipendente_id uuid not null references profiles(id) on delete cascade,
  template_id uuid references turni_template(id) on delete set null,
  data date not null,
  ora_inizio time not null,
  ora_fine time not null,
  note text,
  creato_da uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger per aggiornare updated_at automaticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger turni_updated_at
  before update on turni
  for each row execute function update_updated_at();

-- Trigger per creare il profilo automaticamente dopo la registrazione
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nome, cognome, ruolo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'cognome', ''),
    coalesce((new.raw_user_meta_data->>'ruolo')::ruolo_utente, 'dipendente')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 2: Esegui la migrazione su Supabase**

Vai su Supabase Dashboard → SQL Editor, incolla il contenuto del file ed esegui.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: schema database iniziale"
```

---

## Task 3: RLS Policies

**Files:**
- Create: `supabase/migrations/002_rls.sql`

- [ ] **Step 1: Crea il file RLS**

```sql
-- supabase/migrations/002_rls.sql

-- Abilita RLS su tutte le tabelle
alter table profiles enable row level security;
alter table reparti enable row level security;
alter table turni_template enable row level security;
alter table turni enable row level security;

-- Helper function per ottenere il ruolo dell'utente corrente
create or replace function get_my_role()
returns ruolo_utente as $$
  select ruolo from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper function per ottenere il reparto_id dell'utente corrente
create or replace function get_my_reparto()
returns uuid as $$
  select reparto_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- === PROFILES ===
-- Admin: vede tutto
create policy "admin_profiles_all" on profiles
  for all using (get_my_role() = 'admin');

-- Manager: vede i profili del proprio reparto
create policy "manager_profiles_select" on profiles
  for select using (
    get_my_role() = 'manager' and
    (reparto_id = get_my_reparto() or id = auth.uid())
  );

-- Dipendente: vede solo se stesso
create policy "dipendente_profiles_select" on profiles
  for select using (id = auth.uid());

-- === REPARTI ===
create policy "admin_reparti_all" on reparti
  for all using (get_my_role() = 'admin');

create policy "manager_reparti_select" on reparti
  for select using (
    get_my_role() = 'manager' and id = get_my_reparto()
  );

create policy "dipendente_reparti_select" on reparti
  for select using (
    get_my_role() = 'dipendente' and id = get_my_reparto()
  );

-- === TURNI_TEMPLATE ===
-- Tutti i ruoli autenticati possono leggere i template
create policy "authenticated_template_select" on turni_template
  for select using (auth.uid() is not null);

-- Solo admin e manager possono modificare
create policy "admin_manager_template_all" on turni_template
  for all using (get_my_role() in ('admin', 'manager'));

-- === TURNI ===
create policy "admin_turni_all" on turni
  for all using (get_my_role() = 'admin');

-- Manager: gestisce i turni del proprio reparto
create policy "manager_turni_all" on turni
  for all using (
    get_my_role() = 'manager' and
    dipendente_id in (
      select id from profiles where reparto_id = get_my_reparto()
    )
  );

-- Dipendente: vede solo i propri turni
create policy "dipendente_turni_select" on turni
  for select using (
    get_my_role() = 'dipendente' and dipendente_id = auth.uid()
  );
```

- [ ] **Step 2: Esegui su Supabase SQL Editor**

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: RLS policies per tutti i ruoli"
```

---

## Task 4: TypeScript Types e Supabase Clients

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Crea `lib/types.ts`**

```typescript
export type RuoloUtente = 'admin' | 'manager' | 'dipendente'

export interface Profile {
  id: string
  nome: string
  cognome: string
  ruolo: RuoloUtente
  reparto_id: string | null
  attivo: boolean
  created_at: string
}

export interface Reparto {
  id: string
  nome: string
  manager_id: string | null
  created_at: string
}

export interface TurnoTemplate {
  id: string
  nome: string
  ora_inizio: string  // "HH:MM:SS"
  ora_fine: string    // "HH:MM:SS"
  colore: string      // hex
  created_at: string
}

export interface Turno {
  id: string
  dipendente_id: string
  template_id: string | null
  data: string        // "YYYY-MM-DD"
  ora_inizio: string  // "HH:MM:SS"
  ora_fine: string    // "HH:MM:SS"
  note: string | null
  creato_da: string
  created_at: string
  updated_at: string
  // join opzionali
  profile?: Profile
  template?: TurnoTemplate
}

export interface TurnoConDettagli extends Turno {
  profile: Profile
  template: TurnoTemplate | null
}
```

- [ ] **Step 2: Crea `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Crea `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: types TypeScript e client Supabase"
```

---

## Task 5: Utility functions con unit test

**Files:**
- Create: `lib/utils/date.ts`
- Create: `lib/utils/turni.ts`
- Create: `tests/unit/date.test.ts`
- Create: `tests/unit/turni.test.ts`

- [ ] **Step 1: Scrivi i test per `date.ts`**

```typescript
// tests/unit/date.test.ts
import { describe, it, expect } from 'vitest'
import {
  getWeekDays,
  getMonthDays,
  formatDateIT,
  formatTimeShort,
} from '@/lib/utils/date'

describe('getWeekDays', () => {
  it('restituisce 7 giorni a partire dal lunedì della settimana data', () => {
    const days = getWeekDays(new Date('2026-04-20'))
    expect(days).toHaveLength(7)
    expect(days[0].toISOString().slice(0, 10)).toBe('2026-04-20')
    expect(days[6].toISOString().slice(0, 10)).toBe('2026-04-26')
  })
})

describe('getMonthDays', () => {
  it('restituisce tutti i giorni del mese specificato', () => {
    const days = getMonthDays(2026, 3) // aprile (0-indexed)
    expect(days).toHaveLength(30)
    expect(days[0].toISOString().slice(0, 10)).toBe('2026-04-01')
    expect(days[29].toISOString().slice(0, 10)).toBe('2026-04-30')
  })
})

describe('formatDateIT', () => {
  it('formatta la data in italiano', () => {
    expect(formatDateIT('2026-04-20')).toBe('20/04/2026')
  })
})

describe('formatTimeShort', () => {
  it('rimuove i secondi dall\'orario', () => {
    expect(formatTimeShort('08:00:00')).toBe('08:00')
    expect(formatTimeShort('14:30:00')).toBe('14:30')
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

```bash
npm test tests/unit/date.test.ts
```
Atteso: FAIL con "Cannot find module"

- [ ] **Step 3: Crea `lib/utils/date.ts`**

```typescript
export function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  // lunedì = 0 offset se day=1, altrimenti calcola
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(date.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function getMonthDays(year: number, month: number): Date[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
}

export function formatDateIT(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function formatTimeShort(time: string): string {
  return time.slice(0, 5)
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
}
```

- [ ] **Step 4: Verifica che i test passino**

```bash
npm test tests/unit/date.test.ts
```
Atteso: PASS (4 test)

- [ ] **Step 5: Scrivi i test per `turni.ts`**

```typescript
// tests/unit/turni.test.ts
import { describe, it, expect } from 'vitest'
import { calcolaOreturno, isOrarioValido } from '@/lib/utils/turni'

describe('calcolaOreTurno', () => {
  it('calcola le ore di un turno normale', () => {
    expect(calcolaOreturno('08:00:00', '16:00:00')).toBe(8)
  })
  it('gestisce un turno a cavallo della mezzanotte', () => {
    expect(calcolaOreturno('22:00:00', '06:00:00')).toBe(8)
  })
})

describe('isOrarioValido', () => {
  it('ritorna true per orari validi diversi', () => {
    expect(isOrarioValido('08:00:00', '16:00:00')).toBe(true)
  })
  it('ritorna false se inizio === fine', () => {
    expect(isOrarioValido('08:00:00', '08:00:00')).toBe(false)
  })
})
```

- [ ] **Step 6: Esegui i test e verifica che falliscano**

```bash
npm test tests/unit/turni.test.ts
```

- [ ] **Step 7: Crea `lib/utils/turni.ts`**

```typescript
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function calcolaOreturno(oraInizio: string, oraFine: string): number {
  const start = timeToMinutes(oraInizio)
  let end = timeToMinutes(oraFine)
  if (end <= start) end += 24 * 60 // turno a cavallo mezzanotte
  return (end - start) / 60
}

export function isOrarioValido(oraInizio: string, oraFine: string): boolean {
  return oraInizio !== oraFine
}
```

- [ ] **Step 8: Verifica che tutti i test passino**

```bash
npm test
```
Atteso: PASS (6 test totali)

- [ ] **Step 9: Commit**

```bash
git add lib/utils/ tests/unit/
git commit -m "feat: utility date e turni con unit test"
```

---

## Task 6: Middleware auth e pagina login

**Files:**
- Create: `middleware.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: Crea `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Non autenticato → redirect al login
  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Ottieni il ruolo dal profilo
    const { data: profile } = await supabase
      .from('profiles')
      .select('ruolo')
      .eq('id', user.id)
      .single()

    const ruolo = profile?.ruolo

    // Redirect dalla root alla dashboard corretta
    if (path === '/' || path === '/login') {
      if (ruolo === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      if (ruolo === 'manager') return NextResponse.redirect(new URL('/manager/calendario', request.url))
      if (ruolo === 'dipendente') return NextResponse.redirect(new URL('/dipendente/turni', request.url))
    }

    // Protezione route per ruolo
    if (path.startsWith('/admin') && ruolo !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (path.startsWith('/manager') && ruolo !== 'manager') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (path.startsWith('/dipendente') && ruolo !== 'dipendente') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

- [ ] **Step 2: Crea `app/page.tsx`**

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/login')
}
```

- [ ] **Step 3: Crea `app/(auth)/login/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o password non validi')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Accedi</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/ middleware.ts
git commit -m "feat: middleware auth e pagina login"
```

---

## Task 7: Componenti UI base e Layout

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Modal.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/BottomNav.tsx`
- Create: `components/layout/Header.tsx`

- [ ] **Step 1: Crea `components/ui/Button.tsx`**

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Crea `components/ui/Input.tsx`**

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Crea `components/ui/Modal.tsx`**

```typescript
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Crea `components/ui/Badge.tsx`**

```typescript
interface BadgeProps {
  label: string
  oraInizio: string
  oraFine: string
  colore: string
  onClick?: () => void
}

export function BadgeTurno({ label, oraInizio, oraFine, colore, onClick }: BadgeProps) {
  return (
    <div
      onClick={onClick}
      className="rounded px-1.5 py-0.5 text-white text-xs cursor-pointer hover:opacity-80 transition-opacity select-none"
      style={{ backgroundColor: colore }}
    >
      <div className="font-medium truncate">{label}</div>
      <div className="opacity-90">{oraInizio.slice(0,5)}–{oraFine.slice(0,5)}</div>
    </div>
  )
}
```

- [ ] **Step 5: Crea `components/layout/Header.tsx`**

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  nomeUtente: string
  ruolo: string
}

export function Header({ nomeUtente, ruolo }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <span className="text-sm text-gray-500 capitalize">{ruolo}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">{nomeUtente}</span>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
          Esci
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Crea `components/layout/Sidebar.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem { label: string; href: string; icon: string }

interface SidebarProps { items: NavItem[]; title: string }

export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 bg-gray-900 text-white flex-shrink-0">
      <div className="h-14 flex items-center px-4 font-bold text-lg border-b border-gray-700">
        {title}
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 7: Crea `components/layout/BottomNav.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem { label: string; href: string; icon: string }

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 ${
            pathname === item.href ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add components/
git commit -m "feat: componenti UI base e layout"
```

---

## Task 8: API Routes — Reparti, Template, Turni, Utenti

**Files:**
- Create: `app/api/reparti/route.ts`
- Create: `app/api/reparti/[id]/route.ts`
- Create: `app/api/template/route.ts`
- Create: `app/api/template/[id]/route.ts`
- Create: `app/api/turni/route.ts`
- Create: `app/api/turni/[id]/route.ts`
- Create: `app/api/utenti/route.ts`
- Create: `app/api/utenti/[id]/route.ts`

- [ ] **Step 1: Crea `app/api/reparti/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reparti')
    .select('*, manager:profiles(id, nome, cognome)')
    .order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('reparti')
    .insert({ nome: body.nome, manager_id: body.manager_id ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Crea `app/api/reparti/[id]/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('reparti')
    .update({ nome: body.nome, manager_id: body.manager_id ?? null })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('reparti').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Crea `app/api/template/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase.from('turni_template').select('*').order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('turni_template')
    .insert({ nome: body.nome, ora_inizio: body.ora_inizio, ora_fine: body.ora_fine, colore: body.colore })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 4: Crea `app/api/template/[id]/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('turni_template')
    .update({ nome: body.nome, ora_inizio: body.ora_inizio, ora_fine: body.ora_fine, colore: body.colore })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('turni_template').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Crea `app/api/turni/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const dataInizio = searchParams.get('data_inizio')
  const dataFine = searchParams.get('data_fine')
  const repartoId = searchParams.get('reparto_id')

  let query = supabase
    .from('turni')
    .select('*, profile:profiles(id, nome, cognome, reparto_id), template:turni_template(*)')
    .order('data')

  if (dataInizio) query = query.gte('data', dataInizio)
  if (dataFine) query = query.lte('data', dataFine)
  if (repartoId) query = query.eq('profiles.reparto_id', repartoId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json()

  const { data, error } = await supabase
    .from('turni')
    .insert({
      dipendente_id: body.dipendente_id,
      template_id: body.template_id ?? null,
      data: body.data,
      ora_inizio: body.ora_inizio,
      ora_fine: body.ora_fine,
      note: body.note ?? null,
      creato_da: user!.id,
    })
    .select('*, profile:profiles(id, nome, cognome), template:turni_template(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 6: Crea `app/api/turni/[id]/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('turni')
    .update({
      template_id: body.template_id ?? null,
      data: body.data,
      ora_inizio: body.ora_inizio,
      ora_fine: body.ora_fine,
      note: body.note ?? null,
    })
    .eq('id', params.id)
    .select('*, profile:profiles(id, nome, cognome), template:turni_template(*)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('turni').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 7: Crea `app/api/utenti/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, reparto:reparti(id, nome)')
    .order('cognome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()

  // Crea l'utente in Supabase Auth tramite service role
  const adminClient = createClient() // in produzione usare service role key
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    user_metadata: { nome: body.nome, cognome: body.cognome, ruolo: body.ruolo },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Aggiorna reparto_id se fornito
  if (body.reparto_id) {
    await supabase.from('profiles').update({ reparto_id: body.reparto_id }).eq('id', authData.user.id)
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

> **Nota:** Per creare utenti via admin API, configura `SUPABASE_SERVICE_ROLE_KEY` e usa il client admin di Supabase in `lib/supabase/admin.ts`.

- [ ] **Step 8: Crea `lib/supabase/admin.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 9: Aggiorna `app/api/utenti/route.ts` per usare il client admin**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
// ...
// sostituisci `const adminClient = createClient()` con:
const adminClient = createAdminClient()
```

- [ ] **Step 10: Crea `app/api/utenti/[id]/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('profiles')
    .update({ nome: body.nome, cognome: body.cognome, ruolo: body.ruolo, reparto_id: body.reparto_id ?? null })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // Disattiva/riattiva utente
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('profiles')
    .update({ attivo: body.attivo })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 11: Commit**

```bash
git add app/api/ lib/supabase/admin.ts
git commit -m "feat: API routes CRUD reparti, template, turni, utenti"
```

---

## Task 9: Componente GrigliaCalendario

**Files:**
- Create: `components/calendario/GrigliaCalendario.tsx`
- Create: `components/calendario/CellaCalendario.tsx`
- Create: `components/calendario/SwitcherVista.tsx`
- Create: `components/calendario/ModaleTurno.tsx`

- [ ] **Step 1: Crea `components/calendario/SwitcherVista.tsx`**

```typescript
interface SwitcherVistaProps {
  vista: 'settimana' | 'mese'
  onChange: (v: 'settimana' | 'mese') => void
  dataCorrente: Date
  onPrev: () => void
  onNext: () => void
}

export function SwitcherVista({ vista, onChange, dataCorrente, onPrev, onNext }: SwitcherVistaProps) {
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crea `components/calendario/CellaCalendario.tsx`**

```typescript
import { TurnoConDettagli } from '@/lib/types'
import { BadgeTurno } from '@/components/ui/Badge'

interface CellaProps {
  turni: TurnoConDettagli[]
  onAdd: () => void
  onEdit: (turno: TurnoConDettagli) => void
  readonly?: boolean
}

export function CellaCalendario({ turni, onAdd, onEdit, readonly = false }: CellaProps) {
  return (
    <td className="border border-gray-200 p-1 align-top min-w-[80px] h-14 group relative">
      <div className="space-y-0.5">
        {turni.map(t => (
          <BadgeTurno
            key={t.id}
            label={t.template?.nome ?? 'Custom'}
            oraInizio={t.ora_inizio}
            oraFine={t.ora_fine}
            colore={t.template?.colore ?? '#6b7280'}
            onClick={readonly ? undefined : () => onEdit(t)}
          />
        ))}
      </div>
      {!readonly && turni.length === 0 && (
        <button
          onClick={onAdd}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 text-lg"
        >
          +
        </button>
      )}
    </td>
  )
}
```

- [ ] **Step 3: Crea `components/calendario/GrigliaCalendario.tsx`**

```typescript
import { Profile, TurnoConDettagli } from '@/lib/types'
import { CellaCalendario } from './CellaCalendario'
import { formatDayLabel, toDateString } from '@/lib/utils/date'

interface GrigliaProps {
  giorni: Date[]
  dipendenti: Profile[]
  turni: TurnoConDettagli[]
  onAddTurno: (dipendenteId: string, data: string) => void
  onEditTurno: (turno: TurnoConDettagli) => void
  readonly?: boolean
}

export function GrigliaCalendario({ giorni, dipendenti, turni, onAddTurno, onEditTurno, readonly }: GrigliaProps) {
  function getTurniCella(dipendenteId: string, data: string) {
    return turni.filter(t => t.dipendente_id === dipendenteId && t.data === data)
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm w-full">
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 min-w-[140px]">
              Dipendente
            </th>
            {giorni.map(g => (
              <th key={g.toISOString()} className="border border-gray-200 bg-gray-50 px-2 py-2 text-center font-medium text-gray-600 min-w-[80px]">
                {formatDayLabel(g)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dipendenti.map(d => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                {d.nome} {d.cognome}
              </td>
              {giorni.map(g => {
                const data = toDateString(g)
                return (
                  <CellaCalendario
                    key={data}
                    turni={getTurniCella(d.id, data)}
                    onAdd={() => onAddTurno(d.id, data)}
                    onEdit={onEditTurno}
                    readonly={readonly}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Crea `components/calendario/ModaleTurno.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TurnoConDettagli, TurnoTemplate } from '@/lib/types'

interface ModaleTurnoProps {
  open: boolean
  onClose: () => void
  onSave: (data: { template_id: string | null; ora_inizio: string; ora_fine: string; note: string }) => void
  onDelete?: () => void
  turno?: TurnoConDettagli | null
  templates: TurnoTemplate[]
  dipendenteNome?: string
  data?: string
}

export function ModaleTurno({ open, onClose, onSave, onDelete, turno, templates, dipendenteNome, data }: ModaleTurnoProps) {
  const [templateId, setTemplateId] = useState<string>('')
  const [oraInizio, setOraInizio] = useState('08:00')
  const [oraFine, setOraFine] = useState('16:00')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (turno) {
      setTemplateId(turno.template_id ?? '')
      setOraInizio(turno.ora_inizio.slice(0, 5))
      setOraFine(turno.ora_fine.slice(0, 5))
      setNote(turno.note ?? '')
    } else {
      setTemplateId('')
      setOraInizio('08:00')
      setOraFine('16:00')
      setNote('')
    }
  }, [turno, open])

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    const t = templates.find(t => t.id === id)
    if (t) {
      setOraInizio(t.ora_inizio.slice(0, 5))
      setOraFine(t.ora_fine.slice(0, 5))
    }
  }

  function handleSave() {
    onSave({
      template_id: templateId || null,
      ora_inizio: oraInizio + ':00',
      ora_fine: oraFine + ':00',
      note,
    })
  }

  const title = turno ? 'Modifica turno' : `Nuovo turno${dipendenteNome ? ` — ${dipendenteNome}` : ''}`

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {data && <p className="text-sm text-gray-500 mb-4">{data}</p>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
          <select
            value={templateId}
            onChange={e => handleTemplateChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Personalizzato —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.nome} ({t.ora_inizio.slice(0,5)}–{t.ora_fine.slice(0,5)})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ora inizio" type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)} />
          <Input label="Ora fine" type="time" value={oraFine} onChange={e => setOraFine(e.target.value)} />
        </div>
        <Input label="Note (opzionale)" value={note} onChange={e => setNote(e.target.value)} placeholder="..." />
        <div className="flex justify-between pt-2">
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>Elimina</Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" onClick={onClose}>Annulla</Button>
            <Button onClick={handleSave}>Salva</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/calendario/
git commit -m "feat: componenti calendario (griglia, cella, modale turno)"
```

---

## Task 10: Area Manager — Calendario

**Files:**
- Create: `app/(manager)/layout.tsx`
- Create: `app/(manager)/calendario/page.tsx`

- [ ] **Step 1: Crea `app/(manager)/layout.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'

const NAV_ITEMS = [
  { label: 'Calendario', href: '/manager/calendario', icon: '📅' },
  { label: 'Template', href: '/manager/template', icon: '🏷️' },
  { label: 'Export', href: '/manager/export', icon: '📤' },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar items={NAV_ITEMS} title="GestioneTurni" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="manager" />
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}
```

- [ ] **Step 2: Crea `app/(manager)/calendario/page.tsx`**

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { SwitcherVista } from '@/components/calendario/SwitcherVista'
import { ModaleTurno } from '@/components/calendario/ModaleTurno'
import { Profile, TurnoConDettagli, TurnoTemplate } from '@/lib/types'
import { getWeekDays, getMonthDays, toDateString, formatDateIT } from '@/lib/utils/date'

export default function CalendarioPage() {
  const [vista, setVista] = useState<'settimana' | 'mese'>('settimana')
  const [dataCorrente, setDataCorrente] = useState(new Date())
  const [dipendenti, setDipendenti] = useState<Profile[]>([])
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [modale, setModale] = useState<{ open: boolean; dipendenteId?: string; data?: string; turno?: TurnoConDettagli | null }>({ open: false })

  const giorni = vista === 'settimana'
    ? getWeekDays(dataCorrente)
    : getMonthDays(dataCorrente.getFullYear(), dataCorrente.getMonth())

  const caricaDati = useCallback(async () => {
    const [utentiRes, templateRes, turniRes] = await Promise.all([
      fetch('/api/utenti'),
      fetch('/api/template'),
      fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`),
    ])
    const [utenti, tmpl, trn] = await Promise.all([utentiRes.json(), templateRes.json(), turniRes.json()])
    setDipendenti(utenti.filter((u: Profile) => u.ruolo === 'dipendente' && u.attivo))
    setTemplates(tmpl)
    setTurni(trn)
  }, [dataCorrente, vista])

  useEffect(() => { caricaDati() }, [caricaDati])

  function spostaData(direzione: 1 | -1) {
    const d = new Date(dataCorrente)
    if (vista === 'settimana') d.setDate(d.getDate() + direzione * 7)
    else d.setMonth(d.getMonth() + direzione)
    setDataCorrente(d)
  }

  async function handleSalvaTurno(payload: { template_id: string | null; ora_inizio: string; ora_fine: string; note: string }) {
    if (modale.turno) {
      await fetch(`/api/turni/${modale.turno.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, dipendente_id: modale.turno.dipendente_id, data: modale.turno.data }),
      })
    } else {
      await fetch('/api/turni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, dipendente_id: modale.dipendenteId, data: modale.data }),
      })
    }
    setModale({ open: false })
    caricaDati()
  }

  async function handleEliminaTurno() {
    if (!modale.turno) return
    await fetch(`/api/turni/${modale.turno.id}`, { method: 'DELETE' })
    setModale({ open: false })
    caricaDati()
  }

  const dipSelezionato = dipendenti.find(d => d.id === modale.dipendenteId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Calendario Turni</h1>
        <SwitcherVista
          vista={vista}
          onChange={setVista}
          dataCorrente={dataCorrente}
          onPrev={() => spostaData(-1)}
          onNext={() => spostaData(1)}
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <GrigliaCalendario
          giorni={giorni}
          dipendenti={dipendenti}
          turni={turni}
          onAddTurno={(dipendenteId, data) => setModale({ open: true, dipendenteId, data })}
          onEditTurno={turno => setModale({ open: true, turno })}
        />
      </div>
      <ModaleTurno
        open={modale.open}
        onClose={() => setModale({ open: false })}
        onSave={handleSalvaTurno}
        onDelete={modale.turno ? handleEliminaTurno : undefined}
        turno={modale.turno}
        templates={templates}
        dipendenteNome={dipSelezionato ? `${dipSelezionato.nome} ${dipSelezionato.cognome}` : undefined}
        data={modale.data ? formatDateIT(modale.data) : undefined}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(manager\)/
git commit -m "feat: area manager — calendario turni"
```

---

## Task 11: Area Manager — Template e Export

**Files:**
- Create: `app/(manager)/template/page.tsx`
- Create: `app/(manager)/export/page.tsx`
- Create: `lib/utils/export.ts`
- Create: `tests/unit/export.test.ts`

- [ ] **Step 1: Crea `app/(manager)/template/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { TurnoTemplate } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

const COLORI_PRESET = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export default function TemplatePage() {
  const [templates, setTemplates] = useState<TurnoTemplate[]>([])
  const [modale, setModale] = useState<{ open: boolean; template?: TurnoTemplate | null }>({ open: false })
  const [form, setForm] = useState({ nome: '', ora_inizio: '08:00', ora_fine: '16:00', colore: '#3b82f6' })

  async function carica() {
    const res = await fetch('/api/template')
    setTemplates(await res.json())
  }

  useEffect(() => { carica() }, [])

  function apriNuovo() {
    setForm({ nome: '', ora_inizio: '08:00', ora_fine: '16:00', colore: '#3b82f6' })
    setModale({ open: true, template: null })
  }

  function apriModifica(t: TurnoTemplate) {
    setForm({ nome: t.nome, ora_inizio: t.ora_inizio.slice(0, 5), ora_fine: t.ora_fine.slice(0, 5), colore: t.colore })
    setModale({ open: true, template: t })
  }

  async function handleSalva() {
    const payload = { nome: form.nome, ora_inizio: form.ora_inizio + ':00', ora_fine: form.ora_fine + ':00', colore: form.colore }
    if (modale.template) {
      await fetch(`/api/template/${modale.template.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setModale({ open: false })
    carica()
  }

  async function handleElimina(id: string) {
    if (!confirm('Eliminare questo template?')) return
    await fetch(`/api/template/${id}`, { method: 'DELETE' })
    carica()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Template Turni</h1>
        <Button onClick={apriNuovo}>+ Nuovo template</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y">
        {templates.map(t => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: t.colore }} />
              <span className="font-medium text-gray-800">{t.nome}</span>
              <span className="text-sm text-gray-500">{t.ora_inizio.slice(0,5)} – {t.ora_fine.slice(0,5)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => apriModifica(t)}>Modifica</Button>
              <Button variant="danger" size="sm" onClick={() => handleElimina(t.id)}>Elimina</Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">Nessun template. Crea il primo.</p>}
      </div>
      <Modal open={modale.open} onClose={() => setModale({ open: false })} title={modale.template ? 'Modifica template' : 'Nuovo template'}>
        <div className="space-y-4">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="es. Mattina" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ora inizio" type="time" value={form.ora_inizio} onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))} />
            <Input label="Ora fine" type="time" value={form.ora_fine} onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colore</label>
            <div className="flex gap-2">
              {COLORI_PRESET.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, colore: c }))}
                  className={`w-7 h-7 rounded-full border-2 ${form.colore === c ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModale({ open: false })}>Annulla</Button>
            <Button onClick={handleSalva}>Salva</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Scrivi il test per `export.ts`**

```typescript
// tests/unit/export.test.ts
import { describe, it, expect } from 'vitest'
import { turniToExcelRows } from '@/lib/utils/export'
import type { TurnoConDettagli } from '@/lib/types'

describe('turniToExcelRows', () => {
  it('converte un array di turni in righe Excel', () => {
    const turni = [{
      id: '1',
      dipendente_id: 'u1',
      data: '2026-04-20',
      ora_inizio: '08:00:00',
      ora_fine: '16:00:00',
      note: 'test',
      profile: { id: 'u1', nome: 'Mario', cognome: 'Rossi', ruolo: 'dipendente', reparto_id: null, attivo: true, created_at: '' },
      template: null,
      template_id: null, creato_da: '', created_at: '', updated_at: '',
    }] as TurnoConDettagli[]

    const rows = turniToExcelRows(turni)
    expect(rows).toHaveLength(2) // header + 1 riga
    expect(rows[0]).toEqual(['Dipendente', 'Data', 'Ora inizio', 'Ora fine', 'Note'])
    expect(rows[1]).toEqual(['Mario Rossi', '20/04/2026', '08:00', '16:00', 'test'])
  })
})
```

- [ ] **Step 3: Esegui il test e verifica che fallisca**

```bash
npm test tests/unit/export.test.ts
```

- [ ] **Step 4: Crea `lib/utils/export.ts`**

```typescript
import { TurnoConDettagli } from '@/lib/types'
import { formatDateIT, formatTimeShort } from './date'

export function turniToExcelRows(turni: TurnoConDettagli[]): (string | number)[][] {
  const header = ['Dipendente', 'Data', 'Ora inizio', 'Ora fine', 'Note']
  const rows = turni.map(t => [
    `${t.profile.nome} ${t.profile.cognome}`,
    formatDateIT(t.data),
    formatTimeShort(t.ora_inizio),
    formatTimeShort(t.ora_fine),
    t.note ?? '',
  ])
  return [header, ...rows]
}

export async function exportExcel(turni: TurnoConDettagli[], filename: string) {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.aoa_to_sheet(turniToExcelRows(turni))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Turni')
  writeFile(wb, `${filename}.xlsx`)
}

export async function exportCsv(turni: TurnoConDettagli[], filename: string) {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.aoa_to_sheet(turniToExcelRows(turni))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Turni')
  writeFile(wb, `${filename}.csv`, { bookType: 'csv' })
}

export async function exportPdf(turni: TurnoConDettagli[], filename: string, periodo: string) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(`Piano Turni — ${periodo}`, 14, 15)
  const rows = turniToExcelRows(turni)
  autoTable(doc, {
    head: [rows[0] as string[]],
    body: rows.slice(1) as string[][],
    startY: 22,
  })
  doc.save(`${filename}.pdf`)
}
```

- [ ] **Step 5: Verifica che il test passi**

```bash
npm test tests/unit/export.test.ts
```

- [ ] **Step 6: Crea `app/(manager)/export/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { exportExcel, exportCsv, exportPdf } from '@/lib/utils/export'
import type { TurnoConDettagli } from '@/lib/types'

export default function ExportPage() {
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function fetchTurni(): Promise<TurnoConDettagli[]> {
    const res = await fetch(`/api/turni?data_inizio=${dataInizio}&data_fine=${dataFine}`)
    return res.json()
  }

  async function handleExport(tipo: 'pdf' | 'excel' | 'csv') {
    if (!dataInizio || !dataFine) { setErrore('Seleziona un intervallo di date'); return }
    setLoading(true)
    setErrore('')
    const turni = await fetchTurni()
    const filename = `turni_${dataInizio}_${dataFine}`
    const periodo = `${dataInizio} / ${dataFine}`
    if (tipo === 'pdf') await exportPdf(turni, filename, periodo)
    if (tipo === 'excel') await exportExcel(turni, filename)
    if (tipo === 'csv') await exportCsv(turni, filename)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-xl font-bold text-gray-900">Export Turni</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data inizio" type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} />
          <Input label="Data fine" type="date" value={dataFine} onChange={e => setDataFine(e.target.value)} />
        </div>
        {errore && <p className="text-sm text-red-600">{errore}</p>}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => handleExport('pdf')} disabled={loading}>📄 Scarica PDF</Button>
          <Button variant="secondary" onClick={() => handleExport('excel')} disabled={loading}>📊 Scarica Excel</Button>
          <Button variant="secondary" onClick={() => handleExport('csv')} disabled={loading}>📋 Scarica CSV</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add app/\(manager\)/template app/\(manager\)/export lib/utils/export.ts tests/unit/export.test.ts
git commit -m "feat: template turni, export PDF/Excel/CSV con test"
```

---

## Task 12: Area Admin

**Files:**
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/dashboard/page.tsx`
- Create: `app/(admin)/utenti/page.tsx`
- Create: `app/(admin)/utenti/nuovo/page.tsx`
- Create: `app/(admin)/utenti/[id]/page.tsx`
- Create: `app/(admin)/reparti/page.tsx`
- Create: `app/(admin)/reparti/nuovo/page.tsx`
- Create: `app/(admin)/reparti/[id]/page.tsx`

- [ ] **Step 1: Crea `app/(admin)/layout.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { label: 'Utenti', href: '/admin/utenti', icon: '👥' },
  { label: 'Reparti', href: '/admin/reparti', icon: '🏢' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar items={NAV_ITEMS} title="GestioneTurni" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="admin" />
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}
```

- [ ] **Step 2: Crea `app/(admin)/dashboard/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = createClient()
  const [{ count: numUtenti }, { count: numReparti }, { count: numTurniOggi }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('attivo', true),
    supabase.from('reparti').select('*', { count: 'exact', head: true }),
    supabase.from('turni').select('*', { count: 'exact', head: true }).eq('data', new Date().toISOString().slice(0, 10)),
  ])

  const stats = [
    { label: 'Dipendenti attivi', valore: numUtenti ?? 0, icona: '👥' },
    { label: 'Reparti', valore: numReparti ?? 0, icona: '🏢' },
    { label: 'Turni oggi', valore: numTurniOggi ?? 0, icona: '📅' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-2xl mb-2">{s.icona}</div>
            <div className="text-3xl font-bold text-gray-900">{s.valore}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crea `app/(admin)/utenti/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function UtentiPage() {
  const supabase = createClient()
  const { data: utenti } = await supabase
    .from('profiles')
    .select('*, reparto:reparti(nome)')
    .order('cognome')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Utenti</h1>
        <Link href="/admin/utenti/nuovo"><Button>+ Nuovo utente</Button></Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ruolo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Reparto</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Stato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {utenti?.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.cognome} {u.nome}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{u.ruolo}</td>
                <td className="px-4 py-3 text-gray-600">{(u.reparto as any)?.nome ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.attivo ? 'Attivo' : 'Disattivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/utenti/${u.id}`} className="text-blue-600 hover:underline text-sm">Modifica</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Crea `app/(admin)/utenti/nuovo/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Reparto } from '@/lib/types'

export default function NuovoUtentePage() {
  const router = useRouter()
  const [reparti, setReparti] = useState<Reparto[]>([])
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '', ruolo: 'dipendente', reparto_id: '' })
  const [errore, setErrore] = useState('')

  useEffect(() => {
    fetch('/api/reparti').then(r => r.json()).then(setReparti)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')
    const res = await fetch('/api/utenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, reparto_id: form.reparto_id || null }),
    })
    if (!res.ok) { const d = await res.json(); setErrore(d.error); return }
    router.push('/admin/utenti')
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Nuovo utente</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
          <Input label="Cognome" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
          <select value={form.ruolo} onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="dipendente">Dipendente</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reparto</label>
          <select value={form.reparto_id} onChange={e => setForm(f => ({ ...f, reparto_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Nessuno —</option>
            {reparti.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
        {errore && <p className="text-sm text-red-600">{errore}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>Annulla</Button>
          <Button type="submit">Crea utente</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Crea `app/(admin)/utenti/[id]/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Profile, Reparto } from '@/lib/types'

export default function ModificaUtentePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [reparti, setReparti] = useState<Reparto[]>([])
  const [form, setForm] = useState({ nome: '', cognome: '', ruolo: 'dipendente', reparto_id: '', attivo: true })

  useEffect(() => {
    Promise.all([
      fetch('/api/reparti').then(r => r.json()),
      fetch('/api/utenti').then(r => r.json()),
    ]).then(([rep, utenti]) => {
      setReparti(rep)
      const u = utenti.find((u: Profile) => u.id === id)
      if (u) setForm({ nome: u.nome, cognome: u.cognome, ruolo: u.ruolo, reparto_id: u.reparto_id ?? '', attivo: u.attivo })
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/utenti/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, reparto_id: form.reparto_id || null }),
    })
    router.push('/admin/utenti')
  }

  async function toggleAttivo() {
    await fetch(`/api/utenti/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !form.attivo }),
    })
    setForm(f => ({ ...f, attivo: !f.attivo }))
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Modifica utente</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
          <Input label="Cognome" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
          <select value={form.ruolo} onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="dipendente">Dipendente</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reparto</label>
          <select value={form.reparto_id} onChange={e => setForm(f => ({ ...f, reparto_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Nessuno —</option>
            {reparti.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
        <div className="flex justify-between items-center pt-2">
          <Button variant={form.attivo ? 'danger' : 'secondary'} type="button" onClick={toggleAttivo}>
            {form.attivo ? 'Disattiva utente' : 'Riattiva utente'}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => router.back()}>Annulla</Button>
            <Button type="submit">Salva</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Crea `app/(admin)/reparti/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function RepartiPage() {
  const supabase = createClient()
  const { data: reparti } = await supabase
    .from('reparti')
    .select('*, manager:profiles(nome, cognome)')
    .order('nome')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reparti</h1>
        <Link href="/admin/reparti/nuovo"><Button>+ Nuovo reparto</Button></Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y">
        {reparti?.map(r => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-gray-800">{r.nome}</p>
              <p className="text-sm text-gray-500">
                Manager: {(r.manager as any) ? `${(r.manager as any).nome} ${(r.manager as any).cognome}` : '—'}
              </p>
            </div>
            <Link href={`/admin/reparti/${r.id}`} className="text-blue-600 hover:underline text-sm">Modifica</Link>
          </div>
        ))}
        {(!reparti || reparti.length === 0) && <p className="px-4 py-6 text-sm text-gray-500 text-center">Nessun reparto.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Crea `app/(admin)/reparti/nuovo/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Profile } from '@/lib/types'

export default function NuovoRepartoPage() {
  const router = useRouter()
  const [managers, setManagers] = useState<Profile[]>([])
  const [nome, setNome] = useState('')
  const [managerId, setManagerId] = useState('')

  useEffect(() => {
    fetch('/api/utenti').then(r => r.json()).then((u: Profile[]) =>
      setManagers(u.filter(x => x.ruolo === 'manager' && x.attivo))
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/reparti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, manager_id: managerId || null }),
    })
    router.push('/admin/reparti')
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Nuovo reparto</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <Input label="Nome reparto" value={nome} onChange={e => setNome(e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Manager responsabile</label>
          <select value={managerId} onChange={e => setManagerId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Nessuno —</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.cognome} {m.nome}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>Annulla</Button>
          <Button type="submit">Crea reparto</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 8: Crea `app/(admin)/reparti/[id]/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Profile, Reparto } from '@/lib/types'

export default function ModificaRepartoPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [managers, setManagers] = useState<Profile[]>([])
  const [nome, setNome] = useState('')
  const [managerId, setManagerId] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/utenti').then(r => r.json()),
      fetch('/api/reparti').then(r => r.json()),
    ]).then(([utenti, reparti]) => {
      setManagers(utenti.filter((u: Profile) => u.ruolo === 'manager' && u.attivo))
      const r = reparti.find((x: Reparto) => x.id === id)
      if (r) { setNome(r.nome); setManagerId(r.manager_id ?? '') }
    })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/reparti/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, manager_id: managerId || null }),
    })
    router.push('/admin/reparti')
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Modifica reparto</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <Input label="Nome reparto" value={nome} onChange={e => setNome(e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Manager responsabile</label>
          <select value={managerId} onChange={e => setManagerId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Nessuno —</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.cognome} {m.nome}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>Annulla</Button>
          <Button type="submit">Salva</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add app/\(admin\)/
git commit -m "feat: area admin — dashboard, utenti, reparti"
```

---

## Task 13: Area Dipendente

**Files:**
- Create: `app/(dipendente)/layout.tsx`
- Create: `app/(dipendente)/turni/page.tsx`
- Create: `app/(dipendente)/profilo/page.tsx`

- [ ] **Step 1: Crea `app/(dipendente)/layout.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'

const NAV_ITEMS = [
  { label: 'I miei turni', href: '/dipendente/turni', icon: '📅' },
  { label: 'Profilo', href: '/dipendente/profilo', icon: '👤' },
]

export default async function DipendenteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('nome, cognome').eq('id', user!.id).single()

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar items={NAV_ITEMS} title="I Miei Turni" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header nomeUtente={`${profile?.nome} ${profile?.cognome}`} ruolo="dipendente" />
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}
```

- [ ] **Step 2: Crea `app/(dipendente)/turni/page.tsx`**

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { GrigliaCalendario } from '@/components/calendario/GrigliaCalendario'
import { SwitcherVista } from '@/components/calendario/SwitcherVista'
import { createClient } from '@/lib/supabase/client'
import type { Profile, TurnoConDettagli } from '@/lib/types'
import { getWeekDays, getMonthDays, toDateString } from '@/lib/utils/date'

export default function MieiTurniPage() {
  const [vista, setVista] = useState<'settimana' | 'mese'>('settimana')
  const [dataCorrente, setDataCorrente] = useState(new Date())
  const [profilo, setProfilo] = useState<Profile | null>(null)
  const [turni, setTurni] = useState<TurnoConDettagli[]>([])
  const supabase = createClient()

  const giorni = vista === 'settimana'
    ? getWeekDays(dataCorrente)
    : getMonthDays(dataCorrente.getFullYear(), dataCorrente.getMonth())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfilo(data))
    })
  }, [])

  const caricaTurni = useCallback(async () => {
    const res = await fetch(`/api/turni?data_inizio=${toDateString(giorni[0])}&data_fine=${toDateString(giorni[giorni.length - 1])}`)
    setTurni(await res.json())
  }, [dataCorrente, vista])

  useEffect(() => { caricaTurni() }, [caricaTurni])

  function spostaData(direzione: 1 | -1) {
    const d = new Date(dataCorrente)
    if (vista === 'settimana') d.setDate(d.getDate() + direzione * 7)
    else d.setMonth(d.getMonth() + direzione)
    setDataCorrente(d)
  }

  if (!profilo) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">I miei turni</h1>
        <SwitcherVista vista={vista} onChange={setVista} dataCorrente={dataCorrente} onPrev={() => spostaData(-1)} onNext={() => spostaData(1)} />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <GrigliaCalendario
          giorni={giorni}
          dipendenti={[profilo]}
          turni={turni}
          onAddTurno={() => {}}
          onEditTurno={() => {}}
          readonly
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crea `app/(dipendente)/profilo/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Profile } from '@/lib/types'

export default function ProfiloPage() {
  const [profilo, setProfilo] = useState<Profile | null>(null)
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfilo(data))
    })
  }, [])

  async function handleCambiaPassword(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword })
    if (error) setMessaggio('Errore: ' + error.message)
    else { setMessaggio('Password aggiornata!'); setNuovaPassword('') }
  }

  if (!profilo) return null

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Profilo</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
        <div><span className="text-sm text-gray-500">Nome</span><p className="font-medium">{profilo.nome} {profilo.cognome}</p></div>
        <div><span className="text-sm text-gray-500">Ruolo</span><p className="font-medium capitalize">{profilo.ruolo}</p></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Cambia password</h2>
        <form onSubmit={handleCambiaPassword} className="space-y-4">
          <Input label="Nuova password" type="password" value={nuovaPassword} onChange={e => setNuovaPassword(e.target.value)} required minLength={6} />
          {messaggio && <p className="text-sm text-green-600">{messaggio}</p>}
          <Button type="submit">Aggiorna password</Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dipendente\)/
git commit -m "feat: area dipendente — turni personali e profilo"
```

---

## Task 14: E2E Tests con Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/login.spec.ts`
- Create: `tests/e2e/calendario.spec.ts`

- [ ] **Step 1: Crea `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 2: Crea `tests/e2e/login.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test('redirect a /login se non autenticato', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/login/)
})

test('mostra errore con credenziali errate', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'nonesiste@test.com')
  await page.fill('input[type="password"]', 'wrongpass')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=Email o password non validi')).toBeVisible()
})

test('login manager con credenziali corrette reindirizza al calendario', async ({ page }) => {
  // Usa le credenziali di un utente manager di test creato in Supabase
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_MANAGER_EMAIL ?? 'manager@test.com')
  await page.fill('input[type="password"]', process.env.TEST_MANAGER_PASSWORD ?? 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/manager\/calendario/)
})
```

> **Nota:** Crea un utente manager di test su Supabase e configura `TEST_MANAGER_EMAIL` e `TEST_MANAGER_PASSWORD` in `.env.local`.

- [ ] **Step 3: Crea `tests/e2e/calendario.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.TEST_MANAGER_EMAIL ?? 'manager@test.com')
  await page.fill('input[type="password"]', process.env.TEST_MANAGER_PASSWORD ?? 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/manager\/calendario/)
})

test('mostra la griglia calendario', async ({ page }) => {
  await expect(page.locator('table')).toBeVisible()
  await expect(page.locator('text=Calendario Turni')).toBeVisible()
})

test('switch tra vista settimanale e mensile', async ({ page }) => {
  await page.click('button:has-text("mese")')
  await expect(page.locator('button:has-text("mese")')).toHaveClass(/bg-blue-600/)
  await page.click('button:has-text("settimana")')
  await expect(page.locator('button:has-text("settimana")')).toHaveClass(/bg-blue-600/)
})
```

- [ ] **Step 4: Esegui gli E2E test**

```bash
npm run test:e2e
```

- [ ] **Step 5: Commit finale**

```bash
git add tests/e2e/ playwright.config.ts
git commit -m "test: E2E Playwright login e calendario"
```

---

## Task 15: Verifica finale e build

- [ ] **Step 1: Esegui tutti i test unitari**

```bash
npm test
```
Atteso: tutti i test PASS

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```
Atteso: nessun errore

- [ ] **Step 3: Build di produzione**

```bash
npm run build
```
Atteso: build completata senza errori

- [ ] **Step 4: Verifica manuale — avvia il dev server**

```bash
npm run dev
```

Testa manualmente:
1. Vai su `http://localhost:3000` → redirect a `/login`
2. Login come admin → vai su `/admin/dashboard`
3. Crea un reparto, crea un utente manager e un dipendente
4. Login come manager → crea template, assegna turni nel calendario
5. Login come dipendente → vedi i propri turni in sola lettura
6. Come manager → prova export PDF e Excel

- [ ] **Step 5: Commit finale**

```bash
git add .
git commit -m "chore: verifica build e test finali"
```
