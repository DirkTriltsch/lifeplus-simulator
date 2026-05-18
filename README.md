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
npm test
```

## Deployment-Mapping

| Brand    | Microsite (www.lifeflow360.app / …) | App (`/app` on the same host) |
|----------|--------------------------------------|------------------------------|
| LifePlus | `dist/site-lifeplus/`                | `dist/site-lifeplus/app/`    |
| FitLine  | `dist/site-fitline/`                 | `dist/fitline/`              |
| Eqology  | `dist/site-eqology/`                 | `dist/eqology/`              |

Die App linkt im Footer auf `https://<domain>/impressum.html` und
`https://<domain>/datenschutz.html`. Die Microsite linkt per CTA auf
die App-URL (in `website/brands.json` konfiguriert).

## Microsite anpassen

- **Brand-spezifisch** (Name, Farbe, Claim, App-URL):
  `website/brands.json`
- **Layout/Texte aller Sites**:
  `website/templates/{index,impressum,datenschutz}.html`
- **Stil**:
  `website/templates/styles.css`

## Fachliche Drift-Policy

Bis echte Vergütungspläne für FitLine und Eqology vorliegen, gibt es genau
eine aktive Plan-Implementierung: `product-lifeplus`. Die Product Packs für
FitLine und Eqology besitzen eigene Domains, Markenwerte, Terminologie,
Defaults und Tests, importieren aber bewusst denselben Planadapter. Erst mit
den echten Fachunterlagen werden die Pläne getrennt.
