# website-astro

Astro-basierte Multi-Brand-Marketing-Sites (LifePlus, FitLine, Eqology).

Konzept, Struktur und ToDos: siehe `_doc/Astro Einführung und Dateistruktur.md`.

## Aufbau in Kurzform

- `src/shared/` — gemeinsame Komponenten, Schemas, Styles, Lib. Wird per `@shared/*` importiert.
- `src/brands/<brand>/` — pro Brand ein vollstaendiger Astro-Source-Root: `brand.yaml`, `content/`, `pages/`, `assets/`, `sections/` (nur Overrides), `public/`.
- Build setzt `srcDir` per `ASTRO_BRAND` env-var um, sodass jede Brand ihre eigenen Pages routet.

## Commands

Dev (eine Brand pro Session):

```
npm run dev:lifeplus
npm run dev:fitline
npm run dev:eqology
```

Build:

```
npm run build:lifeplus
npm run build:fitline
npm run build:eqology
npm run build:all
```

Output landet in `../dist/site-<brand>/`.

## Status

Walking Skeleton — index-Seite pro Brand mit allen Default-Sections. Weitere Pages (pricing, features, legal, mein-konto) folgen iterativ.
