# Netzwerk-Modellierung

**Stand:** 2026-06-10  
**Status:** historischer Konzept-Snapshot mit kritischer Aktualisierung. Diese `_updated.md`-Datei ist ein Phase-7-Review-Artefakt und muss nach Freigabe in die Originaldatei ueberfuehrt oder verworfen werden.  
**Scope:** Dokumentiert, warum die alte Aggregat-/Beispielreihen-Architektur abgeloest wurde, und verweist auf die aktuellen Single-Source-Dateien fuer Personenbaum, Shopper, Churn, Reality-Strategien und Verguetung.  
**Ersetzt nach Freigabe:** [`Netzwerk-Modellierung.md`](./Netzwerk-Modellierung.md).

## 0. Kritisches Review dieses Updates

Die vorherige `_updated`-Fassung hatte die richtige Richtung, war aber zu knapp:

1. **"Abgeloest durch growth_models" war zu pauschal.** `growth_models/` ist fachlich wichtig, aber einzelne Abschnitte in `01-Zielarchitektur.md` enthalten noch historisch ueberholte Drift-Notizen. Fuer den aktuellen Code sind die Core-/Product-/UI-Dateien und Tests genauso wichtig.
2. **Single-Path wurde nicht konkret genug beschrieben.** `runSimulation()` nutzt heute immer den Personenbaum; `standard` ist kein `SimulationMode` mehr. `person-tree` bleibt nur Legacy-Alias fuer `person-tree-equal`.
3. **Hybriditaet fehlte.** Der Personenbaum ist fachlich Single Source, aber intern nicht immer "eine sichtbare Person = eine reale Person": ab `MAX_EXPLICIT_MEMBER_PERSONS = 5_000` entstehen gewichtete Member-Aggregate; Shopper sind Float-Counts am Sponsor.
4. **Shopper-Modell war unterdokumentiert.** Shopper sind keine `SimPerson` mehr, werden aber in der UI als `shopper-aggregate`-Knoten dargestellt. Das muss klar getrennt werden.
5. **Loeschkandidat zu hart formuliert.** Die Originaldatei darf erst geloescht werden, wenn die historischen Begruendungen wirklich in `growth_models/`, Tests oder diesem Review-Master erhalten sind.

## 1. Aktueller Stand

Das alte Konzept "Aggregatpfad fuer Wachstum plus konkrete Personenreihen fuer Beispielrechnungen" ist abgeloest. Der produktive Stand ist:

- **Eine Berechnungsquelle:** Personenbaum im `simulator-core`.
- **Runtime-Modi:** `person-tree-equal`, `person-tree-random`, `person-tree-momentum`.
- **Legacy-Alias:** `person-tree` wird weiter als Alias fuer Gleichverteilung akzeptiert.
- **Nicht mehr produktiv:** `standard` / alter Aggregatpfad.
- **Shopper-Modell:** Shopper sind keine Personen im Core; sie laufen als `shopperCount` am Sponsor/Member.
- **UI-Darstellung:** Shopper koennen als `shopper-aggregate`-Knoten angezeigt werden, bleiben aber keine Simulationspersonen.
- **Provision/Rank:** LifePlus-Verguetung wird auf dem Personenbaum berechnet; Phasen 2/3 sind strukturell nicht sinnvoll als reiner Aggregatpfad modellierbar.

Die aktuelle Doku-Lesereihenfolge ist absichtlich nicht 01-02-03-04. Wer den heutigen Stand verstehen will, beginnt mit 02/03 (aktuelle Regeln und Status) und liest 01 erst danach, weil 01 noch historisch ueberholte Drift-Abschnitte enthaelt. 04 ist Cleanup-Hygiene.

| Reihenfolge | Dokument | Rolle |
|---|---|---|
| 1. Einstieg | [`growth_models/README.md`](./growth_models/README.md) | Einstieg und Reihenfolge. |
| 2. Aktuelle Regeln | [`growth_models/02-Wachstums-und-Churn-Regeln.md`](./growth_models/02-Wachstums-und-Churn-Regeln.md) | Fuehrend fuer Member-, Shopper-, Churn-, AV-/QGV-Regeln. |
| 3. Aktueller Status | [`growth_models/03-Benchmark-Status-B1-B2.md`](./growth_models/03-Benchmark-Status-B1-B2.md) | Fuehrend fuer den Status von Aggregatpfad und Shopper-Aggregation. |
| 4. Architektur und Geschichte | [`growth_models/01-Zielarchitektur.md`](./growth_models/01-Zielarchitektur.md) | Zielarchitektur und Begruendung; einzelne alte Drift-Abschnitte nur mit Statusupdate 2026-06-10 lesen. |
| 5. Cleanup | [`growth_models/04-Code-Cleanup-Plan.md`](./growth_models/04-Code-Cleanup-Plan.md) | Restcleanup und offene Hygiene. |

