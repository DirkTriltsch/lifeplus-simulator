# Netzwerkwachstum Umsetzung - Bericht und Review-Aufstellung

**Datum:** 2026-06-05  
**Zweck:** Vollstaendige, review-taugliche Aufstellung der bisherigen Taetigkeiten, Ergebnisse, geaenderten Dateien, offenen Risiken und moeglichen Altlasten nach der grundlegenden Ueberarbeitung des Wachstums-/Verguetungsmodells.

## 1. Kurzfazit

Die Wachstumsmodellierung wurde fachlich und technisch deutlich umgebaut.

Die wichtigste Architekturentscheidung ist jetzt umgesetzt:

1. Ein schneller Aggregatpfad liefert live waehrend Sliderbewegungen Wachstum, Netzwerkvolumen, Provision als Projektion und Zielmarker.
2. Ein exakter Personenbaum-/Detailpfad liefert nach kurzer Pause echte Werte fuer Status, Beine, Verguetung, Tabelle und Diagramme.
3. Sobald die Detaildaten verfuegbar sind, schalten Hero-Zahl, Netzwerk-Groesse, Ziele, Chart, Status und Tabelle auf dieselbe echte Detailquelle um.
4. Solange die Detaildaten neu berechnet werden, wird die Tabelle ausgeblendet und durch einen Ladehinweis ersetzt.
5. Der Chart ist in dieser Phase grau markiert; echte Detaildaten werden dunkelgruen dargestellt.

Damit ist die UX nicht mehr an den langsamen Personenbaum gekoppelt, aber die fachlich relevanten Werte werden nachgeliefert.

Wichtig fuer den Review:

- Der Aggregatpfad ist performance-seitig stark.
- Der Aggregatpfad ist fuer Wachstum, Member, Shopper und Volumen belastbar.
- Der Aggregatpfad ist fuer LifePlus-Status, Beine und exakte Provision nicht belastbar genug.
- Die App nutzt deshalb fuer exakte Werte den Personenbaum nach Debounce.
- B2 `shopper-aggregate` ist als naechster Performanceschritt vorbereitet, aber noch nicht implementiert.

## 2. Fachliche Zielaenderung

Die urspruengliche Idee einer einzigen durchgaengigen "Single Source of Truth" wurde aufgeweicht.

Neue Zielarchitektur:

- Live-UX: schnell, aggregiert, responsive.
- Detailwahrheit: Personenbaum, LifePlus-Plan, Status, Beine, Root-Provision.
- Uebergang: UI zeigt klar, wann Werte aggregiert sind und wann sie exakt aktualisiert wurden.

Diese Aenderung ist fachlich begruendet, weil die Benchmarks gezeigt haben:

- Wachstum/Volumen lassen sich aggregiert sehr gut berechnen.
- Phase- und Root-Provision weichen aggregiert strukturell zu stark ab.
- Status wie Diamond oder n*Diamond haengt an Bein-/Statusstruktur und ist nicht robust aus reinen Summen ableitbar.

## 3. Umgesetzte Modellfunktionen

### 3.1 Shopper/Jahr

Der Parameter `shoppersPerYear` ist Bestandteil der Simulator-Inputs.

Fachregeln:

- Jeder Knoten kann pro Jahr Shopper hinzufuegen.
- Slider-/Stepper-Eingaben koennen fractional sein, z.B. 2.5 Shopper/Jahr oder 4.5 Member/Jahr.
- Shopper haben keinen eigenen LifePlus-Status.
- Shopper erzeugen den definierten Mindestumsatz.
- Shopper-Volumen zaehlt zu QGV.
- Shopper-Volumen zaehlt nicht zu AV.
- AV bleibt Eigenverbrauch des Members.
- Wenn ein Member churnt, werden zugehoerige Shopper im Personenbaum an den Parent verschoben.

### 3.2 Member/Jahr als fractional value

Fractional Member-Werte werden nicht auf ganze Personen gerundet, sondern ueber Jahres-/Baumlogik deterministisch verarbeitet. Das ist fuer Sliderwerte wie 2.5 oder 4.5 relevant.

### 3.3 Churn

Churn wird auf Member und Shopper angewandt.

Wichtig:

