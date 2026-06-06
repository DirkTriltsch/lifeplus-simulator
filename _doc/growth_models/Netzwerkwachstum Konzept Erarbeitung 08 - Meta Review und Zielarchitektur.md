# Netzwerkwachstum Konzept Erarbeitung 08 - Meta Review und Zielarchitektur

## Ziel dieses Dokuments

Dieses Dokument konsolidiert die bisherigen Konzept- und Review-Schleifen zur Netzwerkwachstumsmodellierung.

Es berücksichtigt zwei neue Leitentscheidungen:

1. Der aktuelle Code darf vollständig überarbeitet oder ersetzt werden. Der Aufwand ist zweitrangig.
2. Entscheidend sind UX und Performance mit Slidern sowie Nachvollziehbarkeit und eine geringe Abweichung zwischen Chart und Diagramm.

Damit verschiebt sich der Fokus:

- Nicht: Wie erhalten wir möglichst viel vom aktuellen Code?
- Sondern: Welche Architektur liefert die beste Bedienbarkeit, fachliche Nachvollziehbarkeit und konsistente Darstellung?

Trotzdem gilt: Bestehende Erkenntnisse aus dem Code und den Dokumenten bleiben wertvoll. Sie sind aber keine Einschränkung für die Zielarchitektur.

## Executive Summary

Die beste Lösung ist keine Single-Engine und keine strikte Single Source of Truth für alle Darstellungen.

Empfohlen wird eine **mehrschichtige Modellarchitektur**:

```txt
Fast Growth Model
-> Slider, Chart, Sofort-KPIs, Caps

Projection / Diagram Model
-> Diagramme, Beine, Cluster, Samples, sichtbare Struktur

Exact Compensation Model
-> Status, Rang-Beine, Vergütung, Golden Tests

Lineage / Explanation Model
-> konkrete Vergütungsbeispiele, Slot-Logik, Schulung

Accuracy Layer
-> Exakt / Geschätzt / Gecappt / Beispielmodus
```

Die Domain-Regeln des Vergütungsplans sollen zentral sein. Die Datenmodelle für Chart, Diagramm und Detailanalyse dürfen aber unterschiedlich sein, wenn sie klar gekoppelt, validiert und in der UI gekennzeichnet werden.

Die wichtigste Architekturregel lautet:

```txt
Chart und Diagramm müssen nicht dieselbe Datenstruktur verwenden.
Sie müssen dieselbe Parameterbasis, dieselbe Planlogik und eine kontrollierte Fehlergrenze haben.
```

## 1. Drift-/Bias-Audit

## 1.1 Früher Bias: "Knotenmodell ist fachlich immer beste Lösung"

In Dokument 02 wurde das echte Knotenmodell als fachlich klar beste Lösung bewertet. Diese Aussage war teilweise richtig, aber zu absolut.

Richtig ist:

- Für exakte Statuslogik, Rang-Beine und Vergütungslogik braucht es echte Struktur oder eine äquivalente, validierte Strukturrepräsentation.

Zu kurz gedacht war:

- Für Live-Slider und Chart ist ein vollständiger Personenbaum nicht automatisch besser.
- Für große Szenarien ist ein vollständiger Tree sogar UX-schädlich.
- Ein Aggregatmodell ist nicht "schwach", sondern für andere Aufgaben optimiert.

Korrektur:

```txt
Knotenmodell = stark für Exaktheit
Aggregatmodell = stark für Live-UX
Projektionsmodell = stark für Diagramm
Lineage-Modell = stark für Erklärung
```

## 1.2 Früher Bias: Single Source of Truth

Die Diskussion bewegte sich zeitweise in Richtung:

```txt
Ein Personenbaum soll alles treiben.
```

Das klingt sauber, erzeugt aber bei Slidern und großen Netzwerken Performance-Probleme.

Die bessere Trennung:

- **Single Source of Domain Rules:** Vergütungslogik, Rangregeln, Slot-Regeln.
- **Multiple Sources of Computation:** Chart, Diagramm, exakte Diagnose dürfen unterschiedliche Rechenmodelle nutzen.

