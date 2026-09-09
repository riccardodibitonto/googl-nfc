# Review Cards Manager

Gestionale interno per clienti, acquisti e consegne di schede fisiche NFC/QR usate per raccogliere recensioni Google. L'app non programma né modifica le schede: conserva i dati operativi, genera i link Google Review e calcola inventario e marginalità.

## Funzionalità

- Dashboard con clienti, disponibilità, ricavi, profitto, valore inventario e cash flow.
- Anagrafiche clienti con Google Review URL copiabile.
- Registrazione di acquisti e vendite/consegne tramite form.
- Inventario calcolato dai movimenti, senza quantità modificabile manualmente.
- Costo medio, costo del venduto, profitto e cash flow.
- Storico centralizzato dei movimenti.
- Ricerca Google Places predisposta server-side, con fallback Place ID per sviluppo.
- UI responsive in italiano con validazione base e feedback delle operazioni.
- Accesso protetto con Supabase Auth email/password per l'amministratore.

I dati operativi non sono demo: la UI legge e scrive Supabase tramite Route Handler server-side. Se Supabase non è configurato, l'app mostra l'errore di configurazione invece di sostituire i dati con dati fittizi.

## Tech stack

Next.js (App Router), TypeScript, React, Tailwind CSS v4, Lucide React, Supabase/PostgreSQL (predisposti), Google Places API.

## Struttura

```text
app/
login/page.tsx       # accesso amministratore, senza registrazione
  api/places/search/route.ts # ricerca Google server-side
  globals.css       # design system e layout responsive
  layout.tsx        # metadata e shell HTML
  page.tsx          # dashboard, viste operative e form demo
supabase/
  migrations/001_initial.sql # schema PostgreSQL e RLS
  migrations/002_hardening.sql # sicurezza e transazioni
public/
.env.example
README.md
```

## Modello dati consigliato

La migration `supabase/migrations/001_initial.sql` crea `clients`, `purchases`, `sales` e `inventory_movements`, con UUID e `created_at`/`updated_at` dove applicabile. `sales.client_id` punta a `clients.id`; ogni acquisto e vendita crea un movimento `PURCHASE` o `SALE`. Le funzioni PostgreSQL `create_purchase`, `create_sale`, `delete_purchase` e `delete_sale` mantengono le operazioni atomiche.

Se il progetto Supabase è già stato inizializzato con `001_initial.sql`, applicare anche `supabase/migrations/002_hardening.sql`. Questa migration aggiorna solo i corpi delle funzioni e i privilegi: non ricrea tabelle e non elimina dati.

La quantità non va salvata come saldo editabile: `disponibili = SUM(purchases.quantity) - SUM(sales.quantity)`. Gli importi monetari in PostgreSQL devono usare `numeric(12,2)`, mai floating point. Abilitare RLS e policy per l'utente autenticato prima di usare dati reali.

Colonne principali:

- `clients`: `id`, `name`, `country`, `address`, `google_place_id`, `google_review_url`, `notes`, timestamps.
- `purchases`: `id`, `purchase_date`, `quantity`, `total_cost`, `order_reference`, `notes`, timestamps.
- `sales`: `id`, `client_id`, `sale_date`, `quantity`, `total_revenue`, `notes`, timestamps.
- `inventory_movements`: `id`, `movement_type`, `quantity`, `amount`, `purchase_id`, `sale_id`, `client_id`, `created_at`.

Relazioni:

```text
clients
│
└── sales
    │
    └── inventory_movements

purchases
│
└── inventory_movements
```

I movimenti `PURCHASE` hanno quantità positiva; i movimenti `SALE` hanno quantità negativa. Sono presenti indici sulle foreign key, sulle date e sul nome cliente, oltre a un vincolo unico che impedisce più di un movimento per la stessa operazione.

## Logica finanziaria

- Ricavi: somma dei totali delle vendite.
- Costo cash flow: somma degli acquisti pagati.
- Costo medio: costi acquisti / schede acquistate.
- Costo del venduto: schede vendute * costo medio.
- Profitto: ricavi - costo del venduto.
- Cash flow: ricavi - acquisti.
- Valore inventario: schede disponibili * costo medio.

Esempio: 300 schede acquistate per €520 e 30 vendute per €240. Il costo medio è €1,73, il costo del venduto circa €52, il profitto circa €188, il cash flow -€280 e il valore residuo circa €468.

## Google Places API

La Route Handler `/api/places/search` usa il campo `place_id` della risposta Text Search API legacy di Google Places, che è il Place ID documentato per il formato `https://search.google.com/local/writereview?placeid=PLACE_ID`. Il valore viene selezionato dall'utente e salvato insieme a `google_review_url`. La chiave resta server-side. Senza chiave non vengono inventati risultati: è possibile solo inserire esplicitamente un Place ID reale come fallback di sviluppo.

Per usare la ricerca reale è necessario abilitare **Places API** e **Billing** nel progetto Google Cloud associato alla chiave. Senza fatturazione Google restituisce `REQUEST_DENIED` e l'app mostra un messaggio esplicito.

## Variabili d'ambiente