- Im Aggregatpfad wird Churn summarisch verarbeitet.
- Im Personenbaumpfad wird Churn strukturell sichtbar und beeinflusst Beine, Status und Verguetung.
- Exakte Churn-Folgen fuer Status/Beine kommen daher aus dem Detailpfad.

### 3.4 Cap direkte Member

`maxDirectMembersPerMember` bleibt Teil der Inputs und begrenzt direkte Member.

Der Cap ist wichtig, weil ohne ihn bei hohen Member/Jahr-Werten extrem grosse Baeume entstehen koennen.

## 4. Architektur im aktuellen Code

### 4.1 Simulator-Core

Der Core unterscheidet jetzt explizit Simulationsmodi:

- `standard`: schneller Aggregatpfad.
- `person-tree`: deterministischer Personenbaum.
- `person-tree-random`: Personenbaum mit Dirichlet-Verteilung.
- `person-tree-momentum`: Personenbaum mit Momentum-Verteilung.

Zentrale Datei:

- `packages/simulator-core/src/simulation.ts`

Wesentliche Aenderungen:

- Wechsel von `MonthResult`/`finalMonth` auf `QuarterResult`/`finalQuarter`.
- `SimulationResult` enthaelt `quarters`, `finalQuarter`, `yearEnds`, `yearSummaries`.
- `personYearEnds` und `treeCompensationYearEnds` werden nur im Personenbaum-/Detailpfad geliefert.
- Der alte monatliche Detailpfad wurde durch Jahresenden plus Quartals-Expansion ersetzt.
- `standard` erzeugt schnelle aggregierte Jahresenden.
- Personenbaum-Modi erzeugen echte Personenbaum-Jahresenden und optional LifePlus-Tree-Compensation.

### 4.2 Tree-Generator

Zentrale Datei:

- `packages/simulator-core/src/tree-generator.ts`

Wesentliche Aenderungen:

- Unterstuetzung fuer Jahresend-Snapshots.
- Tree-Growth-Strategien fuer Verteilung auf Beine.
- Fractional Inputs bleiben relevant.
- Personenbaum bleibt Detailquelle fuer Status/Beine/Verguetungsstruktur.

### 4.3 LifePlus-Verguetung

Zentrale Dateien:

- `packages/product-lifeplus/src/tree-compensation.ts`
- `packages/product-lifeplus/src/tree-simulation.ts`
- `packages/product-lifeplus/src/plan.ts`

Aktueller Stand:

- `calculateTreeMonth` im LifePlus-Plan ist die relevante Detailberechnung fuer den Personenbaum.
- `tree-simulation.ts` wurde auf Jahresenden/Quartale umgestellt.
- `runLifeplusTreeSimulation` existiert weiterhin, wird aber im aktuellen Hauptpfad nicht zwingend benoetigt.

Review-Hinweis:

- `packages/product-lifeplus/src/tree-simulation.ts` ist ein moeglicher Altlasten-/Wrapper-Kandidat. Die Hauptintegration laeuft ueber `runSimulation(..., { simulationMode: 'person-tree' })` und `calculateTreeMonth`.

### 4.4 Goals

Zentrale Dateien:

- `packages/simulator-goals/src/contracts.ts`
- `packages/simulator-goals/src/evaluator.ts`
- `packages/simulator-goals/tests/evaluator.test.ts`

Wesentliche Aenderungen:

- Goals wurden von Monatssicht auf Quartalssicht umgestellt.
- `yearlySurplus` beruecksichtigt `periodMonths`.
- `monthlyIncome`, `monthlySurplus` und `productsRefinanced` arbeiten auf `finalQuarter`/`quarters`.
- Zielerreichungen im UI haengen nach Detailrechnung an denselben Detaildaten wie Hero und Chart.

## 5. UX-/App-Umsetzung

Zentrale Dateien:

- `simulator-app/src/App.tsx`
- `simulator-app/src/components/AdvancedSettingsPanel.tsx`
- `simulator-app/src/components/ProvisionChart.tsx`
- `simulator-app/src/components/YearlySummaryTable.tsx`
- `simulator-app/src/components/NetworkVisualizations.tsx`
- `simulator-app/src/components/person-tree/RadialTree.tsx`
- `simulator-app/src/components/person-tree/HorizontalDendrogram.tsx`

### 5.1 Fast Path und Detail Path

In `App.tsx` existieren jetzt zwei Resultate:

