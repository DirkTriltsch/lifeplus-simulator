# Netzwerkwachstum Konzept Erarbeitung 13 - Benchmark-Spezifikation B1/B2 (Final)

**Projekt:** lifeflow360 / LifePlus Simulator
**Datum:** Juni 2026
**Basis:** Erarbeitung 10 (Zielarchitektur), Erarbeitung 11 (erste B1/B2-Skizze), Erarbeitung 12 (überarbeitete Spec) plus elf Korrekturpunkte
**Status:** Ersetzt Dokumente 11 und 12 als Spec. Direkt umsetzbar.

---

## Inhalt

1. Zweck und Vorgehensweise
2. Gemeinsame Benchmark-Regeln
3. Parameter-Sets
4. B1 — Aggregat-Pfad
5. B2 — Shopper-Aggregation
6. Entscheidungsmatrix nach B1/B2
7. Implementierungsreihenfolge
8. Offene Entscheidungen — priorisiert
9. Zuständigkeiten und Zeitplan
10. Anhang — Code-Skelett-Struktur

---

## 1. Zweck und Vorgehensweise

### 1.1 Zweck

Dieses Dokument definiert die Benchmarks B1 und B2, die vor Schritt 4 (Lösungsmatrix) ausgeführt werden müssen. Sie liefern die Datenbasis, auf der die Lösungsmatrix-Bewertung steht. Ohne sie wäre Schritt 4 Spekulation.

### 1.2 Was diese Benchmarks leisten

- **B1 (Aggregat-Pfad)** — beantwortet drei Fragen: läuft der Slider-Pfad schnell genug (Engine), bleibt er fachlich nah genug am Tree-Pfad (Qualität/Drift), und ist die UX im Browser flüssig (UX/Render).
- **B2 (Shopper-Aggregation)** — beantwortet drei Fragen: bringt die Aggregation den erwarteten Performance-Gewinn (Performance), bleibt das Provisionsergebnis strukturell korrekt (Korrektheit), und wie weit skaliert der Tree-Pfad nach der Aggregation (Skalierung).

### 1.3 Was diese Benchmarks NICHT leisten

- Mobile-Performance (das ist B4, nach Schritt 4).
- Progressiver Diagrammaufbau (B5, nach Schritt 4).
- Bias-Detailstudie für alle Strategien × Größen (B3, parallel zu Schritt 4).

### 1.4 Drift-Disziplin

Pass/Fail-Schwellen werden in diesem Dokument festgelegt. Nach der Messung dürfen sie nicht verschoben werden. Eine fehlgeschlagene Messung ist Information, kein Anlass zur Schwellenanpassung.

---

## 2. Gemeinsame Benchmark-Regeln

### 2.1 Messmethodik

Standard für Performance-Messungen (B1-E, B1-U, B2-P, B2-S):

- 5 Warm-up-Runs (JIT, Cache, V8-Optimierung)
- 20 Mess-Runs
- Report von `min`, `median`, `p95`, `max`
- Pass/Fail primär über Median
- UX-Pass/Fail zusätzlich über p95 (Jank-Schutz)

Standard für Drift- und Korrektheits-Messungen (B1-Q, B2-C):

- **1 Run pro Vergleich** — Drift und Korrektheit sind nicht zeitabhängig
- Bei stochastischen Strategien (`dirichlet`, `momentum`): **10 Runs mit unterschiedlichen Seeds**, Mittelwert nehmen

Begründung der Abweichung: 20 Runs sind teuer, weil B1-Q den Tree-Pfad für P4 berechnet (mehrere Sekunden pro Run). Für Drift braucht es keinen Median — eine Messung pro Sample reicht.

### 2.2 Benchmark-Umgebung — Pflichtmetadaten pro Bericht

```text
timestamp
git_commit
git_branch
node_version
npm_version
browser_name           (für B1-U)
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

CPU/RAM manuell ergänzen, wenn nicht automatisiert ermittelbar.

### 2.3 Hardware-Setup

| Komponente | Vorgabe |
|---|---|
| Node-Version | ≥ 20 |
| Test-Runner | Vitest |
| OS | Windows (gleich wie Codex-Messung) |
| Browser für B1-U | Chrome (latest) via Playwright |
| CPU | bewusst nicht standardisiert; relative Vergleiche gelten unabhängig |

Speicher-Messungen mit `--expose-gc` und manuellem GC vor jeder Messung, sonst sind die Werte volatil.

### 2.4 Output-Dateien

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
benchmark_id, sub_test, parameter_set, strategy, seed, year, runs,
median_ms, p95_ms, min_ms, max_ms, passed,
members_per_year, shoppers_per_year, duplication_rate, churn_rate,
active_members, total_shoppers, total_objects, render_nodes,
orders_count, memory_mb, notes
```

---

## 3. Parameter-Sets

### 3.1 Pflicht-Sets

| Set | m | s | d | c | maxDirect | Zweck |
|---|:---:|:---:|:---:|:---:|:---:|---|
| P1 Konservativ | 1,0 | 2,0 | 0,5 | 25% | 29 | Untere realistische Last |
| P2 Default realistisch | 2,0 | 3,0 | 1,0 | 18% | 29 | Haupt-Default |
| P3 Default optimistisch | 2,0 | 3,0 | 1,0 | 0% | 29 | Stresstest, kein UX-Ziel |
| P4 Mittel aggressiv | 2,5 | 3,0 | 1,0 | 18% | 29 | Grenze für Tree-Pfad |
| P5 Aggressiv | 3,0 | 3,0 | 1,0 | 25% | 29 | Hoher Produktmodus |
| P6 Extrem | 4,0 | 3,0 | 1,0 | 30% | 29 | Cap-/Abbruchtest |

