# LifePlus Verguetungsplan - Logik und Aufbau

Dieses Dokument beschreibt die vollstaendige Logik hinter der LifePlus-Simulation: Datenmodell, Wachstumsregeln, Provisionsberechnung und Rang-System. Es ist so geschrieben, dass jeder das Modell verstehen und in einer anderen Sprache oder fuer ein anderes Netzwerk neu aufsetzen kann. Strukturen, die fuer **jedes Netzwerk identisch** sind, sind klar getrennt von **LifePlus-spezifischen** Regeln, damit die Vorlage fuer andere Firmen nutzbar bleibt.

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
10. [Vorlage fuer andere Netzwerke](#vorlage)
11. [Glossar](#glossar)

---

<a id="ausgangsfrage"></a>
## 1. Ausgangsfrage: Was simuliert dieser Plan

LifePlus ist ein **Empfehlungs-Netzwerk** (Multi-Level-Direktvertrieb): Du verkaufst Produkte und wirbst weitere Berater (Members), die ihrerseits Produkte verkaufen und neue Members anwerben. Aus deiner persoenlichen Vertriebsleistung und aus der Leistung deines Netzwerks entsteht eine monatliche Provision.

Die Simulation beantwortet die Frage:

> Wenn du jedes Jahr X neue Berater und Y neue Kunden anwirbst und diese sich ebenso vermehren, wie hoch ist deine monatliche Provision in 1, 2, ..., 10 Jahren?

Die Simulation ist deterministisch (Standard-Strategie). Realistische Schwankungen sind ueber separate Realistic-Growth-Strategien zuschaltbar.

---

<a id="datenmodell"></a>
## 2. Das Datenmodell auf einen Blick

Die Simulation kennt vier zentrale Entitaeten:

| Entitaet | Was es ist | Wie es modelliert wird |
| --- | --- | --- |
| **User (Du)** | Mittelpunkt der Simulation. | Implizit: alles, was du tust, ist im Code direkt verankert. |
| **Member** | Berater, der selbst Empfehlungen ausspricht. Kann weitere Members und Shopper werben. | Zaehler pro Ebene (`membersByLevel`) und pro Bein (`Leg.membersByLevel`). |
| **Shopper** | Kunde, der Produkte konsumiert, aber niemanden wirbt. | Zaehler pro Ebene (`shoppersByLevel`) und pro Bein (`Leg.shoppersByLevel`). |
| **Bein (Leg)** | Direkter Member plus seine vollstaendige Downline. Identifiziert durch eine Wurzel auf Level 0. | `Leg` mit `membersByLevel`, `shoppersByLevel`, eindeutiger `id`. |

### Sicht: Ebenen und Beine

Das Netzwerk wird in zwei Dimensionen organisiert:

```text
User (Du)
 |
 +-- Bein 1 ----- direkter Member 1 (Level 0)
 |               |
 |               +-- Member auf Level 1 (geworben von Member 1)
 |                   |
 |                   +-- Member auf Level 2
 |
 +-- Bein 2 ----- direkter Member 2 (Level 0)
                 |
                 ...
```

- **Ebene** zaehlt die Tiefe ab dir: Level 0 = direkte Members, Level 1 = deren direkte Members, usw.
- **Bein** ist eine senkrechte Spalte: jeder direkte Member ist die Wurzel eines eigenen Beins. Die Downline dieses Members gehoert zu seinem Bein.

Das Modell fuehrt beide Sichten parallel:
- Aggregat: `membersByLevel: number[]` ueber alle Beine summiert
- Pro Bein: `legs: Leg[]`, jedes mit eigenem `membersByLevel`

Bei der Standard-Strategie bleiben die Beine deterministisch, aber nicht zwingend gleich breit: neue Beine starten frisch ohne rueckwirkende Downline, alte Beine koennen deshalb voller sein. Realistic-Growth-Strategien koennen diese echte Bein-Struktur zusaetzlich asymmetrisch modulieren.

---

<a id="eingangsparameter"></a>
## 3. Eingangsparameter

Diese Parameter steuern die Simulation. Sie sind im Kontrakt `SimulatorInputs` definiert ([packages/simulator-core/src/contracts.ts](../packages/simulator-core/src/contracts.ts)).

### 3.1 Wachstums-Parameter (firmenneutral)

| Parameter | Default | Bedeutung |
| --- | --- | --- |
| `membersPerYear` | 2 | Wie viele neue Members du selbst pro Jahr wirbst. Jeder existierende Member wirbt im Schnitt ebenfalls so viele neue, gewichtet mit `duplicationRate`. |
| `shoppersPerYear` | 3 | Analog fuer Kunden (Shopper). |
| `duplicationRate` | 1.0 (100 %) | Wie aktiv deine Downline ist. 1.0 = jeder Member wirbt genauso viele wie du. 0.5 = nur halb so viele. |
| `attritionRate` | 0.0 | Jaehrliche Austrittsrate fuer Members und Shopper. 0 = niemand verlaesst das Netzwerk. 0.3 = 30 % verlassen pro Jahr. |
| `maxDirectMembersPerMember` | 29 | Wie viele direkte Members ein Member maximal betreut. Ueber diesem Wert kommt nichts mehr dazu. |

### 3.2 Volumen-Parameter

| Parameter | Default | Bedeutung |
| --- | --- | --- |
| `memberMonthlyVolume` | 45 IP | Durchschnittliche monatliche Bestellung eines Members in Plan-Punkten. |
| `shopperMonthlyVolume` | 45 IP | Analog fuer Kunden. |
| `personalMonthlyVolume` | optional | Eigene monatliche Bestellung. Wenn nicht gesetzt, gleich `memberMonthlyVolume`. |
| `unitToCurrency` | 1.0 | Faktor IP -> EUR. Bei LifePlus standardmaessig 1:1. |

### 3.3 Wirtschaftliche Parameter (firmenneutral)

| Parameter | Default | Bedeutung |
| --- | --- | --- |
| `monthlyProductCostEUR` | 100 | Eigenkonsum-Kosten pro Monat (du selbst kaufst monatlich Produkte fuer X EUR). Basis fuer Refinanzierung und Ueberschuss-Ziele. |

---

<a id="wachstumslogik"></a>
## 4. Wachstumslogik des Netzwerks

Die Wachstumsrechnung passiert einmal pro Jahr (im ersten Monat des Jahres). Zwischen den Jahresanfaengen veraendern sich Members und Shopper nicht.

### 4.1 Reihenfolge im Jahres-Start

```text
JAHR N START:
1) sourceLegs = Snapshot aller Beine VOR den Direkt-Adds dieses Jahres.
   Nur diese werben in diesem Jahr.
2) Du wirbst membersPerYear neue Members (auf Level 0):
     - jeder neue Member ist eine eigene Wurzel = ein neues Bein
     - gebremst durch maxDirectMembersPerMember
3) Du wirbst shoppersPerYear neue Shopper (auf Level 0).
4) Pro Bein in sourceLegs, pro Level: jeder existierende Member wirbt
     - membersPerYear * duplicationRate neue Members eine Ebene tiefer
     - shoppersPerYear * duplicationRate neue Shopper eine Ebene tiefer
   wobei jedes werbende Bein die Werbungen in seinen eigenen Sub-Baum schreibt.
5) Fluktuation:
   - attritionRate * bestehende Shopper verlassen das Netzwerk.
   - attritionRate * Members verlassen das Netzwerk, ausser auf Level 0
   (Bein-Wurzeln sind geschuetzt, sonst loest sich das Bein auf). Vakanzen
   werden durch Compression aus Children aufgefuellt, aber nicht ueber den Cap.
6) Snapshot zaehlt Members/Shopper pro Ebene und pro Bein.
```

### 4.2 Die zentrale Regel: Year-Offset

> Ein in Jahr N neu geworbener Member wirbt erst ab Jahr N+1.

Das hat zwei Konsequenzen:
- In Jahr 1 sieht jedes neue Bein nur seinen Wurzel-Member; keine tieferen Ebenen.
- In Jahr 2 hat ein Jahr-1-Bein bereits Tiefe (Wurzel + Sub-Members aus Jahr-2-Recruiting), waehrend ein Jahr-2-Bein noch keine Tiefe hat.

Das spiegelt die Realitaet wider: ein gerade geworbener Member braucht eine Einarbeitungszeit, bevor er selbst Empfehlungen ausspricht.

### 4.3 Membergrenze pro Sponsor

`maxDirectMembersPerMember` (Default 29) gilt sowohl fuer dich als auch fuer jeden Member in deiner Downline. Sobald ein Member die maximale Frontline-Groesse erreicht hat, hoert er auf zu werben.

### 4.4 Fluktuation

- **Members:** `attritionRate` wirkt einmal pro Jahr auf alle Member-Counts ab Level 1. Level-0-Wurzeln sind geschuetzt - sonst loest sich das Bein auf und verliert seine Identitaet.
- **Compression:** Wenn ein Member auf Level N austritt, rueckt einer seiner Children von Level N+1 nach. Das geschieht pro Bein und nur, solange das Kind ueberhaupt verfuegbar ist.
- **Shopper:** `attritionRate` wirkt einmal pro Jahr auf bestehende Shopper-Counts pro Bein und Ebene. Shopper haben keine Downline, deshalb gibt es keine Compression. Neue Shopper des aktuellen Jahres werden erst nach der Fluktuation angelegt.

### 4.5 Aggregat-Auswertung

Am Ende jedes Monats werden aus den Beinen die Aggregate ueber alle Beine summiert:

```text
membersByLevel[level] = Summe (leg.membersByLevel[level]) ueber alle Beine
shoppersByLevel[level] = Summe (leg.shoppersByLevel[level]) ueber alle Beine
networkSize = Summe (membersByLevel) + Summe (shoppersByLevel)
```

Diese Aggregate sind die Basis fuer die Provisionsberechnung.

---

<a id="numerisches-beispiel"></a>
## 5. Numerisches Beispiel ueber 3 Jahre

Inputs: `membersPerYear=2`, `shoppersPerYear=3`, `duplicationRate=1.0`, `attritionRate=0`, `maxDirectMembersPerMember=29`.

### Jahr 1

- Du wirbst 2 Members und 3 Shopper.
- sourceLegs ist leer (vorher gab es nichts), also keine Sub-Werbung.

| Bein | Members[0] | Shopper[0] |
| --- | --- | --- |
| leg-1 | 1 | 1.5 |
| leg-2 | 1 | 1.5 |

Aggregat: `membersByLevel = [2]`, `shoppersByLevel = [3]`, Netzwerk = 5.

### Jahr 2

- sourceLegs = clone von [leg-1, leg-2].
- Du wirbst 2 neue Members (leg-3, leg-4) und 3 neue Shopper (an die neuen Beine).
- leg-1 und leg-2 (alte Beine) werben je 1 * 2 = 2 neue Members und 1 * 3 = 3 neue Shopper auf Level 1.

| Bein | Members[0] | Members[1] | Shopper[0] | Shopper[1] |
| --- | --- | --- | --- | --- |
| leg-1 | 1 | 2 | 1.5 | 3 |
| leg-2 | 1 | 2 | 1.5 | 3 |
| leg-3 (neu) | 1 | 0 | 1.5 | 0 |
| leg-4 (neu) | 1 | 0 | 1.5 | 0 |

Aggregat: `membersByLevel = [4, 4]`, `shoppersByLevel = [6, 6]`, Netzwerk = 20.

### Jahr 3

- sourceLegs = clone der 4 Beine aus Jahr 2.
- Du wirbst 2 neue Members (leg-5, leg-6) und 3 neue Shopper.
- Pro altem Bein: jeder Member auf jedem Level wirbt `1 * 2 = 2` neue Members eine Ebene tiefer und `1 * 3 = 3` neue Shopper.

leg-1 nach Jahr 3:
- L0: 1, L1: 2 + 1 * 2 = 4? Nein - Members[1] wirbt nicht, dann erst wieder neue auf L2.
- Korrekt: L0 bleibt 1; L1 bleibt 2; L1-Members werben je 2 auf L2 = 4; L0-Member wirbt 2 auf L1, also L1 += 2 = 4.

Detailaufstellung leg-1:
- Members[0] = 1 (unveraendert)
- Members[1] = 2 (alt) + 1 (Wurzel) * 2 (membersPerYear) * 1 (dupRate) = 4
- Members[2] = 2 (alt Level 1 Members) * 2 * 1 = 4
- Shopper[1] = 3 (alt) + 1 * 3 * 1 = 6
- Shopper[2] = 2 * 3 * 1 = 6

Same fuer leg-2, leg-3, leg-4:
- leg-3 in Jahr 3 ist jetzt ein "Jahr-2-Bein" (geworben in Jahr 2) und wirbt nun erstmals:
  - Members[0] = 1, Members[1] = 1 * 2 = 2, Shopper[1] = 1 * 3 = 3

leg-5, leg-6 sind in Jahr 3 frisch und werben nichts:
- Members[0] = 1, Shopper[0] = 1.5

Aggregat-Sicht Jahr 3:
| Level | Members | Shopper |
| --- | --- | --- |
| 0 | 6 | 9 |
| 1 | 4 (von leg-1,leg-2) + 2 (von leg-3,leg-4 jeweils) + 0 (leg-5,leg-6) = **12** | **18** |
| 2 | 4 + 4 + 0 + 0 = **8** | **12** |

Netzwerk: 6 + 12 + 8 + 9 + 18 + 12 = 65.

Die Asymmetrie zwischen alten und neuen Beinen bleibt sichtbar.

---

<a id="provisionsberechnung"></a>
## 6. Volumen- und Provisionsberechnung

Die Provision setzt sich aus drei Phasen zusammen. Volumeneinheit ist IP (Plan-Punkte), die ueber `unitToCurrency` in EUR umgerechnet werden.

### 6.1 AV und QGV

- **AV (Active Volume):** Dein eigenes Aktivitaetsvolumen pro Monat in IP. Aus `personalMonthlyVolume` oder Fallback `memberMonthlyVolume`. Die App hebt den AV automatisch auf den Schwellenwert des aktuellen Rangs, wenn das Modell hoeher qualifiziert.
- **QGV (Qualified Group Volume):** Summe aller Volumina deines gesamten Netzwerks pro Monat:

  ```text
  QGV = totalMembers * memberMonthlyVolume + totalShoppers * shopperMonthlyVolume
  ```

- **QL (Qualifizierte Beine):** Anzahl deiner direkten Members, die als Werber zaehlen. Naehernd: `Math.floor(directLegs)`.

### 6.2 Phase 1 - Direkt-Provisionen

Phase 1 zahlt auf den Umsatz deiner Members und Shopper auf Level 1-3, **abhaengig von den eigenen Qualifikationen je Ebene** ([packages/product-lifeplus/src/constants.ts](../packages/product-lifeplus/src/constants.ts)).

Saetze:

| Ebene | Shop (Shopper-Umsatz) | Referral (erste 150 IP eines Member-Auftrags) | Shop-Discount (>150 IP eines Member-Auftrags) |
| --- | --- | --- | --- |
| Level 1 | 25 % | 5 % | 10 % |
| Level 2 | 10 % | 25 % | 5 % |
| Level 3 | 5 % | 10 % | 5 % |

Qualifikation pro Ebene:

| Ebene | min. AV | min. QL |
| --- | --- | --- |
| Level 1 | 40 IP | 0 |
| Level 2 | 40 IP | 0 |
| Level 3 | 40 IP | 3 |

Formel:

```text
fuer level in 1..3:
  wenn AV >= minAV[level] und QL >= minQL[level]:
    referralAnteil = min(memberOrder, 150)
    shopDiscountAnteil = max(0, memberOrder - 150)
    phase1IP +=
        shopperCount[level] * shopperVolume * shopRate[level]
      + memberCount[level] * referralAnteil * referralRate[level]
      + memberCount[level] * shopDiscountAnteil * shopDiscountRate[level]
```

### 6.3 Phase 2 - Volumen-Bonus

Phase 2 verguetet das **Tiefenvolumen** (alle Members und Shopper ab Ebene 4) mit einem Rang-abhaengigen Satz.

```text
deepVolume = (Summe membersByLevel[i] * memberVolume) +
             (Summe shoppersByLevel[i] * shopperVolume)   fuer i >= 4

phase2IP = deepVolume * phase2Rate
```

Saetze und Schwellen:

| Rang | Rate | min. AV | min. QGV | min. QL |
| --- | --- | --- | --- | --- |
| Bronze | 3 % | 100 IP | 3 000 IP | 3 |
| Silver | 6 % | 100 IP | 6 000 IP | 6 |
| Gold | 9 % | 150 IP | 9 000 IP | 9 |
| Diamond | 12 % | 150 IP | 15 000 IP | 12 |

### 6.4 Phase 3 - Generationen-Bonus

Phase 3 zahlt auf dasselbe Tiefenvolumen einen zusaetzlichen, kumulativen Rang-Satz, der nur erreicht wird, wenn du bereits Diamond bist und Sub-Beine mit eigenen Rang-Anforderungen vorweist.

| Rang | Kumulative Rate | min. QGV | min. Diamond-Beine | min. Bronze-Beine |
| --- | --- | --- | --- | --- |
| 1*Diamond | 3 % | 15 000 IP | 1 | 2 |
| 2*Diamond | 6 % | 20 000 IP | 2 | 1 |
| 3*Diamond | 8 % | 25 000 IP | 3 | 0 |

```text
phase3IP = deepVolume * phase3Rate
```

### 6.5 Gesamt

```text
totalIP = phase1IP + phase2IP + phase3IP
totalEUR = totalIP * unitToCurrency
```

---

<a id="rangsystem"></a>
## 7. Rang-System und Qualifikation

Der Rang wird in zwei Schritten bestimmt ([packages/product-lifeplus/src/ranks.ts](../packages/product-lifeplus/src/ranks.ts)):

1. **Pre-Ranks** (Believer, Builder) - keine Provisions-Rate, nur Marken.
2. **Phase-2-Ranks** (Bronze, Silver, Gold, Diamond) - Phase-2-Rate aktiviert.
3. **Phase-3-Ranks** (1*..3*Diamond) - Phase-3-Rate aktiviert, nur wenn Diamond + Bein-Anforderungen erfuellt.

```text
fuer rank in PRELIM_RANKS:
  wenn AV >= minAV und QGV >= minQGV und QL >= minQL:
    name = rank.name

fuer rank in PHASE2_RANKS:
  wenn AV >= minAV und QGV >= minQGV und QL >= minQL:
    name = rank.name
    phase2Rate = rank.rate

fuer rank in PHASE3_RANKS:
  wenn phase2Rate >= 0.12 (Diamond) und hasVolume und hasLegs:
    name = rank.name
    phase3Rate = rank.cumulativeRate
```

### Strukturelle Schaetzung der Sub-Ranks

Da die Simulation echte direkte Beine (`snapshot.legs`) kennt, wertet die Engine Bronze-/Diamond-Beine pro Leg aus: fuer jedes direkte Bein werden Downline-QGV und dessen qualifizierte Unterbeine berechnet und gegen die Phase-2-Schwellen geprueft. Nur falls keine `legs[]` vorhanden sind, faellt die Engine auf eine Aggregat-Schaetzung zurueck.

---

<a id="goals"></a>
## 8. Goals-Auswertung

Ziele werden nach der Simulation ueber `evaluateGoals(result, goals, inputs)` ausgewertet ([packages/simulator-goals/src/evaluator.ts](../packages/simulator-goals/src/evaluator.ts)). Sie veraendern die Simulation nicht, sondern interpretieren ihre Ergebnisse.

### Goal-Arten

| GoalKind | Vergleich pro Monat | Beispiel |
| --- | --- | --- |
| `productsRefinanced` | `totalEUR >= monthlyProductCostEUR` | "Produkte refinanziert" |
| `monthlyIncome` | `totalEUR >= goal.amountEUR` | "Frei leben (5 000 EUR/Mon)" |
| `monthlySurplus` | `totalEUR - monthlyProductCostEUR >= goal.amountEUR` | "Mietfrei wohnen (1 400 EUR/Mon)" |
| `yearlySurplus` | `Summe ueber 12 Monate (totalEUR - productCost) >= goal.amountEUR` | "Urlaub (2 000 EUR/Jahr)" |

### requiresRefinanced

Ein Goal mit `requiresRefinanced: true` gilt erst dann als erreicht, wenn **beide** Bedingungen ab demselben Monat dauerhaft erfuellt sind:

1. Die eigene Zielbedingung (z. B. `monthlySurplus >= 1400`)
2. `productsRefinanced` ist ebenfalls erfuellt

Dadurch ist "Mietfrei wohnen" nicht nur 1 400 EUR/Mon Provision, sondern auch dass die Eigenkonsum-Kosten gedeckt sind.

---

<a id="realistic-growth"></a>
## 9. Realistic-Growth-Strategien

Standardmaessig ist die Bein-Entwicklung deterministisch und folgt dem Geburtsjahr der Beine. Alte Beine koennen groesser sein als frische Beine, weil neue Members erst im Folgejahr selbst werben. Optional kann eine Strategie aktiviert werden, die diese echte Struktur realistischer streut ([packages/simulator-realistic-growth/](../packages/simulator-realistic-growth/)).

| Strategy | Verhalten |
| --- | --- |
| `none` | Default. Keine zusaetzliche Streuung; Backend liefert die echten Beine 1:1 durch. |
| `dirichlet` | Pro Jahr werden Beine zufaellig gewichtet (zieltreu: Summe pro Ebene bleibt). |
| `momentum` | Hot-Hand: Vorjahres-Erfolg wirkt nach. Ab Jahr 3 wirkt Reversion. |
| `lifecycle` | (Spaeter): Bein-Persoenlichkeiten Driver/Steady/Passive mit Phasen Ramp/Growth/Plateau/Fade. |

Alle Strategien sind seedbar (`createGrowthModulator({ strategy, seed })`) und damit reproduzierbar.

---

<a id="vorlage"></a>
## 10. Vorlage fuer andere Netzwerke

Das Modell ist so aufgeteilt, dass ein anderes Netzwerk (z. B. FitLine, Eqology, Forever Living) ohne neue Architektur abgebildet werden kann.

### Was bleibt identisch (firmenneutral)

- Wachstumsregeln in [packages/simulator-core/src/network.ts](../packages/simulator-core/src/network.ts):
  - membersPerYear, shoppersPerYear, duplicationRate, attritionRate
  - maxDirectMembersPerMember
  - Year-Offset (Mitglieder werben erst im Folgejahr)
  - Cap-Logik, Compression bei Fluktuation
- Bein-Modell mit `Leg`, `legs[]`-Pipeline
- Goals-Auswertung
- Realistic-Growth-Strategien

### Was pro Firma anzupassen ist

1. **Volumeneinheit und Faktoren** (in `defaultInputs`):
   - `memberMonthlyVolume`, `shopperMonthlyVolume`, `unitToCurrency`
   - `monthlyProductCostEUR`
2. **CompensationPlan-Implementierung** in einem eigenen Paket `product-<firma>`:
   - Eine Klasse oder ein Objekt, das `calculateMonth(snapshot, inputs)` implementiert
   - Saetze, Schwellen, Rang-Anforderungen
3. **Rang-Logik** (firmenspezifisch):
   - Pre-, Phase-2-, Phase-3-Rang-Listen
   - Qualifikationsregeln (AV, QGV, QL, Sub-Bein-Anforderungen)
4. **Branding** (`ProductDefinition.brand`, `legal`, `terminology`):
   - Firmenname, Farben, Begriffe ("Members" vs. "Partner", "IP" vs. "Punkte")

### Konkrete Schritte zum Aufsetzen einer neuen Firma

1. Neues Paket `packages/product-<firma>/` mit:
   - `package.json` mit Dependency auf `@mlm/simulator-core`
   - `src/constants.ts` mit Verguetungssaetzen
   - `src/ranks.ts` mit `determineRank(...)` und Schwellen
   - `src/compensation.ts` mit `calculateMonthlyCompensation(snapshot, inputs)`
   - `src/plan.ts` mit der `CompensationPlan`-Implementierung
   - `src/<firma>.ts` (oder `src/index.ts`) mit der `ProductDefinition`
2. Registrierung in [packages/product-registry/src/index.ts](../packages/product-registry/src/index.ts).
3. Default-Inputs in der `ProductDefinition.simulator.defaultInputs` setzen.
4. Tests in `packages/product-<firma>/tests/` analog zu `product-lifeplus`.
5. Vite-Alias und tsconfig-Path in [simulator-app/vite.config.ts](../simulator-app/vite.config.ts) und [tsconfig.json](../tsconfig.json) ergaenzen.

### Mapping: LifePlus -> generisch

| LifePlus-Konzept | Generisches Konzept | Wo angepasst |
| --- | --- | --- |
| IP (Plan-Punkte) | Plan-Einheit, beliebig benannt | `terminology.volumeUnit` |
| Member | Berater, Partner, Vertriebspartner | `terminology.memberLabel` |
| Shopper | Kunde, Direktkunde, Endkonsument | `terminology.shopperLabel` |
| Phase 1 (Direktprovision) | Direkte Provision auf Level 1-3 | Pro Firma: Saetze und Qualifikation |
| Phase 2 (Tiefenbonus ab Bronze) | Volumenbonus ab Mindestrang | Pro Firma: Rang-Stufen und Raten |
| Phase 3 (Generationen ab Diamond) | Bonus auf Sub-Strukturen mit Mindestrang | Optional pro Firma |

---

<a id="glossar"></a>
## 11. Glossar

| Begriff | Bedeutung |
| --- | --- |
| **AV** | Active Volume - dein eigenes Aktivitaetsvolumen pro Monat in IP. |
| **Bein (Leg)** | Direkter Member plus seine vollstaendige Downline. Wurzel auf Level 0. |
| **Compression** | Bei Fluktuation: ein Member rueckt von tieferer Ebene auf, um eine Vakanz zu fuellen. |
| **directLegs** | Anzahl deiner direkten Members = Anzahl Beine. |
| **Duplikation** | Wie aktiv deine Downline ist. `duplicationRate = 1.0` heisst: jeder Member wirbt wie du. |
| **Ebene (Level)** | Tiefe ab dir. Level 0 = direkter Member, Level 1 = dessen direkter Member, usw. |
| **Fluktuation** | Jaehrliche Austrittsrate. |
| **IP** | Plan-Punkt (Volumenseinheit bei LifePlus). |
| **Member** | Berater im Netzwerk. Kauft Produkte und wirbt selbst weiter. |
| **maxDirectMembersPerMember** | Frontline-Grenze. Default 29. |
| **Phase 1/2/3** | LifePlus-Verguetungsphasen. Direkt, Volumen, Generationen. |
| **QGV** | Qualified Group Volume - monatliches Volumen deines gesamten Netzwerks. |
| **QL** | Qualifizierte Beine - Anzahl direkter Members, die als Werber zaehlen. |
| **Refinanziert** | Provision deckt monthlyProductCostEUR. |
| **Shopper** | Kunde. Konsumiert, wirbt aber niemanden. |
| **sourceLegs** | Snapshot aller Beine VOR den Direkt-Adds des aktuellen Jahres. Nur diese werben in diesem Jahr. |
| **Ueberschuss** | Provision minus Eigenkonsum-Kosten. |
| **Year-Offset** | Regel: neue Members werben erst im Folgejahr nach ihrer Anwerbung. |
