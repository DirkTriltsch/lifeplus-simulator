# Bugfix & Security before go-live

## Ziel

Diese Datei sammelt technische Findings und Todos, die vor dem Livegang mit
Paddle-Payment erledigt oder bewusst akzeptiert werden sollten.

Stand: 2026-05-20

## Bereits behobene Code-Fehler

### Frontend-Build: Auth API Typing

Problem:

- `simulator-app/src/auth/api.ts` gab bei mehreren API-Helpern `Promise<unknown>`
  zurueck.
- `npm run build:lifeplus` schlug deshalb fehl.

Fix:

- Generische Typen bei `asJson<T>` explizit gesetzt.

Status:

```text
Erledigt.
```

### Device-Limit-Flow

Problem:

- Beim Login auf einem neuen Geraet wurde bereits ein aktives temporaeres
  Geraet angelegt.
- Nach dem Abmelden eines alten Geraets blieb die Anzahl aktiver Geraete bei
  `DEVICE_LIMIT`.
- Die Promotion zur normalen Session konnte dadurch steckenbleiben.
- Zusaetzlich wurde bei Promotion ein weiteres neues Geraet erzeugt.

Fix:

- Das temporaere Geraet wird nicht durch ein weiteres Geraet ersetzt.
- Die bestehende temporaere Session wird nach erfolgreichem Abmelden eines
  alten Geraets auf `normal` gesetzt.
- Das aktuelle Geraet kann im Device-Limit-Flow nicht abgemeldet werden.

Status:

```text
Erledigt.
```

### Paddle Webhook Idempotenz

Problem:

- Webhook-Events wurden vor der Verarbeitung in `webhook_events` gespeichert.
- Wenn die Verarbeitung danach fehlgeschlagen ist, wurde ein Paddle-Retry als
  Duplikat mit `200` beantwortet.
- Dadurch konnte ein fehlgeschlagenes Payment-/Subscription-Event dauerhaft
  unverarbeitet bleiben.

Fix:

- Duplikate mit `processed_at IS NULL` duerfen erneut verarbeitet werden.
- Nur bereits erfolgreich verarbeitete Events werden als echte Duplikate
  ignoriert.

Status:

```text
Erledigt.
```

### Paddle Subscription Events ohne E-Mail

Problem:

- Subscription-Webhooks konnten ignoriert werden, wenn im Event keine E-Mail
  enthalten war.
- Dann waere trotz Zahlung kein User/Entitlement erstellt worden.

Fix:

- Falls die E-Mail im Event fehlt, wird sie ueber die Paddle Customer API per
  `customer_id` nachgeladen.

Status:

```text
Erledigt.
```

### Checkout-Intent und anonymer Checkout

Problem:

- Die Pricing-Seite oeffnete Paddle auch anonym.
- Dadurch konnte ein bestehender Kunde ausgeloggt dieselbe Brand erneut kaufen.
- Das unterlief das Ziel, Mehrfachkaeufe derselben Brand zu verhindern.

Fix:

- Pricing fragt vor dem Paddle Checkout eine E-Mail-Adresse ab.
- Diese E-Mail wird an `/api/billing/checkout-intent` gesendet.
- Paddle wird mit derselben E-Mail vorbefuellt.
- Wenn der Checkout-Intent nicht erreichbar ist, oeffnet Paddle nicht.

Bewertung:

- Anonymer Checkout ist nicht nur ein Mehrfachkauf-Thema.
- Er erschwert auch Zuordnung, Support und saubere App-Freischaltung.
- Die aktuelle Loesung bleibt leichtgewichtig, verhindert aber die haeufigsten
  versehentlichen Doppelkaeufe.

Status:

```text
Erledigt.
```

### Cloudflare Functions Typecheck

Problem:

- `functions/tsconfig.json` referenzierte `@cloudflare/workers-types`.
- Das Paket fehlte in den Dev-Dependencies.

Fix:

- `@cloudflare/workers-types` wurde installiert.

Status:

```text
Erledigt.
```

## Aktuelle Verifikation

Folgende Checks liefen erfolgreich:

```bash
npm.cmd test
npm.cmd run build:lifeplus
npm.cmd run build:site:lifeplus
npm.cmd run build:all
npx.cmd tsc -p functions\tsconfig.json
```

Hinweis:

- `npm.cmd test` in paralleler Multi-Tool-Ausfuehrung schlug einmal mit
  `No test suite found` in einem Sandbox-Spiegelpfad fehl.
- Direkt erneut im echten Workspace ausgefuehrt lief der Test erfolgreich.

## Dependency Audit Findings

`npm audit` meldet aktuell 18 Vulnerability-Eintraege. Diese entstehen
groesstenteils aus wenigen transitive Dependency-Ketten.

Wichtig:

```text
Alle betroffenen Pakete sind devDependencies bzw. transitive Build-/Dev-Tools.
Sie laufen nicht als Runtime-Code in der ausgelieferten App oder in den
Cloudflare Functions.
```

## Vulnerability-Gruppen

### 1. Vite / esbuild

Betroffen:

- `vite`
- `esbuild`
- transitive Effekte auf `@vitejs/plugin-react`, `vitest`, `vite-node`,
  `vite-plugin-pwa`

Risiko:

- Betrifft vor allem den lokalen Vite Dev Server.
- Relevant, wenn der Dev Server im Netzwerk oder Internet erreichbar ist.
- Fuer Produktions-Builds deutlich weniger kritisch.

Todo:

```text
[ ] Vite Dev Server nie oeffentlich exponieren.
[ ] Vor Livegang gezieltes Upgrade von Vite/Vitest pruefen.
```

