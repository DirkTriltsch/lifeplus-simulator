# Netzwerk-Modellierung

Stand: 2026-05-27

Dieses Dokument beschreibt die Modellierungsentscheidung fuer konkrete LifePlus-Beispielrechnungen und die spaetere Option, das gesamte Netzwerkmodell auf echte Personenbaeume umzustellen.

## Ausgangslage

Die Anwendung hat zwei unterschiedliche Aufgaben:

1. **Wachstum simulieren**
   Die App erzeugt ueber 10 Jahre ein statistisches Netzwerk auf Basis weniger Eingaben: neue Member pro Jahr, neue Shopper pro Jahr, Duplikation, Fluktuation und IP pro Monat.

2. **Verguetungsplan erklaeren**
   Fuer Schulung, Tests und Visualisierung sollen konkrete Reihen von Personen mit Status aufgebaut werden koennen, z. B.:

   ```text
   Kunde -> A -> B -> C -> Gold -> Bronze -> Bronze -> Diamond
   ```

   Daraus soll sichtbar werden, welche Phase-1-, Phase-2- und Phase-3-Stuecke an wen gehen.

Diese beiden Aufgaben sehen aehnlich aus, sind aber fachlich verschieden. Die Wachstumssimulation arbeitet aggregiert; Beispielrechnungen brauchen konkrete Upline-Reihen.

## Verguetungslogik Als Grundlage

### Phase 1

Phase 1 ist ein Unilevel-Pool ueber Ebene 1 bis 3 mit insgesamt 40 %.

```text
Shopper:
Ebene 1: 25 %
Ebene 2: 10 %
Ebene 3:  5 %

Member, erste 150 IP:
Ebene 1:  5 %
Ebene 2: 25 %
Ebene 3: 10 %

Member, ab 151 IP:
Ebene 1: 10 %
Ebene 2:  5 %
Ebene 3:  5 %
```

Wenn eine Person in Phase 1 nicht qualifiziert ist, wird ihr Stueck an die naechste qualifizierte Upline komprimiert.

### Phase 2

Phase 2 ist ein Tiefenbonus ab Ebene 4 mit insgesamt 12 %. Der Pool besteht aus vier Stuecken:

```text
Bronze-Stueck:  3 %
Silber-Stueck:  3 %
Gold-Stueck:    3 %
Diamant-Stueck: 3 %
```

Ein Status nimmt chronologisch alle freien Stuecke, fuer die er qualifiziert ist:

```text
Bronze  nimmt Bronze
Silber  nimmt Bronze + Silber
Gold    nimmt Bronze + Silber + Gold
Diamant nimmt Bronze + Silber + Gold + Diamant
```

Beispiel:

```text
Gold > Bronze > Bronze
```

Der Gold nimmt Bronze-, Silber- und Gold-Stueck, also 9 %. Die beiden Bronze darunter gehen leer aus, weil das Bronze-Stueck bereits vergeben ist. Ein spaeterer Diamant weiter oben kann noch das freie Diamant-Stueck nehmen.

### Phase 3

Phase 3 ist ein Generationenbonus mit insgesamt 8 %. Der Pool besteht aus drei Stuecken:

```text
1*Diamant-Stueck: 3 %
2*Diamant-Stueck: 3 %
3*Diamant-Stueck: 2 %
```

Phase 3 wird ebenfalls chronologisch entlang der Upline vergeben. Ein qualifizierter Diamond nimmt aber nur ein passendes freies Stueck.

Wichtig fuer die aktuelle Implementierung: Eine Person kann fuer dieselbe Order nicht gleichzeitig aus Phase 2 und Phase 3 bezahlt werden. Wenn eine Person bereits ein Phase-2-Stueck erhalten hat, wird sie bei Phase 3 uebersprungen. Das Phase-3-Stueck wird dadurch nicht verbraucht, sondern steht der naechsten qualifizierten Upline zur Verfuegung.

Beispiel:

```text
Order bei Anna
Bernd -> Cornelia -> Daniela -> Eva -> Frank -> Georg -> Heidi
```

Bei passender Rangfolge kann Georg das Diamant-Stueck aus Phase 2 erhalten. Georg bekommt dann nicht zusaetzlich das 1*Diamant-Stueck aus Phase 3. Das 1*Diamant-Stueck geht an Heidi, sofern Heidi dafuer qualifiziert ist.

Beispiel:

```text
3*Diamant > 1*Diamant
```

