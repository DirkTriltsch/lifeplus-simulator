# Netzwerkwachstum Konzept Erarbeitung 10 - Review-Berücksichtigung und überarbeitete Zielarchitektur

**Projekt:** lifeflow360 — Multi-Brand MLM-Plattform (Audit-Fokus: LifePlus / lifeflow360)
**Datum:** Juni 2026
**Vorgängerdokument:** Erarbeitung 09 (Zielarchitektur)
**Review-Input:** Codex-Review zu Dokument 09 + User-Klarstellungen Juni 2026
**Zweck:** Anpassung von Schritt 1-3 an die Review-Ergebnisse, sodass Schritt 4 (Lösungsmatrix) auf belastbarer Basis starten kann.

---

## Inhalt

1. Anlass und Methodik
2. Drei Kern-Befunde aus dem Review
3. Anpassungen am Bewertungsraster (Schritt 1)
4. Anpassungen am Parameter-Inventar (Schritt 2)
5. Anpassungen an SSOT und Architektur (Schritt 3)
6. Entscheidungen zu den drei offenen Fragen
7. Benchmark-Plan vor und während Schritt 4
8. Architektur-Zusammenfassung — die drei Pfade
9. Stand und nächste Schritte

---

## 1. Anlass und Methodik

### 1.1 Anlass

Dokument 09 hat den Audit-Prozess Schritt 1-3 vollständig dokumentiert und als Bewertungsbasis vorgelegt. Vor dem Eintritt in Schritt 4 (Lösungsmatrix) wurde Dokument 09 einem externen Review unterzogen (Codex, Juni 2026).

Das Review kritisiert das Dokument an mehreren Stellen als „methodisch gut, aber in den Performance-Konsequenzen noch zu vorsichtig". Insbesondere:

- Two-Path-Architektur ist nicht nur zulässig, sondern verpflichtend.
- Annahme „Bias <5%" für Phase 2/3 ist optimistisch.
- Performance-Metriken sind zu eng (nur effektive Members, nicht Objekte/Orders/Render-Knoten).
- Mobile muss separat behandelt werden.
- Default-Szenarien sind unter aktuellem Wachstumsmodell falsch.

Parallel haben User-Klarstellungen vier konkrete Punkte präzisiert:

- Mindest-Churn an Member/Jahr koppeln (UX-Realismus-Patch).
- Shopper konsequent als aggregierter Knoten — auch im Diagramm.
- Klärung von Weight (gewichtete Knoten) — Verhältnis zu Status-Aufspaltung.
- Konkretisierung des Benchmark-Bedarfs für Schritt 4.

### 1.2 Methodik

Dieses Dokument:

- **übernimmt** Review-Empfehlungen, wo sie durch Messdaten oder User-Bestätigung gedeckt sind,
- **konkretisiert** Empfehlungen, wo sie als Richtung formuliert waren,
- **lehnt** Empfehlungen ab, wo sie über das Audit-Ziel hinausgehen oder mit der User-Linie kollidieren,
- **bewahrt** die Drift-Disziplin aus Dokument 09 — Entscheidungen werden mit Begründung getroffen, nicht mit Stimmung.

Drift-Schutz: Wo das Review meine Position in Dokument 09 kritisiert, prüfe ich, ob die Kritik durch Daten gedeckt ist (z.B. die 4,5-Sekunden-Messung für DefaultChurn18). Daten übernehme ich. Wo Codex „würde härter formulieren" sagt, ohne Datenbasis, prüfe ich, ob die Härte für unsere Architektur tatsächlich nötig ist.

---

## 2. Drei Kern-Befunde aus dem Review

Diese drei Datenpunkte ändern das Bild substanziell und werden in allen folgenden Anpassungen genutzt:

### 2.1 Tree-Pfad ist nicht Slider-tauglich

Gemessen wurde:

| Szenario | runSimulation (person-tree) | calculateTreeCompensation 10 Jahre | Summe |
|---|---:|---:|---:|
| Konservativ (m=1, s=2, d=0.5, c=0.25) | 164 ms | 140 ms | ~300 ms |
| DefaultChurn18 (m=2, s=3, d=1, c=0.18) | 2.170 ms | 2.332 ms | ~4.500 ms |

Aggressivere Szenarien wurden nach 180 s abgebrochen.

**Konsequenz:** Jede Lösung, die Tree-Berechnung im Slider-Drag-Pfad ausführt, scheitert in Kriterium #2 unabhängig von sonstigen Vorzügen. Two-Path ist nicht „erlaubt", sondern Pflichtarchitektur.

### 2.2 Effektive Member-Zahl ist als Performance-Metrik unbrauchbar

Gemessen wurde: 42 effektive Members → 2.047 aktive Objekte im konservativen Szenario.

**Konsequenz:** Caps und Bewertungen müssen vier separate Metriken berücksichtigen:

- Effektive Member-Zahl (für UX-Kommunikation und Wachstumslogik)
- Objekt-Zahl im Speicher (für Memory-Cap)
- Order-Zahl pro Compensation-Pass (für Tree-Pfad-Performance)
- Render-Knoten-Zahl im Diagramm (für UI-Pfad)

Eine Lösung kann eine niedrige effektive Member-Zahl haben und trotzdem in der Objekt-Zahl explodieren (durch Weight-Restgewichte, Shopper-Orders, etc.).

### 2.3 Bisherige Default-Zahlen sind falsch

Mit `maxDirectMembersPerMember = 29` und korrigierter Wachstumsreihenfolge:

