# Cloudflare-API-Setup (Hybrid mit IONOS)

Diese Anleitung beschreibt das Deployment der LifeFlow360-API auf
**Cloudflare Pages Free-Tier**, waehrend Marketing-Site und React-App weiter
ueber IONOS unter `www.lifeflow360.app` ausgeliefert werden.

Architektur:

```text
www.lifeflow360.app   IONOS (SFTP)
  /                   Marketing-Site
  /app/               React-App
  /pricing.html       Paddle-Checkout-Seite

api.lifeflow360.app   Cloudflare Pages Functions
  /api/me
  /api/auth/*
  /api/paddle/webhook
  /api/devices/*
  /api/billing/*

Resend                Versand der Magic-Link-Mails
                      Absender: no-reply@lifeflow360.app
                      SPF/DKIM/DMARC liegen in IONOS-DNS
```

## Was bereits im Repo liegt

```text
wrangler.toml                       Pages/D1/KV-Bindings (Vorlage)
migrations/0001_init.sql            D1-Schema
functions/                          API-Endpoints (TypeScript)
public/                             Minimaler Static-Output (placeholder)
simulator-app/src/auth/             Frontend-Auth (useAuth, api)
simulator-app/src/components/
  AuthGate.tsx, LoginGate.tsx, Paywall.tsx, DeviceLimitGate.tsx
website/templates/pricing.html      Paddle-Checkout mit absoluter API-URL
website/brands.json                 paddle.* und apiBaseUrl pro Brand
```

Code-Anpassungen fuer die Hybrid-Topologie:

- [functions/_middleware.ts](../functions/_middleware.ts): CORS fuer
  `www.lifeflow360.app` mit `credentials: include`
- [functions/_lib/cookies.ts](../functions/_lib/cookies.ts):
  `Domain=.lifeflow360.app` statt `__Host-`-Praefix, damit Cookies von
  beiden Subdomains gelesen werden koennen
- [simulator-app/src/auth/api.ts](../simulator-app/src/auth/api.ts):
  absolute API-URL via `VITE_API_BASE_URL`
- [website/templates/pricing.html](../website/templates/pricing.html):
  absolute API-URL via Token `{{API_BASE_URL}}`

## Voraussetzungen

- Cloudflare-Account (Free)
- Resend-Account (Free 100 Mails/Tag)
- IONOS-Zugang fuer DNS-Verwaltung
- Paddle Sandbox-Account mit fertigen Produkten + Preisen
- Git-Repo bei GitHub/GitLab fuer Pages-Auto-Deploy (optional, alternativ direkt-upload)

## Schritt 1: Resend einrichten

1. https://resend.com → Account anlegen
2. `Domains → Add Domain → lifeflow360.app`
3. Resend zeigt 3 DNS-Records (SPF / DKIM / DMARC). Diese kopieren — werden in
   Schritt 5 gemeinsam mit dem API-CNAME in IONOS gesetzt.
4. Noch **keinen** API-Key erzeugen — erst nach Domain-Verifikation in Schritt 5.

## Schritt 2: Cloudflare Pages-Projekt anlegen

Im Cloudflare-Dashboard: `Workers & Pages → Create → Pages → Connect to Git`
(oder `Direct Upload` ohne Git-Repo).

Projekt-Name: `lifeflow360-api`

Build-Settings:

```text
Framework preset:        None
Build command:           (leer lassen)
Build output directory:  public
Root directory:          (leer / repo root)
```

Pages findet die `functions/` automatisch und mountet sie unter `/api/...`.

## Schritt 3: D1-Datenbank anlegen

Im Cloudflare-Dashboard: `Workers & Pages → D1 → Create database`.

- **Name**: `lifeflow360-prod`
- **Region**: `Western Europe (WEUR)` (naeher an deutschem Kundenstamm)
- Anlegen, **Database ID notieren**.

Schema einspielen (lokal mit `wrangler`, einmalig):

```powershell
npx wrangler d1 execute lifeflow360-prod --remote --file=migrations/0001_init.sql
```

Falls `wrangler` noch nicht eingerichtet ist:

```powershell
npx wrangler login
```

Im Pages-Projekt unter `Settings → Functions → D1 database bindings`:

```text
Variable name:   DB
D1 database:     lifeflow360-prod
```

## Schritt 4: KV-Namespace anlegen

Im Cloudflare-Dashboard: `Workers & Pages → KV → Create namespace`.

- **Name**: `lifeflow360-rate-limit`
- Anlegen, **Namespace ID notieren**.

Im Pages-Projekt unter `Settings → Functions → KV namespace bindings`:

```text
Variable name:   RATE_LIMIT
KV namespace:    lifeflow360-rate-limit
```

## Schritt 5: DNS-Records in IONOS setzen

Im IONOS-Kundenkonto: `Domain & SSL → lifeflow360.app → DNS`.

