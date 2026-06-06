# Netzwerkwachstum Konzept Erarbeitung 11 - Benchmark-Spezifikation B1 und B2

**Projekt:** lifeflow360 — Multi-Brand MLM-Plattform
**Datum:** Juni 2026
**Vorgängerdokument:** Erarbeitung 10 (Review-Berücksichtigung und überarbeitete Zielarchitektur)
**Zweck:** Konkrete Test-/Mess-Spezifikation für die beiden Benchmarks, die vor Schritt 4 (Lösungsmatrix) ausgeführt werden müssen. Soll direkt umsetzbar sein.

---

## Inhalt

1. Anlass und Methodisches
2. Test-Umgebung — gemeinsame Basis
3. B1 — Aggregat-Pfad Performance
4. B2 — Shopper-Aggregation Validation
5. Reihenfolge, Dauer und Abhängigkeiten
6. Risiken und offene Punkte

---

## 1. Anlass und Methodisches

### 1.1 Anlass

Dokument 10 hat Two-Path als verpflichtende Architektur festgelegt: Aggregat-Pfad rettet die Slider-UX, Tree-Pfad liefert die Diagramm-Wahrheit. Diese Architektur steht und fällt mit zwei Annahmen:

- **Annahme 1:** Der Aggregat-Pfad ist tatsächlich in unter 16 ms berechenbar. Wenn nicht, ist Two-Path nicht UX-tauglich und wir müssen umdenken.
- **Annahme 2:** Shopper-Aggregation senkt die Tree-Pfad-Last so weit, dass auch der Tree-Pfad in den realistischen Caps läuft.

Beide Annahmen müssen vor Schritt 4 (Lösungsmatrix) durch echte Messungen belegt werden. Sonst ist Schritt 4 Spekulation.

### 1.2 Drift-Disziplin in Benchmarks

Bei Benchmarks ist die Gefahr, sich Ergebnisse schönzurechnen, besonders hoch. Drei Schutzmaßnahmen:

1. **Pass/Fail-Schwellen werden VOR der Messung festgelegt** — in diesem Dokument, schwarz auf weiß. Nach der Messung darf die Schwelle nicht verschoben werden.
2. **Mediane statt Einzelwerte.** Jede Messung wird mehrfach ausgeführt (10 Runs nach 3 Warm-up-Runs), nur der Median zählt.
3. **Vergleichbarkeit zur Codex-Messung wahren.** Setup ist identisch (Vitest/Node auf Windows), damit Ergebnisse direkt mit den 4,5 s aus Codex-Review vergleichbar sind.

### 1.3 Was diese Benchmarks NICHT leisten

- Sie messen **nicht** den Bias zwischen Aggregat- und Tree-Provision (das ist B3).
- Sie messen **nicht** Mobile-Performance (das ist B4).
- Sie validieren **nicht** den progressiven Diagrammaufbau (das ist B5).
- Sie sind **kein** Ersatz für die Bewertung in Schritt 4. Sie liefern nur die Datenbasis dafür.

---

## 2. Test-Umgebung — gemeinsame Basis

### 2.1 Hardware und Software

| Komponente | Vorgabe |
|---|---|
| Node-Version | ≥ 20 (gleich wie aktueller Codebase) |
| Test-Runner | Vitest (Konsistenz zu `profile-sim.test.ts`) |
| OS | Windows (gleich wie Codex-Messung) |
| Browser für Render-Tests | Chrome (latest), via Playwright |
| CPU-Performance | bewusst nicht standardisiert — Messung läuft auf Entwicklungs-Maschine. Relativ-Vergleiche gelten unabhängig von absoluten CPU-Zahlen |

### 2.2 Mess-Methodik

```typescript
function benchmark(name: string, fn: () => void, runs: number = 10, warmup: number = 3): BenchResult {
  // Warm-up runs (JIT, Cache, V8-Optimierung)
  for (let i = 0; i < warmup; i++) fn();

  // Echte Messungen
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);
  return {
    name,
    median: times[Math.floor(runs / 2)],
    p95:    times[Math.floor(runs * 0.95)],
    min:    times[0],
    max:    times[runs - 1],
    runs,
  };
}
```

**Wichtig:** Nur der Median geht in die Pass/Fail-Bewertung. p95 wird als Indikator für Streuung berichtet, ist aber nicht KO-relevant.

### 2.3 Output-Format

Alle Benchmark-Ergebnisse werden in eine gemeinsame CSV-Datei geschrieben:

```
benchmark_id, sub_test, parameter_set, runs, median_ms, p95_ms, min_ms, max_ms, passed
```

Plus ein Markdown-Bericht (`benchmark-results.md`), der die Ergebnisse pro Sub-Benchmark zusammenfasst und Pass/Fail klar ausweist.

---

## 3. B1 — Aggregat-Pfad Performance

### 3.1 Hypothese

Der Aggregat-Pfad — also alle Berechnungen, die Chart, Hero und Goals brauchen, ohne den Tree zu materialisieren — läuft für ein Default-Szenario in unter 16 ms (Tier 1).

### 3.2 Was wird gemessen

Fünf Sub-Benchmarks. Alle müssen einzeln passen, **und** die Summe muss unter 16 ms bleiben, sonst ist B1 KO.

| Sub | Inhalt | KO-Schwelle |
|---|---|---:|
| B1.1 | `estimateNetwork(params)` — Wachstumsmodell, pro-Jahr-Aggregate | <3 ms |
| B1.2 | `aggregateRankDistribution(params)` — Rang-Verteilung pro Ebene | <4 ms |
| B1.3 | `expectedProvisionPhase1(distribution)` — Erwartungswert Phase 1 | <2 ms |
| B1.4 | `expectedProvisionPhase2Phase3(distribution)` — Erwartungswert Phase 2/3 | <4 ms |
| B1.5 | `buildChartLine(years)` — Zusammenstellung für Recharts | <3 ms |
| B1-Summe | Alle 5 zusammen für 10 Jahre | <16 ms |

Plus ein separates Mess-Element:

| Sub | Inhalt | KO-Schwelle |
|---|---|---:|
| B1.6 | Recharts-Render-Zeit für aktualisierten Chart | <33 ms (2 Frames) |

B1.6 ist KO-Kriterium für die UX-Zielzeit, aber **nicht** KO für den Engine-Teil. Wenn die Engine in 16 ms bleibt und Recharts 50 ms braucht, ist die Architektur korrekt — das Render-Problem wäre ein Recharts-Optimierungs-Thema (z.B. Throttling während Drag).

### 3.3 Was wird NICHT gemessen

- Tree-Aufbau, Tree-Compensation, Diagramm-Render — alles Tree-Pfad-Themen.
- Bias zwischen Aggregat und Tree (das ist B3).
- Mobile-Performance.
- Memory-Verbrauch (kommt in B4 zur Cap-Kalibrierung).

### 3.4 Algorithmus-Spezifikation

Für die Benchmark-Implementierung sind diese Algorithmen nötig. Sie sind als **Skizze für den Benchmark-Prototypen** gedacht, nicht als finale Implementierung der Zielarchitektur.

#### B1.1 — estimateNetwork

```typescript
type YearAggregate = {
  year: number;
  activeMembers: number;
  totalShoppers: number;
  totalObjects: number;       // = activeMembers + 1 ShopperAggregate pro Member
  effectivePersons: number;   // = activeMembers + totalShoppers
};

function estimateNetwork(params: ParameterSnapshot): YearAggregate[] {
  const results: YearAggregate[] = [];
  let active = 1;        // Root
  let totalShoppers = 0;

  for (let year = 1; year <= params.years; year++) {
    // Apportioning gebrochener Slider-Werte (deterministisch)
    const newMembers = active * params.membersPerYear * params.duplicationRate;
    const lostMembers = active * params.churnRate;
    active = Math.floor(active + newMembers - lostMembers);

    const newShoppers = active * params.shoppersPerYear;
    const lostShoppers = totalShoppers * params.churnRate;
    totalShoppers = Math.floor(totalShoppers + newShoppers - lostShoppers);

    results.push({
      year,
      activeMembers: active,
      totalShoppers,
      totalObjects: active,      // Shopper-Aggregat ist Render-Knoten, kein Daten-Objekt
      effectivePersons: active + totalShoppers,
    });
  }
  return results;
}
```

**Erwartung:** O(years) = O(10), pure Arithmetik. Realistisch <1 ms. KO-Schwelle 3 ms ist sehr großzügig.

#### B1.2 — aggregateRankDistribution

