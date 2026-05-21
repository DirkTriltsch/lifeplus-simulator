# Cloudflare, Resend und IONOS – Setup

Vollstaendige Anleitung, wie die API-Infrastruktur fuer die LifeFlow360-Brand
aufgesetzt wurde. Enthaelt nur Befehle, die in der Praxis funktioniert haben,
mit den passenden Erklaerungen warum man etwas braucht oder explizit weglaesst.

Mit Vorlage fuer FitFlow360 und EqoFlow360.

Stand: 2026-05-21.

---

## 1. Architektur-Ueberblick

```text
www.lifeflow360.app   IONOS (SFTP-Hosting)
  /                   Marketing-Site (HTML, CSS, JS)
  /app/               React-App
  /pricing.html       Paddle-Checkout-Seite

api.lifeflow360.app   Cloudflare Pages Functions
                      CNAME -> lifeflow360-api.pages.dev
  /api/me
  /api/auth/*
  /api/paddle/webhook
  /api/devices/*
  /api/billing/*

Resend                Versand der Magic-Link-Mails
                      Absender: no-reply@lifeflow360.app
                      SPF/DKIM liegen in IONOS-DNS

Paddle Sandbox        Produkte, Preise, Discount-Codes, Webhook
                      Merchant of Record fuer USt./Rechnung
```

**Warum diese Topologie:**

- IONOS hat schon einen Vertrag, die Marketing-Site lebt dort gut
- Cloudflare bietet ein generoeses Free-Tier fuer die API (100.000 Requests/Tag)
- Cloudflare Workers/Pages-Functions koennen nichts direkt per SMTP versenden — deshalb Resend als HTTPS-Bridge zu unserer eigenen Brand-Domain
- Paddle als MoR macht uns das Steuer-Thema einfach (USt./Reverse-Charge automatisch)

---

## 2. Brand-Strategie: ein Konto oder mehrere?

**Entscheidung: ein gemeinsames Konto pro Dienst.**

```text
Cloudflare    1 Konto, 3 Pages-Projekte (lifeflow360-api, fitflow360-api, ...)
Resend        1 Konto, 3 verifizierte Domains, 3 API-Keys
IONOS         1 Konto, 3 Domains, 3 DNS-Zonen
Paddle        1 Konto, 3 Produkte, 3 Webhook-Destinations
```

**Warum:**

- Trennung pro Brand findet auf **Resource-Ebene** statt (eigenes Projekt,
  eigene DB, eigene Domain), nicht auf Konto-Ebene
- Eine Login-Identitaet je Dienst, weniger Passwort-Management
- Konsolidierte Rechnungen
- Free-Tier-Kontingente teilen sich alle Brands (fuer den Start ueberreichlich)

**Wann waere ein eigenes Konto pro Brand sinnvoll?**

- Wenn die Brands rechtlich getrennten Geschaeftsfeldern entsprechen
  (z.B. unterschiedliche GmbHs)
- Wenn eine Brand spaeter verkauft werden soll und ein sauberer Account-
  Transfer wichtig ist
- Wenn pro Brand eigene Auszahlungskonten / Steuerprofile noetig sind

Solange alle drei Brands von **Dirk Triltsch** als Einzelunternehmer gefuehrt
werden, ist Konto-Teilung unproblematisch.

---

## 3. Mentales Modell: Paddle hat zwei Credentials

Ein Punkt, der haeufig verwirrt — Paddle nutzt zwei voellig unterschiedliche
Authentifizierungs-Werte:

```text
Client-side Token   "test_fee36ee3e68b2f654e1ad01ab59"
                    oeffentlich, im Browser-JavaScript einsehbar
                    in pricing.html als data-Attribut oder JS-Konstante
                    Aufgabe:
                      - Paddle.Checkout.open() initialisieren
                      - Customer sieht Overlay, gibt Discount-Code ein
                      - Customer waehlt Zahlungsmethode
                      - Customer sieht Preise inkl. USt.
                    -> alles in Paddle's Frontend, nicht in unserem Backend

API Key (Server)    privat, nur in Cloudflare Secret
                    in unserem Backend-Code per env.PADDLE_API_KEY
                    Aufgabe (Server-zu-Server-Aufrufe):
                      - Customer-Portal-Link erzeugen (/api/billing/portal)
                      - Customer-Email nachladen wenn Webhook sie nicht liefert
                      - spaeter ggf. Subscription per Code beenden
                    -> verlaesst nie unseren Server
```

Wer was im Customer Journey **tatsaechlich macht:**

| Customer-Aktion                  | Wer steuert das?           |
|----------------------------------|----------------------------|
| Plan klicken                     | unsere pricing.html        |
| Email eingeben                   | Paddle-Overlay (Client-Token) |
| Discount-Code eingeben           | Paddle-Overlay (Client-Token) |
| Zahlungsmethode waehlen          | Paddle-Overlay (Client-Token) |
| Preise + USt. sehen              | Paddle-Overlay (Client-Token) |
| Karte / SEPA eintragen           | Paddle-Overlay (Client-Token) |
| Rechnung empfangen               | Paddle-Mail an Customer    |
| Abo verwalten / Karte aktualisieren | Paddle-Customer-Portal (via API Key Link) |
| Notification bei failed payment  | Webhook -> unser Backend   |

Deshalb braucht der **API Key** nur sehr eingeschraenkte Permissions —
mehr dazu im Cloudflare-Secrets-Abschnitt.

---

## 4. Cloudflare – Setup via CLI

Alle Schritte als Befehle im **lokalen Terminal** (PowerShell unter Windows),
nicht im Cloudflare-Browser-Dashboard.

### 4.1 Warum nicht der Dashboard-Wizard?

Cloudflare bietet im Dashboard einen "Connect to Git"-Wizard fuer Workers/Pages.
Mit unserer Projektstruktur (`functions/`-Ordner, `pages_build_output_dir`-
Konfig in wrangler.toml) klappt der Wizard nicht zuverlaessig:

- Er versucht, das Projekt als **Worker** zu deployen, nicht als **Pages**
- Default-Deploy-Command `npx wrangler deploy` passt nicht zu Pages-Config
- Wenn man den Deploy-Command anpasst, fehlt das Projekt-Setup-Step
- Der Wizard kann ein leeres Test-Repo anlegen (statt das existierende zu nutzen)

**Loesung: CLI von Anfang an, dann gibt es keine Mehrdeutigkeiten.**

### 4.2 Voraussetzungen

```text
Cloudflare-Account                vorhanden
Node.js + npm                     installiert (npx kommt mit)
Repo-Verzeichnis                  im Terminal angesteuert
```

### 4.3 Anmelden

```powershell
npx wrangler login
```

**Was passiert:**

- Wrangler oeffnet den Browser
- Cloudflare zeigt "Wrangler wants to access your account"
- Du gewaehrst Zugriff fuer **ein Konto** (nicht "all accounts" — minimaler Scope)
- Browser-Tab schliesst sich, Terminal zeigt `Successfully logged in.`

Das Login-Token wird in `%APPDATA%\xdg.config\.wrangler\` abgelegt und bleibt
gueltig, bis `npx wrangler logout` ausgefuehrt wird.

### 4.4 Pages-Projekt anlegen

```powershell
npx wrangler pages project create lifeflow360-api --production-branch main --compatibility-date 2024-11-01
```

**Wichtig — der versteckte Stolperstein:**

`--compatibility-date` ist **zwingend anzugeben**. Ohne diese Flag haengt der
Befehl an einer unsichtbaren interaktiven Frage, ohne dass eine Eingabe
sichtbar ist. Wir sind bei der ersten Setup-Runde minutenlang darauf reingefallen.

`2024-11-01` ist ein guter Standardwert — gibt der Runtime moderne Features
(Node.js-compat, neue Workers-APIs) ohne brand-neue Features, die noch nicht
stabil sein koennten.

Erwartete Ausgabe:

```text
✨ Successfully created the 'lifeflow360-api' project.
   It will be available at https://lifeflow360-api.pages.dev/
   once you create your first deployment.
```

Pruefen mit:

```powershell
npx wrangler pages project list
```

### 4.5 D1-Datenbank anlegen

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

**Warum Region WEUR** (Western Europe):
- Naehe zum deutschen Kundenstamm = niedrige Latenz
- DSGVO-relevante Datenresidenz in der EU
- Default bei EU-Cloudflare-Accounts ohnehin

**Die `database_id` notieren.** Sie wird in `wrangler.toml` eingetragen.

### 4.6 KV-Namespace anlegen (fuer Rate-Limits)

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

**Wofuer KV:**
- Speichert Rate-Limit-Zaehler pro IP/Email fuer `/api/auth/request-link` und
  `/api/auth/verify-link`
- Schuetzt vor Brute-Force-Login-Versuchen und Email-Spam
- Werte haben automatische TTL, kein manuelles Aufraeumen noetig

### 4.7 wrangler.toml mit echten IDs befuellen — und Binding-Namen ueberschreiben

In `wrangler.toml` die Platzhalter ersetzen:

```toml
[[d1_databases]]
binding = "DB"
database_name = "lifeflow360-prod"
database_id = "6229e4e5-aa74-4f23-b24a-85764f5ae210"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "c8ed9bb46a544855ab0cb2ba5c565263"
```

**Wichtig — die `binding`-Namen aendern.**

Wrangler schlaegt automatisch `lifeflow360_prod` und `lifeflow360_rate_limit`
vor, abgeleitet aus den Resource-Namen. Unser Code in
[functions/env.d.ts](../functions/env.d.ts) referenziert aber `env.DB` und
`env.RATE_LIMIT`.

Wenn man die Vorschlaege uebernimmt, ist `env.DB` zur Laufzeit `undefined` und
jede Datenbank-Operation wirft einen Fehler. Deshalb **immer auf `DB` und
`RATE_LIMIT` umbenennen**.

### 4.8 Schema in D1 einspielen

```powershell
npx wrangler d1 execute lifeflow360-prod --remote --file=migrations/0001_init.sql
```

Wrangler fragt zur Bestaetigung:

```text
✔ ⚠️ This process may take some time, during which your D1 database will be unavailable.
  Ok to proceed? ... yes
```

Mit `y` bestaetigen.

Erwartete Ausgabe:

```text
🌀 Executing on remote database lifeflow360-prod (6229e4e5-aa74-4f23-b24a-85764f5ae210)
🚣 Executed 16 queries in 3.88ms (25 rows read, 35 rows written)
```

Damit sind alle Tabellen angelegt:
- `users`              — Account-Stammdaten
- `subscriptions`      — Paddle-Abos
- `entitlements`       — was darf der User aktuell sehen
- `devices`            — Geraete-Limit-Verwaltung
- `sessions`           — Login-Sessions
- `magic_login_tokens` — Magic-Link-Tokens (gehashed)
- `webhook_events`     — Idempotenz-Sicherung fuer Paddle-Webhooks

### 4.9 Erstes Deployment

```powershell
npx wrangler pages deploy public --project-name lifeflow360-api --commit-dirty true
```

**Was die Optionen bedeuten:**

- `public` — der lokale Static-Asset-Ordner. Enthaelt nur eine Mini-`index.html`
  als API-Landingpage. Marketing und App leben auf IONOS, nicht hier.
- `--project-name` — muss exakt mit dem Cloudflare-Projektnamen uebereinstimmen
- `--commit-dirty true` — erlaubt Deployment mit uncommitteten Aenderungen
  (sonst meckert Wrangler bei lokalen Aenderungen)
- Wrangler liest `functions/` automatisch und bundelt die TypeScript-Endpoints

Erwartete Ausgabe:

```text
✨ Compiled Worker successfully
✨ Success! Uploaded 1 files (0.95 sec)
✨ Uploading Functions bundle
🌎 Deploying...
✨ Deployment complete! Take a peek over at https://01a07896.lifeflow360-api.pages.dev
```

**Zwei URLs entstehen pro Deploy:**

```text
https://<hash>.lifeflow360-api.pages.dev    konkreter Deploy-Snapshot
https://lifeflow360-api.pages.dev           Production-Alias, zeigt immer
                                            auf den aktuellen Production-Deploy
