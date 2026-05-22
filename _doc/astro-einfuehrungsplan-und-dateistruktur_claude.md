# Astro-Einfuehrungsplan und neue Datei-Struktur (Claude-Variante)

Ausgangspunkt:

> Die Webseiten sind mir zu unuebersichtlich. Das Multibrand aus dem eigenen Code heraus ist unuebersichtlich und irgendwie fehleranfaellig. Mir waere es lieber, wenn ich definierte Content-Bausteine habe, pro Brand, die ich auch fertig gebrandet und getextet ansehen kann.

Dieses Dokument ist Claudes Variante des Einfuehrungsplans aus `_doc/astro-einfuehrungsplan-und-dateistruktur.md`. Es verfolgt das gleiche Ziel und nutzt denselben technischen Unterbau (`_doc/astro-migration-briefing.md`), trifft aber drei Entscheidungen anders:

1. Die Phasen ziehen frueher ein "Walking Skeleton" durch (Hero plus Debug-View komplett, bevor weitere Bausteine gebaut werden), statt erst die ganze Section-Kette zu bauen und danach die Debug-Ansicht nachzuruesten.
2. Die empfohlene Datei-Struktur ist **section-zentriert mit getrennten YAMLs pro Brand pro Section**, nicht brand-zentriert mit Page-YAMLs.
3. Der Komponenten-Katalog wird bewusst nicht mit Histoire gebaut, sondern als interne Astro-Preview-Route. Histoire taucht nicht einmal mehr als "spaetere Ausbaustufe" auf.

Am Ende dieses Dokuments steht ein direkter, tabellarischer Vergleich beider Plaene.

## Zielbild

Die Website wird kuenftig aus drei sauber getrennten Ebenen gebaut:

1. Brand-Stammdaten: Farben, Lockup, Domains, App-URLs, Paddle-IDs.
2. Content-Bausteine: Hero, Trust Strip, Core Message, Feature Teaser, Pricing, FAQ, Final CTA, Footer.
3. Astro-Komponenten: Layout und Darstellung der Bausteine.

Ein Baustein wie `Hero` ist fuer LifePlus, FitLine und Eqology einzeln aufrufbar — mit echten Texten, echten Farben, echtem Layout. Fehlende Felder oder kaputte Hex-Farben brechen den Build ab, statt still in HTML durchzurutschen.

## Empfehlung

Ich empfehle **Option B: Section-zentrierte Struktur mit getrennten Brand-YAMLs pro Section**.

Grund: Heute steckt Section-Content brand-uebergreifend identisch in den HTML-Templates. Nur Stammdaten unterscheiden sich (`brands.json` enthaelt Farben, Lockup, Claim, Sub-Claim — aber NICHT FAQ-Items, Pricing-Tiers, Feature-Listen, Trust-Strip-Items). Eine Struktur, die diese Realitaet abbildet, hat zwei harte Vorteile:

- Querschnitts-Aenderungen ("neue FAQ-Frage in allen drei Brands") fassen eine Datei an, nicht drei.
- Brand-spezifische Sprache entsteht durch gezielte Overrides, nicht durch Copy-Paste, das in einer Brand vergessen wird.

Trotzdem bleibt die brand-zentrierte Sicht erreichbar — ueber die Preview-Route `/__preview/[brand]/[section]/` und ueber die gebauten Seiten selbst.

## Konkreter Einfuehrungsplan

Geschaetzter Gesamtumfang: 5–6 Arbeitstage netto. Das ist bewusst etwas mehr als die optimistische "Tag 1–5"-Schaetzung im Briefing, weil sich erst beim Sezieren der Templates zeigt, wie viel Content erstmals aus dem HTML extrahiert werden muss.

### Phase 0: Inventur und Entscheidungen (0,5 Tag)

Ziel: Drei Festlegungen, die spaeter nicht mehr in Frage gestellt werden, und eine ehrliche Bestandsaufnahme.

Tasks:

