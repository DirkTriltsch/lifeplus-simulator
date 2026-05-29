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

website-legacy/         Archiv der alten statischen Template-Website

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

## Migration Notes

Die Marketing-Sites werden seit der Astro-Migration aus `website-astro/`
gebaut. `website/` ist als `website-legacy/` archiviert und nicht mehr Teil
der Workspaces oder Build-Skripte.

Breaking Changes fuer externe Konsumenten:

| Alt | Neu |
|-----|-----|
| `dist/site-<brand>/` | `dist/<brand>-website/` |
| `dist/<brand>/` | `dist/<brand>-app/` |
| `website/brands.json` | `website-astro/src/brands/<brand>/brand.yaml` |
| `website/templates/*.html` | `website-astro/src/shared/components/` und `website-astro/src/brands/<brand>/pages/` |
| `website/marks/*.svg` | `website-astro/src/brands/<brand>/public/favicon.svg` |

CI-Jobs, SFTP-Profile, visuelle Vergleichsskripte und manuelle Upload-Notizen
muessen die neuen `dist/<brand>-website/`- und `dist/<brand>-app/`-Pfade
verwenden. Brand-Builds duerfen nicht parallel im selben `website-astro/`
Arbeitsverzeichnis laufen, weil Astro den `.astro`-Arbeitscache pro Build
nutzt; die Root-Skripte bauen deshalb sequentiell.

## Live-Deploy Checkliste

- Free-Tier Click: E-Mail-Prompt, Magic-Link-Versand, Hinweis-Overlay und Login
  in Staging testen.
- Pro-Tier Clicks fuer Monthly, Halfyear und Yearly mit Sandbox-Paddle testen:
  Checkout-Intent, Paddle Overlay und Rueckkehr zur Magic-Link-Logik.
- `mein-konto.html`: Magic-Link-Verify und Account-Status-Render pruefen.
- Visuellen Screenshot-Vergleich gegen den letzten akzeptierten Build machen,
  besonders Pricing Cards, Compare-Tabelle, Hero und Footer.
- `npm audit` separat bearbeiten. Aktueller Stand nach Lockfile-Update:
  18 Findings, davon 15 moderate und 3 high.

## Payment/API-Status

LifePlus ist aktuell die einzige Brand mit kompletter Payment-/API-
Konfiguration im Repo. Die Konfigurationen liegen in
`website-astro/src/brands/<brand>/brand.yaml` und fuer LifePlus zusaetzlich in
`wrangler.toml`.

FitLine und Eqology haben eigene Product Packs, Astro-Microsites und App-Builds,
aber noch keine echten Paddle-IDs, API-Subdomains oder Pages-Projekte. Ihre
`paddle.*`-Werte bleiben Platzhalter, bis die Brand-Setups separat angelegt
werden.

## Microsite Anpassen

- Brand-spezifisch: `website-astro/src/brands/<brand>/brand.yaml`
- Seitencontent: `website-astro/src/brands/<brand>/content/*.yaml`
- Brand-Pages und Overrides: `website-astro/src/brands/<brand>/pages/`
- Gemeinsame Komponenten: `website-astro/src/shared/components/`
- Gemeinsame Styles und Scripts: `website-astro/src/shared/styles/` und `website-astro/src/shared/scripts/`

## Fachliche Drift-Policy

Bis echte Verguetungsplaene fuer FitLine und Eqology vorliegen, gibt es genau
eine aktive Plan-Implementierung: `product-lifeplus`. Die Product Packs fuer
FitLine und Eqology besitzen eigene Domains, Markenwerte, Terminologie,
Defaults und Tests, importieren aber bewusst denselben Planadapter. Erst mit
den echten Fachunterlagen werden die Plaene getrennt.
