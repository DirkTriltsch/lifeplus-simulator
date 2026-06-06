# Netzwerkwachstum Konzept Erarbeitung 12 - Benchmark-Spezifikation B1 und B2 ueberarbeitet

**Projekt:** lifeflow360 / LifePlus Simulator  
**Datum:** Juni 2026  
**Basis:** Erarbeitung 10, Erarbeitung 11, Kurzreview zu 10/11  
**Zweck:** Belastbare, umsetzbare Benchmark-Spezifikation fuer B1 und B2, bevor die Loesungsmatrix und Zielimplementierung final entschieden werden.

---

## 1. Ziel der Ueberarbeitung

Die bisherige Spezifikation B1/B2 war ein guter Start, hatte aber drei Risiken:

1. B1 konnte zu leicht bestehen, weil der schnelle Aggregatpfad zwar gemessen, aber nicht ausreichend gegen das fachliche Modell gespiegelt wurde.
2. B2 konnte zu leicht bestehen, weil nur Provisionssummen verglichen wurden, nicht aber Status, Rank-State, AV/QGV und Strukturannahmen.
3. UX wurde teilweise als Engine-Thema behandelt, obwohl fuer Slider-Performance die gesamte Interaktion zaehlt: Berechnung, State-Update, Chart-Render, Frame-Zeit und Ausreisser.

Diese ueberarbeitete Spezifikation trennt deshalb:

- **B1-E:** Engine-Performance des Aggregatpfads
- **B1-Q:** Qualitaet/Drift des Aggregatpfads gegen Tree-/Diagnosepfad
- **B1-U:** UX-/Chart-Performance im Browser
- **B2-P:** Performance der Shopper-Aggregation im Tree-Pfad
- **B2-C:** fachliche Korrektheit der Shopper-Aggregation
- **B2-S:** Skalierung des Tree-Pfads nach Shopper-Aggregation

Damit sind die Benchmarks nicht nur schnell messbar, sondern auch entscheidungsfaehig.

---

## 2. Gemeinsame Benchmark-Regeln

### 2.1 Grundsatz

Benchmarks duerfen keine Architekturentscheidung bestaetigen, die sie nicht wirklich pruefen. Deshalb gilt:

- Performance allein reicht nicht.
- Summen allein reichen nicht.
- Ein Default-Szenario reicht nicht.
- Median allein reicht nicht fuer UX.
- Ein bestandener Tree-Benchmark ersetzt keinen Slider-Benchmark.

### 2.2 Messmethodik

Jede Messung laeuft mit:

- 5 Warm-up-Runs
- 20 Mess-Runs
- Report von `min`, `median`, `p95`, `max`
- Pass/Fail primaer ueber Median
- UX-Pass/Fail zusaetzlich ueber p95

Begruendung:

- Median zeigt typische Engine-Leistung.
- p95 zeigt Jank-Risiko.
- Max zeigt Ausreisser durch GC, Layout oder Browser-Last.

### 2.3 Benchmark-Umgebung

Jeder Ergebnisbericht muss diese Metadaten enthalten:

```text
timestamp
git_commit
git_branch
node_version
npm_version
browser_name
browser_version
os
cpu_model
logical_cores
ram_total_gb
build_mode
test_runner
warmup_runs
measurement_runs
```

Wenn CPU/RAM nicht automatisiert ermittelbar sind, werden sie manuell im Bericht erfasst.

### 2.4 Output-Dateien

Vorgeschlagene Struktur:

```text
benchmarks/
  shared/
    benchmark.ts
    benchmark-env.ts
    csv-writer.ts
    report-writer.ts
  b1-aggregate-path/
    b1-engine.bench.ts
    b1-quality.bench.ts
    b1-ux.spec.ts
    parameter-sets.ts
  b2-shopper-aggregation/
    b2-performance.bench.ts
    b2-correctness.test.ts
    b2-scale.bench.ts
    edge-cases.test.ts
  results/
    2026-06/
      b1-engine-results.csv
      b1-quality-results.csv
      b1-ux-results.csv
      b2-performance-results.csv
      b2-correctness-results.csv
      b2-scale-results.csv
      benchmark-report.md
```

