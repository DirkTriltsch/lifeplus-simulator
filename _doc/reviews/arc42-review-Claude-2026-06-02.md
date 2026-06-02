# arc42 Review: Simulator-App und Microsite

Stand: 2026-06-02
Reviewer: Claude (Opus 4.7)
Vorgaenger-Review: [arc42-review-2026-05-24.md](arc42-review-2026-05-24.md)

## 0. Aenderungen seit dem letzten Review

Zwischen dem 24.05. und dem 02.06. hat das Projekt mehrere strukturelle und
funktionale Aenderungen erfahren, die in dieses Review direkt einfliessen:

- Abschluss der **Astro-Migration**: Die Microsites werden jetzt aus
  [website-astro/](../../website-astro/) gebaut. Die alte Template-Engine
  liegt nur noch als Archiv unter [website-legacy/](../../website-legacy/)
  und ist nicht mehr Teil der Workspaces. ([README.md:78-98](../../README.md#L78-L98))
- **Login- und Payment-Flow restrukturiert** (Commit `f86a4da`,
  "login and payment restructured"): eigene Astro-Pages fuer
  [login.astro](../../website-astro/src/brands/lifeplus/pages/login.astro),
  [signup.astro](../../website-astro/src/brands/lifeplus/pages/signup.astro),
  [checkout/[plan].astro](../../website-astro/src/brands/lifeplus/pages/checkout/) und
  [mein-konto.astro](../../website-astro/src/brands/lifeplus/pages/mein-konto.astro)
  ersetzen das frueheren Inline-Wizard-Setup; die Inline-Scripts
  ([loginInline.ts](../../website-astro/src/shared/scripts/loginInline.ts),
  [signupInline.ts](../../website-astro/src/shared/scripts/signupInline.ts),
  [checkoutInline.ts](../../website-astro/src/shared/scripts/checkoutInline.ts))
  uebernehmen die Logik.
- **Free-Plan-Registrierung gehaertet** (Commits `f0ac289`, `cddb60e`):
  Consent ist jetzt Pflicht im Magic-Link-Token; `verify-link.ts` legt den
  Token frueh als verwendet, kompensiert bei Fehler und schreibt Consent
  idempotent.
- **Toter Code entfernt** (Commit `cddb60e`): u.a. Aggregations-Pfade in der
  Simulation. Damit verbunden Aenderungen an [tree-generator.ts](../../packages/simulator-core/src/tree-generator.ts)
  (+485 LOC, neue Generator-Logik), [simulation.ts](../../packages/simulator-core/src/simulation.ts)
  und neue Equivalence-Tests
  ([person-tree-equivalence.test.ts](../../packages/simulator-core/tests/person-tree-equivalence.test.ts)).
- **Working Tree ist nicht clean**: 7 modifizierte Dateien (Tests +
  Simulator-Core + tsconfig). Inhaltlich sieht das nach Fortsetzung der
  Person-Tree-Aufraeumarbeiten aus.

## 1. Einfuehrung und Ziele

Das Projekt liefert eine Multi-Brand-Plattform fuer
Verguetungsplan-Simulatoren. Pro Brand entstehen zwei Artefakte: eine Astro-
Microsite und eine React/Vite-App. Die fachliche Simulationslogik liegt in
wiederverwendbaren Packages, Auth/Billing/Webhooks/Device-Limit als
Cloudflare Pages Functions. LifePlus ist die einzige produktiv konfigurierte
Brand; FitLine und Eqology sind technisch gebaut, aber inhaltlich/finanziell
noch Platzhalter.

Bewertung: Die fachliche Zielrichtung ist klar; die Trennung zwischen
Marketing-Site, App, Product Packs und API ist nach der Astro-Migration sogar
schaerfer geworden. Fuer den Live-Gang fehlt weiterhin mehr operative
Haertung als Architekturgrundlage.

## 2. Randbedingungen

- Frontend-Apps: React 18, Vite 5, Tailwind, vite-plugin-pwa.
- Microsite: Astro (statische Builds), Brand-Konfiguration via `brand.yaml`.
- Backend/API: Cloudflare Pages Functions (`functions/*`), D1, KV-Rate-Limit.
- Payment: Paddle Billing v2 als Merchant of Record.
- Mail: Resend fuer Magic Links.
- Hosting: IONOS fuer Site+App pro Brand, Cloudflare fuer API
  (`api.lifeflow360.app`).
- Datenschutz: Consent-Log und Audit-Tabelle vorhanden; DSGVO-Endpunkte
  (Export/Delete) weiterhin **nicht** implementiert.

Bewertung: Die Hybrid-Topologie aus IONOS und Cloudflare ist im
[functions/_middleware.ts](../../functions/_middleware.ts) klar dokumentiert
und enforced ALLOWED_ORIGINS strikt — `/api/*` antwortet nur fuer
whitelisted Origins mit CORS-Headern, alles andere wird 404. Das ist
konsequent. Risiko bleibt die Betriebsdisziplin (Cookies, Domains, drei
Brands mit jeweils eigener Cloudflare-Projekt-Konfiguration).

## 3. Kontextabgrenzung

Externe Systeme:

- **Paddle**: Checkout (Inline), Customer API, Webhook
  ([functions/api/paddle/webhook.ts](../../functions/api/paddle/webhook.ts)).
- **Resend**: Magic-Link-Mails ([functions/_lib/mailer.ts](../../functions/_lib/mailer.ts)).
- **Cloudflare D1**: Users, Subscriptions, Entitlements, Devices, Sessions,
  Magic-Link-Tokens, Checkout-Intents, Consent-Log, Webhook-Events.
- **Cloudflare KV** (`RATE_LIMIT`): Rate-Limiting fuer Auth-Endpoints.
- **IONOS / Brand-Domains**: statische Auslieferung der Microsite +
  Simulator-App.

Wichtigster fachlicher Kontext (unveraendert): Der Simulator entscheidet
nicht ueber realen Zugang. Die App rendert nur, wenn `/api/me` ein aktives
Entitlement bestaetigt; siehe [AuthGate.tsx:14-37](../../simulator-app/src/components/AuthGate.tsx#L14-L37)
und [me.ts:42-66](../../functions/api/me.ts#L42-L66).

## 4. Loesungsstrategie

Starke Entscheidungen (bestaetigt im aktuellen Stand):

- Product Packs kapseln Brand- und Verguetungsplan-Logik
  ([packages/product-lifeplus/](../../packages/product-lifeplus/),
  [packages/product-fitline/](../../packages/product-fitline/),
  [packages/product-eqology/](../../packages/product-eqology/)).
- `simulator-core` bleibt MLM-neutral
  ([packages/simulator-core/src/](../../packages/simulator-core/src/)).
- Astro-Microsite mit gemeinsamen Komponenten unter
  [website-astro/src/shared/components/sections/](../../website-astro/src/shared/components/sections/)
  und brand-spezifischen Overrides.
- Auth/Entitlements liegen serverseitig
  ([functions/api/](../../functions/api/)).
- Paddle-Webhooks werden signiert
  ([paddle-sig.ts](../../functions/_lib/paddle-sig.ts)), idempotent
  gespeichert (Tabelle `webhook_events`) und verarbeitet
  ([webhook.ts:87-115](../../functions/api/paddle/webhook.ts#L87-L115)).
- Server-seitiger Checkout-Intent
  ([checkout-intent.ts](../../functions/api/billing/checkout-intent.ts))
  verifiziert Webhook-Identitaet, statt nur auf `custom_data` zu vertrauen.

Architektur-Drift / offene Punkte:

- DSGVO-Endpunkte `/api/account/export` und `/api/account/delete` sind im
  Code weiterhin **nicht vorhanden**. Konzeptdokumente referenzieren sie.
  Im API-Tree liegen lediglich `auth`, `billing`, `devices`,
  `diagnostics`, `me.ts`, `paddle` ([functions/api/](../../functions/api/)).
- `authenticated_past_due` ist als AuthStatus deklariert
  ([useAuth.tsx:12-18](../../simulator-app/src/auth/useAuth.tsx#L12-L18)),
  wird in `deriveStatus` aber **nie zurueckgegeben**: jede aktive
  Entitlement-Zeile wird als `authenticated_active` behandelt
  ([useAuth.tsx:29-38](../../simulator-app/src/auth/useAuth.tsx#L29-L38)).
  Backend setzt zwar `valid_until + 7 Tage Grace` fuer `past_due`
  ([webhook.ts:604-617](../../functions/api/paddle/webhook.ts#L604-L617)),
  liefert aber `active: true`. Der Status ist damit fuer Nutzer/Support
  **weiterhin unsichtbar**. Identisches Symptom wie im 24.05.-Review.
- `customDataMatchesBrand` toleriert Webhooks ohne `brand_id`
  ([webhook.ts:408-414](../../functions/api/paddle/webhook.ts#L408-L414)).
  Bequem fuer Migration, fuer Live-Multi-Brand zu lax. Im aktuellen Stand
  ist nur **eine** Brand live, das Risiko ist theoretisch.
- Der **Webhook-Endpoint hat im aktuellen Stand keine erkennbare
  IP/Path-Restriction** ueber Cloudflare. Signatur-Pruefung deckt
  Replay/Manipulation ab, aber Volumen-Spam ist nicht rate-limited.
- Identitaetsregel im Webhook ist deutlich strikter als im letzten Review
  beschrieben: `resolveSubscriberIdentity`
  ([webhook.ts:453-492](../../functions/api/paddle/webhook.ts#L453-L492))
  zieht zuerst den Server-Intent, vergleicht mit `customData.checkout_email`
  und verwirft das Event bei Manipulation. Das ist eine deutliche
  Verbesserung.

## 5. Bausteinsicht

### Simulator-App

Pfad: [simulator-app/src/](../../simulator-app/src/)

Die App ist sauber in Auth-Gate, Account-/Device-Komponenten,
Visualisierungen und Simulations-UI aufgeteilt.
[main.tsx](../../simulator-app/src/main.tsx) kapselt den Simulator hinter
`AuthProvider` und `AuthGate`. Die eigentliche Simulation wird clientseitig
aus Product Pack, Inputs, Growth-Modulator und Goals berechnet.

Neue/erweiterte Komponenten gegenueber dem 24.05.-Review:

- `network/` und `person-tree/` als eigene Unterordner mit eigenen Tests
  (`person-tree-node.test.ts`, `sunburst-node.test.ts`).
- `lineage/` als zusaetzlicher Visualisierungs-Bereich (Horizontal
  Dendrogramm, Radial Tree — siehe Commits `0487f59`, `01ac7ac`).
- `NumberStepper` und `Slider` neu, optional kombiniert (Commit `ba993af`).

Review:

- Gut: klare Trennung zwischen Zugangskontrolle und Simulator.
- Gut: lokale Persistenz ist auf UI-/Simulationsparameter begrenzt, nicht
  auf Zahlungsstatus.
- Gut: Dev-Auth-Bypass ist sauber per `import.meta.env.DEV` + Flag gating
  ([useAuth.tsx:87-89](../../simulator-app/src/auth/useAuth.tsx#L87-L89)) —
  in Production-Builds kann das nicht aktiv werden.
- Risiko (unveraendert): `App.tsx` ist mit **781 Zeilen** unveraendert
  gross und buendelt UI-State, Simulation, Persistenz und Layout in einer
  Datei. Mit den neuen Visualisierungen ist die Datei tendenziell weiter
  gewachsen.
- Risiko (unveraendert, sogar verschaerft): Past-due und Grace-Status
  bleiben fuer Nutzer unsichtbar — die App rendert in dem Fall
  schweigend den vollen Simulator (siehe oben unter "Architektur-Drift").
- Risiko: `pwaUpdates.ts` wird beim App-Start initialisiert
  ([main.tsx:11](../../simulator-app/src/main.tsx#L11)). PWA-Strategie ist
  laut README aber noch offen; vor Livegang muss eine Entscheidung zu PWA
  ja/nein vorliegen (Sperreffekt bei Service-Worker-Updates).

### Domain Packages

Pfad: [packages/](../../packages/)

Die Paketstruktur ist die staerkste Architekturentscheidung im Projekt:

- [simulator-core](../../packages/simulator-core/src/) — MLM-neutrale
  Netzwerk- und Simulationslogik (`person-tree.ts`, `tree-generator.ts`,
  `simulation.ts`, `network-snapshot.ts`).
- [product-lifeplus](../../packages/product-lifeplus/src/) — aktive
  Plan-Implementierung (`plan.ts`, `compensation.ts`, `tree-compensation.ts`,
  `tree-simulation.ts`, `payout-slots.ts`, `ranks.ts`).
- [product-fitline](../../packages/product-fitline/src/index.ts),
  [product-eqology](../../packages/product-eqology/src/index.ts) — eigene
  Markenwerte, importieren denselben `lifeplusPlan` (Drift-Policy aus
  README beachten).
- [product-registry](../../packages/product-registry/src/index.ts) —
  explizite Produkt-Registry.
- [simulator-goals](../../packages/simulator-goals/src/) — Ziel-Evaluator,
  Presets.
- [simulator-realistic-growth](../../packages/simulator-realistic-growth/src/) —
  Wachstumsstrategien (`momentum.ts`, `dirichlet.ts`) + deterministisches
  `rng.ts`.

Review:

- Gut: 121 Tests laufen gruen, 1 Test bewusst skipped
  (`profile-sim.test.ts`).
- Gut: Person-Tree-Equivalence-Tests
  ([person-tree-equivalence.test.ts](../../packages/simulator-core/tests/person-tree-equivalence.test.ts))
  decken die neue Tree-Generator-Logik gegen die alte Berechnung ab —
  wichtiger Schutz nach dem Aggregations-Path-Cleanup.
- Risiko: Tree-Generator ist stark gewachsen
  ([tree-generator.ts](../../packages/simulator-core/src/tree-generator.ts)
  ist im aktuellen Diff +485 LOC). Das ist eng an die Memory `feedback_network_single_source.md`
  geknuepft (Netzwerk = einzige Quelle), aber eine gezielte Code-Review
  dieser einen Datei waere fuer Live sinnvoll.
- Risiko (unveraendert): Drift-Policy ist im README dokumentiert
  ([README.md:163-168](../../README.md#L163-L168)), aber im UI nicht
  ersichtlich. FitLine/Eqology-Kaeufer koennten erwarten, dass die Plaene
  validiert sind — sind sie nicht.

### API / Functions

Pfad: [functions/](../../functions/)

API ist klein und fokussiert. Aktueller Endpoint-Bestand:

| Pfad | Zweck |
|------|-------|
| [api/me.ts](../../functions/api/me.ts) | Session/Entitlement-Lookup, Lazy-Trial-Degradierung |
| [api/auth/request-link.ts](../../functions/api/auth/request-link.ts) | Magic-Link-Erstellung mit optional Free-Signup-Consent |
| [api/auth/verify-link.ts](../../functions/api/auth/verify-link.ts) | Token-Verify, Trial-Grant, Session-Cookie |
| [api/auth/logout.ts](../../functions/api/auth/logout.ts) | Session-Revoke |
| [api/auth/dev-login.ts](../../functions/api/auth/dev-login.ts) | Dev-only Bypass |
| [api/billing/checkout-intent.ts](../../functions/api/billing/checkout-intent.ts) | Server-Intent + Plan/Email-Validierung |
| [api/billing/portal.ts](../../functions/api/billing/portal.ts) | Paddle Customer Portal |
| [api/billing/post-checkout.ts](../../functions/api/billing/post-checkout.ts) | Post-Checkout-Redirect/Status |
| [api/devices/index.ts](../../functions/api/devices/index.ts) | Device-Liste |
| [api/devices/revoke.ts](../../functions/api/devices/revoke.ts) | Device-Revoke |
| [api/diagnostics/paddle-prices.ts](../../functions/api/diagnostics/paddle-prices.ts) | Diagnose, Paddle-Preise |
| [api/diagnostics/resend-test.ts](../../functions/api/diagnostics/resend-test.ts) | Diagnose, Mail-Versand |
| [api/paddle/webhook.ts](../../functions/api/paddle/webhook.ts) | Paddle-Event-Verarbeitung |

Review:

- Gut: Webhook-Signatur + Idempotenz ueber `webhook_events`-Tabelle
  vorhanden; Re-Delivery wird mit `text("duplicate", 200)` beantwortet.
- Gut: Checkout-Intent verhindert customData-Manipulation; die
  `webhook_intent_email_mismatch`-Warnung fuer fremde Adressen ist
  audit-tauglich.
- Gut: Rate-Limits sind durchgaengig per `consumeRateLimit` umgesetzt
  ([request-link.ts:84-91](../../functions/api/auth/request-link.ts#L84-L91)
  10 req/600s pro IP + 3 req/1800s pro Email).
- Gut: Free-Signup-Consent ist jetzt **Pflicht im Magic-Link-Token**
  ([request-link.ts:60-81](../../functions/api/auth/request-link.ts#L60-L81),
  [verify-link.ts:93-117](../../functions/api/auth/verify-link.ts#L93-L117)),
  zusammen mit idempotenter Consent-Log-Schreibung. Das ist deutlich besser
  als ein reines Frontend-Checkbox-Gating.
- Gut: Verify-Endpoint markiert Token early und gibt es bei Fehler wieder
  frei ([verify-link.ts:81-198](../../functions/api/auth/verify-link.ts#L81-L198)).
  Race-safe und im Failure-Fall fuer Nutzer ohne neuen Magic-Link erneut
  klickbar.
- Gut: Lazy-Trial-Degradierung
  ([db.ts:273-307](../../functions/_lib/db.ts#L273-L307)) ist idempotent
  und race-safe via WHERE-Bedingung.
- Risiko: `customDataMatchesBrand` weiter laxer Fallback (Webhook ohne
  `brand_id` wird akzeptiert).
- Risiko: **DSGVO-Endpunkte fehlen weiterhin komplett.** Es gibt nirgendwo
  `/api/account/export` oder `/api/account/delete`. Memory-Eintrag
  `project_account_deletion_and_antiabuse` ist damit Stand offene Pflicht
  vor Livegang.
- Risiko: `customDataMatchesBrand` und Brand-Check im Webhook sind die
  einzige Identifikation, dass ein Paddle-Event "uns" gehoert.
  `customData.brand_id === undefined` wird als "passt" gewertet. Im
  Multi-Brand-Live-Betrieb sollte mindestens **gewarnt + verworfen**
  werden, sobald ein anderes Paddle-Projekt das gleiche Pages-Project
  callt.
- Risiko: Diagnostics-Endpoints (`diagnostics/paddle-prices.ts`,
  `diagnostics/resend-test.ts`) sind unter `/api/diagnostics/*` exponiert.
  Sollten vor Live entweder hinter Auth gesteckt oder per
  Pages-Routing/`_middleware` gesperrt werden — sie geben sonst
  Konfigurationsdetails preis.

### Microsite (Astro)

Pfad: [website-astro/](../../website-astro/)

Die Microsite ist nach der Migration brand-strukturiert:

- [src/brands/<brand>/brand.yaml](../../website-astro/src/brands/lifeplus/brand.yaml)
  enthaelt Domains, App-URL, API-Base, Paddle-IDs, Brand-Farben und
  Lockup-Daten.
- [src/brands/<brand>/pages/](../../website-astro/src/brands/lifeplus/pages/)
  enthaelt die HTML-Seiten (Index, Pricing, Features, Login, Signup,
  Checkout, Mein-Konto, AGB, Datenschutz, Impressum, Widerruf, Debug).
- [src/brands/<brand>/content/](../../website-astro/src/brands/lifeplus/content/)
  enthaelt YAML-Content (z.B. `pricing.yaml`).
- [src/shared/components/sections/](../../website-astro/src/shared/components/sections/)
  enthaelt wiederverwendbare Section-Komponenten (LoginPage, SignupPage,
  CheckoutPage, AccountPageDefault, Pricing, Features, Legal-Seiten).
- [src/shared/scripts/](../../website-astro/src/shared/scripts/) enthaelt
  Inline-Scripts (`loginInline.ts`, `signupInline.ts`, `checkoutInline.ts`,
  `accountPage.ts`, `accountLink.ts`, `debug.ts`).
- [src/shared/lib/](../../website-astro/src/shared/lib/) enthaelt
  Hilfsfunktionen (`brand.ts`, `contact.ts`, `pageContent.ts`).

Review:

- Gut: Astro liefert pro Brand eigene `.html`-Dateien aus, der Build ist
  reproduzierbar (`9 page(s) built in ~3s` je Brand im aktuellen Run).
- Gut: Brand-Konfiguration ist YAML-typisiert via Content-Schemas
  ([src/shared/content-schemas/](../../website-astro/src/shared/content-schemas/)),
  nicht mehr String-Replace.
- Gut: Debug-Modus mit `?debug=1` und `vscode://`-Links
  ([README.md:144-160](../../README.md#L144-L160)) erleichtert Review.
- Gut: Open-Redirect-Schutz fuer `next`-URL via
  [request-link.ts:36-43](../../functions/api/auth/request-link.ts#L36-L43)
  (Whitelist `/checkout/(monthly|halfyear|yearly)`).
- Gut: Brand-spezifischer Astro-Cache vermeidet Parallel-Build-Konflikte
  (sequentielle Build-Skripte im Root-`package.json`).
- Risiko: FitLine/Eqology haben weiterhin Platzhalter-Paddle-IDs
  ([README.md:122-134](../../README.md#L122-L134) ausdruecklich
  dokumentiert). Beide Brands duerfen nicht als kaufbar live geschaltet
  werden — der Free-Magic-Link wuerde gegen die LifePlus-API
  `api.lifeflow360.app` laufen (kein eigenes Cloudflare-Projekt).
- Risiko: `loginInline.ts`/`signupInline.ts` setzen UX via `prompt`/`alert`
  voraus (siehe Memory `feedback_free_login_ux`). Vor Launch muss ein
  UX-Pass auf die Free-Login-Seite, sonst wird die Akzeptanz leiden.
- Risiko: Die Microsite und die App teilen jetzt zwei verschiedene Login-
  Pfade — App-Login via Magic-Link mit Cookie auf `api.lifeflow360.app`,
  Site-Login via `loginInline.ts` direkt auf der Marketing-Domain. Cookie-
  Domain ist `.lifeflow360.app` (siehe [wrangler.toml:23](../../wrangler.toml#L23)),
  also gilt die Session ueber beide Hosts. Das ist OK, aber Cookie-Pruefung
  fuer FitLine/Eqology funktioniert mangels gemeinsamer Apex-Domain nicht.

## 6. Laufzeitsicht

Zentrale Flows (gegenueber dem 24.05.-Review erweitert):

**Pro-Checkout (mit Login):**

1. Nutzer besucht Pricing auf der Microsite.
2. Klick auf Plan-CTA → [/checkout/{plan}.html](../../website-astro/src/brands/lifeplus/pages/checkout/[plan].astro).
3. Step 1: E-Mail + AGB + DSE. Optional Newsletter, optional
   Widerrufsverzicht (siehe Memory `feedback_widerrufsverzicht_optional`).
4. Frontend ruft `/api/billing/checkout-intent` auf.
5. Backend validiert Plan, Email, Session und gibt **Action** zurueck:
   `start_checkout`, `manage_subscription`, `already_paid`, `email_mismatch`,
   `login_required`, `invalid_plan`.
6. Bei `start_checkout`: Paddle-Inline-Iframe wird mit `intent_id` als
   `customData` geladen.
7. Paddle sendet Webhook → Signaturpruefung → Idempotenz-Check →
   `resolveSubscriberIdentity` matcht den Intent → Subscription +
   Entitlement schreiben → Consent-Log persistieren.
8. App prueft `/api/me` und rendert Simulator.

**Free-Signup (NEU strikter):**

1. Nutzer besucht
   [signup.astro](../../website-astro/src/brands/lifeplus/pages/signup.astro).
2. Email + AGB + Datenschutz (Pflicht) → `/api/auth/request-link` mit
   `access: "free"` und `consent`-Snapshot.
3. Server prueft Consent serverseitig, persistiert Snapshot in
   `magic_login_tokens.consent_payload_json`.
4. Mail via Resend, Token landet in Magic-Link mit `&access=free`.
5. Klick → `/api/auth/verify-link` mit `access: "free"`.
6. Server: Token markiert, Trial gegrantet, Consent-Log idempotent
   geschrieben, Session-Cookie gesetzt.
7. Nach 14 Tagen Lazy-Degradierung auf `free`/`trial_expired` (idempotent,
   race-safe).

**Past-due / Grace:**

1. Paddle sendet `subscription.past_due`.
2. Backend setzt `valid_until = periodEndsAt + 7 Tage`,
   `access_level = pro`.
3. `/api/me` antwortet `active: true` mit `source: "subscription"`.
4. UI rendert **regulaer**, ohne Hinweis auf Past-due.

Bewertung: Der Pro-Checkout-Flow ist deutlich solider als am 24.05.; der
Server-Intent-Mechanismus mit `intent_id` + Email-Match schliesst die
zentrale Manipulationsluecke. Der Free-Flow ist consent-mit-Audit korrekt.

Die Past-due/Grace-Sichtbarkeit bleibt der **groesste Laufzeitfehler** — sie
ist im Datenmodell vorhanden, im API-Response sichtbar
(`source: subscription` + `valid_until` mit Grace), aber wird vom Frontend
ignoriert (`deriveStatus`).

## 7. Verteilungssicht

Artefakte (post-Migration):

- `dist/<brand>-app/` fuer App-Builds (frueher `dist/<brand>/`).
- `dist/<brand>-website/` fuer Microsites (frueher `dist/site-<brand>/`).
- `dist/<brand>-website/app/` fuer den Webroot-Build (Microsite +
  Simulator-App gemeinsam unter einer Domain).
- `functions/*` als Cloudflare-Pages-Functions im Projekt
  `lifeflow360-api`.
- `migrations/0001..0006` fuer D1-Schema.

Deployment-Mapping ([README.md:67-71](../../README.md#L67-L71)):

| Brand    | Webroot | App | Domain |
|----------|---------|-----|--------|
| LifePlus | `dist/lifeplus-website/` | `dist/lifeplus-app/` | `www.lifeflow360.app` |
| FitLine  | `dist/fitline-website/`  | `dist/fitline-app/`  | `fitflow360.triltsch.com` |
| Eqology  | `dist/eqology-website/`  | `dist/eqology-app/`  | `eqoflow360.triltsch.com` |

Bewertung: Deployment-Modell ist sauber und nun auch konsistent benannt.
LifePlus ist auf Zieldomain `.app`, FitLine/Eqology stehen weiterhin auf
`*.triltsch.com` (Staging — Memory `project_brand_domains` deckt das).

Asymmetrie bleibt: nur LifePlus hat ein eigenes Cloudflare-Pages-Projekt
und eine eigene D1/KV. FitLine/Eqology sind ohne API-Backend nicht
betreibbar.

## 8. Querschnittliche Konzepte

### Sicherheit

Positiv:

- Server-seitiges Entitlement; Frontend kann nicht "freischalten".
- HttpOnly Session-Cookies via API.
- Rate-Limits auf Auth.
- Webhook-Signaturpruefung + Replay-Idempotenz.
- Keine Payment-Secrets im Frontend (Paddle-Client-Token ist public).
- Server-Intent gegen customData-Manipulation.
- Open-Redirect-Schutz fuer `next`-URL.
- Consent-Audit-Log (`consent_log` + `magic_login_tokens.consent_payload_json`).

Offen:

- DSGVO-Endpunkte Export/Delete.
- Brand-Pruefung fuer Webhooks (`customData.brand_id` ist optional).
- Diagnostics-Endpoints unter `/api/diagnostics/*` sollten nicht oeffentlich
  sein.
- Alerting fuer Webhook-Fehler / fehlgeschlagene
  Idempotency-Wiederholungen ist nicht dokumentiert.
- npm-audit Stand 2026-05-29: 18 Findings (15 moderate, 3 high), alle in
  Dev-/Build-Toolchain (siehe [README.md:113-120](../../README.md#L113-L120)).
  Vor Livegang explizit dokumentieren, dass kein Runtime-Bug exposed ist;
  Findings sollten in einem Sicherheits-Statement festgehalten werden.

### Datenschutz

- Datenmodell ist nach wie vor angemessen minimal.
- Consent-Log unterscheidet `free_signup` und `pro_checkout`-Context.
- Soft-Delete fuer Users ueber `deleted_at`-Spalte vorbereitet, aber kein
  Endpunkt nutzt das.

Vor Livegang muessen Export, Loeschung/Anonymisierung und
Datenschutzerklaerung synchron abgeschlossen sein. Das ist die offenste
Block-Achse.

### Wartbarkeit

- Astro-Migration ist eine deutliche Verbesserung gegenueber dem
  String-Replace-Build. Brand-Konfiguration in YAML mit Schemas ist
  testbar.
- Package-Grenzen sind weiterhin gut.
- `App.tsx` bleibt mit 781 Zeilen das groesste Wartbarkeitsrisiko in der
  App.
- `tree-generator.ts` ist nach den Aenderungen die zweite Stelle, die ein
  gezieltes Refactoring lohnen koennte. Equivalence-Tests federn das ab.

### Performance

- `npm run build:all` baut alle drei Brands + Apps in unter 1 Minute.
- Vite meldet weiterhin JS-Chunks > 500 kB pro App-Build:
  `dist/eqology-app/assets/index-*.js: 700.08 kB` (gzip 200 kB).
- LCP-relevanter Marketing-Inhalt ist statisches Astro-HTML — gut.

## 9. Architekturentscheidungen

Explizit und plausibel:

- Eine Codebasis, mehrere Brand-Builds.
- Pro Brand getrennte Identitaet und Abrechnung (Memory
  `project_brand_separation`).
- Paddle als Merchant of Record.
- Cloudflare API mit D1/KV/Pages-Functions.
- Clientseitige Simulation statt API-Rechenlast.
- Webhook-basierte Freischaltung + Server-Intent als Anti-Spoofing.
- Astro statt Custom-Template-Engine fuer Microsite (NEU, durch Migration
  bestaetigt).
- App ohne Account-Management — alles laeuft ueber die Webseite (Memory
  `project_app_no_account_management`).

Noch als ADR nachziehbar (unveraendert):

- Warum Hybrid-Hosting IONOS + Cloudflare statt alles Cloudflare Pages
  (Memory `project_deployment_topology` deckt das Warum, eine ADR im Repo
  fehlt).
- Warum PWA fuer Go-live aktiv bleiben soll oder nicht.
- Wie streng `brand_id` in Paddle-Webhooks behandelt werden soll.
- Welche Support-/Admin-Funktionen fuer Launch minimal noetig sind.

Neu zu beschreiben:

- ADR: "Server-Intent-First Identitaetsregel" — warum
  `resolveSubscriberIdentity` Server-Intent ueber customData stellt und
  warum Email-Mismatch das Event verwirft.
- ADR: "Free-Signup-Consent in Magic-Link-Token" — warum Consent in
  `consent_payload_json` persistiert wird statt nur im Frontend.

## 10. Risiken und technische Schulden

Hoch:

- **DSGVO-Endpunkte fuer Export/Loeschung fehlen weiterhin.** Konzeptlich
  dokumentiert, im Code nicht vorhanden. Vor Livegang Pflicht.
- **Past-due/Grace ist im UI unsichtbar.** `deriveStatus` mapt jeden aktiven
  Eintrag auf `authenticated_active`; das Backend liefert kein eigenes
  Signal. Support kann den Zustand nicht erklaeren, ohne in die DB zu
  schauen.
- **FitLine/Eqology duerfen mit Platzhalter-Paddle nicht live kaufbar
  sein.** Im README ausdruecklich dokumentiert. Das CTA-Verhalten dieser
  Brands sollte vor Live entweder hart deaktiviert oder hinter ein
  "coming-soon"-Flag gelegt werden.

Mittel:

- **Free-Login UX (`prompt`/`alert`)** muss vor Launch ueberarbeitet werden
  (Memory `feedback_free_login_ux`).
- **Diagnostics-Endpoints** unter `/api/diagnostics/*` sind unauthentifiziert
  exponiert. Vor Live deaktivieren oder schuetzen.
- **Webhook-Brand-Matching** akzeptiert Events ohne `brand_id`. Im Live-
  Multi-Brand-Setup zu lax.
- **Keine dokumentierte Monitoring-/Alerting-Strecke** fuer fehlgeschlagene
  Webhooks oder Mailer-Outages. Resend-Failures werden mit 502 zurueck-
  gegeben + Token-Cleanup, aber niemand wird benachrichtigt.
- **Grosse App-Chunks (700 kB)** koennen Mobile-Startzeit verschlechtern;
  Code-Splitting fuer Visualisierungen ist Kandidat.
- **3 npm-audit High-Findings** (Dev-Toolchain). Vor Live als bekanntes
  Risiko festhalten.
- **Working Tree ist nicht clean.** 7 modifizierte Dateien, vorrangig
  Person-Tree-Logik. Vor jedem Tag/Release sicherstellen, dass diese
  Aenderungen entweder committet oder zurueckgesetzt sind.

Niedrig:

- `App.tsx` (781 LOC) buendelt zu viel UI- und Simulations-Orchestrierung.
- `tree-generator.ts` ist nach dem +485-LOC-Diff der zweite Mono-File
  geworden — Refactoring-Kandidat, aber mit gutem Test-Sicherheitsnetz.
- Cookie-Domain `.lifeflow360.app` deckt FitLine/Eqology nicht ab — nicht
  blocker, da sie eh nicht live kaufbar sind.

## 11. Review-Ergebnis

Gesamtbewertung: Die Architektur ist nach der Astro-Migration und dem
Identitaets-/Consent-Hardening sichtbar reifer als am 24.05.. Der
LifePlus-Sandbox-Betrieb sollte mit den jetzt vorhandenen Mechanismen
(Server-Intent, Idempotency, Signaturpruefung, Lazy-Degradierung,
Rate-Limit, Consent-Audit) belastbar sein.

Fuer den echten Livegang fehlen weiterhin:

1. **DSGVO-Endpoints** `/api/account/export` und `/api/account/delete`.
   Ohne diese kein Live-Betrieb mit echten Kunden — siehe Memory
   `project_account_deletion_and_antiabuse`.
2. **Past-due/Grace im UI** explizit machen. Mindestens Banner +
   Account-Page-Hinweis. Backend kann das aus
   `entitlement.source === 'subscription' && entitlement.valid_until - now < 7 * 86_400_000`
   ableiten und im `/api/me`-Response neben `active` einen `grace`-Flag
   liefern.
3. **FitLine/Eqology CTAs deaktivieren** oder hinter Feature-Flag, solange
   keine echten Paddle-IDs und kein eigenes API-Backend gesetzt sind.
4. **Diagnostics-Routes** entfernen oder hinter Auth.
5. **Free-Login UX-Pass** (kein `prompt`/`alert`-Flow).
6. **LifePlus-E2E in Paddle Sandbox** mit neuem Server-Intent-Flow:
   neuer Kauf, bestehender Kunde, Refund, Webhook-Retry, Device 4.
7. **Webhook-Brand-Pruefung strikter machen** fuer Multi-Brand-Live.
8. **PWA-Strategie endgueltig festlegen** (auf/aus, Cache-Strategie).
9. **Kurze ADRs nachziehen**: Hybrid-Hosting, PWA, Multi-Brand,
   Server-Intent-First, Consent-in-Token.

Empfohlene Reihenfolge bis Live:

1. (1) DSGVO-Endpoints implementieren — blocker, nicht verhandelbar.
2. (4) Diagnostics-Endpoints absichern — schnell, hohe Risikoreduktion.
3. (3) FitLine/Eqology CTAs hart abschalten — schnell, Live-Schutz.
4. (2) Past-due/Grace im API + UI — mittlerer Aufwand, hoher Nutzen fuer
   Support und Vertrauen.
5. (6) E2E in Paddle Sandbox durchlaufen — Verifikation des
   Server-Intent-Flusses.
6. (5) Free-Login UX — UI-Refactor.
7. (7) Webhook-Brand-Pruefung strikter.
8. (8) PWA-Entscheidung + (9) ADRs.

## Verifikation

Ausgefuehrt am 2026-06-02:

```powershell
npm.cmd test
npm.cmd run build:all
```

Ergebnis:

- 15 Testdateien erfolgreich, 1 Test bewusst skipped.
- 121 Tests erfolgreich.
- 3 Astro-Microsites gebaut (LifePlus, FitLine, Eqology), je 9 Pages.
- 3 App-Builds erfolgreich.
- 3 Webroot-Builds (Microsite + `app/`) erfolgreich.
- Hinweis: Vite meldet pro App-Build einen JS-Chunk > 500 kB
  (zuletzt 700 kB bei Eqology-App).
- Working Tree war zum Reviewzeitpunkt nicht clean (7 modifizierte Dateien
  rund um Person-Tree-Logik).
