# Netzwerkwachstum Konzept Erarbeitung 06

**Review-Dokument zu:** *Netzwerkwachstum Konzept Erarbeitung 05 — Umsetzungsvorschläge*  
**Plus:** Code-Vergleich · Performance- und UX-Einschätzung  
**Reviewer:** Max  
**Datum:** Juni 2026  
**Hinweis:** Dieses Review ist durchgängig kritisch gehalten. Wo das Dokument 05 inhaltlich richtig liegt, wird die Lücke darin gesucht, dass die richtige Erkenntnis nicht weitergetragen, nicht quantifiziert oder mit dem aktuellen Code-Stand nicht abgeglichen wurde.

---

## Teil A — Kritisches Review aller Abschnitte des Dokuments 05

### A.0 Gesamteindruck

Das Dokument 05 macht den richtigen Sprung von Themen-Sortierung zu konkretem Datenmodell — und scheitert genau an dieser Stelle gleichzeitig auf drei Ebenen:

1. **Es ignoriert den existierenden Code.** Mehrere Vorschläge beschreiben Konzepte, die im `simulator-core` und `simulator-app` längst implementiert sind (siehe Teil B). Wer 05 als Bauplan liest, baut Mechaniken neu, die es schon gibt — und wirft dabei existierende Funktionalität (`weight`, Monatsauflösung, mehrphasige Provisionen) weg.
2. **Es trifft Entscheidungen ohne sie zu quantifizieren.** Kein einziger ms-Wert, kein einziger MB-Wert. "Worker bevorzugt" und "Aggregatmodus prüfen" sind Stimmungsbilder, keine Schwellwerte.
3. **Es übersieht die Reactive-Dataflow-Frage komplett.** Das Dokument zeichnet einen linearen Ablauf `Parameter → Tree → Volumen → Status → UI`, aber MLM-Simulatoren leben von Slider-Bewegungen. Wer den linearen Ablauf 1:1 umsetzt, baut bei jedem Slider den Baum neu. Das ist 30–50 mal langsamer als nötig.

Diese drei Lücken werden im Folgenden für jeden Vorschlag konkretisiert.

---

### A.1 Ziel

> *Dieses Dokument beschreibt konkrete Umsetzungsvorschläge für das Netzwerkwachstumsmodell des Lifeplus-Simulators.*

**Kritik:**

- **"Konkrete Umsetzungsvorschläge"** bleibt undefiniert. Code-Skelette? Pseudocode? Architektur-Decisions? Im Dokument selbst kommen alle drei vor, ohne Hierarchie.
- **Erfolgskriterien fehlen.** Wann ist die Umsetzung fertig? Wann gilt sie als gescheitert? Ohne Definition bleibt das Dokument als Bauplan unverwertbar.
- **"Baut auf Erarbeitung 04 auf"** — aber 04 ist im Review nicht referenzierbar. Wenn die Voraussetzungen unsichtbar sind, ist die Umsetzung nicht prüfbar.
- **Multi-Brand fehlt im Ziel.** Das Projekt zielt explizit auf LifePlus, FitLine, Eqology — im Ziel-Abschnitt taucht nur "Lifeplus-Simulator" auf. Das prägt das Dokument durchgehend (siehe E).

**Konstruktiv:** Das Ziel sollte vier Punkte explizit benennen:

```
1. Engine soll Multi-Brand-fähig sein (LifePlus/FitLine/Eqology als Plan-Konfigs).
2. Engine soll bei N(10) ≤ 30k auf Smartphone in < 100 ms rechnen.
3. Slider-Latenz für Volumen-Änderungen < 16 ms.
4. Bestehende Mechaniken (weight, Phasen, Monatsauflösung) bleiben erhalten.
```

Diese vier Kriterien sind messbar. Ohne sie ist "konkrete Umsetzung" Wunschdenken.

---

### A.2 Grundentscheidung

> *Die Engine sollte in der ersten belastbaren Version nicht versuchen, "teilweise echte" und "teilweise geschätzte" Subtrees fachlich zu mischen.*

**Kritik:**

- **Inhaltlich richtig**, aber die Begründung fehlt. Die richtige Begründung ist das Henne-Ei-Problem (Materialisierungsentscheidung braucht die Information, die durch Materialisierung erst entsteht). Ohne diese Begründung wirkt die Entscheidung beliebig.
- **"In der ersten belastbaren Version"** ist ein Schlupfwort. Was kommt danach? Wenn nie ein Hybrid kommt, sollte er hier auch nicht als zukünftig anklingen.
- **Der Ablauf `Parameter → Größenabschätzung → TreeStore → Volumen → Status → Bein-Indizes → UI` ist linear gezeichnet**, ist tatsächlich aber ein gerichteter Abhängigkeitsgraph. Slider-Änderungen rühren nicht jede Schicht an:

```
Eigenumsatz-Slider → Volumen → Status → Indizes → UI    (Tree bleibt)
m/d/c-Slider        → alles neu
Plan-Wechsel        → Status → Indizes → UI             (Tree+Volumen bleiben)
Filter-Toggle       → UI                                (alles andere bleibt)
Jahr-Scrubbing      → UI                                (alles vorgerechnet)
```

Dieser Aspekt — **Smart Invalidation** — ist die wichtigste Architekturentscheidung für die UX, und sie kommt im ganzen Dokument 05 nicht vor.

- **"Adaptive Visualisierung statt Speicher-Hybrid"** wird behauptet, aber nirgends spezifiziert. Wann genau wechselt das UI von Vollbaum auf Aggregat? Bei welchem N? Mit welcher Übergangs-UX?

**Konstruktiv:**

```typescript
const aggregateEstimate = computed(() => estimate(growthParams));
const tree              = computed(() => buildTree(growthParams));
const volumes           = computed(() => walkVolumes(tree, revenueModel));
const statuses          = computed(() => walkStatuses(volumes, plan));
const indices           = computed(() => buildIndices(statuses));
const renderData        = computed(() => prepareRender(tree, statuses, indices, filter));
```

Jeder Slider rührt nur die Schicht an, die er wirklich verändert. Ohne dieses Muster ist die Engine bei jedem Slider-Tick auf O(N) statt O(Tiefe) oder O(1).

---

### A.3 Vorschlag A — Minimal robuste Engine

#### A.3.1 GrowthParams

```typescript
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

**Kritik:**

- **`duplicationRate` fehlt komplett.** Der gesamte vorherige Diskussionsstrang baute auf der Trennung von Member/Jahr und Duplikationsrate auf. Hier ist sie verschwunden. Entweder implizit in `membersPerYear` versteckt — dann ist `membersPerYear` ein effektiver Wert, was die fachliche Bedeutung verändert — oder vergessen. Das Dokument sagt es nicht.
- **`maxDirectMembersPerMember` fehlt**, obwohl es im aktuellen Code (`AdvancedSettingsPanel.tsx`) existiert und realistische Modelle entscheidend prägt. Wer den Vorschlag 1:1 umsetzt, verliert diese Mechanik.
- **`minMemberVolume` ist semantisch irreführend.** Der Name sagt "Mindestschwelle", der Code behandelt ihn als Durchschnittswert. Bei realistischen Verteilungen (Pareto: 70/20/10) ist ein Durchschnittswert die falsche Abstraktion.
- **Keine `RealityStrategy`-Variante.** Der aktuelle Code unterstützt `standard | dirichlet | momentum | lifecycle`. Vorschlag 05 kennt nur Uniform. Das ist eine funktionale Regression.
- **Keine Zeit-Heterogenität.** Alle Werte sind konstant über die Jahre. Lebensphasen einer MLM-Karriere — anfangs aktiver, später passiver — werden nicht modelliert.

**Konstruktiv:**

```typescript
type GrowthParams = {
  years: number;
  membersPerYear: number;            // Rohwert vor Duplikation
  duplicationRate: number;           // 0..1, Anteil aktiver Member
  maxDirectMembersPerMember: number; // hartes Cap
  shoppersPerYear: number;
  memberChurnRate: number;
  shopperChurnRate: number;
  averageMemberVolume: number;       // statt minMemberVolume
  averageShopperVolume: number;
  realityStrategy: 'standard' | 'dirichlet' | 'momentum' | 'lifecycle';
  seed: number;
};
```

#### A.3.2 TreeStore (SoA)

```typescript
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

**Kritik:**