CSV-Spalten minimal:

```text
benchmark_id,sub_test,parameter_set,strategy,seed,year,runs,
median_ms,p95_ms,min_ms,max_ms,passed,
members_per_year,shoppers_per_year,duplication_rate,churn_rate,
active_members,total_shoppers,total_objects,render_nodes,
orders_count,memory_mb,notes
```

---

## 3. Parameter-Sets

### 3.1 Pflicht-Sets

Diese Sets werden fuer B1 und B2 soweit sinnvoll verwendet.

| Set | m | s | d | c | maxDirect | Zweck |
|---|---:|---:|---:|---:|---:|---|
| P1 Konservativ | 1.0 | 2.0 | 0.5 | 25% | 29 | Untere realistische Last |
| P2 Default realistisch | 2.0 | 3.0 | 1.0 | 18% | 29 | Haupt-Default |
| P3 Default optimistisch | 2.0 | 3.0 | 1.0 | 0% | 29 | Vergleich ohne Churn-Pflicht |
| P4 Mittel aggressiv | 2.5 | 3.0 | 1.0 | 18% | 29 | Grenze fuer Tree-Pfad |
| P5 Aggressiv | 3.0 | 3.0 | 1.0 | 25% | 29 | hoher Produktmodus |
| P6 Extrem | 4.0 | 3.0 | 1.0 | 30% | 29 | Cap-/Abbruchtest |

### 3.2 Churn-Regel

Die Produktlogik erzwingt:

| membersPerYear | Mindest-Churn |
|---:|---:|
| >= 2.0 | 10% |
| >= 2.5 | 18% |
| >= 3.0 | 25% |
| >= 3.5 | 30% |

Benchmark-Regel:

- **Produktmodus:** mit Mindest-Churn.
- **Stresstest:** ohne Mindest-Churn, aber klar als nicht-produktiver Stressfall markiert.

P3 ist bewusst ein Stresstest/Altvergleich und darf nicht als UX-Ziel fuer V1 interpretiert werden.

### 3.3 Strategien und Seeds

B1 laeuft mit:

- `standard`
- `dirichlet`
- `momentum`

B2-Korrektheit laeuft primaer mit:

- `standard`, Seed 42

B2-Skalierung laeuft zusaetzlich mit:

- `dirichlet`, Seed 42
- `momentum`, Seed 42

Wenn Strategien deterministisch ohne Seed sind, wird `seed = none` dokumentiert.

---

## 4. B1 - Aggregatpfad

### 4.1 Ziel

B1 prueft, ob der Aggregatpfad fuer Slider, Hero-KPIs, Chart und Goals schnell genug und fachlich brauchbar ist.

Wichtig: B1 ist nicht der exakte LifePlus-Verguetungsbaum. B1 ist der schnelle Erwartungspfad. Er darf approximieren, muss seine Abweichung aber explizit messen und im UI kennzeichnen koennen.

### 4.2 B1-E - Engine-Performance

#### Hypothese

Der Aggregatpfad berechnet fuer 10 Jahre alle benoetigten Chart-/Hero-/Goal-Daten in unter 16 ms Median und unter 33 ms p95.

#### Gemessene Subfunktionen

| Sub | Funktion | Inhalt | Median-Ziel | p95-Ziel |
|---|---|---|---:|---:|
| B1-E1 | `estimateNetworkAggregate` | Wachstum, Churn, Shopper, Umsatz pro Jahr | <2 ms | <4 ms |
| B1-E2 | `estimateLevelDistribution` | erwartete Level-/Bein-Verteilung | <3 ms | <6 ms |
| B1-E3 | `estimateRankDistribution` | Status-/Ranganteile je Jahr/Level | <4 ms | <8 ms |
| B1-E4 | `estimatePhase1Provision` | erwartete Phase-1-Provision | <2 ms | <4 ms |
| B1-E5 | `estimatePhase2Phase3Provision` | erwartete Phase-2/3-Provision | <5 ms | <10 ms |
| B1-E6 | `buildChartSeries` | Chart-Datenpunkte und Tooltip-Daten | <2 ms | <4 ms |
| B1-E-total | alle Engine-Schritte | kompletter Aggregatpfad | <16 ms | <33 ms |

