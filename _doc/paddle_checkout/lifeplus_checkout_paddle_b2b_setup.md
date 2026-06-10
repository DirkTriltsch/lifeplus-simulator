# Checkout B2B-only — Setup & Status

**Stand:** 2026-06-10 (Datei-Mtime); inhaltlicher Schreibstand 2026-06-02
**Status:** historisch / Entscheidungsdoku fuer den B2B-Pivot bis v6. Aktueller produktiver Stand ist v6.1 Gast-Checkout, dokumentiert in [`./checkout-billing-runbook-b2b-v6-1.md`](./checkout-billing-runbook-b2b-v6-1.md).
**Scope:** Iterationspfad und Entscheidungen v1-v6 fuer den Pro-Checkout als B2B-only mit voller Rechnungsadresse und serverseitig erstellter Paddle-Transaction.
**Aktiver Mockup (historisch):** v6 ([`./lifeplus_checkout_paddle_b2b_v6.html`](./lifeplus_checkout_paddle_b2b_v6.html)); v6.1-Stand siehe Runbook und produktiver Code.

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
| v6 | + Vollstaendige Adresse + Server-side Paddle-Transaction | abgeloest |
| **v6.1** | **+ Gast-Checkout: kein Magic-Link-Detour vor Kauf, Auto-Login nach Paddle-Verify** | **aktiv** |

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
- **v6.1 — Gast-Checkout**: Pricing-CTA geht **direkt** auf `/checkout/{plan}.html`,
  kein Magic-Link-Detour vor dem Kauf. `checkout-intent` akzeptiert anonyme
  POSTs; `checkout_intents.user_id` ist nullable. Nach Paddle-Bezahlung
  validiert `post-checkout` die Transaktion via Paddle-API (paranoid +
  korrekt), legt User + Session an und liefert eine `redirectUrl` zurueck —
  Client springt sofort in die App. Magic-Link wird parallel als Mail
  versendet (Cross-Device-Comfort), ist aber kein Pflicht-Schritt mehr.

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

### v6.1 (Gast-Checkout) — Aenderungen
- [x] `migrations/0009_checkout_intents_guest.sql` — user_id nullable
- [x] `functions/_lib/db.ts` — `CheckoutIntentRow.user_id`, `createCheckoutIntent` userId nullable + neue Helper `setCheckoutIntentUserId`
- [x] `functions/_lib/paddle.ts` — `paddleGetTransaction` fuer Post-Checkout-Verifizierung
- [x] `functions/api/billing/checkout-intent.ts` — Session optional, Gast-Checkout, kein `login_required` mehr
- [x] `functions/api/billing/post-checkout.ts` — komplett umgebaut:
  validiert Intent + Transaction-Match, ruft Paddle-API zur Status-Pruefung,
  legt User + Session an, liefert `redirectUrl`. Magic-Link wird parallel
  als Cross-Device-Mail verschickt.
- [x] `website-astro/src/shared/components/sections/PricingPageDefault.astro`
  — JS-CTA-Rewrite raus, Pro-Plan-Links bleiben direkt auf `/checkout/{plan}.html`
- [x] `website-astro/src/shared/scripts/checkoutInline.ts` —
  `handleCheckoutCompleted` redirected zu `redirectUrl`; `login_required`-Case raus

### v6.1 — Live-Preview-Fix (Bug 1+2)
- [x] `functions/_lib/paddle.ts` — `paddlePricePreview` Helper fuer
  serverseitigen `POST /pricing-preview`-Call. Plus erweitertes Error-Reporting:
  `PaddleApiError` traegt jetzt `path` + `rawBody`, `paddleRequest` loggt
  jeden Fehler mit `console.warn('paddle_request_failed', ...)`.
- [x] `functions/api/billing/preview-pricing.ts` (neu) — endpoint, ruft
  `paddlePricePreview` mit `priceId + countryCode + discountId`. Bei
  unbekanntem Discount: liefert Preview ohne Discount zurueck + spezifische
  Fehlermeldung.
- [x] `functions/api/billing/checkout-intent.ts` — bessere Paddle-Error-
  Anzeige: User sieht jetzt `${err.detail} (Paddle ${status} auf ${path})`,
  damit Debugging ohne Cloudflare-Logs moeglich ist.