- Festlegung 1: **Side-by-Side**. Neuer Ordner `website-astro/` parallel zu `website/`. Das alte Build bleibt deploybar bis zum Cut-Over.
- Festlegung 2: **Drei separate Builds** via `ASTRO_BRAND=lifeplus astro build`. Das haelt `wrangler.toml` und das IONOS-Deployment kompatibel. Pfad-Routing kommt spaeter — wenn ueberhaupt.
- Festlegung 3: **Komponenten-Katalog ohne Histoire**. Eine eigene Preview-Route in Astro ist naeher am echten Rendering, spart eine Toolchain und braucht kein Community-Plugin.
- Content-Inventur: Section-Inhalte (FAQ, Pricing-Tiers, Feature-Liste, Trust-Strip) sind heute brand-uebergreifend identisch in den HTML-Templates. Bei der Migration faellt zum ersten Mal die Entscheidung an: Sollen FAQ-Texte fuer FitLine und Eqology gleich bleiben oder differenziert werden? Antwort vor Phase 1 treffen, sonst wird der Content-Loader spaeter umgebaut.

Erfolgskriterium: Drei Entscheidungen notiert, Content-Inventur beantwortet, alte Build-Kette weiterhin funktionsfaehig.

### Phase 1: Astro-Skelett (0,5 Tag)

Ziel: Ein leeres, aber gueltiges Astro-Projekt, das nichts kaputt macht.

Tasks:

- `npm create astro@latest website-astro -- --template minimal --typescript strict`
- `astro.config.mjs` mit `output: 'static'` und `outDir: '../dist/site-${ASTRO_BRAND}'`, damit der Cloudflare-Pfad gleich bleibt.
- `src/content/config.ts` mit Zod-Schema fuer Brand-Stammdaten und Section-Content anlegen, gespalten in `brandSchema` und `sectionSchemas`.
- `src/lib/contact.ts` als gemeinsamer Kontaktdaten-Block (ex `_contact` aus `brands.json`).
- Leere `index.astro`, die kompiliert.

Erfolgskriterium: `npm run build` produziert ein leeres Astro-Output ohne Fehler.

### Phase 2: Walking Skeleton — Hero und Debug-View (1 Tag)

Ziel: Eine Komponente komplett durch. Nicht alle gleichzeitig.

Begruendung: Das deckt 80 Prozent der Stolperdraehte auf — Build-Pfade, Content-Loader, Layout, Debug-Toggle, Brand-Variable. Es ist effizienter, diese einmal an einer Komponente sauber zu loesen, als alle neun parallel halb zu bauen.

Tasks:

- `lifeplus.yaml` mit nur `brand` (Stammdaten) anlegen.
- `sections/hero/lifeplus.yaml` mit den Hero-Daten anlegen.
- `Hero.astro` mit `data-section`/`data-source`-Annotation bauen.
- `BrandLayout.astro` mit `import.meta.env.DEV`-Gate fuer Debug-CSS und Debug-JS.
- `src/styles/debug.css` und `src/scripts/debug.js` aus `astro-lifeflow360-debug-demo.html` portieren.
- `npm run dev` aufrufen, Hero rendert, `d`-Toggle schaltet Rahmen.

Erfolgskriterium:

- Hero ist im Browser sichtbar, in LifePlus-Farben.
- Debug-Toggle funktioniert.
- Production-Build (`npm run build`) enthaelt **kein** Wort "debug" im Output (per `grep`/`Select-String` verifizieren).

### Phase 3: Restliche Sections in Komplexitaets-Reihenfolge (2 Tage)

Ziel: Die Startseite besteht aus echten Astro-Komponenten.

Reihenfolge nach steigender Komplexitaet:

1. `Footer.astro` (Stammdaten, gemeinsamer Kontaktdaten-Block)
2. `Header.astro` (Stammdaten, Lockup)
3. `TrustStrip.astro` (Array von Strings)
4. `CoreMessage.astro` (zwei Felder)
5. `FinalCTA.astro` (drei Felder)
6. `FAQ.astro` (Array von Q/A — Content aus HTML extrahieren)
7. `FeatureTeaser.astro` (Array mit Icons — Content extrahieren)
8. `PricingTeaser.astro` (komplexeste Section: Tiers mit Features-Array)

Vorgehen pro Section:

- YAML-Datei `sections/<section>/lifeplus.yaml` anlegen.
- Schema in `src/content/config.ts` ergaenzen.
- Komponente bauen, `data-section`/`data-source` setzen.
- In `index.astro` einbauen.
- Visuell gegen `dist/site-lifeplus/index.html` pruefen.

