# Dipendente Custom (Emergenza) — Design Spec

**Data:** 2026-05-16  
**Stato:** Approvato

## Problema

Il sistema assegna i turni solo a profili registrati in `profiles` (che richiedono un account `auth.users`). Non è possibile inserire un turno per una persona esterna occasionale (interinale, sostituto di emergenza) che non ha e probabilmente non avrà mai un account nel sistema.

## Soluzione

Approccio scelto: **tabella dedicata `dipendenti_custom`**, con colonna aggiuntiva `dipendente_custom_id` su `turni`. Un turno avrà esattamente uno tra `dipendente_id` (profilo reale) e `dipendente_custom_id` (persona esterna), garantito da un CHECK constraint.

---

## Database

### Nuova tabella `dipendenti_custom`

```sql
CREATE TABLE dipendenti_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  nome text NOT NULL,
  cognome text NOT NULL,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

RLS:
- `admin` e `manager`: SELECT, INSERT sul proprio tenant
- `dipendente`: nessun accesso

### Modifica tabella `turni`

```sql
ALTER TABLE turni
  ADD COLUMN dipendente_custom_id uuid REFERENCES dipendenti_custom(id),
  ADD CONSTRAINT check_dipendente_xor
    CHECK (
      (dipendente_id IS NOT NULL AND dipendente_custom_id IS NULL) OR
      (dipendente_id IS NULL AND dipendente_custom_id IS NOT NULL)
    );
```

Il constraint garantisce mutua esclusività: ogni turno ha esattamente un dipendente.

---

## API

### `POST /api/turni` (estensione)

- Accetta `dipendente_custom_id` in alternativa a `dipendente_id`
- Validazione server-side: esattamente uno dei due deve essere presente
- Controllo sovrapposizione: funziona già per entrambi i casi (filtra per il campo valorizzato)
- Notifiche email: saltate se `dipendente_custom_id` è valorizzato (nessun account, nessuna email)

### `GET /api/dipendenti-custom`

Restituisce la lista dei dipendenti custom attivi del tenant corrente, ordinati per cognome.

```json
[{ "id": "uuid", "nome": "Mario", "cognome": "Rossi" }]
```

### `POST /api/dipendenti-custom`

Crea un nuovo dipendente custom.

**Body:** `{ "nome": "string", "cognome": "string" }`  
**Response:** `{ "id": "uuid", "nome": "...", "cognome": "..." }`

Nessun endpoint di modifica/cancellazione nella prima versione (YAGNI).

---

## Frontend

### `ModaleTurno.tsx`

Aggiungere un toggle nel selettore dipendente con due modalità:

**Modalità "Dipendente reale"** (default):  
Dropdown esistente, nessuna modifica.

**Modalità "Custom / Emergenza"**:  
- Combobox con autocomplete sui `dipendenti_custom` già salvati
- Pulsante "Aggiungi nuovo" che mostra due campi inline (nome + cognome)
- Al salvataggio: se è nuovo, prima `POST /api/dipendenti-custom`, poi usa l'id restituito per il turno
- I custom salvati vengono mostrati con un badge visivo "Esterno" nel calendario admin

### Export

Ovunque si risolve il nome del dipendente per la stampa:

```ts
const nomeDipendente = turno.dipendente_id
  ? `${turno.profiles.nome} ${turno.profiles.cognome}`
  : `${turno.dipendenti_custom.nome} ${turno.dipendenti_custom.cognome}`
```

Tutte le query di export che fanno JOIN su `profiles` devono aggiungere un LEFT JOIN su `dipendenti_custom`.

---

## Scope escluso (prima versione)

- Modifica/cancellazione di un dipendente custom
- Storico turni per dipendente custom
- Filtraggio calendario per dipendente custom
- Notifiche per dipendenti custom
