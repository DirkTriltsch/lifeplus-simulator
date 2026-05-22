# LifeFlow360 — Astro-Migration: IDE-Briefing

**Zweck dieses Dokuments:** Briefing für eine KI-gestützte IDE (Cursor, Windsurf, Claude Code o.ä.) zur schrittweisen Migration des LifeFlow360-Projekts von einem selbstgebauten Token-Replace-Build (`website/scripts/build.mjs`) auf **Astro** mit Content Collections, Komponenten und Debug-View.

**Zielzustand:** Multi-Brand-Marketing-Site (LifePlus / FitLine / Eqology) mit isoliert ansehbaren Content-Bausteinen pro Brand, typsicher validierten Brand-Daten und einer Debug-Ansicht, die Komponentengrenzen sichtbar macht.

---

## 1. Ausgangslage (Ist-Zustand)

### 1.1 Aktuelles Setup

- **Monorepo** mit `website/`, `simulator-app/`, `functions/`, `packages/` und Cloudflare-Deployment (`wrangler.toml`).
- **Website-Build:** `website/scripts/build.mjs` — selbstgebauter Token-Replacer.
  - Liest `website/brands.json` (drei Brands + `_contact`).
  - Verarbeitet 5 Template-Dateien aus `website/templates/`: `index.html` (1070 Z.), `features.html` (878 Z.), `pricing.html` (752 Z.), `impressum.html` (94 Z.), `datenschutz.html` (203 Z.).
  - Ersetzt `{{TOKEN}}`-Platzhalter (u.a. `{{ACCENT_COLOR}}`, `{{LOCKUP_INITIAL}}`, `{{CLAIM}}`).
  - Outputs nach `dist/site-<brand>/`.
- **Templates sind Monolithen** mit eingebettetem `<style>`-Block (in `index.html`: Zeilen 13–605 = 590 Zeilen CSS pro Datei, ergibt CSS-Duplikation).

### 1.2 Bekannte Probleme (vom Eigentümer benannt)

1. **Templates sind unübersichtlich** (1000+ Zeilen pro Datei).
2. **Token-Replace ist fehleranfällig:** keine Typ-Validierung, fehlende Tokens lösen nur `console.warn` aus, Build läuft trotzdem durch.
3. **Content ist nicht von Layout getrennt:** FAQ-Items, Pricing-Tiers, Feature-Listen stecken im HTML statt in Brand-Daten.
4. **Keine isolierte Vorschau pro Brand-Baustein** — einzelne Sections können nicht separat begutachtet werden.

### 1.3 Identifizierte Bausteine in `index.html`

Aus den vorhandenen HTML-Kommentaren extrahiert:

| Baustein | Zeilen | Zukünftige Komponente |
|---|---|---|
| Header | 605–637 | `Header.astro` |
| Hero | 639–758 | `Hero.astro` |
| Trust Strip | 760–772 | `TrustStrip.astro` |
| Core Message | 774–846 | `CoreMessage.astro` |
| Feature Teaser | 848–892 | `FeatureTeaser.astro` |
| Pricing Teaser | 894–946 | `PricingTeaser.astro` |
| FAQ | 948–1027 | `FAQ.astro` |
| Final CTA | 1029–Ende | `FinalCTA.astro` |
| Footer | (am Ende) | `Footer.astro` |

---

## 2. Zielarchitektur

### 2.1 Tech-Stack

- **Astro 4+** als Static Site Generator.
- **Content Collections** mit **Zod-Schema** für typsichere Brand-Daten.
- **Komponenten-Modell** statt Token-Replace.
- **Histoire** (oder Storybook) als Komponenten-Katalog für isolierte Section-Vorschau pro Brand.
- **Debug-View** (eigene Anforderung, siehe Abschnitt 5) für sichtbare Komponentengrenzen im Dev-Modus.
- **Deployment unverändert** auf Cloudflare Pages — Astro outputs statisches HTML.

