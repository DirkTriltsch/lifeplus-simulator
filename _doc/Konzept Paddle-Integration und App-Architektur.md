# Paddle-Integration und App-Architektur

**Stand:** 2026-06-10  
**Status:** fuehrend (Architektur-Master fuer Auth, Billing, Webhook, Entitlements).  
**Scope:** Architektur und Begruendung fuer Brand-Trennung, App-Auth, Device-Limit, Paddle Billing, Checkout-Intents, Webhooks, Entitlements, Account-/Billing-Funktionen, Consent und Hosting.  
**Vorgaenger:** Konzeptstand 2026-05-22 wurde am 2026-06-10 in diese Datei konsolidiert; Volltext (rund 2000 Zeilen Hintergrund-Diskussion) in der Git-Historie.

Nicht verantwortlich fuer operative Schritt-fuer-Schritt-Anleitungen:

- Checkout-Runbook: [`paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](./paddle_checkout/checkout-billing-runbook-b2b-v6-1.md)
- Paddle-Setup: [`Setup Paddle Products, Prices, Discount-Codes.md`](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md)
- Infrastruktur-Setup: [`Setup Infrastruktur Cloudflare, Resend und IONOS.md`](./Setup%20Infrastruktur%20Cloudflare%2C%20Resend%20und%20IONOS.md)
- Free/Trial/Pro-Produktstrategie und offene Drift: [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §1

## 0. Kritisches Review dieses Updates

Die vorherige Fassung war nah am Code, aber an mehreren Stellen zu optimistisch oder ungenau:

1. **"Live-fertig" war zu stark.** LifePlus ist architektonisch weit umgesetzt, aber Go-Live-Gates bleiben offen: Paddle Production/KYC, echte Production-Werte, Anti-Abuse-Limits und DSGVO-Loeschung.
2. **Free-Signup wurde falsch beschrieben.** Der aktuelle Free-Signup-Flow schreibt `consent_log.context='free_signup'`, vergibt aber ein Trial-Entitlement mit `source='trial'`. `source='free_signup'` existiert als Hilfsfunktion in `db.ts`, ist aber nicht der aktuelle Signup-Pfad.
3. **Past-due UI wurde ueberzeichnet.** Der Webhook gibt `past_due` eine 7-Tage-Grace in `entitlements.valid_until`; `useAuth.tsx` behandelt jedes aktive Entitlement als `authenticated_active`. `authenticated_past_due` ist ein Typ, wird aber derzeit nicht abgeleitet.
4. **One-Shot/Lifetime ist Codepfad, nicht Produktversprechen.** `transaction.paid` ohne Subscription kann `source='one_shot_purchase'` und `access_level='lifetime'` schreiben. Ein aktiv vermarkteter Lifetime-Plan ist dadurch nicht automatisch belegt.
5. **Memory-/Wiki-Links waren nicht pruefbar.** Fuehrende Doku muss auf echte Repo-Dateien und Code-Anker zeigen.

## 1. Aktueller Stand

LifePlus/LifeFlow360 hat einen implementierten B2B-v6.1-Gast-Checkout mit Paddle Billing, serverseitig erzeugten Transactions, Post-Checkout-Auto-Login, Webhook-basierter Entitlement-Schreibung und Account-/Billing-Funktionen. FitLine und Eqology haben Microsites und Brand-Konfigurationen, aber kein vollstaendiges eigenes Production-Setup fuer API, Paddle und Webhooks.

```text
Astro Microsite                         React App
/pricing.html, /checkout/{plan}.html    /app/
        |                                  |
        v                                  v
POST /api/billing/checkout-intent      GET /api/me
        |
        v
Paddle Billing API: serverseitige Transaction
        |
        v
Paddle Inline Checkout im Browser
        |
        v
POST /api/billing/post-checkout
        |
        v
User + Session, aber Entitlement erst via Webhook
        |
        v
POST /api/paddle/webhook
        |
        v
D1: subscriptions, entitlements, consent_log, webhook_events
```

### Container-Diagramm (C4-Level 2)

Die Architektur besteht aus zwei statischen Frontend-Containern (Astro Microsite, React App), einer Serverless-API auf Cloudflare und externen Services (Paddle, Resend).

```text
┌──────────────────────────────────────────────────────────────────────┐
│                          User Browser                                 │
└──────────────────────────────────────────────────────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│ Astro Microsite  │  │  React App       │  │ Paddle Inline Checkout    │
│ (IONOS, static)  │  │  (IONOS, /app/)  │  │ (Paddle.com, iframe)      │
│ Pricing, Signup, │  │  Simulator, Auth │  │                           │
│ Checkout-Wizard  │  │  Gates           │  │                           │
└────────┬─────────┘  └────────┬─────────┘  └─────────────┬────────────┘
         │                     │                          │
         │ /api/*              │ /api/me                  │ Webhooks
         ▼                     ▼                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Cloudflare Pages Functions API (functions/)                          │
│  Routes: /api/auth/*, /api/billing/*, /api/account/*, /api/paddle/*   │
└────────┬──────────────────────────────────────────────┬──────────────┘
         │                                              │
         ▼                                              ▼
┌──────────────────┐           ┌──────────────────┐  ┌──────────────────┐
│ Cloudflare D1    │           │ Cloudflare KV    │  │ Resend (HTTPS)   │
│ users, sessions, │           │ RATE_LIMIT       │  │ Magic-Link Mail  │
│ entitlements,    │           │ Counter          │  └──────────────────┘
│ subscriptions,   │           └──────────────────┘
│ webhook_events,  │
│ consent_log,     │
│ checkout_intents │
└──────────────────┘
```

### Brand-Trennung pro Stack

Jede Brand laeuft als eigenstaendiger Stack mit eigenen Bindings, eigener D1, eigenen Paddle-Werten:

```text
LifeFlow360                FitFlow360                EqoFlow360
(go-live focus)            (preview/staging)         (preview/staging)
─────────────              ─────────────             ─────────────
www.lifeflow360.app        fitflow360.triltsch.com   eqoflow360.triltsch.com
                            (Ziel: fitflow360.de)     (Ziel: eqoflow360.de)
        │                          │                         │
        ▼                          ▼                         ▼
api.lifeflow360.app        (eigene API-Subdomain)    (eigene API-Subdomain)
BRAND_ID="lifeplus"        BRAND_ID="fitline"        BRAND_ID="eqology"
        │                          │                         │
        ▼                          ▼                         ▼
D1 lifeflow360-prod        (eigene D1)               (eigene D1)
KV RATE_LIMIT (LP)         (eigene KV)               (eigene KV)
Paddle-Account LifePlus    Paddle-Account FitLine    Paddle-Account Eqology
priceIdMonthly/HalfYear/Yearly (je Brand)
```

E-Mail-Identitaeten sind je Brand getrennt: ein User mit derselben E-Mail kann bei LifeFlow360, FitFlow360 und EqoFlow360 jeweils einen unabhaengigen Account haben (siehe Memory [[project-brand-separation]]).

Wichtiges Laufzeitmodell:

- **Auth:** Magic-Link plus Session-Cookie, keine Passwoerter.
- **Devices:** `DEVICE_LIMIT=3`; Session ist an ein Device gebunden.
- **Checkout:** Pricing-CTA fuehrt direkt auf `/checkout/{plan}.html`; Login vor Kauf ist optional.
- **Entitlement Source of Truth:** App-Zugang kommt aus D1 `entitlements`, geschrieben durch Trial-Flow oder Paddle-Webhook.
- **Post-Checkout:** Erstellt oder findet User, setzt Session-Cookie und sendet best-effort einen Magic-Link. Pro-Zugang wird nicht dort vergeben, sondern nach Webhook ueber `/api/me` sichtbar.
- **Brand-Trennung:** `BRAND_ID`, Paddle-Price-IDs und DB-Bindings sind brand-spezifisch gedacht. Aktuell ist LifePlus der Go-Live-Fokus.

## 2. Code-Anker

### Backend

| Pfad | Verantwortung |
|---|---|
| [`functions/api/auth/request-link.ts`](../functions/api/auth/request-link.ts) | Magic-Link anfordern; Free-Signup-Consent im Token speichern; Rate-Limit. |
| [`functions/api/auth/verify-link.ts`](../functions/api/auth/verify-link.ts) | Magic-Link einloesen; `TRIAL_DAYS=14`; Free-Signup-Consent loggen; Trial-Entitlement vergeben; Session erstellen. |
| [`functions/api/billing/checkout-intent.ts`](../functions/api/billing/checkout-intent.ts) | B2B-Felder, Plan, Consent und optional Session pruefen; Checkout-Intent persistieren; Paddle Transaction serverseitig erstellen. |
| [`functions/api/billing/post-checkout.ts`](../functions/api/billing/post-checkout.ts) | Intent/Transaction gegen Paddle verifizieren; User und Session erstellen; Magic-Link best effort senden; kein Entitlement-Grant. |
| [`functions/api/billing/preview-pricing.ts`](../functions/api/billing/preview-pricing.ts) | Paddle-Preisvorschau; laut Go-Live-Checkliste mit IP-Limit. |
| [`functions/api/billing/portal.ts`](../functions/api/billing/portal.ts) | Paddle Customer Portal Session fuer `overview`, `payment_method`, `cancel`. |
| [`functions/api/billing/cancel-checkout-intent.ts`](../functions/api/billing/cancel-checkout-intent.ts) | Checkout-Intent abbrechen/aufraeumen. |
| [`functions/api/paddle/webhook.ts`](../functions/api/paddle/webhook.ts) | HMAC-Signatur, Idempotenz, Subscription-/Transaction-/Adjustment-Handling, Entitlement-Schreibung. |
| [`functions/api/account/cancel-subscription.ts`](../functions/api/account/cancel-subscription.ts) | Direkte Abo-Kuendigung oder Ruecknahme via Paddle API. |
| [`functions/api/account/subscription-details.ts`](../functions/api/account/subscription-details.ts) | Live-Lookup aktueller Subscription-Details bei Paddle. |
| [`functions/api/account/payments.ts`](../functions/api/account/payments.ts) | Transaktionsliste fuer Account-Seite. |
| [`functions/api/account/invoice.ts`](../functions/api/account/invoice.ts) | Paddle-Invoice-URL aufloesen; Customer-ID gegen User pruefen. |
| [`functions/api/me.ts`](../functions/api/me.ts) | Session, Entitlement und Devices liefern; abgelaufene Trials lazy degradieren. |
| [`functions/_lib/db.ts`](../functions/_lib/db.ts) | D1-Helfer fuer User, Sessions, Devices, Checkout-Intents, Consent und Entitlements. |
| [`functions/_lib/paddle.ts`](../functions/_lib/paddle.ts) | Paddle Billing API Wrapper. |
| [`functions/_lib/paddle-sig.ts`](../functions/_lib/paddle-sig.ts) | Webhook-HMAC-Signaturpruefung. |
| [`functions/_lib/rate-limit.ts`](../functions/_lib/rate-limit.ts) | KV-basiertes Rate-Limit. |

### Frontend und Config

| Pfad | Verantwortung |
|---|---|
| [`website-astro/src/brands/lifeplus/brand.yaml`](../website-astro/src/brands/lifeplus/brand.yaml) | Site-/App-/API-URLs, Paddle-Env, Client-Token, Price-IDs fuer LifePlus. |
| [`website-astro/src/brands/*/content/pricing.yaml`](../website-astro/src/brands/lifeplus/content/pricing.yaml) | Pricing-Tiers und CTA-Typen. |
| [`website-astro/src/brands/*/pages/checkout/[plan].astro`](../website-astro/src/brands/lifeplus/pages/checkout/[plan].astro) | Checkout-Seite pro Brand/Plan. |
| [`website-astro/src/shared/scripts/checkoutInline.ts`](../website-astro/src/shared/scripts/checkoutInline.ts) | Client-Checkout-Flow, Paddle Inline Checkout, post-checkout Polling/Redirect. |
| [`website-astro/src/shared/scripts/accountPage.ts`](../website-astro/src/shared/scripts/accountPage.ts) | Mein-Konto-Verhalten, Subscription-Details, Rechnungen, Portal, Kuendigung. |
| [`simulator-app/src/auth/useAuth.tsx`](../simulator-app/src/auth/useAuth.tsx) | `/api/me` zu `AuthStatus` mappen. |
| [`simulator-app/src/components/AuthGate.tsx`](../simulator-app/src/components/AuthGate.tsx) | Login, Device-Limit, Paywall oder App anzeigen. |
| [`wrangler.toml`](../wrangler.toml) | LifePlus API-Konfiguration fuer lokale/dev Cloudflare Pages Functions: `BRAND_ID`, `APP_URL`, Origins, D1, KV, Secrets-Hinweise. |

### Persistenz

| Migration | Inhalt |
|---|---|
| [`migrations/0001_init.sql`](../migrations/0001_init.sql) | `users`, `sessions`, `devices`, `subscriptions`, `entitlements`, `magic_login_tokens`, `webhook_events`. |
| [`migrations/0002_consent_log.sql`](../migrations/0002_consent_log.sql) bis [`0004_consent_log_client_timestamp.sql`](../migrations/0004_consent_log_client_timestamp.sql) | Consent-Log und Client-Zeitstempel. |
| [`migrations/0005_checkout_intents.sql`](../migrations/0005_checkout_intents.sql), [`0007_checkout_intents_b2b.sql`](../migrations/0007_checkout_intents_b2b.sql), [`0009_checkout_intents_guest.sql`](../migrations/0009_checkout_intents_guest.sql) | Checkout-Intents bis B2B-v6.1 Gast-Checkout. |
| [`migrations/0006_magic_link_next_url.sql`](../migrations/0006_magic_link_next_url.sql) | `next_url` fuer Magic-Link-Weiterleitung. |
| [`migrations/0008_consent_log_b2b.sql`](../migrations/0008_consent_log_b2b.sql) | B2B-Consent-/Beweislastfelder. |

## 3. Architekturentscheidungen

### 3.1 Brand-Trennung

Zielarchitektur: Jede Brand bekommt eigene Domain/Microsite, eigene API-Konfiguration, eigene D1-Datenhaltung und eigene Paddle-Konfiguration. Eine E-Mail-Adresse kann dadurch je Brand separat existieren.

Gruende:

- Paddle-Rechnung, Seller, Produkt und Legal-Texte bleiben eindeutig.
- Cross-Brand-Bundles wuerden Abrechnung, Steuern, Support und Datenschutz verkomplizieren.
- Brand-spezifische Go-Live-Reife kann getrennt gesteuert werden.

Grenze: Im Repo ist LifePlus aktuell der konkrete Go-Live-Fokus. FitLine/Eqology duerfen nicht als produktionsbereit dokumentiert werden, solange eigene API-/Paddle-/Webhook-Setups fehlen.

### 3.2 Magic-Link plus Device-Limit

Keine Passwoerter, kein Passwort-Reset. Login laeuft per Magic-Link und Session-Cookie. Jede Session ist an ein Device gebunden; `DEVICE_LIMIT=3` begrenzt parallele aktive Geraete.

Bewertung:

- Gut fuer B2B-/Selbststaendigen-Zielgruppe, weil Passwort-Support reduziert wird.
- Device-Limit verhindert simples Teilen eines Zugangs.
- Risiko: Mail-Zustellbarkeit ist kritisch; Resend/DNS/Spam-Monitoring bleibt Go-Live-relevant.

### 3.3 B2B-v6.1 Gast-Checkout

Der Checkout laeuft ohne verpflichtenden Login vor dem Kauf:

1. `/checkout/{plan}.html` sammelt Rechnungsdaten, B2B-Bestaetigung und Consent.
2. `POST /api/billing/checkout-intent` validiert serverseitig und erstellt eine Paddle Transaction.
3. Paddle Inline Checkout verarbeitet Zahlung.
4. `POST /api/billing/post-checkout` verifiziert Transaction-Status bei Paddle, erstellt Session und sendet optional Magic-Link.
5. Webhook schreibt Subscription/Entitlement und Consent-Audit final.

Vorteil: weniger Kauf-Reibung als Login vor Checkout.  
Kosten: mehr serverseitige Komplexitaet und mehr Missbrauchsflaeche auf `checkout-intent`.

### 3.4 Webhook als Entitlement-Autoritaet

Paddle ist Payment Source of Truth. Der Webhook:

- prueft `PADDLE_WEBHOOK_SECRET` und Signatur,
- speichert Events idempotent in `webhook_events`,
- nutzt den serverseitigen `intent_id` als vertrauenswuerdige Bruecke zwischen Checkout und Account,
- schreibt `subscriptions` und `entitlements`,
- behandelt Refund/Chargeback ueber `adjustment.created/updated` mit Revoke.

Entitlement-Mapping:

| Quelle | Wann tritt das auf | Ergebnis |
|---|---|---|
| Free-Signup Magic-Link | User klickt Magic-Link aus Signup-Mail | `access_level='pro'`, `source='trial'`, `valid_until=now+14 Tage`; Consent-Kontext `free_signup`. |
| Abgelaufener Trial bei `/api/me` | User oeffnet App nach Tag 14 | Lazy Degrade zu `access_level='free'`, `source='trial_expired'`, `valid_until=NULL`. |
| Subscription `active` / `trialing` | Webhook nach erstem Pro-Kauf oder Renewal | `access_level='pro'`, `source='subscription'`, `valid_until=current_period_ends_at`. |
| Subscription `past_due` | Zahlung schlaegt fehl, Paddle versucht erneut | `access_level='pro'`, `source='subscription'`, `valid_until=current_period_ends_at + 7 Tage`. |
| Subscription `canceled` | User cancelt im Portal oder `/api/account/cancel-subscription` | `valid_until=current_period_ends_at` oder sofort, falls Zeitraum fehlt. |
| Subscription `paused` / unbekannt | Selten; Paddle-Admin-Aktion oder unbekannter Zustand | `valid_until=now`, faktisch inaktiv. |
| `transaction.paid` ohne Subscription | One-Shot-Kauf statt Abo (Codepfad existiert, kein aktives Produkt) | `access_level='lifetime'`, `source='one_shot_purchase'`. |
| Refund/Chargeback Adjustment | Paddle bucht Refund, User cancelt via Customer Portal mit Refund, Chargeback | `source='refund_revoked'`, `valid_until=now`. |

Wichtig: `authenticated_past_due` ist im Frontend-Typ vorhanden, wird aber derzeit nicht erzeugt. Grace-Period bedeutet aktuell "weiter aktiv", nicht eigener UI-Status.

### 3.5 Consent und Datenschutz

- Free-Signup: AGB und Datenschutz sind Pflicht; Newsletter optional. Consent wird beim Verify des Magic-Links als `context='free_signup'` geloggt.
- Pro-Checkout: AGB, Datenschutz und B2B-Bestaetigung sind Pflicht. Checkout-Intent speichert Beweislastfelder; Webhook schreibt `context='pro_checkout'`.
- Session-Cookie: `SESSION_TTL_DAYS=30`; Domain fuer LifePlus in `wrangler.toml`.
- DSGVO-Loeschung: Account-Loesch-Endpoint ist weiterhin offen und ein Go-Live-Risiko.

### 3.6 Hosting

- Astro-Microsite und React-App werden statisch separat ausgeliefert.
- Cloudflare Pages Functions stellen API-Endpunkte unter der API-Domain bereit.
- D1 ist die relationale Datenhaltung; KV wird fuer Rate-Limits genutzt.
- Resend ist transactional Mailer.

`wrangler.toml` dokumentiert den LifePlus-API-Stand und ist nicht automatisch Beweis fuer vollstaendige FitLine-/Eqology-Produktionsreife.

## 4. Drift- und Risiko-Register

| Finding | Risiko | Korrektur / Gate |
|---|---|---|
| LifePlus ist noch `PADDLE_ENV=sandbox` und `brand.yaml.paddle.env=sandbox`. | Kein echter Production-Checkout. | Paddle KYC/Production, echte Token/Price-IDs, Smoke-Test. |
| `checkout-intent` erzeugt Paddle Transactions, hat aber im Code keinen `consumeRateLimit`-Call. | Missbrauch kann massenhaft Transactions erzeugen. | IP-, E-Mail- und Plan-Limit einfuehren oder explizit begruenden. |
| `portal` und `cancel-subscription` haben kein dokumentiertes Rate-/Cooldown-Limit. | Paddle API kann gespammt werden; Support-/Kostenrisiko. | User/IP-Limits oder Idempotenzfenster definieren. |
| DSGVO-Loesch-Endpoint fehlt. | Go-Live-/Compliance-Risiko. | Loesch-/Anonymisierungsflow fuer User, Sessions, Devices, Entitlements, Consent-Log und Paddle-Bezug definieren. |
| `authenticated_past_due` wird nie abgeleitet. | UI-Status und Doku koennen auseinanderlaufen. | Entweder Typ entfernen oder echte Past-due-UI bauen. |
| `grantFreeEntitlementIfMissing` existiert, wird aber nicht als aktueller Free-Signup-Pfad genutzt. | Falsche Annahmen ueber Free-Zugang. | In Doku klar zwischen Trial, Free-Degrade und Hilfsfunktion unterscheiden. |
| One-Shot/Lifetime-Codepfad existiert. | Kann als aktives Angebot missverstanden werden. | Nur dokumentieren, wenn Produkt/Preise/Tests dafuer existieren. |
| `webhook_events` hat keine Prune-/Retention-Policy. | Langfristiges Datenwachstum und Datenschutzfragen. | Retention-Entscheidung vor Production-Betrieb festhalten. |
| FitLine/Eqology haben noch kein vollstaendiges Payment/API-Setup. | Falsches Go-Live-Signal. | Als Preview/Staging markieren, bis eigene Konfiguration produktionsreif ist. |

## 5. Abweichungen vom Konzeptstand 2026-05-22

| Altes Konzept | Realer Stand 2026-06-10 | Bewertung |
|---|---|---|
| Brevo oder Resend offen | Resend | Entscheidung gefallen. |
| Neon Frankfurt | Cloudflare D1 | In Cloudflare-Topologie integriert. |
| Paddle Classic Events | Paddle Billing Events | Richtig, Classic nicht weiterfuehren. |
| `website/pricing.json` als Quelle | `brand.yaml` und `content/pricing.yaml` | Passt zur Astro-Brand-Struktur. |
| Checkout direkt aus Browserdaten | Server erstellt Paddle Transaction | Besser fuer B2B-Pflichtfelder, Audit und Manipulationsschutz. |
| Login vor Kauf | Gast-Checkout mit Post-Checkout-Auto-Login | Konversionsfreundlicher, aber komplexer. |
| AccountPanel in React | Account-Seite in Astro mit `accountPage.ts` | Reale Implementierung liegt ausserhalb der React-App. |

## 6. Offene Punkte vor Go-Live

- Paddle Production/KYC abschliessen und echte Production-Werte setzen.
- LifePlus Checkout einmal end-to-end testen: Checkout-Intent, Paddle Inline, post-checkout, Webhook, `/api/me`, App-Freischaltung.
- Webhook-Fehlerpfade testen: duplicate event, fehlende/ungueltige Signatur, falscher Intent, falsche Brand, unbekannte Price-ID.
- Anti-Abuse-Limits fuer `checkout-intent`, `portal` und `cancel-subscription` festlegen.
- DSGVO-Loesch-/Anonymisierungsflow implementieren oder als expliziten Launch-Blocker fuehren.
- Retention fuer `webhook_events`, `checkout_intents`, `consent_log` und Mail-Logs klaeren.
- FitLine/Eqology als nicht produktionsbereit markieren, solange eigene Paddle-/API-/Webhook-Konfiguration fehlt.

## 7. Verwandte fuehrende Dokumente

- [`paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](./paddle_checkout/checkout-billing-runbook-b2b-v6-1.md) - operatives Checkout-Runbook.
- [`paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md`](./paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md) - historische Checkout-Iterationen.
- [`paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md`](./paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md) - rechtlicher B2B-Pivot.
- [`Setup Paddle Products, Prices, Discount-Codes.md`](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md) - Paddle-Setup und SKU-Konvention.
- [`Setup Infrastruktur Cloudflare, Resend und IONOS.md`](./Setup%20Infrastruktur%20Cloudflare%2C%20Resend%20und%20IONOS.md) - Infrastruktur.
- [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §1 - Free/Trial/Pro-Strategie und offene Drift (Promo-Codes, Founder, Refund, Trial-Wiederholung, Output-Limit).
- [`go-live/go-live-content-legal-checklist.md`](./go-live/go-live-content-legal-checklist.md) - Legal, Anti-Abuse und Go-Live-Gates.

## Anhang: Historischer Kontext

Der Original-Konzepttext steht in [`Konzept Paddle-Integration und App-Architektur.md`](./Konzept%20Paddle-Integration%20und%20App-Architektur.md). Er enthaelt:

- Hintergrund-Diskussion der Device-Slot-Logik und verworfener Optionen.
- Auswahl und Entwicklung der Webhook-Events.
- Roadmap-Phasen, die heute teilweise durch Migrationen und Endpunkte umgesetzt sind.
- Diskussion Brand-Modell, Cross-Sell, Mailer, DB und Pricing-Konfiguration.

Bei Abweichungen zwischen historischer Detail-Spec und diesem Review-Master gilt dieses Dokument. Vor Merge in die Originaldatei sollten die offenen Go-Live-Gates nicht als erledigt formuliert werden.