```typescript
type RankDistribution = {
  year: number;
  byLevel: number[][];   // byLevel[ebene][rang] = Anteil
};

function aggregateRankDistribution(
  network: YearAggregate[],
  params: ParameterSnapshot
): RankDistribution[] {
  // Pro Jahr und Ebene: schätze, wieviel Prozent der Members auf welchem Rang sind.
  // Die Schätzung erfolgt aus Volumen-Verteilung und Rang-Schwellen,
  // nicht aus Tree-Inspektion.
  // Skizze:
  //  - Pro Ebene: erwartete QGV = activeMembers(ebene) * personalVolume + subtreeVolume
  //  - Verteilung um QGV-Mittel mit Strategie-Streuung
  //  - Anteil pro Rang = P(QGV überschreitet Rang-Schwelle)
  // ...
}
```

**Erwartung:** O(years × levels × ranks) = O(10 × 10 × 12) = 1.200 Operationen. KO-Schwelle 4 ms.

#### B1.3 — expectedProvisionPhase1

Phase 1 ist linear (Unilevel ohne Slot-Vergabe). Erwartungswert ist exakt berechenbar:

```typescript
function expectedProvisionPhase1(
  network: YearAggregate[],
  distribution: RankDistribution[]
): number[] {
  // Pro Jahr:
  // gesamtVolumenPhase1 = activeMembers * personalVolume * 12 (Monate)
  // Phase-1-Pool = 40% davon
  // Verteilung an Ebene 1-3 mit Member/Shopper-spezifischen Raten
  // Kompression: anteilig auf qualifizierte Uplines verteilt
  // ...
}
```

**Erwartung:** O(years × levels) = O(10 × 3) = 30 Operationen. KO-Schwelle 2 ms.

#### B1.4 — expectedProvisionPhase2Phase3

Phase 2/3 sind nicht-linear (Slot-Vergabe, Ein-Phase-Regel). Erwartungswert ist eine **Approximation**:

```typescript
function expectedProvisionPhase2Phase3(
  network: YearAggregate[],
  distribution: RankDistribution[]
): { phase2: number[]; phase3: number[] } {
  // Pro Jahr und Ebene ab 4:
  // Schätze, wieviele Slots im Mittel an welche Rangträger gehen
  // Approximation: ignoriert lokale Cluster-Effekte (das ist die Bias-Quelle)
  // Slot-Allokation deterministisch, Ein-Phase-Regel als Wahrscheinlichkeit
  // ...
}
```

**Erwartung:** O(years × levels × slots) = O(10 × 10 × 7) = 700 Operationen. KO-Schwelle 4 ms.

**Wichtig:** Die Genauigkeit dieser Approximation wird in B3 geprüft, nicht in B1. Hier zählt nur die Laufzeit.

#### B1.5 — buildChartLine

Triviale Aufgabe: aus den vier vorherigen Outputs eine Datenstruktur für Recharts bauen:

```typescript
function buildChartLine(years: YearAggregate[], provisions: ...): ChartDataPoint[] {
  return years.map(y => ({
    year: y.year,
    members: y.activeMembers,
    shoppers: y.totalShoppers,
    provisionTotal: provisions.phase1[y.year] + provisions.phase2[y.year] + ...,
    // ...
  }));
}
```

**Erwartung:** O(years) = O(10). KO-Schwelle 3 ms.

#### B1.6 — Recharts-Render

Separat im Browser via Playwright:

```typescript
test('chart render time', async ({ page }) => {
  await page.goto('http://localhost:5173/benchmark/chart');
  const t0 = await page.evaluate(() => performance.now());
  await page.evaluate((data) => window.updateChart(data), newData);
  await page.waitForFunction(() => window.lastRenderComplete === true);
  const t1 = await page.evaluate(() => performance.now());
  expect(t1 - t0).toBeLessThan(33);
});
```

### 3.5 Input-Parameter-Sets

Sechs Sets, ausgewählt um die wichtigsten Slider-Bereiche abzudecken:

| Set | m | d | c | s | Begründung |
|---|:---:|:---:|:---:|:---:|---|
| Konservativ | 1,0 | 0,5 | 0,25 | 2 | Sehr kleines Netzwerk, untere Slider-Grenze |
| Default-Realistisch | 2,0 | 1,0 | 0,18 | 3 | Neues Default nach Mindest-Churn-Regel |
| Default-Optimistisch | 2,0 | 1,0 | 0,00 | 3 | Alter Default ohne Mindest-Churn (Vergleich zur Codex-Messung) |
| Aggressiv | 2,5 | 1,0 | 0,18 | 3 | Mindest-Churn aktiv, mittlere Region |
| Hart-Aggressiv | 3,0 | 1,0 | 0,25 | 3 | Obere Hälfte mit Mindest-Churn |
| Extrem | 4,0 | 1,0 | 0,30 | 3 | Mindest-Churn aktiv, Cap-Bereich |

