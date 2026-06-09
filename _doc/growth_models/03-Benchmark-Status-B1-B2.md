# 03 — Benchmark-Status B1 und B2

**Stand:** 2026-06-09
**Konsolidiert aus:** Erarbeitung 13 (Final-Spec, jetzt im Archiv), Umsetzung Bericht §6, Erarbeitung 17/18 (P2.5, P4.1, Z16, K2).

> Dieses Dokument fasst den **aktuellen Status** und den **Folge-Backlog** zusammen. Die ausführliche frühere Spezifikation (Algorithmus-Skizzen, Toleranzen, Eskalations-Stufen) ist nicht mehr Teil dieser Doku und wird, falls erneut benötigt, von Grund auf neu erarbeitet.

---

## 1. B1 — Aggregat-Pfad

**Status: architektonisch obsolet.** Mit der Single-Path-Entscheidung (siehe [01 §1](01-Zielarchitektur.md#1-kernentscheidung-single-path-personenbaum-mit-debounce-ux)) ist der Aggregat-Pfad weder als Slider-Pfad noch als UI-Datenquelle vorgesehen.

### 1.1 Was war geplant

B1 sollte prüfen, ob der schnelle Aggregat-Pfad als Slider-Pfad tragfähig ist — Voraussetzung für die damals verfolgte Two-Path-Architektur:

- **B1-E** Engine-Performance (`estimateNetworkAggregate`, `estimateLevelDistribution`, `estimateRankDistribution`, `estimatePhase1Provision`, `estimatePhase2Phase3Provision`, `buildChartSeries`, `estimateRootProvision`) — Ziel < 16 ms Median.
- **B1-Q** Qualität/Drift gegen den Personenbaum-Pfad — Toleranzen je Messgröße (siehe Archiv Doc 13 §4.4).
- **B1-U** UX-/Chart-Rendering im Browser via Playwright.

### 1.2 Was gemessen wurde

| Sub | Ergebnis |
|---|---|
| **B1-E** | **pass** — P2-P5 unter 0,4 ms Median, p95 unter 3 ms (Standard/Dirichlet/Momentum). Aggregat-Pfad wäre für Live-Chart-Update schnell genug. |
| **B1-Q** | **rot** — Member/Shopper/Volumen mit 0 % Drift; aber Root-Provision/Phase 2/Phase 3 strukturell stark abweichend. P2 Jahr 10 Standard auf 14,6 % Root-Diff; P1 Jahr 10 auf 886 %; P2/P4 Jahr 6 vor Cap massiv falsch. |
| **B1-U** | ausstehend — Playwright-Lauf nicht mehr eingerichtet, weil obsolet (s. u.). |

Mess-Rohdaten liegen als CSVs in [benchmarks/results/2026-06/](../../benchmarks/results/2026-06/).

### 1.3 Konsequenz

Das B1-Q-Ergebnis hat gezeigt, dass der Aggregat-Pfad zwar schnell genug, aber fachlich nicht belastbar genug für Phase 2/3 und Root-Provision ist. In Kombination mit der Erkenntnis, dass Slider-Responsivität auch über **Debounce + Single-Path** lösbar ist (`DETAIL_CALCULATION_DEBOUNCE_MS = 800`), wurde die Two-Path-Architektur als ganze verworfen — nicht nur der `Standard`-Eintrag in der UI-Combo-Box.

Folgen:

- `Standard` als wählbare Reality-Strategie ist aus [AdvancedSettingsPanel.tsx](../../simulator-app/src/components/AdvancedSettingsPanel.tsx) entfernt.
- Im Code lebt der Aggregat-Pfad noch als `simulationMode: 'standard'` + `fastResult` in [simulator-app/src/App.tsx:240-246](../../simulator-app/src/App.tsx#L240-L246) sowie als Default in [packages/simulator-core/src/simulation.ts:92](../../packages/simulator-core/src/simulation.ts#L92). Das ist **Architektur-Drift** (siehe [01 §7](01-Zielarchitektur.md#7-architektur-drift-zwischen-code-und-entscheidung)) und nicht mehr beabsichtigte Funktion.
- Der Benchmark-Ordner [benchmarks/b1-aggregate-path/](../../benchmarks/b1-aggregate-path/) ist damit reines Historie-/Regressions-Material, kein produktiver Zielarchitektur-Benchmark.

### 1.4 Backlog B1

| ID | Maßnahme |
|---|---|
| P2.5 | `benchmarks/b1-aggregate-path/` als Legacy umbenennen (`benchmarks/legacy-b1-aggregate-path/`) oder ins Archiv verschieben, damit nicht als Zielarchitektur-Benchmark missverstanden |
| Code-Cleanup | `fastResult`, `simulationMode: 'standard'`-Default und der gesamte Aggregat-Pfad in `simulation.ts` entfernen — siehe [01 §7](01-Zielarchitektur.md#7-architektur-drift-zwischen-code-und-entscheidung) P2.1–P2.5 |

## 2. B2 — Shopper-Aggregation

**Status: nicht implementiert. Durch Shopper-als-Float (Erarbeitung 14) inhaltlich obsolet.**

### 2.1 Was war geplant

B2 sollte prüfen, ob Shopper aus dem expliziten Personenbaum entfernt und als Umsatz-/Anzahl-Aggregat pro Member geführt werden können, ohne fachliche Ergebnisse zu verändern:

- **B2-C** Korrektheit (Phasen-Toleranz < 0,01 €, Rank-State/Status pro Node identisch)
- **B2-P** Performance (Compensation-Speedup ≥ 2,0 ×, Objektreduktion ≥ 40 %)
- **B2-S** Skalierung (P2 < 2 s, P4 < 5 s)

### 2.2 Was umgesetzt wurde

| Aspekt | Status |
|---|---|
| Test-Gerüst angelegt | ja — [benchmarks/b2-shopper-aggregation/](../../benchmarks/b2-shopper-aggregation/) |
| `simulationMode: 'shopper-aggregate'` im Core | **nicht implementiert** |
| Tests `b2-correctness`, `b2-performance`, `b2-scale`, `edge-cases` | bewusst `skip`, mit TODO-Markern |
| Shopper-als-Float in Produktion | **ja** — siehe [02-Wachstums-und-Churn-Regeln.md §2](02-Wachstums-und-Churn-Regeln.md#2-shopper-regeln) |

Shopper wurden parallel als Float-Aggregat in Erarbeitung 14 fachlich neu modelliert: nicht mehr als Personen im Simulationskern, sondern als `shopperCount` pro Sponsor. Damit ist die ursprüngliche Performance-Motivation für B2 (Knotenreduktion durch Shopper-Aggregation) auf direkterem Weg erreicht.

### 2.3 Konsequenz und offene Frage

Das ursprünglich für B2 vorgesehene Aggregations-Konzept und der Shopper-Float-Ansatz lösen denselben Performance-Engpass auf unterschiedlichen Wegen. Solange Shopper-Float das Tempo-Ziel erfüllt, ist B2 nicht mehr nötig.

**Offene fachliche Frage (Z16):** Soll `simulationMode: 'shopper-aggregate'` als eigenständiger Modus jemals kommen, oder ist der Float-Ansatz endgültig? Aktuell „schweigendes Vielleicht" — siehe TODO-Kommentare in:

- [benchmarks/b2-shopper-aggregation/b2-performance.test.ts:76](../../benchmarks/b2-shopper-aggregation/b2-performance.test.ts#L76)
- [benchmarks/b2-shopper-aggregation/b2-correctness.test.ts:97](../../benchmarks/b2-shopper-aggregation/b2-correctness.test.ts#L97)
- [benchmarks/b2-shopper-aggregation/b2-correctness.test.ts:115](../../benchmarks/b2-shopper-aggregation/b2-correctness.test.ts#L115)

### 2.4 Backlog B2

| ID | Maßnahme |
|---|---|
| Z16 | Fachlich entscheiden: B2 endgültig verwerfen → TODO-Kommentare und `skip`-Tests entfernen, Benchmark-Ordner archivieren. ODER: als Backlog-Ticket explizit führen, dann Modus-Spezifikation an `02-Wachstums-und-Churn-Regeln.md` anbinden. |

## 3. Website-/Pricing-Drift zum Benchmark-Wording

Die alten Website-Texte sprechen weiterhin von „drei Simulationsmodellen Standard / Zufall / Momentum". Das war zur B1-Diskussionszeit korrekt, ist nach §1.3 nicht mehr maßgeblich.

Aus Erarbeitung 18 P4.1 und 17 K2:

| Datei | Befund |
|---|---|
| [website-astro/src/shared/components/sections/FeaturesPageDefault.astro](../../website-astro/src/shared/components/sections/FeaturesPageDefault.astro) | Zeile 222 nennt „drei Simulationsmodelle"; Diagramm-Captions auf Zeile 236 (`Standard`) und 254 (`Momentum`) |
| [website-astro/src/brands/lifeplus/content/pricing.yaml](../../website-astro/src/brands/lifeplus/content/pricing.yaml) | Feature `Drei Simulationsmodelle (Standard / Zufall / Momentum)` |
| [website-astro/src/brands/fitline/content/pricing.yaml](../../website-astro/src/brands/fitline/content/pricing.yaml) | gleicher Text |
| [website-astro/src/brands/eqology/content/pricing.yaml](../../website-astro/src/brands/eqology/content/pricing.yaml) | gleicher Text |
| [website-astro/src/brands/lifeplus/pages/features.astro:13](../../website-astro/src/brands/lifeplus/pages/features.astro#L13) | `<meta description>` mit altem Wording |
| [website-astro/src/brands/fitline/pages/features.astro:13](../../website-astro/src/brands/fitline/pages/features.astro#L13) | gleich |
| [website-astro/src/brands/eqology/pages/features.astro:13](../../website-astro/src/brands/eqology/pages/features.astro#L13) | gleich |

**Empfehlung:** Wording vereinheitlichen auf „Reality-Strategien: Personenbaum, Zufall, Momentum" — Standard nicht mehr bewerben. Sweep mit `grep` über `website-astro/src/**/*.{astro,yaml}` statt Punkt-Edits.

## 4. Was nicht mehr aktiv ist

- Doc-13-Toleranzen und Eskalations-Stufen aus B1-Q: nur noch historisch relevant, weil B1 als Produktpfad verworfen ist.
- B2-S Skalierungs-Schwellen: nicht mehr relevant, solange B2 nicht implementiert wird.
- Doc-13 §8 „Blockierende offene Entscheidungen" (Shopper-Churn-Regel, Shopper-Volumen-Zugehörigkeit): durch Erarbeitung 14 / [02 §2](02-Wachstums-und-Churn-Regeln.md#2-shopper-regeln) entschieden — Shopper-Float, QGV ja / AV nein, Reattachment bei Member-Churn.