Wenn der 3*Diamant zuerst kommt, nimmt er das 1*Diamant-Stueck. Der spaetere 1*Diamant geht leer aus, obwohl noch 2*Diamant- und 3*Diamant-Stuecke frei sind, weil er dafuer nicht qualifiziert ist.

## Vorschlag A: Lineage-Engine Neben Der Simulation

Vorschlag A ist jetzt umgesetzt.

Die Idee: Fuer konkrete Beispielrechnungen gibt es eine eigene API, die eine Reihe von Personen vom Kunden aus nach oben verarbeitet. Diese API nutzt dieselbe Slot-Logik wie die Simulation, bleibt aber unabhaengig von der statistischen Wachstumssimulation.

### Code-Struktur

```text
packages/product-lifeplus/src/payout-slots.ts
packages/product-lifeplus/src/example-line.ts
packages/product-lifeplus/tests/example-line.test.ts
simulator-app/src/components/lineage/LineageView.tsx
simulator-app/src/components/lineage/LineageChain.tsx
simulator-app/src/components/lineage/LineagePersonCard.tsx
simulator-app/src/components/lineage/PersonActionSheet.tsx
simulator-app/src/components/lineage/OrderSheet.tsx
simulator-app/src/components/lineage/StatusPickerSheet.tsx
simulator-app/src/components/lineage/defaultTeam.ts
simulator-app/src/components/lineage/rankStats.ts
```

`payout-slots.ts` enthaelt die wiederverwendbare Kernlogik:

```text
allocatePhase2Slots()
allocatePhase3Slots()
allocatePhase2SlotRates()
allocatePhase3SlotRates()
normalizeRankName()
phase2SlotCount()
phase3SlotCount()
```

`example-line.ts` enthaelt die konkrete Beispielrechnungs-API:

```text
calculateExampleLine()
```

Die Eingabe ist eine Reihe von Personen, naechste Upline zuerst:

```ts
calculateExampleLine({
  order: { kind: 'member_order', ip: 1000 },
  peopleFromCustomerUp: [
    { id: 'a', name: 'A', rank: 'Member' },
    { id: 'b', name: 'B', rank: 'Member' },
    { id: 'c', name: 'C', rank: 'Member' },
    { id: 'gold', name: 'Gold', rank: 'Gold' },
    { id: 'bronze', name: 'Bronze', rank: 'Bronze' },
    { id: 'diamond', name: 'Diamond', rank: 'Diamond' },
  ],
});
```

Die Ausgabe ist eine Liste von Payout-Zeilen:

```text
Phase
Person
Rang
Ebene zum Kunden
Kuchenstueck
Rate
Basis-IP
Betrag-IP
Notiz
```

Diese Ausgabe ist bewusst visualisierbar. Eine UI kann daraus Tabellen, Linien, Kuchenstuecke oder Tooltips bauen.

### Aktueller UI-Stand: Verguetungsplan-Ansicht

Die App hat neben `Chart` und `Network` eine dritte Sektion:

```text
Verguetungsplan
```

Diese Ansicht ist aktuell Mode B: Der Status jeder Person wird manuell gesetzt und als qualifiziert angenommen. Die Ansicht dient damit nicht der Wachstumssimulation, sondern der erklaerenden Beispielrechnung.

Der Default-Aufbau stammt aus der Skizze:

```text
Anna      Member
Bernd     Believer
Cornelia  Builder
Daniela   Bronze
Eva       Silber
Frank     Gold
Georg     1* Diamant
Heidi     2* Diamant
Ingo      3* Diamant
Katrin    4* Diamant
Ludwig    7* Diamant
Du        Wurzel / Betrachter
```

In der UI wird eine Order nicht als abstrakter Kunde unterhalb der Linie eingegeben, sondern an einer konkreten Person platziert. Beispiel: Wird die Order bei Anna gesetzt, dann ist Bernd Ebene 1, Cornelia Ebene 2, Daniela Ebene 3 usw. Intern wird dafuer `people.slice(customerIndex + 1)` an `calculateExampleLine()` uebergeben.

Aktuelle Bedienung:

```text
Person antippen:
  - Status setzen
  - Order setzen / Order aendern
  - + Person darueber
  - - Person loeschen
  - Order loeschen, falls diese Person die Order traegt

Oben in der Ansicht:
  - Order loeschen, sobald eine Order gesetzt ist

Unter der Personenliste:
  - KPIs einblenden (GV, AV, QL, SH)
```

Die KPI-Zeile ist bewusst optional. Im MVP ist der Rang die Single Source of Truth; `rankStats.ts` liefert nur erklaerende Pseudo-Stats fuer die Anzeige.

