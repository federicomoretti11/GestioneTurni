# Menu Riorganizzazione — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riorganizzare i menu Admin e Manager con sezioni etichettate e voci rinominate per chiarezza.

**Architecture:** Estendere `NavItem` con un campo opzionale `section`; il componente `Sidebar.tsx` inserisce un'intestazione di sezione ogni volta che il campo cambia rispetto all'item precedente. I due componenti specifici (`SidebarAdmin`, `SidebarManager`) aggiornano solo l'array di items — nessuna logica esistente viene alterata.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS

---

### Task 1: Estendere `Sidebar.tsx` per supportare sezioni etichettate

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Aggiungere `section` all'interfaccia `NavItem`**

In `components/layout/Sidebar.tsx`, aggiornare l'interfaccia:

```tsx
interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
  section?: string  // etichetta di sezione; se presente, stampa header prima della voce
}
```

- [ ] **Step 2: Aggiornare il render per emettere gli header di sezione**

Sostituire il blocco `{items.map(...)}` con la versione che controlla la sezione:

```tsx
<nav className="flex-1 p-2">
  {items.map((item, i) => {
    const showSection = item.section && item.section !== items[i - 1]?.section
    const isActive = pathname === item.href
    return (
      <div key={item.href}>
        {showSection && (
          <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {item.section}
          </div>
        )}
        <Link
          href={item.href}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors mb-0.5 ${
            isActive
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="text-[15px] leading-none">{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </Link>
      </div>
    )
  })}
</nav>
```

- [ ] **Step 3: Verificare compilazione TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(sidebar): supporto sezioni etichettate in NavItem"
```

---

### Task 2: Aggiornare `SidebarAdmin.tsx` con la nuova struttura

**Files:**
- Modify: `components/layout/SidebarAdmin.tsx`

- [ ] **Step 1: Sostituire `BASE_ITEMS` con la struttura a sezioni**

```tsx
const BASE_ITEMS = [
  { label: 'Dashboard',       href: '/admin/dashboard',                       icon: '📊' },
  { section: 'Calendario',    label: 'Per dipendente', href: '/admin/calendario',                      icon: '📅' },
  {                            label: 'Per posto',       href: '/admin/calendario-posti',               icon: '📍' },
  { section: 'Programmazione', label: 'Per dipendente', href: '/admin/calendario-programmazione',      icon: '📝' },
  {                            label: 'Per posto',       href: '/admin/calendario-programmazione-posti', icon: '🗂️' },
  { section: 'Gestione',      label: 'Modelli turno',   href: '/admin/template',                       icon: '🏷️' },
  {                            label: 'Richieste',       href: '/admin/richieste',                      icon: '📋' },
  {                            label: 'Export',          href: '/admin/export',                         icon: '📤' },
  { section: 'Configurazione', label: 'Utenti',         href: '/admin/utenti',                         icon: '👥' },
  {                            label: 'Posti',           href: '/admin/posti',                          icon: '🏢' },
  {                            label: 'Festivi',         href: '/admin/festivi',                        icon: '🎉' },
]
```

- [ ] **Step 2: Verificare compilazione TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Avviare il dev server e verificare visivamente**

```bash
npm run dev
```

Aprire `http://localhost:3000/admin/dashboard` e verificare:
- Il menu mostra 4 sezioni etichettate: CALENDARIO, PROGRAMMAZIONE, GESTIONE, CONFIGURAZIONE
- Dashboard appare sopra tutto senza sezione
- I badge (numero bozze, numero richieste) sono presenti sulle voci corrette
- La voce attiva è evidenziata in blu

- [ ] **Step 4: Commit**

```bash
git add components/layout/SidebarAdmin.tsx
git commit -m "feat(sidebar): menu admin a sezioni con voci rinominate"
```

---

### Task 3: Aggiornare `SidebarManager.tsx` con la nuova struttura

**Files:**
- Modify: `components/layout/SidebarManager.tsx`

- [ ] **Step 1: Sostituire `BASE_ITEMS` con la struttura a sezioni**

```tsx
const BASE_ITEMS = [
  { section: 'Calendario',     label: 'Per dipendente', href: '/manager/calendario',                       icon: '📅' },
  {                             label: 'Per posto',       href: '/manager/calendario-posti',                icon: '📍' },
  { section: 'Programmazione', label: 'Per dipendente', href: '/manager/calendario-programmazione',       icon: '📝' },
  {                             label: 'Per posto',       href: '/manager/calendario-programmazione-posti', icon: '🗂️' },
  { section: 'Gestione',       label: 'Richieste',       href: '/manager/richieste',                       icon: '📋' },
  {                             label: 'Modelli turno',   href: '/manager/template',                        icon: '🏷️' },
  {                             label: 'Export',          href: '/manager/export',                          icon: '📤' },
]
```

- [ ] **Step 2: Verificare compilazione TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Verificare visivamente il menu Manager**

Navigare su una pagina manager (es. `/manager/calendario`) e verificare:
- Il menu mostra 3 sezioni: CALENDARIO, PROGRAMMAZIONE, GESTIONE
- Nessuna sezione CONFIGURAZIONE
- Badge richieste presente sulla voce Richieste
- Voce attiva evidenziata in blu

- [ ] **Step 4: Commit e push**

```bash
git add components/layout/SidebarManager.tsx
git commit -m "feat(sidebar): menu manager a sezioni con voci rinominate"
git push origin master
```