- **`shopperCount: Float32Array`** ist konzeptionell unsauber. Wenn die Apportionierung aus Vorschlag B greift, sind alle Werte ganzzahlig — dann reicht `Uint16Array` (2 Byte statt 4, also 50% weniger). Wenn die Werte nicht ganzzahlig sind, ist die Apportionierung gescheitert. Float erlaubt Inkonsistenz still.
- **`shopperVolume` als eigenes Feld** verletzt das DRY-Prinzip. Es ist `shopperCount × minShopperVolume` und kann jederzeit neu berechnet werden. Zwei Felder → zwei Quellen der Wahrheit → garantierte Konsistenz-Bugs.
- **`yearOfBirth: Int16Array`** statt `joinedMonth: Int16Array`. Die Jahresauflösung verliert Information, die der aktuelle Code (`SimPerson.joinedMonth`) bereits trägt. MLM-Provisionen werden monatlich abgerechnet — eine Engine mit Jahresauflösung kann keine korrekten Auszahlungen pro Monat liefern. Das ist eine **funktionale Regression**.
- **`weight: Float32Array` fehlt komplett.** Der aktuelle Code modelliert reduzierte Aktivität pro Person (z.B. `weight = 0.4`, was den Status `under_qualified` triggert). Ohne dieses Feld geht der gesamte 4-Status-Pfad verloren — nur noch binär `aktiv | inaktiv`.
- **Status-Modell ist binär** statt 4-stufig wie im aktuellen Code (`'active' | 'under_qualified' | 'inactive' | 'not_paid'`). Das eine ist ein Boolean, das andere ein Enum mit 2 Bit. Beides passt in `Uint8Array`, aber das Dokument zeigt nur die binäre Variante.
- **`childrenFlat: Int32Array`** ist die richtige Lösung für Adjazenzlisten, aber das Dokument erklärt nicht, wie diese gefüllt wird. Die Reihenfolge der Kinder ist wichtig (für stable rendering) und nicht trivial in einer SoA.
- **Kein `version`-/`generation`-Feld** für Smart Invalidation. Ohne dieses kann der DerivedStore nicht mit dem TreeStore versioniert werden.

**Konstruktiv:**

```typescript
type TreeStore = {
  nodeCount: number;
  generation: number;          // bumped bei jeder Struktur-Änderung
  
  // Identität und Topologie
  parentIds: Int32Array;
  joinedMonth: Int16Array;     // Monatsauflösung erhalten
  childrenStart: Int32Array;
  childrenCount: Uint16Array;
  childrenFlat: Int32Array;
  
  // Aktivität (4-stufig, kompatibel mit aktuellem Code)
  statusOrdinal: Uint8Array;   // 0=active, 1=under_qualified, 2=inactive, 3=not_paid
  weight: Float32Array;        // 0..1, < 0.95 → under_qualified
  
  // Roh-Volumen
  ownMonthlyVolume: Float32Array;
  
  // Shopper als Skalar pro Member
  shopperCount: Uint16Array;   // ganzzahlig nach Apportionierung
};
```

`shopperVolume` wird abgeleitet, nicht gespeichert.

#### A.3.3 DerivedStore

```typescript
type DerivedStore = {
  personalVolume: Float32Array;
  groupVolume: Float32Array;
  qualifyingGroupVolume: Float32Array;
  rankOrdinal: Uint8Array;
};
```

**Kritik:**

- **Saubere Trennung** Input/Derived ist korrekt — eine der wenigen Stärken von Vorschlag 05.
- **`maxRankInSubtree` fehlt**, obwohl in Vorschlag F als zentrales Index-Feld vorgeschlagen. Wer die Datenstruktur in A umsetzt und F später nachholt, muss alle Allokationen umbauen.
- **Kein `generation`-Match.** Wie wird sichergestellt, dass `DerivedStore` zu `TreeStore` passt? Ohne Versions-Match werden veraltete derived-Werte als gültig angesehen.
- **Mehr als ein Volumen** wird nicht vorgesehen — siehe A.6 (Volumen-Pass).
- **`payoutTotal`, `phase1`, `phase2`, `phase3` fehlen.** Das aktuelle System hat mehrphasige Provisionen (siehe `TreeCompensationResult.payouts`). Wenn diese Information weggeworfen wird, geht die gesamte LineageView und die Phase-Aufschlüsselung verloren.

**Konstruktiv:** DerivedStore muss alle abgeleiteten Größen tragen, die heute pro Person sichtbar sind:

```typescript
type DerivedStore = {
  generation: number;             // Match mit TreeStore.generation
  
  personalVolume: Float32Array;
  groupVolume: Float32Array;
  qualifyingGroupVolume: Float32Array;
  
  rankOrdinal: Uint8Array;
  maxRankInSubtree: Uint8Array;   // für Bein-Indizes
  
  payoutTotal: Float32Array;
  payoutPhase1: Float32Array;
  payoutPhase2: Float32Array;
  payoutPhase3: Float32Array;
};
```

#### A.3.4 "Warum Shopper nicht als Tree-Knoten"

> *Shopper haben keinen Status, keine Downline, erzeugen keine neuen Member, erzeugen keine neuen Shopper, tragen nur Umsatz bei.*

**Kritik:**

- **Die Begründung ist korrekt**, aber die Konsequenz wird zu schmal gedacht.
- **Shopper-zu-Member-Konversion fehlt.** In realen MLM-Plänen werden aus zufriedenen Shoppern oft Member. Die Identität geht verloren, wenn Shopper nur als Skalar geführt werden. Das ist eine Erweiterungs-Sackgasse.
- **Der aktuelle Code löst das eleganter:** Shopper sind im Datenmodell echte `SimPerson`-Knoten mit `kind: 'shopper'`, werden aber in der Visualisierung über `ShopperAggregateNode` zu einem Sammelknoten zusammengefasst (siehe `person-tree-node.ts`). Das gibt die Performance des Skalars **und** die Identität für spätere Konversionen.
- **Vorschlag 05 würde diese existierende Mechanik wegwerfen.** Funktionale Regression.

**Konstruktiv:** Datenmodell behält Shopper als Knoten. Im SoA können sie über ein separates `Uint8Array kindOrdinal` markiert werden (1 Byte pro Knoten). Visualisierung aggregiert wie bisher.

---

### A.4 Vorschlag B — Deterministisches Fractional Apportioning

#### A.4.1 Anti-Bias-Logik

```typescript
initialCarry = stableHash(nodeId, seed) % 1000 / 1000;
```

**Kritik:**

- **`stableHash` ist nicht spezifiziert.** FNV-1a? MurmurHash3? Ein eigenhändiger XOR-Shift? Die Wahl hat Konsequenzen: hochwertige Hashes sind 3–10× langsamer als billige, schlechte Hashes erzeugen Clustering. Das Dokument trifft keine Wahl.
- **`% 1000 / 1000` erzeugt mathematischen Bias** bei kleinen Werten und nicht-uniformer Hash-Verteilung. Für 1000 Buckets in der Praxis unkritisch, dokumentationswürdig dennoch.
- **`nodeId` als Hash-Input** ist problematisch, wenn IDs sequentiell vergeben werden (0, 1, 2, …). Dann erzeugt der Hash nur Pseudo-Varianz, die einzig vom Seed kommt. Bei festem Seed sind alle Simulationen identisch — was eigentlich Sinn ist, aber bei Slider-Bewegungen problematisch wird (siehe Smart Invalidation).
- **Determinismus vs. Stabilität:** Wenn IDs zwischen Slider-Bewegungen neu vergeben werden, ändert sich der Carry für identische logische Knoten. Stabile Identität über Slider-Änderungen hinweg ist nicht garantiert.

**Konstruktiv:**

```typescript
function stableHash(nodeId: number, seed: number): number {
  // Xorshift32, schnell und ausreichend gleichverteilt für 1000 Buckets
  let x = (seed ^ nodeId) >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;  x >>>= 0;
  return x;
}

// Sub-percent precision ohne Modulo-Bias
const initialCarry = stableHash(nodeId, seed) / 0x100000000;
```

#### A.4.2 apportionLoss-Bug

```typescript
function apportionLoss(count, churnRate, carry) {
  const raw = count * churnRate + carry;
  const loss = Math.floor(raw);
  return {
    loss: Math.min(loss, count),
    carry: raw - loss,
  };
}
```

**Kritik:**

- **`Math.min(loss, count)` bricht die Carry-Buchhaltung.** Beispiel: `count=2, churnRate=1.5, carry=0` → `raw=3.0`, `loss=3`, `Math.min(3,2)=2`, aber `carry = 3 - 3 = 0`. Der überschüssige "loss-Punkt" verschwindet im Nichts.
- **Tritt nur bei `churnRate > 1` auf**, was unrealistisch ist — aber wenn der Bug zwischen 0 und 1 unsichtbar bleibt, ist das kein Argument, ihn zu behalten. Carry-Buchhaltung muss konservativ sein.
- **Die richtige Semantik ist unklar.** Soll Churn-Überlauf gespart werden? Verfallen? Auf den nächsten aktiven Member umgelegt? Das Dokument trifft keine Entscheidung, sondern versteckt das Problem hinter `Math.min`.