#### Pass/Fail

B1-E ist bestanden, wenn:

- P1 bis P6 im Produktmodus die Median-Ziele einhalten.
- P1 bis P5 im Produktmodus die p95-Ziele einhalten.
- P6 darf p95 ueberschreiten, muss aber korrekt als Cap-/Stressfall markiert werden.
- Kein Default-Szenario P2 ueberschreitet 16 ms Median oder 33 ms p95.

B1-E ist fehlgeschlagen, wenn:

- P2 Median >16 ms.
- P2 p95 >33 ms.
- `estimatePhase2Phase3Provision` nicht sinnvoll implementierbar ist.
- Die Engine zwar schnell ist, aber benoetigte UI-Daten nur durch nachtraegliche Tree-Berechnung erhaeltlich sind.

### 4.3 B1-E Algorithmus-Anforderungen

`estimateNetworkAggregate` darf nicht die triviale Formel aus Dokument 11 unveraendert uebernehmen, sondern muss mindestens diese Modellfaktoren abbilden:

- `membersPerYear`
- gebrochene Sliderwerte, z.B. 2.5
- `shoppersPerYear`
- gebrochene Shopperwerte, z.B. 2.5
- `duplicationRate`
- `churnRate`
- Mindest-Churn-Regel
- `maxDirectMembersPerMember`
- 10 Jahre Simulationshorizont
- Member-Umsatz pro Monat/IP
- Shopper-Umsatz pro Monat/IP
- Shopper ohne Statusanstieg
- getrennte Ausgabe von Membern, Shoppern, Objekten, Orders, Umsatz

Pflichtausgabe pro Jahr:

```typescript
type AggregateYearSnapshot = {
  year: number;
  activeMembers: number;
  activeShoppers: number;
  totalEffectivePersons: number;
  explicitMemberObjects: number;
  shopperAggregateObjects: number;
  estimatedOrdersPerMonth: number;
  memberMonthlyVolumeIp: number;
  shopperMonthlyVolumeIp: number;
  totalMonthlyVolumeIp: number;
  capped: boolean;
  capReason?: string;
};
```

### 4.4 Gebrochene Sliderwerte

Gebrochene Werte duerfen nicht zufaellig gerundet werden.

Pflicht:

- deterministisches Apportioning
- gleiche Parameter erzeugen immer gleiche Ergebnisse
- keine visuelle Sprunghaftigkeit durch harte Rundung bei 2.4 -> 2 und 2.5 -> 3

Erlaubte Verfahren:

1. Erwartungswertrechnung im Aggregatpfad.
2. Deterministisches Restwertverfahren ueber Jahre/Level.
3. Seeded Apportioning nur im Tree-/Diagnosepfad.

Nicht erlaubt:

- `Math.round(membersPerYear)` als globale Vereinfachung
- nicht-deterministische Zufallsrundung im Sliderpfad

### 4.5 B1-Q - Qualitaet und Drift

#### Ziel

B1-Q prueft, ob der schnelle Aggregatpfad fachlich nah genug am Tree-/Diagnosepfad bleibt, zumindest in Szenarien, die unterhalb des Tree-Caps liegen.

#### Vergleichsbasis

Fuer P1, P2 und P4 wird zusaetzlich ein Tree-/Diagnosepfad berechnet, sofern der Cap nicht greift.

Verglichen werden pro Jahr:

- activeMembers
- activeShoppers
- totalMonthlyVolumeIp
- Statusverteilung
- Phase-1-Provision
- Phase-2-Provision
- Phase-3-Provision
- Root-/Top-Knoten-Provision, falls vorhanden
- Anzahl qualifizierter Beine je Statusklasse, falls aus Tree ableitbar

#### Fehlerklassen