Jedes Set wird mit allen drei Strategien (standard / dirichlet / momentum) gemessen. Macht 18 Messpunkte für B1 insgesamt.

### 3.6 Pass/Fail-Kriterien

**B1 ist bestanden, wenn:**

1. Jeder Sub-Benchmark (B1.1 bis B1.5) erfüllt seine eigene KO-Schwelle (Median, nicht p95).
2. Die Summe der fünf Sub-Benchmarks bleibt für alle 18 Messpunkte unter 16 ms.
3. B1.6 (Recharts-Render) wird gemessen und berichtet, ist aber nicht KO für B1 selbst.

**B1 ist fehlgeschlagen, wenn:**

- Ein Sub-Benchmark überschreitet seine Schwelle in mehr als 3 von 18 Messpunkten (16% Toleranz für Ausreißer)
- ODER die Summe überschreitet 16 ms in mehr als 3 von 18 Messpunkten
- ODER eine Sub-Funktion ist überhaupt nicht implementierbar (Algorithmus zu komplex)

### 3.7 Wenn B1 fehlschlägt

Drei Eskalations-Stufen:

**Stufe 1 — Engine zu langsam, aber Reichweite gering:**
Wenn nur Extrem-Szenarien (m≥3) versagen, ist das tolerierbar. Über Mindest-Churn und Caps sind diese Szenarien ohnehin selten. Lösung: Caps anpassen, B1 für die akzeptierten Szenarien bestehen.

**Stufe 2 — Engine zu langsam im Default-Bereich:**
Wenn schon m=2 nicht in 16 ms läuft, ist Two-Path mit dem aktuellen Algorithmus nicht UX-tauglich. Optionen:
- B1.4 (Phase 2/3) ist meistens der teuerste Schritt. Vereinfachung möglich? Z.B. nur grobe Slot-Schätzung, exakte Phase 2/3 nur im Tree-Pfad.
- Lookup-Tabellen vorberechnen statt zur Laufzeit.
- Worker-Auslagerung der Engine, Hero/Chart aus Worker-Ergebnis.

**Stufe 3 — Engine fundamental zu langsam:**
Wenn auch B1.1 (estimateNetwork) >3 ms braucht — sehr unwahrscheinlich, weil pure Arithmetik — gibt es ein Architektur-Problem. Audit muss zurück zu Schritt 3 (SSOT) und prüfen, ob die Pfad-Trennung anders modelliert werden muss.

---

## 4. B2 — Shopper-Aggregation Validation

### 4.1 Hypothese

Wenn Shopper nicht als eigene Personen-Objekte mit Orders, sondern als aggregierte Zahlen pro Member-Knoten geführt werden, sinkt die `calculateTreeCompensation`-Laufzeit für das DefaultChurn18-Szenario um Faktor 2-3, **ohne dass sich das Provisionsergebnis Phase 1 verändert**.

### 4.2 Mess-Setup

| Komponente | Vorgabe |
|---|---|
| Szenario | DefaultChurn18 (m=2, s=3, d=1, c=0,18, 10 Jahre) |
| Seed | Fix (z.B. 42), beide Messungen müssen denselben Seed verwenden |
| Strategie | standard (deterministisch, für sauberen Vergleich) |
| Mess-Wiederholungen | 10 Runs nach 3 Warm-up-Runs, Median |
| Mess-Funktion | `runSimulation` + `calculateTreeCompensation` über alle 10 Jahresenden |

### 4.3 Vorgehen — Vorher und Nachher

#### Schritt 1 — Vorher-Messung (Baseline)

Der **aktuelle** Code wird unverändert vermessen. Erwartung anhand Codex:

| Mess-Punkt | Codex-Wert | Erwartung |
|---|---:|---:|
| runSimulation | 2.170 ms | ähnlich |
| calculateTreeCompensation | 2.332 ms | ähnlich |
| Summe | 4.502 ms | ~4,5 s |
| Aktive Objekte Jahr 10 | 29.132 | ähnlich |
| Effektive Member | 15.221 | exakt |
| Effektive Shopper | 22.816 | exakt |

