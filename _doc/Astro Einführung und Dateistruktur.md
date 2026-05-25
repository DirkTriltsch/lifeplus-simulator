# Astro Einführung und Dateistruktur

## Zweck des Dokuments

Dieses Dokument fasst die drei bisherigen Astro-Dokumente zusammen:

- `_doc/astro-migration-briefing.md`
- `_doc/astro-einfuehrungsplan-und-dateistruktur.md`
- `_doc/astro-einfuehrungsplan-und-dateistruktur_claude.md`

Es richtet sich an Coder, Architekten und Entwicklungsleiter. Ziel ist nicht nur eine technische Migration von HTML-Templates nach Astro, sondern ein sauberer zukünftiger Arbeitsmodus für Multi-Brand-Websites mit wiederverwendbaren Content-Bausteinen.

Die zentrale Frage lautet:

> Wie strukturieren wir eine Multi-Brand-Marketing-Site so, dass Content, Branding, Layout, Review, Vorschau, Debugging und Deployment übersichtlich, typisiert und wartbar bleiben?

## Executive Summary

Die aktuelle Website basiert auf einem selbstgebauten Token-Replace-Build. Dieser Ansatz funktioniert, ist aber an der Grenze seiner Wartbarkeit angekommen:

- große HTML-Monolithen
- Brand-Logik im Template-Code
- fehlende Typvalidierung
- keine isolierte Baustein-Vorschau
- Content und Layout sind vermischt
- Änderungen an einer Section sind schwer nachvollziehbar

Astro ist für diesen Fall sinnvoll, weil es statische Websites erzeugt, strukturierte Daten mit Zod validieren kann, Komponenten sauber kapselt und sich weiterhin in das bestehende Deployment-Modell einfügen lässt. Brand-Stammdaten können als Astro Content Collection geführt werden; der Section-Content wird wegen der unterschiedlichen Section-Schemas besser über einen eigenen Loader mit Zod-Schema-Map validiert.

Die empfohlene Zielarchitektur trennt strikt:

1. Brand-Stammdaten
2. Section-Content
3. Astro-Komponenten
4. Seitenkomposition
5. Preview- und Debug-Werkzeuge
6. Deployment

Für die Dateistruktur gibt es zwei ernsthafte Optionen:

- Option A: Brand-zentriert
- Option B: Section-zentriert mit `_shared` und Brand-Overrides

Die fachliche Empfehlung dieses Dokuments ist eine pragmatische Synthese:

> Für die erste Astro-Einführung mit **Option B starten**: section-zentriert, mit `_shared`-Content und expliziten Brand-Overrides. Parallel muss eine starke Brand-Preview entstehen, damit die redaktionelle Prüfung pro Marke trotzdem komfortabel bleibt.

Der Grund: Der heutige Ist-Zustand enthält nur wenige echte Brand-Unterschiede in `brands.json`; viele Inhalte stecken noch gemeinsam in den HTML-Templates. Eine section-zentrierte Struktur bildet diese Realität besser ab und verhindert Content-Drift. Die gewünschte Brand-Sicht wird über Preview-Routen und Review-Seiten hergestellt.

## Ausgangslage

### Aktuelles Repository

Das Projekt ist ein Monorepo mit diesen relevanten Bereichen:

```text
website/          aktuelle statische Marketing-Site mit Token-Replacer
simulator-app/    React/Vite-App für den Simulator
functions/        Cloudflare Pages Functions für Auth, Billing, Webhooks
packages/         Produkt- und Simulationslogik
dist/             Build-Ausgaben
_doc/             Architektur-, Produkt- und Migrationsdokumentation
```

### Aktueller Website-Build

Die Marketing-Site wird heute über `website/scripts/build.mjs` gebaut.

Wichtige Rahmenbedingung: Die bestehende Website gilt fachlich und visuell als passender Referenzstand. Die Astro-Einführung ist daher zuerst eine Struktur-, Wartbarkeits- und Workflow-Migration, keine inhaltliche oder gestalterische Neuentwicklung. Abweichungen vom Altstand müssen bewusst entschieden werden.

Der Build:

- liest `website/brands.json`
- ersetzt `{{TOKEN}}`-Platzhalter in HTML-Templates
- baut pro Brand einen statischen Output nach `dist/site-<brand>/`

Aktuelle Brand-Outputs:

```text
dist/site-lifeplus/
dist/site-fitline/
dist/site-eqology/
```

### Aktuelle Templates

Die Templates liegen unter `website/templates/`.

Wichtige Seiten:

```text
index.html
features.html
pricing.html
impressum.html
datenschutz.html
agb.html
widerruf.html
mein-konto.html
```

Im ursprünglichen Briefing wurden vor allem diese Templates betrachtet:

- `index.html`
- `features.html`
- `pricing.html`
- `impressum.html`
- `datenschutz.html`

Für die tatsächliche Migration müssen aber auch `agb.html`, `widerruf.html` und `mein-konto.html` berücksichtigt werden.

### Aktuelle Probleme

Die Probleme sind nicht rein technischer Natur. Sie betreffen auch Redaktion, Review, Architektur und spätere Skalierung.

Technische Probleme:

- Templates sind sehr groß.
- CSS ist teilweise direkt in großen HTML-Dateien eingebettet.
- Token-Replacement ist nicht typsicher.
- Fehlende Tokens können übersehen werden.
- Section-Content liegt im HTML statt in strukturierten Daten.
- Brand-spezifische Varianten sind schwer nachzuvollziehen.

Redaktionelle Probleme:

- Es gibt keine klare Datei, in der man eine komplette Brand redaktionell prüfen kann.
- Es gibt keine isolierte Ansicht einzelner Bausteine.
- Die Frage "Wie sieht der Hero für FitLine aus?" ist nicht direkt beantwortbar.
- Die Frage "Sind alle FAQ-Varianten konsistent?" ist ebenfalls nicht direkt beantwortbar.

Architekturprobleme:

- Brand-Daten, Content, Layout und Build-Logik sind vermischt.
- Der aktuelle Build-Code ist ein Sonderweg.
- Neue Sections oder neue Brands erhöhen das Fehlerrisiko.
- Es fehlt ein verbindlicher Workflow für Content-Bausteine.

## Zielbild

### Kernziel

Die Website soll aus definierten Content-Bausteinen bestehen, die pro Brand fertig gebrandet, getextet und isoliert ansehbar sind.

Das bedeutet:

- Jede Section hat eine eigene Komponente.
- Jede Section hat ein eigenes Content-Schema.
- Jede Brand hat klar definierte Stammdaten.
- Brand-Varianten sind sichtbar und validiert.
- Fehlende oder falsche Daten stoppen den Build.
- Entwickler und Redaktion können einzelne Bausteine ohne gesamte Website prüfen.

### Zielzustand in einem Satz

> Astro rendert statische Multi-Brand-Seiten aus validierten Brand-Daten, validiertem Section-Content, wiederverwendbaren Section-Komponenten und einer internen Preview-/Debug-Infrastruktur.

### Nicht-Ziele der ersten Migration

Diese Themen bleiben bewusst außerhalb des ersten Astro-Umbaus:

- Migration der `simulator-app/`
- Umbau der Cloudflare Functions
- neues Payment- oder Auth-Konzept
- CMS-Einführung
- dynamisches Multi-Domain-Routing über einen einzigen Build
- vollständige Design-Neuentwicklung

Astro soll zunächst die Marketing-Site strukturieren, nicht das gesamte Produkt neu erfinden.

## Architekturprinzipien

### 1. Content ist Daten, nicht Template-Code

Alle wiederkehrenden Inhalte sollen aus strukturierten Daten kommen:

- Claims
- Subclaims
- CTA-Labels
- Feature-Listen
- FAQ-Einträge
- Pricing-Tiers
- Trust-Items
- Rechtstext-Variablen

HTML-Komponenten dürfen Content rendern, aber nicht als Content-Datenbank missbraucht werden.

### 2. Komponenten sind brand-agnostisch

Eine Komponente wie `Hero.astro` kennt nicht LifePlus, FitLine oder Eqology als Sonderfälle.

Sie bekommt Props:

```ts
{
  eyebrow: string;
  claim: string;
  subClaim: string;
  ctaLabel: string;
  ctaUrl: string;
  accentColor: string;
  ctaColor: string;
}
```

Die Brand entscheidet über Daten und Styling-Variablen, nicht über die Komponentendatei.

### 3. Brand-Stammdaten und Section-Content werden getrennt

Brand-Stammdaten:

- `siteName`
- `siteDomain`
- `appUrl`
- `productName`
- Farben
- Lockup
- Paddle-Konfiguration

Section-Content:

- Hero
- Trust Strip
- Core Message
- Feature Teaser
- Pricing Teaser
- FAQ
- Final CTA

Diese Trennung verhindert, dass Farben, Domains und redaktionelle Inhalte in denselben Datenblock verklumpen.

### 4. Build-Fehler sind erwünscht

Wenn Content falsch ist, soll der Build scheitern.

Beispiele:

- ungültige Hex-Farbe
- fehlende CTA-URL
- leere FAQ-Liste
- unbekannter Icon-Name
- falsche Brand-ID
- ungültige Price-ID-Struktur

Das ist kein Nachteil, sondern ein Sicherheitsnetz.

### 5. Vorschau ist Teil des Workflows

Die isolierte Vorschau ist kein Nice-to-have. Sie löst das Kernproblem:

> Ich will definierte Content-Bausteine pro Brand fertig gebrandet und getextet ansehen können.

Daher muss Preview von Anfang an mitgebaut werden.

### 6. Debug-Ansicht macht Struktur sichtbar

Jede Section soll im Dev-Modus zeigen können:

- welche Komponente sie rendert
- aus welcher Content-Datei sie gespeist wird
- wo ihre Grenzen liegen

Das reduziert Fehlersuche und macht die Architektur im Browser sichtbar.

## Vorgeschlagener Tech-Stack

### Basis

```text
Astro
TypeScript strict
Astro Content Collections für Brand-Stammdaten
Zod-Schemas für Brand- und Section-Daten (`zod` als explizite Dependency)
Eigener Section-Content-Loader mit import.meta.glob
YAML oder JSON für Content-Daten
CSS Modules oder scoped Astro styles
```

### Vorschau und Review

Empfehlung für die erste Version:

```text
Interne Astro Preview Routes
Interne Astro Review Routes
Debug CSS/JS im Dev-Modus
```

Optional später:

```text
Histoire
Storybook
Playwright Screenshot Tests
CMS
```

### Warum zunächst keine harte Histoire-Pflicht?

Histoire ist für Komponenten-Kataloge nützlich, bringt aber eine zweite Toolchain mit.

Für den ersten Umbau ist eine native Astro-Preview oft besser:

- gleiche Komponenten
- gleiche Layouts
- gleiche Daten
- gleicher Devserver
- weniger Abhängigkeiten
- weniger Konzeptlast

Histoire kann später ergänzt werden, wenn klar ist, welche Komponenten und Varianten tatsächlich stabil sind.

## Ziel-Features des Astro-Workflows

### Feature 1: Drei separate Brand-Builds

Für den ersten Wurf bleibt das bestehende Deployment-Modell erhalten:

```text
lifeplus  -> dist/site-lifeplus/
fitline   -> dist/site-fitline/
eqology   -> dist/site-eqology/
```

Grund:

- kompatibel mit bestehender Struktur
- geringes Deployment-Risiko
- keine sofortige Routing-Komplexität
- einfache Brand-isolierte Smoke-Tests

Beispiel-Scripts:

```json
{
  "build:lifeplus": "cross-env ASTRO_BRAND=lifeplus astro build",
  "build:fitline": "cross-env ASTRO_BRAND=fitline astro build",
  "build:eqology": "cross-env ASTRO_BRAND=eqology astro build"
}
```

Wichtig: `cross-env` ist im aktuellen Root-`package.json` noch nicht installiert. Wenn diese Script-Variante gewählt wird, muss `cross-env` als Dev-Dependency ergänzt werden. Alternativ werden PowerShell-kompatible Scripts verwendet.

Für Windows/PowerShell kann alternativ ohne `cross-env` gearbeitet werden:

```powershell
$env:ASTRO_BRAND='lifeplus'; astro build
```

Für portable NPM-Scripts ist `cross-env` dennoch vorzuziehen.

Wenn `website-astro/` zunächst side-by-side aufgebaut wird, muss außerdem entschieden werden, ob der Ordner temporär in den NPM-Workspaces registriert wird. Der aktuelle Root kennt als Website-Workspace nur `website`. Für die Übergangsphase gibt es zwei saubere Varianten:

- `website-astro` als zusätzlichen Workspace aufnehmen und später `website` ersetzen.
- `website-astro` außerhalb der Workspace-Scripts direkt mit `npm --prefix website-astro ...` bauen.

### Feature 2: Validierte Content-Daten mit Zod

Jeder Content-Typ bekommt ein Schema. Wichtig ist die technische Trennung:

- Brand-Stammdaten liegen als Astro Content Collection unter `src/content/brands/`.
- Section-Content liegt unter `src/data/sections/` und wird über `import.meta.glob` geladen.
- Die final gemergten Section-Daten werden mit einer Schema-Map in `src/lib/contentSchemas.ts` validiert.

Diese Trennung vermeidet eine Stolperfalle: Astro Content Collections sind sehr gut für gleichförmige Collections, aber die geplanten Sections haben unterschiedliche Schemas. Ein einzelner Collection-Ordner `sections/` mit vielen verschiedenen Section-Typen würde entweder zu breite Schemas erzwingen oder später unnötige Loader-Tricks brauchen.

Beispiele:

- `brandSchema`
- `heroSchema`
- `faqSchema`
- `pricingTeaserSchema`
- `featureTeaserSchema`

Der Build validiert alle Inhalte.

Zusätzlich sollte es ein explizites Content-Validierungsscript geben, das nicht nur die aktuell gerenderte Seite prüft, sondern alle bekannten Brand-Section-Kombinationen lädt:

```json
{
  "validate:content": "tsx src/scripts/validate-content.ts"
}
```

Wenn `tsx` genutzt wird, muss es als Dev-Dependency ergänzt werden. Alternativ kann das Validierungsscript als `.mjs` geschrieben werden. Grund: Ein normaler Astro-Build validiert zuverlässig die Daten, die im Build-Pfad tatsächlich geladen werden. Interne Preview-Kombinationen, seltene Overrides oder spätere Seiten sollten aber ebenfalls aktiv geprüft werden, bevor sie im Review auffallen.

### Feature 3: Section-Komponenten mit klarem Props-Vertrag

Jede Section-Komponente hat:

- ein klar typisiertes Props-Interface
- einen Root-Container
- `data-section`
- `data-source`
- lokale Styles oder bewusst globale Utility-Klassen

Beispiel:

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
  source: string;
}

const {
  eyebrow,
  claim,
  subClaim,
  ctaLabel,
  ctaUrl,
  accentColor,
  ctaColor,
  source,
} = Astro.props;
---

<section
  class="hero"
  data-section="Hero.astro"
  data-source={source}
  style={`--brand: ${accentColor}; --cta: ${ctaColor}`}
>
  <div class="wrap">
    <span class="hero-eyebrow">{eyebrow}</span>
    <h1>{claim}</h1>
    <p>{subClaim}</p>
    <a href={ctaUrl}>{ctaLabel}</a>
  </div>
</section>
```

### Feature 4: Debug-Mode

Im Dev-Modus soll ein Debug-Layer verfügbar sein.

Funktionen:

- gestrichelte Rahmen um Sections
- Label links: Komponentenname
- Label rechts: Datenquelle
- Shortcut `d`
- optional Toolbar
- optional Brand-Switcher

Die Debug-View basiert auf `_doc/astro-lifeflow360-debug-demo.html`.

Wichtig:

- Debug-Code darf nicht im Production-Build enthalten sein.
- Jede Section muss `data-section` und `data-source` setzen.
- Production-Build wird per Textsuche geprüft.

Prüfung:

```powershell
Select-String -Path "dist/site-lifeplus/**/*" -Pattern "debug" -CaseSensitive
```

### Feature 5: Preview Routes

Preview-Routen sind die erste Antwort auf die Anforderung "Bausteine pro Brand ansehen".

Empfohlene Route:

```text
/__preview/[brand]/[section]/
```

Beispiele:

```text
/__preview/lifeplus/hero/
/__preview/fitline/hero/
/__preview/eqology/faq/
/__preview/lifeplus/pricing-teaser/
```

Die Preview rendert:

- echte Brand-Daten
- echten Section-Content
- echte Astro-Komponente
- optional echtes BrandLayout
- Debug-Labels

Wichtig für Production: Preview-Routen dürfen nicht versehentlich öffentlich als Teil der produktiven Marketing-Site deployed werden, solange sie interne Arbeitsansichten sind. Für den ersten Wurf gibt es zwei zulässige Strategien:

- Preview- und Review-Routen nur in Dev erzeugen, z.B. mit leerem `getStaticPaths()` bei `!import.meta.env.DEV`.
- Preview- und Review-Routen in einem separaten internen Build erzeugen, aber nicht in `dist/site-<brand>/` deployen.

Die Entscheidung muss vor dem Cut-Over getroffen werden. Der sichere Default ist: interne Routen nicht produktiv ausliefern.

### Feature 6: Review Routes

Zusätzlich zur Einzel-Preview ist eine Vergleichsansicht sinnvoll.

Empfohlene Route:

```text
/__review/[section]/
```

Beispiele:

```text
/__review/hero/
/__review/faq/
/__review/pricing-teaser/
```

Diese Seite zeigt dieselbe Section nebeneinander für:

- LifePlus
- FitLine
- Eqology

Damit kann die Redaktion oder Entwicklung prüfen:

- Sind die Texte konsistent?
- Sind Brand-Unterschiede bewusst?
- Bricht ein Layout bei einer Marke?
- Gibt es zu lange Claims?
- Sind CTAs korrekt?

### Feature 7: Brand Pages

Neben Baustein-Preview und Review muss es immer die echte gebaute Seite geben:

```text
/
/features.html
/pricing.html
/impressum.html
/datenschutz.html
/agb.html
/widerruf.html
/mein-konto.html
```

Im ersten Modell wird pro Brand ein separater Build erzeugt. Daher ist `/` je nach Build die jeweilige Brand-Startseite.

### Feature 8: Content-Loader mit bewusstem Fallback

Wenn Option B verwendet wird, braucht es einen Loader:

```text
src/lib/sectionContent.ts
```

Aufgabe:

1. Lade `src/data/sections/<section>/_shared.yaml`, falls vorhanden.
2. Lade `src/data/sections/<section>/<brand>.yaml`, falls vorhanden.
3. Merge Brand-Override über `_shared`.
4. Validiere das finale Objekt gegen das passende Zod-Schema.
5. Liefere Content plus `source`-Metadaten.

Beispiel:

```ts
const hero = await getSectionContent('hero', 'fitline');
```

Das Ergebnis enthält:

```ts
{
  data: {
    eyebrow: 'FitLine Business Simulator',
    claim: 'Sieh deinen Vergütungsplan, bevor du planst.',
    subClaim: 'Simuliere realistisch, was dein FitLine-Team ...',
    ctaLabel: 'FitLine-Simulation starten'
  },
  source: 'data/sections/hero/_shared.yaml + data/sections/hero/fitline.yaml'
}
```

### Feature 9: Content-Inventur

Vor der Migration wird jede bestehende Seite inventarisiert.

Für jede Section wird notiert:

- aktueller HTML-Bereich
- Ziel-Komponente
- Ziel-Schema
- gemeinsamer Content oder Brand-Override
- benötigte Assets
- offene Textentscheidung

Beispiel:

| Bestehender Bereich | Ziel-Komponente | Content-Struktur |
|---|---|---|
| Header | `Header.astro` | Brand-Stammdaten |
| Hero | `Hero.astro` | `_shared` + Brand-Overrides |
| Trust Strip | `TrustStrip.astro` | vermutlich `_shared` |
| FAQ | `FAQ.astro` | `_shared`, später Overrides |
| Pricing Teaser | `PricingTeaser.astro` | wahrscheinlich Brand-spezifisch |

## Dateistruktur: Optionen

Die Dateistruktur ist die wichtigste Vorab-Entscheidung. Sie definiert, wie Entwickler und Redaktion später denken.

Es gibt zwei sinnvolle Grundmodelle.

## Option A: Brand-zentrierte Struktur

### Idee

Alle Inhalte einer Brand liegen gemeinsam unter einem Brand-Ordner.

Das ist redaktionell intuitiv:

> Ich arbeite heute an FitLine, also gehe ich nach `content/brands/fitline/`.

### Struktur

```text
website-astro/
  astro.config.mjs
  package.json
  tsconfig.json
  public/
    marks/
    robots.txt
    llms.txt
    ai.txt
  src/
    content/
      config.ts
      brands/
        lifeplus/
          brand.yaml
          home.yaml
          features.yaml
          pricing.yaml
          legal.yaml
        fitline/
          brand.yaml
          home.yaml
          features.yaml
          pricing.yaml
          legal.yaml
        eqology/
          brand.yaml
          home.yaml
          features.yaml
          pricing.yaml
          legal.yaml
    components/
      layout/
        BrandLayout.astro
        Header.astro
        Footer.astro
      sections/
        Hero.astro
        TrustStrip.astro
        CoreMessage.astro
        FeatureTeaser.astro
        PricingTeaser.astro
        FAQ.astro
        FinalCTA.astro
      preview/
        SectionFrame.astro
        BrandSwitcher.astro
    pages/
      index.astro
      features.astro
      pricing.astro
      impressum.astro
      datenschutz.astro
      agb.astro
      widerruf.astro
      mein-konto.astro
      __preview/
        [brand]/
          [section].astro
      __review/
        [section].astro
    styles/
      globals.css
      debug.css
    scripts/
      debug.js
    lib/
      brands.ts
      contact.ts
      content.ts