### 2.2 Ziel-Dateibaum

```
website/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/                     ← unverändert (Assets, Favicons, etc.)
├── src/
│   ├── content/
│   │   ├── config.ts           ← Zod-Schemas für Brand-Daten
│   │   └── brands/
│   │       ├── lifeplus.yaml
│   │       ├── fitline.yaml
│   │       └── eqology.yaml
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── TrustStrip.astro
│   │   ├── CoreMessage.astro
│   │   ├── FeatureTeaser.astro
│   │   ├── PricingTeaser.astro
│   │   ├── FAQ.astro
│   │   ├── FinalCTA.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── BrandLayout.astro   ← Grundgerüst + Debug-CSS-Loader
│   ├── pages/
│   │   └── [brand]/
│   │       ├── index.astro
│   │       ├── features.astro
│   │       ├── pricing.astro
│   │       ├── impressum.astro
│   │       └── datenschutz.astro
│   ├── styles/
│   │   ├── globals.css
│   │   └── debug.css           ← nur im Dev-Modus geladen
│   └── lib/
│       └── contact.ts          ← gemeinsame Kontaktdaten (ex _contact)
└── stories/                    ← Histoire-Konfiguration
    ├── Hero.story.astro
    ├── TrustStrip.story.astro
    └── ...
```

### 2.3 Render-Strategie

Statt drei separate Builds (`dist/site-lifeplus/`, `dist/site-fitline/`, `dist/site-eqology/`) wie heute, generiert Astro **einen** Build mit Pfad-Routing:

- `https://www.lifeflow360.app/` → LifePlus (Default-Brand via Cloudflare-Routing)
- `https://fitflow360.triltsch.com/` → FitLine
- `https://eqoflow360.triltsch.com/` → Eqology

**Umsetzung:** Drei Builds bleiben möglich über `ASTRO_BRAND=lifeplus npm run build`, der Brand-Parameter steuert per Env-Var, welche Seite als Root gerendert wird. Alternativ: dynamisches Routing über `[brand]`-Verzeichnis und Cloudflare-Worker-Rewrite.

**Empfehlung für ersten Wurf:** Drei separate Builds beibehalten — bleibt deploy-kompatibel mit dem heutigen Cloudflare-Setup. Pfad-Routing als spätere Optimierung.

---

## 3. Content-Collection-Schema

### 3.1 `src/content/config.ts` (Zod-Schema)

```ts
import { defineCollection, z } from 'astro:content';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Muss Hex-Farbe sein (z.B. #1D9E75)');

const lockup = z.object({
  initial: z.string().length(1),
  wordNeutral: z.string(),
  wordAccent: z.string(),
  markFill: hexColor,
  darkBg: hexColor,
  accentOnDark: hexColor,
  waveColor: hexColor,
  taglineDe: z.string(),
});

const brandBase = z.object({
  siteName: z.string(),
  siteDomain: z.string(),
  appUrl: z.string().url(),
  productName: z.string(),
  accentColor: hexColor,
  accentColorDark: hexColor,
  ctaColor: hexColor,
  ctaColorDark: hexColor,
  lockup,
});

const hero = z.object({
  eyebrow: z.string(),
  claim: z.string().min(10).max(120),
  subClaim: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string().url(),
});

const trustStrip = z.object({
  items: z.array(z.string()).min(2).max(6),
});

const coreMessage = z.object({
  headline: z.string(),
  body: z.string(),
});

const featureTeaser = z.object({
  headline: z.string(),
  items: z.array(z.object({
    icon: z.enum(['sliders', 'chart', 'stairs', 'presentation']),
    title: z.string(),
    body: z.string(),
  })).min(2).max(6),
});

const pricingTeaser = z.object({
  headline: z.string(),
  tiers: z.array(z.object({
    name: z.string(),
    price: z.string(),
    period: z.string(),
    highlighted: z.boolean().default(false),
    features: z.array(z.string()),
    ctaLabel: z.string(),
  })),
});

const faq = z.object({
  headline: z.string(),
  items: z.array(z.object({
    q: z.string(),
    a: z.string(),
  })),
});

const finalCta = z.object({
  headline: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
});

export const brandSchema = z.object({
  brand: brandBase,
  hero,
  trustStrip,
  coreMessage,
  featureTeaser,
  pricingTeaser,
  faq,
  finalCta,
});

const brands = defineCollection({
  type: 'data',
  schema: brandSchema,
});

export const collections = { brands };
```

