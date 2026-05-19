# Konzepte fuer ein realistischeres Wachstumsmodell

> **Ziel:** Mehr "Leben" in die Netzwerksimulation bringen. Aktuell wird Wachstum und Fluktuation sehr gleichmaessig ueber Level bzw. spaeter ueber geschaetzte Beine verteilt. Realistischer waere eine ungleiche Verteilung: Bei 2 Members pro Jahr und 3 Beinen entstehen insgesamt weiter 6 neue Members, aber nicht zwingend `2,2,2`, sondern z. B. `1,2,3`. Erfolgreiche Beine duerfen in der naechsten Runde tendenziell wieder erfolgreicher sein, ab einer gewissen Reifephase soll der Zufall aber wieder mehr Einfluss bekommen.

---

## Inhalt

1. [Ausgangslage im Code](#ausgangslage-im-code)
2. [Begriffe](#begriffe)
3. [Konzept 1 - Zieltreue Zufallsverteilung pro Jahr](#konzept-1---zieltreue-zufallsverteilung-pro-jahr)
4. [Konzept 2 - Momentum-Modell mit Hot-Hand und Reversion](#konzept-2---momentum-modell-mit-hot-hand-und-reversion)
5. [Konzept 3 - Bein-Lebensphasen mit Persoenlichkeitsprofilen](#konzept-3---bein-lebensphasen-mit-persoenlichkeitsprofilen)
6. [Konzept 4 - Realistische Beinansicht nur in der Visualisierung](#konzept-4---realistische-beinansicht-nur-in-der-visualisierung)
7. [Vergleich](#vergleich)
8. [Zielarchitektur](#zielarchitektur)
9. [Zentrale Contracts](#zentrale-contracts)
10. [Pipeline und Modulator-Lebenszyklus](#pipeline-und-modulator-lebenszyklus)
11. [Membergrenze](#membergrenze)
12. [App-Integration](#app-integration)
13. [Teststrategie](#teststrategie)
14. [Empfehlung und Migrationspfad](#empfehlung-und-migrationspfad)

---

## Begriffe

Damit die Architektur eindeutig diskutiert werden kann, werden folgende Begriffe in dieser Datei konsistent verwendet:

| Begriff | Definition |
| --- | --- |
| **Provision (brutto)** | Auszahlungsbetrag aus dem Verguetungsplan pro Monat. Entspricht heute `MonthResult.totalEUR`. |
| **Produktkosten** | Monatlicher Selbstaufwand des Users fuer den Eigenkonsum (z. B. 100 EUR/Monat). Konfiguriert in `SimulatorInputs.monthlyProductCostEUR`. |
| **Refinanziert** | `Provision >= Produktkosten`. Ab diesem Punkt zahlt sich der Eigenkonsum aus. |
| **Monatlicher Ueberschuss** | `Provision - Produktkosten`. Frei verfuegbarer Betrag pro Monat. |
| **Jaehrlicher Ueberschuss** | Summe der monatlichen Ueberschuesse eines Jahres. |
| **Bein (Leg)** | Direkter Member des Users plus dessen vollstaendiger Downline. Im Code als `Leg` modelliert. |
| **Knoten (Node)** | Einzelner Member im Baum. Erst spaeter als `NetworkNode` modelliert. |
| **Strategie** | Konkrete Realistic-Growth-Implementierung (`none`, `dirichlet`, `momentum`, `lifecycle`). |
| **Modulator** | Instanz einer Strategie mit Optionen und Zustand. Implementiert `GrowthModulator`. |

---

## Ausgangslage im Code

Die relevante Wachstumslogik liegt in [packages/simulator-core/src/network.ts](../packages/simulator-core/src/network.ts):

```ts
for (let level = 0; level < sourceMembers.length; level++) {
  const sourceCount = sourceMembers[level];
  if (sourceCount <= 0) continue;

  const newMembers = sourceCount * membersPerYear * duplicationRate;
  const newShoppers = sourceCount * shoppersPerYear * duplicationRate;

  addAtLevel(membersByLevel, level + 1, newMembers);
  memberGrowth += newMembers;
}
```

Das Netzwerk wird aktuell als Aggregat pro Ebene gefuehrt:

```ts
membersByLevel: number[];
shoppersByLevel: number[];
directLegs: number;
```

Beine existieren im Simulationskern noch nicht als eigene Entitaeten. Die Beinansicht in [simulator-app/src/components/NetworkVisualizations.tsx](../simulator-app/src/components/NetworkVisualizations.tsx) erzeugt spaeter nur eine visuelle Schaetzung:

```ts
const weights = [1.12, 1, 0.9, 0.82, 0.74].slice(0, legCount);
```

> **Vorbedingung fuer echte Bein-Dynamik:** Der Simulationskern muss Beine separat fuehren, z. B. als `legs: Leg[]`. Ohne diese Struktur kann man zwar die Visualisierung lebendiger machen, aber keine echte Bein-Historie, Momentum-Logik oder Bein-spezifische Fluktuation berechnen.

---

## Konzept 1 - Zieltreue Zufallsverteilung pro Jahr

### Idee

Die Gesamtmenge pro Jahr bleibt exakt erhalten, wird aber nicht gleichmaessig auf Beine verteilt. Statt `2,2,2` kann bei insgesamt 6 neuen Members z. B. `1,2,3`, `0,3,3` oder `2,1,3` entstehen.

Das ist die einfachste echte Verbesserung: Die Simulation bleibt auf Makroebene stabil, wirkt aber auf Bein-Ebene organischer.

### Mechanik

1. Pro Jahr wird zuerst die Zielmenge berechnet.
2. Jedes Bein bekommt ein Gewicht.
3. Neue Members werden einzeln oder als Ganzzahlpakete gewichtet auf Beine verteilt.
4. Die Summe wird am Ende korrigiert, damit das Jahresziel exakt erreicht wird.

```text
totalNewMembers = membersPerYear * activeLegs
weights         = randomWeightedSplit(activeLegs)
perLeg          = allocateIntegerTotal(totalNewMembers, weights)

Beispiel:
totalNewMembers = 6
weights         = [0.18, 0.34, 0.48]
perLeg          = [1, 2, 3]
```

Eine Dirichlet-Verteilung passt gut, weil sie eine Summe von 100 Prozent erzeugt:

```text
weights = dirichlet(alpha = [1, 1, 1])
```

### Parameter

| Parameter | Wirkung |
| --- | --- |
| `varianceFactor` | Wie stark die Verteilung streut. Niedrig = fast gleich, hoch = stark ungleich. |
| `seed` | Gleiche Eingaben erzeugen gleiche Simulation. Wichtig fuer Vergleichbarkeit. |
| `minLegShare` | Optionaler Mindestanteil, damit kleine Beine nicht zu oft komplett leer ausgehen. |

### Fluktuation

Fluktuation kann nach demselben Prinzip verteilt werden:

```text
totalAttrition = expectedAttrition
leavingPerLeg  = allocateIntegerTotal(totalAttrition, attritionWeights)
```

Schwache oder inaktive Beine koennen eine hoehere Austrittswahrscheinlichkeit bekommen. Dadurch entsteht nicht nur ungleiches Wachstum, sondern auch realistischere Erosion.

### Vorteile

- Sehr gut kontrollierbar.
- Jahresziele bleiben exakt erhalten.
- Wenige neue Parameter.
- Gut als erster Schritt geeignet.

### Grenzen

- Kein echtes Gedaechtnis. Ein starkes Bein ist nicht automatisch im Folgejahr wieder stark, ausser man kombiniert dieses Konzept mit Momentum.
- Ohne Bein-Historie wirkt die Streuung eher statistisch als lebendig.

### Aufwand

**Niedrig bis mittel.** Es braucht Leg-Tracking im Kern, aber die Logik selbst bleibt kompakt.

---

## Konzept 2 - Momentum-Modell mit Hot-Hand und Reversion

### Idee

Jedes Bein bekommt einen Performance-Score. Wachstum verteilt sich nicht nur zufaellig, sondern nach einer Mischung aus Grundchance, Vorjahreserfolg und Zufall.

Das bildet die Realitaet gut ab: Ein erfolgreiches Bein hat oft bessere Chancen, wieder erfolgreich zu sein, weil dort Aktivitaet, Fuehrung, soziale Dynamik und Motivation vorhanden sind. Nach einigen Runden darf dieser Vorteil aber nachlassen, damit sich das Blatt wenden kann.

### Mechanik

```text
score_i(year) =
    base
  + momentumStrength * lastGrowth_i
  + randomStrength   * noise_i
  - reversionStrength * dominancePenalty_i

share_i = score_i / sum(scores)
```

Beispiel:

```text
Jahr 1: [1, 2, 3]
Jahr 2: [1, 2, 4]  // Bein 3 profitiert von Momentum
Jahr 3: [3, 2, 1]  // Reversion und Zufall koennen das Bild drehen
```

### Hot-Hand

Ein Bein, das zuletzt mehr neue Members erzeugt hat, bekommt im naechsten Jahr ein hoeheres Gewicht:

```text
momentum_i = decay * momentum_i + lastGrowth_i
```

Damit entsteht Folgeerfolg, ohne dass er garantiert ist.

### Reversion

Sehr dominante Beine bekommen nach einer gewissen Zeit einen Daempfer:

```text
dominancePenalty_i = max(0, share_i - averageShare)
```

Oder zeitlich gesteuert:

```text
if year >= 3:
  score_i -= reversionStrength * dominancePenalty_i
```

Dadurch kann ein starkes Bein weiter wachsen, aber es gewinnt nicht automatisch fuer immer.

### Parameter

| Parameter | Bedeutung | Startwert |
| --- | --- | --- |
| `momentumStrength` | Wie stark Vorjahreserfolg den naechsten Zyklus beeinflusst. | `0.5` bis `0.7` |
| `randomStrength` | Wie stark Zufall gegen bestehende Staerke antritt. | `0.25` bis `0.4` |
| `reversionStrength` | Wie stark Spitzen nach Jahr 3 gedaempft werden. | `0.15` bis `0.3` |
| `momentumDecay` | Wie schnell alte Erfolge verblassen. | `0.5` bis `0.75` |
| `seed` | Reproduzierbarkeit. | Pflicht fuer stabile Szenarien |

### Fluktuation

Fluktuation kann ebenfalls Score-basiert laufen:

```text
attritionRisk_i =
    baseAttrition
  + weakLegPenalty
  - activeLegProtection
```

Ein stark wachsendes Bein verliert anteilig weniger Members, ein stagnierendes Bein verliert mehr. Das wirkt natuerlicher als identische Fluktuation auf allen Beinen.

### Vorteile

- Erfuellt das beschriebene Ziel am besten.
- Gute Balance aus Realismus und Kontrolle.
- Parameter sind verstaendlich.
- Die Simulation bleibt auf Gesamtwerten zieltreu.

### Grenzen

- Braucht echte Bein-Historie.
- Tests muessen mit Seed arbeiten, sonst werden Ergebnisse instabil.
- UI sollte mindestens anzeigen koennen, dass Werte modellierte Szenarien sind.

### Aufwand

**Mittel.** Mehr Struktur im Simulationskern, aber noch kein komplexes Personenmodell.

### Bewertung

**Empfohlen als Hauptansatz.** Konzept 2 ist der beste Trade-off zwischen Realismus, Wartbarkeit und Bedienbarkeit.

---

## Konzept 3 - Bein-Lebensphasen mit Persoenlichkeitsprofilen

### Idee

Jedes Bein bekommt ein Profil und eine Lebensphase. Dadurch wird nicht nur die Verteilung zufaelliger, sondern das Netzwerk bekommt eine nachvollziehbare innere Logik.

Beine koennen z. B. als "Driver", "Steady" oder "Passive" starten. Ein Driver waechst schneller, kann aber spaeter ermuenden. Ein Passive-Bein kann lange schwach bleiben, aber mit kleiner Wahrscheinlichkeit ploetzlich anspringen.

### Datenmodell

```ts
interface Leg {
  id: string;
  archetype: 'driver' | 'steady' | 'passive';
  phase: 'ramp' | 'growth' | 'plateau' | 'fade' | 'breakout';
  ageMonths: number;
  membersByLevel: number[];
  shoppersByLevel: number[];
  momentum: number;
  lastGrowth: number;
}
```

### Phasen

| Phase | Typische Dauer | Verhalten |
| --- | --- | --- |
| `ramp` | 0-6 Monate | Suchphase, hohe Streuung. |
| `growth` | 6-24 Monate | Momentum und Profil wirken stark. |
| `plateau` | ab 24 Monate | Wachstum normalisiert sich. |
| `fade` | variabel | Fluktuation steigt, Wachstum sinkt. |
| `breakout` | selten | Ein bisher schwaches Bein wird ploetzlich stark. |

### Archetypen

| Archetyp | Anteil | Verhalten |
| --- | --- | --- |
| `driver` | ca. 10-20 Prozent | Hohe Wachstumschance, hohe Varianz. |
| `steady` | ca. 30-40 Prozent | Solides Wachstum, wenig Drama. |
| `passive` | ca. 40-60 Prozent | Niedrige Aktivitaet, kann aber selten ausbrechen. |

### Beispielverlauf

```text
Bein 1: passive -> ramp -> breakout -> growth
Bein 2: steady  -> growth -> plateau
Bein 3: driver  -> growth -> growth -> fade
```

Das erzeugt eine sehr menschliche Dynamik: Ein fruehes Gewinnerbein kann spaeter nachlassen, ein anderes Bein kann unerwartet aufholen.

### Fluktuation

Fluktuation haengt von Phase und Profil ab:

```text
fade      = hohe Fluktuation
plateau   = mittlere Fluktuation
growth    = niedrigere Fluktuation
breakout  = sehr niedrige Fluktuation
```

Optional kann ein starker Abgang simuliert werden:

```text
keyPersonLeaves = randomChance(legRisk)
```

Dann verliert ein Bein nicht nur gleichmaessig Members, sondern einen strukturell wichtigen Teil seiner Tiefe.

### Vorteile

- Sehr realistisch.
- Erklaerbare Szenarien statt reiner Mathematik.
- Gute Basis fuer spaetere Features wie "bestes Bein", "Risiko-Bein", "Breakout-Bein".

### Grenzen

- Deutlich mehr Code und Tests.
- Mehr Parameter koennen die Bedienung komplizierter machen.
- Die UI sollte die Modellannahmen transparent machen.

### Aufwand

**Hoch.** Das ist eher eine zweite Ausbaustufe, wenn die Simulation bewusst narrativer und analytischer werden soll.

---

## Konzept 4 - Realistische Beinansicht nur in der Visualisierung

### Idee

Wenn der Simulationskern vorerst stabil bleiben soll, kann man zuerst nur die Beinvisualisierung verbessern. Die Gesamtwerte aus `membersByLevel`, `qgv` und `totalEUR` bleiben unveraendert. Nur `buildLegs()` verteilt diese Werte lebendiger.

Das ist kein echtes Modell, aber ein guter Zwischenschritt: Die App wirkt realistischer, ohne die Verguetungsrechnung oder bestehende Tests stark anzufassen.

### Mechanik

Aktuell nutzt die UI feste Gewichte:

```ts
const weights = [1.12, 1, 0.9, 0.82, 0.74].slice(0, legCount);
```

Stattdessen koennte die UI pro Jahr und Bein reproduzierbare Pseudo-Zufallsgewichte erzeugen:

```text
baseWeight_i(year) =
    fixedLegBias_i
  + visualMomentum_i(year)
  + seededNoise(productId, year, legId)
```

Danach werden `qgv`, `totalEUR`, `networkSize` und Level-Werte wie bisher proportional verteilt.

### Parameter

| Parameter | Wirkung |
| --- | --- |
| `visualVariance` | Wie stark Beine optisch auseinanderlaufen. |
| `visualMomentum` | Wie stark ein optisch starkes Bein im naechsten Jahr stark bleibt. |
| `seed` | Stabile Darstellung bei gleichen Eingaben. |

### Vorteile

- Schnell umsetzbar.
- Kein Risiko fuer Kernberechnung.
- Gute UX-Verbesserung fuer Sunburst, Bein-Spalten und Hybrid-Tree.
- Kann spaeter durch echtes Leg-Tracking ersetzt werden.

### Grenzen

- Es ist nur Darstellung, keine echte Simulation.
- Provisionen und Ranglogik bleiben weiterhin vom aggregierten Modell abhaengig.
- Wenn Nutzer einzelne Beine analytisch vergleichen wollen, waere das irrefuehrend, solange es nicht klar als Schaetzung gekennzeichnet ist.

### Aufwand

**Niedrig.** Hauptsaechlich Aenderungen in `NetworkVisualizations.tsx`.

### Bewertung

Gut als kurzfristiger UI-Schritt, aber nicht als endgueltige Loesung fuer realistische Netzwerkdynamik.

---

## Vergleich

| Kriterium | Konzept 1 Zieltreue Zufallsverteilung | Konzept 2 Momentum | Konzept 3 Lifecycle | Konzept 4 Visualisierung |
| --- | --- | --- | --- | --- |
| Implementierungsaufwand | Niedrig bis mittel | Mittel | Hoch | Niedrig |
| Veraendert Kernsimulation | Ja | Ja | Ja | Nein |
| Gesamtziele bleiben erhalten | Ja | Ja | Ja, per Skalierung | Ja, weil nur UI |
| Bein-Historie | Optional | Ja | Ja | Nur visuell |
| Realismus | Mittel | Hoch | Sehr hoch | Mittel |
| Risiko fuer Verguetungslogik | Mittel | Mittel | Hoch | Niedrig |
| Reproduzierbar via Seed | Ja | Ja | Ja | Ja |
| Erfuellt User-Ziel | Teilweise | Vollstaendig | Vollstaendig plus Story | Optisch teilweise |

---

## Zielarchitektur

Die beste Loesung ist eine Pipeline-Architektur mit klar getrennten Paketen. Der reine Kern bleibt deterministisch und testbar. Realistic Growth und Ziele liegen als cross-product Module darueber und gelten fuer alle Firmen gleich.

### Leitprinzipien

- **Core bleibt Mathematik:** keine Ziele, keine UI-Logik, kein nicht reproduzierbarer Zufall.
- **Produkte bleiben firmenspezifisch:** Branding, Defaults und Verguetungsplan, aber keine generische Wachstumslogik.
- **Realistic Growth ist optional:** `strategy: 'none'` muss das heutige Verhalten reproduzieren koennen.
- **Ziele sind Auswertung:** Ziele veraendern die Simulation nicht, sondern interpretieren deren Ergebnisse.
- **Seed statt Zufall:** Jede realistische Strategie muss mit Seed reproduzierbar sein.

### Paketstruktur

```text
packages/
  simulator-core/
    src/
      contracts.ts
      network.ts
      compensation.ts
      simulation.ts
      pipeline.ts

  simulator-realistic-growth/
    src/
      contracts.ts
      index.ts
      rng.ts
      attrition.ts
      strategies/
        none.ts
        dirichlet.ts
        momentum.ts
        lifecycle.ts

  simulator-goals/
    src/
      contracts.ts
      presets.ts
      evaluator.ts
      index.ts

  product-lifeplus/
  product-fitline/
  product-eqology/
  product-registry/

simulator-app/
  src/
    state/
      useSimulation.ts
      useGrowthOptions.ts
      useGoals.ts
    components/
      SettingsDrawer.tsx
      RealisticGrowthPanel.tsx
      GoalsPanel.tsx
      GoalProgressCard.tsx
      NetworkVisualizations.tsx
```

### Datenfluss

```text
UI Inputs
  + Product Defaults
  + Growth Options
  + Goals[]
        |
        v
simulator-realistic-growth
  createGrowthModulator(options)
        |
        v
simulator-core
  runSimulation(product, inputs, months, { growthModulator })
        |
        v
product.plan.calculateMonth()
        |
        v
SimulationResult
  months[]
  years[]
  legs[]
        |
        v
simulator-goals
  evaluateGoals(result, goals)
        |
        v
UI
```

Der Kern kennt nur das Modulator-Interface. Er kennt keine konkrete Strategie wie `momentum` oder `lifecycle`, und er kennt keine Ziele.

---

## Zentrale Contracts

### SimulatorInputs

Die bisherigen flachen Eingaben koennen zunaechst kompatibel bleiben, sollten aber um eine harte Netzwerkregel erweitert werden:

```ts
export interface SimulatorInputs {
  membersPerYear: number;
  shoppersPerYear: number;
  duplicationRate: number;
  attritionRate: number;
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
  personalMonthlyVolume?: number;
  unitToCurrency?: number;

  /** Harte Strukturregel: Wie viele direkte Members kann ein Member maximal betreuen. Default 29. */
  maxDirectMembersPerMember: number;

  /** Monatlicher Eigenkonsum in EUR. Basis fuer Refinanzierung und Ueberschuss. Default 100. */
  monthlyProductCostEUR: number;
}
```

Der Name `maxDirectMembersPerMember` ist absichtlich praeziser als `maxFrontline`: Die Grenze gilt pro Member, nicht nur fuer die persoenliche Frontline des Users.

`monthlyProductCostEUR` gehoert ebenfalls in den Kern, weil sowohl das `productsRefinanced`-Ziel als auch jedes `surplus`-Ziel diese Groesse brauchen. Sie ist firmenunabhaengig, sodass alle Produkte denselben Default sehen koennen.

Spaeter kann diese Struktur weiter normalisiert werden:

```ts
export interface SimulatorInputs {
  recruiting: RecruitingInputs;
  networkRules: NetworkRules;
  volume: VolumeInputs;
}
```

Diese Normalisierung sollte aber nicht der erste Migrationsschritt sein, damit der Umbau klein bleibt.

### Leg

Fuer echte Bein-Dynamik braucht der Kern Beine als eigene Entitaeten:

```ts
export interface Leg {
  id: string;
  membersByLevel: number[];
  shoppersByLevel: number[];
  ageMonths: number;
  momentum: number;
  lastGrowth: number;
  history: LegYearHistory[];
}

export interface LegYearHistory {
  year: number;
  memberGrowth: number;
  memberAttrition: number;
  shopperGrowth: number;
  shopperAttrition: number;
}
```

Wichtig: `Leg` ist bewusst noch kein vollstaendiger Personenbaum. Ein Node-Level-Modell waere exakter, aber fuer die erste Version deutlich groesser. Die Kapazitaetsregel kann zuerst approximiert und spaeter auf echte `NetworkNode`s umgestellt werden.

### GrowthModulator

Das Modulator-Interface sollte flexibler sein als nur `splitNewMembers()`, weil `momentum` und `lifecycle` Zustand pflegen muessen. Der Kern uebergibt strukturierte Kontextobjekte, sodass spaetere Strategien zusaetzliche Felder lesen koennen, ohne dass das Interface gebrochen werden muss.

```ts
export interface GrowthModulator {
  id: string;

  beforeYear?(context: GrowthYearContext): void;

  splitNewMembers(context: GrowthSplitContext): number[];

  splitAttrition(context: GrowthSplitContext): number[];

  afterYear?(context: GrowthYearResultContext): void;
}
```

Die zugehoerigen Kontexte:

```ts
export interface GrowthYearContext {
  year: number;
  legs: ReadonlyArray<Leg>;
  inputs: SimulatorInputs;
}

export interface GrowthSplitContext extends GrowthYearContext {
  /** Gesamtmenge, die auf die Beine verteilt werden soll. */
  total: number;
  /** Aktive Beine in derselben Reihenfolge wie das Ergebnisarray. */
  activeLegs: ReadonlyArray<Leg>;
  /** Vom Core ermittelte freie Direktslots pro aktivem Bein. */
  capacityPerLeg: ReadonlyArray<number>;
}

export interface GrowthYearResultContext extends GrowthYearContext {
  newMembersPerLeg: ReadonlyArray<number>;
  attritionPerLeg: ReadonlyArray<number>;
}
```

Die Strategie lebt im Paket `simulator-realistic-growth`:

```ts
export interface GrowthOptions {
  strategy: 'none' | 'dirichlet' | 'momentum' | 'lifecycle';
  varianceFactor?: number;
  momentumStrength?: number;
  reversionStrength?: number;
  randomStrength?: number;
  momentumDecay?: number;
  seed?: number;
}

export function createGrowthModulator(
  options: GrowthOptions,
): GrowthModulator;
```

`none.ts` sollte als echte Strategie existieren. Das vermeidet Sonderfaelle im Kern und stellt sicher, dass der heutige Output 1:1 reproduzierbar bleibt:

```ts
// strategies/none.ts
export const noneStrategy: GrowthModulator = {
  id: 'none',

  splitNewMembers({ total, activeLegs }) {
    if (activeLegs.length === 0) return [];
    const equal = total / activeLegs.length;
    return activeLegs.map(() => equal);
  },

  splitAttrition({ total, activeLegs }) {
    if (activeLegs.length === 0) return [];
    const equal = total / activeLegs.length;
    return activeLegs.map(() => equal);
  },
};
```

Damit ist die heutige Gleichverteilung nichts anderes als die Strategie `none`. Der Kern muss keine Sonderbehandlung mehr fuer "kein Modulator gesetzt" haben.

### Goals

Ziele sind firmenunabhaengig und werden nach der Simulation ausgewertet. Sie veraendern die Simulation nicht.

#### Zielarten

| `GoalKind` | Definition | Vergleichsgroesse aus `SimulationResult` |
| --- | --- | --- |
| `productsRefinanced` | Provision deckt mindestens die Produktkosten. | `month.totalEUR >= inputs.monthlyProductCostEUR` |
| `monthlyIncome` | Brutto-Provision pro Monat. | `month.totalEUR` |
| `monthlySurplus` | Provision minus Produktkosten pro Monat. | `month.totalEUR - inputs.monthlyProductCostEUR` |
| `yearlySurplus` | Summe der Monatsueberschuesse eines Jahres. | `sum(year.months.map(surplus))` |

`monthlyIncome` und `monthlySurplus` sind bewusst getrennt: Bei 100 EUR Produktkosten ist eine Provision von 1.400 EUR/Monat ein `monthlyIncome` von 1.400, aber ein `monthlySurplus` von 1.300. Fuer Ziele wie "Mietfrei wohnen" zaehlt der Ueberschuss, nicht die Brutto-Provision.

#### Contracts

```ts
export type GoalKind =
  | 'productsRefinanced'
  | 'monthlyIncome'
  | 'monthlySurplus'
  | 'yearlySurplus';

export interface Goal {
  id: string;
  label: string;
  kind: GoalKind;
  amountEUR: number;
  /** Ziel gilt erst als erreicht, wenn auch das productsRefinanced-Ziel erfuellt ist. */
  requiresRefinanced?: boolean;
}

export interface GoalProgress {
  goal: Goal;
  achieved: boolean;
  achievedInMonth?: number;
  achievedInYear?: number;
  currentValueEUR: number;
  percentage: number;        // 0..1+, ungebremst fuer Fortschrittsanzeigen
  blockedByRefinanced?: boolean; // true, wenn nur die Refinanzierungsvoraussetzung fehlt
}

export function evaluateGoals(
  result: SimulationResult,
  goals: Goal[],
  inputs: SimulatorInputs,
): GoalProgress[];
```

#### Default-Ziele

```ts
export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'products-refinanced',
    label: 'Produkte refinanziert',
    kind: 'productsRefinanced',
    amountEUR: 100, // wird im Evaluator durch monthlyProductCostEUR ueberschrieben
  },
  {
    id: 'holiday',
    label: 'Urlaub',
    kind: 'yearlySurplus',
    amountEUR: 2000,
    requiresRefinanced: true,
  },
  {
    id: 'rent-free',
    label: 'Mietfrei wohnen',
    kind: 'monthlySurplus',
    amountEUR: 1400,
    requiresRefinanced: true,
  },
  {
    id: 'car-and-rent',
    label: 'Auto + Miete frei',
    kind: 'monthlySurplus',
    amountEUR: 2500,
    requiresRefinanced: true,
  },
  {
    id: 'free-life',
    label: 'Frei leben',
    kind: 'monthlyIncome',
    amountEUR: 5000,
    requiresRefinanced: true,
  },
];
```

#### Regel `requiresRefinanced`

Ein Ziel mit `requiresRefinanced: true` gilt erst dann als erreicht, wenn **beide** Bedingungen ab demselben Monat dauerhaft erfuellt sind:

1. Die Refinanzierungsbedingung: `month.totalEUR >= inputs.monthlyProductCostEUR`.
2. Die eigene Zielbedingung (z. B. `monthlySurplus >= 1400`).

Der Evaluator merkt sich pro Ziel den ersten Monat, ab dem beide Bedingungen ohne Rueckfall gelten. `blockedByRefinanced` macht in der UI transparent, ob nur noch die Refinanzierung fehlt.

#### Skizze `evaluateGoals`

```ts
export function evaluateGoals(
  result: SimulationResult,
  goals: Goal[],
  inputs: SimulatorInputs,
): GoalProgress[] {
  const cost = inputs.monthlyProductCostEUR;
  const refinancedFromMonth = firstMonthIndexWhere(
    result.months,
    (m) => m.totalEUR >= cost,
  );

  return goals.map((goal) => {
    const series = goalValueSeries(result, goal, cost);
    const firstHit = firstMonthIndexWhere(series, (v) => v >= goal.amountEUR);

    const needsRefin = goal.requiresRefinanced ?? false;
    const effectiveHit = needsRefin
      ? maxIndex(firstHit, refinancedFromMonth)
      : firstHit;

    return buildProgress(goal, series, effectiveHit, refinancedFromMonth);
  });
}
```

Das Modul kennt nur `SimulationResult` + `SimulatorInputs` und ist damit firmen- und strategieunabhaengig.

---

## Pipeline und Modulator-Lebenszyklus

`simulator-core/src/pipeline.ts` definiert die Aufrufreihenfolge. Der Kern bleibt damit der einzige Ort, der die Reihenfolge kennt. Strategien implementieren nur die Hooks.

### Jahreszyklus

```text
fuer jedes Jahr y in 1..N:

  modulator.beforeYear({ year: y, legs, inputs })

  rawGrowth        = computeRawGrowth(legs, inputs)
  capacityPerLeg   = computeFreeDirectSlots(legs, inputs.maxDirectMembersPerMember)
  cappedGrowth     = clampToCapacity(rawGrowth, capacityPerLeg)

  perLegGrowth     = modulator.splitNewMembers({
                       year: y, legs, inputs,
                       total: cappedGrowth,
                       activeLegs: legsWithCapacity,
                       capacityPerLeg,
                     })

  applyGrowth(legs, perLegGrowth)

  rawAttrition     = computeRawAttrition(legs, inputs)
  perLegAttrition  = modulator.splitAttrition({
                       year: y, legs, inputs,
                       total: rawAttrition,
                       activeLegs: legs,
                       capacityPerLeg: legs.map(_ => 0),
                     })

  applyAttrition(legs, perLegAttrition)

  modulator.afterYear({
    year: y, legs, inputs,
    newMembersPerLeg: perLegGrowth,
    attritionPerLeg:  perLegAttrition,
  })
```

### Wer macht was

| Verantwortung | Wo | Begruendung |
| --- | --- | --- |
| Roh-Wachstum (`sourceCount * membersPerYear * duplicationRate`) | Core | Mathematik, deterministisch. |
| Kapazitaetsberechnung (`maxDirectMembersPerMember`) | Core | Strukturregel, gilt fuer alle Strategien. |
| Verteilung des cappedGrowth auf Beine | Modulator | Hier lebt der gewuenschte Realismus. |
| Bein-Historie und Momentum-Status | Modulator | Strategiespezifisch, nicht jeder braucht das. |
| Monatliche Verguetungsrechnung | Product Plan | Firmenspezifisch. |
| Zielauswertung | `simulator-goals` | Interpretation, kein Einfluss auf Berechnung. |

### Reproduzierbarkeit

`createGrowthModulator(options)` initialisiert intern einen seeded PRNG (`simulator-realistic-growth/src/rng.ts`). Solange `seed` und `options` gleich sind, ist die Folge der Zufallszahlen identisch. Tests koennen damit ohne Snapshot-Pruefungen stabile Erwartungen formulieren.

---

## Membergrenze

Die Membergrenze ist keine Realistic-Growth-Regel, sondern eine harte Netzwerkregel des Kerns.

```ts
maxDirectMembersPerMember: 29
```

Vereinfachte erste Wirkung:

```text
rawGrowth       = sourceMembers * membersPerYear * duplicationRate
availableSlots  = estimateAvailableDirectSlots(legs, maxDirectMembersPerMember)
cappedGrowth    = min(rawGrowth, availableSlots)
perLegGrowth    = growthModulator.splitNewMembers(...)
```

Langfristig waere ein echtes Node-Modell genauer:

```ts
export interface NetworkNode {
  id: string;
  legId: string;
  parentId?: string;
  level: number;
  directMemberCount: number;
}
```

Dann kann Wachstum sauber in freie Plaetze verteilt werden. Fuer den ersten Umbau ist das aber optional; Leg-Level plus Kapazitaetsschaetzung ist ein guter Zwischenschritt.

---

## App-Integration

Der App-Layer bleibt duenn und kombiniert nur Module:

```ts
const modulator = createGrowthModulator(growthOptions);

const result = runSimulation(product, inputs, totalMonths, {
  growthModulator: modulator,
});

const goalProgress = evaluateGoals(result, goals);
```

Neue UI-Bereiche:

```text
SettingsDrawer
  - bisherige Basisparameter
  - maxDirectMembersPerMember

RealisticGrowthPanel
  - strategy
  - varianceFactor
  - momentumStrength
  - reversionStrength
  - randomStrength
  - seed

GoalsPanel
  - Ziele aktivieren/deaktivieren
  - Betrage anpassen

GoalProgressCard
  - Zielstatus anzeigen
  - erreicht in Monat/Jahr
```

`NetworkVisualizations.tsx` sollte mittelfristig echte `legs[]` aus dem SimulationResult verwenden. Die heutige Schaetzung in `buildLegs()` kann als Fallback bleiben, solange alte Snapshots noch keine Beine enthalten.

---

## Teststrategie

Die Aufteilung in Pakete erlaubt eine sehr klare Trennung der Testverantwortung. Jedes Paket testet nur seinen eigenen Vertrag.

### `simulator-core`

- **Deterministisch.** Keine Zufallszahlen, keine Strategien. Eingabe `X` ergibt immer Ausgabe `Y`.
- Tests fuer `network.ts`: Kapazitaetsgrenzen, korrekte `legs[]`, korrekte `membersByLevel`.
- Tests fuer `pipeline.ts`: Reihenfolge der Hook-Aufrufe, korrekte Uebergabe der Kontexte.
- Default-Modulator in Tests ist `noneStrategy`, damit Kerntests strategieunabhaengig sind.

### `simulator-realistic-growth`

- Jede Strategie wird **mit Seed** getestet, sodass Ergebnisse reproduzierbar sind.
- `none.ts`: Equivalenz zu altem Verhalten. Snapshot-Vergleich mit Pre-Refactor-Output ist hier sinnvoll.
- `dirichlet.ts`: Eigenschaften statt konkreter Werte. `sum(splitNewMembers) == total`, `min(weights) >= 0`, Streuung waechst mit `varianceFactor`.
- `momentum.ts`: Hot-Hand-Eigenschaft (`lastGrowth_i` korreliert positiv mit `nextGrowth_i`), Reversion ab Jahr 3, Erhaltungssumme.
- `lifecycle.ts`: Verteilung der Archetypen, Phasenwechsel bei Altersschwellen.

### `simulator-goals`

- Reine Funktion auf `SimulationResult` + `SimulatorInputs` + `Goal[]`.
- Tests pro `GoalKind`: korrekte Vergleichsgroesse, korrekter `achievedInMonth`.
- Tests fuer `requiresRefinanced`: Ziel kann nicht vor Refinanzierung erreicht sein, `blockedByRefinanced` wird korrekt gesetzt.
- Idempotenz: Doppelter Aufruf liefert dasselbe Ergebnis.

### `product-*`

- Bleibt wie bisher (Verguetungsrechnung).
- Keine Tests fuer Wachstum oder Ziele in Produktpaketen.

### `simulator-app`

- Integrationstests mit konkretem Seed: "Bei Strategie `momentum`, Seed 42 und Default-Inputs ist Ziel `rent-free` ab Monat X erreicht."
- Snapshot-Tests fuer UI-Komponenten erst nach API-Stabilisierung.

---

## Empfehlung und Migrationspfad

### Strategische Einordnung

- **Kurzfristig (UI-Verbesserung):** Konzept 4 macht die Beinansicht schnell lebendiger, ohne die Berechnung zu riskieren.
- **Solider Hauptweg:** Konzept 2 (Momentum) ist die Zielstrategie. Erfolgreiche Beine haben Folgechancen, ab Jahr 3 wirken Reversion und Zufall wieder staerker.
- **Einfacher Einstieg in echte Simulation:** Konzept 1 (Dirichlet) bricht die Gleichverteilung mit minimaler Mathematik auf und ist ein guter erster echter Test des Modulator-Interfaces.
- **Spaeterer Ausbau:** Konzept 3 (Lifecycle) lohnt sich, wenn die Simulation nicht nur rechnen, sondern Netzwerk-Szenarien erzaehlen soll.

### Pragmatischer Implementierungspfad

Die Schritte sind so geordnet, dass jeder einzelne Schritt **isoliert lieferbar und ruecksetzbar** ist und das bisherige Verhalten nicht stoert.

1. **`simulator-goals` bauen.** Additiv, ohne Aenderung an Kern oder Produkten. Inkl. `monthlyProductCostEUR` in `SimulatorInputs` und Default-Ziel `productsRefinanced`.
2. **`maxDirectMembersPerMember` mit Default `29` in `simulator-core` ergaenzen.** Zuerst nur als Feld, ohne aktive Cap-Logik; danach Cap-Berechnung in `network.ts` aktivieren.
3. **`legs[]` in `NetworkSnapshot` und `SimulationResult` aufnehmen.** Bestehende `membersByLevel` bleiben fuer Kompatibilitaet erhalten; `legs` ist initial nur eine andere Sicht auf denselben Zustand.
4. **`pipeline.ts` und `GrowthModulator` einfuehren, inkl. `noneStrategy`.** Der Kern ruft die Hooks bereits korrekt auf, der Output bleibt aber identisch zum heutigen Verhalten.
5. **`simulator-realistic-growth` mit `dirichlet` als erster echter Strategie.** Erste sichtbare Verteilung `1,2,3` statt `2,2,2`, vollstaendig opt-in.
6. **`momentum` nachziehen** und als empfohlene Default-Strategie fuer "realistisch" anbieten. Hot-Hand und Reversion werden gegen Seed-basierte Tests gehaerten.
7. **UI-Panels fuer Growth und Ziele ergaenzen.** `RealisticGrowthPanel`, `GoalsPanel`, `GoalProgressCard`. `NetworkVisualizations.tsx` nutzt jetzt `legs[]` aus dem Result.
8. **`lifecycle` spaeter** als Premium- bzw. Expertenstrategie implementieren, wenn Persoenlichkeitsprofile als Story-Feature gewuenscht sind.