```

### Vorteile

- Sehr gute Übersicht pro Brand.
- Einfacher redaktioneller Review.
- Änderungen an einer Marke sind lokal begrenzt.
- Gut für stark unterschiedliche Markenwelten.
- Gut, wenn externe Reviewer "nur FitLine" prüfen sollen.

### Nachteile

- Gemeinsame Inhalte werden kopiert.
- Drift-Risiko zwischen Brands steigt.
- Querschnittsänderungen betreffen mehrere Dateien.
- Eine neue FAQ-Frage muss potenziell in drei Dateien ergänzt werden.

### Geeignet, wenn

- Brands stark auseinanderlaufen sollen.
- redaktionelle Freigabe primär pro Marke erfolgt.
- jede Brand langfristig eigene Tonalität, Pricing-Logik und Seitentexte bekommt.

## Option B: Section-zentrierte Struktur mit `_shared` und Overrides

### Idee

Brand-Stammdaten liegen pro Brand. Section-Content liegt pro Section. Gemeinsame Inhalte kommen nach `_shared.yaml`, Unterschiede in Brand-Overrides.

Das ist architektonisch sauber:

> Ich arbeite heute am Hero, also gehe ich nach `data/sections/hero/`.

### Struktur

```text
website-astro/
  astro.config.mjs
  package.json
  tsconfig.json
  public/
    marks/
    robots.txt
    llms.txt
    ai.txt
  src/
    content/
      config.ts
      brands/
        lifeplus.yaml
        fitline.yaml
        eqology.yaml
    data/
      sections/
        hero/
          _shared.yaml
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        trust-strip/
          _shared.yaml
        core-message/
          _shared.yaml
          fitline.yaml
          eqology.yaml
        feature-teaser/
          _shared.yaml
        pricing-teaser/
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        faq/
          _shared.yaml
          fitline.yaml
          eqology.yaml
        final-cta/
          _shared.yaml
      pages/
        home.yaml
        features.yaml
        pricing.yaml
        legal.yaml
    components/
      layout/
        BrandLayout.astro
        Header.astro
        Footer.astro
      sections/
        Hero.astro
        TrustStrip.astro
        CoreMessage.astro
        FeatureTeaser.astro
        PricingTeaser.astro
        FAQ.astro
        FinalCTA.astro
      preview/
        SectionFrame.astro
        ReviewGrid.astro
    pages/
      index.astro
      features.astro
      pricing.astro
      impressum.astro
      datenschutz.astro
      agb.astro
      widerruf.astro
      mein-konto.astro
      __preview/
        [brand]/
          [section].astro
      __review/
        [section].astro
    styles/
      globals.css
      debug.css
    scripts/
      debug.js
    lib/
      brands.ts
      contact.ts
      contentSchemas.ts
      sectionContent.ts
      pageContent.ts