Damit wird vermieden, dass eine fachlich exakte, aber schwere Datenstruktur die gesamte UX verlangsamt.

## 1.3 Früher Bias: Bestandscode schützen

Dokument 06 argumentierte stark aus dem aktuellen Code heraus: bestehende Features, PersonTreeSnapshot, RealityStrategy, LineageView, Goals usw. sollten nicht verloren gehen.

Die neue Leitentscheidung ändert das:

Der aktuelle Code darf ersetzt werden.

Trotzdem bleiben die dort genannten Punkte als fachliche Anforderungen relevant:

- Monats- oder Periodenbezug
- Gewichtung / reduzierte Aktivität
- Shopper als eigene oder aggregierte Entität
- mehrphasige Lifeplus-Vergütung
- konkrete Linien-Erklärung
- Multi-Brand-Perspektive
- Snapshot- oder Time-Scrubbing-Fähigkeit

Diese Funktionen müssen nicht durch Erhalt des Codes geschützt werden. Sie müssen in der Zielarchitektur bewusst neu berücksichtigt werden.

## 1.4 Später hinzugekommene Parameter verändern die Bewertung

Im Verlauf kamen neue Anforderungen hinzu:

- `shoppersPerYear`
- Shopper-Churn
- Dezimalwerte wie `2,5` bei Member/Jahr und Shopper/Jahr
- Eigenumsatz je Knoten
- Status je Knoten
- n*Diamond-Beinlogik
- Caps wie 90.000/100.000 Member oder 500.000 EUR/Monat
- Trägheit der heutigen UX ab ca. 4 Member/Jahr

Dadurch verschiebt sich die Lösung:

Ein vollständiger Tree für alles ist nicht mehr plausibel. Ein reines Aggregat für alles ist fachlich nicht genug. Ein dynamischer Speicher-Hybrid ist logisch riskant.

Die robuste Lösung ist ein **koordiniertes Multi-Modell-System**.

## 2. Neues Bewertungsmodell

Die frühere Matrix "Knoten vs Hybrid vs Aggregat" wird ersetzt.

Bewertet wird jetzt nach Aufgabenbereich.

| Aufgabe | Hauptziel | Bestes Modell | Exaktheit | UX-Priorität |
|---|---|---|---:|---:|
| Slider-Bewegung | sofortige Reaktion | Fast Growth Model | mittel | sehr hoch |
| Chart | glatte Prognosekurve | Aggregat / closed-form / gewichtete Level | mittel bis hoch | sehr hoch |
| Diagramm | Struktur sichtbar machen | Projection Model / Cluster / Sample | mittel | hoch |
| Statusdiagnose | Rang korrekt erklären | Exact Compensation Model | hoch | mittel |
| n*Diamond-Analyse | unabhängige Rang-Beine prüfen | Exact oder bounded Tree | hoch | mittel |
| Vergütungsbeispiel | Auszahlung erklären | Lineage / Slot Engine | sehr hoch | hoch |
| extreme Szenarien | nicht einfrieren | Cap / Aggregatmodus | niedrig bis mittel | sehr hoch |

## 2.1 Bewertungsdimensionen

Jedes Modell wird künftig nach diesen Dimensionen bewertet:

1. Slider-Latenz
2. Chart-Stabilität
3. Diagramm-Nachvollziehbarkeit
4. Fehlerquote gegenüber exakter Berechnung
5. Eignung für Status-/Vergütungslogik
6. Speicherbedarf
7. Mobile-Tauglichkeit
8. Erklärbarkeit in der UI
9. Testbarkeit mit Golden Cases
10. Verhalten bei Caps und Extremparametern

Damit wird verhindert, dass eine Lösung nur wegen "fachlich exakt" oder nur wegen "schnell" bevorzugt wird.

## 3. Verworfene Lösungen neu geprüft

## 3.1 Aggregiertes Bein-/Level-Modell

Frühere Bewertung:

- schwach für Eigenumsatz je Knoten
- schwach für echte Rang-Beine
- nur grobe Simulation

Neue Bewertung:

Das Aggregatmodell ist für Chart und Slider wahrscheinlich die beste Basis.

Stärken:

- sehr schnell
- stabil bei großen Netzwerken
- keine Knotenexplosion
- gut für Caps
- gut für Sofort-KPIs
- ideal für Drag-Preview

Schwächen:

- keine echte Knotenherkunft
- keine beweisbare n*Diamond-Logik
- keine echte Beinstruktur
- Status nur schätzbar

Neue Rolle:

```txt
Fast Growth Model für Slider, Chart, Vorschätzung und Cap-Entscheidung.
```

Nicht verwenden als:

```txt
exakte Vergütungs- oder Rang-Bein-Wahrheit.
```

## 3.2 Vollständiger Personenbaum

Frühere Bewertung:

- fachlich beste Zielarchitektur

Neue Bewertung:

Der vollständige Personenbaum ist fachlich stark, aber nicht als Live-Chart-Engine für alle Parameter geeignet.

Stärken:

- echte Upline
- echte Beine
- Status je Knoten
- n*Diamond nachvollziehbar
- Vergütung pro Order möglich

Schwächen:

- explodiert bei hohen Member/Jahr-Werten
- Slider-Latenz kritisch
- Diagramm bei großen N nicht darstellbar
- braucht Caps oder Worker

Neue Rolle:

```txt
Exact Compensation Model bis zu einem definierten Cap.
```

Nicht verwenden als:

```txt
immer aktive Live-Slider-Basis für jedes Szenario.
```

## 3.3 Dynamischer Speicher-Hybrid

Frühere Idee:

Teilbäume aggregieren, bei Relevanz materialisieren.

Problem:

Um zu wissen, ob ein aggregiertes Bein relevant ist, muss man oft genau die Struktur kennen, die erst durch Materialisierung entsteht.

Neue Bewertung:

Als fachliches Berechnungsmodell weiterhin kritisch.

Aber:

Als **Render-Hybrid** oder **Projection-Hybrid** ist es sehr sinnvoll.

Neue Rolle:

```txt
Diagramm: echte Top-Struktur + aggregierte Cluster + Samples.
```

Nicht verwenden als:

```txt
unsichtbare, fachliche Wahrheit für Rang-Beine.
```

## 3.4 Lineage-Engine

Frühere Rolle:

Nebenmodell für Vergütungsplan-Erklärung.

Neue Bewertung:

Sehr wichtig und weiterhin eigenständig sinnvoll.

Stärken:

- perfekte Nachvollziehbarkeit
- sehr gut testbar
- ideal für Lifeplus-Phasenlogik
- kann Golden Cases aus Schulungsunterlagen abbilden

Schwächen:

- simuliert kein ganzes Netzwerk
- kein Chart-Modell

Neue Rolle:

```txt
Erklär- und Testmodell für Vergütungslogik.
```

## 3.5 SoA / Typed Arrays

Frühere Rolle:

Zielmodell für Performance.

Neue Bewertung:

Sinnvoll, aber nicht zuerst wegen Architekturästhetik.

SoA sollte eingeführt werden, wenn Benchmarks zeigen:

- Object-Tree ist im Exact-Modus zu langsam
- Worker-Transfer ist zu teuer
- Speicher wird auf Mobile kritisch

Neue Rolle:

```txt
Optimierung für Exact Model oder Projection Model, nicht zwingend für Fast Chart Model.
```

## 4. Zielarchitektur

## 4.1 Überblick

```txt
Inputs / Slider
    |
    v
Fast Growth Model  ---------------------+
    |                                    |
    | Chart, Sofort-KPIs, Caps           |
    v                                    |
Mode Decision                            |
    |                                    |
    +--> Exact Compensation Model -------+--> Accuracy Layer --> UI
    |                                    |
    +--> Projection / Diagram Model -----+
    |
    +--> Lineage / Explanation Model
```

## 4.2 Fast Growth Model

Zweck:

- sofortige Slider-Reaktion
- Chart
- Größenabschätzung
- Cap-Entscheidung
- wirtschaftliche Zielbereiche

Eigenschaften:

- O(Jahre * Ebenen) oder closed-form
- keine vollständige Personenmaterialisierung
- Dezimalwerte erlaubt
- sehr schnelle Reberechnung
- deterministisch

Mögliche Daten:

```ts
type FastGrowthYear = {
  year: number;
  membersByLevel: number[];
  shoppersByLevel: number[];
  estimatedLegs: FastLegEstimate[];
  totalMembers: number;
  totalShoppers: number;
  estimatedQgv: number;
  estimatedMonthlyEur: number;
};
```

Dieses Modell darf mit gewichteten oder dezimalen Mengen arbeiten. Das ist für Chart und Slider akzeptabel.

## 4.3 Exact Compensation Model

Zweck:

- Status je Knoten
- echte Beinlogik
- n*Diamond-Prüfung
- exakte Vergütung innerhalb eines Caps

Eigenschaften:

- diskrete oder gewichtete Personen
- echte Sponsorbeziehungen
- echte Upline-Pfade
- Lifeplus-Planlogik zentral
- Golden-Test-fähig

Cap:

```txt
Exact Model nur bis MAX_EXACT_MEMBERS.
```

Empfehlung:

```txt
MAX_EXACT_MEMBERS = 100.000
WARN_EXACT_MEMBERS = 75.000
WORKER_THRESHOLD_MEMBERS = 25.000
```

Wenn die exakte Struktur darüber liegt, wird nicht heimlich gerechnet, sondern bewusst in den geschätzten Modus gewechselt.

## 4.4 Projection / Diagram Model

Zweck:

- Diagramme flüssig halten
- sichtbare Struktur zeigen
- Abweichung zum Chart gering halten
- große Netzwerke verdichten

Es darf aus mehreren Quellen gespeist werden:

- aus Fast Growth Model
- aus Exact Model
- aus Sample-Bäumen
- aus Cluster-Aggregaten

Mögliche Daten:

```ts
type DiagramNode = {
  id: string;
  label: string;
  kind: 'person' | 'cluster' | 'leg' | 'shopperAggregate';
  members: number;
  shoppers: number;
  qgv: number;
  rank?: string;
  exactness: 'exact' | 'estimated' | 'clustered';
  children?: DiagramNode[];
};
```

Wichtig:

Das Diagramm muss nicht jede Person enthalten. Es muss erklären, was es zeigt.

Beispiel:

```txt
Bein 1: 12.400 Member, davon 43 sichtbar, Rest als Cluster.
```

## 4.5 Lineage / Explanation Model

Zweck:

- konkrete Order entlang Upline erklären
- Phase 1/2/3 Slots zeigen
- Golden Tests für Lifeplus-Logik
- Schulungsbeispiele

Dieses Modell bleibt unabhängig von der Wachstumssimulation.

Es nutzt dieselbe Domain-Logik:

- Phase-1-Kompression
- Phase-2-Slots
- Phase-3-Slots
- Ein-Phase-Regel je Order

## 4.6 Accuracy Layer

Jedes Ergebnis braucht einen Modus:

```ts
type AccuracyMode =
  | 'exact'
  | 'estimated'
  | 'capped'
  | 'clustered'
  | 'example';
```

UI-Beispiele:

```txt
Exakt berechnet bis 84.200 Member.
```

```txt
Geschätzt: Dieses Szenario erzeugt ca. 1,8 Mio. Member. Detailanalyse ist aus Performancegründen begrenzt.
```

```txt
Diagramm geclustert: sichtbare Knoten repräsentieren Gruppen.
```

## 5. Fehlerquote explizit machen

## 5.1 Warum Fehlerquote akzeptabel ist

Chart und Diagramm müssen nicht bitgenau identisch sein, solange:

- die Abweichung klein ist,
- die Abweichung messbar ist,
- die UI den Modus kennt,
- exakte Aussagen nur im exakten Modus gemacht werden.

## 5.2 Fehlerarten

