# Gesamt-Review Claude v1

**Stand:** 2026-05-29
**Reviewer:** Claude (Anthropic)
**Scope:** Webseite `lifeflow360.app` (Hero/Features/Pricing/AGB/Widerruf/Impressum/Datenschutz) vs. aktueller App-Code (`simulator-app/`) vs. Konzepte (Value Proposition, Freemium-Modell, Freemium-Applikation)

---

## 0. Hinweis zur Datengrundlage

Bevor das Review beginnt, ist Transparenz über die Quellenlage wichtig:

| Quelle | Status | Bemerkung |
|---|---|---|
| Live-Webseite `lifeflow360.app` | **Nicht direkt zugänglich** | `.htaccess` blockiert KI-Crawler (ClaudeBot, GPTBot etc.) als "Vorab-Vollsperre fuer nicht oeffentliche Produktstaende". `robots.txt` ergänzt die Sperre. Selbst Google-Snippets der Site liegen aktuell nicht vor. |
| HTML-Templates `website/templates/{index,features,pricing}.html` | **Indirekt verfügbar** | Inhalte aus der detaillierten IST-Analyse in `Webcontent & Value Proposition.md` (Stand 2026-05-22) mit konkreten Zeilenangaben. |
| Rechtsdokumente (AGB/Widerruf/Impressum/Datenschutz) | **Nicht im Quellmaterial** | Im App-Code als `${siteUrl}impressum.html` und `${siteUrl}datenschutz.html` referenziert (s. `simulator-app/src/App.tsx`, Footer). AGB- und Widerruf-Seiten nicht referenziert. |
| App-Code `simulator-app/` | **Vollständig vorhanden** | Lesbar inklusive Komponenten, Auth-Flow, Pricing-Verlinkung, Footer. |
| Konzeptdokumente | **Vollständig vorhanden** | Freemium-Modell, Freemium-Applikation, Webcontent & Value Proposition. |

**Konsequenz fuer das Review:**

- Die Findings zur **Webseite** stuetzen sich auf die IST-Analyse in `Webcontent & Value Proposition.md`. Wo diese eine Zeilennummer nennt (z. B. `index.html:653-655`), ist die Diagnose belastbar.
- Die Findings zu **Rechtsdokumenten** sind **nicht aus dem Wortlaut der HTML-Seiten** abgeleitet, sondern aus dem App-Verhalten (Footer-Links, Paddle-Integration, Datenfluesse). Sie listen daher **was die Dokumente enthalten muessen**, nicht **was sie tatsaechlich enthalten**.
- Empfehlung: Bevor Aenderungen an AGB/Widerruf/Impressum/Datenschutz gemacht werden, Wortlaut der Seiten an mich zurueckspielen (Copy-Paste oder Datei), dann kann das Review konkret werden.

---

## 1. Executive Summary

Drei kritische Befunde, die vor allem anderen geklaert werden muessen:

1. **Verkaufsversprechen ueberschreiten ehrliche Positionierung.** Hero-Text und Demo-Frames der Webseite enthalten konkrete Vollzeit-Einkommen-Versprechen ("ersetzt Vollzeit-Einkommen in 4–7 Jahren") und konkrete Geldbetraege ("€8.420/Mon"). Diese widersprechen dem Konzept-Hedge ("zeigt nicht was garantiert passiert, sondern was aus Annahmen mathematisch entstehen kann"). Risiko: Verbraucherzentrale-Angriffsflaeche, MLM-Skeptiker-Kritik, rechtlich heikel.
2. **Drei zentrale Konzept-Features fehlen auf der Webseite.** Im Code sind sie implementiert: 3 Simulationsmodelle (Standard/Zufallsverteilung/Momentum), Ziele-Leiter mit konfigurierbaren Zielen, vier Netzwerk-Visualisierungen (Tabelle/Sunburst/Bein-Spalten/Hybrid-Tree, plus drei Personenbaum-Views). Webseite bewirbt stattdessen Pitch-Modus und URL-Sharing.
3. **Freemium- und Founder-Modell sind auf der Pricing-Seite nicht abgebildet.** Konzept fordert 14,95 EUR/Monat-Treppe mit Founder-Discount, pro-rata Kuendigung und 14-Tage-Trial; Webseite zeigt nach IST-Analyse ein 19/15-EUR-Modell und keine Free-Karte. Code-Seite hat noch keine Freemium-Capability-Schicht.

Sechs weitere wichtige Befunde:

4. Hero-Wording widerspricht dem Konzept-Wording (im Konzept explizit abgelehnt).
5. Zielgruppe "Sponsor mit bestehender Downline" fehlt komplett auf der Webseite.
6. Stufen-Vokabular (Believer→Diamond, AV/QGV/QL) ist hartkodiert und nicht brand-spezifisch.
7. Brand-Tonalitaet ist identisch ueber alle drei Brands; nur Farben unterscheiden.
8. KPI-Bezeichnungen in App und Webseite divergieren ("Umsatz" vs. "IP" vs. "QV/BV").
9. Disclaimer im App-Footer ist vorhanden, aber dezent — er sollte sichtbarer werden, wenn Verkaufsversprechen auf der Webseite reduziert werden, sonst entsteht eine "Hier verspricht, dort relativiert"-Inkonsistenz.

---

## 2. Methode

Das Review prueft drei Achsen:

```
                    ┌───────────────────────────────────┐
                    │   Aktueller App-Code              │
                    │   (simulator-app/, /packages/...) │
                    └─────────────┬─────────────────────┘
                                  │
              ┌───────────────────┼────────────────────┐
              ▼                   ▼                    ▼
    ┌──────────────┐    ┌──────────────────┐   ┌────────────────┐
    │  Webseiten-  │    │  Konzeptpapiere  │   │  Recht         │
    │  Texte       │    │  - Value Prop    │   │  - AGB         │
    │  - Hero      │    │  - Freemium      │   │  - Widerruf    │
    │  - Features  │    │  - Freemium-App  │   │  - Impressum   │
    │  - Pricing   │    │                  │   │  - Datenschutz │
    └──────────────┘    └──────────────────┘   └────────────────┘

  Achse A: Code vs. Webseite        - was kann die App, was bewirbt die Seite?
  Achse B: Webseite vs. Konzept     - was sagt die Seite, was fordern die Konzepte?
  Achse C: Recht vs. Code+Konzept   - decken AGB/Datenschutz die App-Realitaet ab?
```

Jeder Befund hat: Schweregrad, Belegstelle, Vorschlag, Aufwand.

Schweregrad-Skala:
- **Kritisch** = blockiert Launch / rechtliches Risiko
- **Hoch** = stoert Conversion oder widerspricht Konzept
- **Mittel** = Wartbarkeit, Klarheit, mittelfristige Brand-Schwaeche
- **Niedrig** = Stil

---

## 3. Achse A — App-Code vs. Webseite

### 3.1 Was die App heute kann (aus Code)

Aus `simulator-app/src/App.tsx`, `components/`, `vite.config.ts`, `package.json`:

**Pflichtfunktionen (sichtbar auf Hauptseite):**

- Fuenf Slider/Stepper: `membersPerYear`, `shoppersPerYear`, `monthlyIP` (Volumen/Person), `duplicationRate`, `attritionRate` (App.tsx Z. 124-180)
- Live-Berechnung ueber 10 Jahre via `runSimulation()` aus `@mlm/simulator-core`
- Hero-Provisionszahl mit Monats- und Jahresanzeige (`HeroNumber.tsx`)
- StatCards: Netzwerkgroesse, aktueller Rang
- 10-Jahres-Provisionsverlauf-Chart mit Ziel-Markern (`ProvisionChart.tsx`)
- Jahres-Zusammenfassungstabelle mit AV, QGV, Mitgliederzahlen, Bronze/Diamond-Beinen (`YearlySummaryTable.tsx`)

**Erweiterte Einstellungen (Advanced Panel):**

- Max. direkte Members pro Sponsor (`maxDirectMembersPerMember`)
- Eigenkonsum/Monat (`monthlyProductCostEUR`)
- Drei Reality-Strategien: `standard`, `dirichlet` (Zufallsverteilung), `momentum`; `lifecycle` als kommendes Feature ausgegraut (`AdvancedSettingsPanel.tsx`)

**Ziele-Leiter:**