### 5.1 Subdomain `api` zu Cloudflare zeigen lassen

Vor diesem Schritt ein Cloudflare-Deployment auslosen (Schritt 7) — Pages
zeigt dann eine URL wie `lifeflow360-api.pages.dev`. Diese als CNAME-Target
verwenden.

```text
Typ:     CNAME
Host:    api
Wert:    lifeflow360-api.pages.dev   (deine Pages-URL)
TTL:     standard
```

### 5.2 Resend-DNS-Records eintragen

Werte exakt aus dem Resend-Dashboard kopieren. Beispiele:

```text
Typ:     TXT
Host:    @ (oder leer)
Wert:    v=spf1 include:_spf.resend.com ~all
                (Falls schon ein SPF-Record existiert: Resend-Include integrieren,
                NICHT zwei SPF-Records anlegen.)

Typ:     TXT
Host:    resend._domainkey
Wert:    p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...  (von Resend)

Typ:     TXT
Host:    _dmarc
Wert:    v=DMARC1; p=quarantine; rua=mailto:dmarc@lifeflow360.app
```

Nach 5-30 Min sollten alle Records aktiv sein. Im Resend-Dashboard zeigt die
Domain dann `Verified`. **Jetzt** einen API-Key erzeugen:
`API Keys → Create API Key`, Permissions `Sending access`. Der Key ist nur
einmal sichtbar — sofort kopieren.

## Schritt 6: Custom Domain in Cloudflare Pages konfigurieren

Im Pages-Projekt: `Custom domains → Set up a custom domain`.

```text
Domain: api.lifeflow360.app
```

Cloudflare verifiziert per DNS-Check (der CNAME aus 5.1 muss bereits stehen).
Nach Verifikation richtet Cloudflare automatisch das TLS-Zertifikat ein.

## Schritt 7: Environment Variables und Secrets

Im Pages-Projekt: `Settings → Environment variables → Production`.

### Plain variables

```text
BRAND_ID                 lifeplus
APP_URL                  https://www.lifeflow360.app/app/
ALLOWED_ORIGINS          https://www.lifeflow360.app
COOKIE_DOMAIN            .lifeflow360.app
PADDLE_ENV               sandbox
SESSION_TTL_DAYS         30
MAGIC_LINK_TTL_MINUTES   15
DEVICE_LIMIT             3
MAIL_FROM                no-reply@lifeflow360.app
MAIL_FROM_NAME           LifeFlow360
```

### Secrets (Encrypted)

```text
PADDLE_API_KEY            aus Paddle Developer Tools -> API Keys
PADDLE_WEBHOOK_SECRET     wird in Schritt 9 erzeugt
APP_SESSION_SECRET        openssl rand -hex 32
MAGIC_LINK_SECRET         openssl rand -hex 32
RESEND_API_KEY            aus Schritt 5.2
```

OpenSSL-Secrets in PowerShell erzeugen:

```powershell
# 64 Zeichen Hex (32 Bytes)
-join ((1..32) | ForEach-Object { '{0:X2}' -f (Get-Random -Maximum 256) })
```

oder ueber Git Bash mit `openssl rand -hex 32`.

## Schritt 8: Erstes Deployment

Wenn Git-Verbindung aktiv: ein Commit auf `main` triggert automatisch das
Deployment.

Smoke-Test:

```powershell
curl -i https://api.lifeflow360.app/api/me
```

Erwartung:

```text
HTTP/2 200
content-type: application/json
{"authenticated":false,"entitlements":[],"deviceLimit":3,"activeDevices":0}
```

Falls 500: Cloudflare Logs unter `Workers & Pages → lifeflow360-api → Functions → Logs`
pruefen. Haeufige Fehler:
- `DB binding missing` → Schritt 3 nicht abgeschlossen
- `webhook_secret_missing` ist nur fuer den Webhook relevant, nicht fuer `/api/me`

## Schritt 9: Paddle-Webhook-Destination anlegen

Im Paddle-Sandbox-Dashboard: `Notifications → + New Destination`.

```text
URL:               https://api.lifeflow360.app/api/paddle/webhook
Description:       LifeFlow360 API Sandbox
Notification type: Webhook
Events:
  - subscription.created
  - subscription.updated
  - subscription.activated
  - subscription.canceled
  - subscription.past_due
  - subscription.paused
  - subscription.resumed
  - transaction.completed
  - transaction.refunded
  - adjustment.created
```

Nach dem Speichern zeigt Paddle den **Webhook-Secret**. Diesen sofort kopieren
und im Pages-Projekt als Secret `PADDLE_WEBHOOK_SECRET` eintragen
(Schritt 7), dann neu deployen (im Pages-Dashboard: `Deployments →
Redeploy production`).

## Schritt 10: Frontend / App mit API-URL bauen und auf IONOS deployen