| Variabile | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL base del progetto Supabase, senza `/rest/v1` (es. `https://project.supabase.co`; il client normalizza comunque il vecchio formato) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave pubblica Supabase per il client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Nome alternativo della chiave pubblica usato da alcune integrazioni Supabase/Vercel |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Altro nome pubblico usato da alcune integrazioni Vercel |
| `SUPABASE_PUBLISHABLE_KEY` | Nome alternativo server-side della chiave pubblica |
| `SUPABASE_SECRET_KEY` | Nome moderno della chiave privata/service role usato da alcune integrazioni Supabase/Vercel |
| `SUPABASE_URL` | Nome alternativo dell'URL usato da alcune integrazioni Vercel (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave privata server-side, mai nel browser |
| `GOOGLE_PLACES_API_KEY` | Chiave privata Google Places, mai nel browser |

## Installazione e sviluppo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Aprire `http://localhost:3000`. Configurare Supabase e applicare la migration con la CLI Supabase prima di usare l'app: i dati vengono caricati dal database a ogni apertura/refresh.

### Setup Supabase

1. Creare un progetto vuoto su Supabase.
2. Aprire **SQL Editor**, creare una nuova query e incollare tutto il contenuto di [`supabase/migrations/001_initial.sql`](./supabase/migrations/001_initial.sql).
3. Eseguire la query.
4. Copiare URL e service-role key in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` deve essere l'URL base del progetto, senza `/rest/v1`, insieme a `SUPABASE_SERVICE_ROLE_KEY`).
5. Avviare `npm run dev`.

La migration non inserisce dati demo. Un eventuale seed deve essere eseguito separatamente e intenzionalmente; al momento il progetto non ne richiede uno.

### Autenticazione amministratore

L'accesso usa Supabase Auth con email e password. Non esiste una pagina di
registrazione: crea manualmente l'unico utente da **Authentication → Users →
Add user** nel progetto Supabase, quindi disabilita **Allow new users to sign
up** nelle impostazioni Auth. La dashboard e tutte le API operative richiedono
una sessione valida; gli utenti anonimi vengono reindirizzati a `/login` o
ricevono `401` sulle API.

La sessione viene gestita con cookie HttpOnly/secure tramite `@supabase/ssr`.
La `SUPABASE_SERVICE_ROLE_KEY` resta usata solo nei Route Handler server-side
per le transazioni esistenti; non viene mai inviata al browser. Il proxy
Next.js aggiorna la sessione e svolge il controllo preliminare, mentre le
operazioni dati continuano a essere autorizzate server-side.

Le funzioni PostgreSQL rendono atomiche le scritture: acquisto/vendita e relativo movimento vengono creati nella stessa transazione. Una vendita viene rifiutata se supera l'inventario, con `pg_advisory_xact_lock` acquisito prima del controllo per evitare overselling concorrente. L'eliminazione di una vendita elimina prima il movimento; l'eliminazione di un acquisto viene rifiutata se renderebbe il saldo negativo; un cliente con vendite associate è protetto da `ON DELETE RESTRICT`.

Le funzioni usano `SECURITY DEFINER` perché gli endpoint server-side devono poter eseguire transazioni atomiche non eseguibili con semplici insert client-side. Il `search_path` è fissato a `public`, i riferimenti sono qualificati, e `EXECUTE` è revocato a `public`, `anon` e `authenticated`: resta concesso solo a `service_role`. RLS rimane attivo su tutte le tabelle; la service-role key viene usata esclusivamente nel server e bypassa RLS secondo il modello Supabase.

## Deploy

Il progetto è compatibile con Vercel:

1. Importare il repository.
2. In **Project Settings → Environment Variables**, verificare che l'integrazione
   abbia creato URL e chiave pubblica. Il codice supporta sia
   `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, sia i nomi
   alternativi `SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` usati da
   alcune integrazioni. L'URL deve essere `https://<project>.supabase.co`, senza
   `/rest/v1`. Configurare inoltre `SUPABASE_SERVICE_ROLE_KEY` e
   `GOOGLE_PLACES_API_KEY` almeno per **Production** (e **Preview** se serve).
3. Aggiungere `SUPABASE_SERVICE_ROLE_KEY` e `GOOGLE_PLACES_API_KEY` solo come
   variabili server-side, mai nel codice client.
4. Eseguire un nuovo deployment dopo aver salvato le variabili: Vercel non
   aggiorna i deployment già creati automaticamente.
5. In Supabase, in **Authentication → URL Configuration**, impostare la
   **Site URL** sull'URL Vercel pubblico e aggiungerlo agli **Additional
   Redirect URLs** (incluso l'eventuale dominio preview usato per i test).

## Stato e regole importanti

Dashboard, persistenza Supabase, movimenti atomici, limite inventario e cancellazioni con conferma sono implementati. L'autenticazione Supabase va configurata prima di un deploy multiutente.

1. L'inventario deriva esclusivamente da acquisti e vendite.
2. Una vendita non può superare le schede disponibili.
3. Un Place ID proviene da Google Places o dall'esplicito fallback di sviluppo.
4. Le API key restano server-side e non vengono committate.
5. Gli importi sono `numeric`/centesimi, mai floating point.
6. Ogni acquisto e vendita produce il relativo movimento.
7. Un cliente con vendite associate non viene cancellato: prima vanno eliminate le vendite.
8. Eliminare una vendita rimuove il movimento collegato; eliminare un acquisto viene bloccato se renderebbe l'inventario negativo.

I valori finanziari non sono colonne aggregate: ricavi e costi sono somme di `sales.total_revenue` e `purchases.total_cost`; costo medio, costo del venduto, profitto, cash flow e valore inventario sono calcolati dalla UI a partire dai dati persistiti.