Die rechte Spalte zeigt nur noch die Phasen-Summen:

```text
Phase 1
Phase 2
Phase 3
Gesamt
Gesamtanteil
```

Die konkrete Slot-Erklaerung steht direkt an der jeweiligen Person. Beispiele:

```text
3% B, 3% S, 3% G
3% D
3% 1*-Dia
3% 2*-Dia
2% 3*-Dia
```

Damit ist die Ansicht auf Touch-Bedienung optimiert: keine Hover-Abhaengigkeit, kein Drag-and-drop, keine kleinen Tabellen als primaerer Interaktionspunkt.

### Aktuelle Testabdeckung

Die Beispielrechnungen sind in `packages/product-lifeplus/tests/example-line.test.ts` abgesichert. Neben Normalisierung von `n*Diamant` und Phase-1-Kompression gibt es einen expliziten Test fuer die Ein-Phase-Regel:

```text
Eine Person erhaelt fuer dieselbe Order nicht gleichzeitig Phase 2 und Phase 3.
```

Der konkrete Referenzfall:

```text
Order bei Anna
Bernd -> Cornelia -> Daniela -> Eva -> Frank -> Georg -> Heidi

Georg:
  bekommt 3% Diamant-Stueck aus Phase 2
  bekommt kein 1*Diamant-Stueck aus Phase 3

Heidi:
  bekommt 3% 1*Diamant-Stueck aus Phase 3
```

### Sinn Und Zweck

Vorschlag A loest drei direkte Probleme:

1. **Musterrechnungen zeigen**
   Jede Beispielrechnung aus Excel oder Schulungsunterlagen kann als konkrete Linie modelliert werden.

2. **Logik testen**
   Dieselbe Linie kann in einem Unit-Test stehen. Wenn sich die Verguetungslogik aendert, schlagen die Tests sofort an.

3. **Simulation entlasten**
   Die bestehende Wachstumssimulation muss nicht sofort zu einem echten Personenbaum umgebaut werden.

### Vorteile

- Kleiner, risikoarmer Umbau.
- Sehr gut testbar.
- Sehr gut fuer Visualisierungen geeignet.
- Wiederverwendung der echten Slot-Logik.
- Excel-Musterrechnungen koennen schrittweise als Tests uebernommen werden.
- Keine grosse Migration der bestehenden UI- und Simulationsdaten noetig.

### Nachteile

- Die Wachstumssimulation bleibt weiterhin aggregiert.
- Ohne explizite Beispiel-Linie kann die Simulation Personenstatus in der Tiefe nur schaetzen.
- Beispielrechnungen und Simulation verwenden dieselbe Verguetungslogik, aber nicht dasselbe Netzwerkdatenmodell.
- Komplexe echte Teamstrukturen muessen als Linien oder mehrere Linien abgebildet werden, nicht als vollstaendiger Baum.

### Grenzen

Vorschlag A ist ideal fuer:

- einzelne Umsatzlinien,
- Schulungsbeispiele,
- Testfaelle,
- erklaerende Visualisierungen,
- Nachbau der Tabs `Musterrechnungen` und `echtes Team Beispiel`.

Vorschlag A ist weniger ideal fuer:

- echte Teamverwaltung,
- vollstaendige Downline-Analyse,
- mehrere parallele Bestellungen in vielen Aesten,
- exakte Berechnung eines gesamten realen Baums.

## Vorschlag B: Einheitliches Personenbaum-Modell

### Umsetzungsstand

Ein erster paralleler Personenbaum-Pfad ist umgesetzt:

```text
packages/simulator-core/src/person-tree.ts
packages/simulator-core/src/tree-generator.ts
packages/product-lifeplus/src/tree-compensation.ts
packages/product-lifeplus/src/tree-simulation.ts
packages/product-lifeplus/tests/tree-simulation.test.ts
```

Der neue Pfad kann aus Szenario-Parametern echte, gewichtete Personen-Knoten erzeugen, diese wieder in die bestehenden `MonthResult`-/Chart-Strukturen adaptieren und LifePlus-Bestellungen entlang echter Uplines berechnen.

Noch nicht vollstaendig umgestellt sind:

```text
1. UI-Default auf den neuen Tree-Pfad.
2. Reality-Strategien dirichlet/momentum auf Personenbaum-Ebene.
3. Klickbare Personen-/Cluster-Visualisierung im Sunburst.
```

Die bestehende App bleibt dadurch stabil, waehrend der neue Berechnungspfad testbar aufgebaut wird.