```

### Beispiel `_shared` plus Override

`src/data/sections/hero/_shared.yaml`:

```yaml
eyebrow: "Vergütungs-Simulator"
claim: "Sieh deinen Vergütungsplan, bevor du planst."
subClaim: "Simuliere realistisch, was dein Netzwerk über zehn Jahre einspielen kann."
ctaLabel: "Simulator starten"
```

`src/data/sections/hero/fitline.yaml`:

```yaml
eyebrow: "FitLine Business Simulator"
subClaim: "Simuliere realistisch, was dein FitLine-Team über zehn Jahre einspielen kann."
ctaLabel: "FitLine-Simulation starten"
```

Das finale FitLine-Objekt entsteht aus:

```text
_shared.yaml + fitline.yaml
```

### Vorteile

- Gemeinsame Inhalte liegen nur einmal.
- Brand-Unterschiede sind explizit.
- Sehr gut für Konsistenz über mehrere Brands.
- Sehr gut für Komponenten-Reviews.
- Gute Skalierung bei neuen Brands.
- Bildet den heutigen Ist-Zustand besser ab.

### Nachteile

- Mehr Dateien.
- Content-Loader ist etwas komplexer.
- Redaktionelle Komplettsicht pro Brand braucht Preview oder Review-Seite.
- Entwickler müssen die Merge-Regeln verstehen.

### Geeignet, wenn

- Brands im Kern ähnlich bleiben.
- Unterschiede bewusst als Overrides gepflegt werden sollen.
- Konsistenz wichtiger ist als maximale redaktionelle Nähe pro Brand-Datei.

## Vergleich der Optionen

| Kriterium | Option A: Brand-zentriert | Option B: Section-zentriert |
|---|---|---|
| Ganze Brand in Dateien lesen | Sehr gut | Mittel |
| Ganze Brand im Browser prüfen | Sehr gut | Sehr gut |
| Eine Section über alle Brands vergleichen | Mittel | Sehr gut |
| Gemeinsame Inhalte pflegen | Mittel | Sehr gut |
| Drift-Risiko | Höher | Niedriger |
| Anzahl Dateien | Mittel | Höher |
| Loader-Komplexität | Niedrig | Mittel |
| Zod-Komplexität | Niedrig bis mittel | Mittel |
| Neue Brand ergänzen | Mehr Kopie | Stammdaten + Overrides |
| Passt zum heutigen Ist-Zustand | Mittel | Sehr gut |
| Passt zum Wunsch "Brand fertig ansehen" | Sehr gut | Gut, mit Preview sehr gut |

## Empfohlene Entscheidung

Dieses Dokument empfiehlt:

> Option B als technische Struktur, ergänzt um starke Brand-Preview und Review-Routen.

Begründung:

- Die heutigen HTML-Templates enthalten viele gemeinsame Inhalte.
- `brands.json` enthält primär Stammdaten und wenige Claim-Varianten.
- Eine Kopie aller Inhalte pro Brand würde künstlich Drift erzeugen.
- Mit `_shared` plus Overrides bleiben Unterschiede sichtbar.
- Die gewünschte Brand-Sicht wird im Browser besser gelöst als im Dateibaum.

Kurz:

```text
Dateisystem: section-zentriert
Browser-Workflow: brand-zentriert und section-zentriert
```

## Ziel-Dateistruktur nach Entscheidung

Die folgende Struktur ist die empfohlene Planungsgrundlage.

```text
website-astro/
  astro.config.mjs
  package.json
  tsconfig.json
  public/
    marks/
      lifeplus.svg
      fitline.svg
      eqology.svg
    robots.txt
    llms.txt
    ai.txt
  src/
    content/
      config.ts
      brands/
        lifeplus.yaml
        fitline.yaml
        eqology.yaml
    data/
      sections/
        hero/
          _shared.yaml
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        trust-strip/
          _shared.yaml
        core-message/
          _shared.yaml
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        feature-teaser/
          _shared.yaml
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        pricing-teaser/
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        faq/
          _shared.yaml
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        final-cta/
          _shared.yaml
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        pricing-page/
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        features-page/
          _shared.yaml
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
        legal/
          _shared.yaml
          lifeplus.yaml
          fitline.yaml
          eqology.yaml
    components/
      layout/
        BrandLayout.astro
        Header.astro
        Footer.astro
      sections/
        Hero.astro
        TrustStrip.astro
        CoreMessage.astro
        FeatureTeaser.astro
        PricingTeaser.astro
        FAQ.astro
        FinalCTA.astro
        PricingPlans.astro
        FeatureList.astro
        LegalText.astro
      preview/
        SectionFrame.astro
        ReviewGrid.astro
        BrandSwitcher.astro
      ui/
        Button.astro
        Icon.astro
        BrandMark.astro
    pages/
      index.astro
      features.astro
      pricing.astro
      impressum.astro
      datenschutz.astro
      agb.astro
      widerruf.astro
      mein-konto.astro
      __preview/
        [brand]/
          [section].astro
      __review/
        [section].astro
    styles/
      globals.css
      tokens.css
      debug.css
    scripts/
      debug.js
    lib/
      brandIds.ts
      brands.ts
      contact.ts
      contentSchemas.ts
      sectionContent.ts
      pageContent.ts
      routes.ts
      assertNever.ts
```

## Content-Modell

### Brand-Stammdaten

Beispiel `src/content/brands/lifeplus.yaml`:

```yaml
siteName: "LifeFlow360"
siteDomain: "www.lifeflow360.app"
appUrl: "https://www.lifeflow360.app/app/"
apiBaseUrl: "https://api.lifeflow360.app"
productName: "LifePlus"
accentColor: "#1D9E75"
accentColorDark: "#157a5b"
ctaColor: "#EA7600"
ctaColorDark: "#C45F00"
paddle:
  env: "sandbox"
  clientToken: "test_fee36ee3e68b2f654e1ad01ab59"
  priceIdMonthly: "pri_01ks580xcmk17mam0qp9tjkwxg"
  priceIdHalfYear: "pri_01ksfd0ws71rgxkj7gfrrzkywm"
  priceIdYearly: "pri_01ks5864k3detqr1j2v3cx7dhs"
lockup:
  initial: "L"
  wordNeutral: "life"
  wordAccent: "flow360"
  markFill: "#006F44"
  darkBg: "#0E1F1A"
  accentOnDark: "#1FAE74"
  waveColor: "#7FB6A1"
  taglineDe: "BESSER VERSTEHEN. STÄRKER WACHSEN."
```

### Section-Content

Beispiel `src/data/sections/faq/_shared.yaml`:

```yaml
headline: "Häufige Fragen"
items:
  - q: "Ist das eine Garantie für meine Provision?"
    a: "Nein. Die Simulation zeigt Szenarien auf Basis deiner Eingaben und der hinterlegten Modellannahmen."
  - q: "Kann ich mehrere Szenarien vergleichen?"
    a: "Ja. Du kannst Parameter ändern und die Auswirkungen direkt im Verlauf sehen."