## 2. Code-Anker

### Simulationskern

| Datei | Aktuelle Verantwortung |
|---|---|
| [`packages/simulator-core/src/simulation.ts`](../packages/simulator-core/src/simulation.ts) | `runSimulation()`, `SimulationMode`, Jahres-/Quartalsresultate. Nutzt Personenbaum als Quelle; kein produktiver `standard`-Modus. |
| [`packages/simulator-core/src/person-tree.ts`](../packages/simulator-core/src/person-tree.ts) | `SimPerson`, `PersonTreeSnapshot`, `personTreeToNetworkSnapshot()`, Upline-Pfade. |
| [`packages/simulator-core/src/tree-generator.ts`](../packages/simulator-core/src/tree-generator.ts) | Jahreswachstum, Carry, Churn, Reattachment, Shopper-Counts, gewichtete Member-Aggregate ab 5.000 expliziten Personen. |
| [`packages/simulator-core/src/network-snapshot.ts`](../packages/simulator-core/src/network-snapshot.ts) | Aggregierte Sicht aus dem Personenbaum fuer Level/Legs/Totalwerte. |
| [`packages/simulator-core/src/contracts.ts`](../packages/simulator-core/src/contracts.ts) | Gemeinsame Simulationstypen. |

### LifePlus-Plan und Reality-Strategien

| Datei | Aktuelle Verantwortung |
|---|---|
| [`packages/product-lifeplus/src/tree-compensation.ts`](../packages/product-lifeplus/src/tree-compensation.ts) | LifePlus-Verguetung und Rank-State direkt auf `PersonTreeSnapshot`. |
| [`packages/product-lifeplus/src/ranks.ts`](../packages/product-lifeplus/src/ranks.ts) | AV/QGV/QL/Bronze-/Diamond-Beine und Rangbestimmung. |
| [`packages/simulator-realistic-growth/src/index.ts`](../packages/simulator-realistic-growth/src/index.ts) | Mapping `equal`/`dirichlet`/`momentum`/`lifecycle` auf Tree-Growth-Strategien. `equal` und `lifecycle` liefern aktuell keine Zusatzstrategie. |

### UI und Visualisierung

| Datei | Aktuelle Verantwortung |
|---|---|
| [`simulator-app/src/App.tsx`](../simulator-app/src/App.tsx) | Reality-Strategie-Auswahl, Persistenzmigration alter Werte, Debounce fuer Detailrechnung. |
| [`simulator-app/src/components/AdvancedSettingsPanel.tsx`](../simulator-app/src/components/AdvancedSettingsPanel.tsx) | Bietet nur `person-tree-equal`, `person-tree-random`, `person-tree-momentum` an. |
| [`simulator-app/src/components/person-tree/person-tree-node.ts`](../simulator-app/src/components/person-tree/person-tree-node.ts) | Baut UI-Hierarchie aus `PersonTreeSnapshot`; Shopper erscheinen als `shopper-aggregate`. |
| [`simulator-app/src/components/person-tree/PersonTreeVisualizations.tsx`](../simulator-app/src/components/person-tree/PersonTreeVisualizations.tsx) | Radial Tree, horizontales Dendrogramm, Hyperbolic-Ansicht. |
| [`simulator-app/src/components/NetworkVisualizations.tsx`](../simulator-app/src/components/NetworkVisualizations.tsx) | Aggregierte Netzwerkansichten auf Basis der aktuellen Simulationsergebnisse. |

### Tests

| Datei | Absicherung |
|---|---|
| [`tests/integration/person-tree-reality.test.ts`](../tests/integration/person-tree-reality.test.ts) | Random/Momentum laufen auf dem Personenbaum als Single Source. |
| [`packages/simulator-core/tests/person-tree-equivalence.test.ts`](../packages/simulator-core/tests/person-tree-equivalence.test.ts) | Personenbaum liefert Aggregat-Snapshots; Churn vor Wachstum. |
| [`packages/product-lifeplus/tests/tree-simulation.test.ts`](../packages/product-lifeplus/tests/tree-simulation.test.ts) | LifePlus-Baumverguetung. |
| [`packages/product-lifeplus/tests/reference-rank.test.ts`](../packages/product-lifeplus/tests/reference-rank.test.ts) | Referenznetzwerke fuer Ranglogik. |
| [`simulator-app/src/components/person-tree/person-tree-node.test.ts`](../simulator-app/src/components/person-tree/person-tree-node.test.ts) | UI-Hierarchie, Shopper-Aggregate, inaktive Personen. |

