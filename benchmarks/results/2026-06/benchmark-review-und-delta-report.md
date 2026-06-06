# Benchmark Review und Delta-Report B1/B2

**Datum:** 2026-06-05  
**Basis:** Review-Paket `benchmarks-patch.zip`, bestehende Benchmark-Implementierung, finaler Re-Run  
**Status:** Verbesserungen integriert, B1-E bestanden, B1-Q weiterhin fachlich kritisch

## 1. Kurzfazit

Das Review-Paket war wertvoll, aber nicht in allen fachlichen Annahmen korrekt.

Uebernommen wurden:

- plan-naehere Root-Provision-Struktur statt `log10`-Heuristik
- getrennte `drift_class` und `capped`-Kennzeichnung
- Multi-Strategy-B1-Q mit `standard`, `dirichlet`, `momentum`
- Memory-Indikator
- `renderNodes` getrennt von Tree-Objekten
- B2-C/P/S- und Edge-Case-Skeletttests

Korrigiert werden musste:

- `qualifiedLegs`: Im aktuellen LifePlus-Code sind QL aktive direkte Member-Beine, nicht nur Bronze+-Beine. Bronze-/Diamond-Legs sind separate Bedingungen.
- B1-Q Phase-Vergleich: Der Patch verglich globale Phase-Pools mit Root-Phase-Auszahlungen. Jetzt werden Root-Phase-Beitraege gegen Tree-Root-Phasen verglichen.
- `runSimulation`-API: Der Patch nutzte `seed`/`growthStrategy`; der aktuelle Core nutzt `treeGrowthStrategy`.
- `.bench.ts`-Dateien wurden als `.test.ts` integriert, damit Vitest-Sanity-Tests auffindbar sind.

Die wichtigste Erkenntnis nach dem Re-Run:

**B1-E ist klar bestanden. B1-Q bleibt nicht bestanden.**  
Der schnelle Aggregatpfad ist performant genug, aber die erwartete Root-/Phasen-/Status-Provision ist fachlich noch nicht belastbar.

## 2. Code-Aenderungen

### Ersetzt/geaendert

- `benchmarks/b1-aggregate-path/algorithms/aggregate-engine.ts`
- `benchmarks/b1-aggregate-path/b1-engine.test.ts`
- `benchmarks/b1-aggregate-path/b1-quality.test.ts`

### Neu

- `benchmarks/shared/memory-meter.ts`
- `benchmarks/b2-shopper-aggregation/b2-correctness.test.ts`
- `benchmarks/b2-shopper-aggregation/b2-performance.test.ts`
- `benchmarks/b2-shopper-aggregation/b2-scale.test.ts`
- `benchmarks/b2-shopper-aggregation/edge-cases.test.ts`

### Ergebnisdateien

- `benchmarks/results/2026-06/b1-engine-results.csv`
- `benchmarks/results/2026-06/b1-quality-results.csv`
- `benchmarks/results/2026-06/benchmark-env.csv`
- `benchmarks/results/2026-06/benchmark-review-und-delta-report.md`

## 3. Kritisches Review des Review-Patches

### 3.1 Was am Review richtig war

Das Review hatte recht mit der Hauptkritik: Die erste Root-Provision-Schaetzung war zu heuristisch. Ein `log10(activeMembers)`-Capture-Share ist fachlich nicht aus dem LifePlus-Plan ableitbar und kann Hero-Zahlen stark verzerren.

Ebenfalls richtig:

- B1-Q durfte `capped` nicht mit Drift verschmelzen.
- B1-Q musste mehr als `standard` messen.
- `render_nodes` darf nicht identisch mit `explicitMemberObjects` gesetzt werden.
- Memory sollte zumindest indikativ berichtet werden.
- B2 braucht Teststruktur, auch wenn `shopper-aggregate` noch nicht existiert.

### 3.2 Was am Review falsch oder unvollstaendig war

