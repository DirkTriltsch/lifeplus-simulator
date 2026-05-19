# Eqology Verguetungsplan - kanonische Simulator-Spezifikation

Dieses Dokument beschreibt die Logik fuer eine Eqology-Simulation: Wachstumsmodell, Datenmodell, Volumenberechnung, Rang-System, Bonusarten und Umsetzung in Code. Es ist als Single Source of Truth gedacht: erst verstaendlich fuer Interessenten, dann praezise genug fuer Entwickler.

Die Bedienlogik kann weitgehend wie bei LifePlus bleiben: Partner pro Jahr, Kunden pro Jahr, Duplikationsrate, Fluktuation, Monatsvolumen und Goals. Intern muss Eqology aber anders rechnen, weil Eqology zwei Baeume verwendet und QV/BV trennt.

## Begriffs-Mapping

Fuer Eqology sollten die LifePlus-Begriffe im UI ersetzt werden:

| Generischer Code-/LifePlus-Begriff | Eqology-Begriff im UI | Hinweis |
| --- | --- | --- |
| Member | Business Partner | Im Code kann `member` als generischer Core-Typ bleiben. |
| Shopper | Kunde | Im Code kann `shopper` als generischer Core-Typ bleiben. |
| IP / Punkte | QV und BV | Eqology trennt Rangvolumen (`QV`) und Bonusvolumen (`BV`). |

Empfehlung:

```ts
const eqologyTerminology = {
  memberLabel: 'Business Partner',
  memberLabelPlural: 'Business Partner',
  shopperLabel: 'Kunde',
  shopperLabelPlural: 'Kunden',
  volumeUnitPrimary: 'QV',
  volumeUnitBonus: 'BV',
};
```

Im Eqology-Fachmodell sollten die Namen `partnersPerYear`, `customersPerYear`, `partnersByLevel` und `customersByLevel` verwendet werden. Ein Adapter kann diese Werte auf die generischen Core-Felder `membersPerYear`, `shoppersPerYear`, `membersByLevel`, `shoppersByLevel` mappen.

---

## Inhalt