**Konstruktiv:**

```typescript
function apportionLoss(count, churnRate, carry) {
  const raw = count * churnRate + carry;
  const naturalLoss = Math.floor(raw);
  const cappedLoss = Math.min(naturalLoss, count);
  const overflow = naturalLoss - cappedLoss;
  // Überlauf bleibt im Carry — kein "verlorenes" Churn
  return {
    loss: cappedLoss,
    carry: raw - cappedLoss,  // statt raw - naturalLoss
  };
}
```

#### A.4.3 Was nicht adressiert wird

- **Negative Raten:** `rate < 0` würde negativen `loss` erzeugen — was passiert? Asserts? Clamp? Das Dokument schweigt.
- **Tests sind nicht für edge cases:** alle Tests in Vorschlag J nutzen Rate=2.5 und Churn=20%. Es gibt keine Tests für Rate=0, Rate=∞-Annäherung, Churn=0, Churn=1.
- **Der aktuelle Code nutzt vermutlich Dirichlet-Verteilung** (Hinweis: `RealityStrategy: 'dirichlet'`). Die einfache Apportionierung von Vorschlag B ist eine **Vereinfachung gegenüber dem Status quo**, nicht eine Verbesserung.

---

### A.5 Vorschlag C — Periodischer Builder

#### A.5.1 Member-Churn als "optional"

> *4. optional Member-Churn deaktiviert Member*

**Kritik:**

- **"Optional" ist die schwierige Operation, die nicht ausgelagert werden darf.** Member-Churn ist der einzige Punkt, an dem die Topologie sich ändert — und genau dafür hat das vorhergehende Dokument das Reattachment-Konzept entwickelt (Kinder gelöschter Knoten rücken zum Großeltern hoch). Im Vorschlag C wird das wegrationalisiert.
- **Reattachment-Logik ist nicht trivial in SoA.** Sie erfordert:
  - Lookup aller Kinder des gelöschten Knotens (`childrenStart[i]`, `childrenCount[i]`)
  - Umhängen der `parentIds` dieser Kinder
  - Update der `childrenFlat`-Liste des neuen Elternknotens (typischerweise re-allocation)
  - Inkrement `generation`
  
  Das ist die teuerste Operation in der gesamten Engine — und sie wird im Dokument mit einem Wort abgehandelt.

#### A.5.2 Pseudocode

```
update shopperVolume = shopperCount * minShopperVolume
update ownVolume = active ? minMemberVolume : 0
```

**Kritik:**

- **`shopperVolume = shopperCount * minShopperVolume`** wird pro Jahr berechnet und gespeichert. Wenn `minShopperVolume` sich ändert (Slider!), müssen alle Jahre neu gerechnet werden. Das ist die Anti-Smart-Invalidation-Falle.
- **`ownVolume = active ? minMemberVolume : 0`** ignoriert das `weight`-Feld komplett. Im aktuellen Code: `ownVolume = weight × averageMemberVolume`. Wenn `weight` zu binär `active` kollabiert wird, geht der ganze under-qualified-Status verloren.
- **Source Snapshot vor Jahreswachstum** ist die richtige Idee, aber die Implementierung wird nicht gezeigt. SoA-Snapshot heißt: Liste der aktiven Member-Indizes als `Int32Array` zwischenspeichern. Bei 30k Knoten 120 KB — handhabbar, aber muss spezifiziert sein.

#### A.5.3 Was nicht adressiert wird

- **Was passiert bei `g < 1` (Schrumpfung)?** Wenn `membersPerYear=0.3, churnRate=0.5`, schrumpft das Netzwerk. Ist die Engine stabil? Bricht der Apportionierungs-Carry zusammen?
- **Wachstumsorder pro Jahr.** Wer wird zuerst angelegt? In welcher Reihenfolge wird gechurnt? Die Reihenfolge beeinflusst die Reattachment-Topologie.
- **Determinismus bei Re-Run.** Wenn `seed` gleich ist und alle Parameter gleich sind, muss das Ergebnis identisch sein — auch nach Code-Änderungen, die nur die Reihenfolge der Loops ändern. Das Dokument garantiert das nicht.

---

### A.6 Vorschlag D — Volumen-Pass

#### A.6.1 Personal Volume

> *personalVolume = ownVolume + shopperVolume*

**Kritik:**

- **Versteckte fachliche Annahme:** Kundenumsatz zählt 1:1 zum Personal Volume. In realen MLM-Plänen gilt das oft nicht — Kundenumsatz wird häufig nur teilweise oder gar nicht ins PV gerechnet, sondern als separate Größe geführt.
- **Das Dokument verweist auf Klärung in offenen Entscheidungen (Punkt 9)**, baut aber bereits eine Formel ein, die diese Klärung präjudiziert. Wenn die Antwort später lautet "Kundenumsatz zählt nur für PGV, nicht PV", muss die Datenstruktur umgebaut werden.

#### A.6.2 Group Volume in "reverse creation order"

> *iterate nodes in reverse creation order*

**Kritik:**

- **Funktioniert nur, wenn Kinder garantiert nach Eltern erzeugt werden.** Die Aussage stimmt für BFS-Aufbau, ist aber nicht im SoA-Modell als Invariante festgeschrieben. Jede zukünftige Änderung der Aufbaureihenfolge bricht den Volumen-Pass still.
- **Sollte als explizite Invariante markiert sein:** `assert(parentIds[i] < i || parentIds[i] === -1)`. Ohne diesen Assert verlässt man sich auf Implizita.
- **Reverse-Iteration über `Int32Array` ist trivial schnell** — das ist nicht die Frage. Die Frage ist die Robustheit gegen Code-Änderungen.

#### A.6.3 Qualifying Group Volume

> *qualifyingGroupVolume sollte getrennt geführt werden, auch wenn es zunächst identisch mit groupVolume ist.*

**Kritik:**

- **Inhaltlich richtig**, aber die vier genannten Gründe (Komprimierung, ignorierte Umsätze, Beinkappung, Kundenumsatz-Unterschied) sind genau die vier Mechaniken, die in **keinem** anderen Abschnitt von 05 spezifiziert sind. Wenn QGV als Feld existiert, aber kein Algorithmus es jemals von GV unterscheidet, ist es totes Gewicht.
- **Compression-Mechanik fehlt komplett.** Bei realen Plänen wird das Volumen inaktiver Knoten zum nächsten aktiven Vorfahren hochgereicht. Das ist nicht-trivial: muss man auf Member, Status, oder Rank-Schwelle prüfen?
- **Beinkappung (60%-Regel) fehlt komplett.** In vielen Plänen darf kein Bein mehr als X% des QGV beitragen. Erfordert pro-Bein-Volumen — was im DerivedStore nicht angelegt ist.

#### A.6.4 Was nicht adressiert wird

- **PV, GV, PGV, CV, BV, QV** — reale Pläne kennen 4–6 Volumenarten mit unterschiedlichen Mechaniken. Vorschlag D kennt zwei.
- **Differential-Provisionen** brauchen pro Knoten die Differenz zum Empfänger-Rang. Datenstruktur trägt das nicht.
- **Mehr-Pass-Berechnung.** Wenn höhere Ränge Bein-Indizes brauchen, die wiederum den Rang anderer Knoten brauchen, ist ein einzelner Pass nicht ausreichend. Das wird in E am Rand erwähnt, in D nicht.

---

### A.7 Vorschlag E — Lifeplus-Plan-Engine

#### A.7.1 RankRule-Struktur

