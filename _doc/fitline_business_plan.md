# FitLine / PM-International Verguetungsplan - Logik und Aufbau

Dieses Dokument beschreibt die Logik hinter einer FitLine-/PM-International-Simulation: Datenmodell, Wachstumsregeln, Volumenlogik, Rang-System, Bonusarten und eine moegliche Umsetzung in Code. Es ist in mehreren Detailtiefen geschrieben: zuerst als einfache Erklaerung, dann als fachliches Modell und am Ende als technische Vorlage.

Die Bedienlogik kann weitgehend wie bei LifePlus bleiben: `membersPerYear`, `shoppersPerYear`, `duplicationRate`, `attritionRate`, Monatsvolumen, Goals und Realistic-Growth-Strategien. Die Verguetungslogik darunter muss aber anders rechnen, weil FitLine/PM nicht mit LifePlus-Phasen arbeitet, sondern mit EV, KDP, TVB, EB, EAB, TB und MB.

**Wichtiger Begriffs-Hinweis:** Fuer FitLine/PM sollten `Member` und `Shopper` in der Oberflaeche ersetzt werden:

| Generischer/LifePlus-Begriff | FitLine-/PM-Begriff | Empfehlung |
| --- | --- | --- |
| Member | Teampartner / Vertriebspartner | Im UI `Teampartner` anzeigen. Im generischen Code kann `member` weiter als technischer Typ bleiben. |
| Shopper | Kunde / Direktkunde | Im UI `Kunde` anzeigen. Im generischen Code kann `shopper` weiter als technischer Typ bleiben. |
| IP | Punkte / P | Im UI `Punkte` oder `P` anzeigen. |
| Leg / Bein | Erstlinie / Team / Bein | Im UI `Team` oder `Bein` anzeigen. Fuer Ranglogik bleibt `leg` passend. |

---

## Inhalt