Vorschlag B ist die langfristig fachlich staerkere Variante. Dabei wuerde die gesamte Simulation nicht mehr primaer mit aggregierten Ebenen arbeiten, sondern mit echten Personen-/Knotenstrukturen.

### Moegliches Datenmodell

```ts
interface NetworkPerson {
  id: string;
  sponsorId?: string;
  name?: string;
  rank: string;
  avIP?: number;
  qgvIP?: number;
  qualifiedLegs?: number;
  orders: NetworkOrder[];
  children: NetworkPerson[];
}

interface NetworkOrder {
  id: string;
  personId: string;
  kind: 'shopper' | 'member_order';
  ip: number;
}
```

Dann koennte jede Bestellung entlang ihrer echten Upline berechnet werden:

```text
Bestellung -> Sponsor -> Sponsor -> Sponsor -> ...
```

Phase 1, Phase 2 und Phase 3 wuerden fuer jede Bestellung aus derselben Upline-Struktur berechnet.

### Sinn Und Zweck

Vorschlag B waere sinnvoll, wenn die App spaeter nicht nur Szenarien simuliert, sondern echte oder detailliert modellierte Teams abbildet:

- echte Downline importieren,
- einzelne Personen anklicken,
- konkrete Bestellungen simulieren,
- Verguetung je Person und je Linie erklaeren,
- Teamstruktur und Rangentwicklung exakt nachrechnen.

### Vorteile

- Fachlich am saubersten.
- Jede Zahlung ist vollstaendig nachvollziehbar.
- Phase-1-Kompression kann exakt entlang der echten Upline laufen.
- Phase-2- und Phase-3-Stuecke koennen exakt pro Bestellung vergeben werden.
- Bessere Grundlage fuer echte Team-Visualisierung.
- Weniger Schaetzung in tiefen Ebenen.

### Nachteile

- Deutlich groesserer Umbau.
- Wachstumssimulation muss kuenstliche Personen erzeugen statt nur Level-Zahlen.
- Mehr Datenvolumen.
- Mehr Performance-Fragen bei grossen Netzwerken.
- UI-Komponenten, Charts und Zusammenfassungen muessen angepasst werden.
- Rangberechnung wird komplexer, weil jeder Knoten seinen eigenen Subtree braucht.

### Technische Risiken

- Grosse simulierte Netzwerke koennen sehr viele Knoten erzeugen.
- Fluktuation und Compression muessen auf Personenebene definiert werden.
- Zufalls-/Realistic-Growth-Strategien muessen Personen statt Levelwerte modulieren.
- Bestehende Tests fuer aggregierte Level muessen umgebaut oder parallel gehalten werden.

### Moeglicher Migrationspfad Zu Vorschlag B

Vorschlag A ist bewusst so gebaut, dass er spaeter in Vorschlag B aufgehen kann.

Ein sinnvoller Pfad:

1. **Slot-Engine stabilisieren**
   `payout-slots.ts` bleibt die zentrale Regel fuer Phase 2 und Phase 3.

2. **Beispielrechnungen aus Excel als Tests erfassen**
   Die bekannten Muster werden zuerst als konkrete Linien abgesichert.

3. **Lineage-API erweitern**
   `calculateExampleLine()` kann spaeter mehr Qualifikationsdaten aufnehmen: AV, QGV, QL, echte Phase-1-Qualifikation.

4. **Personenbaum als neues Modell einfuehren**
   Zunaechst parallel zum alten `NetworkSnapshot`.

5. **Adapter bauen**
   Aus einem Personenbaum koennen weiterhin `membersByLevel`, `shoppersByLevel` und `legs` fuer bestehende UI-Komponenten erzeugt werden.

6. **Simulation optional auf Personenbaum umstellen**
   Erst wenn Tests und UI stabil sind, wird die Wachstumssimulation selbst umgebaut.

## Empfehlung

Kurzfristig ist Vorschlag A die richtige Wahl. Er macht die Verguetungslogik testbar, erklaerbar und visualisierbar, ohne die ganze Simulation zu gefaehrden.

Langfristig sollte Vorschlag B angestrebt werden, wenn echte Teamstrukturen, detaillierte Personenknoten oder vollstaendige Downline-Berechnungen ein Kernfeature werden.

Die wichtigste Architekturregel bleibt:

```text
Verguetungslogik gehoert in wiederverwendbare Domain-Funktionen.
UI, Simulation und Beispielrechnungen duerfen diese Logik nutzen,
aber nicht jeweils eigene Provisionsregeln nachbauen.
```