```

Fuer Tests benutzen wir die zweite Variante.

### 4.10 Smoke-Test

```powershell
curl.exe -i https://lifeflow360-api.pages.dev/api/me
```

**Wichtig in PowerShell:** `curl.exe`, nicht `curl`. Letzteres ist ein Alias
auf `Invoke-WebRequest` und gibt andere Header-Formate aus.

Erwartete Antwort:

```text
HTTP/2 200
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{"authenticated":false,"entitlements":[],"deviceLimit":3,"activeDevices":0}
```

Wenn das so kommt, sind Pages-Project + D1 + KV + Functions + Routing alle
verdrahtet und funktional.

### 4.11 Custom Domain einrichten

Im Cloudflare-Dashboard:

```text
Workers & Pages  ->  lifeflow360-api  ->  Tab "Custom domains"
->  Set up a custom domain
->  Domain:  api.lifeflow360.app
->  Continue
```

Cloudflare zeigt dann zwei Optionen:

```text
Cloudflare-DNS         "Uebertragen Sie Ihr DNS zu Cloudflare"
                       -> ganze Domain umziehen, IONOS verliert DNS-Kontrolle
                       -> wollen wir NICHT, IONOS bleibt DNS-Provider

Mein DNS-Anbieter     "Verwenden Sie Ihren derzeitigen DNS-Anbieter.
                      Richten Sie einen CNAME-Eintrag ein."
                      -> das richtige fuer uns
```

Klick auf **"Mit der CNAME-Einrichtung beginnen"**.

Cloudflare zeigt einen CNAME-Wert. In unserem Fall: `lifeflow360-api.pages.dev`.
Diesen in IONOS-DNS setzen (siehe Abschnitt 6).

Sobald der DNS-Record propagiert ist (5-30 Min), verifiziert Cloudflare
automatisch und stellt ein TLS-Zertifikat aus. Im Pages-Custom-Domain-Tab
wechselt der Status von `Pending` zu `Active`.

### 4.12 Secrets setzen

Insgesamt 5 Secrets pro Pages-Projekt. Jedes Secret per `wrangler pages
secret put` setzen — Wrangler fragt interaktiv nach dem Wert:

```powershell
# 1. Session-Secret (zufaellige 32 Bytes Hex)
$session = -join ((1..32) | ForEach-Object { '{0:X2}' -f (Get-Random -Maximum 256) })
npx wrangler pages secret put APP_SESSION_SECRET --project-name lifeflow360-api
# -> $session-Wert in den Prompt einfuegen

# 2. Magic-Link-Secret (analog)
$magic = -join ((1..32) | ForEach-Object { '{0:X2}' -f (Get-Random -Maximum 256) })
npx wrangler pages secret put MAGIC_LINK_SECRET --project-name lifeflow360-api

# 3. Resend-API-Key (aus Resend-Dashboard)
npx wrangler pages secret put RESEND_API_KEY --project-name lifeflow360-api

# 4. Paddle-API-Key (aus Paddle-Sandbox)
npx wrangler pages secret put PADDLE_API_KEY --project-name lifeflow360-api

# 5. Paddle-Webhook-Secret (kommt erst beim Webhook-Setup, siehe Abschnitt 7)
npx wrangler pages secret put PADDLE_WEBHOOK_SECRET --project-name lifeflow360-api
```

**Was jedes Secret tut:**

| Secret | Wofuer | Wann setzen |
|---|---|---|
| `APP_SESSION_SECRET` | Reserviert fuer kuenftige HMAC-Signatur von Session-Tokens | Sofort, vorsorglich |
| `MAGIC_LINK_SECRET` | Reserviert fuer kuenftige HMAC-Signatur von Magic-Links | Sofort, vorsorglich |
| `RESEND_API_KEY` | Versand der Magic-Link-Mails ueber Resend | Sobald Domain in Resend verified ist |
| `PADDLE_API_KEY` | Customer-Portal-Link, Customer-Email-Lookup | Nach Anlage in Paddle Dashboard |
| `PADDLE_WEBHOOK_SECRET` | Verifikation der Webhook-Signatur | Nach Anlage der Webhook-Destination |

Aktuell nicht benutzt, aber gesetzt fuer Stabilitaet:
- `APP_SESSION_SECRET` / `MAGIC_LINK_SECRET` — Magic-Links sind heute ueber
  zufaellige Tokens + SHA-256-Hash gesichert. Wenn wir spaeter auf HMAC-Tokens
  wechseln, sind die Secrets schon da.

---

## 5. Resend – Setup im Browser-Dashboard

### 5.1 Warum Resend, nicht IONOS-SMTP

Cloudflare Workers/Pages-Functions koennen **keine direkten TCP-Verbindungen**
oeffnen, nur HTTPS-Fetch. Der IONOS-SMTP-Server koennen wir also aus unserer
API **nicht direkt ansprechen**.

Resend ist eine HTTPS-Bridge: wir POSTen via HTTP-API, Resend versendet im
Auftrag von `no-reply@lifeflow360.app` ueber sein eigenes SMTP-Backbone
(intern Amazon SES). SPF/DKIM-Eintraege bei IONOS sorgen dafuer, dass Mails
korrekt als "von unserer Brand-Domain" authentifiziert werden.

Free-Tier: 100 Mails/Tag — fuer Tests und kleinen Live-Betrieb mehr als genug.

### 5.2 Account anlegen

`https://resend.com → Sign Up` — mit Admin-Email.

### 5.3 Domain hinzufuegen

```text
Resend Dashboard  ->  Domains  ->  Add Domain
Domain:  lifeflow360.app
Region:  EU (Frankfurt) wenn verfuegbar — DSGVO-Naehe
```

Resend zeigt jetzt **3 DNS-Records** an, die in IONOS gesetzt werden muessen:

```text
DKIM            TXT   resend._domainkey    p=<Base64-Public-Key>
Bounce-MX       MX    send                 feedback-smtp.eu-west-1.amazonses.com  Prio 10
Bounce-SPF      TXT   send                 v=spf1 include:amazonses.com ~all
```