Disziplin: Nicht zur naechsten Section, bevor die aktuelle visuell sitzt. Sonst haeufen sich Regressionen, die nicht mehr aufzuloesen sind.

Erfolgskriterium: `index.astro` ist unter 30 Zeilen, jede Section liegt isoliert in einer eigenen Datei unter 150 Zeilen, visueller Vergleich mit Alt-Build passt.

### Phase 4: Komponenten-Katalog ueber Preview-Route (0,5 Tag)

Ziel: Jeder Baustein ist isoliert pro Brand ansehbar — ohne zweite Toolchain.

Tasks:

- `src/pages/__preview/[brand]/[section].astro` als dynamische Route mit `getStaticPaths()`.
- Iteriert ueber alle Brand x Section-Kombinationen.
- Rendert genau eine Komponente isoliert, eingebettet im echten `BrandLayout`.

Vorteile gegenueber Histoire:

- Keine extra Dependency, kein zweiter Devserver.
- Echte Production-Komponenten, echtes Layout, echte YAML-Daten.
- Im Production-Build entweder per `astro.config.mjs` ausschliessen oder nicht verlinken.

Beispiele:

```text
http://localhost:4321/__preview/lifeplus/hero/
http://localhost:4321/__preview/fitline/pricing/
http://localhost:4321/__preview/eqology/faq/
```

Erfolgskriterium: Alle Brand x Section-Kombinationen sind unter eigenen URLs ansehbar.

### Phase 5: Restliche Brands und Seiten (1 Tag)

Ziel: FitLine und Eqology einbinden, weitere Seiten migrieren.

Tasks:

- `fitline.yaml` und `eqology.yaml` (Stammdaten).
- Brand-Overrides pro Section nur dort, wo bewusst differenziert wird. Wo nicht: `_shared.yaml` greift als Fallback.
- `features.astro`, `pricing.astro`, `impressum.astro`, `datenschutz.astro`, `agb.astro`, `widerruf.astro`, `mein-konto.astro` migrieren.
- `ASTRO_BRAND=fitline npm run build` testen.

Hinweis: Das Briefing uebersieht `agb.html`, `widerruf.html` und `mein-konto.html` — die sind in `website/templates/` vorhanden und gehoeren in die Migration.

Hinweis fuer PowerShell auf Windows: Entweder `cross-env` verwenden oder PowerShell-konforme Scripts (`$env:ASTRO_BRAND='fitline'; astro build`).

Erfolgskriterium: Drei Builds laufen sauber durch, alle Seiten sind in Astro abgebildet.

### Phase 6: Cut-Over (0,5 Tag)

Ziel: Astro ersetzt den Token-Replace-Build, ohne Deployment-Risiko.

Tasks:

- Root-`package.json`-Scripts umstellen: `build:site:<brand>` ruft jetzt `cd website-astro && astro build` mit gesetzter Brand-Variable.
- `scripts/build-webroot.mjs` pruefen — der Pfad `dist/site-<brand>/` bleibt gleich, also sollte nichts brechen.
- Preview-Branch in Cloudflare deployen, Sichtpruefung gegen Production.
- Erst dann: `website/` umbenennen in `website-legacy/`, nicht loeschen.
- Spaeter, nach mindestens einem Release-Zyklus ohne Beschwerden: `website-astro/` zurueck nach `website/` ueberfuehren, `website-legacy/` archivieren.

Erfolgskriterium: Drei Brand-Sites werden auf ihren Domains korrekt ausgeliefert, der alte Token-Replacer ist nicht mehr Teil der Build-Kette.

## Option A: Brand-Bundle — eine YAML pro Brand

Diese Struktur fasst alles, was eine Brand ausmacht, in einer einzigen Datei pro Brand zusammen. Stammdaten und alle Sections liegen nebeneinander in derselben YAML.

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
    │   ├── config.ts                    ← Zod-Schema (eine Collection)
    │   └── brands/
    │       ├── lifeplus.yaml            ← brand + alle 8 Sections in EINER Datei
    │       ├── fitline.yaml             ← brand + alle 8 Sections
    │       └── eqology.yaml             ← brand + alle 8 Sections
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

- Eine Brand ist eine Datei. Diff bei "FitLine umtexten" trifft genau eine YAML.
- Zod-Schema bleibt einfach: eine Collection, ein Schema.
- Brand-Freigabe-Flow: "Bitte pruefe `fitline.yaml`."