### 2. vite-plugin-pwa / workbox-build

Betroffen:

- `vite-plugin-pwa`
- `workbox-build`
- darunter Babel, AJV, Terser und Glob-Ketten

Risiko:

- Betrifft Service-Worker-/PWA-Buildprozess.
- Relevant, wenn untrusted Build-Input verarbeitet wird.
- Erzeugt Build-Artefakte, ist aber kein direkter App-Runtime-Code.

Todo:

```text
[ ] Pruefen, ob PWA vor Livegang zwingend benoetigt wird.
[ ] Wenn PWA nicht kritisch ist: Plugin temporaer deaktivieren oder entfernen.
[ ] Wenn PWA bleibt: vite-plugin-pwa/workbox gezielt aktualisieren.
```

### 3. serialize-javascript

Betroffen:

- `serialize-javascript`
- ueber `@rollup/plugin-terser`
- transitive ueber `workbox-build`

Risiko:

- Advisories zu RCE/DoS bei speziell manipulierten Objekten.
- In diesem Projekt vermutlich Build-Zeit-Risiko.
- Kein direkter User-Input-Pfad bekannt.

Todo:

```text
[ ] Mit PWA-/Workbox-Upgrade erneut auditieren.
```

### 4. fast-uri / ajv

Betroffen:

- `fast-uri`
- `ajv`
- `@apideck/better-ajv-errors`
- transitive ueber `workbox-build`

Risiko:

- URL-/Schema-Validierungsprobleme.
- In diesem Projekt Build-/Tooling-Kontext.

Todo:

```text
[ ] Mit Workbox-/AJV-Transitiv-Upgrade erneut auditieren.
```

### 5. brace-expansion / minimatch / glob

Betroffen:

- `brace-expansion`
- `minimatch`
- `glob`

Risiko:

- DoS ueber grosse Pattern-Expansion.
- Relevant bei untrusted Glob-Patterns.
- In diesem Projekt nur Build-/Tooling-Kontext.

Todo:

```text
[ ] Keine untrusted Glob-Patterns in Build-Scripts verarbeiten.
[ ] Nach Toolchain-Upgrade erneut auditieren.
```

## Audit-Einschaetzung

Nicht akut kritisch:

- Die Findings betreffen Dev-/Build-Tools.
- Der ausgelieferte Browser-Code und die Cloudflare Functions enthalten diese
  Pakete nicht als Runtime-Abhaengigkeiten.

Trotzdem vor Livegang sinnvoll:

- Build-Toolchain aktualisieren.
- PWA-Abhaengigkeiten pruefen.
- Audit erneut laufen lassen.

Nicht empfohlen:

```text
npm audit fix --force
```

Grund:

- Kann Vite, Vitest, Workbox oder PWA-Verhalten breaking aktualisieren.
- Besser ist ein gezielter Upgrade-Task mit anschliessendem Test.

## Go-live Security Todos

### Dependency / Build Tooling

```text
[ ] Gezieltes Upgrade von Vite, @vitejs/plugin-react, Vitest und vite-plugin-pwa planen.
[ ] Pruefen, ob PWA vor Launch benoetigt wird.
[ ] Nach Upgrade ausfuehren: npm audit.
[ ] Nach Upgrade ausfuehren: npm.cmd test.
[ ] Nach Upgrade ausfuehren: npm.cmd run build:all.
[ ] Nach Upgrade ausfuehren: npx.cmd tsc -p functions\tsconfig.json.
```

### Payment / Paddle

```text
[ ] Paddle Sandbox mit echten Produkten und Preisen befuellen.
[ ] Monthly und Yearly Prices pro Brand anlegen.
[ ] Checkout-Intent mit bestehendem aktiven User testen.
[ ] Checkout-Intent mit bestehendem inaktivem User testen.
[ ] Checkout-Intent mit neuer E-Mail testen.
[ ] Paddle Webhook Retry simulieren: erster Versuch fail, zweiter Versuch success.
[ ] Subscription Event ohne E-Mail testen, Customer API Fallback pruefen.
[ ] Refund-Event testen.
```

### Auth / Device Limit

```text
[ ] Login auf Geraet 1 testen.
[ ] Login auf Geraet 2 testen.
[ ] Login auf Geraet 3 testen.
[ ] Login auf Geraet 4 testen: DeviceLimitGate muss erscheinen.
[ ] Altes Geraet abmelden: neues Geraet muss danach freigeschaltet sein.
[ ] Aktuelles temporaeres Geraet darf im Limit-Flow nicht abgemeldet werden.
[ ] Normales eigenes Geraet abmelden: User muss ausgeloggt werden.
```

### Hosting / Runtime

```text
[ ] Entscheiden: Cloudflare Functions jetzt oder IONOS API spaeter.
[ ] Wenn Cloudflare: D1/KV/Secrets pro Brand korrekt binden.
[ ] Wenn IONOS: PHP 8.3, MySQL/MariaDB, HTTPS, externe Webhooks und Logs testen.
[ ] API-Fehlerlogging aktivieren.
[ ] Webhook-Fehler-Alert einrichten.
```

## Empfohlene Reihenfolge

```text
1. Payment/Auth-Flows in Sandbox testen.
2. Device-Limit E2E testen.
3. Webhook-Retry und Refund testen.
4. PWA-Notwendigkeit entscheiden.
5. Build-Toolchain gezielt aktualisieren.
6. npm audit erneut pruefen.
7. Go-live Checkliste abarbeiten.
```
