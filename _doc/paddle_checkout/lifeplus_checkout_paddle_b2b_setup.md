# Checkout B2B-only — Setup & Status

**Stand:** 2026-06-02 (v6 implementiert, sandbox-test offen)
**Aktiver Mockup:** v6 ([`./lifeplus_checkout_paddle_b2b_v6.html`](./lifeplus_checkout_paddle_b2b_v6.html))
**Scope:** Pro-Checkout als B2B-only mit voller Rechnungsadresse und
serverseitig erstellter Paddle-Transaction.

---

## 1. Ausgangsproblem

Aktueller Checkout zeigt im Paddle-Iframe winzige Links zu Rabattcode und
USt-IdNr. Der Kunde sieht links den falschen Betrag. Verwirrend und nicht
B2B-tauglich. Plus rechtlicher Pivot: B2B-only positionierung mit Pflicht-
Bestaetigung + sauberes Audit-Logging.

## 2. Iterations-Pfad

| Mockup | Aenderung | Status |
|---|---|---|
| v1 | Modus-Toggle rechts | verworfen |
| v2 | Sketch-treu mit USt-IdNr-Feld | verworfen |
| v3 | B2B-only-Pivot (kein USt-IdNr, kein Toggle) | abgeloest |
| v4 | + Firmenname + USt-IdNr fuer Reverse-Charge | abgeloest |
| v5 | + Land-Dropdown + Wizard + Step-2-Lock | abgeloest |
| **v6** | **+ Vollstaendige Adresse + Server-side Paddle-Transaction** | **aktiv & implementiert** |

### Schluessel-Entscheidungen
- **B2B-only-Shop**, soft-Approach "informieren, nicht ausschliessen".
- **Vollstaendige Rechnungsadresse**: Email, Firma, Strasse, PLZ, Ort, Land
  (Pflicht). USt-IdNr optional fuer Reverse-Charge.
- **USt-IdNr-Feld rechts** (im Rechnungsempfaenger-Block). Links nur
  Rabattcode.
- **Server-side Paddle-Transaction**: Backend ruft Paddle-API auf, erstellt
  Customer + Address + Business + Transaction, gibt `transactionId` an
  Client. Client oeffnet `Paddle.Checkout.open({ transactionId })`.
- **Echter Wizard mit Step-2-Lock**.

## 3. Implementierungs-Status

### Backend
- [x] Migration `0007_checkout_intents_b2b.sql` — company_name, street,
  postal_code, city, country_code, discount_code, vat_id,
  b2b_confirmation_version, displayed_hints_hash, ip_address, user_agent,
  paddle_transaction_id
- [x] Migration `0008_consent_log_b2b.sql` — b2b_confirmation,
  b2b_confirmation_version, displayed_hints_hash
- [x] [`functions/_lib/db.ts`](../../functions/_lib/db.ts) erweitert
  (`CheckoutIntentRow`, `createCheckoutIntent`, `setCheckoutIntentPaddleTransaction`,
  `ConsentLogParams`, `insertConsentLog` mit B2B-Feldern)
- [x] [`functions/_lib/paddle.ts`](../../functions/_lib/paddle.ts) NEU
  — Paddle Billing API Helper (customer, address, business, discount,
  transaction, plus Orchestrator `paddleCreateB2BTransaction`)
- [x] [`functions/api/billing/checkout-intent.ts`](../../functions/api/billing/checkout-intent.ts)
  umgebaut auf v6 — validiert alle Felder, erstellt Paddle-Transaction,
  gibt `transactionId` zurueck; mapped Paddle-Errors auf
  `errorField`/`errorDetail` fuer das UI
- [x] [`functions/api/paddle/webhook.ts`](../../functions/api/paddle/webhook.ts)
  liest B2B-Bestaetigung + IP + User-Agent jetzt aus dem Intent und
  schreibt sie ins consent_log; wenn Intent fehlt oder b2b_confirmation
  fehlt, wird der Log uebersprungen (mit Warning)

### Frontend
- [x] [`B2BHeaderBanner.astro`](../../website-astro/src/shared/components/checkout/B2BHeaderBanner.astro)
- [x] [`CheckoutPage.astro`](../../website-astro/src/shared/components/sections/CheckoutPage.astro)
  auf v6-DOM umgebaut (Strasse + PLZ + Ort + USt-IdNr rechts;
  Rabattcode-only links)
