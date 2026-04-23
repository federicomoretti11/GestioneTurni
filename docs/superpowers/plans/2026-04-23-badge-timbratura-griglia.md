# Badge timbratura in griglia calendario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrare lo stato di timbratura di ogni turno (non iniziato / in corso / completato) direttamente sulla griglia calendario, sia desktop che mobile, senza dover aprire il `ModaleTurno`.

**Architecture:** Feature puramente visuale. Nessuno schema DB, nessuna nuova API, nessuna query modificata — i campi `ora_ingresso_effettiva` e `ora_uscita_effettiva` sono già selezionati dai caricamenti turni. Una funzione derivata pura (`statoTimbratura`) in `lib/utils/turni.ts`, un piccolo componente riusabile `PallinoTimbratura`, e quattro punti di integrazione (due desktop, due mobile).

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Vitest (unit).

**Spec di riferimento:** `docs/superpowers/specs/2026-04-23-badge-timbratura-griglia-design.md`

---

## File Structure

**Create:**
- `components/ui/PallinoTimbratura.tsx` — componente presentazionale del pallino di stato

**Modify:**
- `lib/utils/turni.ts` — aggiungi tipo `StatoTimbratura` + funzione `statoTimbratura`
- `tests/unit/turni.test.ts` — aggiungi test per `statoTimbratura`
- `components/ui/Badge.tsx` — `BadgeTurno` accetta `oraIngressoEffettiva` + `oraUscitaEffettiva` e renderizza il pallino in alto a destra
- `components/calendario/CellaCalendario.tsx` — inoltra i due campi a `BadgeTurno`
- `components/calendario/GrigliaCalendarioMobile.tsx` — piazza `<PallinoTimbratura>` accanto alla chip template
- `components/calendario/GrigliaCalendarioPostiMobile.tsx` — idem

**Non toccare:**
- `components/calendario/GrigliaCalendario.tsx` e `GrigliaCalendarioPosti.tsx` — usano `CellaCalendario` → `BadgeTurno`, beneficiano del cambio senza modifiche dirette
- Migrations, API routes, tipi `Turno`/`TurnoConDettagli` (i campi esistono già)

---

### Task 1: Helper `statoTimbratura` (TDD)

**Files:**
- Modify: `lib/utils/turni.ts` (append al file)
- Modify: `tests/unit/turni.test.ts` (append nuovo describe)

- [ ] **Step 1: Scrivi il test fallente**

Aggiungi in fondo a `tests/unit/turni.test.ts`:

```ts
import { statoTimbratura } from '@/lib/utils/turni'

describe('statoTimbratura', () => {
  it('ritorna "non_iniziato" se non ci sono timbri', () => {
    expect(statoTimbratura({ ora_ingresso_effettiva: null, ora_uscita_effettiva: null }))
      .toBe('non_iniziato')
  })
  it('ritorna "in_corso" con solo ingresso', () => {
    expect(statoTimbratura({
      ora_ingresso_effettiva: '2026-04-23T08:52:00Z',
      ora_uscita_effettiva: null,
    })).toBe('in_corso')
  })
  it('ritorna "completato" con entrambi i timbri', () => {
    expect(statoTimbratura({
      ora_ingresso_effettiva: '2026-04-23T08:52:00Z',
      ora_uscita_effettiva: '2026-04-23T17:03:00Z',
    })).toBe('completato')
  })
  it('ritorna "non_iniziato" con solo uscita (stato invalido)', () => {
    expect(statoTimbratura({
      ora_ingresso_effettiva: null,
      ora_uscita_effettiva: '2026-04-23T17:03:00Z',
    })).toBe('non_iniziato')
  })
})
```

L'import `statoTimbratura` in cima al file va aggiunto alla riga esistente `import { calcolaOreTurno, isOrarioValido } from '@/lib/utils/turni'`, diventando:

```ts
import { calcolaOreTurno, isOrarioValido, statoTimbratura } from '@/lib/utils/turni'
```