| Klasse | Bedeutung | UI-Kennzeichnung |
|---|---|---|
| Exact | identisch oder Rundungsfehler | keine Warnung |
| Expected | kleine erwartete Abweichung | "Erwartungswert" |
| Projected | groebere Schaetzung | "Projektion" |
| Capped | Ergebnis bewusst begrenzt | "Cap aktiv" |

#### Toleranzen

| Messgroesse | Ziel | Warnung | Fail |
|---|---:|---:|---:|
| Member-Anzahl | <1% | >=1% | >=5% |
| Shopper-Anzahl | <1% | >=1% | >=5% |
| Gesamtumsatz/IP | <0.5% | >=0.5% | >=2% |
| Statusverteilung | <5% je Statusklasse | >=5% | >=15% |
| Phase 1 | <1% | >=1% | >=5% |
| Phase 2 | <5% | >=5% | >=15% |
| Phase 3 | <10% | >=10% | >=25% |
| Root-Provision | <10% | >=10% | >=25% |

Interpretation:

- Phase 1 sollte sehr nah sein, weil sie linearer ist.
- Phase 2/3 duerfen groessere Abweichungen haben, muessen aber sichtbar als Erwartung/Projektion gekennzeichnet werden.
- Wenn Root-Provision stark abweicht, darf sie im Sliderpfad nicht als exakter Wert verkauft werden.

#### Pass/Fail

B1-Q ist bestanden, wenn:

- P1 und P2 keine Fail-Toleranz verletzen.
- P4 hoechstens bei Phase 3 oder Root-Provision in Fail laeuft und dann automatisch als Projektion markiert wird.
- Die UI-Kennzeichnung aus der Fehlerklasse ableitbar ist.

B1-Q ist fehlgeschlagen, wenn:

- P2 Phase 1, Gesamtumsatz oder Member-Anzahl die Fail-Toleranz verletzt.
- P2 Phase 2/3 so stark abweicht, dass keine sinnvolle UI-Erklaerung moeglich ist.
- Der Aggregatpfad keine konsistente Fehlerklasse liefern kann.

### 4.6 B1-U - UX und Chart-Rendering

#### Ziel

B1-U prueft die tatsaechliche Slider-Interaktion im Browser.

#### Hypothese

Slider-Bewegungen bleiben fluessig:

- Input-to-preview p95 <50 ms
- Chart update p95 <33 ms
- keine sichtbare Blockade >100 ms

#### Messung via Playwright

Zu messen:

- Slider Input Event bis Hero-KPI aktualisiert
- Slider Input Event bis Chart Preview aktualisiert
- Slider Drag ueber 2 Sekunden mit 30-60 Input Events
- Anzahl dropped frames oder Long Tasks >50 ms
- React Commit-Zeit, wenn messbar

Pass/Fail:

| Metrik | Pass | Warnung | Fail |
|---|---:|---:|---:|
| Hero preview p95 | <50 ms | 50-100 ms | >100 ms |
| Chart preview p95 | <50 ms | 50-100 ms | >100 ms |
| Long Tasks >50 ms pro Drag | 0-1 | 2-4 | >4 |
| sichtbare Blockade | keine | kurz | deutlich |

Wenn B1-E besteht, B1-U aber scheitert, ist die Engine richtig, aber die UI-Strategie muss angepasst werden:

- Chart waehrend Drag vereinfachen
- Tooltip/Animation waehrend Drag deaktivieren
- Recharts durch Canvas oder leichtgewichtiges SVG ersetzen
- teure Provision-Layer erst nach Slider-Commit aktualisieren
- stale-while-revalidate nutzen

---

## 5. B2 - Shopper-Aggregation im Tree-Pfad

### 5.1 Ziel

B2 prueft, ob Shopper aus dem expliziten Personenbaum entfernt und als Umsatz-/Anzahl-Aggregat pro Member gefuehrt werden koennen, ohne fachliche Ergebnisse zu veraendern.

B2 loest nicht die Slider-UX. B2 verbessert den Tree-/Diagnosepfad.

### 5.2 B2-P - Performance

#### Hypothese

Shopper-Aggregation reduziert:

- explizite Objekte im Tree
- Order-Loop-Kosten
- `calculateTreeCompensation`-Zeit
- Speicherbedarf