Nachteile:

- YAML wird gross — geschaetzt 300–400 Zeilen pro Brand.
- Querschnitts-Aenderungen ("neue FAQ-Frage ueberall") sind drei Datei-Edits, leicht zu vergessen.
- Bildet die heutige Realitaet schlecht ab: Heute ist Section-Content brand-uebergreifend gleich, mit Option A wird er ohne Not in drei Kopien verteilt.

Empfohlen, wenn:

- Brands sollen sich textlich klar voneinander unterscheiden.
- Redaktion denkt primaer pro Marke, nicht pro Baustein.
- Tonalitaet darf langfristig auseinanderlaufen.

## Option B: Section-Bundle — Stammdaten getrennt, Sections in Section-Ordnern mit Brand-YAMLs

Diese Struktur trennt zwei Welten: Brand-Stammdaten (Farben, Lockup, Domain) liegen pro Brand in einer eigenen Datei. Section-Content liegt pro Section in einem Unterordner, und in jedem Section-Ordner liegt eine eigene YAML pro Brand — plus optional `_shared.yaml` als Fallback.

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
    │   ├── config.ts                    ← Zod (zwei Collections: brands + sections)
    │   ├── brands/                      ← NUR Stammdaten pro Brand
    │   │   ├── lifeplus.yaml            ← Farben, Lockup, Domain, App-URL, Paddle-IDs
    │   │   ├── fitline.yaml
    │   │   └── eqology.yaml
    │   └── sections/                    ← Section-Content, nach Section gruppiert
    │       ├── hero/
    │       │   ├── _shared.yaml         ← Fallback fuer alle Brands
    │       │   ├── lifeplus.yaml        ← Override
    │       │   ├── fitline.yaml         ← Override
    │       │   └── eqology.yaml         ← Override
    │       ├── trust-strip/
    │       │   └── _shared.yaml         ← gemeinsam, kein Brand-Override
    │       ├── core-message/
    │       │   ├── _shared.yaml
    │       │   └── fitline.yaml         ← nur FitLine differenziert
    │       ├── feature-teaser/
    │       │   └── _shared.yaml
    │       ├── pricing-teaser/          ← Brand-spezifisch, kein _shared
    │       │   ├── lifeplus.yaml
    │       │   ├── fitline.yaml
    │       │   └── eqology.yaml
    │       ├── faq/
    │       │   ├── _shared.yaml
    │       │   └── fitline.yaml
    │       └── final-cta/
    │           └── _shared.yaml
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
        └── sectionContent.ts            ← Merge-Loader: _shared + Brand-Override