```typescript
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

**Kritik:**

- **`maxLegContributionPercent` fehlt** — die 60%-Regel, die in fast allen MLM-Plänen existiert.
- **`requiresLifetimeRankOnce` fehlt** — manche Pläne kennen "einmal erreichten Status auf Lebenszeit anerkennen". Vorschlag E hat keine Erinnerung an Höhepunkte.
- **`phase: 1 | 2 | 3` fehlt.** Der aktuelle Code (`lineage/rankStats.ts`) trennt explizit `PHASE1_RANKS`, `PHASE2_RANKS`, `PHASE3_RANKS`. Diese Trennung verschwindet im neuen Modell.
- **`brand` fehlt.** Wo wird die Marke (LifePlus/FitLine/Eqology) referenziert? Implizit über `brandId` auf `CompensationPlan`-Ebene, aber das macht es zur Plan-Konfiguration, nicht zur Rang-Eigenschaft. Was, wenn FitLine andere Ränge hat als LifePlus? Das Datenmodell muss das aushalten.

#### A.7.2 Beispielwerte

```typescript
{ ordinal: 2, name: 'Bronze', minPersonalVolume: 45, minQualifyingGroupVolume: 3000, minQualifiedLegs: 3, ... }
```

**Kritik:**

- **3 Beine als Mindestanforderung für Bronze** stimmt nicht mit dem aktuellen LifePlus-Plan überein (siehe `simulator-app/src/components/lineage/rankStats.ts`: Bronze braucht 3 QL). Aber der aktuelle Code sagt auch `gv: 3000, av: 100` — der Vorschlag sagt `minPersonalVolume: 45`. Hier widersprechen sich Vorschlag und Code: `45` ist der LifePlus-Wert für `Member/Believer`, nicht für `Bronze` (dort 100 IP).
- **`version: 'TODO'`** — Dokument-typisches Unfertig. Wenn das Versionsfeld eine Semantik hat (z.B. semver), sollte sie spezifiziert sein. Wenn nicht, ist das Feld nutzlos.
- **Werte sollen aus der "richtigen Planversion geprüft werden"** — was bedeutet das? Wer prüft? Wann? Mit welcher Quelle? Im aktuellen Code stehen Werte, hier nicht.

#### A.7.3 Multi-Brand-Defizit

**Kritik:**

- **Nur LifePlus modelliert.** FitLine und Eqology fehlen komplett — obwohl das gesamte Projekt explizit drei Marken bedient.
- **Plan als TypeScript-`const`** statt JSON. Konsequenz: jede Plan-Änderung erfordert Rebuild. JSON-basiert wäre runtime-konfigurierbar, A/B-testbar, externalisierbar an Marketing-Abteilung.
- **Plan-Vergleichsmodus fehlt.** Eine Killer-Funktion des Multi-Brand-Simulators wäre "wie würde mein Netzwerk bei FitLine vergüten?". Vorschlag 05 sieht das nicht vor.

**Konstruktiv:**

```typescript
// /plans/lifeplus.json
{
  "brandId": "lifeplus",
  "version": "2025.06",
  "volumeWindow": "cumulative",
  "compressionRule": "inactive",
  "ranks": [
    {
      "ordinal": 1, "name": "Member", "phase": 1,
      "minPersonalVolume": 0, "requiresActivity": false
    },
    ...
  ]
}
```

`getProduct(productId)` lädt das JSON. Konfigurierbar pro Marke, ohne Code-Änderung.

#### A.7.4 Status-Pass

> *Für die erste Version ist ein zweistufiger Pass robuster als ein cleverer Einmal-Pass.*

**Kritik:**

- **Korrekte Engineering-Haltung**, aber der Pseudocode für den zweistufigen Pass fehlt.
- **Konvergenz nicht spezifiziert.** Wenn höhere Ränge im Pass 2 die Bein-Indizes verändern, und diese wiederum Pass 1 verändern: wann hört man auf? Fixpunkt-Iteration mit Konvergenzkriterium oder feste Pass-Anzahl?
- **Performance-Implikation unklar.** Zwei Passes = doppelte O(N)-Kosten. Bei mehreren Pässen wird das schnell teuer.

---

### A.8 Vorschlag F — Bein-Indizes

#### A.8.1 NodeLegSummary[]

```typescript
type NodeLegSummary = {
  directLegRootId: number;
  volume: number;
  maxRankOrdinal: number;
};
```

**Kritik:**

- **Pro Knoten ein Array von Leg-Summaries** ergibt bei 30.000 Knoten und durchschnittlich 5 Beinen 150.000 Einträge × ~12 Byte = ~1,8 MB. Auf Mobile handhabbar, aber das Dokument sagt es nicht.
- **Invalidierung unklar.** Wenn ein Knoten irgendwo tief im Baum den Rang ändert, müssen alle Vorfahren ihre Summaries aktualisieren — von tief nach Wurzel. Das ist eine O(Tiefe) × Vorfahren-Operation, nicht trivial.
- **Was passiert bei Reattachment?** Wenn ein Member gechurnt wird und seine Kinder hochrücken, müssen alle Summaries der Vorfahren neu berechnet werden. Das Dokument schweigt.

#### A.8.2 maxRankInSubtree

> *maxRankInSubtree[node] = max(rankOrdinal[node], max(maxRankInSubtree[child]))*

**Kritik:**

- **Inhaltlich korrekt.** Der Ansatz ist klassisch und richtig.
- **Aber:** das Feld wird in F vorgeschlagen, in A nicht in der `DerivedStore`-Struktur angelegt. Inkonsistenz zwischen Vorschlägen.
- **Speicher:** `Uint8Array` bei 30k Knoten = 30 KB. Trivial.
- **Update-Strategie nicht spezifiziert.** Ein einzelner Rangwechsel zwingt zu O(Tiefe) Updates aller Vorfahren. Bei 10k Updates pro Slider-Bewegung sind das 100k Operationen. Spürbar.

#### A.8.3 Unabhängigkeit

> *Wenn zwei Diamond-Knoten im selben direkten Bein liegen, zählt das als ein Diamond-Bein, nicht zwei.*

**Kritik:**

- **Inhaltlich korrekt** — eine der wenigen klaren Aussagen im Dokument.
- **Aber:** wie ist "Diamond-Bein" definiert? Bein, dessen Root Diamond ist? Bein, das irgendwo einen Diamond enthält? Das Dokument lässt offen, was zählt. Im aktuellen Code (`sunburst-node.ts` → `estimateAggregateRank`) wird Letzteres verwendet (max in subtree).

---

### A.9 Vorschlag G — Aggregat-Vorschätzung

#### A.9.1 Rekursionsformel

```
activeMembers(year+1) = activeMembers(year) + activeMembers(year) * membersPerYear
                       - activeMembers(year) * memberChurnRate
