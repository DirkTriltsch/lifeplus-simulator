# Setup Infrastruktur: Cloudflare, Resend und IONOS

Generischer Leitfaden zum Aufsetzen einer Hybrid-Infrastruktur fuer ein
SaaS-Backend mit klassischem Webhosting (IONOS), serverloser API
(Cloudflare Pages Functions) und HTTPS-Email-Versand (Resend).

Der Leitfaden ist mit den konkreten Werten eines Beispiel-Setups
(`LifeFlow360`) versehen, damit Schritte und Konsistenz nachvollziehbar
bleiben. Fuer ein eigenes Projekt einfach `lifeflow360` durch den eigenen
Projekt-Namen ersetzen und Domains anpassen.

Stand: 2026-05-22.

---

## Inhaltsverzeichnis

- [1. Was du danach kannst](#1-was-du-danach-kannst)
- [2. Voraussetzungen](#2-voraussetzungen)
- [3. Architektur-Ueberblick](#3-architektur-ueberblick)
- [4. Brand- und Konto-Strategie](#4-brand--und-konto-strategie)
- [5. Cloudflare-Pages-Projekt per CLI anlegen](#5-cloudflare-pages-projekt-per-cli-anlegen)
- [6. D1 und KV anlegen, Bindings konfigurieren](#6-d1-und-kv-anlegen-bindings-konfigurieren)
- [7. Schema einspielen und erstes Deployment](#7-schema-einspielen-und-erstes-deployment)
- [8. Resend einrichten](#8-resend-einrichten)
- [9. IONOS-DNS-Records](#9-ionos-dns-records)
- [10. Custom Domain in Cloudflare und TLS](#10-custom-domain-in-cloudflare-und-tls)
- [11. Secrets sicher setzen](#11-secrets-sicher-setzen)
- [12. Verifikation und Smoke-Tests](#12-verifikation-und-smoke-tests)
- [13. Code-Bausteine](#13-code-bausteine)
  - [13.1 CORS-Middleware fuer Cross-Origin](#131-cors-middleware-fuer-cross-origin)
  - [13.2 Session-Cookies mit Parent-Domain](#132-session-cookies-mit-parent-domain)
  - [13.3 Webhook-Signatur-Verifikation](#133-webhook-signatur-verifikation)
  - [13.4 Customer-Lookup mit Email-Fallback](#134-customer-lookup-mit-email-fallback)
- [14. Haeufige Fallstricke](#14-haeufige-fallstricke)
- [15. Neuen Brand klonen — Rezept](#15-neuen-brand-klonen--rezept)
- [16. Wo weiterlesen](#16-wo-weiterlesen)

---

## 1. Was du danach kannst

- Ein eigenes Cloudflare-Pages-Projekt mit Functions, D1-Datenbank und
  KV-Namespace per Wrangler-CLI anlegen, ohne den Dashboard-Wizard.
- Eine eigene Domain (z.B. `api.deinprojekt.com`) als Cloudflare-Pages
  Custom-Domain einrichten, waehrend die DNS-Hoheit beim Domain-Registrar
  (hier IONOS) bleibt.
- Email-Versand ueber Resend mit DKIM/SPF-Authentifizierung der eigenen
  Domain konfigurieren — inklusive aller noetigen DNS-Records.
- Cookies setzen, die ueber zwei Subdomains hinweg lesbar sind
  (`www.deinprojekt.com` und `api.deinprojekt.com`).
- Secrets sicher setzen, ohne dass sie in der Shell-History oder im
  Chat-Log landen.

---

## 2. Voraussetzungen

```text
Cloudflare-Account             vorhanden (Free-Tier reicht)
Domain bei einem Registrar     hier: IONOS, vergleichbar bei Strato, Hetzner, etc.
Resend-Account                 vorhanden (Free 100 Mails/Tag)
Node.js und npm                lokal installiert
Git und Repo lokal             vorhanden
Web-Backend-Verstaendnis       HTTP, Cookies, CORS, DNS
```

Dieses Dokument richtet sich an Entwicklerinnen und Entwickler. Begriffe
wie `CNAME`, `MX`, `DKIM`, `Webhook`, `D1`, `KV` werden ohne weitere
Einleitung verwendet.

---

## 3. Architektur-Ueberblick

Die hier beschriebene Topologie trennt **statische Inhalte**, **API** und
**Email-Versand** auf drei spezialisierte Anbieter:

```text
www.lifeflow360.app   IONOS (SFTP-Hosting)
  /                   Marketing-Site (HTML, CSS, JS)
  /app/               React-App (Vite-Build)
  /pricing.html       Marketing-Seite mit Paddle-Checkout

api.lifeflow360.app   Cloudflare Pages Functions  (CNAME -> *.pages.dev)
  /api/me
  /api/auth/*
  /api/paddle/webhook
  /api/devices/*
  /api/billing/*

Resend                HTTPS-Bridge fuer SMTP
                      Absender: no-reply@lifeflow360.app
                      SPF/DKIM/DMARC in IONOS-DNS
```

**Aha:** Cloudflare Workers und Pages Functions koennen **keine direkten
TCP-/SMTP-Verbindungen** oeffnen. Wer aus Workers Email versenden will,
braucht einen HTTPS-Email-Provider (Resend, Brevo, MailChannels, AWS SES
mit eigener API-Bridge, …). Die eigene Brand-Domain wird dabei nicht
geopfert: Resend signiert die Mails mit DKIM-Schluesseln der eigenen
Domain, der Absender bleibt `no-reply@deine-domain.com`.

---

## 4. Brand- und Konto-Strategie

Wenn das Setup spaeter fuer mehrere Marken laufen soll (`LifeFlow360`,
`FitFlow360`, `EqoFlow360` im Beispiel), stellt sich die Frage:
**ein Konto pro Dienst oder mehrere?**

### Empfehlung: ein Konto pro Dienst, Trennung auf Resource-Ebene

```text
Cloudflare    1 Konto, N Pages-Projekte (jeweils eigene D1 + KV + Secrets + Domain)
Resend        1 Konto, N verifizierte Domains, N API-Keys
IONOS         1 Konto, N Domains, N DNS-Zonen
Payment-PSP   1 Konto, N Produkte, N Webhook-Destinations
```

**Pro:**

- Eine Login-Identitaet pro Dienst statt 3-fach Passwort-Management.
- Konsolidierte Abrechnung pro Dienst.
- Free-Tier-Kontingente werden geteilt — fuer den Start meist ueberreichlich.

**Contra (akzeptabel):**

- Ein Account-Kompromiss trifft alle Brands.
- Beim Verkauf einer einzelnen Brand muss man Resourcen aus dem Account
  herausloesen.

**Wann lieber ein eigenes Konto pro Brand:**

- Brands sind eigene Rechtspersonen (verschiedene GmbHs).
- Compliance-Anforderung trennt die Datenstroeme strikt.
- Verkauf einzelner Brands ist konkret geplant.

---

## 5. Cloudflare-Pages-Projekt per CLI anlegen

**Lesson learned — den Dashboard-Wizard meiden.** Cloudflare bietet im
Dashboard einen "Connect to Git"-Wizard fuer Workers/Pages. Mit
`functions/`-Ordner und `pages_build_output_dir`-Konfig in `wrangler.toml`
laeuft der Wizard nicht zuverlaessig: er deployt als **Worker** statt als
**Pages**, sein Default-Deploy-Befehl `npx wrangler deploy` passt nicht
zur Pages-Konfig, und beim Anpassen des Deploy-Commands fehlt der
Projekt-Anlage-Schritt. **Loesung: CLI von Anfang an.**

### 5.1 Wrangler installieren und einloggen

```powershell
# Empfohlen: ueber npx (Wrangler wird bei Bedarf gecacht)
npx wrangler login
```

Wrangler oeffnet den Browser → Cloudflare zeigt "Wrangler wants to access
your account" → Zugriff fuer **ein Konto** gewaehren (nicht "all
accounts"). Browser-Tab schliesst sich, Terminal zeigt
`Successfully logged in.` Das Login-Token bleibt in
`%APPDATA%\xdg.config\.wrangler\` aktiv, bis `npx wrangler logout`.

### 5.2 Pages-Projekt anlegen

```powershell
npx wrangler pages project create lifeflow360-api `
    --production-branch main `
    --compatibility-date 2024-11-01
```

**Lesson learned — `--compatibility-date` ist Pflicht.** Ohne diese Flag
haengt der Befehl an einer **unsichtbaren** interaktiven Frage. Es gibt
keine Eingabeaufforderung, der Cursor blinkt, nichts passiert. Wir haben
das beim ersten Setup mehrere Minuten lang gesucht.

`2024-11-01` ist ein guter Standardwert — gibt der Runtime moderne
Features (Node.js-compat, neue Workers-APIs) ohne brand-neue Features,
die noch nicht stabil sein koennten.

Erwartete Ausgabe:

```text
✨ Successfully created the 'lifeflow360-api' project.
   It will be available at https://lifeflow360-api.pages.dev/
   once you create your first deployment.
```

Pruefen:

```powershell
npx wrangler pages project list
```

---

## 6. D1 und KV anlegen, Bindings konfigurieren

### 6.1 D1-Datenbank anlegen

```powershell
npx wrangler d1 create lifeflow360-prod
```

Erwartete Ausgabe:

```text
✅ Successfully created DB 'lifeflow360-prod' in region WEUR
[[d1_databases]]
binding = "lifeflow360_prod"
database_name = "lifeflow360-prod"
database_id = "6229e4e5-aa74-4f23-b24a-85764f5ae210"
```

**Region `WEUR`** (Western Europe): naehe zum deutschen Kundenstamm,
DSGVO-relevante Datenresidenz, Default-Wahl fuer EU-Accounts.

Die `database_id` notieren — sie wird gleich in `wrangler.toml` eingetragen.

### 6.2 KV-Namespace anlegen

```powershell
npx wrangler kv namespace create lifeflow360-rate-limit
```

Erwartete Ausgabe:

```text
🌀 Creating namespace with title "lifeflow360-rate-limit"
✨ Success!
[[kv_namespaces]]
binding = "lifeflow360_rate_limit"
id = "c8ed9bb46a544855ab0cb2ba5c565263"
```

KV nutzt man hier typischerweise fuer Rate-Limit-Zaehler pro IP/Email —
KV-Werte haben automatische TTL, kein manuelles Aufraeumen.

### 6.3 `wrangler.toml` mit echten IDs und korrekten Binding-Namen

```toml
name = "lifeflow360-api"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "public"

[vars]
BRAND_ID = "lifeplus"
APP_URL = "https://www.lifeflow360.app/app/"
ALLOWED_ORIGINS = "https://www.lifeflow360.app"
COOKIE_DOMAIN = ".lifeflow360.app"
SESSION_TTL_DAYS = "30"
MAGIC_LINK_TTL_MINUTES = "15"
DEVICE_LIMIT = "3"
MAIL_FROM = "no-reply@lifeflow360.app"
MAIL_FROM_NAME = "LifeFlow360"

[[d1_databases]]
binding = "DB"
database_name = "lifeflow360-prod"
database_id = "6229e4e5-aa74-4f23-b24a-85764f5ae210"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "c8ed9bb46a544855ab0cb2ba5c565263"
```

**Lesson learned — Bindings umbenennen.** Wrangler schlaegt automatisch
`lifeflow360_prod` und `lifeflow360_rate_limit` als `binding` vor (von
den Resource-Namen abgeleitet). Unser Code referenziert aber `env.DB`
und `env.RATE_LIMIT`. Wer die Vorschlaege uebernimmt, hat zur Laufzeit
`env.DB === undefined` — und jede DB-Operation wirft. Immer auf die im
Code erwarteten Namen umbenennen.

---

## 7. Schema einspielen und erstes Deployment

### 7.1 Schema in die remote D1 spielen

```powershell
npx wrangler d1 execute lifeflow360-prod `
    --remote `
    --file=migrations/0001_init.sql
```

Wrangler fragt zur Bestaetigung:

```text
✔ ⚠️ This process may take some time, during which your D1 database
will be unavailable. Ok to proceed? ... yes
```

Mit `y` bestaetigen.

Erwartete Ausgabe:

```text
🌀 Executing on remote database lifeflow360-prod (6229e4e5-aa74-4f23-b24a-85764f5ae210)
🚣 Executed 16 queries in 3.88ms (25 rows read, 35 rows written)
```

### 7.2 Erstes Deployment

```powershell
npx wrangler pages deploy public `
    --project-name lifeflow360-api `
    --commit-dirty true
```

Was die Optionen bedeuten:

- `public` — der lokale Static-Asset-Ordner; bei API-only-Projekten
  reicht eine Mini-`index.html` als Platzhalter.
- `--project-name` muss exakt mit dem Cloudflare-Projektnamen
  uebereinstimmen.
- `--commit-dirty true` erlaubt Deployment mit uncommitteten lokalen
  Aenderungen.
- Wrangler liest `functions/` automatisch und bundelt TypeScript-Endpoints.

Erwartete Ausgabe:

```text
✨ Compiled Worker successfully
✨ Success! Uploaded 1 files (0.95 sec)
✨ Uploading Functions bundle
🌎 Deploying...
✨ Deployment complete! Take a peek over at https://01a07896.lifeflow360-api.pages.dev
```

Es entstehen zwei URLs pro Deploy:

```text
https://<hash>.lifeflow360-api.pages.dev    konkreter Deploy-Snapshot
https://lifeflow360-api.pages.dev           Production-Alias, immer aktuell
```

---

## 8. Resend einrichten

### 8.1 Account und Domain anlegen

```text
https://resend.com  ->  Sign Up (Brand-uebergreifende Admin-Email)
Dashboard  ->  Domains  ->  Add Domain  ->  lifeflow360.app
Region:  EU (Frankfurt) waehlen, falls verfuegbar — DSGVO-Naehe
```

Resend zeigt jetzt **3 DNS-Records**, die in IONOS gesetzt werden muessen:

```text
DKIM            TXT   resend._domainkey   p=<Base64-Public-Key>
Bounce-MX       MX    send                feedback-smtp.eu-west-1.amazonses.com   Prio 10
Bounce-SPF      TXT   send                v=spf1 include:amazonses.com ~all
```

**Aha — warum `send.<domain>`:** Resend nutzt unter der Haube Amazon SES
als Versand-Backbone. Bounce-Mails (Empfaenger nicht erreichbar etc.)
muessen zurueck zu Resend. Resend richtet dafuer eine eigene
Bounce-Subdomain `send.<deine-domain>` ein. Dort liegen SPF (welche
Server duerfen senden) und MX (wer empfaengt die Bounces). Die
Root-Domain bleibt unangetastet — wenn dort schon ein SPF-Record fuer
IONOS-Postfach existiert, bleibt er erhalten.

### 8.2 DMARC (optional, empfohlen)

Resend schlaegt oft auch einen DMARC-Record vor. Wenn nicht, manuell
nachziehen:

```text
TXT   _dmarc   v=DMARC1; p=none; rua=mailto:dmarc@lifeflow360.app
```

`p=none` reportet nur, blockt nicht — sicherer Start. Spaeter auf
`p=quarantine` oder `p=reject` hochstufen, wenn alle Mail-Sender sauber
signieren.

### 8.3 API-Key (erst nach Verifikation)

**Erst** nachdem die DNS-Records gesetzt und Resend die Domain als
`Verified` anzeigt:

```text
Resend Dashboard  ->  API Keys  ->  Create API Key
Name:        LifeFlow360 Production
Permissions: Sending access
Domain:      lifeflow360.app
```

Der API-Key ist **nur einmal sichtbar** — sofort kopieren und gleich in
Cloudflare als Secret hinterlegen (Abschnitt 11).

---

## 9. IONOS-DNS-Records

`https://my.ionos.de  ->  Domains & SSL  ->  lifeflow360.app  ->  DNS`

Fuenf Records eintragen (vier Pflicht + DMARC optional):

```text
Typ      Hostname            Wert                                            TTL
─────────────────────────────────────────────────────────────────────────────────
CNAME    api                 lifeflow360-api.pages.dev                       1h
TXT      resend._domainkey   p=MIGfMA0GCSqGSIb3...   (von Resend)            1h
MX       send                feedback-smtp.eu-west-1.amazonses.com  P=10     1h
TXT      send                v=spf1 include:amazonses.com ~all               1h
TXT      _dmarc              v=DMARC1; p=none; rua=mailto:dmarc@...          1h
```

**Lesson learned — IONOS-TTL.** IONOS hat keine "Auto"-Option, sondern
diskrete Werte. **1 Stunde** ist guter Default. Fuer das erste Setup
darf man auch 15 Minuten waehlen (schnellere Korrekturen bei
Tippfehlern). Spaeter auf 1h oder 24h hochsetzen.

---

## 10. Custom Domain in Cloudflare und TLS

Im Cloudflare-Dashboard:

```text
Workers & Pages  ->  lifeflow360-api  ->  Tab "Custom domains"
"Set up a custom domain"
Domain:  api.lifeflow360.app
```

Cloudflare zeigt dann **zwei Optionen**:

```text
Cloudflare-DNS       "DNS-Uebertragung starten"
                     -> Komplette Domain zu Cloudflare uebertragen
                     -> WOLLEN WIR NICHT — IONOS bleibt DNS-Provider

Mein DNS-Anbieter    "CNAME-Einrichtung beginnen"
                     -> Korrekte Wahl — CNAME aus Abschnitt 9 reicht
```

Klick auf **`Mit der CNAME-Einrichtung beginnen`**. Cloudflare zeigt dann
den erwarteten CNAME-Wert (meist `lifeflow360-api.pages.dev`, manchmal
einen Hash). Wenn der DNS-Record in IONOS bereits steht (Abschnitt 9),
verifiziert Cloudflare automatisch innerhalb von 1-5 Minuten und stellt
ein TLS-Zertifikat aus. Status springt von `Pending` zu `Active`.

---

## 11. Secrets sicher setzen

Fuenf Secrets pro Pages-Projekt im Beispiel:

```text
PADDLE_API_KEY            Server-zu-Server-Aufrufe an Paddle
PADDLE_WEBHOOK_SECRET     Verifikation der Webhook-Signaturen
APP_SESSION_SECRET        reserviert fuer kuenftiges Session-HMAC
MAGIC_LINK_SECRET         reserviert fuer kuenftiges Magic-Link-HMAC
RESEND_API_KEY            Email-Versand ueber Resend
```

### 11.1 Lesson learned — Variable + Pipe statt interaktive Eingabe

Naive Variante (die uns Spuren in Chat-Logs eingebracht hat):

```powershell
# NICHT EMPFOHLEN
$session = -join ((1..32) | ForEach-Object { '{0:X2}' -f (Get-Random -Maximum 256) })
Write-Host "APP_SESSION_SECRET: $session"     # <- landet in Shell-History & Chat
npx wrangler pages secret put APP_SESSION_SECRET --project-name lifeflow360-api
# Prompt: Wert einfuegen (Clipboard) — sichtbar wenn man scrollt oder Logs teilt
```

**Bessere Variante — Wert generieren, direkt per Pipe einreichen, nie
anzeigen:**

```powershell
# 32-Byte Hex (64 Zeichen) lokal generieren und direkt an wrangler pipen
$secret = -join ((1..32) | ForEach-Object { '{0:X2}' -f (Get-Random -Maximum 256) })
$secret | npx wrangler pages secret put APP_SESSION_SECRET --project-name lifeflow360-api

# Variable aus dem Scope loeschen, damit sie nicht in der Shell-History bleibt
Remove-Variable secret
```

Vorteile:

- Wert wird nirgends sichtbar — kein `Write-Host`, kein Clipboard.
- Keine Eingabeaufforderung, in die man versehentlich `Strg+V` aus dem
  falschen Buffer einfuegt.
- Reproduzierbar: derselbe Befehl funktioniert in einem PowerShell-Skript.

Fuer fremd-erzeugte Secrets (Paddle-API-Key, Resend-API-Key) den Wert
einmalig in eine **lokale, gitignored** Textdatei legen und per Pipe
einreichen:

```powershell
Get-Content secret.txt | npx wrangler pages secret put PADDLE_API_KEY --project-name lifeflow360-api
Remove-Item secret.txt
```

Erwartete Bestaetigung pro Secret:

```text
🌀 Creating the secret for the Pages project "lifeflow360-api" (production)
✨ Success! Uploaded secret APP_SESSION_SECRET
```

### 11.2 Plain Variables vs. Secrets

```text
Plain (in wrangler.toml [vars])    sichtbar im Pages-Dashboard,
                                    OK fuer nicht-sensible Konfig
Secret (per wrangler secret put)   Encrypted-at-rest,
                                    nicht im Dashboard sichtbar
```

Faustregel: alles, was man "rotieren" wuerde, gehoert in `secret`.
Alles, was Teil der Architektur-Konfig ist (Brand-ID, Cookie-Domain,
TTLs), kann in `[vars]`.

---

## 12. Verifikation und Smoke-Tests

### 12.1 DNS-Propagation pruefen

```powershell
nslookup -type=CNAME api.lifeflow360.app
nslookup -type=TXT   resend._domainkey.lifeflow360.app
nslookup -type=MX    send.lifeflow360.app
nslookup -type=TXT   send.lifeflow360.app
```

Erwartet: nicht-autorisierende Antworten mit den gesetzten Werten.

### 12.2 API-Smoke-Test

```powershell
curl.exe -i https://api.lifeflow360.app/api/me
```

**Lesson learned — `curl.exe`, nicht `curl`.** In PowerShell ist `curl`
ein Alias auf `Invoke-WebRequest`, der andere Header-Formate ausgibt
und Defaults setzt, die nicht dem `curl`-Verhalten entsprechen.

Erwartete Antwort:

```text
HTTP/2 200
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{"authenticated":false,"entitlements":[],"deviceLimit":3,"activeDevices":0}
```

Wenn das so kommt: Pages-Projekt + D1 + KV + Functions + Routing +
Custom-Domain + TLS sind verdrahtet und funktional.

### 12.3 D1 inspizieren

```powershell
npx wrangler d1 execute lifeflow360-prod --remote `
    --command "SELECT name FROM sqlite_master WHERE type='table'"

npx wrangler d1 execute lifeflow360-prod --remote `
    --command "SELECT * FROM users"

npx wrangler d1 execute lifeflow360-prod --remote `
    --command "SELECT id, type, processed_at FROM webhook_events ORDER BY received_at DESC LIMIT 10"
```

### 12.4 Webhook manuell testen

Im Payment-Provider-Dashboard (im Beispiel Paddle):

```text
Notifications  ->  deine Destination  ->  "Send test event"
```

Im Provider-Log sollte `Status: Delivered` mit HTTP `200` stehen. In
den Cloudflare-Logs unter `Workers & Pages -> <project> -> Functions ->
Real-time logs` sieht man den POST mit Status `200` und keine
ERROR-Lines.

---

## 13. Code-Bausteine

Die folgenden Snippets sind das Minimum, mit dem die Hybrid-Topologie
sauber laeuft. Sprachfremde Konventionen (z.B. PHP, Python) lassen sich
analog uebernehmen.

### 13.1 CORS-Middleware fuer Cross-Origin

`functions/_middleware.ts` — explizite Origin-Whitelist mit
`credentials: include`:

```typescript
import type { Env } from './env';

function allowedOrigins(env: Env): string[] {
  const raw = (env as unknown as { ALLOWED_ORIGINS?: string }).ALLOWED_ORIGINS;
  if (!raw) return ['https://www.lifeflow360.app'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = allowedOrigins(env);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...cors, 'cache-control': 'no-store' },
    });
  }

  const response = await next();
  if (Object.keys(cors).length > 0) {
    const merged = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) merged.set(k, v);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: merged,
    });
  }
  return response;
};
```

**Aha:** Die Origin-Whitelist kommt aus einer Env-Variable
(`ALLOWED_ORIGINS`), damit pro Brand/Deployment unterschiedliche Origins
erlaubt werden koennen. Wildcards (`*`) sind mit
`Allow-Credentials: true` nicht erlaubt — deshalb Reflektion der
gewuenschten Origin.

### 13.2 Session-Cookies mit Parent-Domain

`functions/_lib/cookies.ts` — Cookies fuer cross-subdomain (z.B. von
`api.lifeflow360.app` setzen, von `www.lifeflow360.app` lesbar):

```typescript
import type { Env } from '../env';

export const SESSION_COOKIE = 'session';

interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  httpOnly?: boolean;
  secure?: boolean;
  domain?: string;
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts: string[] = [`${name}=${value}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure !== false) parts.push('Secure');
  if (options.domain) parts.push(`Domain=${options.domain}`);
  return parts.join('; ');
}

export function sessionCookieHeader(env: Env, value: string, maxAgeSeconds: number): string {
  return serializeCookie(SESSION_COOKIE, value, {
    maxAgeSeconds,
    sameSite: 'Lax',
    httpOnly: true,
    secure: true,
    domain: env.COOKIE_DOMAIN || undefined,    // ".lifeflow360.app"
  });
}
```

**Lesson learned — kein `__Host-`-Praefix.** Der `__Host-`-Praefix
verbietet das `Domain`-Attribut. Wer Cookies subdomain-uebergreifend
lesen will, kann ihn deshalb nicht setzen. Stattdessen
`Domain=.parent.com` (mit fuehrendem Punkt) — dann sind die Cookies auf
allen Subdomains verfuegbar.

### 13.3 Webhook-Signatur-Verifikation

`functions/_lib/paddle-sig.ts` — HMAC-SHA256 mit Timestamp-Skew-Check:

```typescript
import { hmacSha256Hex, timingSafeEqual } from './crypto';

// Paddle Billing webhook signature format:
//   Paddle-Signature: ts=1700000000;h1=<hex-hmac-sha256>
// The signed payload is `${ts}:${rawBody}`.

const MAX_SKEW_MS = 5 * 60_000;

export async function verifyPaddleSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
  now: number,
): Promise<{ valid: boolean; reason?: string }> {
  if (!signatureHeader) return { valid: false, reason: 'missing_signature' };

  const parts = signatureHeader.split(';').map((p) => p.trim());
  let ts: string | null = null;
  let h1: string | null = null;
  for (const part of parts) {
    if (part.startsWith('ts=')) ts = part.slice(3);
    else if (part.startsWith('h1=')) h1 = part.slice(3);
  }
  if (!ts || !h1) return { valid: false, reason: 'malformed_signature' };

  const tsMs = Number(ts) * 1000;
  if (!Number.isFinite(tsMs)) return { valid: false, reason: 'bad_timestamp' };
  if (Math.abs(now - tsMs) > MAX_SKEW_MS) return { valid: false, reason: 'timestamp_skew' };

  const expected = await hmacSha256Hex(secret, `${ts}:${rawBody}`);
  if (!timingSafeEqual(expected, h1)) return { valid: false, reason: 'bad_hmac' };

  return { valid: true };
}
```

**Aha:**

- Der **rohe** Request-Body wird signiert, nicht das JSON-geparste
  Objekt. Im Webhook-Handler also `await request.text()`, **bevor**
  ein `JSON.parse()` passiert.
- `MAX_SKEW_MS = 5 Min` schuetzt gegen Replay-Attacken. Empfehlung
  der meisten PSPs.
- `timingSafeEqual` statt `===` verhindert Timing-Side-Channels.

### 13.4 Customer-Lookup mit Email-Fallback

Realer Edge-Case: ein User loggt sich per Magic-Link ein, hat aber in
unserer D1 keinen `paddle_customer_id` (z.B. weil der Subscription-
Webhook eines fruehen Test-Kaufs verpasst wurde). Der direkte
Customer-Portal-Aufruf wuerde scheitern.

Loesung: D1-Lookup mit Email-Fallback zur Paddle-API.
`functions/api/billing/portal.ts`:

```typescript
let customerId: string | null = null;

// 1. D1-Lookup
const cached = await env.DB.prepare(
  `SELECT paddle_customer_id FROM subscriptions
     WHERE user_id = ? AND paddle_customer_id IS NOT NULL
     ORDER BY updated_at DESC LIMIT 1`,
)
  .bind(ctx.user.id)
  .first<{ paddle_customer_id: string }>();

if (cached?.paddle_customer_id) {
  customerId = cached.paddle_customer_id;
} else {
  // 2. Fallback: Paddle-API per Email durchsuchen
  customerId = await findPaddleCustomerByEmail(env, apiBase, ctx.user.email);
}

if (!customerId) return error(404, 'no_customer');

// 3. Portal-Session erzeugen
const res = await fetch(
  `${apiBase}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
  {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.PADDLE_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  },
);

async function findPaddleCustomerByEmail(
  env: Env,
  apiBase: string,
  email: string,
): Promise<string | null> {
  const url = `${apiBase}/customers?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${env.PADDLE_API_KEY}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: Array<{ id?: string; email?: string }> };
  const match = data.data?.find((c) => c.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}
```

**Aha:** Der Fallback bekommt nur Lese-Zugriff auf die
Paddle-Customer-API, kein Schreib-Zugriff. Wer dem API-Key keine
Customer-WRITE-Permission gibt, ist trotzdem geschuetzt.

---

## 14. Haeufige Fallstricke

### "Befehl haengt, kein Output"

**Symptom:** `npx wrangler pages project create` reagiert nicht,
Cursor blinkt, keine Eingabeaufforderung.

**Ursache:** Wrangler wartet auf einen interaktiven Input, den es nicht
sichtbar anfordert.

**Loesung:** `--compatibility-date 2024-11-01` als Flag explizit
mitgeben. Generell bei Wrangler: alle relevanten Flags **immer**
mitgeben, statt sich auf Defaults zu verlassen.

### "Curl gibt komische Header zurueck"

**Symptom:** `curl https://...` in PowerShell zeigt Outputs, die nicht
wie ein HTTP-Response aussehen.

**Ursache:** PowerShell-`curl` ist ein Alias auf `Invoke-WebRequest`.

**Loesung:** `curl.exe` (mit `.exe`) verwenden — dann startet der echte
Curl-Binary.

### "Es funktioniert lokal, aber das Deploy erkennt nichts"

**Symptom:** Lokaler `wrangler pages dev` funktioniert, aber das echte
Deploy zeigt `env.DB === undefined`.

**Ursache:** Die `binding`-Namen in `wrangler.toml` matchen nicht den
Code (Wrangler hat sie auto-generiert, z.B. `lifeflow360_prod`, Code
erwartet `DB`).

**Loesung:** In `wrangler.toml` die `binding`-Namen manuell auf die im
Code erwarteten Werte setzen.

### "Cookie wird auf Subdomain nicht gefunden"

**Symptom:** Frontend setzt Session-Cookie via API-Subdomain. Im
Marketing-Subdomain ist der Cookie nicht da.

**Ursache 1:** `__Host-`-Praefix verbietet `Domain`-Attribut → Cookie
nur auf der setzenden Subdomain.

**Ursache 2:** `Domain` nicht auf die Parent-Domain mit fuehrendem
Punkt gesetzt.

**Loesung:** Praefix entfernen, `Domain=.parent.com` setzen, `Secure`
und `HttpOnly` beibehalten. Siehe [Abschnitt 13.2](#132-session-cookies-mit-parent-domain).

### "CORS error im Browser"

**Symptom:** Network-Tab zeigt `CORS error`, obwohl die API erreichbar
ist.

**Ursache:** `ALLOWED_ORIGINS` enthaelt nicht exakt den Frontend-Origin
(Tippfehler, fehlendes Protokoll, ueberflüssiges Trailing-Slash).

**Loesung:** Exakter String-Match — `https://www.lifeflow360.app` ohne
`/` am Ende, mit `https://`, ohne Subdomain-Vertauschung. Pruefen im
Pages-Dashboard unter `Settings → Environment variables`.

### "Webhook 401 bad_signature"

**Symptom:** Provider zeigt Failed-Webhooks mit HTTP 401, eigene Logs
zeigen `bad_signature`.

**Ursache:** `PADDLE_WEBHOOK_SECRET` stimmt nicht (Tippfehler, alte
Version) oder der Code parst den Body, **bevor** signiert wird (gehasht
wird dann etwas anderes als das, was Paddle signiert hat).

**Loesung:** Im Webhook-Handler `const rawBody = await request.text()`
**zuerst**, dann erst `JSON.parse(rawBody)`. Das gleiche `rawBody`-String
in die HMAC-Berechnung geben.

### "Magic-Link kommt nicht an"

**Symptom:** Login-Mail wird angefordert, im Postfach kommt nichts an
(auch nicht im Spam).

**Ursache moeglich:** DKIM/SPF-DNS noch nicht propagiert, Resend
verweigert den Versand. Oder Resend-API-Key nicht in Cloudflare gesetzt.

**Loesung:**

```powershell
# DNS-Propagation pruefen
nslookup -type=TXT resend._domainkey.lifeflow360.app

# Resend-Dashboard pruefen: Domain Status muss "Verified" sein
# Resend Logs pruefen: zeigt Versand-Versuche an

# Cloudflare-Logs pruefen
# Workers & Pages -> lifeflow360-api -> Functions -> Real-time logs
```

### "Was lokal kein Problem ist, ist im Live-Deploy ploetzlich kaputt"

**Symptom:** Lokal mit `wrangler pages dev` funktioniert alles, im
echten Deploy schlaegt etwas fehl.

**Ursache moeglich:**

- Secrets sind im echten Deploy gesetzt, im lokalen Dev nicht (oder
  umgekehrt).
- D1-Schema unterscheidet sich zwischen lokal und remote (`--local`
  vs. `--remote`).

**Loesung:** Beide D1-Instanzen vergleichen:

```powershell
npx wrangler d1 execute lifeflow360-prod --local  --command "SELECT name FROM sqlite_master"
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT name FROM sqlite_master"
```

---

## 15. Neuen Brand klonen — Rezept

Wenn das Setup einmal steht, ist eine zweite Brand ein
~30-Minuten-Job. Vorausgesetzt sind: Domain registriert, Produkte im
Payment-Provider angelegt, eigene `brands.json`-Eintraege.

```powershell
# 1. Cloudflare-Resources anlegen
npx wrangler pages project create fitflow360-api --production-branch main --compatibility-date 2024-11-01
npx wrangler d1 create fitflow360-prod
npx wrangler kv namespace create fitflow360-rate-limit

# 2. Eigene wrangler.fitflow.toml mit den neuen IDs + Brand-Vars

# 3. Schema einspielen
npx wrangler d1 execute fitflow360-prod --remote --file=migrations/0001_init.sql

# 4. Deployment
npx wrangler pages deploy public --project-name fitflow360-api --commit-dirty true

# 5. Secrets (per Pipe, nicht interaktiv!)
$session = -join ((1..32) | ForEach-Object { '{0:X2}' -f (Get-Random -Maximum 256) })
$session | npx wrangler pages secret put APP_SESSION_SECRET --project-name fitflow360-api
# ... fuer MAGIC_LINK_SECRET, RESEND_API_KEY, PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET
Remove-Variable session

# 6. Resend-Domain hinzufuegen, DNS-Records sammeln

# 7. IONOS-DNS-Records fuer fitflow360.de:
#    api  CNAME  fitflow360-api.pages.dev
#    resend._domainkey  TXT  p=<DKIM>
#    send  MX    feedback-smtp.eu-west-1.amazonses.com  Prio 10
#    send  TXT   v=spf1 include:amazonses.com ~all
#    _dmarc  TXT  v=DMARC1; p=none; rua=mailto:dmarc@fitflow360.de

# 8. Cloudflare Custom Domain api.fitflow360.de  (Mein DNS-Anbieter -> CNAME)

# 9. Payment-Provider Webhook-Destination auf
#    https://api.fitflow360.de/api/paddle/webhook

# 10. Smoke-Test
curl.exe -i https://api.fitflow360.de/api/me
```

---

## 16. Wo weiterlesen

- Cloudflare Pages Functions: <https://developers.cloudflare.com/pages/functions/>
- Cloudflare D1: <https://developers.cloudflare.com/d1/>
- Cloudflare KV: <https://developers.cloudflare.com/kv/>
- Resend Docs: <https://resend.com/docs>
- DMARC Tools: <https://dmarc.org/dmarc-tools/>
- Paddle Webhook Format: <https://developer.paddle.com/webhooks/signature-verification>

### Verwandte Dokumente in diesem Repo

- `_doc/Cloudflare, Resend und IONOS - Setup.md` — projekt-spezifischer,
  umfassender Walkthrough mit allen Zwischenschritten
- `_doc/cloudflare-setup.md` — frueher Setup-Stand, hier vollstaendig
  konsolidiert
- `_doc/Product, Pricing and Discount-Codes in Paddle.md` — Paddle-Side
  Setup (Produkte, Preise, Discount-Codes, Test-Karten)
- `_doc/Produkt-Namenskonvention.md` — SKU-Schema fuer Multi-Brand-Produkte

---

## Annahmen

- Die hier beschriebene Topologie ist auf **EU-Datenresidenz** ausgelegt
  (Cloudflare WEUR, Resend EU/Frankfurt). Fuer global verteilte Setups
  ggf. Region anders waehlen.
- Beispielwerte (`lifeflow360`, IDs, Tokens) sind aus einem real
  durchgespielten Setup uebernommen — fuer eigene Projekte ersetzen.
- Wrangler-Version: getestet mit `wrangler@4.93.1`. Aeltere Versionen
  (3.x) hatten teilweise abweichende CLI-Flags.
- Paddle-Beispielcode bezieht sich auf **Paddle Billing v2**, nicht auf
  das aeltere "Classic"-Produkt.