**Validierung:** Wenn `fitline.yaml` ein Feld fehlt oder eine ungültige Hex-Farbe enthält, **bricht der Build mit klarer Fehlermeldung**. Das ersetzt das heutige `console.warn`-Verhalten.

### 3.2 Migrations-Mapping `brands.json` → YAML

Die heutige `brands.json` enthält **nur Brand-Stammdaten**. Section-Content (Claims sind drin, aber FAQ-Items, Pricing-Tiers, Feature-Listen, Trust-Strip-Items NICHT) muss aus den HTML-Templates extrahiert und in die YAML-Dateien übertragen werden.

Mapping aus `brands.json` für LifePlus:

| brands.json | brands/lifeplus.yaml |
|---|---|
| `lifeplus.siteName` | `brand.siteName` |
| `lifeplus.siteDomain` | `brand.siteDomain` |
| `lifeplus.appUrl` | `brand.appUrl` + `hero.ctaUrl` |
| `lifeplus.productName` | `brand.productName` |
| `lifeplus.accentColor*` | `brand.accentColor*` |
| `lifeplus.ctaColor*` | `brand.ctaColor*` |
| `lifeplus.claim` | `hero.claim` |
| `lifeplus.subClaim` | `hero.subClaim` |
| `lifeplus.lockup.*` | `brand.lockup.*` |

`_contact` wandert nach `src/lib/contact.ts` (gemeinsam für alle Brands).

### 3.3 Beispiel `src/content/brands/lifeplus.yaml`

```yaml
brand:
  siteName: LifeFlow360
  siteDomain: www.lifeflow360.app
  appUrl: https://www.lifeflow360.app/app/
  productName: LifePlus
  accentColor: "#1D9E75"
  accentColorDark: "#157a5b"
  ctaColor: "#EA7600"
  ctaColorDark: "#C45F00"
  lockup:
    initial: L
    wordNeutral: life
    wordAccent: flow360
    markFill: "#006F44"
    darkBg: "#0E1F1A"
    accentOnDark: "#1FAE74"
    waveColor: "#7FB6A1"
    taglineDe: "BESSER VERSTEHEN. STÄRKER WACHSEN."

hero:
  eyebrow: "Vergütungs-Simulator"
  claim: "Sieh deinen Vergütungsplan, bevor du planst."
  subClaim: "Simuliere realistisch, was dein LifePlus-Netzwerk über zehn Jahre einspielen kann."
  ctaLabel: "Simulator starten"
  ctaUrl: https://www.lifeflow360.app/app/

trustStrip:
  items:
    - "10 Jahre Simulation"
    - "Realistische Defaults"
    - "Keine Werbeversprechen"
    - "DSGVO-konform"

# coreMessage, featureTeaser, pricingTeaser, faq, finalCta
# müssen aus index.html (Z. 774–Ende) extrahiert werden
```

---

## 4. Komponenten-Struktur

### 4.1 Komponenten-Vertrag (Props)

Jede Komponente bekommt **genau das eine Datenobjekt** aus der YAML, das ihr zugeordnet ist — plus ggf. `accentColor` aus `brand.*` für Styling.

Beispiel `Hero.astro`:

```astro
---
interface Props {
  eyebrow: string;
  claim: string;
  subClaim: string;
  ctaLabel: string;
  ctaUrl: string;
  accentColor: string;
  ctaColor: string;
}
const { eyebrow, claim, subClaim, ctaLabel, ctaUrl, accentColor, ctaColor } = Astro.props;
---

<section
  class="hero"
  data-section="Hero.astro"
  data-source="hero block"
  style={`--brand: ${accentColor}; --cta: ${ctaColor}`}
>
  <div class="wrap">
    <span class="hero-eyebrow">{eyebrow}</span>
    <h1 class="hero-claim">{claim}</h1>
    <p class="hero-sub">{subClaim}</p>
    <a class="cta" href={ctaUrl}>{ctaLabel}</a>
  </div>
</section>

<style>
  .hero { padding: 80px 0 90px; background: var(--paper); }
  .hero-eyebrow {
    display: inline-block;
    padding: 6px 14px;
    background: color-mix(in srgb, var(--brand) 10%, white);
    color: var(--brand);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .hero-claim {
    font-size: 48px;
    font-weight: 700;
    line-height: 1.1;
    font-family: 'Fraunces', serif;
    letter-spacing: -0.02em;
  }
  .hero-sub { font-size: 19px; color: var(--ink-3); max-width: 640px; }
  .cta { background: var(--cta); color: #fff; padding: 14px 28px; border-radius: 10px; }
</style>
```

**Wichtig:**
- **`data-section`-Attribut** an jedem äußeren `<section>` ist Pflicht — wird für die Debug-View benötigt (siehe Abschnitt 5).
- **`<style>`-Block** ist auf die Komponente gescoped (Astro-Standard). Kein CSS-Konflikt zwischen Sections.
- **Brand-Farben** kommen als CSS-Variablen via `style`-Attribut rein — kein Token-Replace mehr.

### 4.2 Seiten-Komposition

`src/pages/index.astro` (LifePlus, falls Default-Brand):

```astro
---
import { getEntry } from 'astro:content';
import BrandLayout from '../layouts/BrandLayout.astro';
import Header from '../components/Header.astro';
import Hero from '../components/Hero.astro';
import TrustStrip from '../components/TrustStrip.astro';
import CoreMessage from '../components/CoreMessage.astro';
import FeatureTeaser from '../components/FeatureTeaser.astro';
import PricingTeaser from '../components/PricingTeaser.astro';
import FAQ from '../components/FAQ.astro';
import FinalCTA from '../components/FinalCTA.astro';
import Footer from '../components/Footer.astro';

const brandId = import.meta.env.ASTRO_BRAND ?? 'lifeplus';
const entry = await getEntry('brands', brandId);
const d = entry.data;
---

<BrandLayout brand={d.brand}>
  <Header brand={d.brand} />
  <Hero {...d.hero} accentColor={d.brand.accentColor} ctaColor={d.brand.ctaColor} />
  <TrustStrip {...d.trustStrip} />
  <CoreMessage {...d.coreMessage} />
  <FeatureTeaser {...d.featureTeaser} accentColor={d.brand.accentColor} />
  <PricingTeaser {...d.pricingTeaser} accentColor={d.brand.accentColor} />
  <FAQ {...d.faq} />
  <FinalCTA {...d.finalCta} ctaColor={d.brand.ctaColor} />
  <Footer brand={d.brand} />
</BrandLayout>
```

### 4.3 Layout

`src/layouts/BrandLayout.astro`:

```astro
---
interface Props {
  brand: { siteName: string; productName: string; /* ... */ };
}
const { brand } = Astro.props;
---

<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{brand.siteName} — {brand.productName}</title>
  <link rel="stylesheet" href="/src/styles/globals.css" />
  {import.meta.env.DEV && <link rel="stylesheet" href="/src/styles/debug.css" />}
</head>
<body>
  <slot />
  {import.meta.env.DEV && <script src="/src/scripts/debug.js"></script>}
</body>
</html>
```

**Kern-Trick:** `import.meta.env.DEV` ist nur im `npm run dev`-Modus `true`. Die Debug-View ist im Production-Build **automatisch nicht enthalten**.

