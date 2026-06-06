# Netzwerkwachstum Konzept Erarbeitung 02

## Kontext

Das erste Dokument vom Beginn des Chats ist als bekannt vorausgesetzt. Dieses Dokument fasst den weiteren Verlauf der Diskussion vollständig zusammen, damit der aktuelle Stand der Konzept-Erarbeitung einem Review unterzogen werden kann.

## Anfrage

Es sollten die drei favorisierten Lösungen für die Modellierung des Netzwerkwachstums bewertet werden. Die Bewertung sollte sich auf folgende Aspekte beziehen:

1. Wie gut kann die jeweilige Lösung verarbeiten, dass jeder Knoten einen Eigenumsatz hat, der definiert ist, z. B. 45 IP?
2. Wie gut können die Umsätze je Knoten summiert werden?
3. Wie gut kann der Lifeplus-Vergütungsplan angebunden werden, insbesondere Berechnung des Status des Knotens wie Believer, Bronze usw. sowie Mindestumsatz je Status?
4. Wie gut können die Beine nach Status-Knoten analysiert werden, z. B. für n*Diamond-Status?

Zusätzlich sollten weitere relevante Probleme und/oder Lösungen aufgezeigt werden.

## Bewertete Top-3-Lösungen

Die drei favorisierten Lösungen wurden wie folgt festgelegt:

1. Echtes Knoten-/Graphmodell
2. Hybrid-Modell: echte Top-Knoten plus aggregierte Teilbäume
3. Aggregiertes Bein-/Level-Modell

## Kurzurteil

Wenn der Vergütungsplan wirklich korrekt angebunden werden soll, ist das echte Knotenmodell klar die beste Zielarchitektur. Das Hybrid-Modell ist der pragmatische Übergang. Das reine Aggregatmodell reicht für grobe Simulationen, wird aber bei Status-, Bein- und Ranglogik schnell unscharf.

## Bewertungsmatrix

| Kriterium | Echtes Knotenmodell | Hybrid-Modell | Aggregiertes Bein-/Level-Modell |
|---|---:|---:|---:|
| 1. Eigenumsatz je Knoten, z. B. 45 IP | sehr gut | gut | schwach bis mittel |
| 2. Umsätze je Knoten/Subtree summieren | sehr gut | gut | gut für Summen, schwach für Herkunft |
| 3. Lifeplus-Vergütungsplan anbinden | sehr gut | gut bis sehr gut | mittel, bei höheren Rängen schwach |
| 4. Beine nach Status analysieren, z. B. n*Diamond | sehr gut | gut | schwach bis mittel |

## Lösung 1: Echtes Knoten-/Graphmodell

Das echte Knoten-/Graphmodell wurde als fachlicher Favorit bewertet.

Jeder Partner, Kunde oder relevante Akteur ist ein eigener Knoten.

Beispielhafte Datenstruktur:

```ts
type Node = {
  id: string;
  parentId: string | null;
  ownIp: number;
  customerIp: number;
  rank?: Rank;
  children: string[];
  subtreeIp?: number;
  qualifiedLegs?: LegQualification[];
};
```

### Bewertung zu Kriterium 1: Eigenumsatz je Knoten

Diese Lösung kann sehr gut verarbeiten, dass jeder Knoten einen eigenen Umsatz besitzt. Jeder Knoten kann eigene Werte tragen, z. B.:

- `45 IP`
- `100 IP`
- `0 IP`
- eigener Kundenumsatz
- Qualifikationsumsatz

Dadurch ist der Eigenumsatz nicht nur eine rechnerische Verteilung, sondern eine explizite Eigenschaft des jeweiligen Knotens.

### Bewertung zu Kriterium 2: Umsätze je Knoten summieren

Die Summierung ist in diesem Modell natürlich und präzise möglich. Es kann ein Postorder-Traversal von unten nach oben verwendet werden:

1. Zuerst werden die Kinder berechnet.
2. Danach wird der Elternknoten berechnet.
3. Der Gruppenumsatz eines Knotens ergibt sich aus Eigenumsatz plus Umsätzen der Downline.

Damit lassen sich Subtree-Umsätze, Bein-Umsätze und Gesamtumsätze sauber berechnen.

### Bewertung zu Kriterium 3: Lifeplus-Vergütungsplan anbinden

Für den Lifeplus-Vergütungsplan ist das echte Knotenmodell die stärkste Lösung, weil die Ranglogik nicht geschätzt werden muss.

Für jeden Knoten kann geprüft werden:

- Eigenumsatz / AV
- Gruppenumsatz / QGV
- qualifizierte Linien / QL
- Anzahl Bronze-Beine
- Anzahl Diamond-Beine
- stärkstes Bein versus Restvolumen
- Status von Downline-Knoten

Status wie Believer, Bronze, Silver, Gold, Diamond und weitere Diamond-Stufen können dadurch auf Basis echter Strukturbedingungen berechnet werden.

### Bewertung zu Kriterium 4: Beine nach Status analysieren

