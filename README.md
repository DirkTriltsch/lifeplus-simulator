# MLM Simulator Platform

Gemeinsame Codebasis fuer mehrere produktbezogene Verguetungs-Simulatoren.

## Struktur

```text
apps/
|-- simulator-web/      React/Vite-Webapp, pro Produkt gebaut
`-- marketing-site/     statisches Grundgeruest fuer Produkt-Webseiten

packages/
|-- simulator-core/     MLM-neutrale Netzwerk- und Simulationslogik
|-- product-lifeplus/   aktive Plan-Implementierung
|-- product-fitline/    eigenes Product Pack, nutzt vorerst LifePlus-Plan
|-- product-eqology/    eigenes Product Pack, nutzt vorerst LifePlus-Plan
`-- product-registry/   explizite Produkt-Registry

tests/
`-- contracts/          produktuebergreifende Contract-Tests
```

## Entwicklungsbefehle

```bash
npm run dev:lifeplus
npm run dev:fitline
npm run dev:eqology

npm run build:lifeplus
npm run build:fitline
npm run build:eqology

npm test
```

Die Builds landen getrennt unter `dist/lifeplus`, `dist/fitline` und
`dist/eqology`.

## Fachliche Drift-Policy

Bis echte Verguetungsplaene fuer FitLine und Eqology vorliegen, gibt es genau
eine aktive Plan-Implementierung: `product-lifeplus`. Die Product Packs fuer
FitLine und Eqology besitzen eigene Domains, Markenwerte, Terminologie,
Defaults und Tests, importieren aber bewusst denselben Planadapter. Erst mit
den echten Fachunterlagen werden die Plaene getrennt.