- Frei konfigurierbare Ziele (`GoalsLadderPanel.tsx`, `GoalsEditorDialog.tsx`)
- Zielarten: `productsRefinanced`, `monthlyIncome`, `monthlySurplus`, `yearlySurplus`
- Default-Ziele: Produkte refinanziert, Urlaub, Auto, Mietfrei wohnen, Frei leben (App.tsx Z. 30-37)
- Zehn Icon-Optionen (`GoalIcon.tsx`)
- Live-Fortschrittsanzeige mit Achieved/Wartet-Status

**Netzwerk-Visualisierungen (Aggregat-Modell):**

- Sunburst mit Farbmodi (Bein/Rang/Status), Groessenmodi (Knoten/QGV/Provision), Drill-Down via Breadcrumbs (`NetworkVisualizations.tsx`)
- Bein-Spalten mit Ebenen-Balken pro Bein
- Hybrid-Tree als SVG-Strukturansicht

**Personenbaum-Visualisierungen (echte Persons aus Tree-Compensation):**

- Radial Tree (`RadialTree.tsx`)
- Horizontales Dendrogramm (`HorizontalDendrogram.tsx`)
- Hyperbolic Tree (als "in Vorbereitung" markiert)
- Filter "Inaktive ausblenden", Collapse/Expand, Shopper-Aggregate

**Verguetungsplan-Erklaerung:**

- Lineage-View mit Beispiel-Team von 12 Personen (Anna bis Maria)
- Order setzen, Status setzen pro Person
- Phase-1/2/3-Aufteilung, Mentor-Bonus-Splits sichtbar
- Code im `simulator-app/src/components/lineage/`-Ordner

**Auth & Account:**

- Magic-Link-Login (`LoginGate.tsx`, `auth/api.ts`)
- Account-Panel mit Status, Paddle-Portal-Link (`AccountPanel.tsx`)
- Paywall fuer Nicht-Berechtigte (`Paywall.tsx`)
- Device-Limit-Gate (`DeviceLimitGate.tsx`)
- Free-Login bereits vorbereitet (`access=free` Query-Parameter in `verifyMagicLink`)

**Persistenz & Reset:**

- `localStorage`-Persistenz pro Brand (`loadPersistedState`/`savePersistedState`)
- Reset auf Defaults (App.tsx Z. 184-203)
- Stepper/Slider-Umschaltung (`InputModeToggle`)

**PWA-Funktionalitaet:**

- Service Worker mit Auto-Update (`pwaUpdates.ts`)
- Update-Reload nur ausserhalb kritischer Auth-/Checkout-Flows

**Drei Brand-Varianten:**

- LifePlus/FitLine/Eqology ueber `VITE_PRODUCT`-Env
- Eigene Theme-Color, Lockup, Domain (`vite.config.ts`)
- Hardcoded `accentColor`-Mapping `lifeplus → #006F44` (aktuell, nicht mehr `#1D9E75` wie im Tailwind-Config!)

**Footer-Links:**

- Impressum: `${siteUrl}impressum.html`
- Datenschutz: `${siteUrl}datenschutz.html`
- Webseite: `siteUrl`
- **Fehlen: AGB-Link, Widerruf-Link**

### 3.2 Was die Webseite heute bewirbt (aus IST-Analyse Konzeptpapier)

Laut `Webcontent & Value Proposition.md` (IST-Analyse Stand 2026-05-22):

**Startseite (`index.html`):**

- Hero: "Niemand sieht exponentielles Wachstum im voraus" (Z. 653-655)
- Demo-Frames mit konkreten Zahlen: `€8.420/Mon · Netzwerk 412 · Gold in Jahr 6` (features.html Z. 670-686)
- Versprechen: "Wer Gas gibt, ersetzt sein Vollzeit-Einkommen in 4–7 Jahren" (Z. 838)
- "Nebenher gestartet — Rentenlücke in 10 Jahren geschlossen" (Z. 843)
- Drei Teaser-Karten: Slider, Verlauf, Pitch-Modus (Z. 858-886)
- "Sein nächstes 'Ja' ist eine Zahl entfernt" (Z. 1035)

**Features-Seite (`features.html`):**

- Feature 01: Fuenf Slider mit "IP / Monat" (Z. 546-549)
- Feature 02: Verlauf (Live-Simulation)
- Feature 03: Stufen-Prognose mit hartkodiertem Vokabular (Believer→Builder→Bronze→Silver→Gold→Diamond→1*–3* Diamond) und Kennzahlen AV/QGV/QL (Z. 651-686)
- Feature 04: Pitch-Modus mit grossem Visual (Z. 694-728)
- Feature 05: URL-Sharing/Multi-Device

**Pricing-Seite (`pricing.html`):**

- Monatlich €19 (Z. 519-592)
- Jaehrlich €15/Monat
- FAQ-Erwaehnung einer "reduzierten Demo-Version" (Z. 712-720), **aber keine Free-Karte im Grid**
- Vergleichstabelle mit 2 Spalten (Z. 600-652)

### 3.3 Diff-Tabelle: Code-Feature vs. Webseiten-Praesenz

| Code-Feature | Webseite | Diff |
|---|---|---|
| Fuenf Slider | ja, Feature 01 | ✅ |
| 10-Jahres-Chart mit Verlauf | ja, Feature 02 | ✅ |
| Live-Verguetungsplan-Logik | implizit ja | 🟡 nicht prominent erklaert |
| **3 Simulationsmodelle** | **fehlt** | ❌ |
| **Ziele-Leiter** | **fehlt** | ❌ |
| **4 Netzwerk-Visualisierungen (Aggregat)** | **fehlt** | ❌ |
| **3 Personenbaum-Visualisierungen** | **fehlt** | ❌ |
| **Verguetungsplan-Erklaerung (Lineage)** | **fehlt** | ❌ |
| Max-Members-pro-Sponsor einstellbar | fehlt | ❌ |
| Eigenkonsum/Refinanzierung als Berechnungsgrundlage | fehlt | ❌ |
| Stepper vs. Slider-Umschaltung | fehlt | 🟡 ok zu fehlen |
| Pitch-Modus | Feature 04, prominent | ⚠️ falsch gewichtet |
| URL-Sharing | Feature 05 | ⚠️ Konzept will als Pro-Submerkmal |
| Stufen-Prognose | Feature 03 | 🟡 vorhanden, aber hartkodiert |

**Befund F-A1 [Hoch] — Fuenf Konzept-Features fehlen auf der Webseite, obwohl im Code vorhanden.**

Diese fuenf Features im Code, aber nicht auf der Seite:

1. Drei Simulationsmodelle (Standard / Zufallsverteilung / Momentum)
2. Ziele-Leiter mit konfigurierbaren Zwischenzielen
3. Netzwerk-Visualisierungen: Sunburst, Bein-Spalten, Hybrid-Tree (zusaetzlich zur Tabelle)
4. Personenbaum-Views: Radial Tree, Dendrogramm (Hyperbolic Tree "in Vorbereitung")
5. Verguetungsplan-Erklaerung mit interaktivem Beispiel-Team (Lineage)

**Wo sie auf der Webseite stehen koennten:**

| Feature | Empfohlene Stelle | Begruendung |
|---|---|---|
| 3 Simulationsmodelle | `features.html`, neue Section #03 | Loest "realistische Wachstumsmodellierung" ein, die das Konzept als USP nennt. Momentum als Pro-Hook. |
| Ziele-Leiter | `features.html`, neue Section #04 | Direkter Motivations-Anker fuer Sponsoren mit Downline (Use Case 2). |
| Netzwerk-Visualisierungen | `features.html`, neue Section #05, mit 3-Screenshot-Grid | Visueller Wow-Effekt, der den Sunburst hervorhebt; Bein-Spalten/Hybrid-Tree als Pro-Sub. |
| Personenbaum-Views | als Sub-Section unter Netzwerk-Visualisierungen | Trennt "Aggregat" vs. "echte Personen" — wichtig fuer Verguetungsplan-Verstaendnis. |
| Verguetungsplan-Erklaerung | als eigene Sub-Section "Plan verstehen" | Vertrauensaufbau gegen MLM-Skepsis: "wir simulieren nicht pauschal, wir rechnen den Plan durch." |

**Befund F-A2 [Hoch] — Pitch-Modus dominiert die Webseite, ist im Code aber nicht klar als Modus identifizierbar.**

Im Code ist kein separater "Pitch-Modus" zu finden. Es gibt:
- `expandedSection`-State in App.tsx fuer "goals" oder "advanced" Panels
- URL-basiertes Sharing via Magic-Link (Auth), aber kein Pitch-spezifisches URL-Format
- `present_files`-aehnlichen oder Full-Screen-Modus: keiner