**P3 ist Stresstest, kein Produktmodus.** Die Mindest-Churn-Regel aus Doc 10 erzwingt im Produktmodus ab m=2,0 mindestens 10% Churn. P3 bricht diese Regel bewusst, um den Vergleich zur alten Codex-Messung herzustellen — darf aber nicht als UX-Ziel interpretiert werden.

### 3.2 Mindest-Churn-Regel (aus Doc 10)

| membersPerYear | Mindest-Churn |
|---:|---:|
| ≥ 2,0 | 10% |
| ≥ 2,5 | 18% |
| ≥ 3,0 | 25% |
| ≥ 3,5 | 30% |

### 3.3 Strategien und Seeds

- **B1-E** und **B1-U** laufen mit allen drei Strategien: `standard`, `dirichlet`, `momentum`.
- **B1-Q** läuft primär mit `standard`. Bei `dirichlet`/`momentum` wird gegen den **Mittelwert mehrerer Tree-Samples** (10 Seeds: 42, 43, 44, …, 51) verglichen, nicht gegen einen einzelnen Tree. Begründung: natürliche Stichproben-Streuung darf nicht als Aggregat-Drift fehlinterpretiert werden.
- **B2-C** läuft primär mit `standard`, Seed 42 (deterministisch, klarer Vergleich).
- **B2-S** läuft mit `standard`, Seed 42 plus zusätzlich `dirichlet` und `momentum` mit Seed 42.

---

## 4. B1 — Aggregat-Pfad

### 4.1 Ziel

B1 prüft, ob der Aggregat-Pfad als Slider-Pfad tragfähig ist.

Wichtig: B1 ist nicht der exakte LifePlus-Vergütungsbaum. Er ist der schnelle Erwartungspfad. Er darf approximieren, muss aber:

- seine Abweichung explizit messen können
- die Abweichung im UI kennzeichnen können
- für Phase 1 sehr nah am Tree-Pfad bleiben (linear, kein Bias-Risiko)
- für Phase 2/3 dokumentiert toleriert abweichen können (Sättigungs-Bias laut Doc 10)

### 4.2 B1-E — Engine-Performance

#### Hypothese

Der Aggregat-Pfad berechnet alle Chart-/Hero-/Goal-Daten für 10 Jahre in unter 16 ms Median und unter 33 ms p95.

#### Sub-Funktionen

| Sub | Funktion | Inhalt | Median-Ziel | p95-Ziel |
|---|---|---|---:|---:|
| B1-E1 | `estimateNetworkAggregate` | Wachstum, Churn, Shopper, Volumen pro Jahr | <1 ms | <3 ms |
| B1-E2 | `estimateLevelDistribution` | Erwartete Level-/Bein-Verteilung | <3 ms | <6 ms |
| B1-E3 | `estimateRankDistribution` | Status-/Ranganteile je Jahr/Level | <3 ms | <7 ms |
| B1-E4 | `estimatePhase1Provision` | Erwartete Phase-1-Provision | <2 ms | <4 ms |
| B1-E5 | `estimatePhase2Phase3Provision` | Erwartete Phase-2/3-Provision | <5 ms | <10 ms |
| B1-E6 | `buildChartSeries` | Chart-Datenpunkte und Tooltip-Daten | <2 ms | <4 ms |
| B1-E-total | alle Engine-Schritte | kompletter Aggregat-Pfad | **<16 ms** | **<33 ms** |

Plus eigenständige Sub-Funktion für Root-Provision:

| Sub | Funktion | Inhalt | Median-Ziel | p95-Ziel |
|---|---|---|---:|---:|
| B1-E7 | `estimateRootProvision` | Erwartete Provision auf Root-Knoten (User-Einkommen) | <2 ms | <4 ms |

Begründung B1-E7: Die Root-Provision ist die zentrale Hero-Zahl der App. Sie folgt nicht trivial aus den anderen Sub-Funktionen, weil sie eigene Kompressions-Logik braucht (Phase-1-Stücke aller Ebenen flowen zur Root, Phase 2/3 via Kompression). Daher als eigene Funktion mit eigener Schwelle.

**Summe der Sub-Ziele:** 1+3+3+2+5+2+2 = 18 ms. Das überschreitet das Gesamt-Median-Ziel von 16 ms. **Auflösung:** B1-E7 läuft parallel zu B1-E4/E5 (gleiche Daten, andere Aggregation) und wird in der Gesamt-Messung nicht zusätzlich gezählt. Die seriellen Sub-Funktionen E1-E6 summieren zu 16 ms, was das Gesamt-Ziel erfüllt.

#### Pass/Fail

**B1-E bestanden, wenn:**

- P1 bis P5 im Produktmodus die Median-Ziele aller Sub-Funktionen einhalten.
- P1 bis P5 die p95-Ziele einhalten.
- P6 darf p95 überschreiten, muss aber als Cap-/Stressfall markiert werden.
- Keine P1-P5-Messung überschreitet 16 ms Median oder 33 ms p95 in der Gesamt-Funktion.

**B1-E fehlgeschlagen, wenn:**

- P2 (Haupt-Default) Median >16 ms oder p95 >33 ms.
- `estimatePhase2Phase3Provision` ist nicht sinnvoll ohne Tree-Berechnung implementierbar.
- Eine benötigte UI-Größe (z.B. Goal-Erreichung) erfordert Tree-Berechnung, weil der Aggregat-Pfad sie nicht liefern kann.

#### Algorithmus-Anforderungen

`estimateNetworkAggregate` muss mindestens diese Modellfaktoren abbilden:

- `membersPerYear` (auch gebrochen, z.B. 2,5)
- `shoppersPerYear` (auch gebrochen)
- `duplicationRate`
- `churnRate` mit Mindest-Churn-Regel
- `maxDirectMembersPerMember`
- 10 Jahre Simulationshorizont
- Member-Volumen pro Monat (IP)
- Shopper-Volumen pro Monat
- Shopper ohne Statusanstieg
- Getrennte Ausgabe: Member, Shopper, Objekte, Orders, Volumen

Pflicht-Output pro Jahr:

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

#### Algorithmus-Skizzen

**B1-E1 — estimateNetworkAggregate:**

```typescript
function estimateNetworkAggregate(params: ParameterSnapshot): AggregateYearSnapshot[] {
  const results: AggregateYearSnapshot[] = [];
  let active = 1;           // Root
  let totalShoppers = 0;

  // Mindest-Churn-Regel anwenden
  const effectiveChurn = applyMandatoryChurnFloor(params.membersPerYear, params.churnRate);

  for (let year = 1; year <= params.years; year++) {
    // Apportioning gebrochener Werte (deterministisch über Mod-Restwerte)
    const newMembers = active * params.membersPerYear * params.duplicationRate;
    const lostMembers = active * effectiveChurn;
    active = Math.floor(active + newMembers - lostMembers);

    // Cap (Doc 10)
    let capped = false;
    let capReason: string | undefined;
    if (active > MAX_EXACT_EFFECTIVE_MEMBERS) {
      active = MAX_EXACT_EFFECTIVE_MEMBERS;
      capped = true;
      capReason = 'effective_members_cap';
    }

    const newShoppers = active * params.shoppersPerYear;
    const lostShoppers = totalShoppers * effectiveChurn;
    totalShoppers = Math.floor(totalShoppers + newShoppers - lostShoppers);

    results.push({
      year,
      activeMembers: active,
      activeShoppers: totalShoppers,
      totalEffectivePersons: active + totalShoppers,
      explicitMemberObjects: active,
      shopperAggregateObjects: active,   // ein Aggregat pro Member
      estimatedOrdersPerMonth: active,   // ein aggregierter Beitrag pro Member/Monat
      memberMonthlyVolumeIp: active * MEMBER_VOLUME_IP,
      shopperMonthlyVolumeIp: totalShoppers * SHOPPER_VOLUME_IP,
      totalMonthlyVolumeIp: active * MEMBER_VOLUME_IP + totalShoppers * SHOPPER_VOLUME_IP,
      capped,
      capReason,
    });
  }
  return results;
}
```

Erwartung: O(years) = O(10), pure Arithmetik. Realistisch <0,5 ms. Schwelle 1 ms ist großzügig.

**B1-E2 — estimateLevelDistribution:**

```typescript
function estimateLevelDistribution(
  network: AggregateYearSnapshot[],
  params: ParameterSnapshot,
): LevelDistribution[] {
  // Pro Jahr und Ebene 0..L:
  //   membersByLevel[ebene] = Verteilung der activeMembers auf Ebenen
  // Berechnung: konsekutive Generationen aus duplicationRate und maxDirect
  //   ebene 0: Root + direkte Member-Erzeuger
  //   ebene 1: erste Generation der Recruits
  //   ...
  //   geometrisches Wachstum, gekappt durch maxDirect und Population
  // Branching-Faktor pro Ebene aus active(year-1) / active(year) abgeleitet
}
```

Erwartung: O(years × levels) = O(10 × 12) = 120 Operationen. Schwelle 3 ms.

**B1-E3 — estimateRankDistribution:**

```typescript
function estimateRankDistribution(
  network: AggregateYearSnapshot[],
  levels: LevelDistribution[],
  params: ParameterSnapshot,
): RankDistribution[] {
  // Pro Jahr und Ebene: Verteilung über Rang-Klassen
  // Input: erwartetes QGV pro Ebene, Rang-Schwellen aus Plan
  // Output: rankShareByLevel[ebene][rang] = Anteil
  // Algorithmus:
  //   1. Erwartetes QGV pro Knoten auf Ebene = personalVolume + subtreeVolume
  //   2. Bei Strategie mit Streuung: log-normale Verteilung der QGV
  //   3. P(Rang) = Integral der Verteilung über Rang-Schwellen
}
```

Erwartung: O(years × levels × ranks) = O(10 × 10 × 12) = 1200 Operationen. Schwelle 3 ms.

**B1-E4 — estimatePhase1Provision:**

```typescript
function estimatePhase1Provision(
  network: AggregateYearSnapshot[],
  levels: LevelDistribution[],
  ranks: RankDistribution[],
): Phase1ProvisionByYear[] {
  // Phase 1 ist linear, daher exakt im Mittel.
  // Pro Jahr:
  //   gesamtPhase1Pool = totalMonthlyVolumeIp * 12 * 0.40
  //   Verteilung auf Ebenen 1-3 nach Member/Shopper-Raten
  //   Kompression auf qualifizierte Uplines (Anteil pro Rang aus ranks)
}
```

Erwartung: O(years × 3 levels × ranks) = O(360) Operationen. Schwelle 2 ms.

**B1-E5 — estimatePhase2Phase3Provision:**

