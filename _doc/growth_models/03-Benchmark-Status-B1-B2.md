# 03 - Benchmark-Status B1 und B2

**Stand:** 2026-06-10  
**Konsolidiert aus:** Erarbeitung 13, Umsetzung Bericht, Erarbeitung 17/18 und Cleanup-Entscheidungen R2/R5/R6.

Dieses Dokument beschreibt nur noch den aktuellen fachlichen Status. Alte B1/B2-Spezifikationen sind historisch; neue Arbeit wird nicht aus den alten Stub-Benchmarks reaktiviert.

## 1. B1 - Aggregat-Pfad

**Status:** architektonisch obsolet und produktiv entfernt.

B1 sollte pruefen, ob ein schneller Aggregat-Pfad als Slider-/Chart-Pfad neben dem Personenbaum tragfaehig ist. Das Ergebnis war zweigeteilt:

| Sub | Ergebnis |
|---|---|
| B1-E | Performance war ausreichend schnell. |
| B1-Q | Fachliche Drift war zu gross, besonders bei Root-Provision, Phase 2 und Phase 3. |
| B1-U | Nicht weiter verfolgt, weil die Two-Path-Architektur verworfen wurde. |

Konsequenz:

- Die produktive Runtime nutzt den Personenbaum als einzige Berechnungsquelle.
- `standard`, `fastResult`, der Aggregatpfad in `runSimulation()` und der `ProvisionChart`-Aggregate-Modus wurden am 2026-06-10 entfernt.
- Der frueher unter `benchmarks/b1-aggregate-path/` gefuehrte Benchmark wurde am 2026-06-10 zusammen mit dem `benchmarks/`-Ordner entfernt; er war zuletzt nur noch historisches Material und kein Zielarchitektur-Benchmark mehr.

## 2. B2 - Shopper-Aggregation

**Status:** erledigt durch Modellentscheidung, Stub-Benchmarks entfernt.

B2 sollte urspruenglich pruefen, ob Shopper aus dem expliziten Personenbaum entfernt und als Umsatz-/Anzahl-Aggregat pro Member gefuehrt werden koennen.

Diese Frage ist durch R5 entschieden und umgesetzt:

- Shopper sind keine `SimPerson` mehr.
- Shopper werden ausschliesslich als `shopperCount` am Sponsor/Member gefuehrt.
- Shopper-Umsatz ist `shopperCount * shopperMonthlyVolume`.
- Shopper-Umsatz zaehlt zu QGV, aber nicht zu AV.
- UI-`shopper-aggregate`-Knoten sind nur Darstellung dieses Counts, keine Simulationspersonen.

Damit ist ein separater `simulationMode: 'shopper-aggregate'` ueberfluessig. Der alte B2-Benchmark-/Skip-Test-Ordner `benchmarks/b2-shopper-aggregation/` wurde am 2026-06-10 zusammen mit dem `benchmarks/`-Ordner entfernt.

## 3. Verbleibender Benchmark-Umgang

| Bereich | Status | Umgang |
|---|---|---|
| B1 Aggregat | Historisch | Nicht als Produktziel interpretieren; bei Bedarf separat archivieren. |
| B2 Shopper-Aggregation | Erledigt/entfernt | Nicht reaktivieren; `shopperCount` ist das Zielmodell. |
| Personenbaum-Performance | Aktiv relevant | Bei Performance-Problemen neue Benchmarks auf dem aktuellen Personenbaum-Modell erstellen. |

## 4. Website-/Pricing-Wording

Das Website-Wording wurde am 2026-06-09 auf Reality-Strategien/Personenbaum aktualisiert:

- `FeaturesPageDefault.astro`: Reality-Strategien, Personenbaum, Zufallsstreuung, Momentum.
- `pricing.yaml` aller drei Brands: `Reality-Strategien (Personenbaum / Zufallsstreuung / Momentum)`.
- `features.astro` Meta-Descriptions aller drei Brands: Reality-Strategien.

`Standard` wird nicht mehr als Simulationsmodell beworben.

## 5. Nicht Mehr Aktiv

- Two-Path-Architektur mit parallelem Aggregatpfad.
- `standard` als Runtime-Modus.
- separater Shopper-Aggregationsmodus als Backlog-Idee.
- alte B2-Skip-Teststruktur.