- `fastResult`: `runSimulation(..., { simulationMode: 'standard' })`
- `detailResult`: nach Debounce berechneter Personenbaum-/Detailpfad

Der aktive UI-Resultwert ist:

```ts
const result = detailedResult ?? fastResult;
```

Konsequenz:

- Beim Slider-Schieben reagiert der Chart sofort mit Aggregatdaten.
- Die Tabelle wird ausgeblendet.
- Status zeigt "wird berechnet".
- Nach 800 ms Ruhezeit wird der Detailpfad berechnet.
- Danach schalten Hero, Netzwerk-Groesse, Ziele, Chart, Status, Beine und Tabelle auf echte Detaildaten.

### 5.2 Tabelle

Vorher:

- Tabelle blieb sichtbar und zeigte in bestimmten Zustaenden Aggregatdaten.

Jetzt:

- Tabelle ist nur sichtbar, wenn passende Detaildaten zum aktuellen Input-Key vorliegen.
- Beim naechsten Slider-Input wird die Tabelle sofort invalidiert.
- Ein Ladeplaceholder zeigt, dass exakte LifePlus-Daten nachgeliefert werden.

### 5.3 Chart

`ProvisionChart` hat einen Modus:

- `aggregate`: grau
- `detail`: dunkelgruen

Zielmarker nutzen dieselbe Farbe wie die aktive Datenquelle.

Damit ist visuell klar:

- Grau = schnelle Aggregatansicht.
- Dunkelgruen = echte Detaildaten.

### 5.4 Hero-Zahl

Vor Option 3 war die Hero-Zahl weiter an `fastResult` gebunden.

Fehlerbild:

- Tabelle zeigte z.B. 6.924.443 EUR/Monat.
- Hero zeigte weiter 5.840.027 EUR/Monat.

Fix:

- Hero nutzt jetzt `result.finalQuarter.totalEUR`.
- Sobald `detailedResult` verfuegbar ist, kommt die Hero-Zahl aus derselben Detailquelle wie die Tabelle.

## 6. Benchmarks und Ergebnisse

### 6.1 B1-E Performance

B1-E ist bestanden.

Aus dem Benchmark-Delta-Report:

| Set | Strategie | Median | p95 | Bewertung |
|---|---:|---:|---:|---|
| P2 Default realistisch | standard | 0.269 ms | 0.776 ms | Pass |
| P2 Default realistisch | dirichlet | 0.340 ms | 0.794 ms | Pass |
| P2 Default realistisch | momentum | 0.368 ms | 0.639 ms | Pass |
| P4 Mittel aggressiv | standard | 0.245 ms | 0.503 ms | Pass |
| P4 Mittel aggressiv | dirichlet | 0.338 ms | 0.773 ms | Pass |
| P4 Mittel aggressiv | momentum | 0.322 ms | 2.997 ms | Pass |
| P5 Aggressiv | standard | 0.243 ms | 0.377 ms | Pass |
| P5 Aggressiv | dirichlet | 0.333 ms | 0.573 ms | Pass |
| P5 Aggressiv | momentum | 0.311 ms | 0.352 ms | Pass |

Interpretation:

- Der schnelle Aggregatpfad ist fuer Slider-UX sehr gut geeignet.
- Die Performance ist deutlich unter typischen Frame-Budget-Grenzen.
- Die Live-Kurve kann ohne wahrnehmbare Blockade aktualisiert werden.

### 6.2 B1-Q Qualitaet

B1-Q bleibt rot.

Wichtige Erkenntnisse:

- Member-Diff: 0%
- Shopper-Diff: 0%
- Volumen-Diff: 0%
- Root-Provision, Phasen und Status weichen teils stark ab.

Aus dem Delta-Report:

- P2 Jahr 10 Standard verbesserte sich von 503.606% Root-Diff auf 14.643%.
- P1 Jahr 10 verschlechterte sich auf 886.905% Root-Diff.
- P2/P4 Jahr 6 bleiben vor Cap massiv falsch.
- Phase 1 wird oft zu hoch.
- Phase 2/3 werden oft zu spaet, zu niedrig oder gar nicht angesetzt.

Konsequenz:

- Aggregatpfad nicht als exakte Verguetungswahrheit verwenden.
- Status/Beine/Provision im UI nur aus Detailpfad als exakt markieren.
- Fast Path darf als Projektion dienen, muss aber klar gekennzeichnet sein.