Das deutet darauf hin: Was die Webseite als "Pitch-Modus" bewirbt, **gibt es im Code nicht als eigenes Feature**, sondern es ist die normale Bedienung des Simulators mit einem Kunden gemeinsam (Slider verschieben, Werte besprechen).

**Konsequenz:** Entweder Pitch-Modus wirklich bauen (Vollbild-Mode, optimierte Sliderhandhabung fuer Tablet/Smartphone-Praesentation, ggf. Disable von Reset/Speichern waehrend Pitch), oder das Wording auf der Webseite zu "Live im Gespraech mit Interessenten nutzen" umformulieren — ohne Anspruch auf eigenen Modus.

**Empfehlung:** Wording auf der Webseite umformulieren (Aufwand S), Pitch-Modus als optionales Feature spaeter implementieren, wenn die anderen fehlenden Features auf die Seite gehoben sind.

**Befund F-A3 [Mittel] — URL-Sharing/Multi-Device wird beworben, aber Magic-Link-Auth widerspricht beiden.**

Die Webseite bewirbt URL-Sharing als Feature. Im Code:
- Auth ueber Magic-Link an personalisierte E-Mail
- Device-Limit 3 (`DeviceLimitGate.tsx`)
- Kein Code-Pfad zum Erzeugen eines "Demo-Szenario-URLs" gefunden
- `App.tsx` speichert nur in `localStorage` (Client-seitig), nicht in shareable URLs

**Frage offen:** Existiert ein nicht-vorgezeigter Mechanismus, der Szenarien als Link teilt? Falls nein, ist URL-Sharing genauso wie Pitch-Modus ein Webseiten-Versprechen ohne Code-Realitaet.

**Befund F-A4 [Mittel] — Footer der App listet weder AGB noch Widerruf.**

Aus `App.tsx`, Footer-Sektion:
```tsx
<a href={`${product.siteUrl}impressum.html`}>Impressum</a>
<a href={`${product.siteUrl}datenschutz.html`}>Datenschutz</a>
<a href={product.siteUrl}>Zur Webseite</a>
```

**Fehlt:**
- AGB-Link (kritisch fuer Abo-Modell)
- Widerruf/Widerrufsbelehrung (gesetzlich verpflichtet bei Fernabsatzvertraegen)
- Cookie-Einstellungen / Consent-Erneuerung (DSGVO-relevant, falls Cookies/Tracker gesetzt werden)

Falls die Pricing-Seite die Bezahlung anbietet, aber die App diese AGB- und Widerrufs-Links **nicht** zeigt, ist das ein rechtliches Risiko — siehe Abschnitt 5.

---

## 4. Achse B — Webseite vs. Konzeptpapiere

### 4.1 Hero-Wording

**Befund F-B1 [Hoch] — Hero-Wording widerspricht Konzept-Wording.**

| Aktuell (index.html:653-655) | Konzept fordert (Webcontent.md Z. 50) |
|---|---|
| "Niemand sieht exponentielles Wachstum im voraus" | "Exponentielles Wachstum fuehlt sich am Anfang zu klein an und spaeter ploetzlich zu gross. Genau diese Luecke macht der Simulator sichtbar." |

Im Konzept ausdruecklich als **falsche Formulierung** markiert. "Im voraus sehen" passt nicht zu einem Wachstumsphaenomen.

**Vorschlag (uebernommen aus Konzept Z. 56-78):**
- Hero-H1: "Netzwerk-Wachstum versteht man nicht in Tabellen. Man versteht es, wenn man es veraendert."
- Subline: "Mit fuenf Basiswerten simulierst du live, wie Member, Shopper, Umsatz, Duplikation und Fluktuation ueber Jahre auf Verguetung, Ziele und Teamstruktur wirken. Fuer ruhigere Gespraeche mit Interessenten und mehr Orientierung in deiner Downline."
- CTA: "Simulator starten"

**Aufwand:** S (eine Edit-Stelle). **Risiko:** niedrig.

### 4.2 Verkaufsversprechen

**Befund F-B2 [Kritisch] — Konkrete Einkommensversprechen sind rechtlich und ethisch problematisch.**

Stellen auf der Webseite, die ueber das Konzept-Hedge hinausgehen:

| Stelle | Aussage | Problem |
|---|---|---|
| index.html:838 | "Wer Gas gibt, ersetzt sein Vollzeit-Einkommen in 4–7 Jahren." | Konkrete Verdienstprognose ohne klare Hedge — Verbraucherzentrale-Angriffsflaeche. |
| index.html:843 | "Nebenher gestartet — Rentenluecke in 10 Jahren geschlossen." | Suggeriert garantiertes finanzielles Outcome. |
| index.html:1035 | "Sein naechstes 'Ja' ist eine Zahl entfernt." | Verkaufstrichter-Sprache, nicht "Klaerung von Erwartungen". |
| features.html:670-686 | Demo-Frame: `€8.420/Mon · Netzwerk 412 · Gold in Jahr 6` | Konkrete Zahl ohne Disclaimer im Frame selbst. |

Konzept fordert (Z. 51): *"Der Simulator zeigt nicht, was garantiert passiert. Er zeigt, was aus bestimmten Annahmen mathematisch entstehen kann."*

**Im App-Code dagegen Disclaimer richtig:** App.tsx Z. 376:
> "Schaetzung auf Basis des aktuell hinterlegten Verguetungsplans. Keine Garantie fuer tatsaechliche Provisionen."

Die App hedged richtig, die Webseite nicht. Das ist eine Lesart-Inkonsistenz, die genau dort entsteht, wo Verbraucherschutz hinschaut.

**Vorschlaege (Reihenfolge nach Wirkung):**

1. **Demo-Frame-Zahlen als "Beispielwerte" markieren.** Im Demo-Frame selbst ein dezentes "Beispiel" -Label oben rechts, und unter dem Frame eine 1-Zeilen-Note: "Beispielszenario aus den Slider-Werten links. Andere Annahmen, andere Zahl."
2. **"Wer Gas gibt"-Block in "Was passt zu meinem Szenario?"-Format umbauen.** Statt "ersetzt sein Vollzeit-Einkommen" → "ein moegliches Szenario: Vollzeit-Einkommen in 4–7 Jahren, wenn folgende Annahmen halten: [Annahmen]. Probier deine eigenen Werte." Mit Slider-Link.
3. **"Naechstes 'Ja'"-Wording streichen.** Ersetzen durch "Lass deinen Interessenten selbst rechnen" oder "Aus seinen Annahmen, nicht deinen Versprechen".
4. **Im Footer aller Seiten ein dezentes "Keine Verdienstgarantie"-Element** mit Link zu einem Earnings-Disclaimer-Abschnitt der AGB.

**Aufwand:** M (mehrere kleine Edits + neuer AGB-Abschnitt). **Risiko:** niedrig — eher Risiko-Reduktion.

### 4.3 Zweite Zielgruppe fehlt

**Befund F-B3 [Hoch] — "Sponsor mit bestehender Downline" fehlt komplett auf der Webseite.**

Konzept Z. 67-78 fordert zwei gleichrangige Use Cases:
1. Sponsor im Interessentengespraech
2. Sponsor mit bestehender Downline (Motivation, Durststrecken-Brueckenbauer)

Aktuelle Webseite spricht ausschliesslich Use Case 1 an ("sein naechstes Ja", "dein Interessent", "in seiner Hand").

**Konsequenz:** Eine ganze Verkaufsstrecke fehlt — Sponsoren, die ihre Downline langfristig fuehren wollen (= wiederkehrende Nutzung, hoeherer LTV) — fuehlen sich nicht angesprochen.

**Vorschlag:** Auf der Startseite einen Block "Zwei Situationen, ein Werkzeug" einfuegen:

```
                  ┌─────────────────────────────────────────┐
                  │   Zwei Situationen, ein Werkzeug        │
                  └─────────────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────────┐
              ▼                                             ▼
    ┌──────────────────────┐                    ┌──────────────────────┐
    │  Interessenten       │                    │  Bestehende Downline │
    │  gewinnen            │                    │  motivieren          │
    │                      │                    │                      │
    │  Gemeinsam rechnen,  │                    │  Durststrecken in    │
    │  statt zu pitchen.   │                    │  ein faires Bild     │
    │  Aus seinen Zahlen   │                    │  uebersetzen. Sehen, │
    │  ein realistisches   │                    │  warum Jahr 1 oft    │
    │  Bild bauen.         │                    │  klein aussieht.     │
    └──────────────────────┘                    └──────────────────────┘
```

**Aufwand:** M (neue Section + Visuals). **Risiko:** niedrig.