## 2a. Didaktisches Beispiel: konkrete Upline-Reihe

Aus dem Original-Konzept (didaktisch wertvoll als Schaubild fuer die Verguetungs-Phasen):

```text
Kunde  -->  A  -->  B  -->  C  -->  Gold  -->  Bronze  -->  Bronze  -->  Diamond
   |        |       |       |        |          |            |           |
Shopper   Member  Member  Member   Status     Status       Status     Status
```

Lesart: Eine Reihe konkret benannter Personen mit Status laesst sich verwenden, um die LifePlus-Phasen-Auszahlung (Phase 1 Unilevel ueber Ebene 1-3, Phase 2 Tiefenbonus ab Ebene 4 mit Bronze-/Silber-/Gold-/Diamant-Stuecken, Phase 3 dynamische Tiefenstaffel) manuell durchzuspielen. Im aktuellen Code lebt diese Logik in `packages/product-lifeplus/src/tree-compensation.ts` und wird ueber Referenznetzwerk-Tests (`packages/product-lifeplus/tests/example-line.test.ts`, `reference-rank.test.ts`) abgesichert.

Diese Skizze ist als Lehrmaterial nuetzlich, aber kein zweiter Berechnungspfad. Aggregat-Pfad und konkrete Beispielreihen-Pfad wurden im Cleanup R2/R5/R6 verworfen — Single Source ist der Personenbaum.

## 3. Was aus dem alten Konzept weiter gilt

- **Phasen 1 bis 3 bleiben fachlich relevant.** Sie sind aber nicht mehr als separater Aggregatpfad fuehrend, sondern in `packages/product-lifeplus/src/tree-compensation.ts` umgesetzt.
- **Kompression auf qualifizierte Upline** bleibt Teil der Phase-1-Auszahlung.
- **Rangtreppe** lebt im Product-Pack, nicht mehr in diesem Dokument.
- **Beispielreihen** sind nur noch historischer Begruendungsspeicher oder Testfixture-Material. Sie sind kein zweiter Berechnungspfad.
- **Aggregierte Level- und Beinwerte** existieren weiterhin, aber als Ableitung aus `personTreeToNetworkSnapshot()`, nicht als eigene Source of Truth.

## 4. Was nicht mehr gilt

| Alte Aussage / Richtung | Aktueller Stand |
|---|---|
| Aggregatpfad als produktiver Wachstumsweg | Entfernt/obsolet; Personenbaum ist Quelle. |
| `standard` als Runtime-Modus | Nicht mehr im `SimulationMode`-Union. Alte Persistenzwerte werden in der App auf `person-tree-equal` migriert. |
| Shopper als eigene Personen | Entfernt aus `SimPersonKind`; Shopper sind `shopperCount` am Sponsor/Member. |
| Separate Beispielrechnungen neben Simulation | Falls noch wertvoll, als Tests/Fixtures pflegen. |
| Doku als fachlicher Master fuer Rang-Badges | Rang-/Badge-Logik liegt in Code und Tests; siehe `Rank-Badges_updated.md`. |

## 5. Kritische Modellgrenzen

Diese Grenzen muessen in Folge-Doku und UI-Wording sichtbar bleiben:

1. **Weighted Member Aggregates:** Bei sehr grossen Baeumen erzeugt `tree-generator.ts` gewichtete Member-Knoten (`weight > 1`), sobald mehr als 5.000 explizite Personen entstehen wuerden. Das ist kein Rueckfall zum alten Aggregatpfad, aber eine Performance-Kompression innerhalb des Personenbaums.
2. **Shopper als Float:** Shopper koennen Dezimalwerte haben. UI-Knoten vom Typ `shopper-aggregate` sind Darstellung, keine Strukturpersonen.
3. **Direct-Cap-Semantik:** `maxDirectMembersPerMember` begrenzt Neu-Rekrutierung. Durch Reattachment nach Churn kann die direkte Beinanzahl trotzdem steigen.
4. **Churn-Reihenfolge:** Member-Churn passiert vor neuem Wachstum; neue Members des laufenden Jahres werben erst im Folgejahr.
5. **Reality-Strategien veraendern Struktur, nicht nur Optik:** Momentum kann durch fruehere ganze Members in starken Beinen andere Endwerte erzeugen als Gleichverteilung.
6. **`lifecycle` ist Platzhalter:** Im Low-Level-Strategiepaket vorhanden, aber in der UI nicht auswaehlbar und aktuell ohne eigene Growth-Strategie.