---

## 5. Debug-View — Anforderung und Umsetzung

### 5.1 Referenz-Implementation

**Wichtig:** Die Datei **`lifeflow360-debug-demo.html`** (Mockup aus der Vor-Diskussion) ist die **funktional verbindliche Referenz** für die Debug-View. Sie zeigt:

- Jede Komponentengrenze als **gestrichelter lila Rahmen** (`outline: 2px dashed var(--debug-color)`).
- **Komponenten-Name oben links** auf jedem Block (z.B. "Hero.astro").
- **Daten-Quelle oben rechts** (z.B. "hero: { eyebrow, claim, subClaim, ctaLabel, ctaUrl }").
- **Toolbar oben** mit Checkbox "Rahmen + Labels anzeigen", Brand-Switcher, Tastatur-Shortcut "d".
- Bei Brand-Wechsel **wechseln Farben und Texte live**, Komponentenstruktur bleibt identisch.

Die IDE soll diese Demo-Datei als Verhaltens-Referenz nehmen und das CSS/JS sinngemäß in `src/styles/debug.css` und `src/scripts/debug.js` übernehmen.

### 5.2 `src/styles/debug.css` (Kern)

```css
:root { --debug-color: #d946ef; --debug-bg: rgba(217, 70, 239, 0.04); }

body.debug-on [data-section] {
  position: relative;
  outline: 2px dashed var(--debug-color);
  outline-offset: -2px;
  background-image: linear-gradient(var(--debug-bg), var(--debug-bg));
}

body.debug-on [data-section]::before {
  content: attr(data-section);
  position: absolute;
  top: 0; left: 0;
  background: var(--debug-color);
  color: #fff;
  padding: 4px 12px;
  font: 600 11px/1 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
  z-index: 10;
  border-bottom-right-radius: 6px;
}

body.debug-on [data-section]::after {
  content: attr(data-source);
  position: absolute;
  top: 0; right: 0;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 4px 10px;
  font: 400 10px/1 'JetBrains Mono', monospace;
  z-index: 10;
  border-bottom-left-radius: 6px;
}

/* Debug-Toolbar siehe Demo-HTML */
```

### 5.3 `src/scripts/debug.js`

Übernehmen aus der Demo (`lifeflow360-debug-demo.html`):
- Checkbox-Toggle für `body.debug-on`.
- Tastatur-Shortcut "d" (außer in Input-Feldern).
- Brand-Switcher (nur im Dev-Modus relevant — wechselt zwischen `/lifeplus/`, `/fitline/`, `/eqology/` als Navigation).

### 5.4 Voraussetzung an alle Komponenten

**Jede Komponente MUSS** ihren Root-Container mit `data-section` und `data-source` annotieren:

```astro
<section data-section="Hero.astro" data-source="hero block">
```

Die IDE muss dies bei jeder neuen Komponente automatisch ergänzen.

---

## 6. Histoire-Setup (Komponenten-Katalog)

### 6.1 Zweck

Isolierte Vorschau jeder Komponente in **jeder Brand-Variante**, ohne die ganze Site durchzubauen. Erfüllt die Original-Anforderung "Bausteine, die ich pro Brand fertig gebranded ansehen kann."

### 6.2 Installation

```bash
npm install -D histoire @histoire/plugin-astro
```

`histoire.config.ts`:

```ts
import { defineConfig } from 'histoire';
import { HstAstro } from '@histoire/plugin-astro';

export default defineConfig({
  plugins: [HstAstro()],
  setupFile: './histoire.setup.ts',
});
```

### 6.3 Beispiel-Story `stories/Hero.story.astro`

