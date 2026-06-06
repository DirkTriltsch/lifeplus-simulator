# Netzwerkwachstum Konzept Erarbeitung 05 - Umsetzungsvorschläge

## Ziel

Dieses Dokument beschreibt konkrete Umsetzungsvorschläge für das Netzwerkwachstumsmodell des Lifeplus-Simulators.

Es baut auf dem überarbeiteten Architekturstand aus "Netzwerkwachstum Konzept Erarbeitung 04" auf:

- materialisierter Sponsorbaum als Berechnungsgrundlage
- Shopper als aggregierte Kundenzahl je Member
- deterministische Verarbeitung gebrochener Slider-Werte wie `2,5`
- datengetriebene Vergütungsplan-Engine
- adaptive Visualisierung statt fachlich unscharfer Speicher-Hybrid

## Grundentscheidung

Die Engine sollte in der ersten belastbaren Version nicht versuchen, "teilweise echte" und "teilweise geschätzte" Subtrees fachlich zu mischen.

Empfohlene Strategie:

```txt
Parameter -> Größenabschätzung -> TreeStore -> Volumen -> Status -> Bein-Indizes -> UI
```

Aggregierte Modelle dienen zur Größenabschätzung und zur UI-Verdichtung. Die fachliche Status- und Vergütungslogik arbeitet auf einem materialisierten Partnerbaum.

Shopper werden zunächst nicht als Baumknoten materialisiert, sondern pro Member als aggregierte Kundenanzahl und Kundenvollumen geführt.

## Umsetzungsvorschlag A: Minimal robuste Engine

Dieser Vorschlag ist die empfohlene Startimplementierung.

### Zweck

Eine fachlich saubere und noch überschaubare Engine, die:

- Member-Wachstum abbildet
- Shopper/Jahr abbildet
- gebrochene Slider-Werte deterministisch verarbeitet
- Shopper-Churn verarbeitet
- Member-Churn vorbereitet
- Eigenumsatz und Shopper-Umsatz trennt
- Gruppenvolumen summiert
- Statusregeln später sauber anbinden kann

### Datenmodell

```ts
type GrowthParams = {
  years: number;
  membersPerYear: number;
  shoppersPerYear: number;
  memberChurnRate: number;
  shopperChurnRate: number;
  minMemberVolume: number;
  minShopperVolume: number;
  seed: number;
};
```

Wenn die UI zunächst nur eine Churn-Rate besitzt, sollte intern trotzdem sauber getrennt werden:

```ts
memberChurnRate = ui.churnRate;
shopperChurnRate = ui.churnRate;
```

Das verhindert spätere Umbauten.

### TreeStore

```ts
type TreeStore = {
  nodeCount: number;
  parentIds: Int32Array;
  yearOfBirth: Int16Array;
  isActive: Uint8Array;

  ownVolume: Float32Array;
  shopperCount: Float32Array;
  shopperVolume: Float32Array;

  childrenStart: Int32Array;
  childrenCount: Uint16Array;
  childrenFlat: Int32Array;
};
```

### DerivedStore

```ts
type DerivedStore = {
  personalVolume: Float32Array;
  groupVolume: Float32Array;
  qualifyingGroupVolume: Float32Array;
  rankOrdinal: Uint8Array;
};
```

### Warum Shopper nicht als Tree-Knoten?

Shopper:

- haben keinen Status
- haben keine Downline
- erzeugen keine neuen Member
- erzeugen keine neuen Shopper
- tragen nur Umsatz bei

Daher reicht zunächst:

```txt
Member -> shopperCount + shopperVolume
```

Das spart Speicher und hält die Beinanalyse sauber, weil direkte Beine weiterhin nur Partner-Subtrees sind.

## Umsetzungsvorschlag B: Deterministisches Fractional Apportioning

### Problem

Slider-Werte können gebrochen sein:

```txt
membersPerYear = 2,5
shoppersPerYear = 3,5
```

Naive Rundung pro Knoten ist falsch.

### Ziel

Die Summe soll dem Erwartungswert entsprechen:

```txt
aktive Member * Rate
```

Beispiel:

```txt
4 aktive Member * 2,5 = 10 neue Member
```

Nicht:

```txt
4 * round(2,5) = 12
```

### Empfohlener Algorithmus

Für jeden aktiven Member und jede Rate:

```txt
raw = rate + carry[node]
count = floor(raw)
carry[node] = raw - count
```

Für `2,5` ergibt das über zwei Jahre typischerweise:

```txt
Jahr 1: 2 neue, carry 0,5
Jahr 2: 3 neue, carry 0,0
```

### Fairness-Verbesserung

Damit nicht alle Nodes im selben Jahr dieselbe 2/3-Abfolge haben, kann der Carry initial deterministisch versetzt werden:

```ts
initialCarry = stableHash(nodeId, seed) % 1000 / 1000;
```

Dann bleibt die Simulation deterministisch, verteilt aber Extra-Wachstum besser.

### Konkrete Funktion

```ts
function apportionCount(rate: number, carry: number): { count: number; carry: number } {
  const raw = rate + carry;
  const count = Math.floor(raw);
  return { count, carry: raw - count };
}
```

Für Churn:

```ts
function apportionLoss(count: number, churnRate: number, carry: number) {
  const raw = count * churnRate + carry;
  const loss = Math.floor(raw);
  return {
    loss: Math.min(loss, count),
    carry: raw - loss,
  };
}
```

## Umsetzungsvorschlag C: Periodischer Builder

### Ziel

Das Netzwerk wird jahrweise aufgebaut. Für jeden Zeitraum:

1. bestehende aktive Member erzeugen neue Member
2. bestehende aktive Member erzeugen neue Shopper
3. Shopper-Churn reduziert Shopper je Member
4. optional Member-Churn deaktiviert Member
5. Volumen wird aktualisiert

### Pseudocode

```txt
create root

for year in 1..years:
  sourceMembers = active members existing at start of year

  for member in sourceMembers:
    newMemberCount = apportion(membersPerYear, memberCarry[member])
    create newMemberCount children under member

    newShopperCount = apportion(shoppersPerYear, shopperCarry[member])
    shopperCount[member] += newShopperCount

    lostShopperCount = apportionLoss(shopperCount[member], shopperChurnRate, shopperChurnCarry[member])
    shopperCount[member] -= lostShopperCount

  update shopperVolume = shopperCount * minShopperVolume
  update ownVolume = active ? minMemberVolume : 0
```

### Wichtiges Detail: Source Snapshot

Neue Member eines Jahres sollten nicht im selben Jahr sofort selbst neue Member und Shopper erzeugen, außer das ist fachlich ausdrücklich gewünscht.

Empfehlung:

```txt
sourceMembers = Snapshot vor Jahreswachstum
```

Das verhindert unbeabsichtigtes exponentielles Wachstum innerhalb eines Jahres.

## Umsetzungsvorschlag D: Volumen-Pass

### Personal Volume

Für jeden Member:

```txt
personalVolume = ownVolume + shopperVolume
```

Wenn später Kundenvolumen anders zählt als Eigenumsatz, wird diese Formel planabhängig angepasst.

### Group Volume

Gruppenvolumen:

```txt
groupVolume[node] = personalVolume[node] + sum(groupVolume[child])
```

Berechnung:

```txt
iterate nodes in reverse creation order
```

Da Kinder nach Eltern erzeugt werden, reicht meistens reverse index order.

### Qualifying Group Volume

`qualifyingGroupVolume` sollte getrennt geführt werden, auch wenn es zunächst identisch mit `groupVolume` ist.

Grund:

Später können Regeln greifen wie:

- inaktive Knoten komprimieren
- bestimmte Umsätze zählen nicht für Qualifikation
- stärkstes Bein wird gekappt
- Kundenumsatz zählt anders als Memberumsatz

## Umsetzungsvorschlag E: Lifeplus-Plan-Engine

### Ziel

Status wird nicht im Knoten gespeichert, sondern berechnet.

```txt
rankOrdinal[node] = evaluateRank(node, plan, derived, legIndex)
```

### RankRule

```ts
type RankRule = {
  ordinal: number;
  name: string;
  minPersonalVolume?: number;
  minGroupVolume?: number;
  minQualifyingGroupVolume?: number;
  minQualifiedLegs?: number;
  legRequirements?: Array<{
    minLegCount: number;
    minLegRankOrdinal: number;
  }>;
  requiresActivity: boolean;
};
```

### Beispielhafte Arbeitsstruktur

Die konkreten Lifeplus-Werte müssen aus der richtigen Planversion geprüft werden.

```ts
const lifeplusPlan: CompensationPlan = {
  brandId: 'lifeplus',
  version: 'TODO',
  ranks: [
    {
      ordinal: 1,
      name: 'Believer',
      minPersonalVolume: 45,
      requiresActivity: true,
    },
    {
      ordinal: 2,
      name: 'Bronze',
      minPersonalVolume: 45,
      minQualifyingGroupVolume: 3000,
      minQualifiedLegs: 3,
      requiresActivity: true,
    },
  ],
};
```