| Fehlerart | Ursache | Relevanz |
|---|---|---|
| Größenfehler | Aggregat vs. diskrete Personen | Chart/Netzwerkgröße |
| Beinfehler | symmetrische Schätzung vs. echte Struktur | Rang-Beine |
| Statusfehler | geschätzte QGV/QL | Rang |
| Diagrammfehler | Sampling/Clustering | Visualisierung |
| Rundungsfehler | Dezimalwerte / Carry-over | kleine Netzwerke |

## 5.3 Ziel-Fehlergrenzen

Vorschlag für V1:

| Bereich | Zielabweichung |
|---|---:|
| Chart Gesamtmember vs. Exact unter Cap | < 2 % |
| Chart Gesamtumsatz vs. Exact unter Cap | < 2 % |
| Diagramm Mitglieder je Bein vs. Exact unter Cap | < 5 % |
| Diagramm QGV je Bein vs. Exact unter Cap | < 5 % |
| Statusangabe | nur exakt anzeigen, wenn Exact verfügbar |
| n*Diamond | nur exakt anzeigen, wenn Exact verfügbar |

Wenn diese Grenzen überschritten werden, muss die UI den Modus auf "geschätzt" oder "geclustert" setzen.

## 5.4 Validierungsstrategie

Für Parameter unterhalb des Caps werden Fast Model und Exact Model parallel verglichen.

Tests:

```txt
Parameter-Set -> FastGrowth
Parameter-Set -> ExactTree
Vergleich: totalMembers, totalShoppers, QGV, leg volumes
```

Damit wird die Fehlerquote messbar.

Für große Szenarien wird Exact nicht mehr vollständig gerechnet. Dort wird nur noch Plausibilität geprüft:

- monotones Wachstum bei steigendem membersPerYear
- Churn senkt Wachstum
- Shopper/Jahr erhöht Umsatz
- Cap-Modus wird korrekt ausgelöst

## 6. Performance- und UX-Strategie

## 6.1 Performance ist Kernanforderung

Die heutige UX ist bereits träge ab aggressiven Parametern.

Daher gilt:

```txt
Slider darf niemals auf Exact Model warten.
```

## 6.2 Slider-Modell

Während Drag:

- nur Fast Growth Model
- Chart und KPIs sofort
- keine vollständige Exact-Neuberechnung

Nach Commit / Debounce:

- Mode Decision
- falls unter Cap: Exact Model asynchron starten
- Diagramm aktualisieren, sobald Ergebnis da ist

Ziel:

```txt
Slider-Frame < 16 ms
Fast Preview < 5 ms
Exact Update asynchron
```

## 6.3 Caps

Empfohlene Startwerte:

```txt
WORKER_THRESHOLD_MEMBERS = 25.000
WARN_EXACT_MEMBERS = 75.000
MAX_EXACT_MEMBERS = 100.000
MAX_DISPLAY_MONTHLY_EUR = 500.000
```

Begründung:

- `100.000` Member ist ein plausibler technischer Cap für exakte Diagnose in V1.
- `25.000` schützt den Main Thread.
- `500.000 EUR/Monat` ist ein wirtschaftlicher Zielbereich-Cap, nicht der technische Hauptcap.

Bei `4 Member/Jahr` und `100 %` Duplikation entstehen Größenordnungen im zweistelligen Millionenbereich. Das muss immer Aggregat-/Cap-Modus sein.

## 6.4 Diagrammstrategie

| Größe | Diagramm |
|---:|---|
| < 5.000 | Personenbaum möglich |
| 5.000-25.000 | Personenbaum mit Collapsing/Virtualisierung |
| 25.000-100.000 | Top-Beine + Cluster |
| > 100.000 | Cluster/Sample aus Fast Model |

Diese Werte müssen durch Benchmarks validiert werden.

## 7. Konkrete Zielentscheidung

Die finale Zielarchitektur sollte nicht lauten:

```txt
Personenbaum ist Single Source of Truth für alles.
```

Sondern:

```txt
Vergütungslogik ist die zentrale Domain-Wahrheit.
Chart, Diagramm und Detailanalyse nutzen spezialisierte Modelle,
die über Parameter, Validierung und Accuracy Layer gekoppelt sind.
```

Das ist die beste Balance aus:

- schneller UX
- nachvollziehbarer Diagrammlogik
- begrenztem Fehler zwischen Chart und Diagramm
- exakter Vergütungsdiagnose dort, wo sie sinnvoll und performant möglich ist

## 8. Nächster sinnvoller Schritt

Nicht sofort SoA bauen. Nicht sofort aktuellen Code retten. Nicht sofort alles neu.

Der nächste Schritt sollte ein **Modell-Konsistenz-Prototyp** sein.

## 8.1 Prototyp A: Fast Model vs. Exact Model

Ziel:

Die Abweichung zwischen Chart-Modell und Exact-Modell messen.

Umfang:

- 20-50 Parameter-Sets
- unterhalb `MAX_EXACT_MEMBERS`
- Vergleich von:
  - Member gesamt
  - Shopper gesamt
  - QGV
  - Umsatz
  - Beinvolumen
  - Rang, wenn Exact verfügbar

Ergebnis:

Eine Tabelle:

```txt
Parameter | Fast Member | Exact Member | Abweichung | Modus
```

Wenn die Abweichung klein ist, darf Fast Model Chart-Basis bleiben.

## 8.2 Prototyp B: Diagram Projection

Ziel:

Ein Diagramm erzeugen, das aus Fast oder Exact gespeist werden kann und seine Genauigkeit kennt.

Test:

- kleines Netzwerk: Diagramm aus Exact
- mittleres Netzwerk: Diagramm aus Exact + Cluster
- großes Netzwerk: Diagramm aus Fast + Cluster

## 8.3 Prototyp C: Accuracy Layer UI

Ziel:

Der User sieht immer, ob eine Aussage exakt, geschätzt oder gecappt ist.

Beispiele:

- "Chart geschätzt"
- "Status exakt"
- "Diagramm geclustert"
- "Detailanalyse wegen Größe begrenzt"

## 9. Empfohlene Implementierungsreihenfolge

1. Fast Growth Model definieren und benchmarken.
2. Exact Model oder bestehenden PersonTree als Vergleichsmodell definieren.
3. Abweichung zwischen Fast und Exact unter Cap messen.
4. Accuracy Modes einführen.
5. Slider in Preview und Commit trennen.
6. Caps und Mode Decision implementieren.
7. Diagram Projection Model bauen.
8. Erst danach entscheiden:
   - bestehender PersonTree optimieren,
   - neuen Exact Tree bauen,
   - SoA einführen,
   - Worker einsetzen.

## 10. Offene Fragen

1. Welche Abweichung zwischen Chart und Exact ist für Dich akzeptabel: 1 %, 2 %, 5 %?
2. Soll der Chart immer Fast Model nutzen, auch wenn Exact verfügbar ist, oder bei kleinen Szenarien auf Exact synchronisiert werden?
3. Soll das Diagramm bei großen Szenarien eher "typische Struktur" zeigen oder "Top-Beine plus Cluster"?
4. Soll `500.000 EUR/Monat` als harte Obergrenze, Warnschwelle oder nur als Darstellungsformat `>500.000` verwendet werden?
5. Ist `100.000 Member` als Exact-Cap akzeptabel, oder bevorzugst Du bewusst konservativ `90.000`?

## Empfehlung

Meine Empfehlung nach dem Meta-Audit:

```txt
Fast Model ist primär für Chart und Slider.
Exact Model ist primär für Status, Beine und Vergütung bis Cap.
Projection Model ist primär für Diagramme.
Lineage Model ist primär für Erklärung und Tests.
Accuracy Layer verbindet alles sichtbar für den User.
```

Damit lösen wir den Single-source-of-truth-Konflikt ohne fachliche Beliebigkeit.

Der nächste praktische Schritt ist nicht "neue Engine bauen", sondern:

```txt
Fast-vs-Exact-Abweichung messen und daraus den finalen Modellmix ableiten.
```

Wenn die Abweichung klein bleibt, gewinnen wir eine sehr performante UX. Wenn sie zu groß wird, wissen wir exakt, an welchen Parametern oder Diagramm-Modi wir korrigieren müssen.