#### Baseline

Baseline ist der aktuelle explizite Shopper-Pfad:

- Member als `SimPerson`
- Shopper als `SimPerson`
- Shopper erzeugen Orders
- Compensation iteriert ueber Member- und Shopper-Orders

#### Aggregierter Pfad

Zielzustand:

```typescript
type SimMemberNode = {
  id: string;
  parentId: string | null;
  joinedMonth: number;
  status?: string;
  ownMemberVolumeIpByMonth: number[];
  shopperCountByMonth: number[];
  shopperVolumeIpByMonth: number[];
};
```

Shopper sind keine `SimPerson` mehr. Sie erzeugen keinen eigenen Status, keine Downline und keine eigenen Tree-Knoten.

Pflicht:

- Shopper-Umsatz muss in denselben Volumenperioden ankommen wie vorher.
- Churn muss pro Jahr/Periode identisch abbildbar sein.
- Inaktive Member mit weiterlaufenden Shoppern muessen fachlich definiert sein.
- Aggregation darf keine Kompressionslogik umgehen.

### 5.3 B2-C - Korrektheit

#### Vergleichsobjekte

Vorher/Nachher werden nicht nur Provisionssummen verglichen, sondern:

```typescript
type CompensationComparison = {
  year: number;
  phase1TotalBefore: number;
  phase1TotalAfter: number;
  phase2TotalBefore: number;
  phase2TotalAfter: number;
  phase3TotalBefore: number;
  phase3TotalAfter: number;
  rankStatesEqual: boolean;
  statusByNodeEqual: boolean;
  avByNodeMaxDiff: number;
  qgvByNodeMaxDiff: number;
  qualifiedLegsMaxDiff: number;
  rootProvisionDiff: number;
  maxNodeProvisionDiff: number;
};
```

#### Korrektheitstoleranz

Da Shopper-Aggregation fachlich exakt sein sollte, gelten strenge Grenzen:

| Messgroesse | Toleranz |
|---|---:|
| Phase 1 gesamt | <0.01 EUR/IP je Jahr |
| Phase 2 gesamt | <0.01 EUR/IP je Jahr, wenn Shopper Phase 2 nicht beeinflussen |
| Phase 3 gesamt | <0.01 EUR/IP je Jahr, wenn Shopper Phase 3 nicht beeinflussen |
| Rank-State je Node | identisch |
| Status je Node | identisch |
| AV je Node | <0.01 IP |
| QGV je Node | <0.01 IP |
| qualifizierte Beine | identisch |
| Root-Provision | <0.01 EUR/IP |
| maximale Node-Provision | <0.01 EUR/IP |

Falls LifePlus fachlich vorsieht, dass Shopper-Umsatz Status/QGV beeinflusst, bleibt Aggregation erlaubt, aber dann muss der aggregierte Umsatz exakt in diese Berechnung einfliessen. Die Behauptung "Phase 2/3 nicht betroffen" darf erst gelten, wenn Rank-State, Status, AV/QGV und qualifizierte Beine identisch sind.

#### Pass/Fail

B2-C ist bestanden, wenn:

- alle obigen Toleranzen fuer P1 und P2 eingehalten werden
- alle Edge Cases bestehen
- keine Phase durch Aggregation strukturell anders berechnet wird

B2-C ist fehlgeschlagen, wenn:

- Rank-State oder Status abweichen
- AV/QGV abweichen
- Kompression anders greift
- eine Provisionsphase >0.01 abweicht, ohne dass die Abweichung fachlich erklaert und bewusst akzeptiert ist

Eine Abweichung <1 EUR/Jahr ist fuer B2-C nicht streng genug. Wenn Aggregation mathematisch exakt sein soll, muss sie nahezu identisch sein.

### 5.4 Edge Cases

Pflichtfaelle:

| Fall | Erwartung |
|---|---|
| Member mit 0 Shoppern | identisch zur Baseline |
| Member mit 1 Shopper | identisch zur Baseline |
| Member mit 2.5 Shopper/Jahr | deterministisch/erwartet konsistent |
| Member mit 500 Shoppern | numerisch stabil |
| Shopper churnt, Member bleibt | identische Volumenreduktion |
| Member churnt, Shopper bleiben fachlich aktiv | Kompressions-/Upline-Regel korrekt |
| Member churnt, Shopper churnen mit | korrekt nach definierter Regel |
| Shopper startet im selben Jahr wie Member | identisches Timing |
| Shopper-Umsatz unter/ueber Schwellenwert | korrekte Rate, falls Plan differenziert |
| Root mit Shoppern | keine Sonderfehler |

Offene fachliche Entscheidung, die vor Implementierung fixiert werden muss:

```text
Was passiert mit Shoppern, wenn ihr zugehoeriger Member churnt?
```

Moegliche Varianten:

1. Shopper churnen mit dem Member.
2. Shopper bleiben aktiv und werden komprimiert/upline-zugeordnet.
3. Shopper bleiben als Umsatz am ehemaligen Member-Knoten, aber der Member ist fuer Status/Provision inaktiv.

B2 kann erst exakt bewertet werden, wenn diese Regel feststeht.

### 5.5 B2-P Performance-Pass/Fail

Gemessen werden:

- `runSimulation`
- Tree-Aufbau
- Order-/Volume-Aufbau
- `calculateTreeCompensation`
- Rank-State-Berechnung
- Speicherverbrauch
- Objektanzahl
- Order-Anzahl

Pass/Fail fuer P2:

| Metrik | Pass | Warnung | Fail |
|---|---:|---:|---:|
| Compensation-Speedup | >=2.0x | 1.5x-2.0x | <1.5x |
| Gesamt-Speedup | >=1.5x | 1.2x-1.5x | <1.2x |
| Objektreduktion | >=40% | 20-40% | <20% |
| Speicherreduktion | >=25% | 10-25% | <10% |

Wichtig: Auch ein bestandener B2-P bedeutet nicht, dass Tree-Berechnung sliderfaehig ist.

### 5.6 B2-S - Skalierung

P2 allein reicht nicht. B2-S prueft, wo der Tree-Pfad praktisch kippt.

Pflichtmessungen:

| Set | Erwartung |
|---|---|
| P1 | muss schnell und exakt laufen |
| P2 | muss fuer Diagnose brauchbar laufen |
| P4 | entscheidet Tree-Cap |
| P5 | wahrscheinlich Cap-/Warnbereich |
| P6 | Abbruch-/Cap-Test, keine Vollberechnung erforderlich |

Pass/Fail:

| Metrik | Ziel fuer Diagnose | Warnung | Fail |
|---|---:|---:|---:|
| Tree-Aufbau P2 | <1 s | 1-3 s | >3 s |
| Compensation P2 | <1 s | 1-3 s | >3 s |
| Gesamt P2 | <2 s | 2-5 s | >5 s |
| Gesamt P4 | <5 s | 5-15 s | >15 s |
| Speicher P4 | stabil | hoher GC | Out-of-memory/Freeze |

Interpretation:

- P2 sollte fuer Diagnose nach Commit angenehm sein.
- P4 darf asynchron laufen, muss aber abbrechbar und erklaerbar sein.
- P5/P6 duerfen nicht einfach den Browser blockieren. Sie muessen frueh in einen Cap-/Projektionsmodus wechseln.

### 5.7 B2 Ergebnisformat

CSV minimal:

```text
benchmark_id,parameter_set,strategy,seed,year,
baseline_objects,aggregated_objects,
baseline_orders,aggregated_orders,
baseline_run_sim_ms,aggregated_run_sim_ms,
baseline_comp_ms,aggregated_comp_ms,
baseline_memory_mb,aggregated_memory_mb,
comp_speedup,total_speedup,
phase1_diff,phase2_diff,phase3_diff,
rank_states_equal,status_equal,av_max_diff,qgv_max_diff,
qualified_legs_max_diff,root_provision_diff,
passed,notes
```

---

## 6. Entscheidungsmatrix nach B1/B2