| Member/Jahr | Churn 0% | Churn 18% |
|:---:|---:|---:|
| 1,0 | 4.092 Gesamt | 1.327 Gesamt |
| 1,5 | 28.607 | 7.984 |
| 2,0 | 147.620 | 38.037 |
| 2,5 | 606.878 | 149.048 |
| 3,0 | 2.097.149 | 499.008 |
| 4,0 | 17.089.677 | 3.910.684 |

**Konsequenz:** Die im Dokument 09 verwendete „Default 98k Member"-Zahl ist veraltet. Korrekt ist 59k Member / 148k Gesamt bei m=2, c=0. Caps, Benchmarks und KO-Schwellen müssen auf dieser Basis kalibriert werden.

---

## 3. Anpassungen am Bewertungsraster (Schritt 1)

### 3.1 Kriterium #2 — Slider-Latenz: dreigeteilt statt skalar

**Bisher:** Eine Skala für „Latenz während Drag und Commit zusammen".

**Neu:** Drei Teilkriterien, alle drei müssen erfüllt sein:

| Teilkriterium | Ziel | KO bei |
|---|:---:|:---:|
| Reglerbewegung (Frame-Zeit) | <16 ms | >33 ms |
| Fast Preview nach Wertänderung | <16 ms, max. 33 ms | >100 ms |
| Exact Commit (asynchron) | darf später kommen, darf aber den nächsten Drag nie blockieren | blockiert nächsten Drag |

**Begründung:** Codex 2.1. Eine Lösung mit 80-100 ms Preview ist nicht UX-tauglich, würde aber im alten Raster mit Stufe 4 belohnt. Aufteilung verhindert das.

### 3.2 Kriterium #3 — Konsistenz: Bias-Klassen statt Pauschalannahme

**Bisher:** Stufe 4 = „statistisch konsistent ±5%". Annahme im Audit: Bias <5%.

**Neu:** Lösungen werden mit drei Bias-Klassen bewertet, getrennt nach Phase:

| Bias-Klasse | Drift | UX-Konsequenz |
|---|---|---|
| A | <5% | Chart darf als konsistent gelten |
| B | 5-15% | Chart zeigt Range oder Hinweis „geschätzt" |
| C | >15% | Chart-Provision darf nicht als konkrete Provision verkauft werden |

Für Phase 1 (Unilevel, linear) ist Klasse A plausibel. Für Phase 2/3 (Sättigungsfunktionen) muss Klasse B oder C als realistisch behandelt werden, bis das Bias-Experiment vorliegt.

**Stufe 4** in Kriterium #3 erfordert nun:
- Phase 1: Klasse A
- Phase 2/3: mindestens Klasse B mit dokumentiertem UI-Hinweis

**Stufe 5** erfordert Klasse A in allen drei Phasen — was wahrscheinlich nur Lösungen mit pro-Order-Exaktberechnung erreichen, und die kollidieren mit Kriterium #2.

### 3.3 Kriterium #4 — Skalierbarkeit: vier Metriken statt eine

**Bisher:** „N>50k" als zentrale Schwelle.

**Neu:** Caps werden getrennt geführt und einzeln in der Bewertung berücksichtigt:

```
MAX_EXACT_EFFECTIVE_MEMBERS    = 100.000   (Performance-Cap, primär)
MAX_TREE_OBJECTS               =  25.000   (Memory + Render-Cap)
RENDER_NODES_SOFT_WARN         =   2.000   (UI-Hinweis: Cluster-Modus empfohlen)
RENDER_NODES_HARD_FREEZE       =  10.000   (Hard Cap: Cluster wird erzwungen)
MAX_ORDERS_PER_COMPENSATION    =  25.000   (Compensation-Pass)
MAX_DISPLAY_MONTHLY_EUR        = 500.000   (Ökonomischer Cap, unverändert)
```

**Render-Knoten-Schema (User-Entscheidung):** Visual Clustering ist eine User-Option (Checkbox), kein automatischer Mechanismus. Default ist „aus". Bei Überschreitung der Soft-Warn-Schwelle erscheint eine UI-Empfehlung „Cluster-Modus aktivieren, sonst kann der Aufbau mehrere Sekunden dauern" — der User entscheidet. Erst bei Überschreitung der Hard-Freeze-Schwelle wird Cluster erzwungen, weil sonst der Browser hängen würde. Konsistent zur Mindest-Churn-Logik: User wird geführt, aber nicht gezwungen (außer am absoluten Limit zum Selbstschutz).

Eine Lösung muss erklären, wie sie alle vier Object-Metriken in Caps hält, nicht nur eine.

### 3.4 Kriterium #8 — Speicher Mobile: Desktop und Mobile getrennt

**Bisher:** Eine Skala für „Mobile bei Default-Szenario".

**Neu:** Lösungen werden mit zwei separaten Cap-Sets bewertet:

```
DESKTOP_MAX_TREE_OBJECTS              = 25.000
MOBILE_MAX_TREE_OBJECTS               =  8.000
DESKTOP_MAX_EFFECTIVE_MEMBERS_EXACT   = 100.000
MOBILE_MAX_EFFECTIVE_MEMBERS_EXACT    =  50.000
```

Mobile-Annahme bei Performance: Faktor 3-8 langsamer als Desktop/Node. Werte sind Startannahme, müssen durch B4 (Mobile-Benchmark) kalibriert werden.

**Skala erweitert um Diagramm-Knoten:**

