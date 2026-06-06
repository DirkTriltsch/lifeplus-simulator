# Benchmark Report B1/B2 - Juni 2026

## Stand

Implementierter Stand:

- B1-E Engine-Performance: implementiert und gemessen
- B1-Q Aggregat-vs-Tree-Drift: implementiert und gemessen
- B1-U Browser-/Slider-UX: noch offen
- B2-C/P/S Shopper-Aggregation: noch offen

## Fachliche Entscheidungen fuer B2

Die zwei blockierenden Entscheidungen aus Dokument 13 sind geklaert:

1. Wenn ein Member churnt, rutschen seine Shopper zum Parent des churned Members.
2. Shopper-Volumen zaehlt zu QGV. AV bleibt nur der Eigenverbrauch eines Members und qualifiziert fuer den Status.

Konsequenz fuer B2-C:

- Shopper-Aggregation muss QGV identisch halten.
- AV darf durch Shopper-Volumen nicht steigen.
- Rank-State, Status, AV, QGV, qualifizierte Beine und Root-Provision muessen vor/nach Aggregation nahezu identisch sein.

## B1-E Ergebnis

B1-E ist im aktuellen isolierten Aggregatpfad bestanden.

Wichtige Gesamtzeiten:

| Set | Strategie | Median | p95 | Bewertung |
|---|---|---:|---:|---|
| P2 Default realistisch | standard | 0.223 ms | 3.270 ms | Pass |
| P2 Default realistisch | dirichlet | 0.344 ms | 0.407 ms | Pass |
| P2 Default realistisch | momentum | 0.334 ms | 0.397 ms | Pass |
| P4 Mittel aggressiv | standard | 0.184 ms | 0.274 ms | Pass |
| P4 Mittel aggressiv | dirichlet | 0.314 ms | 0.346 ms | Pass |
| P4 Mittel aggressiv | momentum | 0.344 ms | 0.448 ms | Pass |
| P5 Aggressiv | standard | 0.191 ms | 0.335 ms | Pass |
| P5 Aggressiv | dirichlet | 0.298 ms | 0.363 ms | Pass |
| P5 Aggressiv | momentum | 0.299 ms | 0.508 ms | Pass |

Interpretation:

- Der reine Aggregatpfad ist fuer Slider/Chart rechnerisch sehr schnell.
- Die Zeiten liegen deutlich unter 16 ms Median und 33 ms p95.
- Das bestaetigt nur die Engine-Geschwindigkeit, nicht die fachliche Genauigkeit der Provision.

## B1-Q Ergebnis

Nach Korrektur des Wachstumskerns stimmen Wachstum und Volumen gegen den Tree-Pfad exakt.

Jahr-10-Vergleich:

| Set | Member-Diff | Shopper-Diff | Volumen-Diff | Root-Provision-Diff | Klasse |
|---|---:|---:|---:|---:|---|
| P1 Konservativ | 0% | 0% | 0% | 7.998% | Exact |
| P2 Default realistisch | 0% | 0% | 0% | 503.606% | Capped |
| P4 Mittel aggressiv | 0% | 0% | 0% | 723.894% | Capped |

Interpretation:

- Wachstum, Shopper und Gesamtvolumen sind jetzt sauber an den Tree-Pfad gekoppelt.
- Die Root-Provision driftet stark in P2/P4.
- Die Rank-Schaetzung im Aggregatpfad ist noch zu grob: P2 Jahr 10 schaetzt `Bronze`, Tree liefert `Diamond`; P4 Jahr 10 schaetzt `Silver`, Tree liefert `Diamond`.
- Damit ist B1-Q fuer Provision/Status noch nicht bestanden, obwohl B1-E technisch sehr schnell ist.

## Konsequenz

Die Zielarchitektur bleibt plausibel:

- Fast Aggregat fuer Slider/Chart ist performant genug.
- Der Aggregatpfad darf aber noch nicht als fachlich belastbare Root-Provision verwendet werden.
- Phase-/Root-Provision muss als `Projected` oder `Capped` markiert werden, bis B1-Q verbessert ist.

Naechster technischer Schritt:

1. B1-Q Rank-/Root-Provision-Schaetzung verbessern.
2. Danach B1-U im Browser messen.
3. Danach B2-C als Korrektheitstest fuer Shopper-Aggregation implementieren.

## Dateien

- `benchmarks/results/2026-06/b1-engine-results.csv`
- `benchmarks/results/2026-06/b1-quality-results.csv`
- `benchmarks/results/2026-06/benchmark-env.csv`