```typescript
function estimatePhase2Phase3Provision(
  network: AggregateYearSnapshot[],
  levels: LevelDistribution[],
  ranks: RankDistribution[],
): Phase23ProvisionByYear[] {
  // Phase 2/3 ist nicht-linear (Slot-Vergabe + Ein-Phase-Regel)
  // Approximation:
  //   1. Pro Order: erwartete Position des nächsten qualifizierten Diamond/Gold/Silber/Bronze in Upline
  //   2. Pro Slot: erwartete Allokation = P(Rang in passender Tiefe)
  //   3. Ein-Phase-Regel als Wahrscheinlichkeitsabzug
  // Wichtig: das ist Erwartungswert, NICHT pro-Sample exakt.
  // Bias-Quelle: Jensen-Ungleichung bei nicht-linearer Slot-Vergabe.
  // Genauigkeit wird in B1-Q gemessen, nicht hier.
}
```

Erwartung: O(years × levels × slots × ranks) = O(10 × 10 × 7 × 12) = 8400 Operationen. Schwelle 5 ms.

**B1-E6 — buildChartSeries:**

```typescript
function buildChartSeries(
  network: AggregateYearSnapshot[],
  phase1: Phase1ProvisionByYear[],
  phase23: Phase23ProvisionByYear[],
): ChartDataPoint[] {
  return network.map((n, i) => ({
    year: n.year,
    members: n.activeMembers,
    shoppers: n.activeShoppers,
    monthlyVolumeEur: n.totalMonthlyVolumeIp * IP_TO_EUR,
    monthlyProvisionEur: (phase1[i].total + phase23[i].total) * IP_TO_EUR,
    capped: n.capped,
    // ...
  }));
}
```

Erwartung: O(years) = O(10). Schwelle 2 ms.

**B1-E7 — estimateRootProvision:**

```typescript
function estimateRootProvision(
  network: AggregateYearSnapshot[],
  levels: LevelDistribution[],
  ranks: RankDistribution[],
): RootProvisionByYear[] {
  // Hero-Zahl: was bekommt die Root pro Jahr?
  // Pro Jahr:
  //   Phase 1 zur Root = Beitrag aller direkten Member + komprimierte Beiträge tieferer Ebenen
  //   Phase 2/3 zur Root = Slot-Allokation, wenn Root entsprechenden Rang hat
  //   Falls Root noch keinen Rang erreicht: Provision auf 0 (kein Bypass)
  // Output: rootProvision[year]
}
```

Erwartung: O(years × levels × ranks) = O(1200) Operationen. Schwelle 2 ms.

### 4.3 Gebrochene Sliderwerte

Gebrochene Werte (z.B. `membersPerYear = 2,5`) dürfen nicht zufällig gerundet werden.

**Pflicht:**

- Deterministisches Apportioning
- Gleiche Parameter erzeugen immer gleiche Ergebnisse
- Keine visuelle Sprunghaftigkeit bei 2,4 → 2 und 2,5 → 3

**Erlaubt:**

1. Erwartungswertrechnung im Aggregat-Pfad (Float bleibt Float)
2. Deterministisches Restwertverfahren über Jahre/Level
3. Seeded Apportioning nur im Tree-/Diagnose-Pfad

**Nicht erlaubt:**

- `Math.round(membersPerYear)` als globale Vereinfachung
- Nicht-deterministische Zufallsrundung im Slider-Pfad

### 4.4 B1-Q — Qualität und Drift

#### Ziel

B1-Q prüft, ob der schnelle Aggregat-Pfad fachlich nah genug am Tree-/Diagnose-Pfad bleibt — zumindest in Szenarien unterhalb des Tree-Caps.

#### Vergleichsbasis

Für P1, P2 und P4 wird zusätzlich ein Tree-Pfad berechnet, sofern der Cap nicht greift.

Pro Jahr verglichen:

- `activeMembers`
- `activeShoppers`
- `totalMonthlyVolumeIp`
- Statusverteilung (`rankShareByLevel`)
- Phase-1-Provision
- Phase-2-Provision
- Phase-3-Provision
- Root-Provision
- Anzahl qualifizierter Beine je Statusklasse (falls aus Tree ableitbar)

#### Strategie-Behandlung

- **standard:** Tree ist deterministisch = Erwartungswert. Vergleich direkt mit 1 Run.
- **dirichlet / momentum:** Tree ist Sample. Vergleich gegen **Mittelwert von 10 Tree-Runs** mit unterschiedlichen Seeds (42, 43, …, 51). So wird natürliche Stichproben-Streuung nicht als Aggregat-Drift fehlinterpretiert.

#### Mess-Methodik

**1 Run pro Vergleich** (keine 20). Drift ist nicht zeitabhängig. Bei `dirichlet`/`momentum` werden die 10 Tree-Samples gemittelt, dann mit dem Aggregat verglichen.

#### Fehlerklassen

| Klasse | Bedeutung | UI-Kennzeichnung |
|---|---|---|
| Exact | Identisch oder Rundungsfehler | Keine Warnung |
| Expected | Kleine erwartete Abweichung | „Erwartungswert" |
| Projected | Gröbere Schätzung | „Projektion" |
| Capped | Ergebnis bewusst begrenzt | „Cap aktiv" |

#### Toleranzen

| Messgröße | Pass (Klasse A) | Warnung (B) | Fail (C) |
|---|---:|---:|---:|
| Member-Anzahl | <1% | 1-5% | ≥5% |
| Shopper-Anzahl | <1% | 1-5% | ≥5% |
| Gesamtvolumen/IP | <0,5% | 0,5-2% | ≥2% |
| Statusverteilung | <5% je Klasse | 5-15% | ≥15% |
| Phase 1 | <1% | 1-5% | ≥5% |
| Phase 2 | <5% | 5-15% | ≥15% |
| Phase 3 | <10% | 10-25% | ≥25% |
| Root-Provision | <10% | 10-25% | ≥25% |

Konsistent zu den Bias-Klassen A/B/C aus Doc 10.

#### Pass/Fail

