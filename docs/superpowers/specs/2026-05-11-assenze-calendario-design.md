# Assenze nel Calendario — Design Spec

**Data:** 2026-05-11  
**Branch:** dev

---

## Obiettivo

Visualizzare ferie, permessi e malattie approvate direttamente nella griglia calendario admin e manager, così chi pianifica vede a colpo d'occhio chi è assente senza dover consultare la pagina Richieste separatamente.

## Comportamento

### Visualizzazione nella griglia

Quando un dipendente ha una richiesta approvata (tipo `ferie`, `permesso`, `malattia`) che copre un determinato giorno, la cella di quel giorno mostra un **blocco colorato** al posto del turno:

| Tipo | Sfondo | Testo |
|------|--------|-------|
| Ferie | `#dcfce7` | `#166534` — "Ferie" |
| Malattia | `#fef9c3` | `#854d0e` — "Malattia" |
| Permesso | `#ede9fe` | `#5b21b6` — "Permesso" |

- Nessuna emoji, solo testo.
- Se nello stesso giorno esiste anche un turno confermato, **l'assenza ha priorità visiva** — il turno non viene mostrato nella cella (rimane nel DB).

### Interazione — click sul blocco

Cliccando su un blocco assenza si apre un mini-modale read-only con:
- **Tipo** (Ferie / Permesso / Malattia)
- **Periodo** (data_inizio — data_fine della richiesta)
- **Nota** dalla richiesta originale (se presente, altrimenti nulla)

Nessuna azione modificabile dal modale.

### Viste aggiornate

- `app/admin/calendario/page.tsx`
- `app/manager/calendario/page.tsx`

Le viste "per posti" (`calendario-posti`) non sono aggiornate: mostrano il turno per posto, non per dipendente — le assenze sono irrilevanti in quel contesto.

---

## Architettura

### Nuova API

**`GET /api/richieste/calendario?data_inizio=YYYY-MM-DD&data_fine=YYYY-MM-DD`**

- Auth: admin o manager
- Filtra: `stato = 'approvata'`, `tipo IN ('ferie', 'permesso', 'malattia')`, tenant_id corrente
- Condizione data: `data_inizio <= data_fine_periodo AND data_fine >= data_inizio_periodo` (overlap)
- Restituisce array di oggetti:
```ts
{
  id: string
  dipendente_id: string
  tipo: 'ferie' | 'permesso' | 'malattia'
  data_inizio: string   // YYYY-MM-DD
  data_fine: string     // YYYY-MM-DD
  note: string | null
}[]
```

### Fetch nella pagina calendario

Le pagine calendario fanno già `Promise.all([utenti, template, turni, posti])`. Si aggiunge in parallelo la fetch delle assenze:

```ts
fetch(`/api/richieste/calendario?data_inizio=...&data_fine=...`)
```

Le assenze vengono messe in uno stato `assenze: AssenzaCalendario[]`.

### Logica di rendering nella griglia

Per ogni cella (dipendente × giorno):
1. Calcola se esiste un'assenza attiva: `assenze` dove `dipendente_id === dip.id && data_inizio <= giorno && data_fine >= giorno`
2. Se sì → render `<BloccoAssenza>` con tipo e onClick
3. Se no → render normale del turno (comportamento attuale)

### Componente `BloccoAssenza`

Nuovo componente in `components/calendario/BloccoAssenza.tsx`:

```tsx
interface BloccoAssenzaProps {
  tipo: 'ferie' | 'permesso' | 'malattia'
  onClick: () => void
}
```

Renderizza un div con colore corrispondente al tipo e il testo ("Ferie", "Permesso", "Malattia"). Al click chiama `onClick`.

### Modale dettaglio assenza

Stato locale nella pagina: `assenzaDettaglio: AssenzaCalendario | null`. Quando valorizzato, mostra un `<Modal>` con i dettagli read-only. Si chiude impostando lo stato a `null`.

### Realtime

Nessuna subscription realtime aggiuntiva. Le assenze cambiano raramente e solo quando admin/manager approva — chi approva ricarica la pagina naturalmente.

---

## File coinvolti

| File | Azione |
|------|--------|
| `app/api/richieste/calendario/route.ts` | Crea — nuova API GET |
| `components/calendario/BloccoAssenza.tsx` | Crea — componente blocco colorato |
| `app/admin/calendario/page.tsx` | Modifica — fetch assenze + stato + rendering |
| `app/manager/calendario/page.tsx` | Modifica — idem |

---

## Fuori scope

- Viste calendario-posti
- Editing delle richieste dal calendario
- Realtime aggiornamento assenze
- Vista dipendente (vede già i propri turni, non le assenze altrui)
