# 04 - Code-Cleanup-Plan

**Stand:** 2026-06-10  
**Status:** Teilweise umgesetzt; verbleibende Punkte siehe Abschnitt 6  
**Bezug:** [01-Zielarchitektur.md](01-Zielarchitektur.md), [02-Wachstums-und-Churn-Regeln.md](02-Wachstums-und-Churn-Regeln.md), [03-Benchmark-Status-B1-B2.md](03-Benchmark-Status-B1-B2.md)

## 1. Ziel

Die produktive Runtime soll die Single-Path-Entscheidung konsequent abbilden:

- Personenbaum ist die produktive Berechnungsquelle.
- `standard`/Aggregatpfad ist aus der UI-Datenquelle und aus `runSimulation()` entfernt.
- Waerend Debounce bleibt der letzte Detailstand sichtbar statt ein anderes Modell einzublenden.
- Offene Stub-/Backlog-Werte werden bewusst entschieden, nicht nebenbei entfernt.

## 2. `fastResult`-Plan

Umgesetzt am 2026-06-10:

- `simulator-app/src/App.tsx` berechnet kein `fastResult` mehr.
- `result` ist der letzte vorhandene Personenbaum-Detailstand.
- Netzwerk- und Personenbaum-Visualisierungen nutzen denselben Detailstand oder zeigen Loading.
- `ProvisionChart` hat keinen `aggregate`/`detail`-Modus mehr.

Zielverhalten:

1. Detailrechnung bleibt die einzige UI-Datenquelle.
2. Bei Eingabeaenderungen wird der letzte vollstaendige Detailstand weiter angezeigt.
3. UI kennzeichnet diesen Zustand als "aktualisiert gleich" oder "Berechnung laeuft".
4. Wenn noch kein Detailstand existiert, zeigt die UI einen Loading-/Skeleton-Zustand statt Aggregatwerte.

Voraussichtliche Code-Anker:

- `simulator-app/src/App.tsx`
- `simulator-app/src/components/ProvisionChart.tsx`
- `simulator-app/src/components/NetworkVisualizations.tsx`
- `simulator-app/src/components/network/sunburst-node.ts`

## 3. Aggregat-Fallbacks erfassen

Aktuell relevante Treffer:

| Datei | Befund |
|---|---|
| `simulator-app/src/App.tsx` | **erledigt:** `fastResult`, `simulationMode: 'standard'`, `result = detailedResult ?? fastResult`, `visualizationResult = detailedResult ?? fastResult` entfernt |
| `simulator-app/src/components/ProvisionChart.tsx` | **erledigt:** `mode?: 'aggregate' | 'detail'` entfernt |
| `simulator-app/src/components/NetworkVisualizations.tsx` | aggregierte Visualisierungsnoten (`kind: 'aggregate'`) fuer Sunburst/Netzwerkdarstellung |
| `simulator-app/src/components/network/sunburst-node.ts` | `SunburstNodeKind` enthaelt `aggregate`; verarbeitet aggregierte Ebenen |
| `packages/simulator-core/src/simulation.ts` | **erledigt:** `standard` aus `SimulationMode` entfernt; Aggregatpfad aus `runSimulation()` entfernt |

Die Entfernung sollte erst nach Tests erfolgen, weil Chart, Tabellen und Visualisierungen mehrere Datenformen akzeptieren.

## 4. Entscheidungen vor weiterer Code-Aenderung

Diese Punkte sind entschieden und umgesetzt:

1. `lifecycle` bleibt als benannter, nicht auswählbarer Platzhalter fuer ein spaeteres Lifecycle-/Lebensphasen-Modell.
2. `none` wird nicht behalten; der gleichverteilte Default heisst im Paket `equal` und in App/Persistenz `person-tree-equal`.
3. B2 Shopper-Aggregation ist durch R5/R6 erledigt und kein aktives Backlog mehr.

## 5. Umsetzungsvorschlag nach Entscheidung

## 5. Umgesetzt 2026-06-10

1. `App.tsx` nutzt nur noch den letzten Personenbaum-Detailstand.
2. Initialer Zustand zeigt Loading/Skeleton statt Aggregatwerte.
3. `fastResult` und `simulationMode: 'standard'` sind aus der App entfernt.
4. `ProvisionChart` rendert nur noch den Detail-Chart.
5. `standard` und der alte Aggregatpfad sind aus `packages/simulator-core/src/simulation.ts` entfernt.

## 6. Verbleibende Umsetzungspunkte

1. Tests fuer Detailstand-Weiterreichen waehrend Debounce ergaenzen.
2. Aggregat-Fallbacks in `NetworkVisualizations.tsx` / `sunburst-node.ts` fachlich pruefen: Einige `aggregate`-Knoten sind weiterhin produktive Visualisierungsaggregate und nicht der entfernte `standard`-Simulationspfad.
3. `lifecycle`/`none` ist entschieden: `lifecycle` bleibt Platzhalter, `none` wurde durch `equal`/`person-tree-equal` ersetzt.

## 7. Shopper-Hybridmodell umgesetzt 2026-06-10

R5 wurde mit Option B entschieden: Shopper werden komplett auf `shopperCount` konsolidiert. Entfernt wurden produktive `kind: 'shopper'`-Personen, zugehoerige Legacy-Branches, Carry-Felder und alte Fixtures. UI-`shopper-aggregate` bleibt als reine Darstellung des Counts erhalten.

## 8. B2 entfernt 2026-06-10

R6 wurde mit Option A entschieden: B2 ist durch die `shopperCount`-Konsolidierung fachlich ueberfluessig. Das bisher geskippt gefuehrte Benchmark-/Testgeruest `benchmarks/b2-shopper-aggregation/` wurde am 2026-06-10 zusammen mit dem `benchmarks/`-Ordner entfernt. Ein separater `simulationMode: 'shopper-aggregate'` wird nicht eingefuehrt.
4. `npm test` und relevanten App-Build nach jeder weiteren Code-Aenderung ausfuehren.