**Warum DKIM auf `resend._domainkey.lifeflow360.app`:**
- Standard-DKIM-Selector-Konvention: `<selector>._domainkey.<domain>`
- Resend signiert ausgehende Mails mit dem privaten Gegenstueck dieses Schluessels
- Empfaengende Mailserver pruefen die Signatur gegen den oeffentlichen Schluessel im DNS

**Warum SPF/MX auf `send.lifeflow360.app`** (Sub-Subdomain):
- Resend nutzt Amazon SES als Versand-Backend
- Bounce-Mails (z.B. "Email-Adresse existiert nicht") muessen wieder zu Resend zurueckkommen
- Resend richtet dafuer eine eigene Bounce-Subdomain `send.<deine-domain>` ein
- Dort liegen SPF (welche Server duerfen senden) und MX (wer empfaengt die Bounces)
- Auf der Root-Domain `lifeflow360.app` wird nichts ueberschrieben — wenn du dort
  schon einen SPF-Record fuer IONOS-Mail hast, bleibt der unangetastet

### 5.4 DMARC — optional, aber empfohlen

Resend schlaegt oft auch einen DMARC-Record vor. Wenn nicht, kann man manuell
nachziehen:

```text
TXT   _dmarc   v=DMARC1; p=none; rua=mailto:mail@triltsch-online.de
```

**Bedeutung:**
- `v=DMARC1` — DMARC-Version
- `p=none` — nur reporten, nicht blocken (sicherer Start)
- `rua=mailto:...` — Reports gehen an diese Adresse
- Spaeter auf `p=quarantine` oder `p=reject` hochstufen, wenn man sicher ist,
  dass alle Mail-Sender (Resend + IONOS-Postfach) sauber konfiguriert sind

### 5.5 Verify-Status pruefen

DNS-Records bei IONOS setzen, 5-30 Minuten warten, dann in Resend `Refresh`.
Status springt von `Pending` zu `Verified`.

Pruefung im Terminal:

```powershell
nslookup -type=TXT resend._domainkey.lifeflow360.app
nslookup -type=TXT send.lifeflow360.app
nslookup -type=MX send.lifeflow360.app
```

Wenn die Werte stimmen, ist Resend bereit.

### 5.6 API-Key erzeugen

**Erst nach Verifikation:**

```text
Resend Dashboard  ->  API Keys  ->  Create API Key
Name:        LifeFlow360 Production
Permissions: Sending access
Domain:      lifeflow360.app
```

**Wichtig:** Der API-Key ist **nur einmal sichtbar** — sofort kopieren und in
Cloudflare als `RESEND_API_KEY` setzen.

### 5.7 Troubleshooting: `RESEND_API_KEY` falsch in Cloudflare gespeichert

Dieser Fehler trat beim ersten LifeFlow360-Sandbox-Test auf.

#### Symptom

Der Kauf in Paddle funktionierte und die Paddle-Rechnung kam an. Der Login nach
dem Kauf zeigte aber:

```text
Link gesendet
```

Die Magic-Link-Mail kam nicht an.

Nach besserem Fehlerhandling im Backend zeigte die App:

```text
Request failed (502): mail_send_failed
```

Im Cloudflare Tail war sichtbar:

```text
POST https://api.lifeflow360.app/api/auth/request-link - Ok
  (error) resend_send_failed {
    status: 400,
    statusText: 'Bad Request',
    from: 'LifeFlow360 <no-reply@lifeflow360.app>',
    toDomain: 'triltsch-online.de',
    body: ''
  }
```

Wichtig: Resend zeigte zu diesem Zeitpunkt keine Logs. Resend hatte den
API-Request schon vor dem Erzeugen einer E-Mail abgelehnt.

#### Was zuerst geprueft wurde

```text
Resend Domain lifeflow360.app     Verified
Resend API-Key                    Sending access
MAIL_FROM in Cloudflare           no-reply@lifeflow360.app
Cloudflare API                    /api/me funktioniert
Magic-Link Endpoint               wird erreicht
```

Damit waren Domain, DNS, Absender und Routing nicht mehr die Hauptverdaechtigen.

#### Direkter Resend-Test vom lokalen Rechner

Um Resend selbst vom Cloudflare-Problem zu trennen, wurde eine lokale
Test-Datei erzeugt:

```powershell
@'
{
  "from": "LifeFlow360 <no-reply@lifeflow360.app>",
  "to": ["dao@triltsch-online.de"],
  "subject": "LifeFlow360 Resend Direkt-Test",
  "text": "Das ist ein direkter Resend API Test."
}
'@ | Set-Content -LiteralPath .\resend-test.json -Encoding utf8
```

Dann wurde der funktionierende Resend-Key lokal gesetzt:

```powershell
$RESEND_API_KEY = "re_DEIN_ECHTER_RESEND_KEY_HIER"
```

Und der Request direkt an Resend gesendet:

```powershell
curl.exe --max-time 30 -i -X POST "https://api.resend.com/emails" `
  -H "Authorization: Bearer $RESEND_API_KEY" `
  -H "Content-Type: application/json" `
  --data-binary "@resend-test.json"
