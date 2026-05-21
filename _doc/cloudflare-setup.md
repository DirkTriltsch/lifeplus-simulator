# Cloudflare Free-Tier Setup — Erste Version

Diese Anleitung erklaert, wie die Paddle-Integration auf Cloudflare Pages
Free-Tier in Betrieb genommen wird. Eine Pages-Instanz pro Brand.

## Was bereits im Repo liegt

```
wrangler.toml                       Pages/D1/KV-Bindings (Vorlage)
migrations/0001_init.sql            D1-Schema
functions/                          API-Endpoints (TypeScript)
  _middleware.ts
  env.d.ts
  tsconfig.json
  _lib/                             db, crypto, session, paddle-sig, mailer, rate-limit
  api/
    me.ts
    auth/request-link.ts
    auth/verify-link.ts
    auth/logout.ts
    paddle/webhook.ts
    devices/index.ts
    devices/revoke.ts
    billing/checkout-intent.ts
    billing/portal.ts
simulator-app/src/auth/             Frontend-Auth (useAuth, api)
simulator-app/src/components/
  AuthGate.tsx, LoginGate.tsx, Paywall.tsx, DeviceLimitGate.tsx
website/templates/pricing.html      Marketing-Pricing mit Paddle.Checkout.open
website/brands.json                 paddle.* pro Brand
```

## Voraussetzungen

- Cloudflare-Account (Free)
- Paddle Sandbox-Account (Live-KYC laeuft parallel)
- Resend-Account (Free 100 Mails/Tag) oder anderer Mailer
- `npm install -g wrangler` (optional, Pages-Build geht auch ohne)
- Git-Repo bei GitHub oder GitLab (fuer Pages-Auto-Deploy)

## Schritt 1: Pages-Projekt pro Brand anlegen

Im Cloudflare-Dashboard unter Workers & Pages:

```text
Projekt 1: lifeflow360
Projekt 2: fitflow360
Projekt 3: eqoflow360
```

Pro Projekt das Git-Repo verbinden und folgende Build-Settings setzen:

```text
Framework preset:   None
Build command:      npm install && npm run build:webroot:lifeplus
                    (bzw. fitline / eqology)
Build output dir:   dist/site-lifeplus
                    (bzw. site-fitline / site-eqology)
Root directory:     /
```

Functions werden automatisch aus `functions/` mitgebaut, ohne extra Config.

## Schritt 2: D1-Datenbank pro Brand anlegen

```powershell
# Lokal mit wrangler (einmalig pro Brand):
wrangler d1 create lifeflow360-prod
wrangler d1 create fitflow360-prod
wrangler d1 create eqoflow360-prod
```

Die zurueckgegebene `database_id` in der jeweiligen Pages-Projekt-Config
(Settings -> Functions -> D1 database bindings) als `DB` binden.

Schema einspielen:

```powershell
wrangler d1 execute lifeflow360-prod --remote --file=migrations/0001_init.sql
```

## Schritt 3: KV-Namespace fuer Rate-Limits

```powershell
wrangler kv:namespace create RATE_LIMIT
```

Im Pages-Projekt unter Settings -> Functions -> KV namespace bindings als
`RATE_LIMIT` binden.

## Schritt 4: Environment Variables und Secrets

Pro Pages-Projekt unter Settings -> Environment variables:

```text
Production-Variablen (plain):
  BRAND_ID                 lifeplus
  APP_URL                  https://www.lifeflow360.app/app/
  PADDLE_ENV               sandbox
  SESSION_TTL_DAYS         30
  MAGIC_LINK_TTL_MINUTES   15
  DEVICE_LIMIT             3
  MAIL_FROM                no-reply@lifeflow360.app
  MAIL_FROM_NAME           LifeFlow360
```

Secrets (Encrypt):

```text
  PADDLE_API_KEY           aus Paddle Dashboard -> Developer Tools -> API Keys
  PADDLE_WEBHOOK_SECRET    aus Paddle Dashboard -> Notifications -> Endpoint
  APP_SESSION_SECRET       openssl rand -hex 32
  MAGIC_LINK_SECRET        openssl rand -hex 32
  RESEND_API_KEY           aus Resend Dashboard
```

## Schritt 5: Paddle Sandbox einrichten

1. Sandbox-Login: https://sandbox-vendors.paddle.com
2. Catalog -> Products: pro Brand ein Produkt anlegen (z.B. "LifeFlow360 Pro")
3. Pro Produkt zwei Preise:
   - Monatlich: 19 EUR / Monat, recurring
   - Jaehrlich: 180 EUR / Jahr, recurring
