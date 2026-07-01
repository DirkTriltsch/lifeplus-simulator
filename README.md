# MLM Simulator Platform

Gemeinsame Codebasis fuer mehrere produktbezogene Verguetungs-Simulatoren.
Pro Produkt gibt es zwei Deployment-Artefakte: eine Astro-Microsite und die
Simulator-App. Impressum und Datenschutz liegen auf der Microsite, die App
enthaelt den Simulator.

## Struktur

```text
simulator-app/          React/Vite-Webapp, pro Produkt gebaut

website-astro/          Astro-Microsites fuer LifePlus, FitLine und Eqology
  src/shared/            Gemeinsame Komponenten, Schemas, Styles und Scripts
  src/brands/<brand>/    Brand-Config, Content, Pages und statische Assets

packages/
  simulator-core/        MLM-neutrale Netzwerk- und Simulationslogik
  product-lifeplus/      Aktive Plan-Implementierung
  product-fitline/       Eigenes Product Pack, nutzt vorerst LifePlus-Plan
  product-eqology/       Eigenes Product Pack, nutzt vorerst LifePlus-Plan
  product-registry/      Explizite Produkt-Registry

tests/                  Produktuebergreifende Tests
functions/              Cloudflare Pages Functions fuer Auth, Billing und API
migrations/             D1-Schema fuer die API
public/                 Minimaler Static-Output fuer Pages Functions
```

## Entwicklungsbefehle

### Simulator-App

```bash
npm run dev:lifeplus
npm run dev:fitline
npm run dev:eqology

npm run build:lifeplus     # -> dist/lifeplus-app/
npm run build:fitline      # -> dist/fitline-app/
npm run build:eqology      # -> dist/eqology-app/
```

### Microsite

```bash
npm run build:site:lifeplus    # -> dist/lifeplus-website/
npm run build:site:fitline     # -> dist/fitline-website/
npm run build:site:eqology     # -> dist/eqology-website/
npm run build:sites            # alle drei Astro-Sites
```

### Alles auf einmal

```bash
npm run build:all              # 3 Apps + 3 Microsites + app/ im Webroot
npm run build:webroot:lifeplus # -> dist/lifeplus-website/ inkl. app/
npm run build:webroot:fitline  # -> dist/fitline-website/ inkl. app/
npm run build:webroot:eqology  # -> dist/eqology-website/ inkl. app/
npm test
```

## Deployment-Mapping

| Brand    | Webroot (Microsite + App) | App-Build (Standalone) | Domain |
|----------|----------------------------|-------------------------|--------|
| LifePlus | `dist/lifeplus-website/`   | `dist/lifeplus-app/`    | `www.lifeflow360.app` |
| FitLine  | `dist/fitline-website/`    | `dist/fitline-app/`     | `fitflow360.triltsch.com` |
| Eqology  | `dist/eqology-website/`    | `dist/eqology-app/`     | `eqoflow360.triltsch.com` |

`build:webroot:<brand>` baut zuerst Microsite und App separat und kopiert
danach den App-Build nach `dist/<brand>-website/app/`. Damit liegen Marketing-
Site und Simulator gemeinsam unter `https://<domain>/` bzw.
`https://<domain>/app/`.

## Website Build Notes

Die Marketing-Sites werden produktiv aus `website-astro/` gebaut. Die aktuellen
Outputs sind `dist/<brand>-website/` fuer die Microsites und
`dist/<brand>-app/` fuer die Simulator-App.

Brand-Builds duerfen nicht parallel im selben `website-astro/`
Arbeitsverzeichnis laufen, weil Astro den `.astro`-Arbeitscache pro Build
nutzt; die Root-Skripte bauen deshalb sequentiell.

## Live-Deploy Checkliste

- Free-Tier Click: E-Mail-Prompt, Login-Code-Versand, Code-Eingabe, Hinweis-Overlay und Login
  in Staging testen.
- Pro-Tier Clicks fuer Monthly, Halfyear und Yearly mit Sandbox-Paddle testen:
  direkter `/checkout/{plan}.html`-Flow, `checkout-intent`, Paddle Overlay,
  `post-checkout`, App-Redirect und Webhook-Entitlement.
- D1-Migrationsstatus fuer lokal, Preview/Sandbox und Production gegen
  `0001` bis `0010` pruefen; `0011_drop_magic_login_tokens.sql` erst nach
  Production-Verifikation anwenden und danach erneut pruefen. Lokal existieren
  alle Migrationsdateien; Remote-Status ist ohne `wrangler d1 migrations list`
  nicht verifiziert.
- `mein-konto.html`: Login-Code-Verify, Account-Status-Render,
  Subscription-Details und Portal-/Cancel-Flows pruefen.
- FitLine und Eqology vorerst nicht live bewerben: beide Brands enthalten noch
  Paddle-Platzhalter und keine eigene `apiBaseUrl`. Der Free-Login-Code-Flow
  wuerde auf der Marketing-Domain gegen `/api/auth/request-code` laufen.