### 4.4 Begriffsinkonsistenz: Umsatz vs. IP

**Befund F-B4 [Niedrig] — Der dritte Slider hat drei Namen.**

| Ort | Name |
|---|---|
| `Webcontent & Value Proposition.md` Z. 14 (Konzept) | "Umsatz/Person" |
| `features.html` Z. 546-549 | "IP / Monat" |
| `index.html` Z. 748-751 Demo | "IP/Monat" mit Wert 200 |
| App-Code `App.tsx` Z. 282-284 | Label aus `product.terminology.volumeUnit` (`IP` fuer LifePlus) |
| App-Code `App.tsx` Z. 282 | "Umsatz / Monat" als Label, gefolgt von Einheit `IP` |

Tatsaechlich konsistent zwischen App-Label und Webseite-Label = "Umsatz/Monat in IP", aber die **Erklaerung** dazu fehlt allen Texten. Ein Sponsor versteht IP, ein Interessent nicht.

Im Konzept fuer Eqology wird das nochmal komplizierter — dort gibt es QV und BV (siehe Eqology-Business-Plan-Review.md). Das macht ein generisches "Umsatz" gerade fuer die Webseite (die nicht produktspezifisch ist) attraktiv.

**Vorschlag:**
- Webseite (alle Texte): "Aktivitaet pro Person (IP)" oder einfach "Aktivitaet/Monat" mit Tooltip-Erklaerung
- App (LifePlus): bleibt "Umsatz / Monat" mit Einheit "IP" (vertraut fuer Sponsoren)
- App (Eqology): "Volumen / Monat" mit Einheit "QV" (oder zweispaltig QV/BV — siehe Eqology-Review)
- Konzeptpapier: gleicher Begriff wie Webseite

**Aufwand:** S. **Risiko:** niedrig.

### 4.5 Hartkodierte Stufen-Bezeichnungen

**Befund F-B5 [Mittel] — Believer→Diamond ist nur fuer LifePlus korrekt.**

`features.html` Z. 680-686 zeigt allen drei Brands die LifePlus-Stufenleiter (Believer, Builder, Bronze, Silver, Gold, Diamond, 1–3* Diamond) und LifePlus-Kennzahlen (AV, QGV, QL).

FitLine und Eqology haben andere Verguetungsplaene mit teils anderen Stufen-Namen und Kennzahlen-Begriffen (z. B. Eqology nutzt "Team Leader", "Director", "Vice President" laut dem Eqology-Business-Plan; siehe `eqology_business_plan_review.md`).

Aktuelle Loesung: drei Brands bekommen drei verschiedene Farben aber denselben Klartext.

**Vorschlag:** In `brands.json` eine `ranks`-Struktur einfuehren:

```json
{
  "lifeplus": {
    "ranks": [
      { "name": "Believer", "year": "J1", "av": 40, "qgv": 500, "ql": 3 },
      { "name": "Builder",  "year": "J2", "av": 40, "qgv": 1500, "ql": 3 },
      ...
    ],
    "kpiLabels": { "av": "AV", "qgv": "QGV", "ql": "QL" }
  },
  "eqology": {
    "ranks": [
      { "name": "Team Leader", "year": "J1", "qv": 1000 },
      { "name": "Senior TL",   "year": "J2", "qv": 3000 },
      ...
    ],
    "kpiLabels": { "qv": "QV", "bv": "BV", "ql": "qualifizierte Beine" }
  }
}
```

Templates ersetzen Hartkodierungen durch Variablen.

**Aufwand:** M (Schema-Erweiterung + Refactoring von features.html). **Risiko:** mittel (mehr Pflege-Stellen pro Brand-Onboarding, dafuer Brand-Glaubwuerdigkeit).

### 4.6 Brand-Tonalitaet

**Befund F-B6 [Mittel] — Brands sind farblich differenziert, inhaltlich Klone.**

Aus `brands.json` (zitiert in Webcontent.md Z. 290+):

| Feld | LifePlus | FitLine | Eqology |
|---|---|---|---|
| claim | "Sieh deinen Verguetungsplan, bevor du planst." | identisch | identisch |
| subClaim | "...dein LifePlus-Netzwerk..." | nur Produktname getauscht | nur Produktname getauscht |
| taglineDe | "BESSER VERSTEHEN. STAERKER WACHSEN." | identisch | identisch |
| accentColor | gruen | rot | dunkelblau |

Memory-Hinweis `project_brand_separation`: "jede Brand mit eigener DB, eigener Rechnung, kein Cross-Brand-Bundle" — die getrennten Identitaeten gelten aktuell vor allem Backend, **nicht Content**.

**Konzept-Empfehlung (Webcontent.md, Option C):** gemeinsamer Kern + Brand-Akzente. Hero, Use Cases bleiben textgleich; Eyebrows, Beispielszenarien, FAQ-Antworten kommen aus `brands.json` und sind pro Brand spezifisch.

**Hinweis:** Die Brand-Tonalitaet-Frage ist im Konzept als "offene Entscheidung E-7" markiert (Webcontent.md Z. 540-545). Bis Entscheidung getroffen ist, sollten zumindest die brand-spezifischen Beispiel-Stufen aus F-B5 angegangen werden.

**Aufwand:** abhaengig von Entscheidung. **Risiko:** mittel.

### 4.7 Pricing-Seite — keine Free-Karte

**Befund F-B7 [Kritisch] — Pricing-Seite zeigt keine Free-Option, obwohl Freemium-Konzept das verlangt.**

Status laut IST-Analyse (Webcontent.md F-08):
- 2 Pricing-Karten: Monatlich €19, Jaehrlich €15/Monat
- FAQ erwaehnt "reduzierte Demo-Version" beilaeufig
- Keine Free-Karte im Grid

Freemium-Modell.md Abschnitt 11 verlangt:
- 14,95 EUR/Monat monatlich
- 74,75 EUR fuer 6 Monate (1 Monat gratis)
- 149,50 EUR fuer 1 Jahr (2 Monate gratis)
- alles zzgl. MwSt
- 14-Tage-Trial (kostenlos, ohne Zahlungsdaten)
- Founder-Discount 30 % public, 35-40 % via Codes (lifelong)
- Pro-rata Kuendigung mit Restmonate-Erstattung

Aktuelle Webseite zeigt davon nichts.

**Lueckenliste:**

| Konzept-Anforderung | Webseite IST | Diff |
|---|---|---|
| 3 Pricing-Stufen (1M/6M/12M) | 2 Stufen (Monatlich/Jaehrlich) | ❌ |
| Preise (14,95 / 74,75 / 149,50 EUR) | 19 / 15 EUR/Mon | ❌ |
| Free-Karte (Trial-Hook) | nicht im Grid | ❌ |
| MwSt-Hinweis | unbekannt | ❓ |
| Founder-Discount kommuniziert | unbekannt | ❓ |
| Pro-rata Kuendigung "Kein Risiko"-Botschaft | unbekannt | ❓ |
| 14-Tage-Trial mit Magic-Link-Onboarding | unbekannt | ❓ |
| "Kein Passwort"-Erklaerung | unbekannt | ❓ |

**Vorschlag:** Pricing-Seite komplett refactoren:

```
            ┌──────────────────────────────────────────────────┐
            │   Pricing-Grid (3 Spalten)                       │
            └──────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼────────────────────┐
        ▼                     ▼                    ▼
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │   FREE   │         │  PRO     │         │  PRO     │
   │          │         │ MONATLICH│         │ JAEHRLICH│
   │ 14 Tage  │         │ 14,95 €  │         │ 149,50 € │
   │  Trial   │         │ zzgl.MwSt│         │ zzgl.MwSt│
   │          │         │          │         │          │
   │ kostenlos│         │ jederzeit│         │ 2 Monate │
   │          │         │ kuendbar │         │ gratis   │
   │          │         │          │         │          │
   │ → Trial  │         │ → Kaufen │         │ → Kaufen │
   │  starten │         │          │         │ (empfohl.)│
   └──────────┘         └──────────┘         └──────────┘

              ┌──────────────────────────────────────┐
              │ Vertrauenshinweise direkt darunter:  │
              │ ✓ Kein Passwort (Magic-Link)         │
              │ ✓ Kein Risiko (Restmonate-Refund)    │
              │ ✓ Keine Verdienstgarantie            │
              └──────────────────────────────────────┘
```

Plus separater 6-Monats-Tarif (74,75 EUR) als Tab oder Slider — oder ganz weglassen wenn Komplexitaet stoert (Codex-Notiz im Konzept favorisiert 3 Optionen statt 4).