```

Ergebnis:

```json
{"id":"7bc6e82a-46ad-42cb-8418-a3aa4fe337b3"}
```

Die Mail kam in Outlook an. Damit war klar:

```text
Resend selbst funktioniert.
Domain ist verified.
Der echte API-Key funktioniert.
Das Problem liegt in Cloudflare Secret / Eingabe / Deployment.
```

#### Entscheidende Diagnose

Ein temporaerer Diagnose-Endpunkt sendete aus Cloudflare heraus eine minimale
Resend-Testmail und gab nicht den Secret-Wert, sondern nur Metadaten aus:

```json
{
  "ok": false,
  "status": 400,
  "keyDiagnostics": {
    "length": 1,
    "prefix": "\u0016",
    "sha256First12": "7cb7c4547cf2"
  }
}
```

Das war der entscheidende Fund:

```text
Cloudflare hatte als RESEND_API_KEY nur ein einziges Steuerzeichen gespeichert.
Der echte Key beginnt aber mit re_... und hat deutlich mehr Zeichen.
```

Der Fehler kam sehr wahrscheinlich durch interaktive Eingabe oder Copy-Paste im
Terminal. Aus Anwendersicht wurde das Problem dadurch geloest, dass der Key
zuerst sauber in eine PowerShell-Variable geschrieben wurde:

```powershell
$RESEND_API_KEY = "re_DEIN_ECHTER_RESEND_KEY_HIER"
```

Danach wurde geprueft:

```powershell
$RESEND_API_KEY.Length
$RESEND_API_KEY.Substring(0,3)
```

Erwartung:

```text
> 20
re_
```

#### Sichere Loesung: Secret per Pipe setzen

Statt den Key interaktiv in `wrangler pages secret put` einzufuegen, wurde er
aus der PowerShell-Variable an Wrangler gepiped:

```powershell
$RESEND_API_KEY | npx wrangler pages secret put RESEND_API_KEY --project-name lifeflow360-api
```

Danach:

```powershell
npx wrangler pages deploy public --project-name lifeflow360-api --branch main --commit-dirty true
```

Erneuter Cloudflare-Diagnosetest:

```json
{
  "ok": true,
  "status": 200,
  "resendBody": {
    "id": "3ad721d1-a693-4026-ac05-47068f2dd8c8"
  },
  "keyDiagnostics": {
    "length": 36,
    "prefix": "re_GFn",
    "sha256First12": "58efc789c24a"
  }
}
```

Damit war bestaetigt:

```text
Cloudflare nutzt jetzt den echten Resend-Key.
Cloudflare kann ueber Resend Mails senden.
Magic-Link-Mails koennen zugestellt werden.
```

#### Empfehlung fuer kuenftige Setups

Bei Secrets mit langen Tokens nicht blind auf "Success! Uploaded secret"
vertrauen. Diese Meldung bestaetigt nur, dass irgendein Wert gespeichert wurde.

Sicherer Ablauf:

```powershell
$RESEND_API_KEY = "re_DEIN_ECHTER_RESEND_KEY_HIER"
$RESEND_API_KEY.Length
$RESEND_API_KEY.Substring(0,3)
$RESEND_API_KEY | npx wrangler pages secret put RESEND_API_KEY --project-name lifeflow360-api
npx wrangler pages deploy public --project-name lifeflow360-api --branch main --commit-dirty true
```

Wenn der lokale Resend-Test funktioniert, Cloudflare aber nicht, ist fast immer
das Cloudflare Secret oder das aktive Deployment der Unterschied.

Vor Go-live muss ein temporaerer Diagnose-Endpunkt wieder entfernt oder streng
geschuetzt werden. Er darf keine Secrets ausgeben und sollte nicht dauerhaft
oeffentlich erreichbar bleiben.

---

## 6. IONOS – DNS-Setup im Browser-Dashboard

`https://my.ionos.de → Domains & SSL → lifeflow360.app → DNS`

Fuenf Records eintragen (vier Pflicht + DMARC optional).

### Record 1 — Cloudflare API-Subdomain

```text
Typ:        CNAME
Hostname:   api
Wert:       lifeflow360-api.pages.dev
TTL:        1 Stunde
```

(Falls Cloudflare beim Custom-Domain-Setup einen anderen Zielwert vorgibt,
**diesen** verwenden statt der `pages.dev`-Vorlage.)

### Record 2 — Resend DKIM

```text
Typ:        TXT
Hostname:   resend._domainkey
Wert:       p=MIGfMA0GCSqGSIb...   (kompletter Wert aus Resend kopieren)
TTL:        1 Stunde
```

### Record 3 — Resend Bounce-MX

```text
Typ:        MX
Hostname:   send
Wert:       feedback-smtp.eu-west-1.amazonses.com
Prioritaet: 10
TTL:        1 Stunde
```

### Record 4 — Resend Bounce-SPF

```text
Typ:        TXT
Hostname:   send
Wert:       v=spf1 include:amazonses.com ~all
TTL:        1 Stunde
```

### Record 5 — DMARC (optional)

```text
Typ:        TXT
Hostname:   _dmarc
Wert:       v=DMARC1; p=none; rua=mailto:mail@triltsch-online.de
TTL:        1 Stunde
```

### TTL-Hinweis

IONOS hat keine "Auto"-Option, sondern diskrete Werte. **1 Stunde** ist Default,
fuer das erste Setup darfst du auch 15 Minuten waehlen (schnellere Korrekturen
bei Tippfehlern).

### Verifikation

Im Terminal:

```powershell
nslookup -type=CNAME api.lifeflow360.app
nslookup -type=TXT   resend._domainkey.lifeflow360.app
nslookup -type=MX    send.lifeflow360.app
nslookup -type=TXT   send.lifeflow360.app
```

Wenn alle die richtigen Werte zeigen:
- **Resend** → Domain `Verified`
- **Cloudflare** → Custom Domain `Active`, TLS-Zertifikat aktiv

---

## 7. Paddle-Webhook-Destination einrichten

In Paddle Sandbox:

```text
Notifications  ->  + New Destination
Description:       LifeFlow360 API Sandbox
Notification type: Webhook
URL:               https://api.lifeflow360.app/api/paddle/webhook
Usage type:        Platform
```

### 7.1 Usage type: Platform vs. Marketplace

```text
Platform                Standard. Webhooks fuer dein eigenes Konto / deine
                        Produkte.   <- das brauchst du.

Marketplace / Connect   Du betreibst eine Plattform, auf der ANDERE Verkaeufer
                        ihre Produkte verkaufen (Stripe-Connect-artig).
                        -> wir haben keinen Marketplace, also irrelevant.
```

### 7.2 Events auswaehlen — Auflistung mit Begruendung

Paddle bietet ca. 50 Events ueber 14 Kategorien. Wir abonnieren nur die, die
unser Webhook-Handler ([functions/api/paddle/webhook.ts](../functions/api/paddle/webhook.ts))
tatsaechlich verarbeitet — alle anderen wuerden ohnehin nur in
`webhook_events` als ignoriert protokolliert werden.