- Visuellen Screenshot-Vergleich gegen den letzten akzeptierten Build machen,
  besonders Pricing Cards, Compare-Tabelle, Hero und Footer.
- `debug.html` nicht aus der Navigation verlinken; die Seite ist nur lokal/fuer Reviews gedacht und per `robots.txt` ausgeschlossen.
- `npm audit` separat bearbeiten und High-Findings bewerten. Aktueller Stand
  (Stichtag 2026-05-29): 18 Findings, davon 15 moderate und 3 high. Die drei
  High-Findings (`@babel/plugin-transform-modules-systemjs`, `fast-uri`,
  `serialize-javascript`) liegen ausschliesslich in der Dev-/Build-Toolchain
  (transitive Abhaengigkeiten von `@astrojs/check`, Language Server,
  Build-Steps). Sie sind nicht im produktiven Output enthalten und nicht
  Runtime-exponiert. `npm audit fix` ohne `--force` patcht keine davon, ein
  `--force` waere ein breaking-change Update von `@astrojs/check`.

Fuehrendes Checkout-/Billing-Runbook:
`_doc/paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`.

## Payment/API-Status

LifePlus ist aktuell die einzige Brand mit kompletter Payment-/API-
Konfiguration im Repo. Die Konfigurationen liegen in
`website-astro/src/brands/<brand>/brand.yaml` und fuer LifePlus zusaetzlich in
`wrangler.toml`.

FitLine und Eqology haben eigene Product Packs, Astro-Microsites und App-Builds,
aber noch keine echten Paddle-IDs, API-Subdomains oder Pages-Projekte. Ihre
`paddle.*`-Werte bleiben Platzhalter, bis die Brand-Setups separat angelegt
werden. Diese beiden Brands sind deshalb als Staging-/Preview-Setups zu
behandeln; produktiver Login-Code- und Checkout-Betrieb ist aktuell nur fuer
LifePlus konfiguriert.

## Microsite Anpassen

- Brand-spezifisch: `website-astro/src/brands/<brand>/brand.yaml`
- Seitencontent: `website-astro/src/brands/<brand>/content/*.yaml`
- Brand-Pages und Overrides: `website-astro/src/brands/<brand>/pages/`
- Gemeinsame Komponenten: `website-astro/src/shared/components/`
- Gemeinsame Styles und Scripts: `website-astro/src/shared/styles/` und `website-astro/src/shared/scripts/`

## Lokaler Debug-Review

Jede Astro-Brand hat eine lokale Review-Seite:

```bash
cd website-astro
npm run dev:lifeplus
```

Dann `http://localhost:4321/debug.html` oeffnen. Die Seite verlinkt alle HTML-
Seiten mit aktiviertem Debug-Modus. Alternativ kann jede Seite direkt mit
`?debug=1` geoeffnet werden, zum Beispiel `pricing.html?debug=1`.

Im Debug-Modus markiert ein Rahmen die annotierten Komponenten. Links oben steht
die Komponenten-Datei, rechts oben stehen verknuepfte Content-, Brand- oder Lib-
Dateien. Die Links nutzen `vscode://file/...` und oeffnen die jeweilige Datei in
VS Code. Taste `d` toggelt den Modus; `?debug=0` deaktiviert ihn wieder.

## Fachliche Drift-Policy

Bis echte Verguetungsplaene fuer FitLine und Eqology vorliegen, gibt es genau
eine aktive Plan-Implementierung: `product-lifeplus`. Die Product Packs fuer
FitLine und Eqology besitzen eigene Domains, Markenwerte, Terminologie,
Defaults und Tests, importieren aber bewusst denselben Planadapter. Erst mit
den echten Fachunterlagen werden die Plaene getrennt.

## Debug- und Ops-Befehle

Sammelstelle fuer wiederkehrende Diagnose- und Wartungsbefehle. Production-D1
heisst `lifeflow360-prod`, Pages-Projekt heisst `lifeflow360-api`. `--remote`
zielt auf Production, `--local` auf die Wrangler-Dev-DB. Fuer Windows/
PowerShell gelten die `npx`-Aufrufe unveraendert.

### Wrangler Login / Session

```bash
npx wrangler whoami            # aktuellen Login und Account-ID pruefen
npx wrangler login             # Browser-OAuth-Login
npx wrangler logout            # Session verwerfen (bei 403 zuerst logout+login)
```

### D1: SELECT vs. Batch — wichtiger Unterschied

- **`--command "SQL"`** benutzt den D1-Query-Pfad und **druckt die Result-Rows**
  als Tabelle. Fuer alle Reads/Selects diese Variante nehmen.
- **`--file datei.sql`** laeuft auf `--remote` als **Batch-Import** und gibt
  nur Summary-Stats (`Rows read`, `Rows written`) aus, **keine Tabelle**.
  Deshalb NICHT fuer SELECTs verwenden — nur fuer Migrations/DDL/DML-Batches.