```astro
---
import Hero from '../src/components/Hero.astro';
import { getEntry } from 'astro:content';
const lifeplus = (await getEntry('brands', 'lifeplus')).data;
const fitline  = (await getEntry('brands', 'fitline')).data;
const eqology  = (await getEntry('brands', 'eqology')).data;
---

<Hst.Story title="Sections/Hero">
  <Hst.Variant title="LifePlus">
    <Hero {...lifeplus.hero} accentColor={lifeplus.brand.accentColor} ctaColor={lifeplus.brand.ctaColor} />
  </Hst.Variant>
  <Hst.Variant title="FitLine">
    <Hero {...fitline.hero} accentColor={fitline.brand.accentColor} ctaColor={fitline.brand.ctaColor} />
  </Hst.Variant>
  <Hst.Variant title="Eqology">
    <Hero {...eqology.hero} accentColor={eqology.brand.accentColor} ctaColor={eqology.brand.ctaColor} />
  </Hst.Variant>
</Hst.Story>
```

Für jede der 9 Komponenten eine eigene Story-Datei nach gleichem Muster.

### 6.4 Commands

```json
{
  "scripts": {
    "story:dev": "histoire dev",
    "story:build": "histoire build",
    "story:preview": "histoire preview"
  }
}
```

Aufruf von `npm run story:dev` öffnet `http://localhost:6006` mit allen Komponenten und Brand-Varianten als Navigation.

---

## 7. Migrations-Plan (Reihenfolge der Schritte)

### Phase 1 — Setup (Tag 1)

1. `npm create astro@latest website-astro` parallel zum bestehenden `website/` (Migration ohne Risiko).
2. TypeScript-Mode aktivieren (`strict`).
3. Astro-Config mit Output-Verzeichnis `dist/` einrichten, kompatibel mit aktuellem Cloudflare-Workflow.
4. `src/content/config.ts` mit Zod-Schema aus Abschnitt 3.1 anlegen.
5. **LifePlus-YAML migrieren** (`src/content/brands/lifeplus.yaml`) — Stammdaten aus `brands.json`, Hero-Block aus `brands.json`.
6. Restlichen Hero-Content (eyebrow, ctaLabel) aus `index.html` extrahieren.

### Phase 2 — Erste Komponente vollständig (Tag 1–2)

7. `BrandLayout.astro` mit Debug-CSS-Loader (Abschnitt 4.3).
8. `Hero.astro` mit `data-section`-Annotation (Abschnitt 4.1).
9. `src/styles/debug.css` und `src/scripts/debug.js` aus Demo übernehmen (Abschnitt 5).
10. `src/pages/index.astro` mit nur dem Hero rendern.
11. **Visuelle Prüfung:** `npm run dev` → `localhost:4321` → Debug-Toggle testen → Brand-Switcher testen.

### Phase 3 — Restliche Sections (Tag 2–3)

12. In dieser Reihenfolge migrieren, weil sich die Komplexität so staffelt:
    - `Header.astro` + `Footer.astro` (einfach, Stammdaten)
    - `TrustStrip.astro` (Array von Strings)
    - `CoreMessage.astro` (2 Felder)
    - `FinalCTA.astro` (3 Felder)
    - `FAQ.astro` (Array von Q/A — Content aus HTML extrahieren)
    - `FeatureTeaser.astro` (Array mit Icons — Content extrahieren)
    - `PricingTeaser.astro` (komplexeste: Tiers mit Features-Array)
13. Pro Komponente: YAML-Block ergänzen → Komponente bauen → in Seite einbauen → visuell prüfen.

### Phase 4 — Weitere Brands (Tag 3)

14. `fitline.yaml` und `eqology.yaml` parallel zur LifePlus-YAML anlegen.
15. **Texte differenzieren wo nötig** (Sub-Claims, Produktnamen).
16. Build pro Brand testen: `ASTRO_BRAND=fitline npm run build`.

### Phase 5 — Histoire-Katalog (Tag 4)

17. Histoire installieren und konfigurieren (Abschnitt 6).
18. Eine Story-Datei pro Komponente, je mit 3 Brand-Varianten.
19. `npm run story:dev` testen.