Diese Werte werden als Referenz festgehalten. Wenn sie deutlich abweichen (>20%), muss das Setup geprüft werden, bevor B2 weitergeht.

#### Schritt 2 — Code-Änderung

Folgende Modifikationen am bestehenden Code:

```typescript
// VORHER (aktueller Code, schematisch)
type SimPerson = {
  id: string;
  kind: 'member' | 'shopper';
  parentId: string;
  // ...
};
// Shopper sind eigene SimPerson-Objekte
// Jeder Shopper generiert pro Monat eine eigene Order
function calculateTreeCompensation(tree: PersonTree, orders: Order[]) {
  for (const order of orders) {
    // ... Slot-Allokation entlang Upline
  }
}

// NACHHER (B2-Modifikation)
type SimPerson = {
  id: string;
  kind: 'member';                  // nur noch member
  parentId: string;
  shopperCount: number;            // NEU: aggregierte Zahl
  shopperVolume: number;           // NEU: Gesamtumsatz Shopper dieses Members
  // ...
};
// Shopper haben keine eigene SimPerson-Repräsentation mehr
// Pro Member: ein einziger aggregierter Shopper-Beitrag pro Monat
function calculateTreeCompensation(tree: PersonTree) {
  for (const node of tree.nodes) {
    if (node.shopperVolume > 0) {
      // ein einziger aggregierter Phase-1-Beitrag pro Member-Knoten und Monat
      // statt eine Order pro Shopper
    }
    // ... Member-Orders wie bisher
  }
}
```

**Erwarteter Effekt:** Der Hot-Loop in `calculateTreeCompensation` läuft auf 15k Member-Knoten statt 38k Personen-Objekten plus 22k separaten Shopper-Orders.

#### Schritt 3 — Nachher-Messung

Gleicher Seed, gleiches Szenario, gleiche Mess-Methodik. Ergebnis-Vergleich:

| Mess-Punkt | Vorher (erwartet) | Nachher (erwartet) | Verbesserungsfaktor |
|---|---:|---:|---:|
| runSimulation | ~2.170 ms | ~2.000 ms | ~1,1× (kleiner Effekt, weil Tree-Aufbau weiter läuft) |
| calculateTreeCompensation | ~2.332 ms | ~800-1.200 ms | ~2-3× |
| Summe | ~4.500 ms | ~2.800-3.200 ms | ~1,5× |
| Aktive Objekte | 29.132 | 15.221 | ~2× |

**Wichtig:** Der Erwartungs-Range ist breit, weil B2 prüfen soll, ob die Hypothese stimmt — nicht, ob ein exakter Zielwert erreicht wird.

### 4.4 Korrektheits-Validierung

Performance allein reicht nicht. Phase-1-Provision muss identisch bleiben.

#### Vergleich

Für jeden der 10 Jahresenden:

```typescript
const baselineProvision = calculateTreeCompensation_BEFORE(treeBefore);
const aggregatedProvision = calculateTreeCompensation_AFTER(treeAfter);

assert(Math.abs(baselineProvision.phase1Total - aggregatedProvision.phase1Total) < 0.01);
assert(Math.abs(baselineProvision.phase2Total - aggregatedProvision.phase2Total) < 0.01);
assert(Math.abs(baselineProvision.phase3Total - aggregatedProvision.phase3Total) < 0.01);
```

**Toleranz 0,01 €** — wegen Float-Rundungen, aber im Wesentlichen exakte Gleichheit.

#### Erwartung pro Phase

| Phase | Erwartung | Begründung |
|---|---|---|
| Phase 1 | **exakt gleich** | Lineare Verteilung. Eine Order mit Volumen V × 25 Shopper-Orders = 25 Orders mit V/25 + Aggregierte Order V/25 × 25. Mathematisch identisch. |
| Phase 2 | **exakt gleich** | Phase 2 wird nur durch Member-Orders ausgelöst, nicht durch Shopper-Orders. Daher von der Aggregation nicht betroffen. |
| Phase 3 | **exakt gleich** | Wie Phase 2. |

**Wenn eine Phase abweicht:** Die Hypothese ist falsch, und die Aggregation verändert das Provisionsergebnis. Dann muss B2 als fehlgeschlagen markiert werden und die Architektur muss prüfen, wo der Plan ein Sonderverhalten der Shopper-Orders vorsieht, das die Aggregation nicht erfassen kann.

#### Edge Cases