1. [Ausgangsfrage](#ausgangsfrage)
2. [Die einfache Story fuer Interessenten](#story)
3. [Zwei Baeume: Sponsorbaum und Platzierungsbaum](#baeume)
4. [Datenmodell](#datenmodell)
5. [Eingangsparameter](#eingangsparameter)
6. [Wachstumslogik](#wachstumslogik)
7. [Numerisches Beispiel ueber 3 Jahre](#beispiel)
8. [Volumen- und Provisionslogik](#provision)
9. [Rangsystem](#rangsystem)
10. [Bonusarten](#bonusarten)
11. [Goals und Ergebnisinterpretation](#goals)
12. [Umsetzung in Code](#code)
13. [Offene Punkte fuer Backoffice-Exaktheit](#offene-punkte)
14. [Glossar](#glossar)

---

<a id="ausgangsfrage"></a>
## 1. Ausgangsfrage

Eqology ist ein Empfehlungs- und Netzwerkmarketing-System. Du gewinnst Kunden, die Produkte konsumieren, und Business Partner, die selbst Kunden und weitere Business Partner gewinnen. Ueber Zeit entsteht aus persoenlicher Aktivitaet, Duplikation und Tiefe ein Netzwerk mit monatlichem Volumen.

Die Simulation beantwortet:

> Wenn jeder aktive Business Partner pro Jahr X neue Business Partner und Y neue Kunden gewinnt, wie entwickelt sich dein Netzwerk ueber 1, 2, ..., 10 Jahre, und welches Einkommenspotenzial entsteht aus Kunden, Teamvolumen und Rang?

Fuer eine Demo ist die wichtigste Botschaft:

- Am Anfang zaehlt persoenliche Aktivitaet: Kunden, erste Business Partner, Startboni.
- Danach zaehlt Duplikation: Business Partner wiederholen dieselben Aktivitaeten.
- Langfristig zaehlen aktive Teams, Tiefe, Team-Balance und Team Commission.
- Eqology belohnt nicht nur ein grosses Bein, sondern mehrere aktive, balancierte Teams.

---

<a id="story"></a>
## 2. Die einfache Story fuer Interessenten

### Detailtiefe 1: Ohne Verguetungsplan-Begriffe

Du startest mit wenigen Kunden und einigen Partnern. Jeder Partner lernt, ebenfalls Kunden und Partner aufzubauen. Dadurch waechst nicht nur deine direkte Linie, sondern es entstehen mehrere Teams.

```text
Du gewinnst pro Jahr:
- 2 neue Business Partner
- 3 neue Kunden

Wenn deine Partner das ebenfalls tun:
Jahr 1: Du baust die erste Ebene.
Jahr 2: Deine ersten Partner bauen ihre erste Ebene.
Jahr 3: Die Partner deiner Partner starten ebenfalls.
```

Der Effekt ist nicht linear. Aus wenigen direkten Kontakten kann ein grosses Netzwerk entstehen, wenn genug Partner duplizieren und Kunden bleiben.

### Detailtiefe 2: Mit Netzwerklogik

Eqology hat zwei Sichten auf dasselbe Netzwerk:

1. **Sponsorbaum:** Wer hat wen persoenlich eingeschrieben?
2. **Platzierungsbaum:** Wo liegt das Volumen fuer Rang und Team Commission?

Fuer den Start ist der Sponsorbaum wichtig:

- persoenliche Kunden
- CAB / MAX CAB
- Mentor Bonus
- FSQ
- erste Business Partner

Fuer langfristiges Einkommen ist der Platzierungsbaum wichtiger:

- aktive Teams
- GQV
- 60 Prozent Regel
- Rangaufstieg
- Team Commission
- Komprimierung ueber aktive Team-Leader-Generationen

### Detailtiefe 3: Fuer Code

Jeder Business Partner braucht zwei Beziehungen:

```ts
type Partner = {
  id: string;
  sponsorId?: string;          // Sponsorbaum: wer hat ihn eingeschrieben?
  placementParentId?: string;  // Platzierungsbaum: wo sitzt er fuer Volumen?
};
```

Damit kann der Simulator die gleiche einfache Bedienlogik wie LifePlus anbieten, intern aber Eqology-spezifisch rechnen.

---

<a id="baeume"></a>
## 3. Zwei Baeume: Sponsorbaum und Platzierungsbaum

### 3.1 Sponsorbaum

Der Sponsorbaum folgt persoenlichen Einschreibungen.

```text
Du
 |
 +-- BP A   (von dir gesponsert)
 |    |
 |    +-- BP B   (von BP A gesponsert)
 |
 +-- BP C   (von dir gesponsert)
```

Verwendet fuer:

- CAB-Zuordnung zum ersten aktiven Business Partner im Sponsorbaum
- MAX CAB
- Mentor Bonus
- Mentor Accelerator
- Leadership Matching Bonus
- 10X und persoenliche Startprogramme

### 3.2 Platzierungsbaum

Der Platzierungsbaum zeigt, wo Volumen fuer Rang und Team Commission liegt. Ein persoenlich gesponserter Business Partner kann fuer 60 Tage in ein bestehendes Team platziert werden.

```text
Du
 |
 +-- Team 1
 |    |
 |    +-- platzierter BP
 |
 +-- Team 2
 |
 +-- Team 3
```

Verwendet fuer:

- GQV je Team
- 60 Prozent Regel
- aktive separate Teams
- Rangaufstieg
- Rank Advancement Bonus
- Team Commission

### 3.3 Diamond-Raenge: kombinierte Logik

Die hohen Diamond-Raenge duerfen nicht auf nur einen Baum reduziert werden. Fachlich sinnvoll ist:

- Die erforderlichen Platinum Presidents werden ueber den Sponsor-/Organisationskontext identifiziert.
- Sie muessen in separaten aktiven Teams im Platzierungsbaum liegen.

Also nicht "nur Sponsorbaum" und nicht "nur Platzierungsbaum", sondern:

```text
Diamond-Bedingung = qualifizierte PP-Struktur + separate aktive Platzierungsteams
```

Diese Formulierung vermeidet Verwechslung mit Mentor/Matching, die klar dem Sponsorbaum folgen.

---

<a id="datenmodell"></a>
## 4. Datenmodell

Die Simulation kennt vier zentrale Entitaeten:

| Generischer Code-Typ | Eqology-Begriff | Was es ist | Modellierung |
| --- | --- | --- | --- |
| User | Du / Business Partner | Mittelpunkt der Simulation. | Root-Partner oder implizit. |
| Member | Business Partner | Kann Kunden und weitere Business Partner einschreiben. | `Partner` oder aggregiert `partnersByLevel`. |
| Shopper | Kunde | Kauft Produkte, verdient aber keine Provision. | `Customer` oder aggregiert `customersByLevel`. |
| Leg | Team / Bein | Direkter Business Partner plus Downline. | `PlacementLeg` mit Partnern, Kunden, QV/BV und Rangstatus. |

### 4.1 Node-basiertes Modell

Fuer eine exakte Eqology-Simulation ist ein echtes Node-Modell ideal:

```ts
type Partner = {
  id: string;
  sponsorId?: string;
  placementParentId?: string;
  enrollmentDate: Date;
  kitType?: KitType;
  historicalRank: Rank;
  mentorAcceleratorActive: boolean;
  maxCabActive: boolean;
};

type Customer = {
  id: string;
  sponsorId: string;
  enrollmentDate: Date;
  subscription: CustomerSubscription;
};

type CustomerSubscription = {
  productId: string;
  startedAt: Date;
  bindingMonths: number;
  expectedLifetimeMonths: number;
  isCabEligible: boolean;
};
```

### 4.2 Aggregiertes Modell fuer Demo und V1

Wenn der Simulator wie LifePlus aggregiert arbeitet:

```ts
type EqologyNetworkSnapshot = {
  partnersByLevel: number[];
  customersByLevel: number[];
  placementLegs: PlacementLeg[];
};

type PlacementLeg = {
  id: string;
  partnersByLevel: number[];
  customersByLevel: number[];
  customerQVByMonth: number;
  customerBVByMonth: number;
  partnerQVByMonth: number;
  partnerBVByMonth: number;
  assumedActiveShare: number;
};
```

Adapter auf generischen Core:

```ts
function toCoreInputs(inputs: EqologySimulatorInputs): SimulatorInputs {
  return {
    membersPerYear: inputs.partnersPerYear,
    shoppersPerYear: inputs.customersPerYear,
    duplicationRate: inputs.duplicationRate,
    attritionRate: inputs.attritionRate,
    maxDirectMembersPerMember: inputs.maxDirectPartnersPerPartner,
  };
}
```

---

<a id="eingangsparameter"></a>
## 5. Eingangsparameter

### 5.1 Wachstums-Parameter

| Parameter | Default-Idee | Bedeutung |
| --- | ---: | --- |
| `partnersPerYear` | 2 | Neue Business Partner pro aktivem Business Partner und Jahr. |
| `customersPerYear` | 3 | Neue Kunden pro aktivem Business Partner und Jahr. |
| `duplicationRate` | 1.0 | Wie stark die Downline dieselbe Aktivitaet dupliziert. |
| `attritionRate` | 0.0 | Allgemeine jaehrliche Ausstiegsrate fuer Business Partner. |
| `maxDirectPartnersPerPartner` | 29 | Maximale direkte Frontline pro Business Partner. |
| `placementStrategy` | `balanced` | Verteilung neuer Partner im Platzierungsbaum. |
| `assumedActiveShare` | 0.7 | Anteil nominaler Partner, der in aggregierter Simulation als aktiv angenommen wird. |

`assumedActiveShare` ist nur fuer aggregierte Simulationen noetig. In einem Node-Modell wird Aktivitaet pro Partner berechnet.

### 5.2 Placement-Strategien

| Strategy | Bedeutung |
| --- | --- |
| `direct` | Jeder persoenlich gesponserte BP wird als neues direktes Team platziert. |
| `balanced` | Neue BPs werden auf mehrere Teams verteilt. Gut fuer die 60 Prozent Regel. |
| `weakLeg` | Neue BPs werden gezielt in das schwachste bestehende Team platziert. |
| `sponsorTreeOnly` | Sponsorbaum und Platzierungsbaum bleiben identisch. |

Eqology braucht diesen Hebel, weil Rangaufstieg nicht nur Gesamtvolumen, sondern balancierte aktive Teams verlangt.

### 5.3 Volumen-Parameter

Eqology trennt QV und BV. Diese Werte sollten nicht linear voneinander abgeleitet werden, ausser als klar markierte Demo-Notloesung ohne Produktdatenbank.

| Parameter | Default-Idee | Bedeutung |
| --- | ---: | --- |
| `customerMonthlyQV` | 150 | Durchschnittliches monatliches Kunden-QV. |
| `customerMonthlyBV` | 30 | Durchschnittliches monatliches Kunden-BV. |
| `partnerMonthlyPQV` | 300 | Eigene/Partner-Aktivitaet pro Monat. |
| `partnerMonthlyBV` | 30 | BV aus Partner-Eigenverbrauch. |
| `unitToCurrency` | 1.0 | BV -> EUR. Laut PDF ca. 1 BV = 1 EUR. |
| `monthlyProductCostEUR` | 100 | Eigene Produktkosten fuer Goals. |
| `customerLifetimeMonths` | 9 | Durchschnittliche Verweildauer eines Abo-Kunden. Mindestens die Bindungsdauer, realistisch eher 8-12 Monate oder mehr. |
| `subscriptionShareOfCustomers` | 0.7 | Anteil der Kunden, der ein CAB-faehiges Abo abschliesst. |
| `achievesMaxCab` | true | Vereinfachter Steuerhebel: BP erreicht MAX CAB nach 30/10-Regel. |
| `firstMonthCustomerBoost` | optional | Alternative zu `achievesMaxCab`: Timing-Multiplikator fuer Neukunden im ersten Monat. |

Warum diese Zusatzparameter wichtig sind:

- Ein Abo-Kunde mit 30 BV fuer 6 Monate erzeugt 180 BV.
- Derselbe Kunde mit 18 Monaten Laufzeit erzeugt 540 BV.
- Einmalkaeufer erzeugen kein wiederkehrendes Abo-BV und loesen normalerweise keinen CAB aus.
- MAX CAB haengt nicht nur von der Jahreszahl der Kunden ab, sondern vom Timing der ersten 30 Tage.

### 5.4 Start- und Kit-Parameter

| Parameter | Default-Idee | Bedeutung |
| --- | --- | --- |
| `startKitType` | `Business` | Kit des simulierten Root-Partners. |
| `recruitedKitMix` | `{ Business: 0.7, Professional: 0.2, Ultimate: 0.1 }` | Verteilung der Kit-Typen bei neu rekrutierten Business Partnern. |
| `simulateCab` | true | CAB/MAX CAB berechnen. |
| `simulatePcc` | true | Personal Customer Commission berechnen. |
| `simulateMentorBonus` | true | Mentor Bonus auf neue Kits berechnen. |
| `simulateTeamCommission` | true | Team Commission berechnen. |
| `simulateRankAdvancement` | true | Rank Advancement Bonus berechnen. |
| `simulateLeadershipMatching` | false fuer V1 | Leadership Matching berechnen. |

`recruitedKitMix` ist wichtig, weil Kit-Typen Mentor Bonus, FSQV und Start-QV beeinflussen.

---

<a id="wachstumslogik"></a>
## 6. Wachstumslogik

Die Wachstumsrechnung kann wie bei LifePlus einmal pro Jahr passieren. Zwischen den Jahresanfaengen bleiben die Netzwerkzahlen stabil; Kunden-Cohorts koennen monatlich altern und auslaufen.

### 6.1 Jahresablauf

```text
JAHR N START:
1) sourceLegs = Snapshot aller bestehenden Teams VOR neuen Direkt-Adds.
   Nur diese bestehenden Business Partner duplizieren in diesem Jahr.

2) Du gewinnst partnersPerYear neue Business Partner.
   Eqology: Sie werden persoenlich von dir gesponsert.

3) placementStrategy entscheidet, wo diese neuen BPs im Platzierungsbaum sitzen.

4) Du gewinnst customersPerYear neue Kunden.
   subscriptionShareOfCustomers teilt sie in Abo-Kunden und Einmalkaeufer.

5) Jeder bestehende aktive Business Partner in sourceLegs gewinnt:
   - partnersPerYear * duplicationRate neue BPs
   - customersPerYear * duplicationRate neue Kunden

6) Neue BPs aus Schritt 5 werden im jeweiligen Sponsor-/Platzierungsbereich verteilt.

7) Fluktuation und Kundenlaufzeit werden angewendet.

8) Monatswerte fuer QV, BV, Aktivitaet, Rang und Bonus werden berechnet.
```

### 6.2 Year-Offset

Wie bei LifePlus:

> Ein in Jahr N neu gewonnener Business Partner wirbt erst ab Jahr N+1.

Das macht die Simulation realistischer, weil neue Partner Einarbeitung und erste Kundenerfahrung brauchen.

### 6.3 Kundenlaufzeit und Abo-Bindung

Eqology-Kunden sind nicht einfach dauerhaft aktive "Shopper". Viele relevante Kunden sind Abo-Kunden mit Bindung, z. B. 6 Monate.

Modell:

```text
activeSubscriptionCustomers(month) =
  Summe aller Abo-Cohorts, deren erwartete Laufzeit noch nicht abgelaufen ist
```

Fuer V1 reicht:

```ts
const customerMonthlyDropRate = 1 / customerLifetimeMonths;
```

Eine bessere spaetere Variante fuehrt echte Cohorts:

```ts
type CustomerCohort = {
  startedMonth: number;
  count: number;
  subscriptionShare: number;
  expectedLifetimeMonths: number;
};
```

### 6.4 Warum Team-Balance bei Eqology wichtig ist

Eqology verwendet ab Team Leader die 60 Prozent Regel:

> Fuer den Rang darf maximal 60 Prozent des erforderlichen QV aus einem einzelnen Team kommen.

Beispiel:

```text
Variante A:
Team 1 = 10 000 QV
Team 2 = 0 QV
Team 3 = 0 QV

Variante B:
Team 1 = 4 000 QV
Team 2 = 3 000 QV
Team 3 = 3 000 QV
```

Beide Varianten haben 10 000 QV. Variante B ist fuer Eqology wertvoller, weil sie aktive separate Teams zeigt und die 60 Prozent Regel besser erfuellt.

---

<a id="beispiel"></a>
## 7. Numerisches Beispiel ueber 3 Jahre

Inputs:

```text
partnersPerYear = 2
customersPerYear = 3
duplicationRate = 1.0
attritionRate = 0
placementStrategy = balanced
```

### Jahr 1

Du gewinnst 2 Business Partner und 3 Kunden. Neue Partner werben noch nicht.

| Level | Business Partner | Kunden |
| ---: | ---: | ---: |
| 0 | 2 | 3 |

Netzwerk: 5 Personen.

### Jahr 2

Du gewinnst wieder 2 Business Partner und 3 Kunden. Die 2 Partner aus Jahr 1 werben jetzt jeweils 2 Business Partner und 3 Kunden.

| Level | Business Partner | Kunden |
| ---: | ---: | ---: |
| 0 | 4 | 6 |
| 1 | 4 | 6 |

Rechnung:

```text
Level 0 BP = 2 alte direkte + 2 neue direkte = 4
Level 1 BP = 2 Jahr-1-BPs * 2 neue BPs = 4
Level 0 Kunden = 3 alte direkte + 3 neue direkte = 6
Level 1 Kunden = 2 Jahr-1-BPs * 3 neue Kunden = 6
```

Netzwerk: 20 Personen.

### Jahr 3

Du gewinnst wieder 2 Business Partner und 3 Kunden. Die Jahr-1- und Jahr-2-Partner duplizieren. Die Partner auf Level 1 aus Jahr 2 erzeugen jetzt Level 2.

| Level | Business Partner | Kunden |
| ---: | ---: | ---: |
| 0 | 6 | 9 |
| 1 | 12 | 18 |
| 2 | 8 | 12 |

Rechnung:

```text
Level 0 BP:
  4 bisherige direkte + 2 neue direkte = 6

Level 1 BP:
  4 bisherige Level-1-BPs
  + 4 neue von den Jahr-1-Direktpartnern
  + 4 neue von den Jahr-2-Direktpartnern
  = 12

Level 2 BP:
  4 bisherige Level-1-BPs aus Jahr 2 * 2 neue BPs
  = 8

Kunden analog mit Faktor 3 statt 2:
Level 0 = 9
Level 1 = 18
Level 2 = 12
```

Netzwerk: 65 Personen.

### Interpretation

Die Demo zeigt den exponentiellen Effekt. Die Eqology-spezifische Berechnung fragt danach:

1. Wie viel QV/BV erzeugen diese Kunden und BPs?
2. Wie viele Kunden sind Abo-Kunden und wie lange bleiben sie?
3. Wie verteilt sich Volumen auf Teams?
4. Welche Teams sind aktiv?
5. Welcher Rang entsteht?
6. Welche Bonusarten werden freigeschaltet?

---

<a id="provision"></a>
## 8. Volumen- und Provisionslogik

Eqology ist keine einfache Prozent-vom-Gesamtvolumen-Rechnung. Die Simulation sollte in Schichten rechnen.

### 8.1 QV, BV, PQV und GQV

| Begriff | Bedeutung |
| --- | --- |
| QV | Qualifying Volume. Bestimmt Rang. |
| BV | Bonus Volume. Bestimmt Provisionen. |
| PQV | Persoenliches QV: eigene Bestellungen plus persoenliche Kunden. |
| GQV | Gruppen-QV einer Platzierungsgruppe. |

Code:

```ts
type Volume = {
  qv: number;
  bv: number;
};

type MonthlyVolumes = {
  pqv: number;
  personalCustomerQV: number;
  personalCustomerBV: number;
  placementGQVByLeg: Record<string, number>;
  teamCommissionEligibleBV: number;
};
```

### 8.2 Aktivitaet

Ein Business Partner muss monatlich aktiv sein:

```text
Bis President:
  aktiv, wenn 300 PQV ODER 3 aktive PAO/PVO/PAO Kids/Gold Kunden

Ab Gold President:
  aktiv, wenn 600 PQV ODER 6 aktive PAO/PVO/PAO Kids/Gold Kunden
```

Code:

```ts
function isActive(bp: PartnerMonth, rank: Rank): boolean {
  const high = rankAtLeast(rank, 'Gold President');
  if (high) {
    return bp.pqv >= 600 || bp.activePaoLikeCustomers >= 6;
  }
  return bp.pqv >= 300 || bp.activePaoLikeCustomers >= 3;
}
```

In einer aggregierten Simulation muss `assumedActiveShare` verwendet werden, weil nicht jeder nominale Partner automatisch aktiv oder rangfaehig ist.

### 8.3 CAB und MAX CAB

CAB ist ein Startbonus fuer neue Subskriptionskunden.

Regeln:

- CAB wird dem ersten aktiven Business Partner im Sponsorbaum gewaehrt.
- CAB-Produkte haben kein BV.
- Rueckgabe, unbezahlte Bestellung oder nicht beendete Subskription fuehrt zur Rueckgaengigmachung.
- MAX CAB gilt lebenslang, wenn der BP 3 persoenliche Abo-Kunden in den ersten 30 Tagen gewinnt oder insgesamt 10 Kunden erreicht.

Vereinfachte Logik:

```text
Wenn neuer CAB-faehiger Abo-Kunde:
  eligibleSponsor = erster aktiver BP im Sponsorbaum
  amount = eligibleSponsor.maxCabActive ? product.maxCab : product.regularCab
```

### 8.4 PCC

Personal Customer Commission wird auf persoenliches Kunden-BV gezahlt.

| Kunden-BV im Monat | PCC-Satz |
| ---: | ---: |
| 0-200 | 0% |
| 201-1000 | 10% |
| 1001-2500 | 20% |
| 2501+ | 25% |

Formel:

```text
pccBase = max(0, personalCustomerBV - 200)
pcc = pccBase * pccRate
```

BV-Transfer in Team Commission:

| PCC-Level | Anteil Kunden-BV, der in Team Commission geht |
| --- | ---: |
| bis 200 BV | 90% |
| 10% PCC-Level | 80% |
| 20% PCC-Level | 70% |
| 25% PCC-Level | 60% |

Das bedeutet: PCC reduziert das BV, das fuer Uplines in Team Commission laeuft.

### 8.5 Team Commission

Team Commission ist das zentrale langfristige Einkommen.

Regeln:

- Startet ab Team Leader.
- Folgt dem Platzierungsbaum.
- Basiert auf BV.
- Nur aktive Team Leader oder hoeher zaehlen als Generation.
- Aktive BPs unter Team Leader sowie inaktive Partner werden komprimiert.
- Komprimierung passiert vor Anwendung der Rate.
- Bis zu 10 Team-Leader-Generationen.

Beispiel Komprimierung:

```text
Du
 |
 +-- BP ohne TL-Rang
      |
      +-- aktiver Team Leader

Der BP ohne TL-Rang verbraucht keine Generation.
Der aktive Team Leader wird als Generation 1 gezaehlt.
```

Raten:

| TL-Generation | TL | DIR | VP | P | GP | PP | DP | DA | DDA | DDDA |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% |
| 2 | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% |
| 3 | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% |
| 4 | 0% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% |
| 5 | 0% | 0% | 5% | 5% | 5% | 5% | 5% | 5% | 5% | 5% |
| 6 | 0% | 0% | 0% | 5% | 5% | 5% | 5% | 5% | 5% | 5% |
| 7 | 0% | 0% | 0% | 0% | 5% | 5% | 5% | 5% | 5% | 5% |
| 8 | 0% | 0% | 0% | 0% | 0% | 2% | 2% | 2% | 2% | 2% |
| 9 | 0% | 0% | 0% | 0% | 0% | 0% | 2% | 2% | 2% | 2% |
| 10 | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 2% | 2% | 2% |

Algorithmus:

```ts
teamCommission = sum(
  bvByCompressedTLGeneration[g] * teamCommissionRate[activeRank][g]
);
```

---

<a id="rangsystem"></a>
## 9. Rangsystem

### 9.1 Rangtabelle

| Rang | Code | Aktivitaet | GQV | Struktur |
| --- | --- | --- | ---: | --- |
| Business Partner | BP | 300 PQV oder 3 Kunden | - | Einstieg |
| Team Leader | TL | 300 PQV oder 3 Kunden | 2 000 | 60%-Regel, 3 aktive Teams/BPs |
| Director | DIR | 300 PQV oder 3 Kunden | 4 000 | 60%-Regel, 3 aktive Teams/BPs |
| Vice President | VP | 300 PQV oder 3 Kunden | 12 000 | 60%-Regel, 3 aktive Teams/BPs |
| President | P | 300 PQV oder 3 Kunden | 36 000 | 3 aktive Team Leader |
| Gold President | GP | 600 PQV oder 6 Kunden | 90 000 | 3 aktive Directors |
| Platinum President | PP | 600 PQV oder 6 Kunden | 180 000 | 3 aktive Directors |
| Diamond President | DP | 600 PQV oder 6 Kunden | 180 000 | 1 PP in separatem aktivem Team |
| Diamond Ambassador | DA | 600 PQV oder 6 Kunden | 180 000 | 2 PPs in separaten aktiven Teams |
| Double Diamond Ambassador | DDA | 600 PQV oder 6 Kunden | 180 000 | 3 PPs in separaten aktiven Teams |
| Triple Diamond Ambassador | DDDA | 600 PQV oder 6 Kunden | 180 000 | 4 PPs in separaten aktiven Teams |

Hinweis: Die Diamond-Stufen erhoehen die PP-GQV-Schwelle nicht, aber die 180 000 GQV muessen weiterhin erfuellt sein.

### 9.2 Die 60 Prozent Regel

Beginnend mit Team Leader darf maximal 60 Prozent des benoetigten GQV aus einem einzelnen Team kommen.

| Rang | GQV | max. aus einem Team | Rest |
| --- | ---: | ---: | ---: |
| Team Leader | 2 000 | 1 200 | 800 |
| Director | 4 000 | 2 400 | 1 600 |
| Vice President | 12 000 | 7 200 | 4 800 |
| President | 36 000 | 21 600 | 14 400 |
| Gold President | 90 000 | 54 000 | 36 000 |
| Platinum President | 180 000 | 108 000 | 72 000 |

Code:

```ts
function countedGQVWith60Rule(
  pqv: number,
  legGQV: number[],
  requiredGQV: number,
): number {
  const maxPerLeg = requiredGQV * 0.6;
  return pqv + legGQV.reduce((sum, value) => sum + Math.min(value, maxPerLeg), 0);
}
```

### 9.3 Rangalgorithmus

```text
fuer rank in aufsteigender Rangfolge:
  1) Aktivitaet pruefen
  2) GQV-Schwelle pruefen
  3) 60 Prozent Regel pruefen
  4) separate aktive Teams pruefen
  5) erforderliche Downline-Raenge pruefen
  wenn alles erfuellt:
    activeRank = rank
```

In einer aggregierten Simulation koennen separate Teams nur geschaetzt werden. In einem Node-Modell werden sie aus echten Platzierungsbeinen berechnet.

---

<a id="bonusarten"></a>
## 10. Bonusarten

### 10.1 Minimal fuer eine Interessenten-Demo

Diese vier Komponenten reichen, um Netzwerk, Duplikation und Tiefe zu zeigen:

1. Kundenvolumen
2. Business-Partner-Wachstum
3. Rang durch GQV und Team-Balance
4. Team Commission

### 10.2 Sinnvoll fuer eine glaubwuerdige Eqology-Demo

Ergaenzen:

- CAB/MAX CAB fuer Startdynamik
- PCC fuer persoenliche Kundenbasis
- Mentor Bonus fuer neue Kits
- Lifestyle Bonus ab VP
- Rank Advancement Bonus

### 10.3 Spaeter/optional

- FSQ Bonus
- 10X
- Director 60
- Premium Challenge
- Recruitment Contest
- 3 For Free
- Live-Bonus-Auszahlungsstatus

### 10.4 Business Kits

| Kit | Preis EUR | QV | FSQV |
| --- | ---: | ---: | ---: |
| Starter Kit | 250 | 500 | 250 |
| Business Kit | 499 | 1 000 | 500 |
| Professional Kit | 999 | 2 000 | 1 000 |
| Ultimate Kit | 1 299 | 3 000 | 1 100 |
| Health Professional Kit | 1 499 | 3 000 | 1 100 |

### 10.5 FSQ

Fast Start Qualified:

- 30 Tage ab Business-Kit-Kauf.
- 2 000 FSQV.
- 100 EUR Bonus.
- Mentor Accelerator wird aktiviert.

FSQV:

```text
FSQV =
  min(eigene Bestellungen inkl. Kit * 50%, 1100)
  + Kundenbestellungen im Sponsorbaum * 100%
  + BP-Bestellungen im Sponsorbaum * 50%
```

### 10.6 Mentor Bonus

Der Mentor Bonus entsteht, wenn ein neues Business Kit in deinem Sponsorbaum verkauft wird.

Grundlogik:

- Folgt dem Sponsorbaum.
- Wird als Differentialbonus gezahlt.
- Ein aktiver Upline bekommt die Differenz zwischen seinem Tabellenwert und dem hoechsten bereits darunter bezahlten Tabellenwert.
- Mentor Accelerator gilt nur fuer den direkten Sponsor des neuen Business Partners.

Tabellenwerte:

| Kit | BP/TL | Director | VP | President | Gold President | Platinum President | Diamond President |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Starter Kit | 10 | 14 | 24 | 34 | 44 | 44 | 44 |
| Business/Arctic/Vegan Kit | 20 | 28 | 48 | 68 | 88 | 88 | 88 |
| Professional/Vegan/Arctic Kit | 40 | 56 | 96 | 136 | 176 | 176 | 176 |
| Professional mit Accelerator | 80 | 96 | 136 | 176 | 216 | 216 | 216 |
| Ultimate/Health Professional Kit | 46 | 64 | 111 | 157 | 203 | 203 | 203 |
| Ultimate/Health mit Accelerator | 92 | 111 | 157 | 203 | 250 | 250 | 250 |

Korrektes Differential-Beispiel aus der PDF-Logik:

```text
Ein Director im Sponsorbaum sponsert einen neuen BP mit Business Kit.
Director-Tabellenwert: 28 EUR.
Gold-President-Tabellenwert: 88 EUR.

Wenn kein ranghoeherer bezahlter Upline zwischen Director und Gold President liegt:
Gold President erhaelt 88 - 28 = 60 EUR.
```

Falls ein weiterer bezahlter Upline dazwischen liegt, wird gegen den hoechsten darunter bereits bezahlten Tabellenwert differenziert:

```text
Director erhaelt 28 EUR.
VP darueber erhaelt 48 - 28 = 20 EUR.
Gold President darueber erhaelt 88 - 48 = 40 EUR.
```

Algorithmus:

```ts
function calculateMentorBonus(newKit: KitType, sponsorChain: PartnerMonth[]): BonusLine[] {
  let highestPaidValue = 0;
  const payouts: BonusLine[] = [];

  for (const upline of sponsorChain) {
    if (!upline.active) continue;

    const tableValue = mentorValue(newKit, upline.activeRank, {
      accelerator: upline.isDirectSponsor && upline.mentorAcceleratorActive,
    });

    const amount = Math.max(0, tableValue - highestPaidValue);
    if (amount > 0) {
      payouts.push({ partnerId: upline.id, amount, kind: 'mentor' });
      highestPaidValue = tableValue;
    }
  }

  return payouts;
}
```

### 10.7 Rank Advancement

| Rang | Bonus EUR | Auszahlung |
| --- | ---: | --- |
| Team Leader | 100 | 2 Monate |
| Director | 250 | 4 Monate |
| Vice President | 500 | 4 Monate |
| President | 2 500 | 6 Monate |
| Gold President | 5 000 | 6 Monate |
| Platinum President | 7 500 | 6 Monate |
| Diamond President | 15 000 | 12 Monate |
| Diamond Ambassador | 30 000 | 12 Monate |
| Double Diamond Ambassador | 60 000 | 12 Monate |
| Triple Diamond Ambassador | 100 000 | 24 Monate |

Regel: Der Rang muss gehalten werden, damit die Teilzahlungen weiterlaufen.

### 10.8 Lifestyle Bonus

| Rang | EUR/Monat |
| --- | ---: |
| Vice President | 300 |
| President | 600 |
| Gold President | 1 100 |
| Platinum President | 1 100 |
| Diamond President | 1 100 |
| Diamond Ambassador | 1 100 |
| Double Diamond Ambassador | 1 400 |
| Triple Diamond Ambassador | 1 400 |

### 10.9 Leadership Matching Bonus

Startet ab Gold President und folgt dem Sponsorbaum.

| VP-Generation | GP | PP | DP | DA | DDA | DDDA |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 20% | 20% | 20% | 20% | 20% | 20% |
| 2 | 0% | 20% | 20% | 20% | 20% | 20% |
| 3 | 0% | 0% | 15% | 15% | 15% | 15% |
| 4 | 0% | 0% | 0% | 10% | 10% | 10% |
| 5 | 0% | 0% | 0% | 0% | 5% | 5% |
| 6 | 0% | 0% | 0% | 0% | 0% | 2% |

Cap:

- GP, PP, DP: Matching max. 100 Prozent der eigenen Team Commission.
- DA und hoeher: Matching max. 125 Prozent der eigenen Team Commission.

Offener Exaktheitspunkt: Das PDF formuliert die Basis als "BV-Volumen der Team Commission". Fuer eine EUR-Simulation muss entschieden werden, ob auf BV-Basis oder auf ausgezahlte Team Commission gematcht wird.

---

<a id="goals"></a>
## 11. Goals und Ergebnisinterpretation

Goals koennen wie bei LifePlus funktionieren. Sie interpretieren das Ergebnis, veraendern aber die Simulation nicht.

| GoalKind | Vergleich pro Monat | Beispiel |
| --- | --- | --- |
| `productsRefinanced` | `totalEUR >= monthlyProductCostEUR` | Produkte refinanziert |
| `monthlyIncome` | `totalEUR >= goal.amountEUR` | 1 000 EUR/Monat |
| `monthlySurplus` | `totalEUR - monthlyProductCostEUR >= goal.amountEUR` | Produktkosten plus Miete |
| `yearlySurplus` | Jahressumme Ueberschuss | Urlaub, Auto, Investition |

Eqology-spezifische Goals:

| Goal | Bedingung |
| --- | --- |
| `activePartner` | 300/600 PQV oder 3/6 aktive Kunden |
| `teamLeader` | aktiver TL erreicht |
| `rankReached` | bestimmter Eqology-Rang erreicht |
| `balancedTeams` | mindestens 3 aktive Teams |
| `maxCabUnlocked` | MAX CAB erreicht |

---

<a id="code"></a>
## 12. Umsetzung in Code

### 12.1 Was vom LifePlus-Core gleich bleiben kann

- Partner/Kunden pro Jahr
- Duplikationsrate
- Fluktuation
- Year-Offset
- Level-/Leg-Snapshots
- Goals
- Realistic-Growth-Strategien

### 12.2 Eqology-spezifisches Paket

```text
packages/product-eqology/
  src/constants.ts
  src/ranks.ts
  src/compensation.ts
  src/placement.ts
  src/mentor.ts
  src/cab.ts
  src/pcc.ts
  src/plan.ts
  src/index.ts
```

### 12.3 Input-Kontrakt

```ts
type EqologySimulatorInputs = {
  partnersPerYear: number;
  customersPerYear: number;
  duplicationRate: number;
  attritionRate: number;
  maxDirectPartnersPerPartner: number;
  assumedActiveShare: number;

  customerMonthlyQV: number;
  customerMonthlyBV: number;
  partnerMonthlyPQV: number;
  partnerMonthlyBV: number;
  customerLifetimeMonths: number;
  subscriptionShareOfCustomers: number;

  placementStrategy: 'direct' | 'balanced' | 'weakLeg' | 'sponsorTreeOnly';
  startKitType: KitType;
  recruitedKitMix: Partial<Record<KitType, number>>;

  achievesMaxCab: boolean;
  firstMonthCustomerBoost?: number;

  simulateCab: boolean;
  simulatePcc: boolean;
  simulateMentorBonus: boolean;
  simulateTeamCommission: boolean;
  simulateRankAdvancement: boolean;
  simulateLeadershipMatching: boolean;

  unitToCurrency: number;
  monthlyProductCostEUR: number;
};
```

### 12.4 Monatliche Berechnungsreihenfolge

```text
1) Netzwerk-Snapshot erzeugen.
2) Abo-/Einmalkunden-Cohorts aktualisieren.
3) Kunden- und BP-Volumen berechnen.
4) CAB-faehige Erstbestellungen markieren.
5) MAX CAB und FSQ-Status aktualisieren.
6) PQV je Partner berechnen.
7) Aktivitaet je Partner berechnen oder per assumedActiveShare schaetzen.
8) PCC berechnen und Team-Commission-BV reduzieren.
9) GQV je Platzierungsbein berechnen.
10) aktiven Rang bestimmen.
11) Team Commission mit Komprimierung berechnen.
12) Mentor Bonus fuer neue Kits berechnen.
13) Leadership Matching berechnen und cappen.
14) Rank Advancement und Lifestyle Bonus berechnen.
15) Goals auswerten.
```

### 12.5 Kernfunktion

```ts
function calculateEqologyMonth(
  snapshot: EqologyNetworkSnapshot,
  inputs: EqologySimulatorInputs,
): EqologyMonthResult {
  const volumes = calculateVolumes(snapshot, inputs);
  const pcc = inputs.simulatePcc
    ? calculatePcc(volumes.personalCustomerBV)
    : { amount: 0, level: 'none' };
  const eligibleBV = calculateTeamCommissionEligibleBV(volumes, pcc.level);
  const rank = determineEqologyRank(snapshot, volumes, inputs);
  const teamCommission = inputs.simulateTeamCommission
    ? calculateTeamCommission(snapshot, rank, eligibleBV)
    : 0;
  const cab = inputs.simulateCab ? calculateCab(snapshot, inputs) : 0;
  const mentor = inputs.simulateMentorBonus
    ? calculateMentorBonusForMonth(snapshot, rank, inputs)
    : 0;
  const matching = inputs.simulateLeadershipMatching
    ? calculateLeadershipMatching(snapshot, rank, teamCommission)
    : 0;

  return {
    rank,
    cab,
    pcc: pcc.amount,
    mentorBonus: mentor,
    teamCommission,
    leadershipMatching: matching,
    totalEUR: cab + pcc.amount + mentor + teamCommission + matching,
  };
}
```

### 12.6 Minimaler erster Implementierungsumfang

Fuer V1:

1. gleiche Growth-Mechanik wie LifePlus
2. UI-Begriffe Business Partner/Kunden
3. QV/BV als getrennte Volumenwerte
4. Kundenlaufzeit und Abo-Anteil
5. Aktivitaet, GQV, 60 Prozent Regel
6. Ranglogik bis Platinum President
7. Team Commission
8. PCC
9. einfache CAB/MAX-CAB-Simulation

Danach:

- Mentor Differentialbonus
- Rank Advancement
- Lifestyle
- Leadership Matching
- Diamond+ vollstaendig
- Node-basierte Sponsor-/Placement-Baeume

---

<a id="offene-punkte"></a>
## 13. Offene Punkte fuer Backoffice-Exaktheit

1. Vollstaendige Produktdatenbank mit QV und BV je Produkt/Abo/Pack.
2. CAB-Produktliste gegen aktuelle Backoffice-Produktliste pruefen.
3. Leadership Matching: Basis "BV-Volumen der Team Commission" exakt klaeren.
4. Premium Challenge: klaeren, ob Schwellen kumulieren oder nur die hoechste aktive Schwelle zahlt.
5. Diamond+-Rangbedingungen gegen Original/Backoffice validieren.
6. Aktivitaetskunden: fuer Aktivitaet eng mit PAO/PVO/PAO Kids/Gold rechnen, sofern keine aktuelle Eqology-Regel weitere Produkte einbezieht.
7. Platzierung im 60-Tage-Warteraum langfristig als echtes Event modellieren.
8. Rueckgaben, unbezahlte Bestellungen und Stornos fuer Live-Boni modellieren.

---

<a id="glossar"></a>
## 14. Glossar

| Begriff | Bedeutung |
| --- | --- |
| Business Partner | Eqology-Partner, der Kunden und weitere Partner einschreiben kann. Entspricht im generischen Code oft `Member`. |
| Kunde | Produktkunde ohne eigene Provisionsberechtigung. Entspricht im generischen Code oft `Shopper`. |
| Sponsorbaum | Struktur nach persoenlicher Einschreibung. Wichtig fuer CAB, Mentor, Matching. |
| Platzierungsbaum | Struktur nach Volumenplatzierung. Wichtig fuer Rang und Team Commission. |
| QV | Qualifying Volume. Wird fuer Rangberechnung verwendet. |
| BV | Bonus Volume. Wird fuer Provisionsberechnung verwendet. |
| PQV | Persoenliches QV aus eigenen und persoenlichen Kundenbestellungen. |
| GQV | Gruppen-QV innerhalb einer Platzierungsgruppe. |
| CAB | Customer Acquisition Bonus fuer neue Subskriptionskunden. |
| MAX CAB | Erhoehter CAB-Status nach 3 Kunden in 30 Tagen oder 10 Kunden insgesamt. |
| PCC | Personal Customer Commission auf persoenliches Kunden-BV ueber 200 BV. |
| Mentor Bonus | Differentialbonus auf neue Business Kits im Sponsorbaum. |
| Team Commission | Passive Provision auf BV in Team-Leader-Generationen des Platzierungsbaums. |
| Komprimierung | Nur aktive Team Leader oder hoeher zaehlen als Generation; alles darunter wird zur naechsten qualifizierten Generation weitergereicht. |
| 60 Prozent Regel | Maximal 60 Prozent des benoetigten GQV duerfen aus einem Team kommen. |
| Duplikation | Downline kopiert deine Aktivitaet: Kunden und Partner gewinnen. |
| Year-Offset | Neue Partner werben erst ab dem Folgejahr. |