Founder-Discount-Banner oben drueber: "Founder-Phase: 30 % Lifetime-Discount bis [STICHTAG]." Code-Eingabefeld im Checkout.

**Aufwand:** L (komplettes Pricing-Refactor inkl. Vergleichstabelle, FAQ, ggf. App-Logik). **Risiko:** mittel.

### 4.8 "Was ist es nicht?"-Disclaimer-Block fehlt

**Befund F-B8 [Hoch] — Anti-Versprechen-Block fehlt sichtbar.**

Konzept Webcontent.md fordert (in "5 inhaltliche Luecken"):
- Block "Was der Simulator nicht ist": keine Garantie, kein Hype, keine Investmentempfehlung.

Aktuell auf der Webseite: nicht vorhanden (laut IST-Analyse).

In Kombination mit den Verkaufsversprechen (F-B2) entsteht ein doppeltes Lese-Erlebnis: oben Vollzeit-Einkommen-Verheissung, kein Klartext zur Einordnung. Ein expliziter "Was es nicht ist"-Block ist deshalb nicht nur Disclaimer, sondern Vertrauensaufbau.

**Vorschlag-Block:**

> **Was der Simulator nicht ist:**
> Er ist keine Verdienstprognose. Er garantiert nichts. Er ersetzt keinen Steuerberater und keine Investmententscheidung.
>
> Er ist ein Rechen-Werkzeug. Er nimmt deine Annahmen — und zeigt dir, was daraus mathematisch entsteht. Aenderst du die Annahmen, aendert sich das Bild. Das ist die ganze Idee.

**Aufwand:** S (neuer Block auf Startseite). **Risiko:** niedrig.

### 4.9 "Wer steckt dahinter?"-Block fehlt

**Befund F-B9 [Mittel] — Kein Ueber-uns / Sponsor-Profil sichtbar.**

Konzept (Webcontent.md "5 inhaltliche Luecken") nennt das. Im MLM-Umfeld, wo Tools schnell als Scam markiert werden, ist Transparenz ueber den Betreiber ein direkter Conversion-Hebel.

**Vorschlag:** Mini-Block auf der Startseite ("Wer baut das?"), mit Foto/Name und 2-3 Saetzen Hintergrund. Plus Impressum-Link prominent platziert.

**Aufwand:** S. **Risiko:** keiner. Sollte aber inhaltlich abgestimmt werden.

---

## 5. Achse C — Rechtsdokumente vs. App-Code+Konzept

**Hinweis:** Da der Wortlaut von AGB/Widerruf/Impressum/Datenschutz dieser Session nicht vorliegt, listet dieser Abschnitt was die Dokumente enthalten **muessen** (abgeleitet aus App-Realitaet und Konzept). Sobald die Wortlaute vorliegen, kann ein konkretes Diff-Review folgen.

### 5.1 Impressum

**Aus App und Konzept abgeleitete Pflichtinhalte:**

Was rein muss (TMG § 5 / DDG § 5):
- Name und Anschrift des Betreibers
- Vertretungsberechtigte Person
- Kontakt: E-Mail-Adresse (mind.), Telefonnummer optional aber empfehlenswert
- Handelsregister, USt-IdNr, Wirtschafts-ID falls anwendbar
- Hinweis auf Paddle als Merchant of Record (Reseller-Verhaeltnis offenlegen — wichtig fuer EU-VAT-Transparenz)
- Bei kammerpflichtigen Berufen: Berufsbezeichnung, Verleihungsstaat, Aufsichtsbehoerde — fuer ein Software-Tool nicht relevant, aber pruefen

Was rein muss (MStV § 18 Abs. 2):
- Bei journalistisch-redaktionellen Inhalten: Verantwortlicher mit Name + Adresse
- Wenn die Webseite nur Produktinformation ist (kein Blog, kein redaktioneller Content): nicht relevant

**Befunde fuer Impressum (Hypothesen, weil Wortlaut fehlt):**

| Pruefpunkt | Ist-Status | Soll |
|---|---|---|
| Vollstaendige Anschrift | ❓ | Pflicht |
| E-Mail-Kontakt | ❓ | Pflicht |
| Vertretungsberechtigter | ❓ | Pflicht bei Unternehmen |
| Paddle-MoR-Hinweis | ❓ | Empfohlen — "Paddle.com Market Ltd. wickelt als Verkaeufer und Rechnungssteller die Zahlungen ab. Vertragspartner fuer den Kauf ist Paddle, fuer die Dienstleistung sind wir." |
| OS-Plattform-Hinweis (Online-Streitbeilegung, EU-Verordnung) | ❓ | Pflicht: Link zu https://ec.europa.eu/consumers/odr/ + eigene E-Mail-Adresse |
| Hinweis VSBG (Verbraucher-Schlichtung) | ❓ | Pflicht: Erklaerung "Wir nehmen [nicht] an Schlichtungsverfahren vor einer Verbraucherschlichtungsstelle teil." |
| USt-IdNr | ❓ | Pflicht bei B2B-Tax-Verkaeufen, sonst empfohlen |

**Empfehlung:** Wortlaut Impressum hochladen, dann konkretes Diff.

### 5.2 Datenschutz

**Aus App und Konzept abgeleitete Pflichtinhalte (DSGVO + TTDSG):**

Verarbeitungstaetigkeiten der App, die im Datenschutz beschrieben sein muessen:

| Verarbeitung | Rechtsgrundlage | Im Datenschutz behandelt? |
|---|---|---|
| E-Mail bei Magic-Link-Login | Art. 6 Abs. 1 lit. b DSGVO (Vertrag) | ❓ |
| E-Mail-Versand fuer Magic-Link (transactional) | Art. 6 Abs. 1 lit. b DSGVO | ❓ |
| Device-Tracking (Device-ID, Limit 3) | Art. 6 Abs. 1 lit. b DSGVO + Art. 6 Abs. 1 lit. f (Schutz Konto) | ❓ |
| Zahlungsabwicklung via Paddle | Art. 6 Abs. 1 lit. b DSGVO; Paddle als Verarbeiter | ❓ |
| Entitlements/Subscriptions in eigener DB | Art. 6 Abs. 1 lit. b DSGVO | ❓ |
| `localStorage` fuer Slider-Werte | TTDSG § 25 Abs. 2 Nr. 2 (technisch erforderlich) | ❓ |
| Service Worker / PWA | TTDSG § 25 Abs. 2 Nr. 2 | ❓ |
| Trial-Tracking (`trial_used`, `trial_started_at`) | Art. 6 Abs. 1 lit. b + lit. f | ❓ |
| Promo-Code-Einloesung | Art. 6 Abs. 1 lit. b DSGVO | ❓ |
| Founder-Status | Art. 6 Abs. 1 lit. b DSGVO | ❓ |
| **Optional:** Tracking / Analytics | Art. 6 Abs. 1 lit. a (Einwilligung) | ❓ — wenn vorhanden, muss Cookie-Banner-Mechanik beschrieben sein |

**Befund F-C1 [Hoch — falls relevant] — Magic-Link-Login muss spezifisch im Datenschutz erklaert werden.**

Das Magic-Link-Login ist nicht die uebliche Email+Password-Variante. Das hat Konsequenzen fuer den Datenschutz-Text:
- E-Mail-Adresse ist das einzige Identifikationsmerkmal
- Magic-Link wird per E-Mail versendet — Inhalt der E-Mail muss in der Datenschutzerklaerung als "Versand transaktionaler E-Mails" angegeben sein
- Wie lange werden Login-Tokens gespeichert? (Aus Code zu klaeren — Backend nicht eingesehen)
- E-Mail-Provider als Auftragsverarbeiter benennen (z. B. Resend laut Konzept Z. 14.2 in Freemium-Modell)

### 5.3 Device-Tracking

**Befund F-C2 [Hoch — falls nicht beschrieben] — Device-Limit ist eine Verarbeitungstaetigkeit.**

`DeviceLimitGate.tsx` und `auth/api.ts` zeigen: die App verfolgt aktive Geraete pro Konto (Limit 3). Dies bedeutet:
- Eine Device-ID wird pro Login erzeugt und gespeichert
- `lastSeenAt` und `firstSeenAt` werden gespeichert
- Label (Geraet) wird beim Login gesetzt
- Im UI sichtbar: Liste aller eigenen Geraete