### Status-Pass

Der Status-Pass sollte von unten nach oben arbeiten, weil Bein-Anforderungen Ranginformationen unterhalb eines Knotens brauchen können.

Vereinfachte Reihenfolge:

1. Volumen berechnen
2. Basisränge anhand persönlichem Volumen und Gruppenvolumen berechnen
3. Bein-Indizes erstellen
4. höhere Ränge anhand Bein-Anforderungen berechnen
5. falls höhere Ränge neue Bein-Indizes beeinflussen, zweiter Pass

Für die erste Version ist ein zweistufiger Pass robuster als ein cleverer Einmal-Pass.

## Umsetzungsvorschlag F: Bein-Indizes

### Ziel

Fragen wie "hat dieser Knoten drei Bronze-Beine?" oder "wie viele Diamond-Beine existieren?" dürfen nicht jedes Mal den gesamten Subtree durchsuchen.

### Minimaler LegIndex

```ts
type NodeLegSummary = {
  directLegRootId: number;
  volume: number;
  maxRankOrdinal: number;
};
```

Für jeden bewerteten Knoten:

```txt
direct legs = direkte Kinder
for each leg:
  volume = groupVolume[directChild]
  maxRank = max rank im Subtree dieses directChild
```

### Optimierung

Ein globales Array:

```ts
maxRankInSubtree: Uint8Array
```

wird bottom-up berechnet:

```txt
maxRankInSubtree[node] = max(rankOrdinal[node], max(maxRankInSubtree[child]))
```

Dann ist:

```txt
maxRank je direktem Bein = maxRankInSubtree[directChild]
```

### Unabhängigkeit

Für Rang-Beine zählen direkte Beine.

Wenn zwei Diamond-Knoten im selben direkten Bein liegen, zählt das als ein Diamond-Bein, nicht zwei.

## Umsetzungsvorschlag G: Aggregat-Vorschätzung

### Zweck

Vor dem Tree-Build wird geschätzt:

- erwartete Member-Zahl
- erwartete Shopper-Zahl
- erwarteter Speicherbedarf
- erwartete Berechnungszeit
- Strategie: Main Thread, Worker oder Aggregatmodus

### Einfache Startformel

```txt
activeMembers(year + 1) =
  activeMembers(year)
  + activeMembers(year) * membersPerYear
  - activeMembers(year) * memberChurnRate
```

Shopper:

```txt
shoppers(year + 1) =
  shoppers(year)
  + activeMembers(year) * shoppersPerYear
  - shoppers(year) * shopperChurnRate
```

Diese Formel ist als Vorschätzung gedacht. Der deterministische Builder entscheidet später die konkrete Verteilung.

## Umsetzungsvorschlag H: Worker-Strategie

### Wann Worker?

Empfehlung:

| Erwartete Member | Strategie |
|---:|---|
| < 10.000 | Main Thread möglich |
| 10.000-100.000 | Worker bevorzugt |
| > 100.000 | Worker verpflichtend |
| > 500.000 | Aggregatmodus prüfen |

### Warum SoA dafür gut passt

Typed Arrays können effizient an Worker übertragen werden.

Object-Graphs mit String-IDs müssten serialisiert werden und wären deutlich teurer.

## Umsetzungsvorschlag I: UI-Verhalten

### Slider

Slider für:

- Member/Jahr
- Shopper/Jahr
- Churn
- Mindestumsatz Member
- Mindestumsatz Shopper
- Jahre

Gebrochene Werte sind zulässig:

```txt
0,5
1,5
2,5
3,5
```

Die UI sollte diese Werte als Durchschnitt pro aktivem Member und Jahr erklären, nicht als garantierte Anzahl pro Person.

### Anzeige

Bei gebrochenen Werten sollte die UI nicht suggerieren:

```txt
Jeder macht exakt 2,5 neue Member.
```

Besser:

```txt
Durchschnittlich 2,5 neue Member pro aktivem Member und Jahr.
```

### Genauigkeitskennzeichnung

Wenn ab sehr großen Netzwerken in Aggregatmodus gewechselt wird:

```txt
Schätzung: Status- und Beinlogik wird aggregiert angenähert.
```

## Umsetzungsvorschlag J: Tests

### Fractional Tests