Beim App-Build muss `VITE_API_BASE_URL` gesetzt sein:

```powershell
$env:VITE_API_BASE_URL = "https://api.lifeflow360.app"
npm run build:lifeplus
```

Build-Output: `dist/lifeplus/`. Per SFTP auf IONOS hochladen in den
`/app/`-Ordner.

Marketing-Site neu bauen (zieht `apiBaseUrl` aus `brands.json`):

```powershell
npm run build:site:lifeplus
```

Build-Output: `dist/site-lifeplus/`. Per SFTP auf IONOS hochladen ins
Webroot.

## Schritt 11: End-to-End-Test

```text
1. https://www.lifeflow360.app/pricing.html oeffnen
2. "Jetzt jaehrlich starten" klicken
3. Email-Adresse angeben (z.B. mail@triltsch-online.de)
4. Im Paddle-Overlay: Code EARLY2026 -> 0 EUR
5. "Pay" klicken -> checkout.completed
6. Browser springt auf https://www.lifeflow360.app/app/?checkout=success
7. App fragt /api/me ab -> Paywall, weil noch nicht eingeloggt
8. LoginGate erscheint -> Email eingeben -> "Login-Link senden"
9. Magic-Link kommt per Resend-Mail
10. Link in derselben Browser-Session klicken
    (NICHT in einer In-App-Browser-Ansicht der Mail-App)
11. App ist freigeschaltet
12. Paddle-Webhook hat /api/paddle/webhook erreicht
    -> Entitlement in D1 angelegt
    -> /api/me sieht jetzt active=true
```

Pruefung in D1:

```powershell
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT * FROM users"
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT * FROM entitlements"
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT id, type, processed_at FROM webhook_events ORDER BY received_at DESC LIMIT 10"
```

## Schritt 12: Test-User sperren

Drei Wege:

**A — Paddle Subscription sofort kuendigen** (empfohlene Standardroute)

```text
Paddle Dashboard -> Subscriptions -> Subscription oeffnen -> Cancel
Option: Immediately (statt End of period)
-> Webhook 'subscription.canceled' feuert
-> /api/paddle/webhook setzt entitlement.valid_until = jetzt
-> Beim naechsten /api/me liefert App Paywall
```

**B — Discount-Code deaktivieren** (nur Neuregistrierungen)

```text
Catalog -> Discounts -> EARLY2026 -> Disable
-> Bestehende Subs bleiben aktiv
-> Keine neuen 100%-Aktivierungen mehr moeglich
```

**C — Instant-Revoke per Admin-Endpoint** (Notfall / wenn Webhook ausfaellt)

Wird in einer separaten Phase ergaenzt: `POST /api/admin/revoke`
mit Bearer-Token-Schutz. Direkter DB-Eingriff via Wrangler ist die
manuelle Variante:

```powershell
npx wrangler d1 execute lifeflow360-prod --remote --command `
  "UPDATE entitlements SET valid_until = strftime('%s','now')*1000, source='manual_revoke' WHERE user_id = (SELECT id FROM users WHERE email_lower = 'kunde@example.com')"
```

## Was bewusst NICHT in diesem Schritt passiert

- **Live-Paddle**: erst nach erfolgreichem Sandbox-Loop. KYC parallel starten.
- **FitFlow360 / EqoFlow360**: eigene Pages-Projekte + D1 + Resend-Domain
  pro Brand. Code bleibt identisch, nur Env-Vars unterscheiden sich.
- **Account-Export / -Loeschung**: Phase 6, DSGVO-Endpoints.
- **Cookie-Consent in Marketing-Site**: Phase 6.

## Fehler-Cheatsheet

```text
Symptom: "CORS error" im Browser-Network-Tab beim /api/me-Call
-> ALLOWED_ORIGINS in Pages-Env enthaelt nicht die App-Origin
-> Pruefen, dass exakt "https://www.lifeflow360.app" eingetragen ist (kein Trailing-Slash)

Symptom: Cookie wird nicht gesetzt
-> COOKIE_DOMAIN nicht ".lifeflow360.app" (Punkt vorne!)
-> Oder Browser blockiert wegen fehlendem Secure (nur HTTPS)

Symptom: Webhook 401 bad_signature
-> PADDLE_WEBHOOK_SECRET stimmt nicht oder nicht neu deployt
-> Im Pages-Projekt unter Deployments "Retry deployment"

Symptom: Magic-Link kommt nicht an
-> Resend-Dashboard -> Logs pruefen
-> SPF/DKIM in IONOS-DNS noch nicht propagiert (dig +short TXT lifeflow360.app)
-> Mail im Spam-Ordner

Symptom: 500 von /api/auth/request-link
-> Cloudflare-Logs pruefen
-> Haeufig: RESEND_API_KEY nicht gesetzt -> Mailer wirft, request scheitert
```