**Subscription (alle relevanten):**

| Event | Warum |
|---|---|
| `subscription.created` | Neuer Kauf — User anlegen, Entitlement setzen |
| `subscription.activated` | Trial endet, Abo wird abrechnungspflichtig |
| `subscription.updated` | Plan-Wechsel, Periodenwechsel, Status-Updates |
| `subscription.past_due` | Zahlung fehlgeschlagen — Grace Period anwenden |
| `subscription.canceled` | User / Paddle hat Abo beendet |
| `subscription.paused` | Pause-Status — Zugang sofort beenden |
| `subscription.resumed` | Pause aufgehoben — Zugang reaktivieren |
| `subscription.trialing` | Trial-Phase — Entitlement temporaer setzen |

Nicht abonniert: `subscription.imported` (nur fuer Daten-Migrationen, nicht
fuer uns relevant).

**Transaction:**

| Event | Warum / Warum nicht |
|---|---|
| `transaction.paid` | **Pflicht.** Das ist der neue Name fuer das frueher `transaction.completed`-Event — wird gefeuert, wenn die Zahlung tatsaechlich eingegangen ist |
| `transaction.payment_failed` | Frueh-Warnung — Paddle versucht Retry, danach kommt evtl. `subscription.past_due` |
| `transaction.canceled` | Cart-Abbruch — fuer Monitoring nuetzlich |
| ⛔ `transaction.created` | Sehr frueh im Lifecycle, kaum aussagekraeftig |
| ⛔ `transaction.billed` | Rechnung erstellt — bekommen wir bereits via `subscription.updated` mit |
| ⛔ `transaction.past_due` | Duplikat zu `subscription.past_due` |
| ⛔ `transaction.ready` | Interner Lifecycle-Zustand |
| ⛔ `transaction.updated` | Sehr lautes Event — nicht relevant |
| ⛔ `transaction.revised` | Manuelle Korrektur, selten |

**Adjustment:**

| Event | Warum |
|---|---|
| `adjustment.created` | Refunds, Kulanz, Storno — Entitlement zurueckziehen |
| `adjustment.updated` | Refund-State-Aenderungen (Pending -> Approved usw.) |

**Alle anderen Kategorien — bewusst nicht abonniert:**

| Kategorie | Warum nicht |
|---|---|
| Product / Price | Wir verwalten Produkte+Preise im Paddle-Dashboard manuell, keine Reaktion in unserem Code |
| Customer | `customer.updated` koennte theoretisch interessant sein, aktuell brauchen wir es nicht — User wird via Subscription-Events angelegt |
| Payment Method | Karten werden in Paddle-Customer-Portal verwaltet, unser Code zeigt keine "gespeicherten Karten" — wir trusten Paddle |
| Address / Business | Adressdaten fuer Rechnungen verwaltet Paddle als MoR komplett |
| Payout | Auszahlungen *an uns* (von Paddle zum Bankkonto) — fuer User-Zugang irrelevant |
| Discount / Discount Group | Discount-Codes werden im Paddle-Dashboard angelegt, keine Code-Reaktion |
| Report | Analytics-Reports, kein User-relevantes Verhalten |
| API Key / Client Token | Admin/Security-Events, wuerden eher per Mail-Alert geprueft |
| API Key Exposure | Sicherheitsalert wenn ein Key oeffentlich landet — koennte man fuer Monitoring abonnieren, aktuell nicht im Code |

### 7.3 Webhook-Secret in Cloudflare setzen

Nach `Save` zeigt Paddle den **Webhook-Secret** an. Sofort kopieren und:

```powershell
npx wrangler pages secret put PADDLE_WEBHOOK_SECRET --project-name lifeflow360-api
```

Ohne dieses Secret blockt unser Webhook-Handler alle eingehenden Calls mit
`401 bad_signature`.

### 7.4 Troubleshooting: `bad_signature` / `bad_hmac`

Dieser Fehler trat beim ersten Sandbox-End-to-End-Test auf. Paddle zeigte die
Notification Deliveries als `Failed`; der Response Body war:

```json
{
  "error": {
    "code": "bad_signature",
    "message": "bad_hmac"
  }
}
```

Das bedeutet:

```text
Paddle erreicht unseren Webhook.
Die Route /api/paddle/webhook existiert.
Aber die HMAC-Signatur kann mit unserem PADDLE_WEBHOOK_SECRET nicht verifiziert werden.
```

Ein Browser-Aufruf der URL ist kein sinnvoller Webhook-Test, weil der Browser
`GET` sendet. Der Endpunkt erwartet `POST`:

```powershell
curl.exe -i https://api.lifeflow360.app/api/paddle/webhook
```

Erwartet:

```text
HTTP/1.1 405 Method Not Allowed
Allow: POST
```

#### Welcher Paddle-Wert ist gemeint?

Bei Paddle gibt es mehrere aehnliche IDs/Werte:

```text
Notification ID / Delivery ID       ntf_...
Notification Setting / Destination  ntfset_...
Endpoint Secret Key                 pdl_ntfset_...
```

Fuer `PADDLE_WEBHOOK_SECRET` brauchen wir den **Endpoint Secret Key** der
Webhook-Destination. In Paddle kann dieser mit `pdl_ntfset_...` beginnen.
Wichtig ist: Es muss der Secret-Key fuer genau die Destination sein, deren URL
auf unsere API zeigt:

```text
https://api.lifeflow360.app/api/paddle/webhook
```

#### Robuste Loesung: Secret per PowerShell-Variable und Pipe setzen

Analog zum `RESEND_API_KEY` war auch hier die robuste Loesung, den Secret-Wert
nicht blind interaktiv einzufuegen, sondern zuerst sauber in eine PowerShell-
Variable zu schreiben:

```powershell
$PADDLE_WEBHOOK_SECRET = "pdl_ntfset_DEIN_ECHTER_ENDPOINT_SECRET_KEY"
```

Dann kurz pruefen:

```powershell
$PADDLE_WEBHOOK_SECRET.Length
$PADDLE_WEBHOOK_SECRET.Substring(0,11)
```

Erwartung:

```text
deutlich groesser als 30
pdl_ntfset_
```

Dann per Pipe in Cloudflare setzen:

```powershell
$PADDLE_WEBHOOK_SECRET | npx wrangler pages secret put PADDLE_WEBHOOK_SECRET --project-name lifeflow360-api
```

Danach Production neu deployen:

```powershell
npx wrangler pages deploy public --project-name lifeflow360-api --branch main --commit-dirty true
```

Anschliessend in Paddle bei einer fehlgeschlagenen Notification `Retry`
klicken.

Erfolgssignal:

```text
transaction.paid          Delivered
subscription.created      Delivered
subscription.activated    Delivered
```

Wenn `transaction.paid` delivered ist, aber `subscription.created` noch
fehlschlaegt, ist die Signatur bereits geloest. Dann liegt der Fehler in der
Webhook-Verarbeitung, nicht mehr im Secret.

#### Folgefehler im ersten Test: Customer-Fetch

Nach Fix des Secrets kam bei `subscription.created` kurzzeitig:

```json
{
  "error": {
    "code": "process_failed",
    "message": "Error: Paddle customer fetch failed (400): "
  }
}
```

Ursache: Der Webhook wollte die Customer-E-Mail ueber die Paddle API nachladen.
Im Checkout schicken wir die Kauf-E-Mail aber bereits als
`custom_data.checkout_email` mit. Der Webhook wurde deshalb so angepasst, dass
er zuerst `custom_data.checkout_email` nutzt und ein fehlschlagender
Customer-Fetch nur noch eine Warnung ist, kein harter Webhook-Fail.

#### End-to-End-Pruefung nach erfolgreichem Retry

```powershell
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT id, type, processed_at, received_at FROM webhook_events ORDER BY received_at DESC LIMIT 10"
```

Und:

```powershell
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT u.email_lower, e.brand_id, e.access_level, e.valid_until, e.source FROM entitlements e JOIN users u ON u.id = e.user_id ORDER BY e.updated_at DESC LIMIT 10"
```

Wenn dort ein aktives Entitlement fuer die Login-E-Mail steht, sollte die App
beim Neuladen direkt in den Simulator gehen.

---

## 8. Paddle-API-Key Berechtigungen

Beim Anlegen des API-Keys in Paddle (`Developer tools → Authentication →
API keys`) musst du Permissions setzen. Hier was wir aus Code-Perspektive
brauchen:

| Permission | Setzen? | Warum |
|---|---|---|
| **Customer portal sessions: WRITE** | ✅ Ja | `POST /customers/{id}/portal-sessions` aus unserer `/api/billing/portal` |
| **Customers: READ** | ✅ Ja | Customer-Email nachladen wenn Webhook sie nicht direkt liefert |
| **Customers: WRITE** | 🟡 Optional | Wir aendern Customer-Daten aktuell nicht — kann aus Vorsicht an |
| **Subscriptions: READ** | ✅ Ja | Status pruefen (z.B. fuer manuelle Diagnose) |
| **Subscriptions: WRITE** | 🟡 Optional | Aktuell nicht genutzt — koennte spaeter fuer Code-gesteuertes Cancel relevant werden |
| **Transactions: READ** | ✅ Ja | Refund-Handling, Status-Lookup |
| **Transactions: WRITE** | 🟡 Optional | Aktuell nicht genutzt |
| **Adjustments: READ** | ✅ Empfohlen | Bei `adjustment.created`-Webhook ggf. weitere Details nachladen |

**Komplett irrelevant — bitte NICHT geben:**

- Products, Prices, Addresses, Businesses, Payment Methods, Notifications,
  Reports, API Keys, Client Tokens, Customer Authentication Tokens,
  Discounts, Discount Groups

Diese sind entweder UI-verwaltet, Client-side oder fuer unseren Use-Case
nicht relevant. Minimaler Scope = bessere Sicherheit.

---

## 9. Smoke-Tests

### Nach jedem grossen Schritt

```powershell
curl.exe -i https://api.lifeflow360.app/api/me
```

Erwartet:

```text
HTTP/2 200
Content-Type: application/json; charset=utf-8
{"authenticated":false,"entitlements":[],"deviceLimit":3,"activeDevices":0}
```

### D1 inspizieren

```powershell
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT * FROM users"
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT * FROM entitlements"
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT id, type, processed_at FROM webhook_events ORDER BY received_at DESC LIMIT 10"
```

### Webhook in Paddle testen

Im Paddle Sandbox Dashboard kann man manuell ein Test-Event simulieren:

```text
Notifications  ->  Destination oeffnen  ->  Send test event
```

Paddle sendet ein Beispiel-Payload an unseren Endpoint. Im Cloudflare-Logs
(`Workers & Pages → lifeflow360-api → Functions → Logs`) sollte die Anfrage
sichtbar sein.

---

## 10. Stolpersteine und Lessons learned

### 10.1 `wrangler pages project create` haengt ohne `--compatibility-date`

Erste Ursache von "der Befehl tut nichts". Immer mitgeben:

```powershell
--compatibility-date 2024-11-01
```

### 10.2 `curl` in PowerShell ≠ `curl.exe`

`curl` ist in PowerShell ein Alias auf `Invoke-WebRequest`. Fuer realistische
HTTP-Header `curl.exe` benutzen.

### 10.3 Wrangler-Binding-Vorschlaege ueberschreiben

Wrangler schlaegt Binding-Namen wie `lifeflow360_prod` vor — der Code erwartet
aber `DB` und `RATE_LIMIT`. Immer manuell aendern.

### 10.4 Cloudflare-Wizard fuer Pages-Setup vermeiden

Die UI-Wizards in Cloudflare zielen auf Workers-with-Assets. Unser Setup ist
klassisches Pages mit `functions/`-Ordner. CLI-Setup ist robuster.

### 10.5 Paddle hat zwei Credentials — nicht verwechseln

Client-side Token (oeffentlich, Browser) ≠ API Key (privat, Server). Wenn man
versehentlich einen API Key im Browser einsetzt: sofort rotieren.

### 10.6 Paddle hat Events umbenannt — Code muss mitziehen