| Fall | Test |
|---|---|
| Member mit 0 Shoppern | Provision exakt wie vorher |
| Member mit sehr vielen Shoppern (z.B. 500) | Aggregation muss Float-stabil sein |
| Inaktiver Member mit aktiven Shoppern | Phase-1-Kompression muss korrekt greifen |
| Member im selben Jahr wie seine Shopper erscheinen | Aktivitäts-Logik korrekt |

Diese Edge Cases werden als zusätzliche Test-Cases neben dem Haupt-Vergleich aufgenommen.

### 4.5 Output-Format

CSV-Spalten:

```
test_case, year, baseline_runSim_ms, after_runSim_ms,
baseline_compensation_ms, after_compensation_ms,
baseline_phase1, after_phase1, phase1_diff_eur,
baseline_phase2, after_phase2, phase2_diff_eur,
baseline_phase3, after_phase3, phase3_diff_eur,
baseline_objects, after_objects, speedup_factor
```

Plus Bericht mit:
- Vorher/Nachher-Vergleichstabelle
- Speedup-Faktor (gesamt und pro Schritt)
- Korrektheits-Diff pro Phase (Summe und Maximum)
- Ja/Nein-Urteil zur Hypothese

### 4.6 Pass/Fail-Kriterien

**B2 ist bestanden, wenn:**

1. **Performance:** `calculateTreeCompensation`-Laufzeit sinkt um mindestens Faktor 1,5 (konservativ; Erwartung ist 2-3).
2. **Korrektheit Phase 1:** Maximale Abweichung pro Jahr <1 € (im Wesentlichen 0).
3. **Korrektheit Phase 2/3:** Maximale Abweichung pro Jahr <1 €.
4. **Alle Edge Cases bestanden.**

**B2 ist fehlgeschlagen, wenn:**

- Speedup-Faktor <1,3 (kein praktischer Gewinn)
- ODER eine Provisions-Abweichung >1 € pro Jahr (Plan-Spezialfall wird missachtet)
- ODER ein Edge Case führt zu falschen Ergebnissen

### 4.7 Wenn B2 fehlschlägt

**Speedup zu klein:**
Wenn Shopper-Aggregation nur 1,1× Speedup bringt statt 2-3×, ist die Annahme falsch. Andere Performance-Optimierungen müssen geprüft werden:
- Sind die Member-Orders der eigentliche Engpass?
- Ist `SimPerson` als Object zu schwer (Migration zu SoA / typed arrays)?
- Liegt es an `Map<string, SimPerson>`-Lookups?

**Korrektheits-Diff:**
Wenn Phase 1 bei aggregierten Shoppern abweicht, prüfen:
- Ist die Aggregations-Mathematik wirklich linear-äquivalent?
- Gibt es Kompressions-Regeln, die pro-Order-Verhalten brauchen?
- Sind alle Phase-1-Raten (Shopper vs. Member, ≤150 IP vs. ≥151 IP) korrekt behandelt?

In beiden Fällen ist B2 nicht „kaputt", sondern liefert die Information, dass die Architektur-Annahme nicht trägt — das ist der eigentliche Zweck des Benchmarks.

---

## 5. Reihenfolge, Dauer und Abhängigkeiten

### 5.1 Reihenfolge

```
1. B1 implementieren und ausführen
   ├─ wenn B1 fehlschlägt → Stufe 1/2/3 Eskalation, dann ggf. Schritt 3 revidieren
   └─ wenn B1 bestanden  → B2

2. B2 implementieren und ausführen
   ├─ wenn B2 fehlschlägt → andere Performance-Hebel suchen
   └─ wenn B2 bestanden  → Schritt 4 (Lösungsmatrix) starten
```

B1 zuerst, weil bei einem B1-Fehlschlag die Architektur fundamental neu bewertet werden muss. B2 ist nachgelagerte Optimierung — relevant, aber nicht architektur-bestimmend.

### 5.2 Erwartete Dauer

| Aktivität | Aufwand |
|---|---:|
| B1 Algorithmus-Prototyp implementieren | 0,5-1 Tag |
| B1 Messung und Auswertung | 0,5 Tag |
| B2 Code-Modifikation für Aggregation | 0,5-1 Tag |
| B2 Vergleichs-Messung und Auswertung | 0,5 Tag |
| Bericht und Dokumentation der Ergebnisse | 0,5 Tag |
| **Summe** | **2,5-3,5 Tage** |

### 5.3 Abhängigkeiten

