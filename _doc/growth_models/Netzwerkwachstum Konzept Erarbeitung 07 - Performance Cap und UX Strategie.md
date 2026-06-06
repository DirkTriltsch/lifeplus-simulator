# Netzwerkwachstum Konzept Erarbeitung 07 - Performance Cap und UX Strategie

## Anlass

Die bisherige Performance-Einschätzung muss korrigiert und verschärft werden.

Wichtiger Hinweis aus der UX:

Die heutige App ist bereits spürbar träge, besonders ab ca. `4 Member/Jahr`.

Daraus folgt:

Die neue TreeStore-Engine darf nicht nur fachlich korrekter sein. Sie muss spürbar performanter und kontrollierter sein als die heutige Bedienung. Falls die vollständige Berechnung zu groß wird, braucht die App harte Caps, klare Warnungen oder einen bewusst reduzierten Modus.

## Größenordnung des Problems

Bei `membersPerYear = 4`, `duplicationRate = 100 %`, `attritionRate = 0 %`, `10 Jahre` entstehen im aktuellen Wachstumsmodell ungefähr:

```txt
Member: 17.578.120
Shopper: 13.183.590
Gesamt: 30.761.710
```

Das ist nicht mehr als materialisierter Baum im Browser sinnvoll berechenbar oder darstellbar.

Schon deutlich darunter entstehen UX-Probleme, wenn Slider jede Bewegung sofort vollständig neu berechnen.

Vergleichswerte bei `shoppersPerYear = 3`, `duplicationRate = 100 %`, `attritionRate = 0 %`, `10 Jahre`:

| Member/Jahr | Member nach 10 Jahren | Gesamt inkl. Shopper |
|---:|---:|---:|
| 2,0 | ca. 98.412 | ca. 246.030 |
| 2,5 | ca. 472.890 | ca. 1.040.359 |
| 3,0 | ca. 1.835.004 | ca. 3.670.008 |
| 3,5 | ca. 6.053.441 | ca. 11.242.104 |
| 4,0 | ca. 17.578.120 | ca. 30.761.710 |

Damit ist klar:

Ein Modell, das den vollständigen Tree für alle Sliderwerte materialisieren will, ist nicht UX-tauglich.

## Korrektur der bisherigen Empfehlung

Die bisherige Aussage "bis 100.000 Member Worker, ab 500.000 Aggregatmodus prüfen" ist zu weich.

Neue Empfehlung:

```txt
Exakte Tree-Berechnung nur bis zu einem festen Cap.
Alles darüber: Aggregat-Vorschau, Ziel-erreicht-Modus oder begrenzte Sample-Struktur.
```

Die App braucht eine vorgeschaltete Größenabschätzung, bevor der Tree gebaut wird.

## Empfohlene Caps

Es sollten zwei Caps unterschieden werden:

1. technischer Cap
2. fachlich/ökonomischer Cap

### 1. Technischer Cap

Der technische Cap schützt die Bedienbarkeit.

Empfehlung für V1:

```ts
const MAX_EXACT_MEMBERS = 90_000;
const WARN_EXACT_MEMBERS = 60_000;
const MAX_EXACT_TOTAL_ENTITIES = 250_000; // Member + aggregierte Shopper-Anzahl für UI-Kennzeichnung
```

Begründung:

- 90.000 Member liegen ungefähr im Bereich, in dem ein SoA-Tree mit Worker noch gut beherrschbar sein sollte.
- Der heutige Default `2 Member/Jahr`, `3 Shopper/Jahr`, `100 % Duplikation`, `0 % Churn`, `10 Jahre` liegt mit ca. 98.000 Membern bereits knapp darüber.
- Deshalb muss entweder der Default leicht entschärft, der Cap auf 100.000 gesetzt oder bei Default-Szenarien bereits ein Worker verwendet werden.

Alternative:

```ts
const MAX_EXACT_MEMBERS = 100_000;
```

Das ist wahrscheinlich der bessere Startwert, weil der heutige Default sonst knapp gecappt wird.

Meine Empfehlung:

```txt
Warnung ab 75.000 Member
Exakte Berechnung bis 100.000 Member
Worker verpflichtend ab 25.000 Member
Kein exakter Tree über 100.000 Member in V1
```

### 2. Fachlich/ökonomischer Cap

Ein zusätzlicher Cap kann am wirtschaftlichen Ergebnis hängen, z. B.:

```ts
const MAX_DISPLAY_MONTHLY_EUR = 500_000;
```

Dieser Cap hat eine andere Aufgabe:

- Er verhindert, dass extreme Szenarien Scheingenauigkeit erzeugen.
- Er macht klar: Ab hier ist das Ziel wirtschaftlich bereits weit überschritten.
- Er hält die UX fokussiert auf realistische Entscheidungsbereiche.

Ein Ergebnis über diesem Cap sollte nicht immer weiter mit scheinbar präzisen Zahlen dargestellt werden.

Besser:

```txt
> 500.000 EUR / Monat
Zielbereich überschritten. Details werden aggregiert dargestellt.
```

Dieser Cap darf aber den technischen Cap nicht ersetzen. Ein Szenario kann technisch riesig werden, bevor es 500.000 EUR erreicht, oder wirtschaftlich riesig sein, obwohl nur wenige Knoten modelliert werden.

## Empfohlene UX-Strategie

## 1. Sofortige Vorschätzung bei jeder Slider-Bewegung

Jede Slider-Bewegung sollte zuerst nur eine sehr schnelle Aggregat-Vorschätzung ausführen:

```txt
estimatedMembers
estimatedShoppers
estimatedMonthlyEUR
estimatedMode
```

Diese Vorschätzung muss in unter 5 ms laufen.

Danach entscheidet die App:

```txt
if estimatedMembers <= 25.000:
  exakte Berechnung im Main Thread möglich
elif estimatedMembers <= 100.000:
  exakte Berechnung im Worker
else:
  kein exakter Tree; Aggregat-/Cap-Modus
```

## 2. Slider bleibt immer flüssig

Die UI darf nicht auf die vollständige Berechnung warten.

Empfehlung:

- während Drag: nur Vorschätzung und einfache KPIs aktualisieren
- nach Drag-Ende oder nach Debounce: exakte Berechnung starten
- Worker-Ergebnis ersetzt die Vorschätzung, sobald fertig

Ziel:

```txt
Slider-Interaktion: < 16 ms pro Frame
Exakte Aktualisierung: asynchron
```

## 3. Modus klar anzeigen

Die App sollte immer anzeigen, in welchem Modus sie rechnet:

```txt
Exakt
Exakt im Hintergrund
Geschätzt
Gecappt
```

Beispiele:

```txt
Exakte Berechnung: 42.300 Member
```

```txt
Großes Szenario: 1.835.000 Member geschätzt. Exakte Baum-Berechnung ist für flüssige Bedienung deaktiviert.
```

```txt
Zielbereich erreicht: > 500.000 EUR / Monat. Detailanalyse wird bis 100.000 Member berechnet.
```

## 4. Progressive Detailfreigabe

Für große Szenarien sollte die UI nicht versuchen, alles zu erklären.

Stattdessen:

| Größe | UX |
|---:|---|
| < 25.000 Member | volle Details sofort |
| 25.000-100.000 Member | Details nach Worker-Berechnung |
| > 100.000 Member | Aggregat-KPIs + Hinweis |
| > 500.000 EUR/Monat | Ziel-erreicht-Darstellung |

## Technische Strategie für V1

## 1. Current Aggregate Engine als Fast Preview behalten

Die bestehende Level-Aggregat-Engine sollte nicht entfernt werden.

Sie wird zur schnellen Vorschätzung genutzt:

- Netzwerkgröße
- grobe Umsatzkurve
- grober Zielbereich
- Entscheidung, ob exakter Tree gebaut werden darf

## 2. Neue TreeStore Engine nur innerhalb Cap

Die neue TreeStore-Engine wird nur gestartet, wenn:

```txt
estimatedMembers <= MAX_EXACT_MEMBERS
```

Sonst liefert die App:

- Aggregat-Vorschau
- Cap-Hinweis
- keine exakte Rang-Bein-Analyse

## 3. Worker-First ab mittlerer Größe

Empfehlung:

```ts
const WORKER_THRESHOLD_MEMBERS = 25_000;
```

Ab diesem Wert:

- keine Main-Thread-Berechnung
- Worker berechnet TreeStore, Volumen, Status, LegIndex
- UI bleibt bedienbar

## 4. Debounce und Drag-End

Slider sollten zwei Ereignisarten unterscheiden:

```txt
onInput / onChange während Drag -> Vorschätzung
onCommit / debounce nach Drag -> exakte Berechnung
```

Falls der vorhandene Slider nur `onChange` kennt, sollte er erweitert werden:

```ts
type SliderProps = {
  value: number;
  onPreviewChange: (value: number) => void;
  onCommitChange: (value: number) => void;
};
```

## 5. Abbruch laufender Berechnungen

Wenn der User den Slider weiterbewegt, muss eine laufende Worker-Berechnung abgebrochen oder ignoriert werden.

Mindestlösung:

```ts
calculationId += 1
worker.postMessage({ calculationId, params })
```

Nur das Ergebnis mit der neuesten `calculationId` wird übernommen.

## Sinnvoller Cap

Meine aktuelle Empfehlung:

```txt
MAX_EXACT_MEMBERS = 100.000
WARN_EXACT_MEMBERS = 75.000
WORKER_THRESHOLD_MEMBERS = 25.000
MAX_DISPLAY_MONTHLY_EUR = 500.000
```

Begründung:

- 100.000 Member ist ein guter technischer V1-Cap für exakte Status-/Beinlogik.
- 75.000 als Warnschwelle gibt der UI Zeit, auf große Szenarien hinzuweisen.
- 25.000 als Worker-Schwelle schützt schwächere Geräte.
- 500.000 EUR/Monat ist ein sinnvoller wirtschaftlicher Cap, weil darüber die Simulation als Beratungswerkzeug weniger von zusätzlicher Präzision profitiert.

Der von Dir genannte Wert `90.000 Member` ist ebenfalls plausibel. Ich würde ihn leicht auf `100.000` erhöhen, weil der aktuelle Default bei 10 Jahren knapp um 98.000 Member erzeugen kann. Wenn der Default nicht direkt in einen Cap laufen soll, ist `100.000` ergonomischer.

Falls wir bewusst konservativer sein wollen:

```txt
MAX_EXACT_MEMBERS = 90.000
```

Dann sollte aber der Default oder die Laufzeit so angepasst werden, dass Standardnutzer nicht sofort den Cap sehen.

## Kritische Korrektur der Performance-Bewertung

Die neue Engine darf nicht pauschal als "performanter" verkauft werden.

Korrekt ist:

Sie wird bei gleicher exakter Strukturarbeit wesentlich performanter sein als ein naiver Objektbaum.

Sie wird aber nicht schneller sein als die heutige Level-Aggregat-Engine, wenn beide nur grobe Kurven berechnen.

Der Performance-Vorteil muss daher so formuliert werden:

```txt
Die neue Architektur ermöglicht die fachlich notwendige Tree-Logik innerhalb klarer Caps performant genug für flüssige UX.
```

Nicht:

```txt
Die neue Architektur ist immer schneller.
```

## UX-Zielbild

Die App soll sich auch bei hohen Sliderwerten flüssig anfühlen.

Das bedeutet:

1. Slider bewegt sich immer sofort.
2. Zahlen reagieren sofort als Vorschätzung.
3. Exakte Details laden nach.
4. Extreme Szenarien werden begrenzt und klar markiert.
5. Der User bekommt nicht den Eindruck, die App sei kaputt oder eingefroren.

Beispiel bei `4 Member/Jahr`:

```txt
Dieses Szenario erzeugt ca. 17,6 Mio. Member in 10 Jahren.
Für flüssige Bedienung wird die Detailanalyse auf 100.000 Member begrenzt.
Die Gesamtwerte werden geschätzt angezeigt.
```

Das ist besser als:

- App friert ein
- Slider ruckelt
- falsche Scheingenauigkeit
- heimliches Abschneiden ohne Erklärung

## Konsequenz für die Umsetzung

Die nächste Implementierungsplanung muss Performance nicht als nachgelagerten Benchmark behandeln, sondern als Kernanforderung.

Neue Reihenfolge:

1. `estimateNetworkSize(params)` implementieren.
2. Caps und Modusentscheidung implementieren.
3. Slider in Preview/Commit trennen.
4. Worker-Protokoll definieren.
5. Erst dann TreeStore-Engine bauen.
6. TreeStore nur innerhalb Cap ausführen.
7. UX-Hinweise für geschätzte/gecappte Modi einbauen.

Damit wird verhindert, dass die fachlich bessere Engine die ohnehin schon träge UX weiter verschlechtert.