```

Beispiel `src/data/sections/faq/fitline.yaml`:

```yaml
items:
  - q: "Ist das eine Garantie für mein FitLine-Einkommen?"
    a: "Nein. Die Simulation ist ein Planungswerkzeug und ersetzt keine individuelle Geschäftsanalyse."
```

Wichtig: Bei Arrays muss vorab entschieden werden, ob Overrides das Array vollständig ersetzen oder einzelne Items mergen. Für den ersten Wurf wird empfohlen:

> Arrays werden vollständig ersetzt.

Das ist einfacher, vorhersagbarer und vermeidet fragile Merge-Regeln.

## Zod-Schema-Konzept

`src/content/config.ts` enthält nur die Astro Content Collection für Brand-Stammdaten. Die Section-Schemas liegen in `src/lib/contentSchemas.ts`, weil die Section-Dateien über `import.meta.glob` geladen und danach mit der passenden Zod-Schema-Map validiert werden.

Grundbausteine:

```ts
import { defineCollection, z } from 'astro:content';

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Muss eine Hex-Farbe sein, z.B. #1D9E75');

const urlString = z.string().url();

const lockupSchema = z.object({
  initial: z.string().length(1),
  wordNeutral: z.string(),
  wordAccent: z.string(),
  markFill: hexColor,
  darkBg: hexColor,
  accentOnDark: hexColor,
  waveColor: hexColor,
  taglineDe: z.string(),
});

const brandSchema = z.object({
  siteName: z.string(),
  siteDomain: z.string(),
  appUrl: urlString,
  apiBaseUrl: urlString.optional(),
  productName: z.string(),
  accentColor: hexColor,
  accentColorDark: hexColor,
  ctaColor: hexColor,
  ctaColorDark: hexColor,
  paddle: z.object({
    env: z.enum(['sandbox', 'live']),
    clientToken: z.string(),
    priceIdMonthly: z.string(),
    priceIdHalfYear: z.string().optional(),
    priceIdYearly: z.string(),
  }).optional(),
  lockup: lockupSchema,
});
```

Section-Schemas:

```ts
const heroSchema = z.object({
  eyebrow: z.string(),
  claim: z.string().min(10).max(140),
  subClaim: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string().url().optional(),
});

const faqSchema = z.object({
  headline: z.string(),
  items: z.array(z.object({
    q: z.string(),
    a: z.string(),
  })).min(1),
});

const featureTeaserSchema = z.object({
  headline: z.string(),
  items: z.array(z.object({
    icon: z.enum(['sliders', 'chart', 'stairs', 'presentation']),
    title: z.string(),
    body: z.string(),
  })).min(1),
});
```

Wichtig: Das finale gemergte Objekt muss validiert werden, nicht nur die Einzeldatei.

## Seitenkomposition

Eine Astro-Seite sollte möglichst kurz bleiben.

Beispiel `src/pages/index.astro`:

```astro
---
import BrandLayout from '../components/layout/BrandLayout.astro';
import Header from '../components/layout/Header.astro';
import Footer from '../components/layout/Footer.astro';
import Hero from '../components/sections/Hero.astro';
import TrustStrip from '../components/sections/TrustStrip.astro';
import CoreMessage from '../components/sections/CoreMessage.astro';
import FeatureTeaser from '../components/sections/FeatureTeaser.astro';
import PricingTeaser from '../components/sections/PricingTeaser.astro';
import FAQ from '../components/sections/FAQ.astro';
import FinalCTA from '../components/sections/FinalCTA.astro';
import { getBrand } from '../lib/brands';
import { getSectionContent } from '../lib/sectionContent';

const brandId = import.meta.env.ASTRO_BRAND ?? 'lifeplus';
const brand = await getBrand(brandId);

const hero = await getSectionContent('hero', brandId);
const trustStrip = await getSectionContent('trust-strip', brandId);
const coreMessage = await getSectionContent('core-message', brandId);
const featureTeaser = await getSectionContent('feature-teaser', brandId);
const pricingTeaser = await getSectionContent('pricing-teaser', brandId);
const faq = await getSectionContent('faq', brandId);
const finalCta = await getSectionContent('final-cta', brandId);
---

<BrandLayout brand={brand}>
  <Header brand={brand} />
  <Hero {...hero.data} brand={brand} source={hero.source} />
  <TrustStrip {...trustStrip.data} source={trustStrip.source} />
  <CoreMessage {...coreMessage.data} source={coreMessage.source} />
  <FeatureTeaser {...featureTeaser.data} brand={brand} source={featureTeaser.source} />
  <PricingTeaser {...pricingTeaser.data} brand={brand} source={pricingTeaser.source} />
  <FAQ {...faq.data} source={faq.source} />
  <FinalCTA {...finalCta.data} brand={brand} source={finalCta.source} />
  <Footer brand={brand} />
</BrandLayout>
```

Ziel:

- keine Token-Ersetzung
- keine HTML-Monolithen
- klare Datenflüsse
- lesbare Komposition

## Debug-View

### Anforderungen

Jede Section-Komponente muss im Dev-Modus sichtbar machen:

- Komponentenname
- Content-Quelle
- Section-Grenze

### Pflichtattribute

Jede Section hat am äußeren Root:

```astro
data-section="Hero.astro"
data-source={source}
```

### CSS-Kern

```css
:root {
  --debug-color: #d946ef;
  --debug-bg: rgba(217, 70, 239, 0.04);
}

body.debug-on [data-section] {
  position: relative;
  outline: 2px dashed var(--debug-color);
  outline-offset: -2px;
  background-image: linear-gradient(var(--debug-bg), var(--debug-bg));
}

body.debug-on [data-section]::before {
  content: attr(data-section);
  position: absolute;
  top: 0;
  left: 0;
  background: var(--debug-color);
  color: #fff;
  padding: 4px 12px;
  font: 600 11px/1 'JetBrains Mono', monospace;
  z-index: 10;
}

body.debug-on [data-section]::after {
  content: attr(data-source);
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px 10px;
  font: 400 10px/1 'JetBrains Mono', monospace;
  z-index: 10;
}
```

### JavaScript-Verhalten

`src/scripts/debug.js`:

- setzt `body.debug-on`
- reagiert auf Taste `d`
- ignoriert Eingabefelder
- speichert Zustand optional in `localStorage`
- optional Toolbar mit Checkbox

### Production-Regel

Debug wird nur in Dev geladen:

```astro
---
import DebugTools from '../components/preview/DebugTools.astro';
const enableDebugTools = import.meta.env.DEV;
---

