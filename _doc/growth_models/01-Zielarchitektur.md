# 01 — Zielarchitektur Wachstums- und Vergütungsmodell

**Stand:** 2026-06-09
**Konsolidiert aus:** Erarbeitung 10 (überarbeitete Zielarchitektur, mittlerweile selbst überholt), 14 (Shopper als Float), 15 (Churn-Schärfe), 16 (Hybrid-Review), 17/18 (Bereinigungs-Befunde), Umsetzung Bericht.

**Statusupdate 2026-06-10:** R2/R5/R6 sind umgesetzt. Der produktive `standard`-/Aggregatpfad und `fastResult` wurden entfernt; Shopper sind auf `shopperCount` konsolidiert; B2-Shopper-Aggregation ist verworfen und das geskippt gefuehrte Benchmark-/Testgeruest wurde entfernt. Verbleibende Legacy-Aussagen in diesem Dokument sind gegen [04-Code-Cleanup-Plan.md](04-Code-Cleanup-Plan.md) und [03-Benchmark-Status-B1-B2.md](03-Benchmark-Status-B1-B2.md) als historisch einzuordnen.

---

## 1. Kernentscheidung: Single-Path Personenbaum mit Debounce-UX

Die zwischenzeitlich verfolgte **Two-Path-Architektur** (schneller Aggregat-Pfad für Slider/Chart neben Personenbaum-Pfad für Detail) ist **verworfen**. Aktuelles Zielmodell:

- **Eine Berechnungsquelle**: der Personenbaum in einer der drei Reality-Strategien (`person-tree-equal`, `person-tree-random`, `person-tree-momentum`).
- **Slider-Latenz wird durch Debounce gelöst**, nicht durch parallelen Aggregat-Pfad. Eingaben fließen sofort in die Anzeige (Inputfelder), die abhängigen Berechnungs-Outputs (Hero, Chart, Tabelle, Visualisierungen, Ziele) bleiben sichtbar aber **abgeblendet** stehen, bis nach Debounce-Ruhephase ein neuer Personenbaum-Lauf gerechnet ist.
- **Während der Neuberechnung** signalisieren `opacity`-Abblendung der Hero-/Stat-Karten plus eine orange drehende Eieruhr über dem Chart und ein Inline-Spinner auf dem Tabellen-Placeholder, dass eine Neurechnung läuft. Die Tabelle wird komplett ausgeblendet, bis Detaildaten zum aktuellen Input-Key vorliegen.
- **Nach Berechnung** schalten alle Ausgaben atomar auf das neue Personenbaum-Resultat um; Spinner verschwindet, `opacity` zurück auf 100 %, Tabelle wieder sichtbar.

**Begründung:** B1-Q hat gezeigt, dass der schnelle Aggregat-Pfad fachlich zu stark driftet (Phase 2/3, Root-Provision, Status, Beine), während die Personenbaum-Performance für Slider-Interaktion ausreicht, sobald die Berechnung in eine Ruhephase verlagert wird. Damit fällt die fachliche Begründung für eine permanente zweite Datenquelle weg.

**Implementierungs-Stand:** Hero und Tabelle implementieren das bereits sauber. Chart und Visualisierungen ziehen im Code noch zusätzlich aus einem internen `fastResult` (Aggregat-Pfad, `simulationMode: 'standard'`). Das ist Architektur-Drift und Cleanup-Pflicht — siehe §7.

## 2. Simulationsmodi

`SimulationMode` im `simulator-core`:

| Modus | Pfad | Reality-Strategie | Rolle |
|---|---|---|---|
| `standard` | Aggregat | – | **Legacy** — aus UI entfernt, im Code nur noch als `fastResult`-Bootstrap für den Chart genutzt; soll ersatzlos verschwinden (§7 P2.1) |
| `person-tree-equal` | Personenbaum | deterministisch / gleichverteilt | aktiv |
| `person-tree-random` | Personenbaum | Dirichlet-Verteilung | aktiv |
| `person-tree-momentum` | Personenbaum | Momentum | aktiv |