### Phase 6 — Weitere Seiten (Tag 4–5)

20. `features.astro`, `pricing.astro`, `impressum.astro`, `datenschutz.astro` migrieren.
21. Diese Seiten haben weniger Komponenten — vermutlich Wiederverwendung von `Header`, `Footer`, `FinalCTA`.

### Phase 7 — Deployment-Umschaltung (Tag 5)

22. `wrangler.toml` anpassen: Build-Verzeichnis von `dist/site-<brand>/` auf Astro-Output umstellen.
23. Cloudflare-Build-Commands aktualisieren.
24. Smoke-Test in Cloudflare-Preview-Branch.
25. Alten `website/`-Ordner archivieren (nicht löschen — Referenz für Migrations-Verifizierung).

---

## 8. Validierungs-Checkliste

Pro Komponente und Brand zu prüfen:

- [ ] YAML-Datei besteht Zod-Validierung (`npm run build` bricht nicht).
- [ ] Komponente hat `data-section`- und `data-source`-Attribute am Root.
- [ ] Debug-Toggle zeigt Rahmen + Labels korrekt.
- [ ] Brand-Switch in `lifeplus`/`fitline`/`eqology` zeigt richtige Farben und Texte.
- [ ] Histoire-Story zeigt alle 3 Brand-Varianten korrekt.
- [ ] Visueller Vergleich mit altem `dist/site-<brand>/<seite>.html` — keine Regression.
- [ ] Production-Build (`npm run build`) enthält **keine** Debug-CSS-/JS-Assets.

---

## 9. Bewusst nicht im Scope

- **Migration der `simulator-app/`** — bleibt unabhängige App, wird wie heute eingebunden.
- **Migration der Cloudflare-Functions** (`functions/`, Payment-WIP) — Backend bleibt unberührt.
- **CMS-Anbindung** (TinaCMS, CloudCannon, @writenex/astro etc.) — als spätere Option offen, nicht Teil dieser Migration.
- **Dynamisches Multi-Domain-Routing** über einen einzigen Build — drei separate Builds bleiben für erste Version.

---

## 10. Referenz-Dateien

- **`lifeflow360-debug-demo.html`** — verbindliche Verhaltens-Referenz für Debug-View (Rahmen, Labels, Toolbar, Brand-Switcher).
- **`website/brands.json`** — Quelle der Brand-Stammdaten für YAML-Migration.
- **`website/templates/index.html`** — Quelle des Section-Contents (Z. 639–Ende), aus dem YAML-Inhalte extrahiert werden.
- **`website/templates/features.html`**, **`pricing.html`**, **`impressum.html`**, **`datenschutz.html`** — analog für weitere Seiten.
- **`website/scripts/build.mjs`** — Referenz für Token-Mapping (was wird heute wo eingesetzt).

---

## 11. Erfolgsmessung

Die Migration ist erfolgreich, wenn:

1. **Build-Zeit:** `npm run build` für eine Brand läuft unter 10s und bricht bei fehlerhaften YAML-Daten ab.
2. **Code-Reduktion:** Jede Seite (`index.astro` etc.) hat unter 30 Zeilen statt 1070.
3. **Komponenten-Übersicht:** Jede Section liegt in einer eigenen Datei unter 150 Zeilen.
4. **Debug-View funktioniert:** Im Browser zeigt `?debug=1` oder Toggle alle Bausteine mit Rahmen und Namen.
5. **Histoire-Katalog vollständig:** Alle 9 Komponenten × 3 Brand-Varianten in `http://localhost:6006` ansehbar.
6. **Visuelle Parität:** Production-Output sieht identisch zur alten Site aus (Pixel-Diff nicht zwingend nötig — visuelle Inspektion reicht).
7. **Cloudflare-Deployment unverändert:** Drei Brand-Sites werden weiterhin auf ihren Domains korrekt ausgeliefert.