4. Preise notieren: die `pri_...`-IDs
5. Developer Tools -> Authentication -> Client-side Token erzeugen (oeffentlich)
6. Notifications -> + New Destination:
   - URL: `https://www.lifeflow360.app/api/paddle/webhook`
   - Events:
     - `subscription.created`
     - `subscription.updated`
     - `subscription.activated`
     - `subscription.canceled`
     - `subscription.past_due`
     - `subscription.paused`
     - `subscription.resumed`
     - `transaction.completed`
     - `transaction.refunded`
     - `adjustment.created`
   - Webhook-Secret notieren -> als `PADDLE_WEBHOOK_SECRET` im Pages-Projekt
7. Discounts -> + New Discount:
   - Code: `EARLY2026` (oder Wunsch-Code)
   - Type: 100% off, recurring (gesamte Abolaufzeit)
   - Usage limit: z.B. 25
   - Expires: optional
   - Applies to: alle Sandbox-Produkte der Brand

## Schritt 6: brands.json befuellen

[website/brands.json](website/brands.json) pro Brand:

```json
"paddle": {
  "env": "sandbox",
  "clientToken": "test_...",
  "priceIdMonthly": "pri_...",
  "priceIdYearly": "pri_..."
}
```

## Schritt 7: Resend / Mailer

1. Resend-Account anlegen, Brand-Domain hinzufuegen.
2. SPF, DKIM, DMARC laut Resend-Anleitung in DNS setzen (bei Cloudflare DNS:
   einfach kopieren, "Proxy" abschalten fuer MX/TXT).
3. API-Key erzeugen -> als `RESEND_API_KEY` im Pages-Projekt.

Ohne `RESEND_API_KEY` loggt der Mailer den Magic-Link in die Console statt zu
versenden (siehe `functions/_lib/mailer.ts`). Bequem fuer ersten lokalen Test.

## Schritt 8: Lokaler Smoke-Test

```powershell
# In einem Terminal: Vite-Dev fuer das Frontend.
npm run dev:lifeplus

# In einem zweiten Terminal: Pages-Functions lokal.
wrangler pages dev dist/site-lifeplus --d1 DB=lifeflow360-dev --kv RATE_LIMIT
```

Frontend laeuft auf http://localhost:5173, API auf dem Wrangler-Port.
Fuer lokale Tests in der `simulator-app` einen Vite-Proxy fuer `/api` setzen
(spaeter ergaenzen).

## Schritt 9: Erster Live-Test mit Discount-Code

1. https://www.lifeflow360.app/pricing.html oeffnen
2. "Jetzt jaehrlich starten" klicken
3. Im Paddle-Overlay den Discount-Code `EARLY2026` eingeben -> 0 EUR
4. E-Mail eintragen, "Kaufen" klicken
5. Webhook trifft `/api/paddle/webhook` -> Entitlement gesetzt
6. Browser springt auf `/app/?checkout=success`
7. App zeigt LoginGate -> Magic Link anfordern
8. Magic-Link aus der Mail klicken -> App ist offen, Paywall weg

## Schritt 10: Wechsel auf Live

Wenn Paddle KYC durch ist:

1. Live-Produkte und -Preise in Paddle anlegen (parallel zu Sandbox)
2. `brands.json` -> `paddle.env: "live"` und Live-Price-IDs
3. Live-Client-Token und Live-Webhook-Secret im Pages-Projekt setzen
4. `PADDLE_ENV=live` in Pages-Vars
5. Webhook-Destination im Live-Dashboard anlegen
6. Kleiner Realkauf mit eigener Karte, danach Refund -> validiert vollen Loop

## Wichtige Hinweise

- **Cookies**: Die Session laeuft als `__Host-session`-Cookie mit `Secure` und
  `SameSite=Lax`. Funktioniert nur unter HTTPS. Lokal auf `http://localhost`
  versagt Set-Cookie, deshalb lokal mit `wrangler pages dev` ueber HTTPS oder
  via Tunnel testen.
- **Same-Domain**: Marketing-Site, App und API muessen denselben Origin haben,
  damit der Session-Cookie greift. Pages-Projekt erfuellt das automatisch.
- **Idempotenz**: Webhook-Events werden via `webhook_events`-Tabelle mit
  `INSERT OR IGNORE` deduptiziert.
- **Magic-Link aus In-App-Browsern**: Beachte den Hinweis im Pricing-Doc — der
  LoginGate erkennt `?token=...` und ruft `/api/auth/verify-link` auf. Wenn
  der Klick aus Gmail/Outlook in einem In-App-Browser landet, ist die Session
  nur dort gueltig.

## Naechste Schritte (nicht in dieser ersten Version)

- Account-Export und Loeschung (`/api/account/export`, `/api/account/delete`)
- Admin-Endpunkt fuer manuelle Entitlement-Grants (Backup zum Discount-Code)
- Refund-Behandlung verfeinern (Teilrueckerstattungen)
- E-Mail-Bounce-Handling
- Cookie-Consent in Marketing-Site
