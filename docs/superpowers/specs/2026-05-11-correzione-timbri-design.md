# Correzione Manuale Timbri — Design Spec

**Data:** 2026-05-11  
**Branch:** dev

---

## Obiettivo

Permettere ad admin e manager di correggere manualmente `ora_ingresso_effettiva` e `ora_uscita_effettiva` di un turno dal `ModaleTurno`, per i casi in cui il dipendente dimentica di timbrare o timbra in modo errato.

## Comportamento

### Dove appare

Nel `ModaleTurno`, nella sezione "Timbrature effettive" (già esistente, read-only), appare un pulsante **"Correggi timbri"**.

Condizioni di visibilità:
- Il turno deve esistere già nel DB (non è un turno nuovo)
- L'utente è admin o manager (non dipendente)
- Il pulsante è sempre visibile indipendentemente dallo stato del turno (passato, corrente, futuro)

### Interazione

1. L'admin clicca "Correggi timbri"
2. Si espande una sezione inline sotto le timbrature read-only con:
   - Campo **Ingresso** (tipo `time`, precompilato con l'ora attuale se presente, altrimenti vuoto)
   - Campo **Uscita** (tipo `time`, precompilato se presente, altrimenti vuoto)
   - Pulsante **"Salva"** e pulsante **"Annulla"** (ripiega la sezione)
3. Al click su Salva: PATCH a `/api/turni/[id]/timbri`
4. Il modale aggiorna i timbri mostrati immediatamente (ottimistic update o refetch)
5. I campi possono essere lasciati vuoti (azzera il timbro)

### Formato dati

I timbri vengono salvati come timestamp ISO usando la data del turno:
- `ora_ingresso_effettiva`: `YYYY-MM-DDThh:mm:00+00:00` (o null se vuoto)
- `ora_uscita_effettiva`: `YYYY-MM-DDThh:mm:00+00:00` (o null se vuoto)

---

## Architettura

### Nuova API

**`PATCH /api/turni/[id]/timbri`**

- Auth: admin o manager (non dipendente)
- Body:
```ts
{
  ora_ingresso_effettiva: string | null  // "HH:mm" oppure null
  ora_uscita_effettiva: string | null    // "HH:mm" oppure null
}
```
- Legge la `data` del turno dal DB per costruire il timestamp ISO completo
- Aggiorna le colonne `ora_ingresso_effettiva` e `ora_uscita_effettiva` via admin client
- Restituisce `{ ok: true }`

### Modifiche al ModaleTurno

Il `ModaleTurno` riceve già il turno con `ora_ingresso_effettiva` e `ora_uscita_effettiva`. Si aggiungono:

- Stato locale `correzioneAperta: boolean`
- Stato locale `ingressoCorretto: string` e `uscitaCorretto: string`
- Callback `onTimbriSalvati` (opzionale) per notificare la pagina padre di aggiornare i dati

Nessuna modifica all'interfaccia `ModaleTurnoProps` obbligatoria — la callback è opzionale e il pulsante appare solo se `turno` è presente e l'utente non è dipendente. La distinzione admin/manager vs dipendente viene gestita tramite la prop esistente o una nuova prop `ruolo: 'admin' | 'manager' | 'dipendente'`.

---

## File coinvolti

| File | Azione |
|------|--------|
| `app/api/turni/[id]/timbri/route.ts` | Crea — PATCH endpoint |
| `components/calendario/ModaleTurno.tsx` | Modifica — pulsante + sezione correzione inline |
| `app/admin/calendario/page.tsx` | Modifica — passa callback onTimbriSalvati per aggiornare stato |
| `app/manager/calendario/page.tsx` | Modifica — idem |

---

## Fuori scope

- Log delle correzioni (audit trail)
- Correzione dalla vista dipendente
- Validazione che ingresso < uscita (errore soft, non blocca il salvataggio)