- **B3 (Bias-Experiment)** kann parallel zu B1/B2 spezifiziert werden, sollte aber nicht parallel ausgeführt werden — B1-Ergebnisse beeinflussen, ob B3 überhaupt sinnvoll ist.
- **Schritt 4 (Lösungsmatrix)** wartet auf B1 und B2 bestanden.
- **B4 (Mobile) und B5 (progressiver Aufbau)** sind nach Schritt 4 angesiedelt.

---

## 6. Risiken und offene Punkte

### 6.1 Risiken

**(R1) B1 ist algorithmisch zu komplex.** Insbesondere B1.4 (Erwartungswert Phase 2/3) — Slot-Vergabe + Ein-Phase-Regel als geschlossene Formel ist nicht trivial. Mitigation: Vereinfachung erlauben (z.B. nur Phase 2 exakt, Phase 3 als grobe Prozent-Schätzung), wenn die Genauigkeit später in B3 eh validiert wird.

**(R2) B2-Aggregation berührt Phase-2/3-Code.** Auch wenn die Erwartung ist, dass Phase 2/3 nicht von Shopper-Orders abhängt, kann der aktuelle Code implizite Kopplungen haben. Mitigation: ausführliche Korrektheits-Tests, Edge Cases.

**(R3) Setup-Unterschiede zur Codex-Messung.** Codex hat auf Windows mit `profile-sim.test.ts` im Standard-Modus gemessen, was 0 Persons/Weight liefert. Wir messen im `simulationMode: 'person-tree'`. Wenn die Baseline-Werte stark von Codex' 4,5 s abweichen, muss das transparent berichtet werden.

**(R4) Falsche Hoffnung durch B2-Speedup.** Selbst wenn B2 Faktor 3 bringt, sinkt die Compensation-Zeit nur von 2,3 s auf ~800 ms. Das ist immer noch zu langsam für Slider-Drag. Mitigation: B2-Erfolg löst nicht das Slider-Problem (das löst B1). B2 macht nur den Tree-Pfad besser skalierbar.

### 6.2 Offene Klärungen

| # | Frage | Bemerkung |
|---|---|---|
| 1 | Soll B1.6 (Recharts-Render) als Pflicht-Teil von B1 oder als getrenntes Sub-Experiment laufen? | Vorschlag: Pflicht, aber kein KO-Kriterium für B1 |
| 2 | Welcher Seed wird für B2 verwendet? | Vorschlag: 42 (Konvention), Hauptsache deterministisch |
| 3 | Sollen die Messungen ohne offene Apps laufen (Background-CPU-Last)? | Vorschlag: ja, einmal mit nur Vitest aktiv |
| 4 | Wo werden die Ergebnis-Dokumente (`benchmark-results.md`, CSV) abgelegt? | Vorschlag: `/benchmarks/results/2026-06/` im Repo |
| 5 | Wer führt die Messungen aus — du selbst oder soll ich Code-Skelette vorbereiten? | Klärungsbedarf |

---

## 7. Anhang — Skelett-Struktur für den Benchmark-Code

```
/benchmarks
  ├─ b1-aggregate-path/
  │   ├─ algorithms/
  │   │   ├─ estimateNetwork.ts
  │   │   ├─ aggregateRankDistribution.ts
  │   │   ├─ expectedProvisionPhase1.ts
  │   │   ├─ expectedProvisionPhase2Phase3.ts
  │   │   └─ buildChartLine.ts
  │   ├─ b1.bench.ts
  │   └─ parameter-sets.ts
  │
  ├─ b2-shopper-aggregation/
  │   ├─ baseline.bench.ts        // unmodifizierter Code
  │   ├─ aggregated.bench.ts      // mit Shopper-Aggregation
  │   ├─ correctness.test.ts      // Phase-1/2/3-Diff-Tests
  │   └─ edge-cases.test.ts
  │
  ├─ shared/
  │   ├─ benchmark.ts             // benchmark() Hilfsfunktion
  │   ├─ csv-writer.ts
  │   └─ report-generator.ts
  │
  └─ results/
      └─ 2026-06/
          ├─ b1-results.csv
          ├─ b1-report.md
          ├─ b2-results.csv
          └─ b2-report.md
```

---

## Stand

**Vor Ausführung:** Spezifikation vollständig, Pass/Fail-Schwellen festgelegt.
**Nach Ausführung:** Datenbasis für Schritt 4 (Lösungsmatrix) verfügbar.
