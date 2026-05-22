# Astro-Einfuehrungsplan und neue Datei-Struktur

Ausgangspunkt:

> Die Webseiten sind mir zu unuebersichtlich. Das Multibrand aus dem eigenen Code heraus ist unuebersichtlich und irgendwie fehleranfaellig. Mir waere es lieber, wenn ich definierte Content-Bausteine habe, pro Brand, die ich auch fertig gebrandet und getextet ansehen kann.

Dieses Dokument uebersetzt das technische Briefing aus `_doc/astro-migration-briefing.md` in einen konkreten Einfuehrungsplan. Der wichtigste Architekturwechsel ist: Nicht mehr HTML-Templates mit Token-Replacement, sondern klar definierte Content-Bausteine, die pro Brand validiert, gerendert und einzeln angesehen werden koennen.

## Zielbild

Die Website wird kuenftig aus drei sauber getrennten Ebenen gebaut:

1. Brand-Daten: Farben, Claim, Produktname, Domains, App-Links, Paddle-IDs.
2. Content-Bausteine: Hero, Trust Strip, Feature Teaser, Pricing, FAQ, CTA, Footer.
3. Astro-Komponenten: Layout und Darstellung der Bausteine.

Dadurch kann ein Baustein wie `Hero` fuer LifePlus, FitLine und Eqology einzeln geoeffnet werden, inklusive finaler Texte und Brand-Farben. Fehler wie fehlende Felder, falsche Hex-Farben oder kaputte URLs brechen den Build ab, statt still in HTML durchzurutschen.

## Empfehlung

Ich empfehle fuer den ersten Schritt **Option A: Brand-zentrierte Content-Struktur**.

Grund: Dein Schmerzpunkt ist aktuell nicht primaer Komponenten-Wiederverwendung, sondern Uebersicht pro Brand. Du willst sehen: "Wie sieht LifePlus fertig aus?", "Welche Texte hat FitLine?", "Was ist bei Eqology anders?" Eine brand-zentrierte Struktur macht genau das sichtbar.

Astro-Komponenten bleiben trotzdem wiederverwendbar. Nur der Content liegt so, wie du ihn redaktionell denkst: pro Marke.

## Konkreter Einfuehrungsplan

### Phase 0: Entscheidung und Schutzleine

Ziel: Astro parallel einfuehren, ohne die bestehende Website sofort zu gefaehrden.

- Bestehenden Ordner `website/` nicht loeschen.
- Astro entweder direkt in `website/` einfuehren oder temporaer in `website-astro/` aufbauen.
- Fuer dieses Projekt ist `website-astro/` als Zwischenstand am sichersten, weil `website/scripts/build.mjs` und die aktuellen Templates bis zur Umschaltung als Referenz erhalten bleiben.
- Erfolgskriterium: Die alte Build-Kette funktioniert weiterhin, waehrend Astro aufgebaut wird.

### Phase 1: Astro-Grundgeruest

Ziel: Ein minimaler Astro-Build rendert eine LifePlus-Startseite.

Tasks:

- `website-astro/` mit Astro und TypeScript anlegen.
- `astro.config.mjs`, `tsconfig.json` und `package.json` einrichten.
- Build-Output so konfigurieren, dass spaeter wieder `dist/site-lifeplus`, `dist/site-fitline`, `dist/site-eqology` entstehen koennen.
- `src/content/config.ts` mit Zod-Schemas fuer Brand und Sections anlegen.
- `lifeplus.yaml` als erste echte Datenquelle migrieren.
- Eine einfache `src/pages/index.astro` mit `BrandLayout` und `Hero` rendern.

Ergebnis:

- `npm run dev` zeigt LifePlus mit Astro.
- `npm run build` validiert die YAML-Daten.
- Fehlende Pflichtfelder erzeugen Build-Fehler.

### Phase 2: Erste sichtbare Baustein-Kette

Ziel: Die Startseite wird nicht mehr als Monolith gedacht, sondern als Kette aus Sections.