{enableDebugTools && <DebugTools />}
```

`DebugTools.astro` bündelt Debug-CSS und Debug-JS an einer Stelle. Styles aus `src/` sollten in Astro nicht per festem `<link href="/src/...">` eingebunden werden. Ob das Debug-Script inline oder als Vite-verarbeitetes Modul eingebunden wird, ist eine Implementierungsentscheidung. Wichtig ist: Nach jedem Production-Build wird geprüft, dass keine Debug-Artefakte ausgeliefert werden.

## Preview-Workflow

### Einzel-Preview

Route:

```text
/__preview/[brand]/[section]/
```

Ziel:

- exakt eine Section
- eine Brand
- echtes Layout
- Debug einschaltbar

Beispiele:

```text
/__preview/lifeplus/hero/
/__preview/fitline/pricing-teaser/
/__preview/eqology/faq/
```

Diese Routen sind interne Arbeitsansichten. Sie werden im ersten Wurf nicht produktiv veröffentlicht, außer es gibt eine explizite Entscheidung dafür. Der Default ist: Dev-only oder separater interner Preview-Build.

### Review-Preview

Route:

```text
/__review/[section]/
```

Ziel:

- eine Section
- alle Brands nebeneinander
- schnell sehen, ob eine Brand aus dem Rahmen fällt

Beispiele:

```text
/__review/hero/
/__review/pricing-teaser/
/__review/faq/
```

Auch Review-Routen sind intern. Sie dienen Freigabe und Qualitätssicherung, nicht der öffentlichen Website.

### Brand-Komplettansicht

Die normale Seite bleibt die wichtigste Brand-Gesamtansicht:

```text
lifeplus build: /
fitline build: /
eqology build: /
```

## Arbeitsworkflow

### Workflow: Neue Section einführen

1. Section-Zweck definieren.
2. Section-Schema in `src/lib/contentSchemas.ts` ergänzen.
3. `_shared.yaml` anlegen, falls die Section brand-übergreifend gleich startet.
4. Brand-Override-Dateien anlegen, wo nötig.
5. Astro-Komponente in `components/sections/` erstellen.
6. `data-section` und `data-source` setzen.
7. Section in `index.astro` oder Zielseite einbauen.
8. Preview-Route prüfen.
9. Review-Route prüfen.
10. Production-Build ausführen.

### Workflow: Text für eine Brand ändern

1. Prüfen, ob die Änderung nur eine Brand betrifft.
2. Wenn ja: Brand-Override in `sections/<section>/<brand>.yaml`.
3. Wenn nein: `_shared.yaml` ändern.
4. Preview für betroffene Brand öffnen.
5. Review für Section öffnen.
6. Build laufen lassen.

### Workflow: Neue Brand hinzufügen

1. `src/content/brands/<brand>.yaml` anlegen.
2. Brand-ID in `src/lib/brandIds.ts` ergänzen.
3. Assets unter `public/marks/` ergänzen.
4. Nur notwendige Section-Overrides anlegen.
5. Preview-Matrix prüfen.
6. Build-Script ergänzen.
7. Deployment-Output prüfen.

### Workflow: Rechtstexte ändern

1. Prüfen, ob Text gemeinsam oder brand-spezifisch ist.
2. Gemeinsame Texte in `sections/legal/_shared.yaml`.
3. Brand-spezifische Angaben über Brand-Stammdaten oder Overrides.
4. Rechtstext-Seiten bauen.
5. Sichtprüfung pro Brand.

## Migrationsplan

### Phase 0: Entscheidungen und Inventur

Ziel:

Die Strukturentscheidung wird getroffen, bevor Code umgebaut wird.

Entscheidungen:

- Side-by-side Migration in `website-astro/`
- drei separate Builds bleiben erhalten
- Preview zuerst nativ in Astro
- Histoire erst später optional
- Option B als primäre Struktur
- Arrays werden bei Overrides vollständig ersetzt

Inventur:

- alle Templates erfassen
- alle Sections markieren
- Content-Typen bestimmen
- Brand-Unterschiede notieren
- offene Textentscheidungen dokumentieren

Erfolgskriterium:

- alte Build-Kette bleibt lauffähig
- neue Zielstruktur ist abgestimmt
- Content-Inventur ist dokumentiert

### Phase 1: Astro-Skelett

Ziel:

Ein minimales Astro-Projekt kompiliert.

Tasks:

- `website-astro/` anlegen
- Astro minimal installieren
- TypeScript strict aktivieren
- `astro.config.mjs`
- `src/content/config.ts` für Brand-Stammdaten
- `src/lib/contentSchemas.ts` für Section-Schemas
- `src/lib/brandIds.ts`
- leere `index.astro`

Erfolgskriterium:

- `npm run build` läuft
- Output landet im erwarteten Ordner

### Phase 2: Walking Skeleton

Ziel:

Eine Section vollständig durch den neuen Workflow bringen.

Scope:

- Brand-Daten LifePlus
- Hero-Content
- `Hero.astro`
- `BrandLayout.astro`
- Debug-CSS/JS
- Preview-Route für Hero

Erfolgskriterium:

- LifePlus Hero rendert
- Debug-Toggle funktioniert
- Preview-URL funktioniert
- Production-Build enthält kein Debug

### Phase 3: Startseiten-Sections

Ziel:

Die Startseite wird aus Astro-Sections gebaut.

Reihenfolge:

1. Header
2. Footer
3. Trust Strip
4. Core Message
5. Final CTA
6. FAQ
7. Feature Teaser
8. Pricing Teaser

Erfolgskriterium:

- `index.astro` ist kurz und lesbar
- alle Sections haben Preview
- alle Sections haben Debug-Labels
- visueller Vergleich gegen Alt-Build ist akzeptabel

### Phase 4: Alle Brands

Ziel:

LifePlus, FitLine und Eqology rendern über dieselbe Komponentenstruktur.

Tasks:

- `fitline.yaml`
- `eqology.yaml`
- notwendige Overrides
- Brand-Builds
- Review-Routen für alle Startseiten-Sections

Erfolgskriterium:

- alle drei Builds laufen
- alle Preview-Routen funktionieren
- Review-Routen zeigen keine offensichtlichen Layoutbrüche

### Phase 5: Weitere Seiten

Ziel:

Alle bisherigen Templates werden nach Astro migriert.

Reihenfolge:

1. `pricing.html`
2. `features.html`
3. `mein-konto.html`
4. `impressum.html`
5. `datenschutz.html`
6. `agb.html`
7. `widerruf.html`

Grund:

- Pricing ist produktkritisch.
- Features enthält viele Marketing-Sections.
- Mein Konto hat API-/Auth-Bezug und sollte bewusst geprüft werden.
- Rechtstexte sind einfacher, aber rechtlich sensibel.

Erfolgskriterium:

- alle bisherigen Seiten existieren als Astro-Seiten
- Links bleiben kompatibel
- alte URLs bleiben erreichbar

### Phase 6: Build- und Deployment-Umschaltung

Ziel:

Astro ersetzt den Token-Replacer.

Tasks:

- Root-Scripts anpassen
- `build:site:<brand>` auf Astro umstellen
- `scripts/build-webroot.mjs` prüfen
- Preview-Deployment
- Smoke-Test pro Brand
- `website/` als Legacy archivieren

Erfolgskriterium:

- Deployment liefert dieselben Zielordner
- Domains bleiben funktionsfähig
- alte Build-Kette wird nicht mehr benötigt

## Akzeptanzkriterien

Die Migration gilt als erfolgreich, wenn:

- alle drei Brand-Sites gebaut werden können
- Build bei invalidem Content scheitert
- jede wichtige Section isoliert previewbar ist
- jede wichtige Section im Review über alle Brands vergleichbar ist
- Debug-Ansicht im Dev-Modus funktioniert
- Debug-Code nicht im Production-Build landet
- Seitenkomponenten deutlich kürzer sind als alte HTML-Templates
- bestehende URLs erhalten bleiben
- `simulator-app/` und `functions/` unverändert weiter funktionieren

## Qualitätsregeln für Coder

### Komponenten

- Eine Section-Komponente rendert genau eine semantische Section.
- Keine Brand-Switches in Komponenten.
- Brand-Farben kommen über Props oder CSS-Variablen.
- Root-Element enthält `data-section` und `data-source`.
- Props werden typisiert.
- Komponente bleibt möglichst unter 150 Zeilen.

### Content

- Kein langer redaktioneller Text direkt in `.astro`.
- Gemeinsamer Content zuerst in `_shared.yaml`.
- Brand-Unterschiede nur als Override.
- Arrays werden vollständig ersetzt.
- Keine stillen Fallbacks ohne Debug-Quelle.

### Seiten

- Seiten komponieren, sie enthalten keine große Markup-Logik.
- Seiten importieren Sections und laden Content.
- Eine Seite sollte möglichst unter 50 Zeilen bleiben.

### Styling

- Globale Tokens in `tokens.css`.
- Grundlayout in `globals.css`.
- Section-spezifische Styles in der Komponente oder klar benannten CSS-Dateien.
- Keine duplizierten 500-Zeilen-Styleblöcke.

### Preview

- Jede neue Section braucht eine Preview.
- Jede neue Section braucht Review über alle Brands.
- Preview darf keine künstlichen Mock-Daten verwenden, solange echte Content-Daten existieren.

## Architekturentscheidungen, die vor Start abzustimmen sind

Diese Punkte sollten vor Umsetzung explizit bestätigt werden:

1. Starten wir mit `website-astro/` side-by-side?
2. Bleiben drei separate Brand-Builds erhalten?
3. Wird Option B als primäre Struktur akzeptiert?
4. Werden Arrays bei Overrides vollständig ersetzt?
5. Wird Histoire zunächst zurückgestellt?
6. Werden Preview- und Review-Routen Teil des ersten Scopes?
7. Wird Debug-Code nur im Dev-Modus geladen?
8. Wird `website/` nach Cut-Over als `website-legacy/` archiviert?

## Offene Punkte

### Content-Differenzierung

Für jede Section muss entschieden werden:

- bleibt sie für alle Brands gleich?
- braucht LifePlus eigene Texte?
- braucht FitLine eigene Texte?
- braucht Eqology eigene Texte?

### Pricing

Pricing ist sensibel, weil es mit Paddle, Product IDs und Checkout-Logik verbunden ist.

Zu klären:

- Welche Felder bleiben Brand-Stammdaten?
- Welche Felder gehören in Pricing-Content?
- Welche Werte dürfen im Browser sichtbar sein?
- Welche bleiben Backend-/Env-Konfiguration?

### Mein Konto

`mein-konto.html` enthält Account- und API-Logik. Bei der Migration muss geprüft werden:

- bleibt es eine statische Astro-Seite mit Client-JS?
- wird Account-Logik in eine Komponente extrahiert?
- bleiben API-Endpunkte unverändert?

### Legal-Seiten

Rechtstexte sollten nicht versehentlich durch Content-Merge-Regeln verändert werden.

Empfehlung:

- Legal-Content getrennt führen.
- Gemeinsame Kontakt- und Brand-Daten strukturiert injizieren.
- Nach Migration manuelle Sichtprüfung.

## Spätere Ausbaustufen

Nach erfolgreicher Astro-Migration können folgen:

- Histoire oder Storybook
- Playwright Screenshots pro Brand und Section
- Visual Regression Tests
- CMS-Anbindung
- Content-Dashboard
- Section-Matrix für Redaktionsfreigaben
- automatischer Link-Checker
- automatische Prüfung, ob Production-Build Debug-Artefakte enthält
- optional ein einziger Multi-Brand-Build mit Routing

## Schlussfolgerung

Astro ist für dieses Projekt nicht nur ein neuer Static Site Generator. Es ist die Chance, den gesamten Website-Workflow zu ordnen:

- von Token-Replacement zu typisierten Daten
- von HTML-Monolithen zu Komponenten
- von verstecktem Multi-Brand-Code zu expliziten Brand-Overrides
- von ganzer Website als einziger Prüffläche zu isolierten Bausteinen
- von unklarer Struktur zu nachvollziehbarem Content- und Review-Prozess

Die empfohlene Richtung ist:

```text
Astro side-by-side einführen
Option B als Content-Struktur wählen
Walking Skeleton mit Hero + Debug + Preview bauen
Startseite sectionweise migrieren
Brands ergänzen
weitere Seiten migrieren
Deployment umstellen
```

Diese Reihenfolge hält das Risiko niedrig und liefert früh sichtbaren Nutzen. Schon nach dem Walking Skeleton ist klar, ob der neue Workflow trägt.