Die Review-Annahme zu `qualifiedLegs` war gegen den aktuellen Code falsch. In `calculateRankStates` werden QL als aktive direkte Member-Beine berechnet. Bronze- und Diamond-Beine sind separate Felder. Der Patch setzte QL dagegen auf Bronze+-Beine. Dadurch blieb die Aggregat-Root zu niedrig eingestuft, oft `Member`/`Builder`, obwohl der Tree `Diamond` oder `1*Diamond` liefert.

Ausserdem verglich der Patch in B1-Q globale Phase-Summen mit Root-Auszahlungen. Das erzeugt extrem hohe Phase-Diffs, die zwar eine echte Warnung ausloesen, aber als Vergleichsmetrik falsch sind. Der Vergleich wurde auf Root-Phase-Beitraege umgestellt.

## 4. Finaler Testlauf

Finaler Lauf:

```powershell
npm test -- benchmarks/b1-aggregate-path/b1-engine.test.ts benchmarks/b1-aggregate-path/b1-quality.test.ts benchmarks/b2-shopper-aggregation/b2-correctness.test.ts benchmarks/b2-shopper-aggregation/edge-cases.test.ts benchmarks/b2-shopper-aggregation/b2-performance.test.ts benchmarks/b2-shopper-aggregation/b2-scale.test.ts
```

Ergebnis:

- 6 Test-Dateien bestanden
- 6 Tests bestanden
- 13 Tests bewusst geskippt
- Laufzeit: ca. 176 Sekunden

Die geskippten Tests betreffen den noch nicht implementierten `shopper-aggregate`-Modus. Die B2-Sanity-Tests laufen.

## 5. B1-E Performance nach Integration

B1-E bleibt sehr deutlich unter den Schwellen.

| Set | Strategie | Median | p95 | Bewertung |
|---|---|---:|---:|---|
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

- Die Two-Path-Idee bleibt performance-seitig bestaetigt.
- Selbst die plan-naehere Aggregatlogik ist rechnerisch trivial schnell.
- Memory-Werte sind jetzt in der CSV enthalten, aber ohne `--expose-gc` nur ein Indikator.

## 6. B1-Q Erkenntnisse nach Integration

### 6.1 Wachstum und Volumen

Weiterhin positiv:

- Member-Diff: 0%
- Shopper-Diff: 0%
- Volumen-Diff: 0%

Das Wachstum ist also weiter exakt mit dem Tree-Pfad gekoppelt.

### 6.2 Root-Provision und Status

Jahr 10:

| Set | Strategie | Root-Diff | Aggregat-Rang | Tree-Rang | Drift |
|---|---|---:|---|---|---|
| P1 | standard | 886.905% | Member | Bronze | Fail |
| P2 | standard | 14.643% | Bronze | Diamond | Fail |
| P2 | dirichlet avg | 28.119% | Builder | Diamond | Fail |
| P2 | momentum avg | 22.421% | Builder | 1*Diamond | Fail |
| P4 | standard | 63.672% | Silver | Diamond | Fail |

Vor Cap, Jahr 6:

| Set | Strategie | Root-Diff | Aggregat-Rang | Tree-Rang | Drift |
|---|---|---:|---|---|---|
| P2 | standard | 494.924% | Bronze | Diamond | Fail |
| P4 | standard | 420.435% | Bronze | Diamond | Fail |

### 6.3 Was wurde besser?

P2 Jahr 10 Standard:

- Vorher Root-Diff: 503.606%
- Nach Integration und Korrektur: 14.643%

Das ist eine reale Verbesserung der Root-Gesamtsumme im Default-Endjahr.

### 6.4 Was wurde schlechter oder blieb schlecht?

P1 wurde deutlich schlechter:

- Vorher P1 Jahr 10 Root-Diff: 7.998%
- Nach Integration: 886.905%

Das zeigt, dass die neue Root-Phase-1-Approximation bei kleinen Netzwerken massiv ueberzieht.

P2/P4 Jahr 6 bleiben vor Cap massiv falsch:

- P2 Jahr 6: 494.924%
- P4 Jahr 6: 420.435%

Das widerlegt die Annahme, dass die Restdrift nur ein Cap-Artefakt ist.

Die Phase-Aufteilung ist weiterhin falsch:

- Phase 1 wird stark ueberschaetzt.
- Phase 2 wird oft stark unterschaetzt oder zu spaet/null angesetzt.
- Phase 3 ist im Aggregat oft 0, obwohl der Tree Phase-3-Anteile liefern kann.

Root-Gesamtsumme kann dadurch gelegentlich naeher liegen, aber aus kompensierenden Fehlern. Das ist nicht belastbar.

## 7. Geaenderte Architektur-Erkenntnis

Vor dem Review:

- "Aggregatpfad schnell; Root-Provision und Rank noch zu grob."

Nach Review und Re-Run:

- "Aggregatpfad schnell; Wachstum/Volumen exakt; Root-Gesamtsumme kann mit plan-naeherer Logik naeher kommen, aber Phase- und Statusmodell sind strukturell noch nicht robust."

Das ist eine wichtigere und haertere Aussage. Die Zielarchitektur bleibt moeglich, aber der B1-Provisionsteil darf nicht als verifiziert gelten.

## 8. Konsequenz fuer UX und Produkt

Fuer Slider/Chart:

- Member, Shopper, Volumen koennen live und glaubwuerdig angezeigt werden.
- Root-Provision darf aktuell nur als `Projected` erscheinen.
- Status/Rang aus dem Aggregatpfad darf nicht als exakter Status angezeigt werden.
- Phase-Details duerfen im Fast Chart nicht als belastbare Aufteilung verkauft werden.

Fuer Diagramm/Diagnose:

- Tree-Pfad bleibt notwendig fuer Status, Beine, Phase-Details und Root-Provision.
- B2 Shopper-Aggregation bleibt der naechste wichtige Schritt, damit der Tree-Pfad schneller wird.

## 9. B2 Stand

Integriert wurden:

- B2-C Korrektheitsstruktur
- B2-P Performance-Struktur
- B2-S Skalierungsstruktur
- 10 Edge Cases als geskipptes Testgeruest plus aktiver Spec-Sanity-Test

Noch nicht moeglich:

- echte B2-C/P/S Messung, weil `simulationMode: 'shopper-aggregate'` im Core noch nicht existiert.

Geklaerte Fachregeln sind im Code dokumentiert:

- Wenn ein Member churnt, rutschen Shopper zum Parent.
- Shopper-Volumen zaehlt zu QGV.
- AV bleibt nur Eigenverbrauch des Members.

## 10. Naechste Empfehlung

Nicht weiter an Root-Heuristiken drehen.

Stattdessen:

1. B2 `shopper-aggregate`-Modus implementieren.
2. Tree-Pfad durch Shopper-Aggregation beschleunigen.
3. Fast Aggregatpfad fuer Slider zunaechst auf Wachstum, Volumen, Caps und Projektion begrenzen.
4. Root-Provision im Fast-Pfad entweder:
   - als klar markierte Projektion zeigen, oder
   - ueber Tree/Worker nach Commit nachreichen.

Der Versuch, Phase 1/2/3 und Root-Provision rein analytisch im Aggregatpfad exakt genug zu approximieren, ist nach diesen Messungen riskanter als vorher angenommen.

## 11. Ehrliches Urteil

Das Review-Paket hat die Benchmark-Infrastruktur verbessert und echte Schwachstellen aufgedeckt. Es hat aber die fachliche Genauigkeit der B1-Provisionslogik nicht final geloest.

Die wichtigste Verbesserung ist nicht eine bessere Zahl, sondern eine bessere Diagnose:

**B1-E ist gruen. B1-Q ist rot.**  
Damit ist die naechste Architekturentscheidung klarer: Fast Path fuer UX ja, aber Verguetungswahrheit weiter ueber Tree/Diagnosepfad.