### 6.3 B2 Shopper-Aggregation

B2 wurde spezifiziert und als Teststruktur angelegt.

Status:

- B2-C/P/S Teststruktur existiert.
- Edge Cases sind angelegt.
- Viele B2-Tests sind bewusst `skip`, weil `simulationMode: 'shopper-aggregate'` noch nicht im Core existiert.

Folge:

- B2 ist vorbereitet, aber nicht produktiv umgesetzt.
- Das ist der naechste sinnvolle Schritt, wenn der Detailpfad bei hohen Sliderwerten noch zu traege ist.

## 7. Aktuelle Verifikation

### 7.1 Build

Ausgefuehrt:

```powershell
npm run build:lifeplus
```

Ergebnis:

- Build erfolgreich.
- Vite-Hinweis: Bundle/Chunk groesser als 500 kB.
- Kein Build-Fehler.

### 7.2 Relevante Tests

Ausgefuehrt:

```powershell
npm test -- packages/product-lifeplus/tests/engine.test.ts packages/product-lifeplus/tests/tree-simulation.test.ts packages/simulator-goals/tests/evaluator.test.ts tests/integration/person-tree-reality.test.ts
```

Ergebnis:

- 4 Testdateien bestanden.
- 64 Tests bestanden.
- Laufzeit ca. 38.41 Sekunden.

Auffaellig:

- Einige LifePlus-Engine-Tests sind sehr langsam.
- Besonders Fluktuationsfaelle lagen bei ca. 12.5 s und 19.3 s.
- Das bestaetigt, dass der Personenbaum-/Detailpfad fuer Live-Slider ungeeignet ist und asynchron/debounced bleiben muss.

## 8. Geaenderte Dateien laut Git-Status

Hinweis: Der Worktree enthaelt auch Aenderungen, die nicht eindeutig dieser Wachstumsmodell-Arbeit zugeordnet werden koennen. Die folgende Liste ist vollstaendig aus `git status --short` und anschliessend fachlich gruppiert.

### 8.1 Modell-/Simulator-relevant

- `packages/product-lifeplus/src/tree-simulation.ts`
- `packages/product-lifeplus/tests/engine.test.ts`
- `packages/product-lifeplus/tests/profile-sim.test.ts`
- `packages/product-lifeplus/tests/tree-simulation.test.ts`
- `packages/simulator-core/src/simulation.ts`
- `packages/simulator-core/src/tree-generator.ts`
- `packages/simulator-goals/src/contracts.ts`
- `packages/simulator-goals/src/evaluator.ts`
- `packages/simulator-goals/tests/evaluator.test.ts`
- `tests/integration/person-tree-reality.test.ts`

### 8.2 Simulator-App / UX relevant

- `simulator-app/src/App.tsx`
- `simulator-app/src/components/AdvancedSettingsPanel.tsx`
- `simulator-app/src/components/NetworkVisualizations.tsx`
- `simulator-app/src/components/ProvisionChart.tsx`
- `simulator-app/src/components/network/sunburst-node.ts`
- `simulator-app/src/components/network/sunburst-node.test.ts`
- `simulator-app/src/components/person-tree/HorizontalDendrogram.tsx`
- `simulator-app/src/components/person-tree/RadialTree.tsx`

### 8.3 Benchmark-/Review-Artefakte

Neu/untracked:

- `benchmarks/`
- `benchmarks.zip`
- `packages/product-lifeplus/tests/profile-person-tree.codex.tmp.test.ts`

Dateien in `benchmarks/`:

- `benchmarks/b1-aggregate-path/algorithms/aggregate-engine.ts`
- `benchmarks/b1-aggregate-path/b1-engine.test.ts`
- `benchmarks/b1-aggregate-path/b1-quality.test.ts`
- `benchmarks/b1-aggregate-path/parameter-sets.ts`
- `benchmarks/b2-shopper-aggregation/b2-correctness.test.ts`
- `benchmarks/b2-shopper-aggregation/b2-performance.test.ts`
- `benchmarks/b2-shopper-aggregation/b2-scale.test.ts`
- `benchmarks/b2-shopper-aggregation/edge-cases.test.ts`
- `benchmarks/shared/benchmark.ts`
- `benchmarks/shared/benchmark-env.ts`
- `benchmarks/shared/csv-writer.ts`
- `benchmarks/shared/memory-meter.ts`
- `benchmarks/results/2026-06/b1-engine-results.csv`
- `benchmarks/results/2026-06/b1-quality-results.csv`
- `benchmarks/results/2026-06/benchmark-env.csv`
- `benchmarks/results/2026-06/benchmark-report_codex.md`
- `benchmarks/results/2026-06/benchmark-review-und-delta-report.md`

