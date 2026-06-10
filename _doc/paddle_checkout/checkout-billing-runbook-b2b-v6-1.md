# Checkout/Billing Runbook - B2B-v6.1 Gast-Checkout

**Stand:** 2026-06-09
**Status:** fuehrendes Checkout-/Billing-Runbook fuer den aktuellen Code
**Scope:** B2B-v6.1 Gast-Checkout fuer LifePlus/LifeFlow360; FitLine/Eqology analog, sobald eigene Paddle-/API-Werte gesetzt sind.
**Ersetzt als Arbeitsstand:** `Umsetzungsplan.md` (am 2026-06-10 geloescht) und die alten Codex/Claude-Checkout-Dokumente.
**Nicht ersetzt:** `lifeplus_checkout_paddle_b2b_v2.html` und
`lifeplus_checkout_paddle_b2b_v6.html` bleiben als historische Referenzen
erhalten.

## 1. Aktiver Flow

Der Pro-Checkout ist aktuell ein B2B-v6.1 Gast-Checkout:

1. Pricing-CTA fuehrt direkt auf `/checkout/{plan}.html`.
2. Der User fuellt E-Mail, Firma, Strasse, PLZ, Ort, Land, optionale VAT-ID und optionalen Rabattcode aus.
3. Pflicht-Checkboxen bestaetigen AGB, Datenschutz und B2B-Status.
4. `POST /api/billing/checkout-intent` akzeptiert Gaeste und eingeloggte User.
5. Der Server validiert alle Felder, speichert einen Checkout-Intent und erstellt serverseitig eine Paddle-Transaction.
6. Der Client oeffnet Paddle Inline Checkout mit `Paddle.Checkout.open({ transactionId })`.
7. Nach `checkout.completed` ruft der Client `POST /api/billing/post-checkout` auf.
8. `post-checkout` validiert Intent, E-Mail und Transaction-ID, prueft die Paddle-Transaction serverseitig, legt User + Session an und liefert `redirectUrl`.
9. Der Browser springt direkt in die App. Der Magic-Link wird parallel nur als Cross-Device-Komfort verschickt.
10. Der Paddle-Webhook bleibt authoritative fuer das Entitlement und schreibt Audit-/Consent-Daten idempotent fort.

## 2. Aktueller Code-Stand

### Backend

- `migrations/0001_init.sql` bis `migrations/0009_checkout_intents_guest.sql` existieren lokal.
- `functions/api/billing/checkout-intent.ts`
  - Session optional.
  - Gast-Checkout erlaubt.
  - B2B-Felder Pflicht.
  - serverseitige Paddle Customer/Address/Business/Transaction-Erstellung.
  - speichert `paddle_transaction_id` auf dem Intent.
- `functions/api/billing/post-checkout.ts`
  - validiert `intentId`, `transactionId` und `checkoutEmail`.
  - ruft Paddle `GET /transactions/{id}`.
  - akzeptiert bezahlte Stati `completed`, `paid`, `billed`.
  - legt User/Session an und setzt Session-Cookie.
  - versendet Magic-Link nur best-effort fuer andere Geraete.
- `functions/api/paddle/webhook.ts`
  - verifiziert Paddle-Signatur.
  - nutzt serverseitigen Intent als authoritative Quelle.
  - verarbeitet Subscription-/Transaction-/Adjustment-Events idempotent.
  - uebernimmt B2B-/Consent-Auditdaten aus dem Intent.
- `functions/api/billing/preview-pricing.ts`
  - liefert Paddle-Preisvorschau fuer Land und Rabattcode.

### Frontend

- `website-astro/src/shared/components/sections/PricingPageDefault.astro`
  - Pro-Links zeigen direkt auf `/checkout/{plan}.html`.
- `website-astro/src/shared/components/sections/CheckoutPage.astro`
  - B2B-Wizard und Pflichtfelder.
- `website-astro/src/shared/scripts/checkoutInline.ts`
  - erstellt Checkout-Intent.
  - oeffnet Paddle mit `transactionId`.
  - ruft `post-checkout` nach Paddle-Erfolg.
  - redirectet zur App-URL aus der API.
- `simulator-app/src/components/LoginGate.tsx`
  - verarbeitet `verifyMagicLink(...).nextUrl` bereits.

