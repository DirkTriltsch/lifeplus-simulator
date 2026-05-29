# website-astro

Astro-basierte Multi-Brand-Marketing-Sites (LifePlus, FitLine, Eqology).

Konzept, Struktur und ToDos: siehe `_doc/Astro Einfuehrung und Dateistruktur.md`.

## Aufbau in Kurzform

- `src/shared/` - gemeinsame Komponenten, Schemas, Styles, Lib. Wird per `@shared/*` importiert.
- `src/brands/<brand>/` - pro Brand ein vollstaendiger Astro-Source-Root: `brand.yaml`, `content/`, `pages/`, `assets/`, `sections/` (nur Overrides), `public/`.
- Build setzt `srcDir` per `ASTRO_BRAND` env-var um, sodass jede Brand ihre eigenen Pages routet.

## Commands

Dev (eine Brand pro Session):

```bash
npm run dev:lifeplus
npm run dev:fitline
npm run dev:eqology
```

Build:

```bash
npm run build:lifeplus
npm run build:fitline
npm run build:eqology
npm run build:all
```

Output landet in `../dist/<brand>-website/`.

## Status

Produktiver Marketing-Site-Build fuer alle drei Brands. Die Root-Skripte `npm run build:site:*`, `npm run build:sites` und `npm run build:webroot:*` nutzen Astro als Quelle.