Auch n*Diamond-Analysen werden mit diesem Modell sauber möglich. Es wird nicht nur geprüft, wie viel Volumen in einem Bein steckt, sondern ob dort wirklich ein Knoten mit Diamond-Status liegt und ob mehrere Beine unabhängig qualifiziert sind.

Damit kann sauber beantwortet werden:

- Welche direkten Beine enthalten Diamond-Knoten?
- Welche Beine enthalten Bronze-Knoten?
- Welche Beine zählen für 1*Diamond, 2*Diamond, 3*Diamond usw.?
- Sind die qualifizierten Beine unabhängig voneinander?

### Problem der Lösung

Das echte Knotenmodell kann groß werden. Bei sehr vielen simulierten Personen steigt die Anzahl der Nodes stark an.

### Mögliche Lösungen für dieses Problem

Zur Begrenzung von Größe und Rechenaufwand wurden genannt:

- Caching
- jährliche Snapshots
- komprimierte Teilbäume
- Simulation nur bis zu einer sinnvollen Tiefe

### Gesamtbewertung

Das echte Knoten-/Graphmodell ist fachlich die beste Lösung, aber technisch etwas aufwendiger.

## Lösung 2: Hybrid-Modell: echte Top-Knoten plus aggregierte Teilbäume

Das Hybrid-Modell wurde als pragmatischer Favorit für eine performante App bewertet.

In diesem Modell werden die ersten Ebenen und direkten Beine echt modelliert, während tiefere Strukturen aggregiert gespeichert werden.

Beispiele für echte Knoten:

- Du
- direkte Partner
- deren direkte Partner
- relevante Rangträger
- qualifizierte Beine

Tiefere Strukturen können aggregiert werden.

Beispielhafte Datenstruktur:

```ts
type HybridNode = {
  id: string;
  ownIp: number;
  children: HybridNode[];
  aggregate?: {
    members: number;
    totalIp: number;
    estimatedRanks: Record<Rank, number>;
    bronzeLegs: number;
    diamondLegs: number;
  };
};
```

### Bewertung zu Kriterium 1: Eigenumsatz je Knoten

Der Eigenumsatz je sichtbarem oder explizitem Knoten ist sehr gut möglich. Jeder echte Knoten kann eigene Werte tragen.

Bei aggregierten Teilbäumen ist der Eigenumsatz einzelner Personen jedoch nicht vollständig explizit vorhanden. Dort wird mit Summen oder Annahmen gearbeitet.

### Bewertung zu Kriterium 2: Umsätze je Knoten summieren

Umsätze je Knoten lassen sich gut summieren, solange klar getrennt wird zwischen:

- `ownIp`
- `visibleChildrenIp`
- `aggregateIp`

Ein Knoten kann also sowohl eigene Umsätze als auch Umsätze aus echten Kindern und aggregierten Teilbäumen enthalten.

### Bewertung zu Kriterium 3: Lifeplus-Vergütungsplan anbinden

Der Lifeplus-Vergütungsplan lässt sich deutlich besser anbinden als im reinen Aggregatmodell, weil die entscheidenden Rang-Beine als echte Knoten geführt werden können.

Für hohe Status wie 1*Diamond, 2*Diamond und 3*Diamond ist wichtig, dass qualifizierte Beine nicht nur rechnerische Schätzwerte sind, sondern als konkrete Bein-Wurzeln existieren.

### Bewertung zu Kriterium 4: Beine nach Status analysieren

Die Analyse von Beinen nach Status ist gut möglich, sofern alle relevanten Status-Beine explizit modelliert werden.

Für die Analyse von n*Diamond-Status sollten insbesondere qualifizierte Beine und relevante Rangträger als echte Knoten existieren.

### Problem der Lösung

Es muss sauber definiert werden, wann aus einem Aggregat ein echter Knoten wird.

### Mögliche Lösung für dieses Problem

Sobald ein Bein Bronze, Diamond oder höher erreicht, sollte es explizit materialisiert werden.

Das bedeutet: Ein zunächst aggregiertes Bein wird bei fachlicher Relevanz in echte Knoten überführt oder zumindest als expliziter qualifizierter Rang-Knoten repräsentiert.

### Gesamtbewertung

Das Hybrid-Modell ist der beste Kompromiss aus Genauigkeit, Performance und UI-Tauglichkeit.

## Lösung 3: Aggregiertes Bein-/Level-Modell

Das aggregierte Bein-/Level-Modell ist vermutlich am nächsten an der bisherigen Simulatorlogik.

In diesem Modell wird nicht jede Person einzeln gespeichert. Stattdessen werden Zahlen pro Jahr, Ebene und Bein gespeichert.

Beispielhafte Datenstruktur:

```ts
type LegAggregate = {
  level: number;
  members: number;
  shoppers: number;
  totalIp: number;
  estimatedRank?: Rank;
};
```

### Bewertung zu Kriterium 1: Eigenumsatz je Knoten

Für Eigenumsatz je Knoten ist dieses Modell schwach, weil es keine echten Knoten gibt.

Ein Eigenumsatz kann nur geschätzt oder durchschnittlich verteilt werden, zum Beispiel:

```txt
totalIp / members
```