1. [Ausgangsfrage: Was simuliert dieser Plan](#ausgangsfrage)
2. [Das Datenmodell auf einen Blick](#datenmodell)
3. [Eingangsparameter](#eingangsparameter)
4. [Wachstumslogik des Netzwerks](#wachstumslogik)
5. [Numerisches Beispiel ueber 3 Jahre](#numerisches-beispiel)
6. [Volumen- und Provisionsberechnung](#provisionsberechnung)
7. [Rang-System und Qualifikation](#rangsystem)
8. [Goals-Auswertung](#goals)
9. [Realistic-Growth-Strategien](#realistic-growth)
10. [Vorlage fuer die Code-Umsetzung](#vorlage)
11. [Offene Punkte fuer Exaktheit](#offene-punkte)
12. [Glossar](#glossar)

---

<a id="ausgangsfrage"></a>
## 1. Ausgangsfrage: Was simuliert dieser Plan

FitLine/PM-International ist ein Direktvertriebs- und Empfehlungsnetzwerk. Du verkaufst Produkte an Kunden, baust ein Team aus Teampartnern auf und verdienst aus direktem Verkauf, Kundenprogrammen, Erstlinienumsatz, Schnellstarter-Boni, Tiefenbonus und Management-Bonus.

Die Simulation beantwortet die Frage:

> Wenn du jedes Jahr X neue Teampartner und Y neue Kunden gewinnst und deine Teampartner dieses Verhalten teilweise duplizieren, wie entwickeln sich Netzwerk, Rang, Cash-Provision und Zusatzleistungen ueber 1, 2, ..., 10 Jahre?

Die Simulation ist nicht nur eine Prozentrechnung auf Gesamtumsatz. FitLine/PM kombiniert mehrere Einkommensarten:

- direkter Produktverkauf
- Kunden-Direktprogramm
- TOP-Verkaeufer-Bonus
- Erstlinien-Bonus
- Einarbeitungs-Bonus fuer Schnellstarter
- Tiefen-Bonus ueber sechs Ebenen
- differenzieller Management-Bonus
- freiwillige Zusatzleistungen ab hoeheren Raengen

Fuer eine Interessenten-Demo ist die zentrale Story:

- Am Anfang zaehlen Kunden, persoenlicher Verkauf und erste Teampartner.
- Danach zaehlt ein 100-P-Abo, weil es den Erstlinien-Bonus freischaltet.
- Dann zaehlt Duplikation: Teampartner bauen selbst Kunden und Teampartner auf.
- Spaeter zaehlen Rang-Beine und Management-Differenzen, nicht nur Gesamtvolumen.

---

<a id="datenmodell"></a>
## 2. Das Datenmodell auf einen Blick

Die Simulation kennt vier zentrale Entitaeten:

| Entitaet | FitLine-/PM-Begriff | Was es ist | Wie es modelliert wird |
| --- | --- | --- | --- |
| User | Du / Teampartner | Mittelpunkt der Simulation. | Implizit oder als Root-Node. |
| Member | Teampartner | Kann Kunden und weitere Teampartner gewinnen. | Zaehler pro Ebene/Bein oder echte Nodes. |
| Shopper | Kunde | Kauft Produkte, verdient aber keine Provision. | Zaehler pro Ebene/Bein; spaeter optional echte Kunden-Cohorts. |
| Bein | Erstlinie / Team | Direkter Teampartner plus vollstaendige Downline. | `Leg` mit Volumen, Rangstatus und Ebenen. |

### Sicht: Ebenen und Beine

Das Netzwerk kann wie bei LifePlus in Ebenen und Beine aufgeteilt werden:

```text
Du
 |
 +-- Bein 1 ----- direkter Teampartner A (Ebene 1)
 |               |
 |               +-- Teampartner auf Ebene 2
 |                   |
 |                   +-- Teampartner auf Ebene 3
 |
 +-- Bein 2 ----- direkter Teampartner B (Ebene 1)
                 |
                 +-- Kunden und Teampartner
```

Bei FitLine/PM sind die direkten Beine besonders wichtig, weil mehrere Ränge nicht nur Punkte, sondern qualifizierte Rang-Beine verlangen:

- Sales Manager: mindestens 1 Manager-Bein
- Marketing Manager: mindestens 2 Manager-Beine
- IMM: mindestens 3 Manager-Beine
- hoeher: mehrere SM/MM/IMM/VP/EVP/P-Beine

### Aggregierte Sicht fuer V1

Fuer eine erste Simulation kann das LifePlus-Modell mit `membersByLevel`, `shoppersByLevel` und `legs[]` weiterverwendet werden:

```ts
type NetworkSnapshot = {
  membersByLevel: number[];   // FitLine: Teampartner nach Tiefe
  shoppersByLevel: number[];  // FitLine: Kunden nach Tiefe
  legs: Leg[];
};

type Leg = {
  id: string;
  membersByLevel: number[];
  shoppersByLevel: number[];
  rank?: PMRankCode;
  monthlyPoints?: number;
};
```

Das reicht fuer:

- Wachstum ueber Jahre
- einfache Rang-Schaetzung
- Tiefenbonus auf Ebenen 1-6
- grobe Management-Bonus-Schaetzung
- Goals und Szenarien

### Exakte Sicht fuer V2

Fuer eine genaue FitLine/PM-Simulation ist ein echtes Node-Modell besser:

```ts
type PMNode = {
  id: string;
  parentId?: string;
  personalRetailPoints: number;
  customerProgramPoints: number;
  autoshipPoints: number;
  qualifiedFastStarterCount: number;
  children: PMNode[];
  rank?: PMRankCode;
  groupPoints?: number;
  paidManagementRate?: number;
};
```

Warum V2 besser ist:

- Management-Bonus ist differenziell.
- Ab VP muessen konkrete Rang-Beine gezaehlt werden.
- In der Downline bereits gezahlte Boni muessen abgezogen werden.
- "max."-Deckel in tieferen Ebenen lassen sich nur mit Struktur sauber abbilden.

---

<a id="eingangsparameter"></a>
## 3. Eingangsparameter

Die gleiche Bedienlogik wie bei LifePlus ist moeglich. Die Labels sollten aber auf FitLine/PM umgestellt werden.

### 3.1 Wachstums-Parameter (firmenneutral)

Diese Parameter koennen fuer FitLine/PM grundsaetzlich gleich bleiben:

| Parameter | Default-Idee | UI-Label fuer FitLine/PM | Bedeutung |
| --- | ---: | --- | --- |
| `membersPerYear` | 2 | Teampartner/Jahr | Wie viele neue Teampartner du selbst pro Jahr gewinnst. Jeder existierende Teampartner gewinnt im Schnitt ebenfalls so viele, gewichtet mit `duplicationRate`. |
| `shoppersPerYear` | 3 | Kunden/Jahr | Wie viele neue Kunden du selbst pro Jahr gewinnst. |
| `duplicationRate` | 1.0 | Duplikationsrate | Wie stark deine Teampartner dein Verhalten kopieren. |
| `attritionRate` | 0.0 | Fluktuation | Jaehrliche Austrittsrate fuer Teampartner und Kunden. |
| `maxDirectMembersPerMember` | 29 | max. direkte Teampartner | Betreuungskapazitaet pro Teampartner. |

**Hinweis zu 3.1:** Fuer eine einfache V1 muessen keine neuen Wachstums-Parameter eingefuehrt werden. Die LifePlus-Bedienlogik reicht aus, wenn jeder neue `member` als Teampartner und jeder neue `shopper` als Kunde interpretiert wird.

Wenn der FitLine/PM-Plan genauer simuliert werden soll, sollten folgende neue Wachstums-/Qualitaetsparameter ergaenzt werden:

| Neuer Parameter | Warum fuer FitLine/PM sinnvoll | Verwendung |
| --- | --- | --- |
| `autoshipAdoptionRate` | Der Erstlinien-Bonus setzt ein eigenes Abo von mindestens 100 P voraus; auch Teampartner-Abos praegen das Beispiel. | Anteil der Teampartner/Kunden mit regelmaessigem Abo. |
| `fastStarterRate` | Der Einarbeitungs-Bonus zahlt 50 EUR je qualifiziertem Schnellstarter. | Anteil neuer Teampartner, die als Schnellstarter qualifizieren. |
| `activePartnerRate` | Nicht jeder Teampartner baut aktiv weiter. `duplicationRate` beschreibt Intensitaet, aber nicht Aktiv-/Inaktiv-Status. | Filter fuer Rang-Beine und Duplikation. |
| `rankLegBalanceStrategy` | Hohe Raenge verlangen mehrere qualifizierte Rang-Beine. Symmetrisches Wachstum kann das ueberzeichnen. | Verteilung neuer Teampartner auf Beine: symmetrisch, schwaches Bein, zufaellig. |

Pragmatische V1:

```ts
type GrowthInputs = {
  membersPerYear: number;
  shoppersPerYear: number;
  duplicationRate: number;
  attritionRate: number;
  maxDirectMembersPerMember: number;
};
```

Genauere FitLine-Variante:

```ts
type PMGrowthInputs = GrowthInputs & {
  autoshipAdoptionRate: number;
  fastStarterRate: number;
  activePartnerRate: number;
  rankLegBalanceStrategy: 'symmetric' | 'weakLeg' | 'randomWeighted';
};
```

### 3.2 Volumen-Parameter

FitLine/PM rechnet mit Punkten (`P`). Im PDF steht `1 P ≈ 51 Euro Cent`. Die Rechenbeispiele wirken aber so, als wuerden einzelne Boni mit einem anderen effektiven Wert oder mit produkt-/bonusartspezifischen Netto-Werten kalkuliert. Deshalb sollte der Simulator den Punktwert nicht hart verdrahten.

LifePlus hat nur `memberMonthlyVolume`, `shopperMonthlyVolume`, `personalMonthlyVolume` und `unitToCurrency`. Fuer FitLine/PM sollten die Volumen-Parameter erweitert werden.

| Parameter | Default-Idee | Bedeutung |
| --- | ---: | --- |
| `memberMonthlyVolume` | 100 P | Durchschnittliches monatliches Volumen eines Teampartners. Fuer Abo-nahe Szenarien passt 100 P gut. |
| `shopperMonthlyVolume` | 100 P | Durchschnittliches monatliches Kundenvolumen. |
| `personalMonthlyVolume` | 100 P | Eigener Monatsumsatz / eigenes Abo. Wichtig: ab 100 P wird der Erstlinien-Bonus freigeschaltet. |
| `pointToCurrency` | 0.51 | Generischer Punkt-zu-EUR-Faktor laut PDF-Hinweis. |

**Hinweis zu 3.2:** Fuer FitLine/PM reicht eine reine Anpassung der Hoehe nicht aus, wenn der Plan nachvollziehbar berechnet werden soll. Es sollten neue Werte eingefuehrt werden, weil EV, KDP, EB, EAB, TB und MB unterschiedliche Basen haben.

Empfohlene Erweiterung:

| Neuer Parameter | Default-Idee | Warum noetig |
| --- | ---: | --- |
| `pointToRetailEUR` | konfigurierbar | Einzelhandels-Verdienst kann eine andere effektive EUR-Basis haben als Bonuspunkte. |
| `pointToBonusEUR` | konfigurierbar | EB/TB/MB-Beispiele passen nicht sauber zu 0,51 EUR pro Punkt. |
| `ownAutoshipPoints` | 100 P | Freischaltung Erstlinien-Bonus. |
| `partnerAutoshipPoints` | 100 P | Typischer 100-P-Abo-Umsatz eines Teampartners. |
| `directRetailCustomerPoints` | variabel | Basis fuer Einzelhandels-Verdienst. |
| `directKdpCustomerPoints` | variabel | Basis fuer Kunden Direktprogramm. |
| `personalSalesPoints` | variabel | Vermutete Basis fuer TOP-Verkaeufer-Bonus. |
| `qualifiedFastStartersPerMonth` | berechnet oder manuell | Basis fuer Einarbeitungs-Bonus. |
| `directTeamPartnerBusinessPoints` | abgeleitet, optional override-faehig | Geschaeftsvolumen direkter Teampartner. Basis fuer EB. Standard: `membersByLevel[0] * memberMonthlyVolume`. |
| `applyCompression` | false in V1 | Optionaler Schalter fuer komprimierte Tiefen-/Management-Berechnung. Aus der vorliegenden PDF nicht eindeutig belegbar, daher nicht als Standardregel setzen. |
| `compressionThresholdPoints` | 100 P | Mindestaktivitaet, ab der ein Teampartner fuer optionale Komprimierung als aktiv gilt. |

Technischer Vorschlag:

```ts
type PMVolumeInputs = {
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
  personalMonthlyVolume: number;
  pointToCurrency: number;

  pointToRetailEUR: number;
  pointToBonusEUR: number;
  ownAutoshipPoints: number;
  partnerAutoshipPoints: number;
  directRetailCustomerPoints: number;
  directKdpCustomerPoints: number;
  personalSalesPoints: number;
  qualifiedFastStartersPerMonth?: number;
  directTeamPartnerBusinessPoints?: number;
  applyCompression?: boolean;
  compressionThresholdPoints?: number;
};
```

### 3.3 Wirtschaftliche Parameter (firmenneutral)

| Parameter | Default-Idee | Bedeutung |
| --- | ---: | --- |
| `monthlyProductCostEUR` | frei | Eigene Produktkosten pro Monat. Basis fuer Refinanzierung und Ueberschuss-Ziele. |
| `includeBenefitsInGoals` | false | Zusatzleistungen wie Auto oder Altersvorsorge sollten standardmaessig nicht als Cash-Provision gelten. |

### 3.4 FitLine-/PM-spezifische Bonus-Schalter

Fuer transparente Simulation sollten Bonusarten ein- und ausschaltbar sein:

| Parameter | Bedeutung |
| --- | --- |
| `simulateRetailProfit` | Einzelhandels-Verdienst berechnen. |
| `simulateKdp` | Kunden Direktprogramm berechnen. |
| `simulateTopSellerBonus` | TOP-Verkaeufer-Bonus ab 2.500/5.000 P berechnen. |
| `simulateFirstLineBonus` | Erstlinien-Bonus bei eigenem 100-P-Abo berechnen. |
| `simulateStarterBonus` | Einarbeitungs-Bonus fuer Schnellstarter berechnen. |
| `simulateDepthBonus` | Tiefen-Bonus ueber sechs Ebenen berechnen. |
| `simulateManagementBonus` | Management-Bonus differenziell oder approximiert berechnen. |
| `simulateBenefits` | Zusatzleistungen separat ausweisen. |
| `simulateCompression` | Optional: inaktive Teampartner fuer TB/MB komprimieren. Nur aktivieren, wenn diese Regel fachlich bestaetigt ist oder als Szenario bewusst getestet wird. |

---

<a id="wachstumslogik"></a>
## 4. Wachstumslogik des Netzwerks

Die Wachstumsrechnung kann wie bei LifePlus einmal pro Jahr passieren. Zwischen den Jahresanfaengen bleiben Teampartner und Kunden stabil, abgesehen von Fluktuation.

### 4.1 Reihenfolge im Jahres-Start

```text
JAHR N START:
1) sourceLegs = Snapshot aller Beine VOR den Direkt-Adds dieses Jahres.
   Nur diese werben in diesem Jahr.
2) Du gewinnst membersPerYear neue Teampartner auf Ebene 1:
     - jeder neue Teampartner ist eine neue Bein-Wurzel
     - begrenzt durch maxDirectMembersPerMember
3) Du gewinnst shoppersPerYear neue Kunden.
4) Pro Bein in sourceLegs, pro Ebene:
     jeder aktive Teampartner gewinnt
       membersPerYear * duplicationRate * activePartnerRate neue Teampartner
       shoppersPerYear * duplicationRate neue Kunden
     eine Ebene tiefer.
5) Optional:
     autoshipAdoptionRate bestimmt, wie viele davon ein Abo haben.
     fastStarterRate bestimmt, wie viele neue Teampartner Schnellstarter sind.
6) Fluktuation reduziert Teampartner/Kunden.
7) Snapshot zaehlt Teampartner, Kunden, Volumen, Abo-Volumen und Schnellstarter.
```

### 4.2 Die zentrale Regel: Year-Offset

> Ein neu gewonnener Teampartner wirbt erst ab dem Folgejahr.

Das ist fuer FitLine/PM genauso sinnvoll wie fuer LifePlus. Ein neuer Teampartner braucht Einarbeitung, Produktverstaendnis und erste Kunden, bevor er selbst dupliziert.

### 4.3 Membergrenze pro Sponsor

`maxDirectMembersPerMember` kann bleiben. Im UI sollte es `max. direkte Teampartner` heissen.

### 4.4 Fluktuation

- Teampartner-Fluktuation wirkt auf aktive Teampartner.
- Kunden-Fluktuation wirkt in V1 wie bei LifePlus auf bestehende Kunden-Bestaende pro Bein und Ebene.
- Spaeter koennen echte Kunden-Cohorts ergaenzt werden, wenn Laufzeiten/Abos genauer modelliert werden sollen.
- Bei V2 sollte zwischen Kunden, passiven Teampartnern und aktiven Teampartnern unterschieden werden.

### 4.5 Aggregat-Auswertung

Am Ende jedes Monats werden Aggregate gebildet:

```text
membersByLevel[level] = Summe Teampartner auf Ebene level
shoppersByLevel[level] = Summe Kunden auf Ebene level
memberVolumeByLevel[level] = membersByLevel[level] * memberMonthlyVolume
shopperVolumeByLevel[level] = shoppersByLevel[level] * shopperMonthlyVolume
```

Diese Aggregate sind die Basis fuer V1. Fuer V2 werden zusaetzlich je Bein und je Node Ränge und gezahlte Management-Raten gespeichert.

---

<a id="numerisches-beispiel"></a>
## 5. Numerisches Beispiel ueber 3 Jahre

Inputs:

```text
membersPerYear = 2
shoppersPerYear = 3
duplicationRate = 1.0
attritionRate = 0
maxDirectMembersPerMember = 29
memberMonthlyVolume = 100 P
shopperMonthlyVolume = 100 P
personalMonthlyVolume = 100 P
```

### Jahr 1

- Du gewinnst 2 Teampartner und 3 Kunden.
- Die neuen Teampartner werben noch nicht selbst.

```text
membersByLevel = [2]
shoppersByLevel = [3]
monthlyGroupPoints = 2 * 100 + 3 * 100 = 500 P
```

Interpretation:

- Du hast zwei erste Beine.
- Dein eigenes 100-P-Abo kann den Erstlinien-Bonus aktivieren.
- Ränge oberhalb Teampartner sind noch nicht realistisch, weil Manager 600 P verlangt.

### Jahr 2

- Du gewinnst 2 neue Teampartner und 3 neue Kunden.
- Die Jahr-1-Teampartner werben nun ebenfalls.

```text
membersByLevel = [4, 4]
shoppersByLevel = [6, 6]
monthlyGroupPoints = (4 + 4 + 6 + 6) * 100 = 2 000 P
```

Interpretation:

- Es gibt vier direkte Beine.
- Die Struktur kann Richtung Manager/Sales Manager wachsen.
- Fuer Sales Manager braucht es laut PDF 2.500 P und mindestens ein Manager-Bein.

### Jahr 3

Herleitung:

- Direkte Ebene: Du gewinnst erneut 2 Teampartner und 3 Kunden. Dadurch steigen Ebene 1 von 4 auf 6 Teampartner und von 6 auf 9 Kunden.
- Ebene 2: Die vier bereits bestehenden direkten Teampartner aus Jahr 1 und Jahr 2 werben nun selbst. Bei 2 neuen Teampartnern und 3 Kunden pro aktivem Teampartner entstehen 8 neue Teampartner und 12 neue Kunden auf Ebene 2. Zusammen mit dem Bestand aus Jahr 2 ergibt das 12 Teampartner und 18 Kunden.
- Ebene 3: Nur die Ebene-2-Teampartner aus Jahr 2 werben im dritten Jahr erstmals. Daraus entstehen 8 Teampartner und 12 Kunden.

```text
membersByLevel = [6, 12, 8]
shoppersByLevel = [9, 18, 12]
monthlyGroupPoints = (6 + 12 + 8 + 9 + 18 + 12) * 100 = 6 500 P
```

Interpretation:

- Das Volumen reicht rechnerisch fuer Marketing-Manager-nahe Schwellen.
- Ob der Rang wirklich erreicht wird, haengt von qualifizierten Manager-Beinen ab.
- Hier sieht man den Unterschied zu einfachen Umsatzplaenen: Nicht nur Gesamtpunkte, sondern Struktur entscheidet.

---

<a id="provisionsberechnung"></a>
## 6. Volumen- und Provisionsberechnung

FitLine/PM verwendet mehrere parallele Einkommensarten. Fuer Code und UI sollten sie getrennt berechnet und angezeigt werden.

```ts
type PMCompensationComponents = {
  retailProfitEUR: number;
  customerDirectProgramEUR: number;
  topSellerBonusEUR: number;
  firstLineBonusEUR: number;
  starterTrainingBonusEUR: number;
  depthBonusEUR: number;
  managementBonusEUR: number;
  monthlyBenefitsEUR: number;
  annualBenefitsEUR: number;
  oneTimeBenefitsEUR: number;
};
```

### 6.1 Punkte, Eigenvolumen und Gruppenvolumen

FitLine/PM rechnet mit Punkten (`P`).

```text
personalPoints = personalMonthlyVolume oder ownAutoshipPoints
groupPoints = Summe aller Teampartner- und Kundenpunkte im Netzwerk
directTeamPartnerPoints = Punkte deiner direkten Teampartner
directCustomerPoints = Punkte deiner direkten Kunden
```

Fuer Ränge:

```text
rankVolume = groupPoints
```

Fuer Bonusarten:

```text
retailBase = directRetailCustomerPoints
kdpBase = directKdpCustomerPoints
firstLineBase = Geschaeftsvolumen direkter Teampartner
depthBase = Volumen nach Ebenen
managementBase = strukturabhaengiges Gruppenvolumen
```

### 6.2 Einzelhandels-Verdienst (EV)

PDF:

- 20-40 %
- TP sichtbar mit 20 % Einzelhandel
- Manager sichtbar mit 30 % Einzelhandel
- 40 % ist im PDF-Text nicht eindeutig einer Rangstufe zugeordnet

Konservative V1:

| Rang | Retail-Rate |
| --- | ---: |
| TP | 20 % |
| M und hoeher | 30 % |

Formel:

```text
retailProfitEUR = directRetailCustomerPoints * pointToRetailEUR * retailRate[rank]
```

Optional:

```ts
retailRateOverride?: number; // fuer Produkt-/Preislistenlogik bis 40 %
```

### 6.3 Kunden Direktprogramm (KDP)

PDF:

- 15-25 %

Das PDF liefert keine vollstaendige Formel. Deshalb als eigene Komponente modellieren:

```text
customerDirectProgramEUR =
  directKdpCustomerPoints * pointToBonusEUR * kdpRate
```

V1:

```ts
kdpRate = 0.15; // konservativ
```

Konfigurierbar:

```ts
kdpRateRange = { min: 0.15, max: 0.25 };
```

### 6.4 TOP-Verkaeufer-Bonus (TVB)

PDF:

- 3 % ab >= 2.500 P
- 5 % ab >= 5.000 P

Wichtig: Die relevante Punktebasis ist im PDF-Auszug nicht eindeutig. Fuer Code sollte sie als `personalSalesPoints` separat gefuehrt werden.

```ts
function calculateTopSellerBonus(points: number, pointToBonusEUR: number): number {
  if (points >= 5000) return points * pointToBonusEUR * 0.05;
  if (points >= 2500) return points * pointToBonusEUR * 0.03;
  return 0;
}
```

### 6.5 Erstlinien-Bonus (EB)

PDF-Fussnote:

```text
Bei einem eigenen Abo mit mind. 100 P verdienen Sie auch 10 %
auf das Geschaeftsvolumen Ihrer TPs.
```

Formel:

```text
eligible = ownAutoshipPoints >= 100
firstLineBonusEUR =
  eligible
    ? directTeamPartnerBusinessPoints * pointToBonusEUR * 0.10
    : 0
```

Beispiel-Abgleich:

- 7 Teampartner mit Abo à 100 P
- PDF: ca. 63 EUR = 7 x 9 EUR
- Das entspricht 9 EUR pro 100-P-Abo, also effektiv nicht exakt `100 * 0,51 * 10 %`

Deshalb:

```ts
firstLinePointToEUR?: number;
```

oder allgemeiner:

```ts
pointToBonusEUR` konfigurierbar halten.
```

### 6.6 Einarbeitungs-Bonus (EAB)

PDF:

- 50 EUR
- verknuepft mit Schnellstarter / 5+1-Logik

Formel:

```text
starterTrainingBonusEUR = qualifiedFastStarters * 50
```

Wenn `fastStarterRate` verwendet wird:

```text
qualifiedFastStarters =
  newDirectTeamPartnersThisMonthOrYear * fastStarterRate
```

Fuer exakte Abrechnung muss geklaert werden:

- Was qualifiziert als Schnellstarter?
- In welchem Zeitraum?
- Einmalig oder wiederholbar?

### 6.7 Tiefen-Bonus (TB)

PDF:

- 6 Ebenen Tiefen-Bonus
- 3-5 %

Basisraten:

| Ebene | TB-Rate |
| ---: | ---: |
| 1 | 5 % |
| 2 | 3 % |
| 3 | 3 % |
| 4 | 3 % |
| 5 | 5 % |
| 6 | 5 % |

Formel:

```text
depthBonusEUR =
  sum(levelVolume[i] * pointToBonusEUR * depthRate[i])
  fuer i = 1..6
```

Technisch, wenn Arrays bei 0 starten:

```ts
const DEPTH_RATES = [0.05, 0.03, 0.03, 0.03, 0.05, 0.05] as const;

function calculateDepthBonus(snapshot: NetworkSnapshot, inputs: PMVolumeInputs): number {
  let total = 0;
  const levels = inputs.applyCompression
    ? buildCompressedLevels(snapshot, inputs) // V2 oder explizites Szenario
    : snapshot;

  for (let level = 0; level < 6; level++) {
    const memberPoints = (levels.membersByLevel[level] ?? 0) * inputs.memberMonthlyVolume;
    const shopperPoints = (levels.shoppersByLevel[level] ?? 0) * inputs.shopperMonthlyVolume;
    total += (memberPoints + shopperPoints) * inputs.pointToBonusEUR * DEPTH_RATES[level];
  }
  return total;
}
```

Komprimierung ist im bereitgestellten PDF nicht ausreichend beschrieben. Deshalb sollte `applyCompression` in V1 standardmaessig `false` bleiben. Wenn ein Fact Sheet oder interne Regelunterlage Komprimierung bestaetigt, kann V2 mit Node-Modell inaktive Teampartner unterhalb `compressionThresholdPoints` ueberspringen und deren Downline auf die naechste bonusfaehige Ebene ziehen.

### 6.8 Management-Bonus (MB)

PDF:

- 2-21 %
- Management-Boni und TOP-Management-Boni werden abgezogen um die in der Struktur bereits ausbezahlten Boni.

Das ist die wichtigste FitLine/PM-Spezialregel.

Falsch:

```text
managementBonus = groupPoints * ownManagementRate
```

Besser:

```text
managementBonus =
  Summe je Bein/Node:
    max(0, ownManagementRate - alreadyPaidManagementRateBelow)
    * relevantVolume
```

V1-Approximation:

```ts
function calculateApproxManagementBonus(
  snapshot: NetworkSnapshot,
  ownRank: PMRank,
  inputs: PMVolumeInputs,
): number {
  const ownRate = ownRank.managementRate;
  if (ownRate <= 0) return 0;

  const levels = inputs.applyCompression
    ? buildCompressedLevels(snapshot, inputs)
    : snapshot;

  let total = 0;
  for (let level = 0; level < 6; level++) {
    const levelPoints = totalPointsAtLevel(levels, level, inputs);
    const estimatedPaidBelowRate = estimatePaidRateAtLevel(levels, level, inputs);
    const differentialRate = Math.max(0, ownRate - estimatedPaidBelowRate);
    total += levelPoints * inputs.pointToBonusEUR * differentialRate;
  }

  return total;
}
```

Diese V1-Approximation zaehlt MB bewusst als eigenen Differentialanteil zu den TB-Ebenen 1-6, weil die PDF-Tabelle genau `TB + MB` pro Ebene zeigt. Sie ist trotzdem nur eine Naeherung, weil `estimatePaidRateAtLevel` ohne echte Node-Struktur nur aus Durchschnittsbeinen und geschaetzten Sub-Raengen ableiten kann.

V2 exakt:

```ts
function calculateDifferentialManagementBonus(root: PMNode, config: PMPlanConstants): number {
  let total = 0;

  for (const node of descendants(root)) {
    const ownRate = config.ranks[root.rank].managementRate;
    const paidBelow = node.paidManagementRate ?? 0;
    const differential = Math.max(0, ownRate - paidBelow);
    total += node.personalAndCustomerPoints * config.pointToBonusEUR * differential;
  }

  return total;
}
```

### 6.9 Zusatzleistungen

Zusatzleistungen sollten separat ausgewiesen werden, nicht als Cash-Provision.

| Rangbereich | Monatlicher Zusatzwert aus PDF |
| --- | ---: |
| IMM | 111 EUR Auto |
| VP | 222 EUR Auto |
| EVP | 400 EUR Auto |
| P | 500 EUR Auto |
| SP / GP | 1.000 EUR Auto |
| PP | 1.000 EUR Auto |
| CL | 2.000 EUR Auto |

Beispiel IMM nennt zusaetzlich:

- 12,50 EUR Altersvorsorge monatlich
- 900 EUR Reise-Incentive jaehrlich
- 2.500 EUR IMM Training einmalig

Code:

```ts
type PMBenefits = {
  monthlyEUR: number;
  annualEUR: number;
  oneTimeEUR: number;
};
```

### 6.10 Gesamt

```text
cashEUR =
  retailProfitEUR
  + customerDirectProgramEUR
  + topSellerBonusEUR
  + firstLineBonusEUR
  + starterTrainingBonusEUR
  + depthBonusEUR
  + managementBonusEUR

displayTotalEUR =
  cashEUR + optionalBenefitsEUR
```

Standard fuer Goals:

```text
goals verwenden cashEUR, nicht benefitsEUR.
```

---

<a id="rangsystem"></a>
## 7. Rang-System und Qualifikation

FitLine/PM verwendet eine Rangtreppe von Teampartner bis Champion's League.

```ts
type PMRankCode =
  | 'TP'
  | 'M'
  | 'SM'
  | 'MM'
  | 'IMM'
  | 'VP'
  | 'EVP'
  | 'P'
  | 'SP'
  | 'GP'
  | 'PP'
  | 'CL';
```

### 7.1 Rangtabelle

| Rang | Code | Punkte-Schwelle | Strukturbedingung | Aktivitaetsbedingung | MB-Satz |
| --- | --- | ---: | --- | --- | ---: |
| Teampartner | TP | Einstieg | keine | keine | 0 % |
| Manager | M | 600 P | keine klare Zusatzbedingung im PDF-Auszug | eigenes 100-P-Abo als konservative Aktivitaetsannahme | 0 % / Retail 30 % |
| Sales Manager | SM | 2.500 P | >= 1 Manager-Bein | aktiv | 2 % |
| Marketing Manager | MM | 5.000 P | >= 2 Manager-Beine | aktiv | 5 % |
| International Marketing Manager | IMM | 10.000 P | >= 3 Manager-Beine | aktiv | 9 % |
| Vice President | VP | 25.000 P | >= 3 SM oder >= 4 SM | aktiv | 12 % / 12,5 % |
| Executive Vice President | EVP | 50.000 P | >= 3 MM oder >= 4 MM | aktiv | 15 % / 15,5 % |
| President's Team | P | 100.000 P | >= 3 IMM oder >= 4 IMM | aktiv | 18 % / 18,5 % |
| Silver President's Team | SP | 200.000 P | >= 3 VP oder >= 4 VP | aktiv | 19 % / 19,5 % |
| Gold President's Team | GP | 400.000 P | >= 3 EVP | aktiv | 20 % |
| Platinum President's Team | PP | 600.000 P | >= 4 EVP | aktiv | 20,5 % |
| Champion's League | CL | 1.000.000 P | >= 5 President's-Team-Beine | aktiv | 21 % |

### 7.2 Rangbestimmung in Code

```ts
type RankRequirement = {
  code: PMRankCode;
  name: string;
  minGroupPoints: number;
  requiredLegRank?: PMRankCode;
  requiredLegCount?: number;
  requiresActiveAutoship?: boolean;
  managementRate: number;
  retailRate: number;
};
```

Beispiel-Konfiguration:

```ts
const PM_RANKS: RankRequirement[] = [
  { code: 'TP', name: 'Teampartner', minGroupPoints: 0, managementRate: 0, retailRate: 0.20 },
  {
    code: 'M',
    name: 'Manager',
    minGroupPoints: 600,
    requiresActiveAutoship: true,
    managementRate: 0, // kein eigener MB-Differentialanteil, nur TB-Basis
    retailRate: 0.30,
  },
  { code: 'SM', name: 'Sales Manager', minGroupPoints: 2500, requiredLegRank: 'M', requiredLegCount: 1, managementRate: 0.02, retailRate: 0.30 },
  { code: 'MM', name: 'Marketing Manager', minGroupPoints: 5000, requiredLegRank: 'M', requiredLegCount: 2, managementRate: 0.05, retailRate: 0.30 },
  { code: 'IMM', name: 'International Marketing Manager', minGroupPoints: 10000, requiredLegRank: 'M', requiredLegCount: 3, managementRate: 0.09, retailRate: 0.30 },
  { code: 'VP', name: 'Vice President', minGroupPoints: 25000, requiredLegRank: 'SM', requiredLegCount: 3, managementRate: 0.12, retailRate: 0.30 },
  { code: 'EVP', name: 'Executive Vice President', minGroupPoints: 50000, requiredLegRank: 'MM', requiredLegCount: 3, managementRate: 0.15, retailRate: 0.30 },
  { code: 'P', name: "President's Team", minGroupPoints: 100000, requiredLegRank: 'IMM', requiredLegCount: 3, managementRate: 0.18, retailRate: 0.30 },
  { code: 'SP', name: "Silver President's Team", minGroupPoints: 200000, requiredLegRank: 'VP', requiredLegCount: 3, managementRate: 0.19, retailRate: 0.30 },
  { code: 'GP', name: "Gold President's Team", minGroupPoints: 400000, requiredLegRank: 'EVP', requiredLegCount: 3, managementRate: 0.20, retailRate: 0.30 },
  { code: 'PP', name: "Platinum President's Team", minGroupPoints: 600000, requiredLegRank: 'EVP', requiredLegCount: 4, managementRate: 0.205, retailRate: 0.30 },
  { code: 'CL', name: "Champion's League", minGroupPoints: 1000000, requiredLegRank: 'P', requiredLegCount: 5, managementRate: 0.21, retailRate: 0.30 },
];
```

Hinweis: Die 4-Bein-Varianten mit 12,5 %, 15,5 %, 18,5 %, 19,5 % koennen als erweiterte Rank-Varianten oder als Bonus-Modifier modelliert werden.

```ts
type RankVariant = {
  baseCode: PMRankCode;
  requiredLegRank: PMRankCode;
  requiredLegCount: number;
  managementRate: number;
};
```

Auswahlregel:

```text
Der hoechste Rang, dessen Punkte-, Aktivitaets- und Bein-Anforderungen erfuellt sind, gewinnt.
Wenn mehrere Varianten desselben Rangs erfuellt sind, gewinnt die Variante mit dem hoechsten Management-Satz.
```

### 7.3 Strukturelle Schaetzung in V1

Wenn die Simulation nur aggregierte Beine kennt, kann sie Rang-Beine schaetzen:

```text
legGroupPoints = gesamtes Gruppenvolumen / Anzahl direkter Beine
legRank = determineRankFromVolumeOnly(legGroupPoints)
qualifiedLegCount = Anzahl Beine mit legRank >= requiredLegRank
```

Das ist fuer Demo-Szenarien okay, aber fuer MB/TMB nicht exakt.

---

<a id="goals"></a>
## 8. Goals-Auswertung

Goals koennen wie bei LifePlus bleiben. Sie sollten standardmaessig auf Cash-Provision rechnen.

### Goal-Arten

| GoalKind | Vergleich pro Monat | Beispiel |
| --- | --- | --- |
| `productsRefinanced` | `cashEUR >= monthlyProductCostEUR` | Produkte refinanziert |
| `monthlyIncome` | `cashEUR >= goal.amountEUR` | 1.000 EUR monatliches Zusatzeinkommen |
| `monthlySurplus` | `cashEUR - monthlyProductCostEUR >= goal.amountEUR` | 500 EUR monatlicher Ueberschuss |
| `yearlySurplus` | Summe ueber 12 Monate | Urlaub / Ruecklage |

### Zusatzleistungen in Goals

FitLine/PM hat geldwerte Zusatzleistungen. Diese sollten transparent getrennt bleiben:

```text
cashEUR = echte monatliche Provisionssumme
benefitsEUR = Auto, Altersvorsorge, Reise, Training
```

Default:

```text
Goals verwenden cashEUR.
```

Optional:

```ts
includeBenefitsInGoals: boolean;
```

---

<a id="realistic-growth"></a>
## 9. Realistic-Growth-Strategien

Die LifePlus-Strategien koennen weiterverwendet werden:

| Strategy | Verhalten |
| --- | --- |
| `none` | Alle Beine wachsen symmetrisch. |
| `dirichlet` | Beine werden pro Jahr zufaellig gewichtet, Summe bleibt zieltreu. |
| `momentum` | Erfolgreiche Beine wachsen im Folgejahr staerker. |
| `lifecycle` | Spaeter: Bein-Persoenlichkeiten mit Ramp/Growth/Plateau/Fade. |

Fuer FitLine/PM ist asymmetrisches Wachstum wichtiger als bei einfachen Plaenen, weil Rang-Beine und Management-Differenzen stark von Struktur abhaengen.

Empfehlung:

- V1: `none` und optional `dirichlet`
- V2: `rankLegBalanceStrategy` ergaenzen, damit hoehere Ränge realistischer modelliert werden

---

<a id="vorlage"></a>
## 10. Vorlage fuer die Code-Umsetzung

Das LifePlus-Architekturprinzip kann bleiben: Firmenneutraler Core plus firmenspezifisches Produktpaket.

### 10.1 Was bleibt identisch

- Wachstumsregeln:
  - `membersPerYear`
  - `shoppersPerYear`
  - `duplicationRate`
  - `attritionRate`
  - `maxDirectMembersPerMember`
  - Year-Offset
- Bein-Modell mit `Leg`
- Goals-Auswertung
- Realistic-Growth-Strategien
- UI-Grundlogik mit Slidern und Ergebnis-Karten

### 10.2 Was FitLine-/PM-spezifisch wird

1. Terminologie:
   - Member -> Teampartner
   - Shopper -> Kunde
   - IP -> Punkte / P
2. Rangliste:
   - TP bis CL
3. Bonusarten:
   - EV, KDP, TVB, EB, EAB, TB, MB
4. Benefits:
   - Auto, Altersvorsorge, Reise, Training
5. Punktwerte:
   - getrennte EUR-Faktoren fuer Retail und Bonus

### 10.3 Produktpaket

```text
packages/product-fitline/
  package.json
  src/constants.ts
  src/ranks.ts
  src/compensation.ts
  src/benefits.ts
  src/plan.ts
  src/index.ts
  tests/fitline-plan.test.ts
```

### 10.4 Konstanten

```ts
export const PM_DEPTH_RATES = [0.05, 0.03, 0.03, 0.03, 0.05, 0.05] as const;

export const PM_BONUSES = {
  ownAutoshipMinPoints: 100,
  firstLineBonusRate: 0.10,
  starterTrainingBonusEUR: 50,
  topSellerBonus: [
    { minPoints: 2500, rate: 0.03 },
    { minPoints: 5000, rate: 0.05 },
  ],
  kdpRateRange: { min: 0.15, max: 0.25 },
} as const;
```

### 10.5 CompensationPlan

```ts
export const fitlinePlan: CompensationPlan<PMVolumeInputs> = {
  id: 'fitline',
  name: 'FitLine / PM-International',
  terminology: {
    memberLabel: 'Teampartner',
    shopperLabel: 'Kunde',
    volumeUnit: 'P',
  },
  defaultInputs: {
    growth: {
      membersPerYear: 2,
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0,
      maxDirectMembersPerMember: 29,
      autoshipAdoptionRate: 1,
      fastStarterRate: 0,
      activePartnerRate: 1,
      rankLegBalanceStrategy: 'symmetric',
    },
    volume: {
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 100,
      personalMonthlyVolume: 100,
      pointToCurrency: 0.51,
      pointToRetailEUR: 0.51,
      pointToBonusEUR: 0.90,
      ownAutoshipPoints: 100,
      partnerAutoshipPoints: 100,
      directRetailCustomerPoints: 0,
      directKdpCustomerPoints: 0,
      personalSalesPoints: 0,
      qualifiedFastStartersPerMonth: 0,
      applyCompression: false,
      compressionThresholdPoints: 100,
    },
    bonusToggles: {
      simulateRetailProfit: true,
      simulateKdp: true,
      simulateTopSellerBonus: true,
      simulateFirstLineBonus: true,
      simulateStarterBonus: true,
      simulateDepthBonus: true,
      simulateManagementBonus: true,
      simulateBenefits: true,
      simulateCompression: false,
    },
  },
  calculateMonth(snapshot, inputs) {
    return calculateFitlineMonthlyCompensation(snapshot, inputs);
  },
};
```

### 10.6 Monatsberechnung

```ts
export function calculateFitlineMonthlyCompensation(
  snapshot: NetworkSnapshot,
  inputs: PMVolumeInputs,
): PMMonthResult {
  const structure = analyzeStructure(snapshot, inputs);
  const rank = determinePMRank(structure);

  const retailProfitEUR = calculateRetailProfit(rank, inputs);
  const customerDirectProgramEUR = calculateKdp(inputs);
  const topSellerBonusEUR = calculateTopSellerBonus(inputs.personalSalesPoints, inputs.pointToBonusEUR);
  const firstLineBonusEUR = calculateFirstLineBonus(snapshot, inputs);
  const starterTrainingBonusEUR = calculateStarterBonus(snapshot, inputs);
  const depthBonusEUR = calculateDepthBonus(snapshot, inputs);
  const managementBonusEUR = calculateManagementBonus(snapshot, rank, inputs);
  const benefits = calculatePMBenefits(rank);

  const cashEUR =
    retailProfitEUR +
    customerDirectProgramEUR +
    topSellerBonusEUR +
    firstLineBonusEUR +
    starterTrainingBonusEUR +
    depthBonusEUR +
    managementBonusEUR;

  return {
    rank,
    cashEUR,
    totalEUR: cashEUR,
    benefits,
    components: {
      retailProfitEUR,
      customerDirectProgramEUR,
      topSellerBonusEUR,
      firstLineBonusEUR,
      starterTrainingBonusEUR,
      depthBonusEUR,
      managementBonusEUR,
    },
  };
}
```

### 10.7 Tests

Mindesttests:

1. Erstlinien-Bonus zahlt 0 ohne eigenes 100-P-Abo.
2. Erstlinien-Bonus zahlt 10 % mit eigenem 100-P-Abo.
3. EAB zahlt 50 EUR je Schnellstarter.
4. TB zahlt 5/3/3/3/5/5 % auf Ebenen 1-6.
5. TVB zahlt 0 %, 3 %, 5 % an den Schwellen.
6. Rang SM wird erst mit 2.500 P und Manager-Bein erreicht.
7. IMM wird erst mit 10.000 P und 3 Manager-Beinen erreicht.
8. Benefits werden separat ausgewiesen und nicht in `cashEUR` eingerechnet.
9. Punkt-zu-EUR-Faktoren sind konfigurierbar.
10. V1-Management-Bonus bleibt nie negativ.
11. `directTeamPartnerBusinessPoints` wird korrekt aus Ebene 1 abgeleitet, sofern kein Override gesetzt ist.
12. Optionaler Compression-Schalter veraendert TB/MB nur, wenn `applyCompression=true`.
13. TB + MB ueberschreitet in Testfaellen nicht die in der PDF-Tabelle erkennbare maximale `TB + MB`-Rate der jeweiligen Rang-/Ebenen-Kombination.
14. Eine Aenderung von `pointToRetailEUR` beeinflusst EV, aber nicht EB/TB/MB.

---

<a id="offene-punkte"></a>
## 11. Offene Punkte fuer Exaktheit

Diese Punkte muessen geklaert werden, wenn der Simulator nicht nur plausibel, sondern abrechnungsnah sein soll:

1. Welcher EUR-Faktor gilt fuer welchen Bonus? PDF-Fussnote und Beispielwerte passen nicht sauber zusammen.
2. Worauf bezieht sich der TOP-Verkaeufer-Bonus exakt: persoenlicher Verkauf, Direktkundenumsatz oder Gesamtvolumen?
3. Wie wird das Kunden Direktprogramm exakt zwischen 15 % und 25 % gestaffelt?
4. Was qualifiziert einen Schnellstarter fuer den 50-EUR-Einarbeitungs-Bonus?
5. Sind Auto, Altersvorsorge und Reisen monatlich neu zu qualifizieren oder nach einmaliger Rangqualifikation?
6. Wie wird TOP-Management oberhalb President's Team exakt komprimiert?
7. Zaehlen Eigenverbrauch, Autoship, Kundenumsatz und Teampartnerumsatz gleich fuer alle Rangschwellen?
8. Wird Management-Bonus auf alle Ebenen oder nur auf bestimmte komprimierte Generationen gezahlt?
9. Gibt es eine fachlich bestaetigte Komprimierung inaktiver Teampartner fuer TB/MB, und falls ja, mit welcher Aktivitaetsschwelle?

---

<a id="glossar"></a>
## 12. Glossar

| Begriff | Bedeutung |
| --- | --- |
| Abo / Autoship | Regelmaessige Bestellung. Eigenes Abo ab 100 P ist fuer Erstlinien-Bonus wichtig. |
| Bein / Leg | Direkter Teampartner plus vollstaendige Downline. |
| CL | Champion's League, hoechste im PDF sichtbare Stufe. |
| EB | Erstlinien-Bonus: 10 % auf Geschaeftsvolumen direkter Teampartner bei eigenem 100-P-Abo. |
| EAB | Einarbeitungs-Bonus: 50 EUR je qualifiziertem Schnellstarter. |
| EV | Einzelhandels-Verdienst, laut PDF 20-40 %. |
| Fluktuation | Anteil der Teampartner/Kunden, der das Netzwerk verlaesst. |
| IMM | International Marketing Manager. Erste Stufe mit sichtbaren Zusatzleistungen im PDF-Beispiel. |
| KDP | Kunden Direktprogramm, laut PDF 15-25 %. |
| Komprimierung | Optionale Modellregel: inaktive Teampartner werden fuer TB/MB uebersprungen, sodass tiefere aktive Struktur naeher heranrueckt. Aus der gelieferten PDF nicht abschliessend belegbar. |
| MB | Management-Bonus, differenziell und abhaengig vom Rang. |
| P / Punkte | FitLine-/PM-Volumeneinheit. PDF-Hinweis: 1 P etwa 0,51 EUR. |
| Rang-Bein | Bein, dessen Wurzel- oder Strukturteampartner einen bestimmten Mindestrang erreicht hat, z. B. Manager-Bein oder SM-Bein. |
| Schnellstarter | Qualifizierter neuer Teampartner, der EAB ausloesen kann. |
| Teampartner | Vertriebspartner, generisch im Code oft `member`. |
| TB | Tiefen-Bonus ueber sechs Ebenen: 5 %, 3 %, 3 %, 3 %, 5 %, 5 %. |
| TVB | TOP-Verkaeufer-Bonus: 3 % ab 2.500 P, 5 % ab 5.000 P. |
| Year-Offset | Neue Teampartner werben erst ab dem Folgejahr selbst. |