| Stufe | Bedingung |
|---|---|
| 5 | <50 MB und <5k Diagramm-Knoten |
| 4 | 50-200 MB und <2 s Diagrammaufbau |
| 3 | 200-500 MB oder >2 s, aber mit Progress |
| 2 | >500 MB oder spürbare OS-Gefahr |
| 1 | OOM / Freeze |

### 3.5 Kriterium #10 — Diagramm-Aufbau: Stufe 4 verschärft

**Bisher:** Stufe 4 = „500ms-2s mit klarem Wartezustand".

**Neu:** Stufe 4 erfordert zusätzlich:
- UI bleibt während des Aufbaus interaktiv
- Alte Diagrammdaten bleiben sichtbar (stale-while-revalidate)
- Kein blockierender Modal-Spinner

Ohne diese Zusätze könnte eine Lösung 1 s blockierend laufen und trotzdem Stufe 4 bekommen, was UX-seitig falsch wäre.

### 3.6 Finales angepasstes Raster

| # | Kriterium | Gewicht | KO-Schwelle | Ziel |
|---|---|:---:|:---:|:---:|
| 1 | Korrektheit Vergütung (Phase 1-3 + Ein-Phase-Regel) | 3× | <5 = KO | 5 |
| 2a | Reglerbewegung Frame-Zeit | 3× | >33 ms = KO | <16 ms |
| 2b | Fast Preview | (im Gewicht von 2a enthalten) | >100 ms = KO | <16 ms |
| 2c | Exact Commit nicht-blockierend | (im Gewicht von 2a enthalten) | blockiert nächsten Drag = KO | asynchron |
| 3 | Konsistenz Chart ↔ Diagramme (mit Bias-Klassen) | 3× | <3 = KO | 4 |
| 4 | Skalierbarkeit / Cap-Verhalten (4 Metriken) | 2× | <3 = KO | 4 |
| 5 | LifePlus-Code aus Wachstumscode entkoppelt | 1× | kein KO | 4 |
| 6 | Determinismus | 2× | <3 = KO | 4 |
| 7 | Testbarkeit | 1× | <3 = KO | 4 |
| 8 | Speicher Mobile + Desktop separat | 1× | <3 = KO | 4 |
| 9 | Implementierungsaufwand | 1× | kein KO | entspannt |
| 10 | Diagramm-Aufbau + Jahres-Scrubbing | 1× | <3 = KO | 4 |

Disqualifikations-Regel bleibt: Eine Lösung, die in einem KO-Kriterium unter die Schwelle fällt, wird nicht aufsummiert, sondern als KO vermerkt.

---

## 4. Anpassungen am Parameter-Inventar (Schritt 2)

### 4.1 Mindest-Churn-Schwellen — neu aufgenommen

Bestätigt durch User. Begründung: realistischer Realwelt-Effekt (höheres Wachstum korreliert mit höherem Churn) und UX-Schutz gegen Knoten-Explosion.

**Schwellen-Tabelle:**

| Wenn `membersPerYear ≥` | Dann `churnRate ≥` |
|:---:|:---:|
| 2,0 | 10% |
| 2,5 | 18% |
| 3,0 | 25% |
| 3,5+ | 30% |

**Verhalten:**

- Slider-Hysterese: Wird `membersPerYear` hoch geschoben, schiebt `churnRate` automatisch mit auf den Mindestwert, falls aktueller Wert darunter liegt.
- Wird `membersPerYear` zurück geschoben, bleibt `churnRate` stehen (User-Eingaben werden nicht überschrieben).
- Der `churnRate`-Slider hat ein bewegliches Mindest-Limit, das vom aktuellen `membersPerYear` abhängt. Der User sieht visuell, warum er nicht unter X% rutschen kann.
- UI-Hinweis bei automatischer Anhebung: „Churn auf X% angehoben, weil M Member/Jahr nicht ohne Fluktuation realistisch ist."