### 8.4 Dokumentation / Konzeptarbeit

Neu/untracked:

- `_doc/growth_models/`
- `_doc/go-live/`
- `_doc/reviews/Legal_Briefing_v1_2026-06-03.md`

Growth-Model-Dateien:

- `_doc/growth_models/dynamik-mit-verguetung.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 01.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 02.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 03.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 05 - Umsetzungsvorschlaege.md`
- `_doc/growth_models/Netzwerkwachstum konzept Erarbeitung 06.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 07 - Performance Cap und UX Strategie.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 08 - Meta Review und Zielarchitektur.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 09 - Zielarchitektur.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 09 - Zielarchitektur_Review.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 10 - Review-Beruecksichtigung und ueberarbeitete Zielarchitektur.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 11 - Benchmark-Spezifikation B1 und B2.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 12 - Benchmark-Spezifikation B1 und B2 ueberarbeitet.md`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 13 - Benchmark-Spezifikation B1 B2 final.md`
- `_doc/growth_models/Basic_model_descriptions.xlsx`
- `_doc/growth_models/Netzwerkwachstum Umsetzung Bericht und Review-Aufstellung.md`

### 8.5 Andere getrackte Aenderungen im Worktree

Diese Dateien sind laut Git dirty, aber fachlich nicht eindeutig Teil der Wachstumsmodell-Umsetzung. Sie sollten separat reviewed werden.

- `package-lock.json`
- `packages/product-eqology/tests/product.test.ts`
- `packages/product-fitline/tests/product.test.ts`
- `tests/contracts/product-pack.test.ts`
- `website-astro/package.json`
- `website-astro/src/brands/eqology/content/pricing.yaml`
- `website-astro/src/brands/fitline/content/pricing.yaml`
- `website-astro/src/brands/lifeplus/content/pricing.yaml`
- `website-astro/src/shared/components/checkout/B2BHeaderBanner.astro`
- `website-astro/src/shared/components/layout/BrandLayout.astro`
- `website-astro/src/shared/components/sections/AccountPageDefault.astro`
- `website-astro/src/shared/components/sections/CheckoutPage.astro`
- `website-astro/src/shared/components/sections/FeaturesPageDefault.astro`
- `website-astro/src/shared/components/sections/IndexPageDefault.astro`
- `website-astro/src/shared/components/sections/LegalAgbDefault.astro`
- `website-astro/src/shared/components/sections/LegalDatenschutzDefault.astro`
- `website-astro/src/shared/components/sections/LegalImpressumDefault.astro`
- `website-astro/src/shared/components/sections/LegalWiderrufDefault.astro`
- `website-astro/src/shared/components/sections/LoginPage.astro`
- `website-astro/src/shared/components/sections/SignupPage.astro`
- `website-astro/src/shared/lib/contact.ts`
- `website-astro/src/shared/scripts/accountPage.ts`
- `website-astro/src/shared/scripts/checkoutInline.ts`
- `website-astro/src/shared/scripts/loginInline.ts`
- `website-astro/src/shared/scripts/signupInline.ts`
- `scripts/deploy-sftp-profile.mjs`

## 9. Alte oder moeglicherweise ueberfluessige Dateien / Strukturen

Diese Liste ist keine Loeschanweisung. Sie ist eine Review-Liste.

### 9.1 `packages/product-lifeplus/src/tree-simulation.ts`

Status:

- Datei existiert weiterhin.
- Sie wurde auf Jahresenden/Quartale migriert.
- Sie wird aktuell hauptsaechlich ueber Tests referenziert.

Bewertung:

- Moeglicher Kandidat fuer Rueckbau oder Umbau zu einem duennen Wrapper.
- Der zentrale Runtime-Pfad ist inzwischen `runSimulation` im Core mit `simulationMode: 'person-tree'`.

Empfehlung:

- Pruefen, ob `runLifeplusTreeSimulation` noch eine eigenstaendige API bleiben soll.
- Wenn nein: Tests auf `runSimulation(..., { simulationMode: 'person-tree' })` migrieren und Datei entfernen.

### 9.2 Historische Konzeptdokumente 01-08

Status:

- Fachlich teilweise ueberholt.
- Fuer Audit/Drift-Nachvollziehbarkeit aber wertvoll.

Bewertung:

- Nicht loeschen, sondern als Historie/Archiv markieren.

Empfehlung:

- Einen finalen Architekturstand als primaeres Dokument definieren.
- Historische Dokumente mit "historisch / nicht mehr massgeblich" kennzeichnen.

### 9.3 `benchmarks.zip`

Status:

- Untracked ZIP im Repo-Root.

Bewertung:

- Wahrscheinlich Review-/Patch-Artefakt.
- Fuer Code-Review nicht sinnvoll als Commitbestandteil.

Empfehlung:

- Nicht committen.
- Entweder entfernen oder ausserhalb des Repos archivieren.

### 9.4 `packages/product-lifeplus/tests/profile-person-tree.codex.tmp.test.ts`

Status:

- Untracked temp/profiling test.

Bewertung:

- Sollte wahrscheinlich nicht committed werden.

Empfehlung:

- Entweder loeschen oder in eine bewusst benannte Benchmark-/Profiling-Datei ueberfuehren.

### 9.5 B2 Shopper-Aggregation Tests

Status:

- Testgeruest existiert.
- Viele Tests sind `skip`, weil der Core-Modus noch fehlt.

Bewertung:

- Nicht ueberfluessig, aber noch nicht produktiv.

Empfehlung:

- Behalten, wenn B2 als naechster Schritt umgesetzt wird.
- Wenn B2 verschoben wird, im Review klar als "Spezifikation/Testgeruest" markieren.

### 9.6 Alte Strategy-Namen `dirichlet`, `momentum`, `lifecycle`

Status:

- UI nutzt neue Werte: `person-tree`, `person-tree-random`, `person-tree-momentum`.
- Persistenz-Migration akzeptiert alte Werte.
- Benchmarks verwenden weiter `standard`, `dirichlet`, `momentum` als Benchmark-Strategien.

Bewertung:

- Keine direkte Altlast, solange Migration und Benchmark-Sprache bewusst getrennt sind.

Empfehlung:

- In UI-/Runtime-Dokumentation nur neue Namen verwenden.
- Alte Namen nur in Migration und Benchmark-Kontext belassen.

## 10. Wichtige offene Risiken

### 10.1 Detailpfad kann bei hohen Werten blockieren

Beispiel aus Nutzerbeobachtung:

- 4.5 Member/Jahr
- 5 Shopper/Jahr
- 30% Fluktuation
- ca. 3.6 Mio Netzwerk-Groesse in Jahr 10 in Detaildaten

Risiko:

- Detailberechnung kann UI spuerbar blockieren, wenn sie synchron im Main Thread laeuft.

Aktuelle Absicherung:

- Debounce.
- Tabelle wird erst nachgeliefert.
- Live-Chart bleibt aggregiert.

Noch nicht geloest:

- Web Worker / abbrechbare Detailjobs.
- Hard Cap fuer Detailpfad.
- B2 Shopper-Aggregation zur Reduktion expliziter Knoten.

### 10.2 Aggregat-Provision ist nicht exakt

Risiko:

- Wenn Aggregat-Provision als Wahrheit verkauft wird, entstehen falsche Erwartungen.

Aktuelle Absicherung:

- Detailstatus und Farbwechsel.
- Exakte Status-/Beine-/Tabellenwerte erst nach Detailpfad.

Noch zu pruefen:

- Ob Fast-Hero waehrend der Ladephase deutlicher als Projektion gekennzeichnet werden soll.

### 10.3 Service Worker / PWA Cache

Risiko:

- Nutzer sieht nach Build/Deployment alte UI.

Empfehlung:

- Beim lokalen Test hart neu laden.
- Bei Deployment ggf. Cache-/SW-Update-Verhalten pruefen.

### 10.4 Testlaufzeit

Risiko:

- Einige Engine-Tests laufen im Sekundenbereich bis zweistellig.
- Das kann CI und schnelle Iteration stoeren.

Empfehlung:

- Heavy Performance-/Profiling-Tests von normalen Unit-/Integrationstests trennen.
- Profiling-Tests bewusst als Benchmark laufen lassen.

## 11. Review-Fragen

1. Soll `runLifeplusTreeSimulation` als oeffentliche Convenience-API bleiben oder zugunsten von `runSimulation(..., simulationMode: 'person-tree')` entfernt werden?
2. Soll B2 `shopper-aggregate` direkt als naechster Schritt umgesetzt werden?
3. Brauchen wir einen harten Detail-Cap, z.B. Netzwerk-Groesse, Member-Anzahl oder erwartete Laufzeit?
4. Soll die Fast-Hero-Zahl waehrend der Ladephase sichtbar bleiben oder durch einen "Projektion"-Hinweis ergaenzt werden?
5. Sollen historische Konzeptdokumente archiviert/umbenannt werden, damit Reviewer nur den Zielstand lesen?
6. Welche nicht eindeutig zugeordneten Website-/Pricing-Aenderungen gehoeren wirklich in denselben Review?

## 12. Empfohlener naechster Schritt

Fuer die Modell-/UX-Linie:

1. B2 `shopper-aggregate` implementieren oder explizit verwerfen.
2. Detailpfad in einen Web Worker auslagern oder zumindest abbrechbar machen.
3. Detail-Cap definieren: z.B. ab erwarteter Netzwerk-Groesse > X keine automatische Detailrechnung, sondern Button "Exakt berechnen".
4. `runLifeplusTreeSimulation` konsolidieren.
5. Historische Dokumente archivieren und ein finales Zielarchitektur-Dokument als Referenz festlegen.

Fuer den Review:

1. Zuerst nur Modell-/Simulator-/App-Dateien reviewen.
2. Benchmarks separat reviewen.
3. Website-/Pricing-/Legal-Dateien getrennt reviewen, weil sie nicht Teil der Wachstumsmodell-Logik sind.

## 13. Update 2026-06-05: Shopper als Float-Aggregat

Nach der F1a-Korrektur fuer Member wurde die Shopper-Modellierung separat vereinfacht.

Neue Regel:

- Member bleiben ganze F1a-Personen.
- Shopper sind keine Personen im Simulationskern.
- Shopper werden pro Sponsor als Float-Wert `shopperCount` gefuehrt.
- Shopper duerfen Dezimalwerte haben, z.B. `2,65`.
- Shopper-Umsatz ist `shopperCount * shopperMonthlyVolume`.
- Shopper-Volumen zaehlt zu QGV.
- Shopper-Volumen zaehlt nicht zu AV.
- Shopper erzeugen keine Downline, keinen Status und keine Beine.
- Wenn ein Member vollstaendig churnt, wird sein `shopperCount` zum Parent uebertragen.

Geaenderte Dateien fuer dieses Update:

- `packages/simulator-core/src/person-tree.ts`
- `packages/simulator-core/src/tree-generator.ts`
- `packages/product-lifeplus/src/tree-compensation.ts`
- `simulator-app/src/components/person-tree/person-tree-node.ts`
- `simulator-app/src/components/network/sunburst-node.ts`
- `packages/product-lifeplus/tests/tree-simulation.test.ts`
- `_doc/growth_models/Netzwerkwachstum Konzept Erarbeitung 14 - Shopper als Float-Aggregat.md`

Verifikation:

- `npm test -- packages/product-lifeplus/tests/tree-simulation.test.ts packages/product-lifeplus/tests/engine.test.ts tests/integration/person-tree-reality.test.ts simulator-app/src/components/person-tree/person-tree-node.test.ts simulator-app/src/components/network/sunburst-node.test.ts`
- Ergebnis: 5 Testdateien bestanden, 71 Tests bestanden.
- `npm run build:lifeplus`
- Ergebnis: Build erfolgreich; bekannter Vite-Hinweis zur Chunkgroesse bleibt.

Review-Hinweis:

Der alte Typ `kind: 'shopper'` bleibt vorerst aus Kompatibilitaetsgruenden bestehen, wird vom Generator aber nicht mehr fuer neue Shopper erzeugt. Alte Fixtures mit echten Shopper-Knoten bleiben lesbar. Langfristig kann dieser Legacy-Pfad entfernt werden.