Nach Messung wird nicht nur "bestanden/nicht bestanden" bewertet, sondern eine Architekturentscheidung abgeleitet.

| Ergebnis | Bedeutung | Konsequenz |
|---|---|---|
| B1-E pass, B1-Q pass, B1-U pass | Aggregatpfad ist belastbar | Zielarchitektur bestaetigt |
| B1-E pass, B1-Q fail | schnell, aber fachlich zu ungenau | B1-Modell verbessern oder UI staerker als Projektion kennzeichnen |
| B1-E pass, B1-U fail | Engine schnell, UI traege | Chart-/React-Strategie aendern |
| B1-E fail | Sliderpfad zu langsam | Aggregatmodell vereinfachen, Lookup/Worker/Preview-Strategie |
| B2-C pass, B2-P pass | Shopper-Aggregation uebernehmen | Tree-Pfad umbauen |
| B2-C pass, B2-P fail | fachlich korrekt, aber kaum schneller | weitere Tree-Optimierung noetig |
| B2-C fail | Aggregation fachlich nicht sicher | Shopper-Aggregation neu modellieren oder aufgeben |
| B2-S fail bei P4/P5 | Tree-Cap niedriger setzen | Projection/Diagram-Cap frueher aktivieren |

---

## 7. Empfohlene Implementierungsreihenfolge

1. Benchmark-Harness und Ergebnisformat bauen.
2. B1-E minimal implementieren.
3. B1-Q fuer P1/P2 gegen vorhandenen Tree-Pfad spiegeln.
4. B1-U mit aktuellem Chart oder isolierter Benchmark-Route messen.
5. B2-C zuerst als Korrektheitstest implementieren.
6. B2-P erst nach bestandener Korrektheit messen.
7. B2-S als Scale-Sweep laufen lassen.
8. Ergebnisbericht schreiben.
9. Danach erst Schritt 4 / Loesungsmatrix finalisieren.

Begruendung:

- Wenn B2-C scheitert, ist Performance egal.
- Wenn B1-Q scheitert, ist B1-E nur ein schneller falscher Pfad.
- Wenn B1-U scheitert, muss die UX-Strategie angepasst werden, auch wenn die Engine gut ist.

---

## 8. Offene Entscheidungen vor Umsetzung

Diese Punkte muessen vor der Implementierung der Benchmarks entschieden oder explizit als Annahme dokumentiert werden:

1. Was passiert mit Shoppern, wenn ihr Member churnt?
2. Zaehlt Shopper-Umsatz zu AV/QGV/Status oder nur zu Phase-1-Umsatz?
3. Wird Root-Provision im Sliderpfad als erwarteter Wert oder als Projektion dargestellt?
4. Darf P3 ohne Mindest-Churn nur Stresstest sein, oder bleibt es als Expert-Modus erhalten?
5. Ab welcher Node-Zahl wird Tree-/Diagramm-Berechnung automatisch gekappt?
6. Soll Chart-Rendering waehrend Drag alle Serien zeigen oder nur eine reduzierte Preview?

Empfehlung:

- Fuer B1/B2 duerfen diese Fragen als dokumentierte Annahmen beantwortet werden.
- Fuer die Zielarchitektur muessen sie final entschieden werden.

---

## 9. Kurzbewertung der verbesserten Spezifikation

Diese Version macht B1/B2 strenger, aber auch aussagekraeftiger:

- B1 misst nicht mehr nur Geschwindigkeit, sondern auch fachliche Drift und echte Browser-UX.
- B2 misst nicht mehr nur Provisionssummen, sondern strukturelle Gleichheit.
- Skalierung wird nicht mehr aus dem Default abgeleitet, sondern explizit gemessen.
- Caps koennen spaeter datenbasiert gesetzt werden.
- Die spaetere Loesungsmatrix bekommt echte Entscheidungsdaten statt plausibler Annahmen.

Der wichtigste Effekt: Ein "gruenes" Ergebnis in B1/B2 waere danach wirklich belastbar. Und ein "rotes" Ergebnis waere nicht Scheitern, sondern genau die Information, die wir vor einer grossen Code-Ueberarbeitung brauchen.