**Offen:** Soll der User die Schwellen übersteuern können („Expert Mode")? Vorerst angenommen: nein, Schwellen sind hart verdrahtet.

### 4.2 Shopper-Modellierung — konsequent aggregiert

Bestätigt durch User: „immer ein aggregierter Knoten egal wie viele Shopper".

**Konsequente Umsetzung über alle Pfade:**

| Pfad | Shopper-Repräsentation |
|---|---|
| Aggregat-Pfad (Chart) | `shopperCount[member]`, `shopperVolume[member]` als Floats |
| Tree-Pfad (Daten) | Kein eigener `SimPerson` für Shopper. Jeder Member-Knoten trägt `shopperCount` und `shopperVolume`. |
| Diagramm-Pfad (Anzeige) | Ein `ShopperAggregateNode` pro Member, der unterhalb angezeigt wird. Beschriftung zeigt Anzahl. |
| Provisions-Pfad Phase 1 | Pro Member ein aggregierter Shopper-Beitrag pro Monat, nicht eine Order pro Shopper. Die Phase-1-Berechnung läuft einmal pro Member-Knoten und Monat mit dem aggregierten Volumen. |
| Lineage / Beispielrechnung | Ein einzelner Shopper als Person, ausschließlich für didaktische Linien (Erklärung der Vergütungslogik). Nicht in der Wachstumssimulation. |

**Visualisierungs-Ausbau (später):**
User-Idee — Stern-Markierungen ab Mengen-Schwellen:

- Ab 50 Shoppern: ★
- Ab 100 Shoppern: ★★
- Ab 150 Shoppern: ★★★
- Schwellen weiter ergänzbar.

Das ist reines Render-Setting im Diagramm-Pfad. Daten bleiben unverändert.

**Erwartete Performance-Verbesserung:**
DefaultChurn18 hat aktuell 22.816 Shopper-Objekte. Wenn diese keine eigenen Objekte und Orders mehr sind, fällt ein erheblicher Teil der `calculateTreeCompensation`-Last weg. Schätzung: Faktor 2-3 schneller. Validierung durch B2 (siehe Kapitel 7).

### 4.3 Weight — Entscheidung gegen Datenkompression

User-Frage: Kann ein Bronze-Knoten(50) im Folgejahr in Bronze(48) + Silber(2) aufgespalten werden?

**Befund:** Aufspaltung ist nur möglich, wenn innerhalb des gewichteten Knotens eine Streuung modelliert wird (50 Personen mit Verteilung ihrer Volumina/Beine, nicht 50 identische Personen). Das ist erhebliche Zusatzkomplexität und führt im Grunde zu dirichlet-Streuung pro Cluster.

**Entscheidung:** Echte Weight als Datenkompression wird NICHT implementiert. Stattdessen:

| Modus | Strategie |
|---|---|
| Aggregat-Pfad (Chart) | Weight nicht relevant — Aggregat rechnet mit Verteilungen pro Ebene, nicht mit Einzelknoten |
| Tree-Pfad (Daten) | **Kein Weight.** Jeder Knoten ist eine Person. Status-Veränderungen passieren natürlich pro Knoten. Phase 2/3 Slot-Vergabe arbeitet auf echten Personen. |
| Diagramm-Rendering | **Visuelles Clustering als User-Option (Checkbox).** Default: aus. Daten bleiben pro Person getrennt. Wenn aktiviert, werden mehrere gleichartige Knoten unter gleichem Sponsor visuell zu einem Cluster-Block gruppiert. Klick aufs Cluster zeigt Inhalt. |

**Cluster-Schalter-Verhalten (User-Entscheidung):**

| Cluster-Schalter | Verhalten |
|---|---|
| Aus (Default) | Diagramm zeigt alle Knoten einzeln, soweit Render-Performance es zulässt. |
| An | Diagramm gruppiert visuell. Schnellerer Aufbau, übersichtlichere Anzeige. |
| Render-Knoten >2.000 | UI zeigt Empfehlung: „Bei dieser Größe wird der Aufbau langsamer. Cluster-Modus aktivieren?" User entscheidet. |
| Render-Knoten >10.000 | Cluster wird erzwungen mit UI-Hinweis, weil sonst Browser-Freeze droht. Schutzschwelle. |

Begründung der User-Option statt automatischem Cluster: Diagramm-Aufbau passiert nach Slider-Commit, hat keine Tier-1-Latenz-Anforderung. Cluster ist primär Lesbarkeits-Entscheidung, nicht Performance-Zwang.

**Vorteile dieser Entscheidung:**
- Aufspaltung passiert natürlich, weil jeder Knoten seinen eigenen Status hat.
- Phase 2/3 Korrektheit bleibt erhalten — keine Spezialfälle für gewichtete Slot-Vergabe.
- Kleine Restgewichte (die laut Codex aktuell Performance-Probleme verursachen) entfallen.
- Cluster-Aktivierung ist User-Entscheidung, nicht versteckt im Code.
- Mode-Übergänge zwischen „Exact" und „Cluster" sind reine Render-Entscheidung, nicht Daten-Migration.

**Nachteile:**
- Bei sehr großen Netzwerken (>25k Objekte) gibt es keine echte Datenkompression. Stattdessen wechselt die App in den Aggregat-Modus, in dem das Diagramm nur Statistiken zeigt.
- Visual Clustering erfordert eigene Logik („wie definieren wir einen Cluster?"). Das ist eine UI-Aufgabe.

**Implementierungs-Notiz (für später):** Die bestehende Weight-Mechanik im aktuellen Code (laut Codex 4.4 und 7.6 vorhanden) wird im Rahmen der Implementierung der neuen Architektur entfernt. Keine vorgelagerte Bestandsaufnahme nötig — Ziel ist, dass alter Code und alte Entscheidungen die neue Lösung nicht negativ beeinflussen. Für B2 (Shopper-Aggregation Validation) muss der Weight-Code temporär deaktiviert oder umgangen werden, damit Restgewichte die Messung nicht verfälschen.

### 4.4 Default-Szenarien — neu kalibriert

Die im Dokument 09 verwendete „Default 98k Member"-Zahl ist falsch unter aktuellem Wachstumsmodell.

**Korrekte Default-Tabelle** (mit `maxDirectMembersPerMember = 29`, `s=3`, `d=1`):

| `m` | `c` | Effektive Member | Shopper | Gesamt-Objekte ohne Aggregation | Gesamt-Objekte mit Shopper-Aggregat |
|:---:|:---:|---:|---:|---:|---:|
| 1,5 | 0% | 9.536 | 19.071 | 28.607 | 9.536 |
| 1,5 | 18% | 2.667 | 5.318 | 7.984 | 2.667 |
| 2,0 | 0% | 59.048 | 88.572 | 147.620 | 59.048 |
| 2,0 | 18% | 15.221 | 22.816 | 38.037 | 15.221 |
| 2,5 | 18% | 67.756 | 81.292 | 149.048 | 67.756 |
| 3,0 | 25% | ~120k* | ~120k* | ~240k* | ~120k* |

*Mit der neuen Mindest-Churn-Regel aus 4.1.

**Neuer Default-Szenario für Performance-Messungen:** `m=2, c=18%` → 15.221 Member, 22.816 Shopper. Mit Shopper-Aggregation: 15.221 Objekte. Das ist Caps-konform und realistisch.

**Cap-Auswirkung:**
- Der `MAX_EXACT_EFFECTIVE_MEMBERS = 100.000` wird im Default nicht mehr erreicht (selbst mit `m=2,5` und Mindest-Churn nur 67k).
- Erst bei `m=3` mit nur 25% Churn rückt der Cap ins Bild — das ist die Region, in der die Mindest-Churn-Schwellen greifen.

### 4.5 Inventar — Diff zu Dokument 09

**Neu aufgenommen:**
- `mandatoryChurnSchedule[]` (Schwellen aus 4.1) — keine User-Konfiguration
- `ShopperAggregateNode` als Visualisierungs-Konstrukt (kein Datentyp)
- `visualClusteringRules` (Schwellen, ab wann Cluster im Diagramm bilden)
- Stern-Schwellen für Shopper-Visualisierung (50/100/150/…)

**Entfernt / fixiert:**
- `weight` als Datenfeld auf Knoten — entfällt
- Default-Szenario „98k Member" — ersetzt durch „59k Member / 148k Gesamt bei m=2, c=0" als Referenz; oder „15k Member bei m=2, c=18%" als realistisches Mittel

**Bleibt unverändert:**
- Alle Wachstumsparameter (`years, membersPerYear, duplicationRate, shoppersPerYear, churnRate, minActivityVolume, seed, growthDistribution`)
- Alle Vergütungsparameter
- `growthDistribution`-Strategien (standard / dirichlet / momentum / lifecycle später)

---

## 5. Anpassungen an SSOT und Architektur (Schritt 3)

### 5.1 Drei Provisionsstufen statt zwei Pfade

**Bisher (Dokument 09):** Zwei Pfade — Aggregat-Pfad für Chart, Tree-Pfad für Diagramme.

**Neu:** Drei Provisionsstufen, weil im alten Modell unklar blieb, wie Chart-Provision konkret berechnet wird.

| Stufe | Quelle | Verwendung | Latenz | Genauigkeit |
|---|---|---|---|---|
| L1 — Fast Expected Provision | Aggregat (Klasse 3) | Hero, Chart, Goals während Slider-Drag | <16 ms | Phase 1: exakt im Mittel. Phase 2/3: Bias-Klasse abhängig vom Experiment B3 |
| L2 — Tree Diagnostic Provision | Tree (Klasse 2) | Diagramm, Status-Erklärung, Bein-Analyse nach Commit | 100ms-mehrere Sekunden, asynchron | Exakt für die konkrete Tree-Realisierung |
| L3 — Lineage Exact Provision | Lineage (eine konkrete Order und ihre Upline) | Schulung, Tests, Detail-Erklärung einzelner Bestellungen | <1 ms pro Order | Vollexakt nach Plan inkl. Ein-Phase-Regel |

**Konsequenz:** Im Code sind das drei separate Funktionen:

```
expectedProvisionFromAggregate(snapshot, year) → Skalar
treeProvisionSummary(tree, year) → strukturierte Auswertung
lineageProvision(order, uplineRanks) → vollständige Slot-Vergabe
```

L1 ist Pflicht für Slider-UX. L2 ist Pflicht für Diagramm-Erklärung. L3 ist Pflicht für didaktische Beispielrechnungen und Tests (sie existiert bereits als `calculateExampleLine()`).

### 5.2 DiagramYearSnapshot — eigene Snapshot-Ebene

**Bisher:** Tree wird per Jahr gecacht; Diagramm wird daraus gerendert.

**Neu:** Zwischen Tree und Render-Ausgabe liegt eine weitere Snapshot-Ebene:

```ts
type DiagramYearSnapshot = {
  year: number;
  mode: 'exact' | 'clustered' | 'estimated';
  nodes: DiagramNode[];      // bereits render-fertig
  edges?: DiagramEdge[];
  summary: DiagramSummary;
};
```

**Begründung:** Aus `PersonTreeSnapshot` ein render-fähiges Diagramm zu bauen, ist selbst teuer (Layout-Berechnung, Cluster-Bildung, Sortierung). Wenn der Jahres-Slider <16 ms reagieren soll, müssen diese render-fähigen Strukturen pro Jahr vorberechnet sein.

**Snapshot-Stream Variante B baut auf zwei Ebenen:**
1. `PersonTreeSnapshot[year]` — Daten-Snapshot, einmal pro Slider-Commit
2. `DiagramYearSnapshot[year]` — Render-Snapshot, abgeleitet aus PersonTreeSnapshot, einmal pro Diagramm-Modus-Wahl

Der Jahres-Slider schaltet zwischen `DiagramYearSnapshot[1..10]` um. Modus-Wechsel (Exact vs. Cluster) erzeugt einen neuen DiagramYearSnapshot-Satz aus demselben PersonTreeSnapshot.

### 5.3 SimulationModeDecision — zentrales Entscheidungs-Modul

**Neu im Inventar.** Vor jedem Slider-Commit entscheidet ein Modul, in welchem Modus die App rechnet und rendert:

```ts
type SimulationModeDecision = {
  chartMode: 'fast';                                    // immer fast
  exactMode: 'off' | 'worker' | 'main';                 // Tree-Pfad
  diagramMode: 'exact' | 'clustered' | 'estimated';     // Diagramm-Pfad
  reason: string;                                       // UI-anzeigbare Begründung
  estimatedMembers: number;
  estimatedObjects: number;
  estimatedMonthlyEur: number;
};
```

**Entscheidungslogik (Beispiel):**

```
estimatedMembers <  WORKER_THRESHOLD        → exactMode='main'   diagramMode='exact'
estimatedMembers <  MAX_EXACT_EFFECTIVE     → exactMode='worker' diagramMode='exact'
estimatedMembers <= MAX_DISPLAY_MONTHLY_EUR → exactMode='worker' diagramMode='clustered'
sonst                                       → exactMode='off'    diagramMode='estimated'
```

Plus Mobile-spezifische Schwellen (4.6).

**UI-Verhalten:** Der Modus wird sichtbar angezeigt. Modus-Wechsel werden in einem Toast/Hinweis kommuniziert: „Detailanalyse ist auf 100.000 Member begrenzt, weitere Werte werden geschätzt angezeigt."

### 5.4 M3 Konsistenz-Assertion — gestuft statt binär

**Bisher:** Hart in Dev, weich in Production.

**Neu:** Vierstufig, abhängig von Umgebung und Modus:

| Umgebung | Modus | M3-Verhalten |
|---|---|---|
| Unit/Integration Tests | beliebig | hart (Test schlägt fehl bei Drift) |
| Dev Build | unter Cap | hart, Warning im Console |
| Dev Build | über Cap | deaktiviert (Tree existiert nicht) |
| Production | unter Cap | sampled (1 von 100 Berechnungen) + Logging |
| Production | über Cap | deaktiviert |

**Begründung:** Codex 5.4. Eine harte Production-Assertion über Cap würde den Tree erzwingen, den der Modus gerade wegen Performance vermeidet. Das ist ein Selbstwiderspruch.

### 5.5 Architektur-Anforderungen — angepasste Tabelle

| Anforderung | Quelle | Begründung |
|---|---|---|
| Versionierte Snapshot-ID für jeden Parameter-Commit | M1 | Verhindert Anzeige veralteter Daten neben aktuellen Slidern |
| Two-Path-Architektur ist **verpflichtend**, nicht optional | Befund 2.1 | Tree-Pfad ist nicht Slider-tauglich (4,5 s) |
| **Drei** Provisionsstufen L1/L2/L3 statt zwei Pfade | Codex 5.2 | Klarheit, was Chart konkret zeigt |
| Vorberechnete `PersonTreeSnapshot[year]` für Jahres-Slider | Variante B | UX: Jahres-Slider <16 ms |
| Vorberechnete `DiagramYearSnapshot[year]` als zweite Ebene | Codex 2.4 | Layout/Cluster-Bildung muss vorberechnet sein |
| `SimulationModeDecision` als zentrales UX-Modul | Codex 7.4 | Modus muss transparent für User und Code sein |
| Tree wird nur bei Slider-**Commit** gebaut, nie bei Slider-Drag | Klasse 2 Update-Frequenz | Slider darf nicht durch Tree-Build geblockt werden |
| Aggregat-Berechnung (L1) muss <16 ms für Default-Szenario sein | Kriterium #2a | Hero/Chart/Goals während Drag |
| Tree-Aufbau muss progressiv pro Jahr funktionieren mit interaktiver UI | Variante B + Kriterium #10 verschärft | User sieht Jahr 1 bevor Jahr 10 fertig ist |
| Bias-Validierung als Klassen A/B/C pro Phase | Codex 8.1 + Kriterium #3 neu | Realismus statt Optimismus |
| Caps an einer Code-Stelle, vier Metriken | User + Codex 7.2 | Pflegbarkeit + Performance-Korrektheit |
| Mobile und Desktop separate Caps | Codex 6.3 | Faktor 3-8 Performance-Unterschied |
| Shopper-Aggregation in allen Pfaden | User Punkt 2 + Codex 7.5 | Performance + Realismus |
| Kein Weight als Datenkompression | User Punkt 3 + Empfehlung | Korrektheit Phase 2/3 |

---

## 6. Entscheidungen zu den drei offenen Fragen

User-Mandat: „übernimm Codex-Empfehlungen wo plausibel, ich vertraue dem Audit-Prozess". Daraus folgen:

### 6.1 Bias-Annahme — Variable, nicht Pauschal

**Entscheidung:** Codex-Empfehlung übernommen (8.1).

In Schritt 4 wird jede Lösung mit drei Phasen × drei Bias-Klassen bewertet. Lösungen, die in Phase 1 Klasse A erreichen, aber in Phase 2/3 nur Klasse C, werden differenziert eingestuft — nicht pauschal.

Die finale Empfehlung in Schritt 5 hängt vom Ausgang des Bias-Experiments B3 ab. Wenn B3 zeigt, dass Phase 2/3 in Klasse B liegt, ist die Two-Path-Lösung tragfähig. Wenn Klasse C, muss eine Mischlösung diskutiert werden (z.B. L1 als grobe Schätzung mit explizitem Range, L3-Linien-Berechnung für „repräsentative" Knoten).

### 6.2 Strategie-Invarianz von Aggregat — Option 1 mit UI-Hinweis und Streuungsband

**Entscheidung:** Codex-Empfehlung übernommen (5.3).

Aggregat (Klasse 3) bleibt strategie-invariant. Chart zeigt Erwartungswert. UI ergänzt zwei Elemente:

1. **Hinweis** bei Strategie-Wechsel: „Die Strategie verändert die Verteilung im Netzwerkdiagramm, nicht den Gesamterwartungswert im Chart."
2. **Streuungsband** im Chart, **standardmäßig aktiviert**, wenn eine Strategie mit Streuung gewählt ist: Erwartungswert ± Strategiestreuung. Macht sichtbar, dass die Strategie etwas verändert, ohne die schnelle Aggregat-Basis aufzugeben. User-Entscheidung Juni 2026 — kann ggf. später geändert werden, falls UX-Tests anderes zeigen.

**Konsequenz für Kriterium #2:** Das Streuungsband muss aus statistischer Größe abgeleitet werden, nicht aus dem Tree. Sonst wäre es nicht slider-tauglich. Vorschlag: Strategie-spezifische Standardabweichung als Lookup-Tabelle, pro Strategie und Ebene.

### 6.3 M3 hart oder weich — gestuft

**Entscheidung:** Siehe 5.4. Vier Stufen nach Umgebung und Modus.

---

## 7. Benchmark-Plan vor und während Schritt 4

### 7.1 Pflicht vor Schritt 4

**B1. Aggregat-Pfad Performance (1-2 Tage)**

Validierung, dass Tier 1 erreichbar ist.

- Inputs: `m` von 1,0 bis 5,0 in 0,5-Schritten, Strategien standard/dirichlet/momentum
- Messung: end-to-end von `ParameterSnapshot` bis `chartLine[]` in ms
- Plus Recharts-Render-Zeit isoliert (Codex 6.1)
- Kriterium: <16 ms für alle Default-Szenarien

Falls B1 fehlschlägt, ist Two-Path als Architektur nicht UX-tauglich und der Audit muss in eine grundsätzlich andere Richtung. Daher zwingend zuerst.

**B2. Shopper-Aggregation Validation (1 Tag)**

Vor/Nach-Vergleich am DefaultChurn18-Szenario:
- Objektzahl
- `calculateTreeCompensation`-Zeit
- Provisionsergebnis Phase 1 — bleibt es korrekt?

Erwartete Verbesserung: Faktor 2-3 schneller.

### 7.2 Parallel zu Schritt 4

**B3. Bias-Mini-Experiment (3-5 Tage)**

Spezifikation (Codex 7.1):

- Parameter-Sets: 20 (Variation in m, d, c, s)
- Strategien: standard, dirichlet, momentum
- Größen: 1k, 10k, 50k effektive Members
- Messung: getrennt nach Phase 1, Phase 2, Phase 3
- Metrik: |L1 − L2| / L2 in % (relative Abweichung)
- Aggregierung: Klasse A/B/C pro Phase × Strategie

Schritt 4 kann mit Bias als Variable arbeiten, ohne auf B3 zu warten. Schritt 5 hängt von B3 ab.

### 7.3 Nach Schritt 4 / im Implementierungs-Verlauf

**B4. Tree-Aufbau auf echtem Mobile (1-2 Tage)**

- Auf echtem iPhone (nicht Simulator)
- Messung: bei welcher Objektzahl ist Mobile bei 1 s? 5 s? 10 s?
- Memory-Verlauf während Snapshot-Stream-Aufbau
- Ergebnis: kalibrierte Mobile-Caps statt Codex-Schätzung Faktor 3-8

**B5. Progressiver Diagrammaufbau (1 Tag)**

- Variante B vermessen am DefaultChurn18
- Wie lange pro Jahr bis sichtbar?
- Was sieht der User in Sekunde 0,5? 1? 2?
- Validiert Kriterium #10 Stufe 5

### 7.4 Priorisierungs-Matrix

| Benchmark | Vor Schritt 4 | Parallel Schritt 4 | Nach Schritt 4 |
|---|:---:|:---:|:---:|
| B1 Aggregat-Performance | ✅ Pflicht | | |
| B2 Shopper-Aggregation | ✅ Pflicht | | |
| B3 Bias-Experiment | | ✅ Pflicht | |
| B4 Mobile-Caps | | | ✅ Pflicht |
| B5 Progressiver Aufbau | | | ✅ Pflicht |

**Aufwand-Summe vor Schritt 4:** 2-3 Tage. Akzeptabel.

---

## 8. Architektur-Zusammenfassung — die drei Pfade

Nach allen Anpassungen lässt sich die Zielarchitektur kompakt so beschreiben:

```
┌─────────────────────────────────────────────────────────────────┐
│                     ParameterSnapshot                           │
│              (Slider-Inputs, versionierte ID)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SimulationModeDecision                         │
│           (chartMode, exactMode, diagramMode)                   │
└─────────────────────────────────────────────────────────────────┘
       │                      │                       │
       ▼                      ▼                       ▼
┌────────────┐         ┌──────────────┐        ┌─────────────────┐
│ L1 Fast    │         │ L2 Tree      │        │ L3 Lineage      │
│ Aggregat   │         │ Diagnostic   │        │ Exact           │
├────────────┤         ├──────────────┤        ├─────────────────┤
│ <16 ms     │         │ asynchron    │        │ <1 ms pro Order │
│ Slider-Drag│         │ nach Commit  │        │ on-demand       │
│ Tier 1     │         │ Worker       │        │ Tests, Schulung │
├────────────┤         ├──────────────┤        ├─────────────────┤
│ → Hero     │         │ → Diagramm   │        │ → Lineage-View  │
│ → Chart    │         │ → Status-    │        │ → Beispielrech- │
│ → Goals    │         │   Erklärung  │        │   nungen        │
│ → Streuung │         │ → Bein-      │        │ → Unit Tests    │
│   (optional)│        │   Analyse    │        │                 │
└────────────┘         └──────────────┘        └─────────────────┘
                              │
                              ▼
                ┌──────────────────────────────┐
                │   DiagramYearSnapshot[year]  │
                │   (render-fertig pro Jahr)   │
                └──────────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────────┐
                │     Diagramm-Rendering       │
                │  (Jahres-Slider <16 ms)      │
                └──────────────────────────────┘
```

**Die Architektur in einem Satz:** Fast Path rettet die UX, Tree Path liefert die Diagramm-Wahrheit, Lineage Path erklärt die Vergütungslogik im Detail. Keiner blockiert den anderen.

---

## 9. Stand und nächste Schritte

### 9.1 Status Schritt 1-3

| Schritt | Status |
|---|---|
| 1 Bewertungsraster | ✅ angepasst (siehe Kap. 3) |
| 2 Parameter-Inventar | ✅ angepasst (siehe Kap. 4) |
| 3 SSOT + Architektur-Anforderungen | ✅ angepasst (siehe Kap. 5) |
| 4 Lösungsmatrix | 🟡 wartet auf B1 + B2 |
| 5 Konsolidierte Empfehlung | 🟡 wartet auf Schritt 4 + B3 |

### 9.2 Was vor Schritt 4 erledigt sein muss

Pflicht:
- B1 (Aggregat-Performance) ausführen — 1-2 Tage
- B2 (Shopper-Aggregation Validation) ausführen — 1 Tag

Vorschlag:
- Bestätigung dieses Dokuments durch User
- B3 (Bias-Experiment) wird parallel zu Schritt 4 spezifiziert

### 9.3 Entschiedene Klärungen (Juni 2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Mindest-Churn-Schwellen übersteuerbar (Expert Mode)? | **Nein, jetzt nicht.** Schwellen hart verdrahtet. Expert Mode evtl. in späterer Version, aber als Backlog-Punkt vermerkt, nicht für V1. |
| 2 | Streuungsband-Default an/aus? | **Default: an.** Bei aktivierter Strategie mit Streuung wird das Streuungsband im Chart standardmäßig angezeigt. Kann ggf. später geändert werden, wenn UX-Tests anderes zeigen. |
| 3 | Visual Clustering — Mechanik im Diagramm? | **User-Option (Checkbox), Default aus.** Soft-Warn ab 2.000 Render-Knoten (UI-Empfehlung), Hard-Freeze ab 10.000 (Cluster erzwungen). Siehe Kap. 4.3 für volle Logik. |
| 4 | Bestehender Weight-Code: Bestandsaufnahme nötig? | **Nein.** Weight-Code wird im Rahmen der Implementierung der neuen Architektur entfernt. Keine vorgelagerte Analyse, damit alter Code die neue Lösung nicht beeinflusst. Implementierungs-Notiz in Kap. 4.3 festgehalten. |

### 9.4 Nächste Aktion

Nach Bestätigung dieses Dokuments durch den User:

1. B1 und B2 spezifizieren und ausführen.
2. Mit den B1/B2-Ergebnissen Schritt 4 starten.
3. Parallel B3 ausführen.
4. Schritt 5 als finale Empfehlung mit Bias-Klassen-Abhängigkeit formulieren.

---

## Anhang — Diff-Tabelle Dokument 09 → Dokument 10

| Bereich | Dokument 09 | Dokument 10 |
|---|---|---|
| Two-Path-Status | „erlaubt" | „verpflichtend" |
| Default-Member-Zahl | 98k | 59k / 148k Gesamt |
| Default-Realismus-Szenario | m=2, c=0 | m=2, c=18% (15k Member) |
| Kriterium #2 | eine Skala | drei Teilkriterien (Frame / Preview / Commit) |
| Kriterium #3 | Annahme Bias <5% | Bias-Klassen A/B/C pro Phase |
| Kriterium #4 | eine Metrik (Members) | vier Metriken (Members / Objects / Render / Orders) |
| Kriterium #8 | eine Skala | Desktop + Mobile separat |
| Kriterium #10 Stufe 4 | „mit Wartezustand" | + „UI bleibt interaktiv, alte Daten sichtbar" |
| Provisions-Pfade | Aggregat + Tree | L1 Fast + L2 Tree + L3 Lineage |
| Snapshot-Ebenen | PersonTreeSnapshot | + DiagramYearSnapshot |
| Mode-Entscheidung | implizit | `SimulationModeDecision` als zentrales Modul |
| M3-Verhalten | Dev hart, Production weich | vierstufig nach Umgebung und Modus |
| Shopper-Modellierung | Aggregat im Speicher, aber Code führt sie als Objekte | Aggregat in ALLEN Pfaden, kein Shopper-Objekt |
| Weight | nicht entschieden | entfällt; visuelles Clustering als User-Option, Default aus, Soft-Warn / Hard-Freeze als Render-Caps |
| Streuungsband | nicht erwähnt | Default an bei Strategie mit Streuung |
| Mindest-Churn | nicht vorhanden | Schwellen-Tabelle ab m≥2,0 |
| Benchmark-Plan | nicht vorhanden | B1-B5 spezifiziert |

**Stand am Ende dieses Dokuments:** Bewertungsbasis ist auf Codex-Review und User-Klarstellungen angepasst. Schritt 4 wartet auf B1 + B2.