Das ist eine personenbezogene Verarbeitung und gehoert in den Datenschutz:
- **Was wird gespeichert?** Device-ID (welcher Art? UUID? Fingerprint? Aus User-Agent?), Last-Seen-Timestamp, Geraete-Label
- **Wie lange?** Bis aktive Abmeldung oder Trial-Ende?
- **Recht des Betroffenen?** Geraet abmelden via UI ist transparent. Loeschung des Kontos?

Empfehlung: Eigener Abschnitt in der Datenschutzerklaerung.

### 5.4 Paddle als Auftragsverarbeiter

**Befund F-C3 [Kritisch — falls nicht beschrieben] — Paddle muss im Datenschutz und im Impressum erscheinen.**

Aus dem `AccountPanel.tsx`:
> "Zahlung, Rechnung und Kuendigung laufen ueber Paddle als Verkaufsabwickler (Merchant of Record)."

Das ist die richtige Information fuer den Endkunden, aber datenschutzrechtlich:
- Paddle.com Market Ltd. (UK) ist **Drittlanduebertragung** seit Brexit — Adequacy-Decision der EU-Kommission besteht, aber muss im Datenschutz erklaert werden
- Paddle ist Merchant of Record, das heisst Paddle ist **selbst Verantwortlicher** fuer die Zahlungsabwicklung — gemeinsame Verantwortlichkeit (Art. 26 DSGVO) klaeren
- Daten die geteilt werden: E-Mail, Zahlungsdaten, Land, Betrag, Subscription-Status

**Pflichtangaben im Datenschutz:**
- Name und Anschrift Paddle
- Zweck der Datenuebermittlung
- Rechtsgrundlage (Art. 6 Abs. 1 lit. b)
- Drittlandbezug + Schutzgrundlage (Adequacy-Decision UK)
- Speicherdauer
- Recht auf Auskunft auch gegenueber Paddle

### 5.5 AGB

**Aus App und Konzept abgeleitete Pflichtinhalte:**

Was rein muss bei einem SaaS-Abo:
1. **Vertragsschluss-Mechanik**: Bestellvorgang, Button-Loesung ("zahlungspflichtig bestellen"), Bestaetigungsmail
2. **Leistungsbeschreibung**: Was ist im Abo enthalten? Inkl. Fortlaufender Aenderungsmoeglichkeit
3. **Preise und Zahlung**: Preisangaben inkl./excl. MwSt klaren, Faelligkeit, Zahlungsmittel (via Paddle)
4. **Vertragslaufzeit & Kuendigung**: Konzeptanforderung pro-rata Kuendigung mit Restmonate-Refund
5. **Trial-Bedingungen**: 14 Tage Trial, automatischer Wechsel auf Free nach Trial-Ende
6. **Founder-Discount-Bedingungen**: Lifetime-Discount; verfaellt bei Kuendigung; einmalig pro Brand
7. **Verfuegbarkeit & SLA**: Was wird garantiert? (Eher zurueckhaltend formulieren)
8. **Haftungsbeschraenkung**: Insbesondere wichtig wegen Verdienstprognosen
9. **Earnings Disclaimer**: "Simulationsergebnisse sind keine Verdienstgarantie..." — sollte hier *zusaetzlich* zur Webseite verankert sein
10. **Aenderungen der Bedingungen**: Wie werden AGB-Aenderungen kommuniziert?
11. **Anwendbares Recht & Gerichtsstand**: DE-Recht, Gerichtsstand falls Unternehmen
12. **Streitbeilegung VSBG/OS-Plattform**: Hinweis muss in AGB oder Impressum stehen

**Befund F-C4 [Kritisch — falls AGB-Seite nicht existiert] — App-Footer hat keinen AGB-Link.**

Aus `App.tsx`-Footer-Code:
```tsx
<a href={`${product.siteUrl}impressum.html`}>Impressum</a>
<a href={`${product.siteUrl}datenschutz.html`}>Datenschutz</a>
```

**Es fehlt:**
- Kein Link zu `agb.html` / `nutzungsbedingungen.html`
- Kein Link zu `widerruf.html` (siehe 5.6)

Falls AGB-Seite ueberhaupt existiert, muss sie hier verlinkt werden. Falls nicht: Pflicht beim Abo-Verkauf.

**Vorschlag App.tsx:**
```tsx
<a href={`${product.siteUrl}agb.html`}>AGB</a>
<a href={`${product.siteUrl}widerruf.html`}>Widerruf</a>
<a href={`${product.siteUrl}impressum.html`}>Impressum</a>
<a href={`${product.siteUrl}datenschutz.html`}>Datenschutz</a>
<a href={product.siteUrl}>Zur Webseite</a>
```

**Aufwand:** S (App-Code) + L (AGB-Seite-Inhalte, juristische Pruefung). **Risiko:** hoch falls weggelassen.

### 5.6 Widerrufsrecht

**Befund F-C5 [Kritisch — falls nicht ordnungsgemaess umgesetzt] — Widerrufsbelehrung fuer Fernabsatz fehlt.**

Bei einem Abo, das ueber das Internet abgeschlossen wird, gilt **§ 312g BGB** (Verbraucherwiderrufsrecht im Fernabsatz):
- Verbraucher darf binnen 14 Tagen widerrufen
- Bei digitalen Inhalten/Dienstleistungen: Widerrufsrecht kann erloeschen, wenn:
  - Verbraucher ausdruecklich zugestimmt hat, dass die Leistung vor Ablauf der Widerrufsfrist beginnt
  - Verbraucher seine Kenntnis erklaert hat, dass durch diese Zustimmung das Widerrufsrecht verloren geht

Konkret fuer den Simulator:
- Bei Sofort-Aktivierung des Abos muss die Doppelzustimmung eingeholt werden — sonst bleibt das Widerrufsrecht bestehen
- Widerrufsbelehrung muss in Textform vorliegen (PDF in der Bestaetigungsmail, oder im Account-Portal)
- Muster-Widerrufsformular muss zur Verfuegung stehen

**Befund F-C6 [Wichtig fuer Marketing] — Pro-rata Refund ist KEIN Widerruf.**

Wichtige Klarstellung, weil das im Freemium-Modell.md auch fast vermischt wird:
- **Widerruf** (14 Tage, gesetzlich, voller Refund): erste 14 Tage nach Vertragsschluss, falls nicht durch Doppelzustimmung erloschen
- **Kulante Kuendigung** (pro-rata Restmonate, vertraglich, kein Refund laufender Monat): nach den 14 Tagen, jederzeit

Diese beiden Mechaniken muessen in AGB UND auf der Pricing-Seite **getrennt** kommuniziert werden. Sonst entsteht Verwirrung — und schlimmer: Kunden koennten den "Kein Risiko"-Claim als Widerruf-Aequivalent verstehen, was rechtlich verkuerzt waere.

**Vorschlag Pricing-Seite-Text:**
> **Kein Risiko.** Du hast 14 Tage gesetzliches Widerrufsrecht. Danach kannst du jederzeit zum Monatsende kuendigen — bei Jahresabos erstatten wir dir die nicht genutzten vollen Monate.

### 5.7 Earnings Disclaimer

**Befund F-C7 [Kritisch in MLM-Umfeld] — Earnings Disclaimer fehlt vermutlich oder ist unzureichend.**

Im MLM/Vertriebssystem-Umfeld ist ein expliziter Earnings Disclaimer Standard und juristisch wichtig. Aus den Webseiten-Verkaufsversprechen (F-B2) ergibt sich erhoehte Notwendigkeit.

**Vorschlag Disclaimer-Wortlaut (Vorlage):**
> Die im Simulator und auf dieser Webseite gezeigten Werte sind rechnerische Schaetzungen auf Basis der eingegebenen Annahmen und des hinterlegten Verguetungsplans. Sie stellen keine Prognose, kein Verkaufsversprechen und keine Verdienstgarantie dar.
>
> Tatsaechliche Provisionen haengen von einer Vielzahl Faktoren ab, die ausserhalb des Simulators liegen: persoenliche Aktivitaet, Marktumfeld, Verguetungsplan-Aenderungen, Steuern, individuelle Kosten. Wir uebernehmen keine Verantwortung fuer Entscheidungen, die ausschliesslich auf Simulationsergebnissen basieren.
>
> Diese App ist ein Rechenwerkzeug, kein Investment-Berater. Bei wirtschaftlichen Entscheidungen empfehlen wir, vorab unabhaengige Beratung einzuholen.

**Wo platzieren:**
1. In den AGB als eigener Abschnitt
2. Auf der Pricing-Seite als sichtbarer Hinweis (kein dezenter Footer)
3. Optional im App-Footer prominenter als bisher
4. In Founder-Discount-Material falls dort konkrete Beispielzahlen genannt werden