- [ ] **Step 2: Esegui i test per vedere il fallimento**

Comando: `npm test -- tests/unit/turni.test.ts`

Atteso: fallimento con errore di import (`statoTimbratura is not exported from '@/lib/utils/turni'`) o errore TS.

- [ ] **Step 3: Implementa la funzione**

Aggiungi in fondo a `lib/utils/turni.ts`:

```ts
export type StatoTimbratura = 'non_iniziato' | 'in_corso' | 'completato'

export function statoTimbratura(t: {
  ora_ingresso_effettiva: string | null
  ora_uscita_effettiva: string | null
}): StatoTimbratura {
  if (t.ora_ingresso_effettiva && t.ora_uscita_effettiva) return 'completato'
  if (t.ora_ingresso_effettiva) return 'in_corso'
  return 'non_iniziato'
}
```

- [ ] **Step 4: Esegui i test per confermare il pass**

Comando: `npm test -- tests/unit/turni.test.ts`

Atteso: tutti i test verdi (i 3 originali + i 4 nuovi).

- [ ] **Step 5: Commit**

```bash
git add lib/utils/turni.ts tests/unit/turni.test.ts
git commit -m "feat(timbrature): helper statoTimbratura con test"
```

---

### Task 2: Componente `PallinoTimbratura`

**Files:**
- Create: `components/ui/PallinoTimbratura.tsx`

- [ ] **Step 1: Crea il componente**

Scrivi il file `components/ui/PallinoTimbratura.tsx`:

```tsx
import { StatoTimbratura } from '@/lib/utils/turni'

interface Props {
  stato: StatoTimbratura
  oraIngresso?: string | null
  oraUscita?: string | null
  size?: 'sm' | 'md'
  className?: string
}

function formatOra(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function buildTitle(stato: StatoTimbratura, oraIngresso?: string | null, oraUscita?: string | null): string | undefined {
  if (!oraIngresso) return undefined
  const ing = formatOra(oraIngresso)
  if (stato === 'completato' && oraUscita) {
    return `Ingresso ${ing} · Uscita ${formatOra(oraUscita)}`
  }
  if (stato === 'in_corso') {
    return `Ingresso ${ing} · in corso`
  }
  return undefined
}

export function PallinoTimbratura({ stato, oraIngresso, oraUscita, size = 'sm', className = '' }: Props) {
  if (stato === 'non_iniziato') return null

  const dim = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const colore = stato === 'completato' ? 'bg-emerald-500' : 'bg-amber-500'
  const label = stato === 'completato' ? 'Turno completato' : 'Turno in corso'
  const title = buildTitle(stato, oraIngresso, oraUscita)

  return (
    <span
      className={`inline-block rounded-full ring-2 ring-white ${dim} ${colore} ${className}`}
      aria-label={label}
      title={title}
    />
  )
}
```

Note di design:
- `ring-2 ring-white` dà un contorno bianco che stacca il pallino dal colore del badge sottostante (importante su desktop dove il badge è spesso colorato).
- `w-1.5 h-1.5` = 6px, `w-2 h-2` = 8px (Tailwind standard).
- Se `oraIngresso` non è passato (caso mobile), `title` è `undefined` → nessun tooltip, come da spec.

- [ ] **Step 2: Commit**

```bash
git add components/ui/PallinoTimbratura.tsx
git commit -m "feat(timbrature): componente PallinoTimbratura"
```

---

### Task 3: Integra pallino in `BadgeTurno` (desktop)

**Files:**
- Modify: `components/ui/Badge.tsx`
- Modify: `components/calendario/CellaCalendario.tsx`

- [ ] **Step 1: Estendi `BadgeTurno` con le nuove props e il pallino**

Sostituisci il contenuto di `components/ui/Badge.tsx` con:

```tsx
import { calcolaOreTurno, statoTimbratura } from '@/lib/utils/turni'
import { PallinoTimbratura } from './PallinoTimbratura'

interface BadgeProps {
  label: string
  oraInizio: string
  oraFine: string
  colore: string
  posto: string
  onClick?: () => void
  oraIngressoEffettiva?: string | null
  oraUscitaEffettiva?: string | null
}

export function BadgeTurno({
  label, oraInizio, oraFine, colore, posto, onClick,
  oraIngressoEffettiva, oraUscitaEffettiva,
}: BadgeProps) {
  const ore = calcolaOreTurno(oraInizio, oraFine)
  const isRiposo = ore === 0
  const stato = isRiposo ? 'non_iniziato' : statoTimbratura({
    ora_ingresso_effettiva: oraIngressoEffettiva ?? null,
    ora_uscita_effettiva: oraUscitaEffettiva ?? null,
  })
  return (
    <div
      onClick={onClick}
      className={`relative rounded px-1.5 py-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity select-none border ${isRiposo ? 'border-dashed text-gray-500 bg-gray-100 border-gray-300' : 'text-white border-transparent'}`}
      style={isRiposo ? undefined : { backgroundColor: colore }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className={`font-medium truncate ${isRiposo ? 'text-gray-400' : ''}`}>{label}</span>
        {ore > 0 && <span className="opacity-90 flex-shrink-0">{ore % 1 === 0 ? ore : ore.toFixed(1)}h</span>}
      </div>
      {oraInizio !== oraFine && (
        <div className="opacity-90">{oraInizio.slice(0,5)}–{oraFine.slice(0,5)}</div>
      )}
      {posto && <div className="opacity-90 truncate">{posto}</div>}
      <PallinoTimbratura
        stato={stato}
        oraIngresso={oraIngressoEffettiva}
        oraUscita={oraUscitaEffettiva}
        size="sm"
        className="absolute -top-0.5 -right-0.5"
      />
    </div>
  )
}
```

Cambiamenti chiave:
- Nuove props `oraIngressoEffettiva` e `oraUscitaEffettiva` (opzionali, backwards-compatible)
- Aggiunto `relative` al className del wrapper per permettere l'`absolute` del pallino
- Il pallino si piazza in alto a destra, leggermente sporgente (`-top-0.5 -right-0.5`)
- Riposi non mostrano mai il pallino (forzato a `'non_iniziato'`)

- [ ] **Step 2: Inoltra i campi da `CellaCalendario`**

In `components/calendario/CellaCalendario.tsx`, modifica la mappatura dei turni (righe 18–28):

```tsx
{turni.map(t => (
  <BadgeTurno
    key={t.id}
    label={t.template?.nome ?? 'Custom'}
    oraInizio={t.ora_inizio}
    oraFine={t.ora_fine}
    colore={t.template?.colore ?? '#6b7280'}
    posto={t.posto?.nome ?? ''}
    onClick={readonly ? undefined : () => onEdit(t)}
    oraIngressoEffettiva={t.ora_ingresso_effettiva}
    oraUscitaEffettiva={t.ora_uscita_effettiva}
  />
))}
```

- [ ] **Step 3: Type check e lint**

Comando: `npm run lint && npx tsc --noEmit`

Atteso: nessun errore.

- [ ] **Step 4: Verifica in browser (desktop)**

Comando: `npm run dev`, apri `http://localhost:3000/admin/calendario`.

Con tre turni di oggi seedati (uno senza timbri, uno con solo `ora_ingresso_effettiva`, uno con entrambi):
- Turno senza timbri: badge invariato, nessun pallino
- Turno "in corso": pallino ambra top-right, hover → tooltip `Ingresso HH:MM · in corso`
- Turno "completato": pallino verde top-right, hover → tooltip `Ingresso HH:MM · Uscita HH:MM`