- [x] [`checkoutInline.ts`](../../website-astro/src/shared/scripts/checkoutInline.ts)
  vereinfacht — kein TransactionPreview, kein eigenes Reverse-Charge,
  keine updateCheckout. Sammelt Formdaten, POSTet an checkout-intent,
  empfaengt `transactionId`, oeffnet `Paddle.Checkout.open({ transactionId })`.
  Bei Paddle-Fehlern: Banner mit Detail + Fokus auf das richtige Feld.

### Noch offen
- [ ] Migrations lokal anwenden (`wrangler d1 execute`)
- [ ] PADDLE_API_KEY als Cloudflare-Secret setzen (Permission
  `transactions:write`, `customers:write`, `discounts:read`)
- [ ] Sandbox-Test: 5 Szenarien (siehe Abschnitt 7)
- [ ] Pricing-Page Refactor auf Netto-Preise + B2B-Hinweise
- [ ] Header/Footer-B2B-Hinweise ueber alle Brand-Pages
- [ ] AGB-B2B-Refactor (extern, Anwalt)
- [ ] Brand-Rollout (FitFlow360 / EqoFlow360)

## 4. Architektur — Datenfluss

```
User auf Step 1
  ├─ Email/Firma/Strasse/PLZ/Ort/Land/(VAT) eingeben
  ├─ Rabattcode "Anwenden" → speichern (Format-Check), keine Server-Call
  ├─ USt-IdNr input → Format-Check, speichern
  └─ "Weiter zur Zahlung":
      POST /api/billing/checkout-intent {
        plan, checkoutEmail, companyName, street, postalCode, city,
        countryCode, discountCode?, vatId?,
        b2bConfirmation: { checked, version, displayedHintsHash }
      }
      │
      ├─ Server validiert alle Felder
      ├─ Server schreibt Intent in DB (mit IP, UA, B2B-Audit)
      ├─ Server ruft Paddle-API:
      │   1. paddleFindOrCreateCustomer(email, name) → customer_id
      │   2. paddleCreateCustomerAddress(customer_id, address) → address_id
      │   3. paddleCreateCustomerBusiness(customer_id, name, vatId) → business_id
      │   4. paddleFindDiscountByCode(code) → discount_id
      │   5. paddleCreateTransaction({...}) → transaction_id
      ├─ Server speichert transaction_id auf dem Intent
      └─ Response: { action: 'start_checkout', transactionId, intentId, ... }
                   ODER bei Fehler:
                   { action: 'paddle_error', errorCode, errorDetail, errorField }

Client (Step 2)
  ├─ Linke Spalte: Step-2-Lock-State
  ├─ Konto-readonly: Email, Firma, Anschrift, ggf. USt-IdNr
  ├─ Paddle.Checkout.open({ transactionId: 'txn_...' })
  └─ User zahlt im Iframe

Webhook (checkout.completed)
  ├─ resolveSubscriberIdentity → Intent gefunden via custom_data.intent_id
  ├─ markCheckoutIntentConsumed
  ├─ maybeInsertConsentLogForSubscription:
  │   - liest b2b_confirmation_version, displayed_hints_hash, IP, UA aus Intent
  │   - persistiert ins consent_log mit b2b_confirmation = true
  └─ recomputeEntitlement → Pro freischalten
```

## 5. Paddle-API — Details

**Base-URL** (aus `env.PADDLE_ENV`):
- sandbox: `https://sandbox-api.paddle.com`
- live: `https://api.paddle.com`

**Auth**: `Authorization: Bearer ${env.PADDLE_API_KEY}` + `Paddle-Version: 1`

**Permissions** fuer den Key:
- `customers:read` + `customers:write`
- `customers:write:addresses` + `customers:write:businesses`
- `discounts:read`
- `transactions:write`

**Fehler-Mapping** ([`checkout-intent.ts`](../../functions/api/billing/checkout-intent.ts)
`mapPaddleErrorToField`):
- Paddle `discount_not_found` → `errorField: 'discount'`
- Paddle field `tax_identifier` → `errorField: 'vat'`
- Paddle field `postal_code` → `errorField: 'postalCode'`
- Paddle field `country_code` → `errorField: 'country'`
- Paddle field `first_line`/`street` → `errorField: 'street'`
- Paddle field `city` → `errorField: 'city'`
- Paddle field `email` → `errorField: 'email'`

Client fokussiert dann auf das mapping-Input (siehe `FIELD_TO_INPUT_ID` in
[`checkoutInline.ts`](../../website-astro/src/shared/scripts/checkoutInline.ts)).

## 6. Bestaetigte Wording-Vorschlaege