## 6. Offene Punkte fuer Doku-/Code-Hygiene

| Punkt | Empfehlung |
|---|---|
| `growth_models/01-Zielarchitektur.md` enthaelt noch historisch ueberholte Drift-Abschnitte. | Nicht blind als aktuellen Master zitieren; bei naechstem Cleanup Statusupdate in den betroffenen Abschnitten nachziehen. |
| Original `Netzwerk-Modellierung.md` ist lang und historisch. | Erst nach Stichproben loeschen oder kuerzen, wenn keine einzigartigen Begruendungen fehlen. |
| UI-Hinweis fuer Compressed Mode fehlt wahrscheinlich noch. | Als Produkt-/UX-Entscheidung fuehren, sobald grosse Szenarien relevant werden. |
| Tooltip fuer Direct-Cap/Reattachment bleibt wichtig. | In Growth-Doku oder UI-Copy konkretisieren. |
| Tests koennen staerker als Doku-Master dienen. | Referenznetzwerke und Invarianten in `Referenznetzwerk-Tests`/Tests halten, nicht in Fliesstext verdoppeln. |

## 7. Empfehlung

Dieses Dokument sollte nicht als neuer fachlicher Master ausgebaut werden. Besser:

- Originaldatei auf historischen Snapshot reduzieren oder loeschen,
- diese aktualisierte Fassung als kurze Review-/Uebergangsfassung nutzen,
- aktuelle Regeln in `growth_models/02` und `03` halten,
- exakte Fachlogik in Code und Tests verankern.

Loeschung der Originaldatei ist erst sinnvoll, wenn ein Review konkret bestaetigt:

- [ ] **V1 Aggregat-vs-Personenbaum-Begruendung** ist in `growth_models/03-Benchmark-Status-B1-B2.md` §1-2 erhalten (B1-Q Driftbefund, B2 Shopper-Konsolidierung).
- [ ] **V2 Beispielreihen** sind entweder unwichtig (z. B. nur als Doku-Schaubild) oder als Testfixtures in `packages/product-lifeplus/tests/example-line.test.ts` oder `reference-rank.test.ts` uebernommen.
- [ ] **V3 Historische Prozent-/Ranghinweise** (Phase 1: 25/10/5, 5/25/10, 10/5/5; Phase 2: Bronze/Silber/Gold/Diamant je 3 %) sind durch Product-Pack-Code in `packages/product-lifeplus/src/tree-compensation.ts` und `constants.ts` plus Tests abgedeckt.
- [ ] **V4 Kompressionsregel** (nicht qualifizierte Upline wird uebersprungen) ist in `tree-compensation.ts` implementiert und durch `example-line.test.ts` getestet.
- [ ] **V5 Status-Treppe** (Bronze nimmt Bronze; Silber nimmt Bronze+Silber; Gold nimmt Bronze+Silber+Gold; Diamant nimmt alle vier) ist in `ranks.ts`/`constants.ts` und Tests verankert.

Erst wenn alle fuenf Checkboxen sicher als erledigt markiert sind, ist die Loeschung der Originaldatei verantwortbar. Bis dahin bleibt sie als Begruendungsspeicher.

## Anhang: Historischer Kontext

Original-Datei: [`Netzwerk-Modellierung.md`](./Netzwerk-Modellierung.md), Stand 2026-05-27/-28.

Historischer Inhalt:

- Phase-1- bis Phase-3-Beschreibung der LifePlus-Verguetungslogik.
- Beispiel-Upline-Reihen wie `Kunde -> A -> B -> C -> Gold -> Bronze -> Bronze -> Diamond`.
- Modell-Vorschlag: Aggregatpfad fuer Wachstum, konkrete Personenreihen fuer Beispielrechnungen.
- Vorstufe der spaeteren Personenbaum-Migration.

Bei Abweichungen zwischen Originaldatei und aktuellem Code/Dokumentationsstand gilt:

1. Code und Tests,
2. `growth_models/02-Wachstums-und-Churn-Regeln.md`,
3. `growth_models/03-Benchmark-Status-B1-B2.md`,
4. dieses Review-Dokument,
5. historische Originaldatei.