Im neuen Paddle Billing v2 heisst das frueher `transaction.completed`-Event
jetzt `transaction.paid`. `transaction.refunded` gibt es nicht mehr — Refunds
laufen ueber `adjustment.created`.

### 10.7 IONOS hat keine "Auto"-TTL — 1h waehlen

Standard-Werte sind 1 Minute bis 48 Stunden, mit diskreten Auswahlmoeglich-
keiten. 1 Stunde ist ein guter Default fuer alle Records.

### 10.8 Workers koennen kein SMTP

`net.createConnection` und TCP-Sockets sind in Workers nicht verfuegbar.
Email-Versand muss ueber HTTPS-API (Resend, Brevo, MailChannels, ...).

---

## 11. Neue Brand hinzufuegen — Rezept fuer FitFlow360

Wenn FitFlow360 dran ist, ist 90 % identisch zu LifeFlow360 — nur Namen und
IDs aendern sich.

### 11.1 Voraussetzung

- Eigene Domain (`fitflow360.de`) im IONOS-Konto registriert
- Paddle-Produkte und Preise angelegt (siehe `_doc/Product, Pricing and Discount-Codes in Paddle.md`)
- Brand in `website/brands.json` befuellt
- Pricing-Strategie und Beschreibungstexte stehen

### 11.2 Cloudflare-Setup (CLI, ~10 Min)

```powershell
# Pages-Projekt
npx wrangler pages project create fitflow360-api --production-branch main --compatibility-date 2024-11-01

# D1 (database_id notieren)
npx wrangler d1 create fitflow360-prod

# KV (id notieren)
npx wrangler kv namespace create fitflow360-rate-limit

# wrangler.toml fuer Brand kopieren (siehe 11.3)

# Schema einspielen
npx wrangler d1 execute fitflow360-prod --remote --file=migrations/0001_init.sql

# Erstes Deployment
npx wrangler pages deploy public --project-name fitflow360-api --commit-dirty true

# 5 Secrets setzen (analog zu LifeFlow)
npx wrangler pages secret put APP_SESSION_SECRET --project-name fitflow360-api
npx wrangler pages secret put MAGIC_LINK_SECRET --project-name fitflow360-api
npx wrangler pages secret put PADDLE_API_KEY --project-name fitflow360-api
npx wrangler pages secret put RESEND_API_KEY --project-name fitflow360-api
# PADDLE_WEBHOOK_SECRET kommt nach Anlage der Destination (siehe 11.5)
```

### 11.3 Multi-Brand-Konfiguration

Aktuell ist nur **eine** `wrangler.toml` im Repo. Fuer drei Brands:

**Variante A — separate Config-Dateien:**

```text
wrangler.lifeflow.toml
wrangler.fitflow.toml
wrangler.eqoflow.toml
```

Mit Deploy:

```powershell
npx wrangler pages deploy public --config wrangler.fitflow.toml --commit-dirty true
```

Pro Datei: `name`, `vars` (BRAND_ID, COOKIE_DOMAIN, MAIL_FROM usw.), `database_id`,
`kv id` anpassen. Rest bleibt identisch.

### 11.4 Resend-Setup pro Brand

Im **gleichen Resend-Konto**:

```text
Resend Dashboard  ->  Domains  ->  Add Domain  ->  fitflow360.de
-> 3 DNS-Records erscheinen
-> in IONOS-DNS fuer fitflow360.de eintragen (analog zu LifeFlow)
-> Refresh  ->  Verified
-> API Keys  ->  Create  ->  Name: FitFlow360 Production
-> Key in Cloudflare als RESEND_API_KEY setzen
```

### 11.5 Paddle-Setup pro Brand

Im **gleichen Paddle-Konto**:

```text
Catalog       ->  + New Product   "FitFlow360 Pro"  (mit eigenen Preisen)
Notifications ->  + New Destination  https://api.fitflow360.de/api/paddle/webhook
              ->  Webhook-Secret kopieren  ->  PADDLE_WEBHOOK_SECRET setzen
Discounts     ->  + New "EARLY2026-FITFLOW"  oder eigene Codes
```

### 11.6 IONOS-DNS pro Brand

In IONOS die Domain `fitflow360.de` waehlen, die fuenf Records anlegen wie
fuer LifeFlow:

```text
api.fitflow360.de        CNAME   fitflow360-api.pages.dev
resend._domainkey        TXT     p=<fitflow-dkim-key>
send                     MX      feedback-smtp.eu-west-1.amazonses.com  Prio 10
send                     TXT     v=spf1 include:amazonses.com ~all
_dmarc                   TXT     v=DMARC1; p=none; rua=mailto:mail@triltsch-online.de
```

### 11.7 App-Build und Deploy

```powershell
$env:VITE_API_BASE_URL = "https://api.fitflow360.de"
npm run build:fitline
npm run build:site:fitline
```

Per SFTP `dist/site-fitline/` ins Webroot von fitflow360.de hochladen.

### 11.8 Pruefung

```powershell
curl.exe -i https://api.fitflow360.de/api/me
# Erwartet: 200 OK + JSON {"authenticated":false,...}
```

Sandbox-Testkauf laut `_doc/Product, Pricing and Discount-Codes in Paddle.md`
Sektion I.

---

## 12. Quick-Reference: Was wo dokumentiert ist

```text
Cloudflare-CLI-Befehle             Diese Datei (Abschnitt 4)
Resend-Setup                       Diese Datei (Abschnitt 5)
IONOS-DNS                          Diese Datei (Abschnitt 6)
Paddle-Webhook-Events              Diese Datei (Abschnitt 7)
Paddle-API-Key-Permissions         Diese Datei (Abschnitt 8)
Paddle-Produkte und Preise         _doc/Product, Pricing and Discount-Codes in Paddle.md
Paddle-Test-Karten und -Flow       _doc/Product, Pricing and Discount-Codes in Paddle.md (Abschnitt I)
Namenskonvention fuer SKUs         _doc/Produkt-Namenskonvention.md
Architektur und Designentscheidungen  _doc/pricing and payment integration of paddle.md
```