### B2B-Bestaetigungs-Checkbox (Pflicht-Gating)
> Ich bestaetige, dass ich diesen Vertrag in Ausuebung meiner gewerblichen
> oder selbststaendigen beruflichen Taetigkeit (§14 BGB) abschliesse und
> nicht als Verbraucher. Mir ist bewusst, dass hierdurch kein Widerrufsrecht
> nach §312g BGB besteht.

Hilfstext darunter (italic):
> {brand.siteName} ist ein Angebot ausschliesslich fuer gewerbliche und
> selbststaendige Nutzer.

### B2B-Header-Banner
> **B2B-Angebot:** {brand.siteName} richtet sich ausschliesslich an
> Unternehmer und Selbststaendige im Sinne §14 BGB.

### Versions-Strings (in CheckoutPage.astro)
```ts
const b2bConfirmationVersion = 'b2b-v2026-06-02';
const displayedHintsHash     = 'hints-v2026-06-02';
```
Beide bumpen, wenn der angezeigte Text oder die Pflicht-Hinweise sich aendern.

## 7. Sandbox-Test-Szenarien

1. **DE ohne VAT**, kein Discount → DE-USt 19%, Brutto-Zahlung
2. **DE ohne VAT**, DAO20 (-20%) → DE-USt auf reduziertem Netto
3. **DE mit VAT** (`DE...`), kein Discount → DE-USt 19% (kein Reverse-Charge,
   Inland)
4. **AT mit gueltiger VAT** (`AT...`), kein Discount → Reverse-Charge, 0% USt
5. **AT mit ungueltiger VAT** (z.B. `AT999999999`) → Paddle gibt Error,
   Client zeigt `errorField: 'vat'`
6. **DE mit unbekanntem Discount-Code** → Paddle `discount_not_found`,
   Client zeigt `errorField: 'discount'`
7. **CH ohne VAT** → CH-MwSt 8,1% (Paddle handhabt)
8. **Daten aendern**: Step 2 → Step 1, alte Transaction wird verworfen,
   beim naechsten Submit entsteht eine neue

## 8. Legal-Findings (Vorbedingungen Live)

Siehe [`./lifeplus_checkout_legal_review_B2B_only.md`](./lifeplus_checkout_legal_review_B2B_only.md):

1. **Anwaltliche Freigabe AGB-B2B-Version** — zwingend
2. **Anwaltliche Pruefung Checkbox-Wording** — empfohlen
3. **Logging-Schema implementiert** — ✅ erledigt (Migration 0007 + 0008,
   webhook persistiert)
4. **Konsistente B2B-Auszeichnung** ueber alle Seiten — Header-Banner im
   Checkout fertig, Pricing/Footer noch offen

## 9. Relevante Bestandsdateien

### Backend
- [`migrations/0007_checkout_intents_b2b.sql`](../../migrations/0007_checkout_intents_b2b.sql)
- [`migrations/0008_consent_log_b2b.sql`](../../migrations/0008_consent_log_b2b.sql)
- [`functions/_lib/db.ts`](../../functions/_lib/db.ts)
- [`functions/_lib/paddle.ts`](../../functions/_lib/paddle.ts)
- [`functions/api/billing/checkout-intent.ts`](../../functions/api/billing/checkout-intent.ts)
- [`functions/api/paddle/webhook.ts`](../../functions/api/paddle/webhook.ts)

### Frontend
- [`website-astro/src/shared/components/checkout/B2BHeaderBanner.astro`](../../website-astro/src/shared/components/checkout/B2BHeaderBanner.astro)
- [`website-astro/src/shared/components/sections/CheckoutPage.astro`](../../website-astro/src/shared/components/sections/CheckoutPage.astro)
- [`website-astro/src/shared/scripts/checkoutInline.ts`](../../website-astro/src/shared/scripts/checkoutInline.ts)

### Mockups
- v1–v5: abgeloest (siehe Iterations-Pfad)
- **v6 (aktiv)**: [`./lifeplus_checkout_paddle_b2b_v6.html`](./lifeplus_checkout_paddle_b2b_v6.html)

### Memory
- [[project-b2b-only-shop]] — Architektur (auf v6 aktualisiert)
- [[project-target-audience-b2b]] — Zielgruppen-Kontext

## 10. Was als naechstes ansteht

1. **`wrangler d1 execute`** der Migrationen 0007 + 0008 (lokal und sandbox)
2. **PADDLE_API_KEY als Cloudflare-Secret** setzen (sandbox + live)
3. **Sandbox-Test** der 8 Szenarien aus Abschnitt 7
4. **Pricing-Page-Refactor** zu Netto + B2B-Hinweisen
5. **AGB zum Anwalt** geben
6. **Brand-Rollout** entscheiden