Windows PowerShell + `npx wrangler` (das ueber den `cmd.exe`-Shim `npx.cmd`
laeuft) kann mehrzeilige Argumente nicht sauber weiterreichen. `cmd.exe`
splittet den String an Newlines in separate Argumente, und SQL-Kommentare
mit `-- ` werden von yargs als "Optionen-Ende" interpretiert. Deshalb:
**SQL vor dem Aufruf zu einer Zeile kollabieren und Kommentare strippen.**

### D1: User und Status auflisten

```powershell
# PowerShell: SQL laden, Kommentare/Newlines rausstrippen, als --command uebergeben
$sql = (Get-Content _debug/sql/list-users-status.sql -Raw) -replace '(?m)--.*$','' -replace '\s+',' '
npx wrangler d1 execute lifeflow360-prod --remote --command $sql

# Einzelnen User inkl. Sessions/Devices/Consent (Adresse zuerst einsetzen)
$sql = (Get-Content _debug/sql/inspect-user.sql -Raw) `
       -replace '__EMAIL__','test@example.com' `
       -replace '(?m)--.*$','' -replace '\s+',' '
npx wrangler d1 execute lifeflow360-prod --remote --command $sql
```

Bash-Aequivalent (Newlines und Kommentare stoeren dort nicht):

```bash
npx wrangler d1 execute lifeflow360-prod --remote --command "$(cat _debug/sql/list-users-status.sql)"
```

Einzeilige Adhoc-Queries funktionieren ueberall direkt:

```bash
# Nur Emails + Anlagedatum + Status
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT email_lower, datetime(created_at/1000,'unixepoch') AS created, deleted_at FROM users ORDER BY created_at DESC LIMIT 50;"

# Anzahl aktiver Entitlements pro Access-Level
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT access_level, COUNT(*) FROM entitlements GROUP BY access_level;"
```

### D1: OTP-Tokens inspizieren

```powershell
# Offene / gueltige OTP-Tokens einer Adresse
$sql = (Get-Content _debug/sql/list-otp-tokens.sql -Raw) `
       -replace '__EMAIL__','test@example.com' `
       -replace '(?m)--.*$','' -replace '\s+',' '
npx wrangler d1 execute lifeflow360-prod --remote --command $sql
```

```bash
# Globale Anzahl offener Tokens (einzeilig, shell-agnostisch)
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT COUNT(*) AS open_tokens FROM email_otp_tokens WHERE used_at IS NULL AND expires_at > unixepoch()*1000;"
```

### Test-User loeschen

Fuer wiederholtes E-Mail-Testing existiert ein PowerShell-Wrapper, der alle
verknuepften Tabellen (users, sessions, devices, entitlements, subscriptions,
checkout_intents, consent_log, email_otp_*) abraeumt:

```powershell
# EmailToDelete in _debug\delete-dao-user.ps1 anpassen, dann direkt aus
# einer PowerShell-Session (Windows PowerShell 5.1 oder pwsh 7+):
.\_debug\delete-dao-user.ps1 -Database lifeflow360-prod            # Production
.\_debug\delete-dao-user.ps1 -Database lifeflow360-prod -Local     # nur lokale Dev-DB
```

### Resend / OTP-Mail diagnostizieren

```bash
# Direkter Resend-Test-Endpoint (liefert Status + Resend-Body + Key-Fingerprint)
curl -X POST https://api.lifeflow360.app/api/diagnostics/resend-test \
  -H "content-type: application/json" \
  -d '{"to":"deine@adresse.de"}'

# Pages Functions Real-time Logs (zeigt resend_send_failed + Payload-Info)
npx wrangler pages deployment tail --project-name lifeflow360-api
```

Silent-Fail-Pfade in `POST /api/auth/request-code`, die bewusst `{ok:true}`
liefern ohne Mail zu senden:
1. Login-Purpose + Adresse nicht in `users` und Paddle-Bootstrap ohne Treffer.
2. Email-Rate-Limit (3 Anfragen / 30 Min pro Adresse) erreicht.
3. `DEV_OTP_DEBUG=1` in `.dev.vars` -> Code steht nur in der Console.

### KV: Rate-Limit-Keys pruefen / loeschen

```bash
# Alle Rate-Limit-Keys einer Adresse listen
npx wrangler kv key list --binding RATE_LIMIT --remote --prefix "rl:auth:request-code:email:test@example.com"

# Einzelnen Key loeschen (unblockt weitere OTP-Anfragen sofort)
npx wrangler kv key delete --binding RATE_LIMIT --remote "rl:auth:request-code:email:test@example.com"
```

### D1-Migrationsstatus

```bash
npx wrangler d1 migrations list   lifeflow360-prod --remote
npx wrangler d1 migrations apply  lifeflow360-prod --remote     # nach Verifikation
```