```txt
4 aktive Member * 2,5 = 10 neue Member
4 aktive Member * 2,5 = 10 neue Shopper
```

Test:

- keine Rundung auf 8
- keine Rundung auf 12
- Ergebnis deterministisch

### Shopper-Churn Tests

```txt
10 Shopper, 20 % Churn -> 8 Shopper
```

Gebrochen:

```txt
3 Shopper, 20 % Churn = 0,6 Verlust
```

Über mehrere Jahre muss der Carry dazu führen, dass langfristig ca. 20 % verloren gehen.

### Volume Tests

Beispiel:

```txt
Member ownVolume = 45
3 Shopper * 45 = 135
personalVolume = 180
```

### Tree Tests

Kleiner Baum:

```txt
Root
  A
    A1
  B
  C
```

Tests:

- Gruppenvolumen Root korrekt
- Gruppenvolumen A korrekt
- B und C unabhängig
- zwei Rangträger im selben Bein zählen als ein qualifiziertes Bein

### Rank Tests

Golden Tests für:

- Believer
- Bronze
- Diamond
- 1*Diamond

Die konkreten Schwellen müssen aus dem finalen Lifeplus-Plan kommen.

## Empfohlene Implementierungsreihenfolge

### Schritt 1: Parameter und Aggregat-Vorschätzung

Implementieren:

- `GrowthParams`
- `estimateNetworkSize(params)`
- Member- und Shopper-Vorschätzung
- Warnschwellen für große Netzwerke

### Schritt 2: Deterministisches Apportioning

Implementieren:

- `apportionCount`
- `apportionLoss`
- Tests für 2,5 Member/Jahr
- Tests für 2,5 Shopper/Jahr

### Schritt 3: TreeBuilder

Implementieren:

- Root-Erzeugung
- jahrweiser Source-Snapshot
- Member-Erzeugung
- Shopper-Erzeugung pro Member
- Shopper-Churn
- TreeStore-Aufbau

### Schritt 4: VolumePass

Implementieren:

- personalVolume
- groupVolume
- qualifyingGroupVolume als eigenes Feld
- Tests mit manuellem Beispielbaum

### Schritt 5: RankEngine-Grundgerüst

Implementieren:

- `CompensationPlan`
- `RankRule`
- einfache Regeln für Believer/Bronze als Platzhalter
- keine hartcodierten Lifeplus-Werte ohne Quellenprüfung

### Schritt 6: LegIndexBuilder

Implementieren:

- `maxRankInSubtree`
- Volumen je direktem Bein
- Anzahl Beine mit Rang >= X
- Tests für unabhängige Beine

### Schritt 7: UI-Anbindung

Implementieren:

- Slider `shoppersPerYear`
- Slider erlaubt Dezimalwerte
- UI-Text "durchschnittlich pro Jahr"
- Ausgabe von Membern, Shoppern, Umsatz, Status

### Schritt 8: Benchmarks

Implementieren:

- 1.000 Member
- 10.000 Member
- 100.000 Member
- Messung Build, VolumePass, RankPass, LegIndex

## Offene Entscheidungen

Vor der finalen Fachimplementierung müssen geklärt werden:

1. Exakte Lifeplus-Planversion.
2. Bedeutung von IP im Verhältnis zu anderen Volumenarten.
3. Mindestaktivität je Status.
4. Ob 45 IP für Member und Shopper wirklich identisch zählt.
5. Ob Shopper-Churn gleich Member-Churn sein soll.
6. Ob neue Member im Jahr ihrer Entstehung bereits Shopper werben dürfen.
7. Ob Member-Churn Knoten deaktiviert oder entfernt.
8. Wie inaktive Member mit Shoppern behandelt werden.
9. Ob Kundenumsatz für alle Status gleich zählt.
10. Welche Diamond-/n*Diamond-Regeln exakt gelten.

## Empfehlung

Die erste Umsetzung sollte klein, aber fachlich sauber sein:

1. Kein dynamisches Speicher-Hybrid.
2. Partner als materialisierter Baum.
3. Shopper aggregiert je Partner.
4. Dezimalwerte über deterministisches Apportioning.
5. Volumenarten getrennt halten.
6. Statuslogik planbasiert vorbereiten.
7. Beinanalyse als Index bauen.
8. Große Netzwerke über Worker und adaptive UI behandeln.

Damit bleibt die Engine korrekt genug für Lifeplus-Statuslogik und gleichzeitig offen für spätere Performance-Optimierung, Multi-Brand-Pläne und detailliertere Kundensegmente.