### 5.8 Brand-Trennung in Rechtsdokumenten

**Befund F-C8 [Mittel] — Drei Brands brauchen drei separate AGB/Datenschutz/Impressum.**

Memory-Hinweis und Freemium-Modell.md Abschnitt 15 verlangen Brand-Trennung. Konsequenz: pro Brand eigene Rechtsdokumente, weil:
- Wenn ein User in FitFlow360 Founder-Discount hat, gilt das nicht in EqoFlow360
- Wenn ein FitFlow360-User refundet, betrifft das nicht das Eqology-Abo
- Steuerlich getrennte Rechnungen ueber Paddle
- Eigene Domains, eigene Cookies

Pruefen:
- Hat jede Brand eigene AGB-/Datenschutz-/Impressum-Seiten?
- Werden Cross-Brand-Hinweise korrekt formuliert?
- Datenschutz: Ist klar, dass FitFlow- und EqoFlow-Daten in getrennten DBs liegen?

### 5.9 Cookie-Consent / TTDSG

**Befund F-C9 [Mittel — abhaengig von tatsaechlichem Tracking] — Cookie-Banner-Strategie unklar.**

Die App nutzt `localStorage` fuer Slider-Werte (technisch erforderlich, kein Consent notwendig). Aber:
- Werden auf der Webseite (nicht App!) Tracker/Analytics geladen? (z. B. fuer Conversion-Tracking)
- Wird Paddle-Checkout per JS eingebunden — und setzt Paddle Cookies?
- Service Worker / PWA — technisch erforderlich

**Falls Tracker:** Consent-Banner mit Reject-All/Accept-All / Settings, dokumentiert nach TTDSG. Nutzt der Code aktuell sowas? Im App-Code ist nichts dergleichen sichtbar — auf der Webseite muss geprueft werden.

### 5.10 Zusammenfassung Rechtsdokumente

**Was brauche ich, um konkret zu reviewen:**

1. Wortlaut von `impressum.html` pro Brand (drei Varianten)
2. Wortlaut von `datenschutz.html` pro Brand
3. Pruefen ob `agb.html` / `widerruf.html` existiert; falls ja: Wortlaut
4. Information zum Backend: was wird in DB gespeichert (Devices, Trials, Promo, Entitlements), wie lange
5. Information ob Cookie-/Tracking-Tools auf der Webseite genutzt werden

Mit diesen Informationen kann ich ein konkretes Diff-Review erstellen. Aktuell sind die obigen Befunde F-C1 bis F-C9 **Pruefpunkte** fuer den Code-bezogenen Soll-Zustand, keine konkreten "die Seite hat X falsch"-Befunde.

---

## 6. Achse D — Webseite vs. Freemium-Konzept

Diese Achse aggregiert die Konzept-Anforderungen aus `Freemium-Modell.md` und `Freemium-Modell_Applikation.md` und prueft, wo die Webseite die Marketing-Botschaften der zwei Konzepte transportiert.

### 6.1 14-Tage-Trial mit Magic-Link

**Befund F-D1 [Hoch] — Trial-Mechanik ist auf der Pricing-Seite nicht beworben (laut IST).**

Konzept fordert:
- Neuer Account erhaelt 14 Tage Pro-Trial
- Keine Zahlungsdaten erforderlich
- Magic-Link statt Passwort
- Auto-Downgrade auf Free nach Trial-Ende

Aktuell (laut IST): nicht prominent auf der Webseite.

**Vorschlag:** Trial als zentrale "Free"-Karte auf der Pricing-Seite (siehe F-B7), plus eine eigene Erklaerstelle auf der Startseite ("So einfach starten: E-Mail eingeben → Link in Mailbox → 14 Tage voller Zugang"). Konzept-Wording (Abschnitt 3) bereits formuliert:

> **Kein Passwort noetig.** Wir senden dir einen sicheren Link an deine E-Mail-Adresse. Mit einem Klick bist du angemeldet - ohne Passwort, das du dir merken oder zuruecksetzen musst.

**Aufwand:** S (Wording uebernehmen). **Risiko:** keiner.

### 6.2 Founder-Discount-Kommunikation

**Befund F-D2 [Hoch] — Founder-Programm fehlt komplett auf der Webseite.**

Konzept (Freemium-Modell.md Abschnitt 12) verlangt:
- 30 % Lifetime-Discount fuer alle, die bis Stichtag bezahlt abschliessen
- 35–40 % via Founder-Codes (Events/Empfehlungen)
- Datums-basiert, transparent kommuniziert
- "Founder"-Status sichtbar auf Account-Seite als Identitaets-Asset

Aktuell auf Webseite: nicht erwaehnt (laut IST).

**Vorschlag:**
1. Founder-Banner auf der Pricing-Seite oben: "Founder-Phase laeuft bis [STICHTAG]. 30 % Rabatt lifetime."
2. Eigene Erklaerseite (oder Section): "Was bedeutet Founder?"
3. Code-Eingabefeld im Checkout, sichtbar
4. Im App-Account-Panel: Founder-Badge wenn Status = founder

**Hinweis:** Codex- und Claude-Anmerkungen in `Freemium-Modell.md` (Abschnitt 12) raten dringend, das Stichtag-Datum vorher festzulegen — Empfehlung 6 Monate nach Public-Launch. Ohne Datum kann das nicht auf die Seite.

**Offene Frage E-1:** Wann ist Public Launch? Wann Founder-Stichtag?

### 6.3 Pro-rata Kuendigung

**Befund F-D3 [Hoch] — Kulante Kuendigungs-Policy fehlt auf der Webseite.**

Konzept Abschnitt 11 verlangt: pro-rata Erstattung der Restmonate bei Jahresabo. Kommunikation soll prominent auf Pricing-Seite stehen ("Kein Risiko").

Aktuell auf Webseite: nicht erwaehnt (laut IST).

**Vorschlag:** Vertrauenshinweis-Block auf Pricing-Seite (s. F-B7-Skizze).

### 6.4 Freemium-Capability-Schicht in der App

**Befund F-D4 [Kritisch] — Capability-Schicht ist im Code noch nicht implementiert.**

Freemium-Applikation.md beschreibt:
- `src/features/tiers.ts` (neu)
- `src/features/featureFlags.ts` (neu)
- `src/features/useFeatures.ts` (neu)

Aktueller App-Code: keine dieser Dateien existiert in `simulator-app/src/`. Es gibt:
- `src/auth/useAuth.tsx` mit `AuthStatus`-Union, aber **kein Tier-Konzept**
- `App.tsx` macht keine Capability-Pruefungen — alle Features sind immer aktiv

Konsequenz: Bevor Free auf der Pricing-Seite beworben wird, **muss** die Capability-Schicht in der App stehen, sonst landen Free-User in der vollen Pro-Funktionalitaet.

**Vorschlag-Reihenfolge:**
1. Schritt 1 aus Freemium-Applikation.md Abschnitt 6 implementieren (Foundation)
2. ProvisionChart und HeroNumber als erste Gates (Schritt 2)
3. **Erst dann** Free-Karte auf Pricing-Seite freischalten

Andernfalls: kostenloser Vollzugang fuer alle, Freemium ist Lippenbekenntnis.

**Aufwand:** M (Foundation 1-2 Tage), dann iterativ. **Risiko:** Konzeptbruch wenn Reihenfolge nicht eingehalten wird.

### 6.5 Pricing-Logik divergiert App ↔ Webseite

**Befund F-D5 [Hoch] — Webseite-Preise und Konzept-Preise stimmen nicht ueberein.**

| Quelle | Monatlich | 6 Monate | Jahr |
|---|---:|---:|---:|
| Webseite IST (Webcontent.md F-08) | 19 EUR | — | 15 EUR/Mon = 180 EUR/Jahr |
| Freemium-Modell.md Abschnitt 11 | 14,95 EUR | 74,75 EUR | 149,50 EUR |

Welcher Preis stimmt? Codex hat im Konzept-Dokument (Freemium-Modell.md Abschnitt 11) Anmerkungen zur Staffel hinterlassen — die Diskussion ist im Konzept noch offen. Aber: die **Webseite zeigt schon einen Preis**, der weder der einen noch der anderen Konzeptvariante entspricht.

Das ist ein klares "Webseite hinkt der Strategie hinterher"-Symptom.

**Aktion:** Preisstrategie final entscheiden, dann Webseite **und** Paddle-Konfiguration angleichen.

**Offene Frage E-2:** Welche Preise gelten endgueltig?