## 3. Migrationen

Lokal im Repo vorhanden:

| Migration | Zweck |
|---|---|
| `0001_init.sql` | Basis-Schema |
| `0002_consent_log.sql` | Consent-Log |
| `0003_magic_link_consent.sql` | Magic-Link-Consent |
| `0004_consent_log_client_timestamp.sql` | Client-Timestamp |
| `0005_checkout_intents.sql` | Checkout-Intent-Basis |
| `0006_magic_link_next_url.sql` | Magic-Link `nextUrl` |
| `0007_checkout_intents_b2b.sql` | B2B-Felder, Rechnung, Audit, Paddle-Transaction |
| `0008_consent_log_b2b.sql` | B2B-Consent im Consent-Log |
| `0009_checkout_intents_guest.sql` | `checkout_intents.user_id` nullable fuer Gast-Checkout |

Nicht lokal verifiziert:

- ob alle Migrationen in lokaler D1-DB angewendet sind.
- ob Preview/Sandbox-D1 auf `0009` steht.
- ob Production-D1 auf `0009` steht.

Verifikation erfolgt per `wrangler d1 migrations list` beziehungsweise per
Projekt-spezifischem D1-Statuscheck. Ohne diese Live-Pruefung bleibt der
Remote-/Sandbox-Status offen.

## 4. Sandbox-/Live-Smoke

Vor Live mindestens pruefen:

1. DE ohne VAT, kein Rabatt: DE-USt wird angezeigt und Checkout schliesst ab.
2. DE mit Rabattcode: Rabatt wird im Preview/Checkout konsistent beruecksichtigt.
3. EU-Ausland mit gueltiger VAT: Reverse-Charge-Pfad in Paddle pruefen.
4. Ungueltige VAT: Feldfehler landet beim VAT-Feld.
5. Unbekannter Rabattcode: Feldfehler landet beim Rabattfeld oder Preview faellt dokumentiert zurueck.
6. Gast-Checkout: User ist nach `post-checkout` direkt eingeloggt.
7. Bestehende Session mit gleicher E-Mail: kein neuer Login noetig.
8. Bestehende Session mit anderer E-Mail: `email_mismatch`.
9. Webhook kommt vor/nach `post-checkout`: Entitlement wird idempotent gesetzt.
10. App pollt `/api/me`, bis Pro-Entitlement sichtbar ist.

## 5. Go-Live-Offen

- [ ] D1-Status lokal, Preview/Sandbox und Production gegen `0001` bis `0009` pruefen.
- [ ] Paddle Sandbox-Smoke aus Abschnitt 4 dokumentiert ausfuehren.
- [ ] `PADDLE_API_KEY` als Cloudflare-Secret fuer Sandbox/Live pruefen.
- [ ] LifePlus Paddle-Production-Werte in `website-astro/src/brands/lifeplus/brand.yaml` setzen, sobald KYC/Production bereit ist.
- [ ] B2B-/Netto-/AGB-/Widerruf-/Datenschutz-Hinweise final gegen aktuellen Checkout pruefen.
- [ ] Anwaltliche Freigabe fuer AGB, Widerruf, Datenschutz und Impressum einholen.
- [ ] FitLine/Eqology erst nach eigenen Paddle-/API-/Domain-Setups live bewerben.

## 6. Historische Dokumente

Historisch, nicht mehr fuehrend:

- `Umsetzungsplan.md` — am 2026-06-10 vollstaendig geloescht. Inhalte sind in dieses Runbook eingeflossen.
- [`lifeplus_checkout_paddle_b2b_v2.html`](./lifeplus_checkout_paddle_b2b_v2.html) bleibt als frueher Sketch-Stand erhalten.
- [`lifeplus_checkout_paddle_b2b_v6.html`](./lifeplus_checkout_paddle_b2b_v6.html) bleibt als letzter v6-Mockup vor v6.1 Gast-Checkout erhalten.

Geloescht am 2026-06-09 nach Runbook-Fertigstellung:

- alte Codex/Claude Checkout-/Signup-Dokumente und HTML-Prototypen
- `lifeplus_checkout_paddle_b2b_v1.html`, `v3.html`, `v4.html`, `v5.html`
- `lifeplus_checkout_option_a_mockup.html`