Die Combo-Box [AdvancedSettingsPanel.tsx](../../simulator-app/src/components/AdvancedSettingsPanel.tsx) bietet nur die drei `person-tree*`-Varianten. Persistenz-Migration in [App.tsx normalizeRealityStrategy](../../simulator-app/src/App.tsx#L800-L823) mappt Alt-Werte (`standard`, `person-tree`, `none`, `dirichlet`, `momentum`, `lifecycle`) auf die neuen Varianten. `lifecycle` bleibt im Low-Level-Paket als nicht auswählbarer Platzhalter fuer ein spaeteres Lifecycle-/Lebensphasen-Modell; `none` wurde durch `equal`/`person-tree-equal` ersetzt.

## 3. Hybridmodell innerhalb des Personenbaums

Der Personenbaum ist nicht rein „eine Person pro Member". Ab einer Schwelle wird auf gewichtete Aggregatknoten umgeschaltet:

```text
explizite Member ≤ MAX_EXPLICIT_MEMBER_PERSONS  → Exact-Mode
                  (Default: 5_000)
explizite Member  > MAX_EXPLICIT_MEMBER_PERSONS  → Compressed-Mode
                  (gewichtete Member-Aggregate mit weight > 1)
```

| Modus | Member | Shopper |
|---|---|---|
| Exact | ganze Personen | Float am Sponsor |
| Compressed | gewichtete Aggregate (weight > 1) | Float am Sponsor |

**Diese Hybridität muss sichtbar bleiben** — sonst entsteht fachlicher Drift, weil das Produkt „ganze Personen" verspricht und der Code intern gewichtet rechnet. Begriffliche Trennung:

- *Exact person mode* — alle Member explizit
- *Compressed member mode* — Member-Aggregate ab Cap

Empfehlung: UI-Badge anzeigen, sobald Kompression greift. Tests sichern, dass Kompression Rank/QGV/Provision nicht verfälscht.

## 4. Datenquelle pro UI-Bereich

Im Zielmodell ziehen **alle** sichtbaren Werte aus dem Personenbaum-Detailresultat:

| UI-Bereich | Datenquelle | Verhalten während Neuberechnung |
|---|---|---|
| Hero (Provision/Jahr 10) | `detailResult.finalQuarter.totalEUR` | letzter Stand bleibt, Wrapper auf `opacity-60` |
| Netzwerk-Größe | `detailResult.finalQuarter.networkSize` | bleibt; bei initialem Load „wird berechnet" |
| Status (Rang) | `detailResult.finalQuarter.rankName` | bleibt; initial „wird berechnet" |
| Ziele | `evaluateGoals(result, …)` | werden mit Chart neu gerechnet |
| Chart-Linie | `result.yearEnds` (Soll: nur Detail) | Soll: letzter Detailstand eingefroren bis neue Detaildaten da sind. **Ist:** Chart fällt auf `fastResult.yearEnds` zurück — Drift, siehe §7 |
| Tabelle | `detailedResult.yearSummaries` | komplett ausgeblendet, durch `ExactDataPlaceholder` + Spinner ersetzt |
| Sunburst/Netzwerk/PersonTree | Soll: nur `detailedResult.personYearEnds` | **Ist:** `visualizationResult = detailedResult ?? fastResult` — fällt auf Aggregat zurück, dessen `personYearEnds` `undefined` sind → leere oder degenerierte Visualisierung. Drift, siehe §7 |

## 5. UX-Schichten und visuelle Kennzeichnung

Konkrete Implementierung aus [App.tsx:240–319](../../simulator-app/src/App.tsx#L240-L319):

1. **Eingabe** im Hauptpanel (Slider/Stepper). Der Wert wird **sofort** im Inputfeld dargestellt.
2. **Sofortige Reaktion**: alte Berechnungs-Outputs bleiben sichtbar, aber:
   - Hero/Stat-Karten-Wrapper bekommt `opacity-60` (`heroIsStale`-Flag, App.tsx:319, 525)
   - Über dem Chart erscheint `OrangeHourglassSpinner` (drehende orange Kreisbahn, App.tsx:551, 733-742)
   - Tabelle wird ausgeblendet und durch `ExactDataPlaceholder` mit `InlineOrangeSpinner` plus Erklärtext ersetzt (App.tsx:554-562, 704-718)
   - Caption unter dem Hero: `Neuberechnung laeuft — Hero zeigt letzten exakten Stand` (App.tsx:289-292)
3. **Debounce-Ruhephase**: `DETAIL_CALCULATION_DEBOUNCE_MS = 800` ms — sobald keine neue Eingabe mehr eingeht, startet der Personenbaum-Lauf (App.tsx:62, 262-275).
4. **Berechnung abgeschlossen**: `detailResult` und `detailResultKey === detailRequestKey` matchen → `detailedResult` wird gesetzt → alle Outputs schalten atomar um, Spinner verschwinden, `opacity` zurück auf 100, Tabelle wieder sichtbar mit Caption `Exakt aktualisiert`.

**Chart-Mode (`aggregate` vs. `detail`)**: aktuell rendert [ProvisionChart.tsx:36-37](../../simulator-app/src/components/ProvisionChart.tsx#L36-L37) eine graue Linie (`#9CA3AF`) im `aggregate`-Modus, eine dunkelgrüne (`#0F7A5B`) im `detail`-Modus. Im Zielmodell soll das Chart während der Debounce-Phase einfach den letzten Detail-Stand abgeblendet weiterzeigen, statt auf Aggregat zu wechseln — der `aggregate`-Mode wird mit `fastResult`-Entfernung obsolet.

## 6. Bekannte Drift-Risiken

Identifiziert in Erarbeitung 16 und im Bereinigungsreview 17/18:

1. **Reattachment hebt den direkten Member-Cap auf**
   `maxDirectMembersPerMember` begrenzt nur **Neu-Rekrutierung**. Wenn ein Member churnt, hängen seine aktiven Kinder beim Sponsor an — der Sponsor kann dadurch mehr direkte Beine haben als der Cap erlaubt. Test dokumentiert das. → Tooltip schärfen oder Cap-Semantik klären.
2. **Mehrere Bein-Sichtbarkeitsregeln**
   `personTreeToNetworkSnapshot`, `buildLegsFromPersons`, Tree-Compensation und Sunburst nutzen je eigene Regeln für „displayable legs". Risiko: Tabelle und Sunburst zeigen unterschiedliche Beinanzahlen.
3. **Virtueller Eintrag „Eigene Shopper" wirkt wie Bein**
   Fachlich richtig (Root-eigene Shopper-Provision muss zur Beinsumme), visuell missverständlich (sieht aus wie ein GL). Label/Farbe/Tooltip klarstellen.
4. **Compressed-Mode ist im UI nicht sichtbar**
   Sobald `MAX_EXPLICIT_MEMBER_PERSONS` greift, rechnet der Code mit gewichteten Aggregaten. Ohne Badge/Hinweis im UI entsteht der Eindruck, die Tabelle zähle weiterhin einzelne Personen.

## 7. Architektur-Drift zwischen Code und Entscheidung

Diese Punkte sind **kein** „nice-to-have-Cleanup", sondern stehen im Widerspruch zur Architekturentscheidung aus §1:

| ID | Datei(en) | Maßnahme | Warum prioritär |
|---|---|---|---|
| **P2.1** | [simulator-app/src/App.tsx:240-285](../../simulator-app/src/App.tsx#L240-L285) | `fastResult`, `result = detailedResult ?? fastResult`, `visualizationResult = detailedResult ?? fastResult` entfernen. Während der Debounce-Phase letzten Detailstand halten (oder Skeleton beim allerersten Load). | Two-Path-Architektur ist verworfen — der Code rechnet aber weiterhin parallel beide Pfade. |
| **P2.2** | [packages/simulator-core/src/simulation.ts](../../packages/simulator-core/src/simulation.ts) | Default ist Personenbaum-Gleichverteilung; Runtime-Wert ist `person-tree-equal`, Legacy-Alias `person-tree` bleibt fuer alte Tests/Caller akzeptiert. | Kein produktiver Aufrufer braucht den alten Aggregat-Default mehr. |
| **P2.3** | – | erledigt: produktiver App-Default ist `person-tree-equal`; alte gespeicherte Werte werden migriert. | – |
| **P2.4** | [simulator-app/src/components/NetworkVisualizations.tsx](../../simulator-app/src/components/NetworkVisualizations.tsx), [simulator-app/src/components/network/sunburst-node.ts](../../simulator-app/src/components/network/sunburst-node.ts) | Aggregat-Fallbacks (`buildSunburstTree`, `estimateAggregateRank`, `yearEnds`-Fallbacks) nach P2.1 entfernen. | Mit `fastResult`-Wegfall haben sie keinen sinnvollen Aufrufer mehr. |
| **P2.5** | [packages/simulator-core/src/simulation.ts:78-82](../../packages/simulator-core/src/simulation.ts#L78-L82) | `'standard'` aus dem `SimulationMode`-Union entfernen, sobald P2.1/P2.2 durch sind. | Verhindert Wiedereinführung des Aggregat-Pfads über die Hintertür. |
| **Z9** | [App.tsx](../../simulator-app/src/App.tsx) | `OrangeHourglassSpinner` und `InlineOrangeSpinner` bleiben (sind die „drehende Eieruhr" der Single-Path-UX). `ExactDataPlaceholder` als Tabellen-Skeleton ebenfalls. **Nur** der `mode='aggregate'`-Pfad in `ProvisionChart` und ein evtl. nicht mehr benötigter Helper entfallen. | Korrigiert die früher als „zusammen mit fastResult entfernen" verbuchten Komponenten. |
| **Z14** | [simulator-app/src/auth/*](../../simulator-app/src/auth/), `LoginGate.tsx`, `Paywall.tsx`, `DeviceLimitGate.tsx`, `AuthGate.tsx` | Account-/Auth-Layer nur gegen aktuellen Code und aktuelle Freemium-/Go-Live-Doku bewerten; keine externen Agenten-Notizen als Quelle verwenden. | Unabhaengig von Single-Path-Cleanup, aber auf derselben Bereinigungs-Welle. |

## 8. Offene Architekturentscheidungen

Aus Umsetzung Bericht §10–11 + Erarbeitung 16 — noch nicht entschieden:

1. **Web Worker für Detailpfad** — Personenbaum bei großen Szenarien (z. B. 4,5 Member/Jahr + 5 Shopper/Jahr + 30 % Churn → ~3,6 Mio Netzwerk-Größe in Jahr 10) blockiert den Main Thread auch mit Debounce. Aktuelle Absicherung ist nur Debounce + Single-Path-Spinner.
2. **Hard Detail-Cap** — ab welcher erwarteten Netzwerk-Größe wird die automatische Detailrechnung verweigert und nur per Button „Exakt berechnen" ausgelöst?
3. **B2 Shopper-Aggregation** — verworfen; durch `shopperCount`-Konsolidierung fachlich erledigt (siehe [03-Benchmark-Status-B1-B2.md](03-Benchmark-Status-B1-B2.md)).
4. **Compressed-Mode-Sichtbarkeit** — UI-Badge nur Empfehlung; konkrete Stelle/Wording noch offen.
5. **`runLifeplusTreeSimulation`** — Konvenienz-API behalten oder durch `runSimulation(..., { simulationMode: 'person-tree-equal' })` ersetzen?