Das kann für grobe Prognosen reichen, ist aber nicht belastbar für echte Rang- und Vergütungslogik.

### Bewertung zu Kriterium 2: Umsätze je Knoten summieren

Für einfache Umsatzsummen funktioniert das Modell gut.

Man kann schnell Aussagen treffen wie:

- Bein A hat 12.000 IP
- Bein B hat 4.000 IP
- Ebene 3 hat 8.500 IP

Das Modell ist also gut für Summen, aber schwach bei der Herkunft des Umsatzes.

### Bewertung zu Kriterium 3: Lifeplus-Vergütungsplan anbinden

Beim Lifeplus-Vergütungsplan wird dieses Modell kritisch, sobald Status nicht nur vom Gesamtumsatz abhängt, sondern von qualifizierten Linien und Rang-Beinen.

Beispiel:

Zwei Modelle können denselben Gesamtumsatz haben, aber völlig unterschiedliche Status erreichen:

- 30.000 IP in einem starken Bein
- 30.000 IP verteilt auf drei qualifizierte Beine

Aggregiert sehen beide Fälle ähnlich aus. Vergütungslogisch sind sie aber nicht gleich.

Deshalb ist das Modell für einfache Statusprognosen brauchbar, bei höheren Rängen aber schwach.

### Bewertung zu Kriterium 4: Beine nach Status analysieren

Für n*Diamond-Analyse ist dieses Modell nur schätzend brauchbar.

Es kann Aussagen treffen wie:

```txt
wahrscheinlich 2 Diamond-Beine
```

Es kann aber nicht wirklich beweisen, dass zwei unabhängige Beine Diamond erreicht haben.

### Gesamtbewertung

Das aggregierte Bein-/Level-Modell ist gut für schnelle Simulationen, aber schwach für belastbare Status- und Beinlogik.

## Relevante Zusatzprobleme

### Problem 1: Qualifikationslogik braucht Herkunft

Das wichtigste Problem ist nicht nur die Frage Graph oder Aggregat. Entscheidend ist, dass Qualifikationslogik Herkunft benötigt.

Ein Umsatzbetrag allein reicht nicht.

Es muss bekannt sein:

- Von welchem Bein kommt der Umsatz?
- Ist das Bein unabhängig qualifiziert?
- Hat die Bein-Wurzel selbst Status oder nur jemand tief darunter?
- Zählt Umsatz aus einem hochrangigen Bein voll, gekappt oder anders?
- Gibt es Mindest-Eigenumsatz je Status?
- Gibt es Aktivitätsbedingungen, Kundenbedingungen oder Periodenlogik?

### Problem 2: Zeit und Statusverlauf

Ein weiteres Problem ist Zeit.

Status wird oft periodisch bewertet. Ein Knoten kann in einem Jahr einen bestimmten Status haben und in einem anderen Jahr einen anderen Status.

Beispiel:

- Jahr 3: Bronze
- Jahr 4: Diamond
- Jahr 5: Status fällt wieder

Daher sollte das Modell Snapshots pro Monat oder Jahr unterstützen.

Beispielhafte Snapshot-Struktur:

```ts
type NodeSnapshot = {
  nodeId: string;
  period: string;
  ownIp: number;
  groupIp: number;
  rank: Rank;
  qualifiedLegs: number;
};
```

## Empfehlung

Für Lifeplus wurde empfohlen, wie folgt vorzugehen:

1. Jetzt ein Hybrid-Modell einführen.
2. Die Kernlogik der Rangberechnung so schreiben, als gäbe es echte Nodes.
3. Für Performance tiefe Strukturen zunächst aggregieren.
4. Später bei Bedarf mehr echte Nodes materialisieren.

Die Architektur sollte also nicht sofort einen riesigen vollständigen Baum erzwingen. Sie sollte aber so gewählt werden, dass echte Knoten möglich sind.

Dadurch entsteht eine saubere Grundlage für Vergütungslogik, ohne die App unnötig schwer zu machen.

## Aktueller konzeptioneller Stand

Der aktuelle Stand der Diskussion ist:

- Das reine Aggregatmodell ist für grobe Simulationen geeignet, aber nicht ausreichend belastbar für präzise Lifeplus-Statuslogik.
- Das echte Knotenmodell ist fachlich am korrektesten, aber potenziell rechen- und speicherintensiv.
- Das Hybrid-Modell ist der bevorzugte nächste Umsetzungsschritt.
- Entscheidend ist, dass relevante Rang- und Status-Beine als echte, analysierbare Strukturelemente existieren.
- Die Rangberechnung sollte konzeptionell bereits node-basiert entworfen werden, auch wenn nicht jeder simulierte Teilnehmer sofort als vollständiger Knoten materialisiert wird.
- Umsatzsummen müssen nicht nur als Gesamtbetrag, sondern mit Herkunft nach Bein und Knotenstruktur verfügbar sein.
- Für Review und weitere Ausarbeitung sollte besonders geprüft werden, welche Lifeplus-Rangbedingungen echte Knoten zwingend benötigen und welche zunächst aggregiert oder geschätzt werden dürfen.
