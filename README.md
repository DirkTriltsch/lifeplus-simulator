# MLM Simulator Platform

Gemeinsame Codebasis für mehrere produktbezogene Vergütungs-Simulatoren.
Pro Produkt gibt es **zwei** Deployment-Artefakte: eine erklärende Microsite
und die Simulator-App. Impressum und Datenschutz liegen auf der Microsite,
die App enthält nur noch den Simulator.

## Struktur

```text
simulator-app/          React/Vite-Webapp, pro Produkt gebaut

website/                Statische Microsite, pro Produkt gebaut
├── templates/          HTML-Templates mit {{TOKEN}}-Platzhaltern
├── public/             Statische Assets (Favicon, robots.txt)
├── scripts/            Build-Script (Node, ohne deps)
└── brands.json         Brand-Config für alle drei Produkte

packages/
├── simulator-core/     MLM-neutrale Netzwerk- und Simulationslogik
├── product-lifeplus/   Aktive Plan-Implementierung
├── product-fitline/    Eigenes Product Pack, nutzt vorerst LifePlus-Plan
├── product-eqology/    Eigenes Product Pack, nutzt vorerst LifePlus-Plan
└── product-registry/   Explizite Produkt-Registry

tests/
└── contracts/          Produktübergreifende Contract-Tests

functions/               Cloudflare Pages Functions fuer Auth, Billing,
                         Paddle-Webhooks und Geraete-Limit
migrations/              D1-Schema fuer die API
public/                  Minimaler Static-Output fuer Pages Functions
```

## Entwicklungsbefehle

### Simulator-App

```bash
npm run dev:lifeplus
npm run dev:fitline
npm run dev:eqology

npm run build:lifeplus     # -> dist/lifeplus/
npm run build:fitline      # -> dist/fitline/
npm run build:eqology      # -> dist/eqology/
```

### Microsite

```bash
npm run build:site:lifeplus    # -> dist/site-lifeplus/
npm run build:site:fitline     # -> dist/site-fitline/
npm run build:site:eqology     # -> dist/site-eqology/
npm run build:sites            # alle drei auf einmal
```

### Alles auf einmal

```bash
npm run build:all              # 3 Apps + 3 Microsites
npm run build:webroot:lifeplus # -> dist/site-lifeplus/ inkl. app/ fuer www.lifeflow360.app
npm run build:webroot:fitline  # -> dist/site-fitline/  inkl. app/ fuer fitflow360.triltsch.com
npm run build:webroot:eqology  # -> dist/site-eqology/  inkl. app/ fuer eqoflow360.triltsch.com
npm test
```

## Deployment-Mapping

| Brand    | Webroot (Microsite + App) | App-Build (Standalone)  | Domain (Stand 2026-05-22)        |
|----------|---------------------------|-------------------------|----------------------------------|
| LifePlus | `dist/site-lifeplus/`     | `dist/lifeplus/`        | `www.lifeflow360.app`            |
| FitLine  | `dist/site-fitline/`      | `dist/fitline/`         | `fitflow360.triltsch.com` (Staging) |
| Eqology  | `dist/site-eqology/`      | `dist/eqology/`         | `eqoflow360.triltsch.com` (Staging) |

`build:webroot:<brand>` baut zuerst Microsite und App separat und kopiert
dann den App-Build nach `dist/site-<brand>/app/`. Damit liegen Marketing-
Site und Simulator gemeinsam unter `https://<domain>/` bzw.
`https://<domain>/app/`. Der Standalone-Ordner `dist/<brand>/` wird vor
allem fuer SFTP-Deploys benutzt, wenn nur der App-Teil neu hochgeladen
werden soll.

Die App linkt im Footer auf `https://<domain>/impressum.html` und
`https://<domain>/datenschutz.html`. Die Microsite linkt per CTA auf
die App-URL (in `website/brands.json` konfiguriert).

## Payment/API-Status

LifePlus ist aktuell die einzige Brand mit kompletter Payment-/API-
Konfiguration im Repo:

- `website/brands.json` enthaelt fuer LifePlus Sandbox-Token, Monthly- und
  Yearly-Price-ID sowie `apiBaseUrl = https://api.lifeflow360.app`.
- `wrangler.toml` beschreibt das LifePlus-Pages-Projekt
  `lifeflow360-api` mit D1/KV-Bindings und den Paddle-Price-IDs.
- Checkout laeuft ueber `website/templates/pricing.html`: Die Seite fragt
  zuerst eine E-Mail ab, ruft `POST /api/billing/checkout-intent` auf und
  oeffnet Paddle nur bei `action = "start_checkout"`.
- Der Webhook verarbeitet Paddle Billing v2 Events
  `subscription.*`, `transaction.paid`, `transaction.payment_failed`,
  `transaction.canceled`, `adjustment.created` und `adjustment.updated`.
- Magic-Link Login, Session-Cookie, 3-Geraete-Limit und Paddle Customer
  Portal liegen in `functions/api/*` und `simulator-app/src/auth/*`.

FitLine und Eqology haben eigene Product Packs, Microsites und App-Builds,
aber noch keine echten Paddle-IDs, API-Subdomains oder Pages-Projekte. Ihre
`paddle.*`-Werte in `website/brands.json` bleiben deshalb Platzhalter, bis
die Brand-Setups separat angelegt werden.

## Microsite anpassen

- **Brand-spezifisch** (Name, Farbe, Claim, App-URL):
  `website/brands.json`
- **Paddle/API-Konfiguration pro Brand**:
  `website/brands.json` (`paddle.*`, `apiBaseUrl`) und fuer LifePlus
  zusaetzlich `wrangler.toml`
- **Layout/Texte aller Sites**:
  `website/templates/*.html`
- **Stil**:
  `website/templates/styles.css`

## Fachliche Drift-Policy

Bis echte Vergütungspläne für FitLine und Eqology vorliegen, gibt es genau
eine aktive Plan-Implementierung: `product-lifeplus`. Die Product Packs für
FitLine und Eqology besitzen eigene Domains, Markenwerte, Terminologie,
Defaults und Tests, importieren aber bewusst denselben Planadapter. Erst mit
den echten Fachunterlagen werden die Pläne getrennt.