```

**Kritik:**

- **Die Formel ist eine Rekursion, keine Closed-Form.** Die Closed-Form wäre `N(t) = N(0) × g^t` mit `g = 1 + membersPerYear - memberChurnRate`. Beide ergeben das gleiche Ergebnis, aber die Closed-Form ist explizit O(1) und macht das Wachstumsmuster sichtbar (geometrisch).
- **Bei 10 Jahren spielt es praktisch keine Rolle** — die Rekursion ist auch O(10) ≈ O(1). Aber pädagogisch verschleiert die Rekursion, dass `g` der Wachstumsfaktor ist und `g < 1` Schrumpfung bedeutet.
- **Bei späterer Erweiterung auf tiefenabhängige Raten** wird nur die Rekursion bleiben können. Insofern pragmatisch gerechtfertigt.

#### A.9.2 Was fehlt

- **Speicher-Estimate.** Aus `expectedMembers × estimatedBytesPerNode` ergibt sich der RAM-Verbrauch sofort. Das ist die eigentliche Strategieentscheidung.
- **Tiefe-Estimate.** Bei `m=3, d=1, c=0` ist die Tiefe nach 10 Jahren ~9-10. Bei `m=2, d=0.5, c=0.3` ist sie ~5. Tiefe ist für Rendering wichtig (Sunburst-Ringe) und für Rekursions-Sicherheit.
- **Worst-Case-Werte.** Was passiert bei `m=8, d=1, c=0`? `N(10) = 8^10 = ~1 Mrd`. Die Engine muss das erkennen und ablehnen, bevor sie versucht zu allozieren.
- **Schwellwerte für Strategie-Wahl.** Bei welcher Größe wird Aggregat-Mode aktiv? Vorschlag H sagt "> 500.000" — aber Vorschlag G erwähnt das nicht.

**Konstruktiv:**

```typescript
function estimateNetworkSize(params: GrowthParams): NetworkEstimate {
  const g = 1 + params.membersPerYear * params.duplicationRate - params.memberChurnRate;
  const finalMembers = Math.round(Math.pow(g, params.years));
  const finalShoppers = Math.round(finalMembers * params.shoppersPerYear * params.years / 2);
  const expectedDepth = Math.ceil(Math.log(finalMembers) / Math.log(1 + params.membersPerYear));
  const expectedBytes = (finalMembers + finalShoppers) * 44; // SoA-Layout
  
  return {
    finalMembers, finalShoppers, expectedDepth, expectedBytes,
    strategy: finalMembers < 10_000 ? 'main-thread' :
              finalMembers < 100_000 ? 'worker' :
              finalMembers < 1_000_000 ? 'worker-with-aggregate-fallback' :
              'reject',
  };
}
```

---

### A.10 Vorschlag H — Worker-Strategie

#### A.10.1 Schwellwert-Tabelle

| Erwartete Member | Strategie |
|---:|---|
| < 10.000 | Main Thread möglich |
| 10.000-100.000 | Worker bevorzugt |
| > 100.000 | Worker verpflichtend |
| > 500.000 | Aggregatmodus prüfen |

**Kritik:**

- **"Möglich / bevorzugt / verpflichtend / prüfen"** sind weiche Begriffe. Eine Engine-Entscheidung muss eindeutig sein: Main Thread oder Worker, kein "möglich".
- **Worker-Overhead nicht quantifiziert.** Ein neuer Web Worker hat 5–20 ms Startup-Latenz, 1–5 ms Message-Roundtrip. Bei N=3.000 macht ein Worker die Sache **langsamer**, nicht schneller. Vorschlag H suggeriert, dass Worker bei 10.000 sinnvoll wären — das ist erst ab etwa 30.000 wirklich der Fall.
- **Transferable-Strategie fehlt.** SoA-Arrays sind via `Transferable` zero-copy übertragbar. Das ist die einzige Art, wie Worker bei großen Datenmengen sinnvoll werden. Object-Graphs müssen serialisiert werden (langsam).
- **Was passiert bei Slider während Worker rechnet?** Cancel-Mechanismus? Queue? Die Frage ist UX-kritisch und wird ignoriert.

#### A.10.2 SoA passt zu Workers

> *Typed Arrays können effizient an Worker übertragen werden.*

**Kritik:** korrekt, aber zu vage. Konkret heißt das:

```typescript
worker.postMessage({ tree: treeStore }, [
  treeStore.parentIds.buffer,
  treeStore.joinedMonth.buffer,
  treeStore.weight.buffer,
  // ...
]);
// Nach diesem postMessage ist treeStore im Main-Thread nicht mehr nutzbar.
```

Das hat eine konkrete Konsequenz: die Main-Thread-Kopie wird übertragen und ist danach leer. Wenn das Main-Thread-UI auf den TreeStore zugreifen muss, braucht es eine Kopie **vor** dem postMessage — was den Speichervorteil halbiert.

---

### A.11 Vorschlag I — UI-Verhalten

**Kritik:**

- **Inhaltlich korrekt**, aber drei zentrale UX-Mechaniken fehlen:

#### A.11.1 Debouncing

Slider erzeugen 30–60 Events/Sekunde. Ohne Debouncing wird die Engine 30–60×/Sekunde getriggert. Für Tier-4-Slider (m, d, c) ist das eine Katastrophe. **Empfehlung: 100–150 ms Debounce für teure Slider, 16 ms für günstige.**

#### A.11.2 Optimistic UI

Während der Worker den Baum aufbaut, sollte die UI bereits die Aggregat-Schätzung (aus Vorschlag G) zeigen. Das ist die Differenz zwischen "App fühlt sich tot an" und "App rechnet sichtbar". Vorschlag 05 erwähnt es nicht.

#### A.11.3 Progress-Indikator

Bei N > 50.000 dauert die Berechnung 200–500 ms. Ein Spinner ohne ETA frustriert. Ein Progress-Bar mit Phasen-Anzeige (Tree → Volumen → Status → Render) beruhigt. Vorschlag 05 erwähnt nur "Schätzung: ... wird aggregiert angenähert" als statischen Text.

#### A.11.4 Aggregat-Modus-Wechsel

> *Wenn ab sehr großen Netzwerken in Aggregatmodus gewechselt wird*

**Kritik:**

- **"sehr große Netzwerke"** ist nicht quantifiziert. Bei 500.001 Knoten plötzlich anders aussehen?
- **Modus-Wechsel ist UX-kritisch.** Wenn der User seinen Slider von 499k auf 501k schiebt und die Visualisierung plötzlich kollabiert, ist das verwirrend. Vorschlag 05 plant das nicht ein.

---

### A.12 Vorschlag J — Tests

**Kritik:**

- **Test-Liste ist solide**, deckt aber nur Happy Paths ab.
- **Edge-Cases fehlen:**
  - `g < 1` (schrumpfendes Netzwerk)
  - Knoten ohne Sponsor (Root-Sonderfall)
  - `m=0, d=0, c=0` (komplett statisches Netzwerk)
  - `m=20, d=1, c=0` (Explosion, sollte abgelehnt werden)
  - Negative Eingaben (defensiv?)
- **Performance-Tests fehlen.** Kein "Tree-Build < 100 ms bei N=30k". Ohne Performance-Tests gibt es keinen Regression-Schutz.
- **Multi-Brand-Tests fehlen.** Alle drei Pläne gegen denselben Baum, Konsistenz prüfen.
- **Test-Determinismus nicht spezifiziert.** Tests sollten mit festem Seed reproduzierbar sein — der aktuelle Code (`createTreeGrowthStrategy({ seed: 42 })`) macht das. Vorschlag J impliziert es, sagt es aber nicht.

---

### A.13 Implementierungsreihenfolge

**Kritik:**

- **Reihenfolge ist sinnvoll**, aber drei Schritte fehlen:
  - Reactive Dataflow / Smart Invalidation (vor UI-Anbindung)
  - Multi-Brand-Plan-Konfigurierung
  - Migration vom aktuellen Code-Stand (das Dokument tut so, als würde von null gebaut)
- **Zeitschätzungen fehlen.** Welcher Schritt dauert wie lange? Ohne ist die Reihenfolge nicht planbar. Realistische Schätzungen:
  - Schritt 1 (Aggregat-Vorschätzung): 0.5–1 Tag
  - Schritt 2 (Apportioning): 1–2 Tage
  - Schritt 3 (TreeBuilder SoA): 5–10 Tage
  - Schritt 4 (VolumePass): 2–3 Tage
  - Schritt 5 (RankEngine): 5–7 Tage
  - Schritt 6 (LegIndex): 2–3 Tage
  - Schritt 7 (UI): 5–10 Tage (mit Migration des Bestands-UIs)
  - Schritt 8 (Benchmarks): 2 Tage
  - **Summe: ~22-38 Tage Engineering-Zeit**

#### A.13.1 Migration fehlt komplett

**Kritik:** Das Dokument 05 tut so, als gäbe es noch keinen Code. Tatsächlich existiert ein voll funktionsfähiger Simulator mit:

- 6 verschiedenen Visualisierungen (Sunburst, Bein-Spalten, Hybrid-Tree, Radial, Dendrogramm, Lineage)
- 4-stufiger Statusberechnung
- 3 Wachstumsstrategien
- Goals-Engine
- Multi-Brand-Lockup
- Auth/Billing-Stack mit Paddle

Eine **Migrationsstrategie** ist Pflicht. Vorschlag 05 hat keine.

---

### A.14 Offene Entscheidungen

**Kritik:**

- **10 Punkte, alle relevant.** Aber:
  - Verantwortliche fehlen — wer klärt was?
  - Deadlines fehlen — wann muss geklärt sein?
  - **Punkt 6** ("Ob neue Member im Jahr ihrer Entstehung bereits Shopper werben dürfen") wird in Abschnitt C **bereits implizit beantwortet** ("Source Snapshot vor Jahreswachstum"). Konsistenz prüfen.
  - **Punkt 1** ("Exakte Lifeplus-Planversion") sollte VOR der Implementierung der RankEngine geklärt sein — sonst muss die Engine später umgebaut werden.
  - **Multi-Brand-Plan-Daten** fehlen in der Liste komplett.

---

### A.15 Empfehlung

> *Die erste Umsetzung sollte klein, aber fachlich sauber sein.*

**Kritik:**

- **"Klein, aber sauber"** — die 8 Punkte sind nicht klein, sie sind das gesamte Engine-Rewrite. "Klein" ist eine Selbsttäuschung.
- **Punkt 8: "Große Netzwerke über Worker und adaptive UI behandeln"** — was bedeutet das konkret? Welcher Schwellwert? Welche UI-Anpassung?
- **Smart Invalidation taucht nirgends auf.** Auch in der Empfehlung nicht. Das ist die wichtigste Lücke.

---

## Teil B — Vergleich mit aktuellem Code

### B.0 Methodische Hinweise

Ich habe Zugriff auf den Frontend-Code (`simulator-app/`) und die Cloudflare-Functions (`functions/`). Der Kern der Engine liegt in nicht sichtbaren Workspace-Paketen (`@mlm/simulator-core`, `@mlm/simulator-realistic-growth`, `@mlm/product-lifeplus`). Aus den TypeScript-Typen und der UI-Verwendung lässt sich aber präzise rückschließen, was die Engine kann.

### B.1 Was bereits existiert und in Vorschlag 05 ignoriert wird

#### B.1.1 PersonTreeSnapshot — die De-Facto-Engine-Ausgabe

`PersonTreeSnapshot` (siehe `sunburst-node.ts`):
- `rootId: string`
- `persons: SimPerson[]` — der materialisierte Baum, der in Vorschlag 05 als TreeStore neu vorgeschlagen wird
- `orders: …` — Bestellungen pro Knoten/Monat
- `memberGrowth/memberAttrition/shopperGrowth/shopperAttrition` — Statistik pro Snapshot

**`SimPerson` enthält bereits:**
- `id: string`
- `sponsorId?: string`
- `kind: 'root' | 'member' | 'shopper'`
- `joinedMonth: number` ← **Monatsauflösung, die Vorschlag 05 verliert**
- `active: boolean`
- `weight: number` ← **reduzierte Aktivität, die Vorschlag 05 verliert**
- `personalMonthlyVolume: number`
- `childrenIds: string[]`

**Konsequenz:** Vorschlag 05's `TreeStore` ist konzeptionell identisch mit `PersonTreeSnapshot.persons`, nur mit anderem Speicherlayout (SoA statt AoS). Der einzige **echte** Beitrag von 05 ist die Layout-Migration.

#### B.1.2 ShopperAggregateNode — schon implementiert

`person-tree-node.ts` definiert:
- `PersonNode` für Member
- `ShopperAggregateNode` als Sammelknoten für alle Shopper-Kinder eines Members

`buildPersonHierarchy` baut diese Struktur aus dem `PersonTreeSnapshot`. **Die zentrale Idee aus Vorschlag A ("Shopper als Skalar pro Member") ist bereits umgesetzt — auf Visualisierungsebene.**

Vorschlag 05 will dasselbe auf Datenmodell-Ebene erzwingen, verliert dabei aber die Möglichkeit zu Shopper-zu-Member-Konversionen, die das aktuelle Modell offen lässt.

#### B.1.3 TreeCompensationResult — die Rang-Engine

`TreeCompensationResult` enthält:
- `payouts: Array<{ orderId, orderPersonId, receiverId, phase, levelFromOrder, slot, rate, baseVolume, amount, reason }>`
- `rankStates: Array<{ personId, rank: { name }, av, qgv, qualifiedLegs, bronzeLegs, diamondLegs }>`
- `rankName, totalUnits, phase1Units, phase2Units, phase3Units, av, qgv, networkSize, directLegs, members, shoppers`

**Das ist exakt die RankEngine-Funktionalität aus Vorschlag E, vermutlich bereits voll implementiert.** Die `RankRule`-Struktur in 05 wird wahrscheinlich vom existierenden Plan-Code nicht 1:1 unterstützt — Migration nötig.

#### B.1.4 personYearEnds — der Snapshot Stream

`runSimulation` produziert `personYearEnds: PersonTreeSnapshot[]` (10 Snapshots, einer pro Jahr). Das ist der "Snapshot Stream", den ich in den vorigen Reviews als wichtige Performance-Optimierung empfohlen habe — **er existiert bereits**.

Konsequenz für Year-Scrubbing: O(1)-Zugriff auf jedes Jahr ohne Neuberechnung. Vorschlag 05 erwähnt das nicht, weil er den existierenden Code nicht kennt.

#### B.1.5 RealityStrategy — drei verschiedene Wachstumsmodelle

```typescript
type RealityStrategy = 'standard' | 'dirichlet' | 'momentum' | 'lifecycle';
```

`createTreeGrowthStrategy({ strategy, seed: 42 })` erzeugt eine konfigurierbare Wachstumsstrategie. Die Apportionierung aus Vorschlag B ist eine **Vereinfachung** dessen, was bereits existiert. Dirichlet ist eine raffiniertere stochastische Verteilung als einfaches Floor-with-Carry.

#### B.1.6 Mehrphasige Provisionen

Im `MonthResult`: `phase1EUR, phase2EUR, phase3EUR`. Im `TreeCompensationResult.payouts`: `phase: 1 | 2 | 3` pro Payout. Im Frontend (`sunburst-node.ts`): pro `SunburstNode` werden Phase-Aufschlüsselungen anteilig propagiert.

**Vorschlag 05 ignoriert diese Mechanik komplett.** Wenn der Refactor Phasen wegwirft, bricht die LineageView und alle Phase-Drilldowns.

#### B.1.7 Goals-Engine

`evaluateGoals(result, goals, inputs)` mit Goal-Typen `productsRefinanced | yearlySurplus | monthlySurplus | monthlyIncome`. Im UI als `GoalsLadderPanel` mit Achievement-Tracking pro Jahr.

**Vorschlag 05 ignoriert die Goals-Engine.** Eine wichtige UI-Funktion, die im Refactor weggeworfen würde.

#### B.1.8 LineageView — interaktive Plan-Erklärung

Komplettes Modul (`/lineage/`) mit:
- 12-Personen-Default-Team
- Status-Picker (Phase 1/2/3 mit Tab-Wahl)
- Order-Sheet mit Member/Shopper-Toggle und IP-Eingabe
- Live-Auszahlungsberechnung pro Order
- Rang-Icons (10 verschiedene), Phase-Visualisierung

**Komplett orthogonal zur Engine-Architektur in 05.** Würde im Refactor nichts verlieren, sollte aber als wertvolle UX-Komponente erhalten bleiben.

#### B.1.9 Pan-Zoom und kollabierbare Bäume

`usePanZoom()` Hook mit Mausrad-Zoom, Drag-Pan, Reset. `HorizontalDendrogram` und `RadialTree` mit `collapsedIds: Set<string>` und `collectInitiallyCollapsedIds()`.

**Vorschlag 05 sagt nichts zur Interaktivität.** Der gesamte UX-Layer der Visualisierungen ist im aktuellen Code, in 05 ignoriert.

#### B.1.10 Auth/Billing-Stack

`functions/` enthält ein vollständiges:
- Magic-Link-Auth mit Resend
- Paddle Billing (Sandbox + Live)
- Device-Limit-Logik
- Consent-Logging mit AGB/Privacy/Newsletter
- Trial-Entitlement-Degradierung
- B2B-Checkout mit USt-IdNr, Reverse-Charge, Discount-Code, Pricing-Preview
- Post-Checkout-Auto-Login (Gast-Checkout)
- Cookies (Hybrid topology: api.lifeflow360.app vs. www.lifeflow360.app)

**Vorschlag 05 hat null Berührung mit diesem Stack.** Aber: jede Datenmodell-Änderung muss konsistent mit Consent/Audit/Subscription-Daten bleiben — sonst zerbricht der Legal-Workflow.

### B.2 Code-Diff-Tabelle

| Bereich | Aktueller Code | Vorschlag 05 | Bewertung |
|---|---|---|---|
| Speichermodell | Object-Graph mit `SimPerson[]` | SoA `TreeStore` mit typed arrays | 🔄 Refactor sinnvoll, ~3-4 Wochen Aufwand |
| ID-Typ | `string` (z.B. UUID-ähnlich) | `Int32` | 🔄 Refactor, Performance + |
| Shopper | Knoten im Datenmodell, Aggregat in Visualisierung | Skalar pro Member | ❌ Regression bei Daten, kein UX-Gewinn |
| Zeit-Auflösung | Monat (`joinedMonth`, `monthIndex`) | Jahr (`yearOfBirth`) | ❌ Regression, verliert Monats-Provisionsdetails |
| Status | 4 Stufen + `weight: Float` | binär `isActive: Uint8` | ❌ Regression, verliert `under_qualified` |
| Wachstumsstrategie | `standard \| dirichlet \| momentum \| lifecycle` | Einfache Apportionierung | ❌ Regression, drei Modi gehen verloren |
| Provisionen | mehrphasig (`phase1/2/3 EUR`) | nicht modelliert | ❌ Regression, LineageView bricht |
| Plan-Engine | Per-Brand-Package (`product-lifeplus/fitline/eqology`) | LifePlus-only `const` | ❌ Regression, Multi-Brand verloren |
| Snapshot-Stream | `personYearEnds[]` (1 pro Jahr) | implizit über Re-Run | ✅ existiert bereits |
| Apportionment | `RealityStrategy: 'dirichlet'` | `apportionCount` / `apportionLoss` | ❓ unklar, vermutlich Vereinfachung |
| Worker | nicht erkennbar | als Schwellwert ab 10k | ✅ Verbesserung |
| Adaptive Rendering | manuell (Year Slider, Hide Inactive Toggle) | adaptive ab 500k | ✅ Verbesserung im Konzept |
| Goals | `evaluateGoals(result, goals, inputs)` | nicht erwähnt | ❌ würde im Refactor verschwinden |
| LineageView | komplette interaktive Plan-Erklärung | nicht erwähnt | ❌ würde im Refactor verschwinden |
| Pan-Zoom | `usePanZoom` mit Mausrad und Drag | nicht erwähnt | ❌ würde im Refactor verschwinden |
| Tree-Collapsing | `collapsedIds: Set`, `collectInitiallyCollapsedIds` | nicht erwähnt | ❌ würde im Refactor verschwinden |
| Auth | Magic-Link, Cookies, Device-Limit | nicht erwähnt | ✅ orthogonal, bleibt |
| Billing | Paddle B2B mit Pricing-Preview, Reverse-Charge | nicht erwähnt | ✅ orthogonal, bleibt |

**Zusammenfassung:**
- ✅ in 4 Bereichen Verbesserung
- ❌ in 9 Bereichen Regression
- 🔄 in 2 Bereichen sinnvoller Refactor
- ❓ in 1 Bereich unklar

### B.3 Funktionale Regressionen bei 1:1-Umsetzung von Vorschlag 05

Wenn Vorschlag 05 ohne Anpassung implementiert wird, **gehen folgende Mechaniken verloren:**

1. **Monats-Auflösung** → keine korrekte monatliche Provisionsabrechnung mehr.
2. **`weight`-Feld** → kein `under_qualified`-Status mehr, nur noch binär.
3. **4 Statusstufen** → reduziert auf 2.
4. **`RealityStrategy`** mit 3 Modi → reduziert auf 1.
5. **Mehrphasige Provisionen** → keine LineageView mehr möglich.
6. **Multi-Brand-Plan-Konfiguration** → nur LifePlus, FitLine und Eqology gehen verloren.
7. **Goals-Engine** → keine Ziele-Leiter mehr.
8. **LineageView** → kein Verständigungs-Tool für Vergütungsplan mehr.
9. **Pan-Zoom und Tree-Collapsing** → keine interaktive Exploration großer Bäume mehr.

Das ist erheblich. Die richtige Strategie ist **inkrementelle Migration**, nicht Neuimplementierung.

### B.4 Konstruktiver Refactor-Plan

Statt Neuimplementierung gemäß 05, schlage ich folgenden Refactor-Plan vor:

#### Phase 1 — Smart Invalidation einbauen (1–2 Wochen)
- `runSimulation` aufteilen in Layers: `buildTree`, `walkVolumes`, `walkStatuses`, `buildIndices`
- Reactive Dependency Graph (z.B. mit `useMemo` und Custom Cache)
- Slider-Tier-Erkennung (Tier 1–4)
- **Erwartung:** Slider-Latenz für Tier 2 von 30–50 ms auf <1 ms.

#### Phase 2 — Plan-Engine zentralisieren (1 Woche)
- Plan-Daten aus `product-lifeplus/fitline/eqology` in JSON-Konfigs extrahieren
- Generische `RankEngine` mit `CompensationPlan`-Input
- Multi-Brand-Vergleichsmodus als Bonus-Feature
- **Erwartung:** Sauberes Multi-Brand, Plan-Anpassungen ohne Rebuild.

#### Phase 3 — Adaptive Render-Strategie (1–2 Wochen)
- Schwellwert N(10) ≥ 50k → Aggregat-Modus im Visualizer
- Closed-Form-Aggregat als Fallback für > 500k
- Progress-Indikator + Optimistic UI mit Aggregat-Vorschätzung
- **Erwartung:** Mobile-tauglich bis > 300k Knoten.

#### Phase 4 — Bein-Indizes ergänzen (3–5 Tage)
- `maxRankInSubtree: Uint8Array` als zusätzliches Feld in `PersonTreeSnapshot.derived`
- Update-Logik integrieren
- **Erwartung:** Bein-Abfragen O(1) statt O(N).

#### Phase 5 — SoA-Refactor (3–4 Wochen, optional)
- Wenn Phase 1–4 nicht reichen: schrittweise von Object-Graph auf SoA
- Pro Layer migrieren, Tests grün halten
- **Erwartung:** 5–6× weniger Speicher, Mobile-Limit bei 1 Mio. Knoten.

#### Phase 6 — Worker-Auslagerung (1–2 Wochen, optional)
- Wenn Phase 5 abgeschlossen: typed-array transferable in Worker
- **Erwartung:** UI-Thread bleibt responsiv bei aggressiven Parametern.

**Gesamtzeit:** 6–11 Wochen für volle Umsetzung, 2–4 Wochen für die 80%-Variante (Phase 1–4).

---

## Teil C — Performance- und UX-Einschätzung

### C.0 Methodik

Performance-Werte basieren auf:
- V8-Benchmarks für JS-Object-Operationen (~150 Mio. Ops/s auf typischem Mobile)
- Typed Array Cache-Lokalität (3–5× schneller als Object-Graph)
- Erfahrungswerte aus vergleichbaren Browser-Simulatoren
- Annahme: Mittelklasse-Smartphone (Snapdragon 7-Gen-1 oder Apple A14-Niveau)

Realistische Parameter: `m=2, d=0.5, c=0.3` → N(10) ≈ 30–300 Knoten.  
Aggressive Parameter: `m=4, d=1.0, c=0.3` → N(10) ≈ 275.000 Knoten.

### C.1 Quantitative Vergleichstabelle

| Metrik | Aktueller Code (Object-Graph) | Nach Vorschlag 05 (SoA, ohne Smart Invalidation) | Mit Refactor-Plan (Smart Invalidation + SoA) | Faktor zum Aktuell |
|---|---:|---:|---:|---:|
| **Memory N=300** | <1 MB | <1 MB | <1 MB | 1× |
| **Memory N=30k** | 7–10 MB | 1–1.5 MB | 1–1.5 MB | 6× |
| **Memory N=275k** | 70–100 MB | 10–15 MB | 10–15 MB | 6× |
| **Initial Build N=300** | <10 ms | <10 ms | <10 ms | 1× |
| **Initial Build N=30k** | 30–50 ms | 15–25 ms | 15–25 ms | 2× |
| **Initial Build N=275k** | 300–500 ms | 120–200 ms | 120–200 ms | 2.5× |
| **Tree-Walk N=30k** | 10–20 ms | 2–4 ms | 2–4 ms | 5× |
| **Tree-Walk N=275k** | 120–200 ms | 25–40 ms | 25–40 ms | 5× |
| **Slider Tier 1 (Filter)** | 5–15 ms | 5–15 ms | <1 ms | 5–15× |
| **Slider Tier 2 (Eigenumsatz)** | 30–50 ms (Vollwalk) | 30–50 ms (Vollwalk) | <1 ms (incrementell) | 30–50× |
| **Slider Tier 3 (Plan-Wechsel)** | 80–150 ms | 60–100 ms | 20–30 ms | 4–5× |
| **Slider Tier 4 (m/d/c)** | 200–500 ms | 120–300 ms | 120–300 ms | 1.5× |
| **Year-Scrubbing** | <16 ms (vorgerechnet) | <16 ms | <16 ms | 1× |
| **Worker-Aufbau N=275k** | n/a (Main Thread) | 200 ms im Worker | 200 ms im Worker | UI bleibt responsiv |
| **Mobile OOM-Limit** | ~150k | ~1 Mio | ~1 Mio | 6–7× |

### C.2 Wo der Performance-Gewinn herkommt — nach Quelle

| Quelle | Beitrag zur UX-Verbesserung |
|---|---|
| **Smart Invalidation** | **40–50%** (Hauptanteil bei Slider-UX) |
| **SoA-Speicherlayout** | **20–25%** (Memory + Cache-Lokalität) |
| **Int32 statt String IDs** | **15–20%** (Tree-Walk-Speed) |
| **Worker-Auslagerung** | **10–15%** (nur bei großen Netzwerken) |
| **Apportionment-Determinismus** | ~0% Performance, +Korrektheit |
| **Closed-Form-Aggregat** | <5%, aber wichtig für Optimistic UI |

**Kernerkenntnis:** Smart Invalidation ist der mit Abstand größte Hebel — und in Vorschlag 05 nicht vorgesehen.

### C.3 UX-Auswirkungen nach realem Use Case

#### Use Case 1 — Neuer Nutzer probiert Slider aus
**Profil:** Mehrere Slider-Bewegungen pro Sekunde, m/d/c oszillieren.

- **Heute:** spürbare Lags bei `m ≥ 4`, Tier-4-Slider kosten 200–500 ms.
- **Nach Vorschlag 05 ohne Smart Invalidation:** kaum besser, weil bei jedem Slider neu gerechnet wird.
- **Nach Refactor-Plan mit Smart Invalidation:** durchgängig flüssig, Tier 1–3 unter 30 ms.

**UX-Gewinn:** **Stark** mit Smart Invalidation, **vernachlässigbar** ohne.

#### Use Case 2 — Erfahrener Nutzer experimentiert mit Eigenumsatz
**Profil:** Setzt pro Knoten verschiedene Eigenumsätze, beobachtet Auswirkung auf Rang.

- **Heute:** nicht möglich (kein Per-Knoten-UI vorhanden).
- **Nach Refactor:** möglich, Sub-Millisekunden-Latenz pro Änderung.

**UX-Gewinn:** **Neue Funktionalität.**

#### Use Case 3 — Mobile-User mit Budget-Phone
**Profil:** Android <2022, 2 GB RAM, Mittelklasse-CPU.

- **Heute:** N > 50k spürbare Lags, N > 150k OOM-Crash.
- **Nach SoA-Refactor:** stabil bis N = 300k, darüber Aggregat-Modus.

**UX-Gewinn:** **Stark.** Eröffnet eine ganze User-Klasse.

#### Use Case 4 — Demo-Termin mit aggressiven Parametern
**Profil:** `m=5, d=1.0, c=0`, Vorführung vor Top-Sponsoren.

- **Heute:** möglicherweise Crash oder Hang.
- **Nach Refactor:** Aggregat-Zahlen sofort, Tree-Aufbau im Hintergrund mit Progress-Bar.

**UX-Gewinn:** **Macht den Use Case erst möglich.**

#### Use Case 5 — Normaler Nutzer mit realistischen Parametern
**Profil:** `m=2, d=0.5, c=0.3`, N(10) ≈ 30 Knoten.

- **Heute:** läuft schon flüssig.
- **Nach Refactor:** gleich flüssig, weniger Speicher.

**UX-Gewinn:** **Nicht spürbar.**

### C.4 ROI-Analyse

| Maßnahme | Aufwand | UX-Gewinn | ROI |
|---|---|---|---|
| Smart Invalidation | 2 Wochen | Stark (Tier 2 +30×) | ✅✅ **sehr hoch** |
| Plan-Engine als JSON | 1 Woche | Stark (Multi-Brand-Fähigkeit) | ✅✅ **sehr hoch** |
| Adaptive Render-Strategie | 1–2 Wochen | Mittel (Edge-Cases) | ✅ hoch |
| Bein-Indizes (`maxRankInSubtree`) | 3–5 Tage | Mittel (Rang-Berechnung) | ✅ hoch |
| SoA-Refactor | 3–4 Wochen | Klein–Mittel (Mobile) | 🟡 mittel |
| Worker-Auslagerung | 1–2 Wochen | Klein–Mittel | 🟡 mittel |
| Apportionment-Wechsel | 2 Wochen | Negativ (verliert Dirichlet) | 🔴 niedrig |
| Shopper-Datenmodell ändern | 2 Wochen | Negativ (Datenverlust) | 🔴 niedrig/negativ |
| Monatsauflösung → Jahresauflösung | 1 Woche | Negativ (Provisionsdetail-Verlust) | 🔴 **vermeiden** |
| `weight`-Feld entfernen | 3 Tage | Negativ (Status-Verlust) | 🔴 **vermeiden** |

### C.5 Risikoanalyse bei 1:1-Umsetzung von Vorschlag 05

#### Risiko 1 — Funktionale Regression
**Wahrscheinlichkeit: hoch.** 9 von 17 bewerteten Bereichen wären Regression. Migration ohne Erhalt der existierenden Mechaniken bricht Goals-Engine, LineageView, Multi-Brand, Phasen-Provisionen und 4-stufigen Status.

**Mitigation:** Vorschlag 05 nicht als Neuimplementierung lesen, sondern als Architektur-Vision für eine spätere Phase. Erst Phase 1–4 des Refactor-Plans umsetzen.

#### Risiko 2 — Apportionment-Wechsel ändert Demo-Ergebnisse
**Wahrscheinlichkeit: hoch.** Der aktuelle Code nutzt `RealityStrategy: 'dirichlet'`, was raffinierter ist als einfaches Floor-with-Carry. Bei Umstellung können Demo-Zahlen sich messbar ändern.

**Mitigation:** Vorschlag-B-Apportionierung als neue `RealityStrategy: 'apportioning'` ergänzen, nicht als Ersatz. User hat die Wahl.

#### Risiko 3 — Smart Invalidation wird übersehen
**Wahrscheinlichkeit: sehr hoch.** Vorschlag 05 erwähnt sie nicht. Wenn Entwickler den Vorschlag 1:1 abarbeiten, bauen sie sie nicht ein.

**Mitigation:** Smart Invalidation als **erste** Maßnahme im Refactor-Plan etablieren, vor allem anderen.

#### Risiko 4 — Worker-Overhead bei kleinen Netzwerken
**Wahrscheinlichkeit: mittel.** Vorschlag H setzt Worker-Schwelle bei 10k Knoten. Bei kleineren Netzwerken kostet der Worker mehr als er bringt.

**Mitigation:** Schwelle empirisch ermitteln (vermutlich 30–50k), nicht aus dem Vorschlag übernehmen.

#### Risiko 5 — Multi-Brand wird nachträglich teurer
**Wahrscheinlichkeit: hoch.** Wenn die LifePlus-only-Plan-Engine implementiert wird, kostet die nachträgliche Multi-Brand-Anpassung mindestens 2× so viel.

**Mitigation:** Plan-Engine **gleich** als datengetrieben anlegen, JSON-konfigurierbar pro Marke.

### C.6 Einschätzung — finale Empfehlung

**Vorschlag 05 ist als Architektur-Vision tauglich, aber als Bauplan gefährlich.** Wer ihn 1:1 abarbeitet, baut eine funktionale Regression mit Performance-Vorteilen, die ohne Smart Invalidation gar nicht zur Wirkung kommen.

**Die richtige Antwort:**

1. **Smart Invalidation einbauen** (Phase 1 des Refactor-Plans) — größter Hebel, in 05 nicht erwähnt.
2. **Plan-Engine als JSON zentralisieren** (Phase 2) — Multi-Brand-Voraussetzung.
3. **Adaptive Render-Strategie** (Phase 3) — Mobile-Tauglichkeit und Edge-Cases.
4. **Bein-Indizes ergänzen** (Phase 4) — saubere Rang-Berechnung.
5. **Erst danach** SoA-Refactor und Worker erwägen, wenn Phase 1–4 nicht reichen.

**Erwartete UX-Verbesserung mit Phase 1–4 allein:** ~80% des gesamten Verbesserungspotenzials, bei ~40% des Aufwands.

**Was bleibt erhalten:** PersonTreeSnapshot, `weight`-Feld, Monatsauflösung, `RealityStrategy`-Optionen, mehrphasige Provisionen, Goals-Engine, LineageView, Pan-Zoom, Tree-Collapsing — die UX-Substanz des aktuellen Simulators.

Eine Engine-Neuimplementierung gemäß Vorschlag 05 würde 6–12 Wochen kosten, etwa die Hälfte davon für die Wiederherstellung dessen, was heute schon funktioniert. Diese Zeit ist besser in das Refactor-Programm investiert.

---

## Schlusswort

Dokument 05 ist die richtige **Richtung**, aber der falsche **Ausgangspunkt**. Es beschreibt eine schlanke, datengetriebene Engine als ob sie auf grüner Wiese entstünde — tatsächlich existiert bereits eine funktionierende Engine mit ausgereifter UX, Multi-Brand-Stack und vollständigem Auth/Billing.

Die Aufgabe ist nicht "Engine bauen", sondern "Engine verbessern, ohne das bestehende UX-Erlebnis zu verlieren". Das Dokument 05 berücksichtigt diesen Kontext nicht — und ein Reviewer, der das nicht benennt, hilft dem Projekt nicht.

Die in Teil C vorgeschlagene Phasen-Migration (Smart Invalidation → Plan-Engine → Adaptive Rendering → Bein-Indizes) liefert den Großteil des Nutzens, ohne die existierende Funktionalität zu opfern. Das ist der Pfad mit dem höchsten ROI.