```

Beispiel `src/content/sections/hero/_shared.yaml`:

```yaml
eyebrow: "Verguetungs-Simulator"
claim: "Sieh deinen Verguetungsplan, bevor du planst."
subClaim: "Simuliere realistisch, was dein Netzwerk ueber zehn Jahre einspielen kann."
ctaLabel: "Simulator starten"
```

Beispiel `src/content/sections/hero/fitline.yaml` (Override):

```yaml
eyebrow: "FitLine Business Simulator"
subClaim: "Simuliere realistisch, was dein FitLine-Team ueber zehn Jahre einspielen kann."
ctaLabel: "FitLine-Simulation starten"
# eyebrow und subClaim ueberschreiben _shared.yaml,
# claim bleibt aus _shared.yaml
```

Vorteile:

- Bildet die heutige Realitaet ab: Sections sind im Kern gleich, Brands unterscheiden sich primaer in Stammdaten und vereinzelt in Sprache.
- Querschnitts-Aenderungen: eine Datei. Brand-Differenzierung wird explizit gemacht, nicht stillschweigend kopiert.
- Komponenten-Katalog (Preview-Route) liest natuerlich aus dieser Struktur — pro Section iteriert er ueber Brands.
- Skaliert besser bei neuen Brands: nur Stammdaten plus optionale Overrides anlegen.

Nachteile:

- Mehr Dateien — geschaetzt 8 Sections x bis zu 3 Brands plus `_shared` = bis zu 24 YAMLs.
- Zwei Content Collections statt einer, zwei Zod-Schemas, ein Merge-Loader (`sectionContent.ts`).
- "Ganze FitLine-Seite redaktionell pruefen" geht nicht aus einer einzigen Datei — dafuer dient die Preview-Route und die gebaute Seite.

Empfohlen, wenn:

- Brands bleiben im Kern aehnlich, mit gezielten Unterschieden.
- Querschnitts-Konsistenz (alle FAQ-Listen gleich aktuell) ist wichtig.
- Du bei jeder neuen Brand nicht alle Sections kopieren willst.

## Direkter Vergleich der zwei Optionen

| Kriterium                                       | Option A: Brand-Bundle | Option B: Section-Bundle |
|---|---|---|
| Ganze Brand pruefen                              | Sehr gut               | Mittel (per Preview)     |
| Einen Baustein ueber alle Brands vergleichen     | Mittel                 | Sehr gut                 |
| Querschnitts-Aenderung "neue FAQ-Frage ueberall" | Schlecht (3 Dateien)   | Sehr gut (1 Datei)       |
| Bildet heutige Realitaet ab                      | Schlecht               | Sehr gut                 |
| Anzahl YAML-Dateien                              | 3                      | bis zu 24                |
| Zod-Schema-Komplexitaet                          | Niedrig                | Mittel                   |
| Content-Loader-Komplexitaet                      | Niedrig                | Mittel (Merge-Logik)     |
| Neue Brand hinzufuegen                           | YAML duplizieren       | Stammdaten + Overrides   |
| Redaktionelle Brand-Freigabe                     | Sehr gut               | Mittel                   |

## Konkrete Entscheidung

Starte mit **Option B**.

Begruendung: Die heutige `brands.json` enthaelt **nur Stammdaten**. Section-Content steckt brand-uebergreifend identisch in HTML-Templates. Option B macht das sichtbar und ehrlich. Option A wuerde diese Identitaet ohne Not in drei Kopien zerlegen und damit drei Stellen schaffen, an denen Drift entstehen kann.

Die Preview-Route `/__preview/[brand]/[section]/` liefert die Brand-Sicht trotzdem — und auch die gebauten Seiten sind komplette Brand-Ansichten.

## Minimaler erster Sprint

Der erste Sprint bleibt absichtlich klein und produziert einen lauffaehigen Walking Skeleton:

1. `website-astro/` anlegen mit Astro und TypeScript.
2. Option-B-Struktur fuer `src/content/` anlegen.
3. `lifeplus.yaml` (Stammdaten) erstellen.
4. `sections/hero/lifeplus.yaml` und `sections/hero/_shared.yaml` erstellen.
5. Zod-Schema fuer Brand und Hero in `config.ts`.
6. `sectionContent.ts`-Loader mit Merge-Logik (`_shared` + Brand-Override).
7. `BrandLayout` und `Hero.astro` bauen.
8. `index.astro` rendert nur Hero, fuer LifePlus.
9. `debug.css` und `debug.js` einbinden, im Browser testen.
10. Preview-Route `/__preview/lifeplus/hero/` rendern.

Akzeptanzkriterien fuer diesen Sprint:

- `npm run dev` zeigt die Astro-LifePlus-Seite mit Hero.
- `npm run build` bricht bei kaputter YAML sichtbar ab.
- Hero ist isoliert unter `/__preview/lifeplus/hero/` sichtbar.
- Debug-Toggle (`d`) zeigt Komponentennamen.
- Production-Build enthaelt kein Debug-CSS/JS (grep-pruefbar).
- Der alte `website/`-Build bleibt unangetastet.

## Spaetere Ausbaustufen

Wenn die Astro-Struktur steht, koennen folgende Punkte folgen — bewusst NICHT Histoire:

- Automatische Screenshots pro Brand und Section ueber Playwright im CI.
- Eine zusaetzliche Review-Seite `/__review/[section]/`, die alle drei Brand-Varianten einer Section nebeneinander zeigt (perfekt fuer Konsistenz-Checks).
- Pfad-Routing als spaetere Optimierung, wenn alle drei Brands unter `lifeflow360.app/<brand>/` laufen sollen.
- Optionales CMS (z.B. CloudCannon, TinaCMS), aber erst nachdem die Datenstruktur stabil ist und der `_shared`/`override`-Mechanismus sich bewaehrt hat.

---

# Vergleich mit `astro-einfuehrungsplan-und-dateistruktur.md`

Dieser Abschnitt vergleicht den vorliegenden Plan (Claude-Variante) mit dem Plan in `astro-einfuehrungsplan-und-dateistruktur.md` (im Folgenden "Referenzplan").

## Vergleich der Empfehlung

| Aspekt                                | Referenzplan                                  | Claude-Variante                                 |
|---|---|---|
| Empfohlene Option                     | Option A (Brand-zentriert)                    | Option B (Section-zentriert)                    |
| Begruendung                           | Brand-Perspektive im Vordergrund              | Heutige Realitaet abbilden, Drift vermeiden     |
| Vorgesehener Kompromiss               | Preview-Route ergaenzt Section-Sicht          | Preview-Route ergaenzt Brand-Sicht              |

## Vergleich der Phasenstruktur

| Phase | Referenzplan                          | Claude-Variante                                | Hauptunterschied                                                                 |
|---|---|---|---|
| 0     | Entscheidung und Schutzleine           | Inventur und Entscheidungen                    | Claude trifft drei Festlegungen explizit (Side-by-Side, drei Builds, kein Histoire) + Content-Inventur |
| 1     | Astro-Grundgeruest                     | Astro-Skelett                                  | Inhaltlich identisch                                                              |
| 2     | Erste sichtbare Baustein-Kette (alle 9) | Walking Skeleton: NUR Hero + Debug-View         | Claude zieht ein Skelett komplett durch, bevor weitere Sections gebaut werden     |
| 3     | Debug-Ansicht (nachgelagert)            | Restliche Sections                              | Bei Claude ist Debug-View Teil von Phase 2, nicht eigener Schritt                 |
| 4     | FitLine und Eqology migrieren           | Komponenten-Katalog ueber Preview-Route         | Claude kuemmert sich frueher um Isolation der Bausteine                           |
| 5     | Komponenten-Katalog (mit Histoire-Option)| Restliche Brands und Seiten                    | Claude streicht Histoire ganz, baut nur Astro-Preview                             |
| 6     | Weitere Seiten migrieren                | Cut-Over                                        | Andere Reihenfolge                                                                |
| 7     | Umschaltung                             | —                                              | Claude hat eine Phase weniger, weil "Komponenten-Katalog" fruehzeitig integriert |

## Vergleich der Datei-Strukturen — Option A

| Aspekt                          | Referenzplan: Option A                          | Claude-Variante: Option A                              |
|---|---|---|
| Brand-Ordner                    | `brands/lifeplus/`, `brands/fitline/`, `brands/eqology/` | `brands/lifeplus.yaml`, `brands/fitline.yaml`, `brands/eqology.yaml` |
| Inhalt pro Brand                | Aufgeteilt in `brand.yaml` + `home.yaml` + `features.yaml` + `pricing.yaml` + `legal.yaml` | Eine einzige Datei pro Brand mit allen Sections        |
| Anzahl Dateien                  | 3 Brands x 5 Page-YAMLs = 15 Dateien            | 3 Dateien                                              |
| Kompositionsachse               | Brand x Page                                    | Brand                                                  |
| Page-Begriff                    | Explizit (home, features, pricing, legal)       | Implizit (Sections im Brand)                           |
| Preview-Components-Ordner       | Vorhanden (`components/preview/`)               | Nicht vorgesehen                                       |

## Vergleich der Datei-Strukturen — Option B

| Aspekt                          | Referenzplan: Option B                          | Claude-Variante: Option B                              |
|---|---|---|
| Stammdaten                      | `brands/lifeplus.yaml` etc.                     | `brands/lifeplus.yaml` etc.                            |
| Section-Ablage                  | `sections/home/hero.yaml` (gruppiert nach Page) | `sections/hero/lifeplus.yaml` (gruppiert nach Section) |
| Brand-Varianten in einer Section| Alle Brands als Keys IN einer YAML              | Eine YAML PRO Brand pro Section                        |
| `_shared`-Fallback              | Nicht vorgesehen                                | Vorgesehen, explizit unterstuetzt                      |
| Anzahl Dateien (geschaetzt)     | ~17 Section-YAMLs                               | bis zu 24 YAMLs (mit Overrides)                        |
| Page-Begriff                    | Explizit (sections/home/, sections/pricing/)    | Nicht vorhanden — Sections sind Seiten-unabhaengig     |
| Page-Komposition                | Eine `home`-Seite holt alle YAMLs aus `sections/home/` | Eine Seite holt explizit benannte Sections per Loader |
| Preview-Route Parameter         | `__preview/[section].astro`                     | `__preview/[brand]/[section].astro`                    |

## Konzeptionelle Unterschiede der Strukturen

| Konzept                         | Referenzplan                                    | Claude-Variante                                        |
|---|---|---|
| Primaere Achse Option A         | Brand x Page (Brand-Ordner, Page-Dateien)        | Brand (eine Datei pro Brand)                           |
| Primaere Achse Option B         | Page x Section (Page-Ordner, Section-Dateien mit Brand-Keys) | Section x Brand (Section-Ordner, Brand-Dateien) |
| "Page" als Konzept              | Explizit beruecksichtigt                        | Bewusst weggelassen — Sections sind seitenagnostisch   |
| Section-Wiederverwendung ueber Seiten | Nicht direkt unterstuetzt                  | Natuerlich moeglich (Hero kann auf mehreren Seiten genutzt werden, eine Datenquelle) |
| Section-Loader Komplexitaet     | `content.ts` (eine Quelle pro Section)          | `sectionContent.ts` (Merge `_shared` + Override)        |

## Bewertung der Unterschiede

| Frage                                                                   | Sieger / Hinweis                                                                                       |
|---|---|
| Welche Variante bildet die heutige `brands.json`-Realitaet treuer ab?    | Claude-Option-B (Section-Bundle mit `_shared`)                                                          |
| Welche Variante ist redaktionell uebersichtlicher pro Brand?             | Referenz-Option-A (Brand-Ordner mit Page-YAMLs)                                                         |
| Welche Variante minimiert Drift ("alle FAQs aktuell halten")?            | Claude-Option-B (eine Quelle pro Section, gezielter Override)                                           |
| Welche Variante hat weniger Dateien?                                     | Claude-Option-A (3 Dateien), gefolgt von Referenz-Option-B (~17)                                        |
| Welche Variante macht "Page" als Begriff am sichtbarsten?                | Referenzplan (beide Optionen tragen `home/`, `pricing/`, `features/` in der Struktur)                   |
| Welche Variante skaliert besser bei einer 4. Brand?                      | Claude-Option-B (nur Stammdaten + gezielte Overrides), Referenz-Option-A muss alle 5 Page-YAMLs kopieren |
| Welcher Plan bringt die Debug-View frueher in den Workflow?              | Claude-Variante (Phase 2 statt Phase 3)                                                                 |
| Welcher Plan ist beim Tooling sparsamer?                                 | Claude-Variante (Histoire ganz gestrichen)                                                              |
| Welcher Plan macht die Brand-Sicht im Code visuell expliziter?           | Referenzplan (jede Brand hat einen eigenen Ordner)                                                      |

## Kurzfazit

Beide Plaene fuehren am gleichen Ziel vorbei: typsicher validierte Brand-Daten, isolierte Bausteine, Debug-View. Sie unterscheiden sich vor allem in **zwei Hebeln**:

1. **Wo liegt der Schwerpunkt der Datei-Organisation?**
   Referenzplan: Brand zuerst, Page als Zwischenebene, Section zuletzt.
   Claude-Variante: Section zuerst, Brand als Variante darunter, Page nur in `pages/`.

2. **Welche Realitaet wird in Code gegossen?**
   Referenzplan: Der Wunsch-Zustand "jede Brand hat eigene Texte" wird strukturell vorweggenommen.
   Claude-Variante: Der Ist-Zustand "Sections sind brand-uebergreifend gleich, mit gezielten Unterschieden" wird abgebildet.

Eine pragmatische Synthese waere: **Mit Claude-Option-B starten** (weil sie die heutige Realitaet sauber abbildet und Drift verhindert), aber den **brand-zentrierten Reading-Flow ueber die Preview-Route und ueber die gebauten Seiten** sicherstellen — und falls sich nach einigen Monaten zeigt, dass Brands wirklich stark divergieren, sind die Brand-YAMLs ohnehin schon vorhanden, und ein Move zu Brand-Bundles ist mechanisch.