### 6.6 Brand-Trennung auf Pricing-Seite

**Befund F-D6 [Mittel] — Falls Pricing-Seite Brand-spezifisch ausgespielt wird, muss das technisch sauber sein.**

Freemium-Modell.md Abschnitt 15: gleiche Mechanik pro Brand, getrennte Accounts.

Konkret zu pruefen:
- Pricing-Seite auf `lifeflow360.app` zeigt LifePlus-Preise
- Pricing-Seite auf `fitflow360.app` zeigt FitLine-Preise (und keine Verwirrung mit "ihr koennt fuer 9,95 zu LifePlus wechseln")
- Founder-Status ist pro Brand getrennt (UI-Hinweis)
- Cross-Brand-Cross-Selling: explizit untersagen oder explizit erklaeren

---

## 7. Priorisierte Massnahmen-Liste

Konsolidierung aller Befunde nach Prioritaet:

### 7.1 Sofort (vor Public-Launch oder vor Marketing-Push)

| Nr. | Befund | Aufwand | Risiko falls ignoriert |
|---|---|---|---|
| 1 | F-B2: Verkaufsversprechen entschaerfen | M | Verbraucherschutz-Risiko |
| 2 | F-C7: Earnings Disclaimer formulieren und einbinden | S | Rechtliches Risiko |
| 3 | F-C4: AGB-Seite anlegen, Footer-Link in App ergaenzen | L | Pflicht beim Abo-Verkauf |
| 4 | F-C5/C6: Widerrufsbelehrung + AGB-Klarstellung Widerruf vs. Refund | M | Rechtliches Risiko |
| 5 | F-B7: Pricing-Seite mit 3 Spalten (Free/Pro-Mo/Pro-Jahr) | L | Conversion blockiert |
| 6 | F-D4: Capability-Schicht in App implementieren | M | Freemium-Versprechen ohne Substanz |
| 7 | F-D5: Preisentscheidung final, dann Webseite + Paddle angleichen | S (Entscheidung) + M (Umsetzung) | Inkonsistenz Webseite/Backend |

### 7.2 Bald (vor erstem Marketing-Sprint)

| Nr. | Befund | Aufwand |
|---|---|---|
| 8 | F-B1: Hero-Wording auf Konzept-Text wechseln | S |
| 9 | F-B3: Block "Zwei Situationen, ein Werkzeug" einfuegen | M |
| 10 | F-B8: "Was es nicht ist"-Block einfuegen | S |
| 11 | F-A1: 5 fehlende Features auf der Webseite ergaenzen | L |
| 12 | F-A2: Pitch-Modus zurueckstufen | M |
| 13 | F-D1: Trial-Mechanik prominent auf Pricing-Seite | S |
| 14 | F-D2: Founder-Programm kommunizieren (sobald Stichtag steht) | M |
| 15 | F-D3: "Kein Risiko"-Hinweis fuer Kuendigung | S |

### 7.3 Mittelfristig (Brand-Pflege, Wartbarkeit)

| Nr. | Befund | Aufwand |
|---|---|---|
| 16 | F-B5: Stufen-Vokabular brandspezifisch aus `brands.json` | M |
| 17 | F-B6: Brand-Tonalitaet (Option C aus Webcontent.md) | abhaengig |
| 18 | F-B9: "Wer steckt dahinter?"-Block | S |
| 19 | F-C8: Rechtsdokumente pro Brand pruefen | M |
| 20 | F-A4: AGB/Widerruf-Links im App-Footer ergaenzen (technisch) | S |

### 7.4 Niedrige Prioritaet / Kosmetik

| Nr. | Befund | Aufwand |
|---|---|---|
| 21 | F-B4: IP vs. Umsatz vereinheitlichen | S |
| 22 | F-A3: URL-Sharing-Versprechen pruefen | S (Verifizieren) |
| 23 | F-C9: Cookie-Banner-Strategie auditieren | M |

---

## 8. Offene Entscheidungen, die geklaert werden muessen

Bevor Umsetzung beginnt, sollten diese Punkte beantwortet werden:

- **E-1:** Wann ist Public-Launch-Datum? Wann Founder-Stichtag?
- **E-2:** Welche Preise gelten final? (14,95 oder 19 EUR/Mon? Die Staffel-Logik im Konzept ist auch noch offen.)
- **E-3:** Existieren AGB- und Widerruf-Seiten bereits, oder muessen sie neu erstellt werden?
- **E-4:** Sind die im Konzept genannten Features 3 Simulationsmodelle, Ziele-Leiter, Visualisierungen **wirklich** alle final (= so wie im Code) — oder gibt es Roadmap-Items, die noch fehlen?
- **E-5:** Existiert der "Pitch-Modus" als eigenes Feature im Code (das ich uebersehen habe), oder ist das ein Webseiten-Wording fuer "App mit Kunden bedienen"?
- **E-6:** Existiert URL-Sharing fuer Szenarien — und wenn ja, wie funktioniert es technisch?
- **E-7:** Brand-Tonalitaet (Webcontent.md Abschnitt E-7): Klon, Akzent oder eigene Identitaet?
- **E-8:** Stichtag fuer Founder-Phase festlegen (Empfehlung 6 Monate nach Public-Launch).
- **E-9:** Welche Cookies/Tracker laufen heute tatsaechlich auf der Webseite — gibt es ein Consent-Banner?
- **E-10:** Backend-Frage: Wie lange werden Magic-Link-Tokens gespeichert? Wann werden Devices automatisch entfernt? Wie lange Promo-Codes/Trial-Flags?

---

## 9. Anhang: Datenquellen-Liste

Was beim Erstellen dieses Reviews **direkt eingesehen** wurde:

- `_doc/Freemium-Modell.md`
- `_doc/Freemium-Modell_Applikation.md`
- `_doc/Webcontent & Value Proposition.md` (enthaelt detaillierte IST-Analyse der Templates Stand 2026-05-22)
- `simulator-app/.env.{lifeplus,fitline,eqology}`
- `simulator-app/index.html`, `package.json`, `postcss.config.js`, `tailwind.config.js`, `vite.config.ts`
- `simulator-app/public/{robots.txt, .htaccess, ai.txt, llms.txt, favicon.svg}`
- `simulator-app/src/App.tsx`
- `simulator-app/src/auth/{api.ts, useAuth.tsx}`
- `simulator-app/src/components/*` (alle Komponenten inkl. Lineage, Person-Tree, Network)
- `simulator-app/src/{index.css, main.tsx, pwaUpdates.ts, vite-env.d.ts}`
- `eqology_business_plan_review.md` (fuer Querverweise zu Eqology-spezifischer Terminologie)
- `14_logo_katalog.html` (fuer Brand-Kontext)

Was **nicht direkt** eingesehen wurde (und worauf das Review entsprechend qualifiziert ist):

- Wortlaut von `website/templates/{index, features, pricing, impressum, datenschutz, agb, widerruf}.html`
- Backend-Code (`functions/`, API-Logik, DB-Schema)
- Live-Webseite `lifeflow360.app` (Bot-Blockade aktiv — konsistent mit `.htaccess`-Vorab-Sperre)
- Paddle-Konfiguration (Produkte, Preise, Discount-Codes)

---

## 10. Empfehlung zur naechsten Iteration

Wenn dieses Review umgesetzt werden soll, schlage ich folgende Reihenfolge vor:

1. **Entscheidungen E-1 bis E-10 beantworten** (Workshop, kein technischer Aufwand).
2. **Wortlaut der Rechtsdokumente** an mich zurueckspielen → konkretes Diff-Review der Achse C.
3. **Sofort-Massnahmen 1-7 (Abschnitt 7.1)** umsetzen — diese sind unabhaengig voneinander und parallelisierbar.
4. **Capability-Schicht in der App** (F-D4) implementieren — beginnt das Freemium-Versprechen real einzuloesen.
5. **Webseite mit dem aktuellen Code synchronisieren** (F-A1, F-A2) — sobald Feature-Realitaet (E-4) geklaert ist.
6. **Brand-Tonalitaet** entscheiden und ausrollen (F-B5, F-B6).

Wenn nur eines auf der Liste umgesetzt wird, dann F-B2 (Verkaufsversprechen entschaerfen). Das ist der einzige Punkt, dessen Risiko nicht durch Marketing kompensiert werden kann.

---

*Ende Review v1. Naechstes Review nach Klaerung der offenen Entscheidungen oder bei Bereitstellung der noch fehlenden Quellen (Rechtsdokumente, Backend, Paddle-Konfiguration).*