Verifica anche la vista per-posto: `http://localhost:3000/admin/calendario-posti` — stesso comportamento perché usa lo stesso `CellaCalendario`.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Badge.tsx components/calendario/CellaCalendario.tsx
git commit -m "feat(timbrature): pallino stato su BadgeTurno desktop"
```

---

### Task 4: Integra pallino in `GrigliaCalendarioMobile`

**Files:**
- Modify: `components/calendario/GrigliaCalendarioMobile.tsx`

- [ ] **Step 1: Aggiungi import e pallino accanto alla chip template**

In cima al file, aggiungi al blocco import (vicino alla riga 3):

```tsx
import { calcolaOreTurno, statoTimbratura } from '@/lib/utils/turni'
import { PallinoTimbratura } from '@/components/ui/PallinoTimbratura'
```

(`calcolaOreTurno` è già importato — mantieni la riga esistente, aggiungi solo `statoTimbratura` a quella import se preferisci un solo import.)

Nel `map` dei turni (righe 128–170), sostituisci il blocco della chip template con questa versione che aggiunge il pallino dopo la chip:

```tsx
<div className="flex items-center gap-1.5 mt-1 flex-wrap">
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      isRiposo ? 'bg-gray-100 text-gray-500 border border-dashed border-gray-300' : ''
    }`}
    style={isRiposo ? undefined : { backgroundColor: `${colore}22`, color: colore }}
  >
    {!isRiposo && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colore }} />}
    {t.template?.nome ?? 'Custom'}
  </span>
  {!isRiposo && (
    <PallinoTimbratura
      stato={statoTimbratura({
        ora_ingresso_effettiva: t.ora_ingresso_effettiva,
        ora_uscita_effettiva: t.ora_uscita_effettiva,
      })}
      size="md"
    />
  )}
  {ore > 0 && (
    <span className="text-[11px] text-gray-500">
      {t.ora_inizio.slice(0, 5)}–{t.ora_fine.slice(0, 5)} · {oreLabel(ore)}
    </span>
  )}
</div>
```

Nota: non passo `oraIngresso`/`oraUscita` al pallino mobile, come da spec (niente tooltip su mobile). Il `<PallinoTimbratura>` non renderizza nulla se lo stato è `non_iniziato`, quindi i turni senza timbri restano invariati visivamente.

- [ ] **Step 2: Type check e lint**

Comando: `npm run lint && npx tsc --noEmit`

Atteso: nessun errore.

- [ ] **Step 3: Verifica in browser (mobile)**

In DevTools, riduci viewport a 375px di larghezza (o usa device toolbar iPhone). Apri `http://localhost:3000/admin/calendario`.

Con gli stessi 3 turni di test:
- Turno senza timbri: chip colorata normale, nessun pallino, orari a destra
- Turno "in corso": chip colorata, pallino ambra 8px a destra della chip, poi orari
- Turno "completato": pallino verde
- Turno di riposo: chip tratteggiata, nessun pallino (anche se per qualche motivo ci fossero timbri spurii)

- [ ] **Step 4: Commit**

```bash
git add components/calendario/GrigliaCalendarioMobile.tsx
git commit -m "feat(timbrature): pallino stato su GrigliaCalendarioMobile"
```

---

### Task 5: Integra pallino in `GrigliaCalendarioPostiMobile`

**Files:**
- Modify: `components/calendario/GrigliaCalendarioPostiMobile.tsx`

- [ ] **Step 1: Aggiungi import**

Modifica la riga 5 (attualmente `import { calcolaOreTurno } from '@/lib/utils/turni'`) in:

```tsx
import { calcolaOreTurno, statoTimbratura } from '@/lib/utils/turni'
import { PallinoTimbratura } from '@/components/ui/PallinoTimbratura'
```

- [ ] **Step 2: Aggiungi il pallino accanto alla chip template**

Nel `map` dei turni per posto (righe 128–164), trova il blocco con `<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ...">` (riga ~147) e sostituisci il wrapper `<div className="flex items-center gap-1.5 mt-1 flex-wrap">` con:

```tsx
<div className="flex items-center gap-1.5 mt-1 flex-wrap">
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      isRiposo ? 'bg-gray-100 text-gray-500 border border-dashed border-gray-300' : ''
    }`}
    style={isRiposo ? undefined : { backgroundColor: `${colore}22`, color: colore }}
  >
    {!isRiposo && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colore }} />}
    {t.template?.nome ?? 'Custom'}
  </span>
  {!isRiposo && (
    <PallinoTimbratura
      stato={statoTimbratura({
        ora_ingresso_effettiva: t.ora_ingresso_effettiva,
        ora_uscita_effettiva: t.ora_uscita_effettiva,
      })}
      size="md"
    />
  )}
  {ore > 0 && (
    <span className="text-[11px] text-gray-500">
      {t.ora_inizio.slice(0, 5)}–{t.ora_fine.slice(0, 5)} · {oreLabel(ore)}
    </span>
  )}
</div>
```

- [ ] **Step 3: Type check e lint**

Comando: `npm run lint && npx tsc --noEmit`

Atteso: nessun errore.

- [ ] **Step 4: Verifica in browser (mobile, per-posto)**

Viewport mobile, apri `http://localhost:3000/admin/calendario-posti`. Verifica che i pallini appaiano sulle righe dei turni con timbri, raggruppati per posto.

- [ ] **Step 5: Commit**

```bash
git add components/calendario/GrigliaCalendarioPostiMobile.tsx
git commit -m "feat(timbrature): pallino stato su GrigliaCalendarioPostiMobile"
```

---

### Task 6: Verifica realtime e test end-to-end manuale

**Files:** nessuno modificato.

- [ ] **Step 1: Test Realtime**

Tieni aperto `http://localhost:3000/admin/calendario` in una finestra. In un'altra finestra (o tab in incognito) loggati come dipendente e apri `/dipendente/turni`. Fai click su "Inizia turno" su un turno di oggi.

Atteso: nella finestra admin, il pallino ambra appare sul turno del dipendente **senza refresh manuale**. Se non appare, verifica che la query calendario includa `ora_ingresso_effettiva` e `ora_uscita_effettiva` (vedi spec §6).

Poi fai "Termina turno" dal dipendente → il pallino admin passa da ambra a verde.

- [ ] **Step 2: Regression check — turno di riposo**

Crea (o seeda) un turno di riposo (orari uguali, es. 00:00–00:00) e verifica:
- Desktop: nessun pallino, badge tratteggiato invariato
- Mobile: nessun pallino, chip tratteggiata invariata

- [ ] **Step 3: Test suite completa**

Comandi:

```bash
npm test
npm run lint
npm run build
```

Atteso: tutti verdi. `npm run build` include il type-check di produzione.

- [ ] **Step 4: Commit finale di cleanup (se serve)**

Se le verifiche hanno richiesto micro-aggiustamenti (padding, colori), raccoglili in un commit di polish:

```bash
git commit -m "style(timbrature): polish pallino stato dopo verifica"
```

Se tutto è passato al primo colpo, nessun commit aggiuntivo serve — il plan è chiuso.

---

## Riepilogo commits attesi

1. `feat(timbrature): helper statoTimbratura con test`
2. `feat(timbrature): componente PallinoTimbratura`
3. `feat(timbrature): pallino stato su BadgeTurno desktop`
4. `feat(timbrature): pallino stato su GrigliaCalendarioMobile`
5. `feat(timbrature): pallino stato su GrigliaCalendarioPostiMobile`
6. *(opzionale)* `style(timbrature): polish pallino stato dopo verifica`

## Checklist di completamento

- [ ] Unit test `statoTimbratura` passa (4 casi)
- [ ] `npm run lint` pulito
- [ ] `npm run build` senza errori
- [ ] Desktop: pallino su `GrigliaCalendario` e `GrigliaCalendarioPosti`, tooltip su hover
- [ ] Mobile: pallino su `GrigliaCalendarioMobile` e `GrigliaCalendarioPostiMobile`, no tooltip
- [ ] Realtime: un check-in del dipendente aggiorna la vista admin senza refresh
- [ ] Turno di riposo: mai pallino
- [ ] `ModaleTurno` mostra ancora la sezione Timbrature invariata (nessuna regressione)
