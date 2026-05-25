# Konzepte und Umsetzung realistischer Wachstums-Modelle

Diese Doku beschreibt, wie das Projekt asymmetrisches, lebensechtes Netzwerk-Wachstum in der MLM-Simulation modelliert. Sie ist als Vorlage geschrieben: wer eine neue Strategie ergaenzen will, findet hier sowohl die Architektur als auch konkrete Code-Bausteine.

**Annahme:** Dieses Dokument richtet sich an Entwickler und Architekten, die bereits mit dem `simulator-core`-Paket und der `NetworkSnapshot.legs[]`-Struktur vertraut sind. Wer das Datenmodell zuerst verstehen will, liest [lifeplus_business_plan.md Section 2](./lifeplus_business_plan.md) und [Section 4 (Wachstumslogik)](./lifeplus_business_plan.md).

---

## Inhalt

1. [Warum Realistic Growth](#1-warum-realistic-growth)
2. [Architektur auf einen Blick](#2-architektur-auf-einen-blick)
3. [Pipeline und Modulator-Interface](#3-pipeline-und-modulator-interface)
4. [Umgesetzte Strategien](#4-umgesetzte-strategien)
   - [4.1 `none` - Standard-Symmetrie](#41-none---standard-symmetrie)
   - [4.2 `dirichlet` - Zieltreue Zufallsverteilung](#42-dirichlet---zieltreue-zufallsverteilung)
   - [4.3 `momentum` - Hot-Hand mit Reversion](#43-momentum---hot-hand-mit-reversion)
5. [Geplante Strategie: `lifecycle`](#5-geplante-strategie-lifecycle)
6. [Konfigurierbare Features auf einen Blick](#6-konfigurierbare-features-auf-einen-blick)
7. [Vorlage: Neue Strategie aufsetzen](#7-vorlage-neue-strategie-aufsetzen)
8. [Tests und Verifikation](#8-tests-und-verifikation)
9. [Risiken, Fallstricke, offene Fragen](#9-risiken-fallstricke-offene-fragen)
10. [Quellen und Querverweise](#10-quellen-und-querverweise)

---

## 1. Warum Realistic Growth

### Aha-Moment

Die Standard-Simulation behandelt jedes Bein des Users identisch: bei `membersPerYear=2, duplicationRate=1, attritionRate=0` waechst jedes Bein mit derselben Tiefe, dieselben Knotenzahlen, dieselbe Provision. Real arbeitet ein Netzwerk so nicht: ein erfolgreiches Bein zieht weitere Aktivitaet an, ein passives bleibt klein, und ab Jahr 3 kann sich das Blatt drehen.

Realistic-Growth-Strategien brechen diese kuenstliche Symmetrie auf, **ohne die Aggregat-Mathematik des Plans zu veraendern**. Die Gesamtzahl Members und Shopper pro Ebene bleibt deterministisch dieselbe wie ohne Strategie - es aendert sich nur die Verteilung auf die einzelnen Beine.

### Leitprinzip

> Die Slider definieren das Netzwerk. Strategien verteilen das vom Kern berechnete Wachstum auf die Beine. Aggregate bleiben unveraendert.

Das Memory `feedback-network-single-source` in [MEMORY.md](../.claude/projects/c--Coding-LifePlus-Simulator-code/memory/MEMORY.md) ist die normative Quelle: keine kosmetischen Schaetzungen im Frontend, Asymmetrie kommt ausschliesslich aus diesem Paket.

---

## 2. Architektur auf einen Blick

```text
┌────────────────────────────────────────────────────────────────────┐
│                          simulator-app (UI)                        │
│  realityStrategy: 'standard' | 'dirichlet' | 'momentum'            │
└──────────────────────┬─────────────────────────────────────────────┘
                       │ createGrowthModulator({ strategy, seed })
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│              @mlm/simulator-realistic-growth                       │
│  Factory + Strategien (none, dirichlet, momentum, [lifecycle])     │
│  Seeded PRNG (Mulberry32)                                          │
└──────────────────────┬─────────────────────────────────────────────┘
                       │ GrowthModulator interface
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│                    @mlm/simulator-core                             │
│  pipeline.ts        - LegSplitContext, GrowthModulator             │
│  network.ts         - berechnet Aggregate und legs[],              │
│                       ruft modulator.splitLegs(ctx)                │
│  simulation.ts      - runSimulation(product, inputs, opts)         │
└────────────────────────────────────────────────────────────────────┘
```

Drei Pakete spielen zusammen. Die App waehlt die Strategie und reicht den Modulator durch. Der Kern berechnet die Aggregate deterministisch und delegiert ausschliesslich die Bein-Aufteilung an die Strategie.

### Verantwortung der Pakete

| Paket | Verantwortung | Nicht-Verantwortlichkeit |
| --- | --- | --- |
| `simulator-core` | Aggregat-Mathematik, Cap-Logik, Fluktuation, Pipeline-Hooks | Kennt keine konkrete Strategie |
| `simulator-realistic-growth` | Strategien, PRNG, Optionen | Berechnet keine Aggregate, kein Wachstum |
| `simulator-app` | Strategieauswahl, Persistenz, Visualisierung | Kennt keine Strategie-Interna |

---

## 3. Pipeline und Modulator-Interface

### Datenfluss pro Jahr

```text
JAHR N START:
  modulator.beforeYear?(year)
  applyLegShopperAttrition()           ─ Kern
  sourceLegs = cloneLegs(legs)         ─ Snapshot VOR direct-adds
  createDirectLegs(membersPerYear)     ─ Kern: neue Beine als eigene Wurzeln
  distributeAtLevel(directShoppers)    ─ Kern: Shopper auf neue Beine
  duplicateFromSourceLegs()            ─ Kern: alte Beine werben in Sub-Baum
  applyLegMemberAttrition()            ─ Kern
JEDER MONAT:
  snapshotLegs = modulator.splitLegs(ctx)  ─ STRATEGIE-HOOK
  snapshots.push({ ..., legs: snapshotLegs })
JAHR N ENDE (Monat 11):
  modulator.afterYear?(year, snapshotLegs)
```

Der Hook `splitLegs` ist der einzige Pflichthook. `beforeYear` und `afterYear` sind optional und nur fuer Strategien mit Jahres-State sinnvoll.

### `GrowthModulator` (Interface)

Aus [packages/simulator-core/src/pipeline.ts](../packages/simulator-core/src/pipeline.ts):

```ts
export interface LegSplitContext {
  year: number;
  monthIndex: number;
  membersByLevel: number[];
  shoppersByLevel: number[];
  directLegs: number;
  legs?: ReadonlyArray<Leg>;
  inputs: NetworkInputs;
}

export interface GrowthModulator {
  id: string;
  reset?(): void;
  beforeYear?(year: number): void;
  splitLegs(context: LegSplitContext): Leg[];
  afterYear?(year: number, legs: Leg[]): void;
}
```

`reset()` setzt jegliche Strategy-internen Zaehler/Caches zurueck. Der Kern ruft `modulator?.reset?.()` zu Beginn jeder Simulation, damit ein wiederverwendeter Modulator stabil bleibt (siehe Test `ist bei Wiederverwendung desselben Modulators ueber Simulationslaeufe reproduzierbar`).

### `LegSplitContext.legs` - zwei Modi

Eine Strategie kann den Snapshot der echten internen Beine konsumieren (Property `legs`) **oder** ihn aus den Aggregaten neu sampeln. Empfehlung:

- **`legs` vorhanden → benutzen.** Erhalt der Bein-Identitaet (`leg-1` bleibt `leg-1`), Asymmetrie zwischen alten und jungen Beinen bleibt erhalten.
- **`legs` nicht vorhanden → aus Aggregaten neu sampeln.** Nur als Fallback, etwa fuer Unit-Tests des Modulators ohne Kern.

---

## 4. Umgesetzte Strategien

Die drei realisierten Strategien teilen das gleiche Pattern: pro Jahr einen Gewichtsvektor `weights[i]` der Laenge `legCount` bilden, mit `sum(weights) = 1`, und Level 1+ proportional verteilen. Level 0 bleibt symmetrisch (jedes Bein hat genau eine Wurzel).

### 4.1 `none` - Standard-Symmetrie

**Kerngedanke:** Reicht echte interne Beine 1:1 durch oder verteilt Aggregate gleichmaessig auf `legCount` Beine. Output ist deterministisch und identisch zur Standard-Simulation.

**Wann nutzen:** Default. Reproduziert das Verhalten ohne Modulator und ist daher fuer Tests, Vergleichsbaselines und Mathematikpruefungen geeignet.

**Code** ([packages/simulator-realistic-growth/src/strategies/none.ts](../packages/simulator-realistic-growth/src/strategies/none.ts)):

```ts
export function createNoneStrategy(): GrowthModulator {
  return {
    id: 'none',
    splitLegs({ membersByLevel, shoppersByLevel, directLegs, legs }): Leg[] {
      if (legs) {
        return legs.map((leg) => ({
          id: leg.id,
          membersByLevel: [...leg.membersByLevel],
          shoppersByLevel: [...leg.shoppersByLevel],
        }));
      }

      const legCount = Math.round(directLegs);
      if (legCount <= 0) return [];
      const share = 1 / legCount;

      return Array.from({ length: legCount }, (_, i) => ({
        id: `leg-${i + 1}`,
        membersByLevel: membersByLevel.map((v) => v * share),
        shoppersByLevel: shoppersByLevel.map((v) => v * share),
      }));
    },
  };
}
```

**Optionen:** keine. **State:** keiner. **Default-Wahl in der UI:** `realityStrategy === 'standard'` mapped in [App.tsx](../simulator-app/src/App.tsx) auf `growthModulator = undefined`, also kein Modulator-Aufruf - der Kern nutzt direkt `cloneLegs(legs)`.

### 4.2 `dirichlet` - Zieltreue Zufallsverteilung

**Kerngedanke:** Pro Jahr werden die Beine per Dirichlet-aehnlichem Sampling unterschiedlich gewichtet. Die Summe pro Ebene bleibt exakt erhalten; nur die Aufteilung wechselt. Bei `varianceFactor=0` ist die Verteilung gleichmaessig, bei `varianceFactor=1` exponentiell gestreut.

**Wann nutzen:** Wenn Beine sichtbar unterschiedlich gross sein sollen, aber kein Gedaechtnis ueber Jahre noetig ist - jedes Jahr werden die Gewichte neu gewuerfelt (`cacheKey = year:legCount`).

**Mechanik:**

```text
weights = (1 - v)/n  +  v * exponential_i / sum(exponential)
mit exponential_i = -log(rng())
```

- `v=0`: alle Gewichte = `1/n` (Gleichverteilung)
- `v=1`: reine Exponential-Dirichlet-Verteilung
- Werte dazwischen: lineare Interpolation

**Optionen:**

| Option | Typ | Default | Wirkung |
| --- | --- | --- | --- |
| `varianceFactor` | `number 0..1` | `0.4` | Streuung. `0` = Gleichverteilung, `1` = max. Asymmetrie |
| `seed` | `number` | `42` | PRNG-Seed fuer Reproduzierbarkeit |

**Code-Auszug** ([packages/simulator-realistic-growth/src/strategies/dirichlet.ts](../packages/simulator-realistic-growth/src/strategies/dirichlet.ts)):

```ts
export function dirichletWeights(
  n: number,
  varianceFactor: number,
  rng: Rng,
): number[] {
  if (n <= 0) return [];
  if (varianceFactor <= 0) {
    return Array.from({ length: n }, () => 1 / n);
  }

  const v = Math.min(1, varianceFactor);
  const uniformPart = (1 - v) / n;
  const exponential = Array.from({ length: n }, () =>
    -Math.log(Math.max(1e-10, rng.next())),
  );
  const expSum = exponential.reduce((a, b) => a + b, 0) || 1;

  return exponential.map((x) => uniformPart + v * (x / expSum));
}
```

**Eigenschaften:**

- `sum(weights) = 1` (mathematisch exakt durch Konstruktion)
- Alle Gewichte `>= 0`
- Pro Jahr ein neuer Cache, also keine Inter-Year-Korrelation
- Reproduzierbar via Seed

**Beispiel-Output** bei `legCount=4, varianceFactor=0.8, seed=7`: in etwa `[0.18, 0.34, 0.12, 0.36]`. In den Bein-Spalten sieht man entsprechend ungleiche Saeulen.

### 4.3 `momentum` - Hot-Hand mit Reversion

**Kerngedanke:** Beine merken sich ihre Vorjahres-Gewichtung. Ein im Vorjahr starkes Bein wird wahrscheinlich erneut stark (Hot-Hand). Ab Jahr 3 wirkt Mean-Reversion, sodass Spitzenreiter gebremst werden und das Blatt sich drehen kann.

**Wann nutzen:** Wenn das Netzwerk "erzaehlen" soll - Beine mit Geschichte, in denen ein Jahres-Trend ueber mehrere Jahre nachwirkt.

**Formel** ([packages/simulator-realistic-growth/src/strategies/momentum.ts](../packages/simulator-realistic-growth/src/strategies/momentum.ts)):

```text
score_i = base
        + momentumStrength  * lastWeights_i           (Hot-Hand)
        + randomStrength    * noise_i * base          (Zufall)
        - reversionActive   * max(0, prev_i - base)   (Reversion ab Jahr 3)

weights_i = score_i / sum(scores)
mit noise = -log(rng()),  base = 1/n
```

**Optionen:**

| Option | Typ | Default | Wirkung |
| --- | --- | --- | --- |
| `momentumStrength` | `number 0..1` | `0.6` | Wie stark Vorjahreserfolg ins neue Jahr durchschlaegt |
| `randomStrength` | `number 0..1` | `0.3` | Amplitude des Rauschens |
| `reversionStrength` | `number 0..1` | `0.2` | Daempfungsfaktor fuer Spitzen (greift erst ab Jahr 3) |
| `seed` | `number` | `42` | PRNG-Seed |

**State:** `lastWeights[]`, `lastLegCount`, `lastYear`, `rng`. Bei `reset()` werden alle Zaehler zurueckgesetzt; ein wiederverwendeter Modulator liefert dann identische Ergebnisse.

**Verhalten ueber 4 Jahre** (illustrativ, `previous = [0.7, 0.1, 0.1, 0.1]`):

```text
year 2: weights ~ [0.55, 0.15, 0.15, 0.15]   ← Hot-Hand
year 3: weights ~ [0.40, 0.20, 0.20, 0.20]   ← Reversion aktiv
year 4: weights ~ [0.32, 0.23, 0.23, 0.22]   ← Top weiter gedaempft
```

Genau dieses Verhalten ist in den Tests fixiert (`Hot-Hand: bei asymmetrischer Vorgeschichte bleibt das Top-Bein vorn` und `Reversion: ab Jahr 3 sinkt das dominante Bein im Vergleich zu Jahr 2`).

**Trade-offs:**

- **Pro:** Erzaehlt sich von selbst, gut intuitiv erklaerbar, Tests sind direkt aus der Formel ableitbar.
- **Contra:** Kein echtes Bein-Profil - Beine sind nur als Gewichts-Slots modelliert. Wer "Driver" oder "Passive" pro Bein modellieren will, braucht `lifecycle`.

---

## 5. Geplante Strategie: `lifecycle`

> **Status: nicht umgesetzt.** Im Dropdown sichtbar mit Label `Persoenlichkeitsprofile (bald)`, faellt in `createGrowthModulator` aktuell auf `noneStrategy` zurueck. Ziel dieses Abschnitts: ein Entwickler kann diese Strategie in einem Sprint umsetzen.

### Kerngedanke

Jedes Bein bekommt bei seiner Geburt einen **Archetypen** und durchlaeuft **Phasen**. Daraus ergibt sich pro Jahr eine score-basierte Gewichtung wie bei `momentum`, aber statt eines uniformen Score-Modells gibt es klassentypisches Verhalten.

### Datenmodell

```ts
type Archetype = 'driver' | 'steady' | 'passive';
type LifecyclePhase = 'ramp' | 'growth' | 'plateau' | 'fade' | 'breakout';

interface LegProfile {
  legId: string;
  archetype: Archetype;
  phase: LifecyclePhase;
  ageMonths: number;
  lastWeight: number;
}

interface LifecycleState {
  profiles: Map<string, LegProfile>;
  rng: Rng;
}
```

`profiles` wird pro Bein-`id` gefuehrt. Bei neuem Bein: einen Archetypen ziehen (Pareto-Verteilung), Phase `ramp` setzen, `ageMonths = 0`. Bei jedem `afterYear` Alter inkrementieren und ggf. Phasenwechsel pruefen.

### Phasenmodell

```text
ramp     0-6 Monate     hohe Volatilitaet, kleine Knotenzahl
growth   6-24 Monate    Momentum dominiert, Archetyp definiert Wachstumstempo
plateau  ab 24 Monate   Stagnation, kein neues Wachstum
fade     variabel       Knotenzahl sinkt, Fluktuation > Wachstum
breakout selten         Ein passives Bein springt unerwartet an
```

Uebergaenge per Wahrscheinlichkeits-Tabelle pro `(archetype, phase, ageMonths)`. Tabelle gehoert in eine `phaseTransitions.ts`, damit Tuning ohne Codeaenderung machbar bleibt.

### Archetypen-Verteilung

| Archetyp | Anteil (Pareto) | Wachstumsmultiplier | Reversionsneigung |
| --- | --- | --- | --- |
| `driver` | 10-20% | hoch (1.5x) | mittel |
| `steady` | 30-40% | mittel (1.0x) | niedrig |
| `passive` | 40-60% | niedrig (0.3x) | hoch (kann breakouten) |

Verteilung beim Geburts-Zeitpunkt:

```ts
function pickArchetype(rng: Rng): Archetype {
  const r = rng.next();
  if (r < 0.15) return 'driver';
  if (r < 0.50) return 'steady';
  return 'passive';
}
```

### Skizze der `splitLegs`-Logik

```ts
splitLegs({ year, monthIndex, legs }): Leg[] {
  ensureProfiles(state, legs, rng);     // neuen Beinen Archetyp geben

  if (year !== state.lastYear) {
    advancePhases(state, year);          // Phasenwechsel pruefen
    state.lastWeights = computeLifecycleWeights(state);
    state.lastYear = year;
  }

  return legs
    ? redistributeExistingLegs(legs, state.lastWeights)
    : sampleFromAggregates(...);
}
```

`computeLifecycleWeights` ist analog zur Momentum-Score-Formel, ergaenzt um Archetyp-Multiplier und Phasen-Modifikator:

```text
score_i = base
        + archetypeMultiplier(archetype_i)    * lastWeight_i
        + phaseModifier(phase_i, ageMonths_i)
        + randomStrength * noise_i
        - reversionStrength * dominancePenalty
```

### Umsetzungsplan (Aufwand: gross)

| Schritt | Beschreibung |
| --- | --- |
| 1 | Typen `Archetype`, `LifecyclePhase`, `LegProfile` in `contracts.ts` |
| 2 | `pickArchetype`, `advancePhases`, `phaseTransitions`-Tabelle |
| 3 | `computeLifecycleWeights` (analog `computeMomentumWeights`) |
| 4 | `createLifecycleStrategy` mit `reset/beforeYear/splitLegs/afterYear` |
| 5 | Tests: Anteils-Verteilung, Phasenwechsel, Reproduzierbarkeit, Summen-Erhaltung |
| 6 | `createGrowthModulator` schaltet `lifecycle` frei |
| 7 | UI: `disabled` aus dem Dropdown nehmen, optional Archetyp-Badge je Bein |

**Risiken:**

- Profile-State waechst mit Bein-Anzahl. Bei `legCount > 60` muss man die Map-Performance pruefen.
- Phasen-Tabelle ist eine Designentscheidung - sollte gegen Marktdaten kalibriert oder bewusst als Modellannahme dokumentiert werden.
- UI-Ergaenzung "Archetyp pro Bein" sprengt das aktuelle `Leg`-Interface. Empfehlung: optionales `Leg.archetype?: Archetype` in `simulator-core/contracts.ts` und Bein-Spalten zeigen es bei Bedarf an.

---

## 6. Konfigurierbare Features auf einen Blick

### Strategieauswahl (UI)

| Feature | Wo konfiguriert | Wirkung |
| --- | --- | --- |
| Strategie waehlen | `AdvancedSettingsPanel` Dropdown | Welche Modulator-Implementierung greift |
| Seed festsetzen | Aktuell hartkodiert `42` in `App.tsx` | Reproduzierbarkeit |
| Strategie deaktivieren | Dropdown-Option `disabled` | Sichtbar machen, dass Feature kommt |

### Parameter pro Strategie

| Strategie | Parameter | UI-Slot heute |
| --- | --- | --- |
| `none` | keine | - |
| `dirichlet` | `varianceFactor`, `seed` | nicht angebunden (Default `0.4`, `42`) |
| `momentum` | `momentumStrength`, `randomStrength`, `reversionStrength`, `seed` | nicht angebunden (Defaults) |
| `lifecycle` (geplant) | Archetypen-Verteilung, Phasen-Tabelle, Multiplier | nicht angebunden |

**Offen:** Pro-Strategie-Slider sind in der UI noch nicht vorhanden. Wenn das Feature gewuenscht ist, gehoert es in einen aufklappbaren Sub-Bereich des `AdvancedSettingsPanel`.

### Cross-cutting Features

| Feature | Beschreibung |
| --- | --- |
| **Reproduzierbarkeit** | Jede Strategie ist via Seed deterministisch |
| **Reset zwischen Laeufen** | `modulator.reset?.()` wird vom Kern beim Start aufgerufen |
| **Zwei Modi: mit/ohne `legs`** | Strategien koennen mit echten Beinen oder aus Aggregaten arbeiten |
| **Level-0-Symmetrie** | Wurzel jedes Beins bleibt `1`, sonst loest sich Bein-Identitaet auf |
| **Aggregat-Erhaltung** | `sum(weights) = 1` garantiert: Aggregat des Kerns bleibt unveraendert |

---

## 7. Vorlage: Neue Strategie aufsetzen

Diese Anleitung ist getestet, wenn man sie auf `dirichlet` zurueckverfolgt - sie passt fuer jede zukuenftige Strategie.

### Schritt 1: Optionen-Typ definieren

```ts
// packages/simulator-realistic-growth/src/strategies/mystrategy.ts
export interface MyStrategyOptions {
  alpha?: number;
  seed?: number;
}

const DEFAULTS = { alpha: 0.5, seed: 42 };
```

### Schritt 2: Factory + State + `splitLegs`

```ts
export function createMyStrategy(
  options: MyStrategyOptions = {},
): GrowthModulator {
  const alpha = options.alpha ?? DEFAULTS.alpha;
  const seed = options.seed ?? DEFAULTS.seed;

  let rng = createRng(seed);
  let weights: number[] = [];
  let cacheKey = '';

  return {
    id: 'mystrategy',
    reset() {
      rng = createRng(seed);
      weights = [];
      cacheKey = '';
    },
    splitLegs({ membersByLevel, shoppersByLevel, directLegs, year, legs }): Leg[] {
      const legCount = Math.round(directLegs);
      if (legCount <= 0) return [];

      const nextKey = `${year}:${legCount}`;
      if (nextKey !== cacheKey) {
        weights = computeMyWeights(legCount, alpha, rng);
        cacheKey = nextKey;
      }

      if (legs) {
        return redistributeExistingLegs(legs, weights);
      }

      const wurzelShare = 1 / legCount;
      return Array.from({ length: legCount }, (_, i) => ({
        id: `leg-${i + 1}`,
        membersByLevel: membersByLevel.map((v, level) =>
          level === 0 ? v * wurzelShare : v * weights[i],
        ),
        shoppersByLevel: shoppersByLevel.map((v, level) =>
          level === 0 ? v * wurzelShare : v * weights[i],
        ),
      }));
    },
  };
}
```

`redistributeExistingLegs` kann aus `dirichlet.ts` oder `momentum.ts` 1:1 uebernommen werden - sie ist in beiden identisch implementiert. Bei Bedarf in `utils/redistribute.ts` extrahieren.

### Schritt 3: Strategie registrieren

In [packages/simulator-realistic-growth/src/index.ts](../packages/simulator-realistic-growth/src/index.ts):

```ts
import { createMyStrategy } from './strategies/mystrategy';

export { createMyStrategy } from './strategies/mystrategy';

export function createGrowthModulator(options: GrowthOptions): GrowthModulator {
  switch (options.strategy) {
    // ... bestehende cases ...
    case 'mystrategy':
      return createMyStrategy({ alpha: options.alpha, seed: options.seed });
  }
}
```

`StrategyId` in `contracts.ts` um `'mystrategy'` erweitern. `GrowthOptions` um neue Felder erweitern (oder generisches `parameters?: Record<string, unknown>` einfuehren, wenn Strategien sehr unterschiedlich werden).

### Schritt 4: Tests

Vier Eigenschaften sollten gepruefte werden - sie gelten fuer jede Strategie:

```ts
it('summiert immer zu 1', () => {
  const w = computeMyWeights(5, 0.5, createRng(42));
  expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
});

it('liefert nur nicht-negative Werte', () => {
  const w = computeMyWeights(10, 1, createRng(99));
  for (const v of w) expect(v).toBeGreaterThanOrEqual(0);
});

it('produziert bei gleichem Seed reproduzierbare Verteilung', () => {
  const a = createMyStrategy({ seed: 7 });
  const b = createMyStrategy({ seed: 7 });
  expect(a.splitLegs(ctx)).toEqual(b.splitLegs(ctx));
});

it('Level 0 bleibt symmetrisch', () => {
  const legs = createMyStrategy({ seed: 1 }).splitLegs({
    ...ctx, membersByLevel: [5, 50, 500], directLegs: 5,
  });
  for (const leg of legs) {
    expect(leg.membersByLevel[0]).toBeCloseTo(1, 8);
  }
});
```

### Schritt 5: UI freischalten

In [simulator-app/src/components/AdvancedSettingsPanel.tsx](../simulator-app/src/components/AdvancedSettingsPanel.tsx):

```ts
const STRATEGY_OPTIONS: { value: RealityStrategy; label: string }[] = [
  // ... bestehende Eintraege ...
  { value: 'mystrategy', label: 'Meine Strategie' },
];
```

Falls Parameter ueber die UI einstellbar sein sollen: Sub-Panel ergaenzen mit Slidern fuer `alpha`/Seed, State in `App.tsx` haltern und an `createGrowthModulator` durchreichen.

---

## 8. Tests und Verifikation

### Test-Verteilung

| Test-Datei | Anzahl | Schwerpunkt |
| --- | --- | --- |
| `simulator-realistic-growth/tests/rng.test.ts` | 3 | Mulberry32: Reproduzierbarkeit, Wertebereich |
| `simulator-realistic-growth/tests/none.test.ts` | 7 | Symmetrie, leeres Array, `legs`-Pass-Through |
| `simulator-realistic-growth/tests/dirichlet.test.ts` | 11 | Summen-Erhaltung, Streuung, Reproduzierbarkeit, frische Beine ohne Downline |
| `simulator-realistic-growth/tests/momentum.test.ts` | 11 | Hot-Hand, Reversion ab Jahr 3, Wiederverwendung |

### Reproduzierbarkeit pruefen

```ts
const modulator = createDirichletStrategy({ seed: 123, varianceFactor: 0.8 });

const first = simulateNetwork(baseInputs, 36, { growthModulator: modulator });
const second = simulateNetwork(baseInputs, 36, { growthModulator: modulator });

expect(second[35].legs).toEqual(first[35].legs);
```

Dieser Test - bereits in `dirichlet.test.ts` und `momentum.test.ts` vorhanden - ist die kritische Sicherung dafuer, dass `reset()` zwischen Laeufen sauber wirkt.

### Smoke-Test: Aggregat unveraendert

Eine zukuenftige Strategie muss diese Invariante erfuellen:

```ts
const baseline = runSimulation(product, inputs);
const withMy   = runSimulation(product, inputs, undefined, {
  growthModulator: createMyStrategy(),
});

for (let y = 0; y < baseline.yearEnds.length; y++) {
  for (let level = 0; level < baseline.yearEnds[y].membersByLevel.length; level++) {
    expect(withMy.yearEnds[y].membersByLevel[level]).toBeCloseTo(
      baseline.yearEnds[y].membersByLevel[level], 5,
    );
  }
}
```

Wenn dieser Test rot wird, hat die Strategie das Aggregat veraendert - das ist immer ein Bug.

---

## 9. Risiken, Fallstricke, offene Fragen

### Bekannte Fallstricke

- **Wurzel-Symmetrie verletzen.** Wenn `splitLegs` `membersByLevel[0]` mit Strategie-Gewichten skaliert, verlieren Beine ihre Identitaet. Immer `level === 0 ? v * wurzelShare : v * weights[i]`.
- **Reset vergessen.** Ohne `reset()` liefert ein wiederverwendeter Modulator unterschiedliche Ergebnisse beim zweiten Lauf - der Test "ist bei Wiederverwendung reproduzierbar" faengt das.
- **`legs`-Param ignorieren.** Wenn der Kern echte Beine bereitstellt und die Strategie aus Aggregaten neu sampelt, geht die Asymmetrie zwischen alten und jungen Beinen verloren.
- **Float-Drift bei `sum(weights)`.** Bei vielen Beinen und kleinen Floats summiert es sich auf `0.9999...`. Das macht den Aggregat-Check `toBeCloseTo(..., 5)` schon weich genug, ist aber bei `toEqual` zu beachten.

### Offene Fragen

- **Parameter ueber UI:** Sollen `varianceFactor`, `momentumStrength` etc. fuer den User einstellbar sein, oder bleiben sie hardgecodete Modell-Defaults? Aktueller Stand: hardgecodet in `App.tsx`.
- **Lifecycle-Phasen kalibrieren:** Die geplanten Phasen-Wahrscheinlichkeiten sind als 10/30/60-Pareto angedacht. Ohne empirische Datenbasis ist das eine Designentscheidung, die dokumentiert sein muss.
- **Provisionsberechnung pro Bein:** Aktuell ist die Anzeige in `NetworkVisualizations` eine QGV-Anteilsschaetzung pro Bein, keine echte Phase-1/2/3-Rechnung pro Bein. Wenn das Feature gewuenscht ist, muesste `calculateMonthlyCompensation` pro Bein laufen koennen.
- **Cap pro Bein vs. Cap auf Aggregat:** Heute wirkt `maxDirectMembersPerMember` auf das Aggregat. Bei `lifecycle` koennten unterschiedliche Archetypen unterschiedliche Caps haben - das wuerde die Aggregat-Erhaltung brechen und braucht eine Entscheidung.

### Annahmen

- Alle Strategien lassen Level 0 symmetrisch - Wurzel-Member sind Bein-Identitaeten und duerfen nicht "umverteilt" werden.
- Der Seed `42` ist projektweite Default-Konvention. Wenn der Nutzer mehrere "Szenarien" vergleichen will, ist das aktuell nur per Code-Aenderung moeglich.
- `cacheKey = year:legCount` reicht aus - Aenderungen innerhalb eines Jahres (z. B. durch Fluktuation) sind selten genug, dass eine Neusampling nicht noetig ist. Bei kuenftigen Strategien mit feiner Aufloesung pruefen.

---

## 10. Quellen und Querverweise

### Projekt-interne Dokumente

- [_doc/concepts for realistic model growth.md](./concepts%20for%20realistic%20model%20growth.md) - Konzeptpapier (Originalquelle 1)
- [_doc/planing phase 1 to 4 - simulation and realistic model growth.md](./planing%20phase%201%20to%204%20-%20simulation%20and%20realistic%20model%20growth.md) - Umsetzungsplan (Originalquelle 2)
- [_doc/lifeplus_business_plan.md](./lifeplus_business_plan.md) - Datenmodell, Wachstumslogik, Vergutungsplan

### Code-Referenzen

- [packages/simulator-core/src/pipeline.ts](../packages/simulator-core/src/pipeline.ts) - `GrowthModulator`, `LegSplitContext`
- [packages/simulator-core/src/network.ts](../packages/simulator-core/src/network.ts) - Aggregat-Berechnung, Modulator-Aufruf
- [packages/simulator-core/src/simulation.ts](../packages/simulator-core/src/simulation.ts) - `runSimulation` mit `growthModulator`-Option
- [packages/simulator-realistic-growth/src/index.ts](../packages/simulator-realistic-growth/src/index.ts) - `createGrowthModulator` Factory
- [packages/simulator-realistic-growth/src/strategies/none.ts](../packages/simulator-realistic-growth/src/strategies/none.ts)
- [packages/simulator-realistic-growth/src/strategies/dirichlet.ts](../packages/simulator-realistic-growth/src/strategies/dirichlet.ts)
- [packages/simulator-realistic-growth/src/strategies/momentum.ts](../packages/simulator-realistic-growth/src/strategies/momentum.ts)
- [packages/simulator-realistic-growth/src/rng.ts](../packages/simulator-realistic-growth/src/rng.ts) - Mulberry32

### Memory-Eintraege

- `feedback-network-single-source` - keine kosmetischen Asymmetrien im Frontend; Asymmetrie nur aus diesem Paket
- `feedback-growth-year-offset` - frisch geworbene Members werben erst im Folgejahr (relevant fuer den Kern, nicht fuer Strategien direkt)