- [x] `website-astro/src/shared/scripts/checkoutInline.ts` —
  `fetchPricingPreview` + `refreshPreviewFromServer` rufen den Endpoint bei
  Discount-Apply, Land-Wechsel und Page-Load. `renderPaddleTotals`
  rendert die Live-Werte links. VAT-Hinweis zeigt je nach Land den
  Reverse-Charge-Ausblick.

Limitation Live-Preview: Reverse-Charge ist im Pricing-Preview von Paddle
nicht abbildbar (kein inline business). Der echte Reverse-Charge-Effekt wird
erst im Step 2 nach Transaction-Create sichtbar. Frontend zeigt das ehrlich
als Hinweistext am VAT-Feld.

### Noch offen
- [ ] Migrations lokal anwenden (`wrangler d1 execute`) — 0007, 0008, 0009
- [ ] Sandbox-Test: alle Szenarien plus Gast-Checkout-Path
- [ ] Optional: kleines „Schon ein Konto? Einloggen"-Link unter Email-Feld
- [ ] Pricing-Page Refactor auf Netto-Preise + B2B-Hinweise
- [ ] Header/Footer-B2B-Hinweise ueber alle Brand-Pages
- [ ] AGB-B2B-Refactor (extern, Anwalt)
- [ ] Brand-Rollout (FitFlow360 / EqoFlow360)

## 4. Architektur — Datenfluss (v6.1 Gast-Checkout)

```
Pricing-CTA "6 Monate starten"
  └─ direkt nach /checkout/halfyear.html, kein Magic-Link-Detour

User auf Step 1 (kann eingeloggt oder Gast sein)
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

Client (Paddle iframe → checkout.completed)
  ├─ POST /api/billing/post-checkout {checkoutEmail, intentId, transactionId}
  ├─ Server validiert intent + Transaction-Match
  ├─ Paddle GET /transactions/{id} → status muss 'paid'/'completed'/'billed' sein
  ├─ upsertUserByEmail → User (neu oder bestehend)
  ├─ setCheckoutIntentUserId → Intent.user_id wird gesetzt (idempotent)
  ├─ createSessionForNewDevice + Set-Cookie
  ├─ Magic-Link-Mail parallel (Best-Effort, Cross-Device)
  └─ Response {ok, redirectUrl: '/app/?checkout=success'}
       └─ Client: window.location.href = redirectUrl  →  App ist offen

Webhook (subscription.created / transaction.paid, asynchron)
  ├─ resolveSubscriberIdentity → Intent gefunden via custom_data.intent_id
  ├─ TX-ID-Match-Check gegen intent.paddle_transaction_id
  ├─ User per intent.user_id ODER fallback upsertUserByEmail
  ├─ markCheckoutIntentConsumed
  ├─ maybeInsertConsentLogForSubscription:
  │   - liest b2b_confirmation_version, displayed_hints_hash, IP, UA aus Intent
  │   - persistiert ins consent_log mit b2b_confirmation = true
  └─ recomputeEntitlement → Pro freischalten
```

### Race-Conditions zwischen post-checkout und Webhook
- post-checkout legt User + Session sofort an (synchron).
- Webhook kommt asynchron, kann vor oder nach post-checkout eintreffen.
- Beide Pfade nutzen `upsertUserByEmail` → derselbe User wird gefunden.
- `setCheckoutIntentUserId` hat `WHERE user_id IS NULL` → idempotent.
- `markCheckoutIntentConsumed` nutzt `COALESCE(consumed_at, ?)` → idempotent.
- Folge: User sieht App sofort, Pro-Entitlement greift ein paar Sekunden
  spaeter (App muss `/api/me` pollen bis access_level === 'pro').

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

### Fachliche Eckpunkte
- B2B-only-Shop: Checkout bleibt explizit auf gewerbliche Nutzung ausgerichtet.
- Zielgruppe: Berater, Coaches und Business-Nutzer; kein Consumer-Shop.

## 10. Was als naechstes ansteht

1. **`wrangler d1 execute`** der Migrationen 0007 + 0008 (lokal und sandbox)
2. **PADDLE_API_KEY als Cloudflare-Secret** setzen (sandbox + live)
3. **Sandbox-Test** der 8 Szenarien aus Abschnitt 7
4. **Pricing-Page-Refactor** zu Netto + B2B-Hinweisen
5. **AGB zum Anwalt** geben
6. **Brand-Rollout** entscheiden