Reihenfolge:

- `Header.astro`
- `Hero.astro`
- `TrustStrip.astro`
- `CoreMessage.astro`
- `FeatureTeaser.astro`
- `PricingTeaser.astro`
- `FAQ.astro`
- `FinalCTA.astro`
- `Footer.astro`

Vorgehen pro Baustein:

1. Content aus `website/templates/index.html` extrahieren.
2. YAML-Block in `lifeplus.yaml` anlegen.
3. Schema in `src/content/config.ts` ergaenzen.
4. Astro-Komponente bauen.
5. In `index.astro` einbauen.
6. Visuell gegen die alte Seite pruefen.

Ergebnis:

- Die Startseite besteht aus klar benannten Komponenten.
- Jede Section hat eigene Daten.
- Die Seite selbst bleibt kurz und lesbar.

### Phase 3: Debug-Ansicht fuer Bausteingrenzen

Ziel: Man sieht im Browser, welcher sichtbare Bereich aus welcher Astro-Komponente kommt.

Tasks:

- `_doc/astro-lifeflow360-debug-demo.html` als Verhaltensreferenz verwenden.
- `src/styles/debug.css` anlegen.
- `src/scripts/debug.js` anlegen.
- Jede Root-Section bekommt:

```astro
<section data-section="Hero.astro" data-source="content/brands/lifeplus/home.yaml:hero">
```

Funktionen:

- Toggle fuer Rahmen und Labels.
- Shortcut `d`.
- Label links: Komponentenname.
- Label rechts: Datenquelle.
- Nur im Dev-Modus aktiv, nicht im Production-Build.

Ergebnis:

- Du kannst im Browser sehen, wo Bausteine anfangen und enden.
- Der Zusammenhang zwischen Content-Datei und sichtbarer Section ist sofort sichtbar.

### Phase 4: FitLine und Eqology migrieren

Ziel: Dieselbe Komponentenstruktur wird mit echten Brand-Daten fuer alle Marken gerendert.

Tasks:

- `fitline.yaml` aus `website/brands.json` und Templates ableiten.
- `eqology.yaml` aus `website/brands.json` und Templates ableiten.
- Texte bewusst differenzieren, statt nur Produktnamen auszutauschen.
- Build-Kommandos fuer einzelne Brands einrichten:

```json
{
  "build:lifeplus": "ASTRO_BRAND=lifeplus astro build",
  "build:fitline": "ASTRO_BRAND=fitline astro build",
  "build:eqology": "ASTRO_BRAND=eqology astro build"
}
```

Hinweis fuer Windows/PowerShell: Entweder `cross-env` verwenden oder PowerShell-kompatible Scripts definieren.

Ergebnis:

- Drei Brands koennen separat gebaut werden.
- Jede Brand hat eigene Daten, aber dieselben Komponenten.
- Das bisherige Deployment-Modell mit getrennten Sites kann erhalten bleiben.

### Phase 5: Komponenten-Katalog

Ziel: Jeder Baustein ist isoliert pro Brand ansehbar.

Empfehlung: Erst eine einfache interne Astro-Vorschau bauen, danach Histoire ergaenzen.

Warum: Histoire ist gut, aber eine eigene Astro-Vorschau ist schneller, robuster und naeher am echten Rendering.

Minimaler Start:

```text
/__preview/lifeplus/hero
/__preview/fitline/hero
/__preview/eqology/hero
/__preview/lifeplus/pricing
```

Spaeter optional:

- Histoire installieren.
- Eine Story pro Komponente.
- Drei Varianten pro Story: LifePlus, FitLine, Eqology.

Ergebnis:

- Du musst nicht mehr die ganze Website durchsuchen.
- Du kannst gezielt einen Baustein ansehen und beurteilen.
- Texte, Farben und Layout sind pro Brand fertig sichtbar.

### Phase 6: Weitere Seiten migrieren

Ziel: Nach der Startseite folgen die restlichen Templates.

Reihenfolge:

1. `pricing.html` nach `pricing.astro`, weil Pricing strukturell wichtig ist.
2. `features.html` nach `features.astro`.
3. `impressum.html`, `datenschutz.html`, `agb.html`, `widerruf.html`, `mein-konto.html`.

Bei Rechtstexten genuegt meist ein einfacheres Content-Modell:

- gemeinsame Kontaktdaten
- Brand-Domain
- Brand-Produktname
- statischer Rechtstext

Ergebnis:

- Alle alten Marketing-Templates sind Astro-Seiten.
- Wiederkehrende Bausteine wie Header, Footer, CTA, Pricing und FAQ werden wiederverwendet.

### Phase 7: Umschaltung

Ziel: Astro ersetzt den alten Token-Build.

Tasks:

- `website-astro/` nach `website/` ueberfuehren oder `website/` als Astro-Projekt umbauen.
- Root-Scripts in `package.json` aktualisieren.
- `scripts/build-webroot.mjs` an Astro-Output anpassen.
- Cloudflare/SFTP-Deployment mit einem Brand testen.
- Danach FitLine und Eqology testen.
- Alten Token-Build archivieren, aber erst nach erfolgreichem Vergleich entfernen.

Ergebnis:

- Astro ist die produktive Website-Build-Kette.
- Der alte Token-Replacer ist nicht mehr noetig.

## Option A: Brand-zentrierte Datei-Struktur

Diese Struktur legt Content pro Brand ab. Das ist redaktionell sehr uebersichtlich.

```text
website-astro/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── marks/
│   ├── robots.txt
│   ├── llms.txt
│   └── ai.txt
└── src/
    ├── content/
    │   ├── config.ts                    ← Zod-Schemas
    │   └── brands/
    │       ├── lifeplus/                ← komplette LifePlus-Brand
    │       │   ├── brand.yaml           ← Stammdaten (Farben, Lockup, Domain)
    │       │   ├── home.yaml            ← Hero, TrustStrip, FAQ, ...
    │       │   ├── features.yaml
    │       │   ├── pricing.yaml
    │       │   └── legal.yaml           ← Impressum, Datenschutz, AGB
    │       ├── fitline/
    │       │   ├── brand.yaml
    │       │   ├── home.yaml
    │       │   ├── features.yaml
    │       │   ├── pricing.yaml
    │       │   └── legal.yaml
    │       └── eqology/
    │           ├── brand.yaml
    │           ├── home.yaml
    │           ├── features.yaml
    │           ├── pricing.yaml
    │           └── legal.yaml
    ├── components/
    │   ├── layout/
    │   │   ├── BrandLayout.astro
    │   │   ├── Header.astro
    │   │   └── Footer.astro
    │   ├── sections/                    ← 1× pro Section, brand-agnostisch
    │   │   ├── Hero.astro
    │   │   ├── TrustStrip.astro
    │   │   ├── CoreMessage.astro
    │   │   ├── FeatureTeaser.astro
    │   │   ├── PricingTeaser.astro
    │   │   ├── FAQ.astro
    │   │   └── FinalCTA.astro
    │   └── preview/
    │       ├── SectionFrame.astro
    │       └── BrandSwitcher.astro
    ├── pages/
    │   ├── index.astro                  ← liest ASTRO_BRAND
    │   ├── features.astro
    │   ├── pricing.astro
    │   ├── impressum.astro
    │   ├── datenschutz.astro
    │   ├── agb.astro
    │   ├── widerruf.astro
    │   ├── mein-konto.astro
    │   └── __preview/
    │       └── [brand]/
    │           └── [section].astro      ← isolierte Vorschau Brand × Section
    ├── styles/
    │   ├── globals.css
    │   └── debug.css                    ← nur im Dev geladen
    ├── scripts/
    │   └── debug.js                     ← Toggle, Shortcut "d"
    └── lib/
        ├── brands.ts
        ├── contact.ts
        └── content.ts                   ← Content-Loader
```

Vorteile:

- Sehr leicht pro Brand zu lesen.
- Ideal, wenn Texte und Angebote je Marke staerker auseinanderlaufen.
- Ein Brand kann komplett geprueft werden, ohne zwischen vielen Dateien zu springen.
- Gute Struktur fuer spaetere Freigaben: "Bitte pruefe nur `fitline/home.yaml`."

Nachteile:

- Gleiche Section liegt als Content mehrfach in unterschiedlichen Brand-Ordnern.
- Globale Vergleiche wie "zeige mir alle Hero-Texte nebeneinander" brauchen Hilfsansichten oder Scripts.

Empfohlen, wenn:

- Brand-Perspektive wichtiger ist als globale Section-Perspektive.
- Du je Marke fertig texten, pruefen und deployen willst.
- Die Marken langfristig eigene Tonalitaet bekommen sollen.

## Option B: Section-zentrierte Datei-Struktur

Diese Struktur legt Content pro Baustein ab. Jede Section enthaelt alle Brand-Varianten.

```text
website-astro/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── marks/
│   ├── robots.txt
│   ├── llms.txt
│   └── ai.txt
└── src/
    ├── content/
    │   ├── config.ts                    ← Zod-Schemas (brands + sections)
    │   ├── brands/                      ← NUR Stammdaten pro Brand
    │   │   ├── lifeplus.yaml            ← Farben, Lockup, Domain, App-URL
    │   │   ├── fitline.yaml
    │   │   └── eqology.yaml
    │   └── sections/                    ← Section-Content, nach Page gruppiert
    │       ├── home/
    │       │   ├── hero.yaml            ← Brand-Varianten als Keys IN der Datei
    │       │   ├── trust-strip.yaml
    │       │   ├── core-message.yaml
    │       │   ├── feature-teaser.yaml
    │       │   ├── pricing-teaser.yaml
    │       │   ├── faq.yaml
    │       │   └── final-cta.yaml
    │       ├── pricing/
    │       │   ├── plans.yaml
    │       │   ├── comparison.yaml
    │       │   └── faq.yaml
    │       ├── features/
    │       │   ├── hero.yaml
    │       │   └── feature-list.yaml
    │       └── legal/
    │           ├── impressum.yaml
    │           ├── datenschutz.yaml
    │           ├── agb.yaml
    │           └── widerruf.yaml
    ├── components/
    │   ├── layout/
    │   │   ├── BrandLayout.astro
    │   │   ├── Header.astro
    │   │   └── Footer.astro
    │   └── sections/                    ← 1× pro Section, brand-agnostisch
    │       ├── Hero.astro
    │       ├── TrustStrip.astro
    │       ├── CoreMessage.astro
    │       ├── FeatureTeaser.astro
    │       ├── PricingTeaser.astro
    │       ├── FAQ.astro
    │       └── FinalCTA.astro
    ├── pages/
    │   ├── index.astro                  ← liest ASTRO_BRAND
    │   ├── features.astro
    │   ├── pricing.astro
    │   ├── impressum.astro
    │   ├── datenschutz.astro
    │   ├── agb.astro
    │   ├── widerruf.astro
    │   ├── mein-konto.astro
    │   └── __preview/
    │       └── [section].astro          ← Brand-Switcher per UI/Query
    ├── styles/
    │   ├── globals.css
    │   └── debug.css                    ← nur im Dev geladen
    ├── scripts/
    │   └── debug.js                     ← Toggle, Shortcut "d"
    └── lib/
        ├── brands.ts
        ├── contact.ts
        └── sectionContent.ts            ← Loader fuer Section + Brand
```

Beispiel fuer `src/content/sections/home/hero.yaml`:

```yaml
lifeplus:
  eyebrow: "Verguetungs-Simulator"
  claim: "Sieh deinen Verguetungsplan, bevor du planst."
  subClaim: "Simuliere realistisch, was dein LifePlus-Netzwerk ueber zehn Jahre einspielen kann."
  ctaLabel: "Simulator starten"

fitline:
  eyebrow: "FitLine Business Simulator"
  claim: "Sieh deinen Verguetungsplan, bevor du planst."
  subClaim: "Simuliere realistisch, was dein FitLine-Team ueber zehn Jahre einspielen kann."
  ctaLabel: "FitLine-Simulation starten"

eqology:
  eyebrow: "Eqology Business Simulator"
  claim: "Sieh deinen Verguetungsplan, bevor du planst."
  subClaim: "Simuliere realistisch, was dein Eqology-Netzwerk ueber zehn Jahre einspielen kann."
  ctaLabel: "Eqology-Simulation starten"
```

Vorteile:

- Perfekt fuer direkten Vergleich eines Bausteins ueber alle Marken.
- Sehr gut fuer Komponenten-Kataloge und Review von Section-Varianten.
- Aenderungen an einer Section sind an einer Stelle gebuendelt.

Nachteile:

- Weniger intuitiv, wenn man "die ganze FitLine-Seite" redaktionell pruefen will.
- Brand-Content ist ueber viele Dateien verteilt.
- Bei vielen Seiten und Sections kann die Navigation im Content-Ordner kleinteilig werden.

Empfohlen, wenn:

- Du hauptsaechlich Bausteine vergleichst.
- Die Marken sehr aehnlich bleiben.
- Du oft global fragst: "Sind alle Hero-Claims konsistent?"

## Direkter Vergleich

| Kriterium | Option A: Brand-zentriert | Option B: Section-zentriert |
|---|---|---|
| Ganze Brand pruefen | Sehr gut | Mittel |
| Einen Baustein ueber alle Brands vergleichen | Mittel | Sehr gut |
| Redaktionelle Uebersicht | Sehr gut | Mittel |
| Technische Komponentenpflege | Gut | Sehr gut |
| Risiko von verstreutem Brand-Content | Niedrig | Hoeher |
| Passt zur aktuellen Hauptsorge | Sehr gut | Gut |

## Konkrete Entscheidung

Starte mit **Option A**.

Ergaenze dazu eine Preview-Route, die Option B praktisch nachbildet:

```text
/__preview/lifeplus/hero
/__preview/fitline/hero
/__preview/eqology/hero
```

Damit bekommst du beides:

- Content bleibt pro Brand uebersichtlich.
- Bausteine sind trotzdem einzeln und gebrandet ansehbar.

## Minimaler erster Sprint

Der erste Sprint sollte bewusst klein bleiben:

1. `website-astro/` anlegen.
2. Astro + TypeScript installieren.
3. Option-A-Struktur anlegen.
4. `lifeplus/brand.yaml` und `lifeplus/home.yaml` erstellen.
5. Zod-Schema fuer Brand, Hero, TrustStrip, FAQ erstellen.
6. `BrandLayout`, `Header`, `Hero`, `TrustStrip`, `FAQ`, `Footer` bauen.
7. `index.astro` nur fuer LifePlus rendern.
8. Debug-Rahmen aktivieren.
9. Preview-Route fuer `lifeplus/hero` bauen.
10. Dann erst FitLine und Eqology nachziehen.

Akzeptanzkriterien fuer diesen Sprint:

- `npm run dev` zeigt die Astro-LifePlus-Seite.
- `npm run build` bricht bei kaputtem YAML sichtbar ab.
- `Hero` ist isoliert unter einer Preview-URL sichtbar.
- Jede sichtbare Section zeigt im Debug-Modus ihren Komponentennamen.
- Der alte `website/`-Build bleibt unangetastet.

## Spaetere Ausbaustufe

Wenn die Astro-Struktur steht, koennen diese Punkte folgen:

- Histoire als komfortabler Komponenten-Katalog.
- Automatische Screenshots pro Brand und Section.
- Kleine Content-Review-Seite mit allen Hero-/Pricing-/FAQ-Varianten nebeneinander.
- Optional CMS, aber erst nachdem die Datenstruktur stabil ist.

