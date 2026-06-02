# Performance-Kostenreview Simulator

Datum: 2026-06-02

## Befund

Die aktuelle fachliche Modelltreue erzeugt grosse echte Personenbaeume. Die Performance wird nicht von einem einzelnen Bug dominiert, sondern von drei Multiplikatoren:

1. Baumgroesse: diskrete Personen x Duplikation x Schutz vor Ausscheiden.
2. Jahresend-Compensation: Rangberechnung plus Payouts fuer jede Order.
3. Visualisierung: echte Personenbaeume und Payout-Details fuer grosse Year-End-Snapshots.

Ein Versuch, alle Monats-Orders fuer ein Stressprofil zu erzeugen, endete mit JavaScript Heap Out of Memory. Vollstaendige Monatsdetails duerfen daher kein Default-Pfad sein.

## Messwerte

Gemessen mit `vite-node`, 10 Jahre, LifePlus-Produkt.

| Szenario | runSimulation | Baumaufbau | NetworkSnapshot x120 | Ranks ohne Payouts | Ranks + Payouts | Personen Y10 | Orders Y10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| User-Fall: 3 Member, 2 Shopper, 50% Fluktuation | 241 ms | 134 ms | 47 ms | 45 ms | 79 ms | 7.806 | 3.926 |
| Default-ish: 2 Member, 3 Shopper, 18% Fluktuation | 1.580 ms | 242 ms | 152 ms | 104 ms | 510 ms | 32.151 | 29.110 |

Varianten auf Default-ish:

| Variante | runSimulation | Personen Y10 | Orders Y10 | Aussage |
| --- | ---: | ---: | ---: | --- |
| Retention aus | 723 ms | 31.601 | 26.541 | Retention erhaelt mehr aktive Kaeufer/Orders; das verteuert vor allem Payouts und Visualisierung. |
| Attrition aus | 6.292 ms | 147.621 | 147.620 | Nicht tragfaehig als interaktiver Default. |
| Duplikation 50% | 70 ms | 1.611 | 1.282 | Duplikation ist der groesste fachliche Hebel. |
| Dirichlet | 1.411 ms | 31.777 | 28.743 | Reality-Verteilung selbst ist nicht der Hauptkostentreiber. |
| Momentum | 1.213 ms | 31.567 | 28.576 | Reality-Verteilung selbst ist nicht der Hauptkostentreiber. |

## Kosten nach Feature

| Feature / Regel | Kosten | Nutzen | Empfehlung |
| --- | --- | --- | --- |
| Diskrete Personen | Sehr hoch bei grossen Baeumen | Single Source of Truth, echte Struktur | Behalten, aber mit Limits/Progressive Detail. |
| Retention: festes Monatsvolumen >= 150 IP | Mittel | Fachlich plausibel und leicht erklaerbar | Behalten. Die Entscheidung selbst ist billig; teuer bleibt die groessere Zahl aktiver Orders. |
| Payouts fuer alle Orders | Sehr hoch | Detailanalyse je Person/Phase | Nicht fuer Chart-Default berechnen. Nur bei Netzwerk-/Personenbaum-Detailansicht oder Fokus. |
| Voller Personenbaum in Visualisierung | Hoch bis sehr hoch | Transparenz | Nur Year-End, zusätzlich Clustering/Top-N, keine Vollbaum-Darstellung bei > X Personen. |
| Alle Monats-Orders | K.O. bei Stress | kaum sichtbarer Nutzen | Dauerhaft aus Default-Pfad rauslassen. |
| NetworkSnapshot x120 | Mittel | Chart/Tabelle | Cache bleibt; langfristig nur Year-End plus Jahreswerte berechnen. |
| Reality-Modelle Dirichlet/Momentum | Niedrig bis mittel | wertvoll fuer Szenarien | Behalten, nicht erstes Kürzungsziel. |
| Attrition aus / sehr niedrig | Extrem teuer | theoretischer Sonderfall | UI-Limit oder Warnung; fuer Live-Simulation capped/approximiert. |

## Vereinfachungsvorschlag

### Stufe 1: Sofort beibehalten

- Diskreter Personenbaum nur fuer Jahresenden.
- Orders nur fuer Jahresenden.
- Cached NetworkSnapshot und cached TreeCompensation.
- Deferred UI-Berechnung.

### Stufe 2: Chart-Modus vereinfachen

Der Chart braucht keine Payout-Liste pro Order und keine `rankStates` fuer alle Personen. Er braucht nur:

- Root-Provision gesamt
- Phase 1/2/3 Summen
- Root-Rang, AV, QGV
- Netzwerkzahlen

Empfehlung: `calculateTreeSummary` einfuehren, das keine Payout-Objekte und keine vollstaendigen `rankStates` erzeugt.

### Stufe 3: Detailberechnung lazy machen

Payouts, RankStates und Personenbaum-Metadaten nur berechnen, wenn eine Detailansicht offen ist:

- Netzwerk / Personenbaum: Year-End Detail fuer gewaehltes Jahr.
- Fokus auf Person/Bein: Payouts nur fuer relevanten Teilbaum oder relevante Upline.

### Stufe 4: Harte Schutzplanken

- Interaktive Simulation bei z.B. > 30.000 Personen auf Summary-Modus umschalten.
- Personenbaum-Visualisierung bei > 10.000 Personen automatisch clustern.
- Attrition = 0 oder sehr niedrig mit hoher Duplikation nicht als Vollbaum live rechnen.

## Priorisierte naechste Schnitte

1. `TreeCompensationResult` in Summary und Detail trennen.
2. Payout-Berechnung fuer retained Konsumenten im Chart-Modus zusammenfassen statt pro Order detaillieren.
3. PersonYearEnds optional machen: Chart-Seite braucht keine Personenlisten.
4. Visualisierung auf Cluster-/Top-N-Modus begrenzen.
5. Falls danach noch zaeh: `runSimulation` in Web Worker verschieben.