**B1-Q bestanden, wenn:**

- P1 und P2 keine Fail-Toleranz verletzen
- P4 höchstens bei Phase 3 oder Root-Provision in Fail läuft (dann automatisch als „Projektion" gekennzeichnet)
- UI-Kennzeichnung aus der Fehlerklasse ableitbar

**B1-Q fehlgeschlagen, wenn:**

- P2 Phase 1, Gesamtvolumen oder Member-Anzahl in Fail-Toleranz
- P2 Phase 2/3 so stark abweicht, dass keine sinnvolle UI-Erklärung möglich ist
- Aggregat-Pfad liefert keine konsistente Fehlerklasse

#### Eskalations-Stufen bei B1-Q Fail

| Stufe | Was scheitert | Konsequenz |
|---|---|---|
| 1 | Phase 2/3 in Warnung (5-15% / 10-25%) | UI-Kennzeichnung „Erwartungswert" — keine Architektur-Änderung |
| 2 | Phase 2/3 in Fail (≥15% / ≥25%), aber Phase 1 ok | UI-Kennzeichnung „Projektion", explizite Fehlerklasse pro Wert |
| 3 | Phase 1 oder Gesamtvolumen in Fail | Aggregat-Modell für Phase 1 überarbeiten. Phase 1 ist linear und muss exakt im Mittel sein. Wenn nicht, liegt ein Implementierungsfehler oder ein nicht-erfasster Plan-Effekt vor |
| 4 | Auch nach Korrektur Phase 1 weiter in Fail | Two-Path-Architektur ist nicht UX-tauglich. Architektur muss in Schritt 3 revidiert werden |

### 4.5 B1-U — UX und Chart-Rendering

#### Ziel

B1-U prüft die tatsächliche Slider-Interaktion im Browser.

#### Hypothese

Slider-Bewegungen bleiben flüssig:

- Hero-KPI Update p95 <50 ms
- Chart Update p95 <50 ms
- Long Tasks >50 ms während Drag: maximal 1
- Keine sichtbare Blockade >100 ms

(Hypothese ist auf 50 ms angepasst, weil Recharts realistisch 30-50 ms pro Re-render kostet. Im Code kann durch Throttling während Drag noch optimiert werden.)

#### Messung via Playwright

Zu messen:

- Slider Input Event bis Hero-KPI aktualisiert
- Slider Input Event bis Chart Preview aktualisiert
- Slider-Drag über 2 Sekunden mit 30-60 Input Events
- Anzahl dropped frames oder Long Tasks >50 ms
- React Commit-Zeit, wenn messbar (`onRender` Profiler)

#### Pass/Fail

| Metrik | Pass | Warnung | Fail |
|---|---:|---:|---:|
| Hero preview p95 | <50 ms | 50-100 ms | >100 ms |
| Chart preview p95 | <50 ms | 50-100 ms | >100 ms |
| Long Tasks >50 ms pro Drag | 0-1 | 2-4 | >4 |
| Sichtbare Blockade | keine | kurz | deutlich |

#### Wenn B1-E besteht, B1-U aber scheitert

Engine ist korrekt, aber UI-Strategie muss angepasst werden:

- Chart während Drag vereinfachen (weniger Serien, keine Animationen)
- Tooltip/Animation während Drag deaktivieren
- Recharts durch Canvas oder leichtgewichtiges SVG ersetzen
- Teure Provision-Layer erst nach Slider-Commit aktualisieren
- Stale-while-revalidate nutzen

---

## 5. B2 — Shopper-Aggregation im Tree-Pfad

### 5.1 Ziel

B2 prüft, ob Shopper aus dem expliziten Personenbaum entfernt und als Umsatz-/Anzahl-Aggregat pro Member geführt werden können, **ohne fachliche Ergebnisse zu verändern**.

B2 löst nicht die Slider-UX (das ist B1). B2 verbessert den Tree-/Diagnose-Pfad und reduziert die `calculateTreeCompensation`-Last.

### 5.2 Annahmen über Shopper-Modellierung

**Pflicht:**

- Shopper-Volumen muss in denselben Volumenperioden ankommen wie vorher.
- Churn muss pro Jahr/Periode identisch abbildbar sein.
- Inaktive Member mit weiterlaufenden Shoppern müssen fachlich definiert sein (siehe Sektion 8, offene Entscheidung 1).
- Aggregation darf keine Kompressions-Logik umgehen.

### 5.3 B2-C — Korrektheit

#### Vergleichs-Objekte

Vergleich nicht nur über Provisionssummen, sondern strukturell:

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

#### Korrektheits-Toleranzen

| Messgröße | Toleranz |
|---|---:|
| Phase 1 Summe | <0,01 € absolute Differenz pro Jahr |
| Phase 2 Summe | <0,01 € absolute Differenz pro Jahr |
| Phase 3 Summe | <0,01 € absolute Differenz pro Jahr |
| Rank-State je Node | identisch |
| Status je Node | identisch |
| AV je Node | <0,01 IP absolute Differenz |
| QGV je Node | <0,01 IP absolute Differenz |
| Qualifizierte Beine je Node | identisch |
| Root-Provision | <0,01 € absolute Differenz pro Jahr |
| Maximale Node-Provision | <0,01 € absolute Differenz |

Toleranz-Einheit ist immer **absolute Differenz**, nicht prozentual oder pro IP. 0,01 € Toleranz fängt Float-Rundungen ab, lässt aber strukturelle Verschiebungen nicht durch.

#### Falls Shopper-Volumen Status/QGV beeinflusst

Wenn der LifePlus-Plan vorsieht, dass Shopper-Volumen in QGV/Status einfließt, bleibt Aggregation erlaubt — aber das aggregierte Volumen muss exakt in diese Berechnung einfließen. Die Behauptung „Phase 2/3 nicht betroffen" gilt erst, wenn Rank-State, Status, AV, QGV und qualifizierte Beine identisch sind.

#### Pass/Fail

**B2-C bestanden, wenn:**

- Alle Toleranzen für P1 und P2 eingehalten
- Alle Edge Cases (Sektion 5.4) bestehen
- Keine Phase wird durch Aggregation strukturell anders berechnet

**B2-C fehlgeschlagen, wenn:**

- Rank-State oder Status pro Node abweichen
- AV oder QGV pro Node abweichen
- Kompression greift anders
- Eine Provisionsphase >0,01 € abweicht, ohne dass die Abweichung fachlich erklärt und bewusst akzeptiert ist

### 5.4 Edge Cases

**Pflicht-Fälle:**

| Fall | Erwartung |
|---|---|
| Member mit 0 Shoppern | identisch zur Baseline |
| Member mit 1 Shopper | identisch zur Baseline |
| Member mit 2,5 Shopper/Jahr | deterministisch konsistent |
| Member mit 500 Shoppern | numerisch stabil |
| Shopper churnt, Member bleibt | identische Volumenreduktion |
| Member churnt, Shopper bleiben fachlich aktiv | Kompressions-/Upline-Regel korrekt |
| Member churnt, Shopper churnen mit | korrekt nach definierter Regel (siehe offene Entscheidung 1) |
| Shopper startet im selben Jahr wie Member | identisches Timing |
| Shopper-Volumen unter/über Schwellenwert | korrekte Rate, falls Plan differenziert |
| Root mit Shoppern | keine Sonderfehler |

**Offene fachliche Entscheidung, die VOR Implementierung fixiert werden muss:**

> Was passiert mit Shoppern, wenn ihr zugehöriger Member churnt?

Mögliche Varianten:

1. Shopper churnen mit dem Member.
2. Shopper bleiben aktiv und werden komprimiert/upline-zugeordnet.
3. Shopper bleiben als Volumen am ehemaligen Member-Knoten, aber der Member ist für Status/Provision inaktiv.

**B2-C kann erst exakt bewertet werden, wenn diese Regel feststeht.** Siehe Sektion 8.

### 5.5 B2-P — Performance

#### Hypothese

Shopper-Aggregation reduziert:

- Explizite Objekte im Tree
- Order-Loop-Kosten
- `calculateTreeCompensation`-Zeit
- Speicherbedarf

#### Baseline

Aktueller Code, unverändert:

- Member als `SimPerson`
- Shopper als `SimPerson`
- Shopper erzeugen Orders
- Compensation iteriert über Member- und Shopper-Orders

#### Aggregierter Pfad

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

#### Mess-Punkte

- `runSimulation`
- Tree-Aufbau
- Order-/Volume-Aufbau
- `calculateTreeCompensation`
- Rank-State-Berechnung
- **Speicherverbrauch (als Indikator, kein Pass/Fail-Status)**
- Objekt-Anzahl
- Order-Anzahl

#### Pass/Fail für P2

| Metrik | Pass | Warnung | Fail |
|---|---:|---:|---:|
| Compensation-Speedup | ≥2,0× | 1,5-2,0× | <1,5× |
| Gesamt-Speedup | ≥1,5× | 1,2-1,5× | <1,2× |
| Objektreduktion | ≥40% | 20-40% | <20% |
| Speicherreduktion (Indikator) | ≥25% berichten | 10-25% berichten | <10% berichten |

**Speicher-Messung:** Indikativ, nicht Pass/Fail-relevant. `process.memoryUsage()` ist GC-abhängig volatil. Wir messen mit `--expose-gc` und manuellem `global.gc()` vor jeder Messung, aber treffen keine Pass/Fail-Entscheidung daran — nur Berichterstattung.

**Wichtig:** Auch ein bestandener B2-P bedeutet nicht, dass Tree-Berechnung slider-fähig ist. B2-P verbessert den Tree-Pfad, ändert aber nicht seine Tier-Klasse.

### 5.6 B2-S — Skalierung

#### Ziel

P2 allein reicht nicht. B2-S prüft, wo der Tree-Pfad praktisch kippt.

#### Pflicht-Messungen

| Set | Erwartung |
|---|---|
| P1 | muss schnell und exakt laufen |
| P2 | muss für Diagnose brauchbar laufen |
| P4 | entscheidet Tree-Cap |
| P5 | wahrscheinlich Cap-/Warnbereich |
| P6 | Abbruch-/Cap-Test, keine Vollberechnung erforderlich |

#### Pass/Fail

| Metrik | Ziel für Diagnose | Warnung | Fail |
|---|---:|---:|---:|
| Tree-Aufbau P2 | <1 s | 1-3 s | >3 s |
| Compensation P2 | <1 s | 1-3 s | >3 s |
| Gesamt P2 | <2 s | 2-5 s | >5 s |
| Gesamt P4 | <5 s | 5-15 s | >15 s |
| Speicher P4 | stabil | hoher GC | Out-of-memory / Freeze |

**Interpretation:**

- P2 sollte für Diagnose nach Commit angenehm sein.
- P4 darf asynchron laufen, muss aber abbrechbar und erklärbar sein.
- P5/P6 dürfen nicht einfach den Browser blockieren. Sie müssen früh in einen Cap-/Projektionsmodus wechseln.

### 5.7 B2 Ergebnis-Format

CSV minimal:

```text
benchmark_id, parameter_set, strategy, seed, year,
baseline_objects, aggregated_objects,
baseline_orders, aggregated_orders,
baseline_run_sim_ms, aggregated_run_sim_ms,
baseline_comp_ms, aggregated_comp_ms,
baseline_memory_mb, aggregated_memory_mb,
comp_speedup, total_speedup,
phase1_diff, phase2_diff, phase3_diff,
rank_states_equal, status_equal, av_max_diff, qgv_max_diff,
qualified_legs_max_diff, root_provision_diff,
passed, notes
```

---

## 6. Entscheidungsmatrix nach B1/B2

Pass/Fail-Kombinationen und ihre Konsequenzen:

| Ergebnis | Bedeutung | Konsequenz |
|---|---|---|
| B1-E pass, B1-Q pass, B1-U pass | Aggregat-Pfad ist belastbar | Zielarchitektur bestätigt; Schritt 4 startet mit klarer Datenbasis |
| B1-E pass, B1-Q Stufe 1 | Schnell + Phase 2/3 mild abweichend | UI-Kennzeichnung „Erwartungswert"; keine Architektur-Änderung |
| B1-E pass, B1-Q Stufe 2 | Schnell + Phase 2/3 stark abweichend | UI-Kennzeichnung „Projektion"; Schritt 4 läuft mit Bias-Klassen B/C |
| B1-E pass, B1-Q Stufe 3 | Phase 1 driftet | Aggregat-Modell für Phase 1 überarbeiten, B1 erneut |
| B1-E pass, B1-Q Stufe 4 | Auch nach Korrektur Phase 1 in Fail | Two-Path-Architektur nicht tragfähig; Schritt 3 revidieren |
| B1-E pass, B1-U fail | Engine schnell, UI träge | Chart-/React-Strategie ändern; Engine nicht anfassen |
| B1-E fail | Slider-Pfad zu langsam | Aggregat-Modell vereinfachen, Lookup/Worker/Preview-Strategie |
| B2-C pass, B2-P pass | Shopper-Aggregation übernehmen | Tree-Pfad umbauen, Implementierung freigegeben |
| B2-C pass, B2-P Warnung | Fachlich korrekt, kaum schneller | weitere Tree-Optimierung nötig (SoA, Map-Lookup, etc.) |
| B2-C pass, B2-P fail | Fachlich korrekt, kein Performance-Gewinn | Aggregation lohnt sich nicht, alte Modellierung beibehalten |
| B2-C fail | Aggregation fachlich nicht sicher | Shopper-Aggregation neu modellieren oder aufgeben |
| B2-S fail bei P4/P5 | Tree-Cap niedriger setzen | Projection/Diagram-Cap früher aktivieren in Doc 10 §4.3 |

---

## 7. Implementierungsreihenfolge

```
1. Benchmark-Harness und Ergebnis-Format bauen.
2. B1-E minimal implementieren (Algorithmus-Skizzen aus 4.2.5).
3. B1-Q für P1/P2 gegen vorhandenen Tree-Pfad spiegeln.
4. B1-U mit aktuellem Chart oder isolierter Benchmark-Route messen.
5. B2-C zuerst als Korrektheits-Test implementieren.
6. B2-P erst nach bestandener Korrektheit messen.
7. B2-S als Scale-Sweep laufen lassen.
8. Ergebnis-Bericht schreiben.
9. Danach erst Schritt 4 / Lösungsmatrix finalisieren.
```

Begründung:

- Wenn B2-C scheitert, ist Performance egal.
- Wenn B1-Q scheitert, ist B1-E nur ein schneller, falscher Pfad.
- Wenn B1-U scheitert, muss die UX-Strategie angepasst werden, auch wenn die Engine gut ist.

---

## 8. Offene Entscheidungen — priorisiert

### 8.1 Blockierend (muss VOR Implementierung entschieden sein)

| # | Frage | Warum blockierend |
|---|---|---|
| 1 | Was passiert mit Shoppern, wenn ihr Member churnt? | B2-C kann ohne diese Regel nicht implementiert werden (Edge Cases 5.4) |
| 2 | Zählt Shopper-Volumen zu AV/QGV/Status oder nur zu Phase-1-Volumen? | B2-C-Toleranzen für AV/QGV-Vergleich hängen davon ab |

### 8.2 Beeinflusst Interpretation (sollte vor Auswertung entschieden sein)

| # | Frage | Warum interpretationsrelevant |
|---|---|---|
| 3 | Wird Root-Provision im Slider-Pfad als erwarteter Wert oder als Projektion dargestellt? | Bestimmt, ob B1-Q Stufe 1 oder Stufe 2 als „okay" gilt |
| 4 | Darf P3 ohne Mindest-Churn nur Stresstest sein, oder bleibt es als Expert-Modus erhalten? | Wenn Expert-Modus geplant ist, müssen P3-Ergebnisse in der Matrix anders gewichtet werden |

### 8.3 Architektur, später (nicht B1/B2-blockierend)

| # | Frage | Frist |
|---|---|---|
| 5 | Ab welcher Node-Zahl wird Tree-/Diagramm-Berechnung automatisch gekappt? | Datenbasis kommt aus B2-S, Entscheidung nach Auswertung |
| 6 | Soll Chart-Rendering während Drag alle Serien zeigen oder nur eine reduzierte Preview? | Datenbasis kommt aus B1-U |

**Empfehlung:** Punkte 1 und 2 müssen vor dem nächsten Implementierungsschritt geklärt sein. Punkte 3-4 können während der Implementierung angegangen werden, müssen aber vor der Auswertung in Schritt 4 stehen. Punkte 5-6 entstehen aus den Benchmark-Ergebnissen selbst.

---

## 9. Zuständigkeiten und Zeitplan

### 9.1 Vorschlag für Aufteilung

| Aktivität | Wer | Aufwand |
|---|---|---:|
| TypeScript-Skelette für B1-E1 bis B1-E7 (Algorithmus-Stubs) | Claude (Vorbereitung) | 0,5 Tag |
| Benchmark-Harness und CSV-Writer | User | 0,5 Tag |
| B1-E Implementierung und Messung | User | 1-1,5 Tage |
| B1-Q Implementierung und Messung | User | 1 Tag |
| B1-U Playwright-Setup und Messung | User | 0,5-1 Tag |
| B2 Code-Modifikation (Shopper aggregieren) | User | 0,5-1 Tag |
| B2-C Korrektheits-Tests | User | 0,5 Tag |
| B2-P/B2-S Performance-Messungen | User | 0,5 Tag |
| Ergebnis-Bericht erstellen | gemeinsam | 0,5 Tag |
| **Summe** | | **6-7 Tage** |

### 9.2 Vor-Aussetzungen

- Punkte 1 und 2 aus Sektion 8.1 sind entschieden (Shopper-Churn-Regel, Shopper-Volumen-Zugehörigkeit)
- Aktueller Codebase ist auf Stand, der die Messung erlaubt (insbesondere `simulationMode: 'person-tree'` lauffähig)

### 9.3 Erwartete Ergebnisse-Lieferung

Nach Abschluss der Benchmarks:

- 6 CSV-Dateien (eine pro Sub-Benchmark) im Repo unter `/benchmarks/results/2026-06/`
- 1 zusammenfassender Markdown-Bericht (`benchmark-report.md`)
- Klare Pass/Fail-Aussagen pro Sub-Benchmark
- Entscheidungsmatrix-Verortung jeder Lösung

---

## 10. Anhang — Code-Skelett-Struktur

```
/benchmarks
  ├─ shared/
  │   ├─ benchmark.ts             // benchmark() Hilfsfunktion mit 5+20 Runs
  │   ├─ benchmark-env.ts         // Metadaten-Sammlung
  │   ├─ csv-writer.ts
  │   └─ report-writer.ts
  │
  ├─ b1-aggregate-path/
  │   ├─ algorithms/
  │   │   ├─ estimateNetworkAggregate.ts        // B1-E1
  │   │   ├─ estimateLevelDistribution.ts       // B1-E2
  │   │   ├─ estimateRankDistribution.ts        // B1-E3
  │   │   ├─ estimatePhase1Provision.ts         // B1-E4
  │   │   ├─ estimatePhase2Phase3Provision.ts   // B1-E5
  │   │   ├─ buildChartSeries.ts                // B1-E6
  │   │   └─ estimateRootProvision.ts           // B1-E7
  │   ├─ b1-engine.bench.ts
  │   ├─ b1-quality.bench.ts
  │   ├─ b1-ux.spec.ts            // Playwright
  │   └─ parameter-sets.ts
  │
  ├─ b2-shopper-aggregation/
  │   ├─ baseline-compensation.ts        // unmodifizierter Code-Wrapper
  │   ├─ aggregated-compensation.ts      // mit Shopper-Aggregation
  │   ├─ b2-performance.bench.ts
  │   ├─ b2-correctness.test.ts
  │   ├─ b2-scale.bench.ts
  │   └─ edge-cases.test.ts
  │
  └─ results/
      └─ 2026-06/
          ├─ b1-engine-results.csv
          ├─ b1-quality-results.csv
          ├─ b1-ux-results.csv
          ├─ b2-performance-results.csv
          ├─ b2-correctness-results.csv
          ├─ b2-scale-results.csv
          └─ benchmark-report.md
```

---

## Anhang B — Diff-Tabelle Doc 12 → Doc 13

| Bereich | Doc 12 | Doc 13 |
|---|---|---|
| B1-E Median-Summe | 2+3+4+2+5+2 = 18 ms (passt nicht zu 16 ms Gesamt) | 1+3+3+2+5+2 = 16 ms (konsistent) |
| B1-E7 estimateRootProvision | nicht vorhanden | als eigene Sub-Funktion mit Schwelle |
| B2-C Toleranz-Einheit | „0,01 EUR/IP" (mehrdeutig) | „0,01 € absolute Differenz pro Jahr" |
| B1-U Hypothese vs. Tabelle | Hypothese <33 ms, Tabelle <50 ms | Beide <50 ms (konsistent) |
| B1-Q Strategie-Behandlung | „läuft mit allen drei Strategien" (mehrdeutig) | standard direkt; dirichlet/momentum gegen Mittelwert von 10 Tree-Samples |
| Algorithmus-Skizzen | nur Pflicht-Inputs | TypeScript-Skizzen für alle 7 Sub-Funktionen |
| B1-Q Fail-Behandlung | knappe Zeile in Sektion 6 | 4-stufige Eskalations-Tabelle |
| Offene Entscheidungen | unsortierte Liste | 3 Gruppen: blockierend / interpretationsrelevant / später |
| Zuständigkeiten | nicht angesprochen | Tabelle mit Aufwand-Schätzung |
| Speicher-Messung | „Speicherreduktion ≥25% = Pass" | Indikator ohne Pass/Fail (GC-volatil) |
| B1-Q Mess-Methodik | 20 Runs implizit | 1 Run pro Vergleich (Drift, nicht Performance) |

---

**Status am Ende dieses Dokuments:** Benchmark-Spezifikation ist umsetzbar. Vor Implementierungsstart müssen Sektion 8.1 (zwei blockierende Entscheidungen) und Sektion 9.2 (Code-Stand) geklärt sein.
