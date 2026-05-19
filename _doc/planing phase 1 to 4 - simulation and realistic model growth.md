# Umsetzungsplan - Simulation und Realistic Model Growth

Dieser Plan setzt den Migrationspfad aus [concepts for realistic model growth.md](concepts%20for%20realistic%20model%20growth.md) in vier ausfuehrbare Phasen um. Jede Phase ist isoliert lieferbar, ruecksetzbar und veraendert das bestehende Verhalten nur dort, wo es bewusst gewollt ist.

---

## Ausgangslage

Was steht bereits:

- Click-Dummy `AdvancedSettingsPanel` mit den drei Bereichen `max. Members je Sponsor`, `Reality Simulation`, `Ziele-Leiter`.
- `GoalIcon`, `GoalsEditorDialog`, `GoalUI` mit 5 Default-Zielen (Produkte, Urlaub, Auto, Mietfrei, Frei leben).
- `buildLegs()` in `NetworkVisualizations.tsx` nutzt echte `snapshot.legs`; neue Beine starten frisch, alte Beine koennen voller sein.
- `HybridTree` skaliert dynamisch und scrollt horizontal bei vielen Beinen.
- `GoalsEditorDialog` ist mobilfreundlich (mehrzeilig auf Mobile, kompakt ab `sm`).
- `maxDirectMembersPerMember` wird live auf mindestens 1 geklemmt.

Was noch fehlt:

- `monthlyProductCostEUR` in `SimulatorInputs`.
- `simulator-goals` Paket (Evaluator + Presets).
- `maxDirectMembersPerMember` an der Simulation angeschlossen.
- `legs[]` als first-class Entitaet im Snapshot.
- `simulator-realistic-growth` Paket mit Strategien.
- Verbindung der UI-Strategieauswahl zur Simulation.
- Goal-Marker im Chart.

---

## Phase 1 - Goals end-to-end

**Ziel:** Die UI fuer Ziele steht bereits. Wenn die Auswertung folgt, sieht der User sofort konkrete Aussagen wie "Mietfrei wohnen ab Jahr 6" als Symbol im Chart.

**Risiko:** Sehr niedrig. Rein additiv. Beruehrt keine bestehende Logik.

### Schritt 1.1 - `monthlyProductCostEUR` in `SimulatorInputs`

- Feld in [packages/simulator-core/src/contracts.ts](../packages/simulator-core/src/contracts.ts) ergaenzen.
- Default 100 in den `defaultInputs` der drei Produkte.
- App-State `monthlyProductCostEUR` in [App.tsx](../simulator-app/src/App.tsx) ergaenzen und an `runSimulation` durchreichen.

### Schritt 1.2 - Neues Paket `simulator-goals`

Struktur:

```text
packages/simulator-goals/
  package.json
  tsconfig.json
  src/
    contracts.ts
    evaluator.ts
    presets.ts
    index.ts
  tests/
    evaluator.test.ts
```

Contracts (`contracts.ts`):

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
  requiresRefinanced?: boolean;
}

export interface GoalProgress {
  goal: Goal;
  achieved: boolean;
  achievedInMonth?: number;
  achievedInYear?: number;
  currentValueEUR: number;
  percentage: number;
  blockedByRefinanced?: boolean;
}
```

Evaluator (`evaluator.ts`):

- Reine Funktion `evaluateGoals(result, goals, inputs): GoalProgress[]`.
- Pro Ziel: Wert-Serie pro Monat bilden (Income, Surplus, YearlySurplus, Refinanziert).
- Ersten Monat finden, ab dem die Bedingung dauerhaft gilt.
- `requiresRefinanced` -> spaeteren der beiden Monate nehmen.

Presets (`presets.ts`):

- `DEFAULT_GOALS` mit den fuenf Zielen aus dem Architektur-Doc plus optional `Auto` (500 EUR/Monat).

### Schritt 1.3 - `evaluateGoals()` in `App.tsx`

- `useMemo` direkt nach `runSimulation`.
- Mapping `GoalUI` (App-State) -> `Goal` (Paket-Contract).
- Ergebnis `goalProgress` wird an `AdvancedSettingsPanel` und `ProvisionChart` weitergereicht.

### Schritt 1.4 - Goal-Marker im Chart

- In [ProvisionChart.tsx](../simulator-app/src/components/ProvisionChart.tsx) `ReferenceDot` aus Recharts pro Ziel mit `achievedInYear`.
- Custom-Marker mit `GoalIcon` als SVG.
- Nicht erreichte Ziele werden nicht gerendert.
- Verhalten: wenn ein Ziel durch Slider-Aenderung wegfaellt, verschwindet das Symbol live.

### Schritt 1.5 - Status in der Ziele-Leiter

- `AdvancedSettingsPanel` zeigt neben dem Sollwert "ab Jahr X" oder "noch nicht".
- Optional: dezentes "blockiert durch Refinanzierung" als Tooltip.

### Definition of Done

- 5 Default-Ziele werden im Chart als Symbole an der erreichten Stelle eingeblendet.
- Bei Slider-Aenderung verschieben sich Symbole live oder verschwinden.
- `simulator-goals` hat Tests pro `GoalKind` und fuer `requiresRefinanced`.
- `npm run build` und `npm test` gruen.

---

## Phase 2 - Membergrenze wirkt

**Ziel:** `maxDirectMembersPerMember` wirkt erstmals auf die Simulation. Default 29 ist hoch genug, dass das Standardverhalten unveraendert bleibt; aktive Begrenzung wird sichtbar, sobald der User auf z. B. 3 stellt.

**Risiko:** Niedrig bis mittel. Aenderung in `network.ts`. Bestehende Snapshot-Tests muessen mit Default 29 identisch bleiben.

### Schritt 2.1 - Kontrakt erweitern

- `maxDirectMembersPerMember: number` in `SimulatorInputs` (Default 29).
- In `defaultInputs` aller Produkte hinterlegen.

### Schritt 2.2 - Cap-Logik in `network.ts`

Aktuelle Wachstumsformel in [network.ts:95-113](../packages/simulator-core/src/network.ts#L95-L113):

```ts
const newMembers = sourceCount * membersPerYear * duplicationRate;
```

Neuer Ablauf pro Jahr:

```text
fuer jede Ebene:
  rawGrowth         = sourceCount * membersPerYear * duplicationRate
  capacityPerSource = max(0, maxDirectMembersPerMember - existingChildren_i)
  availableSlots    = sum(capacityPerSource)
  cappedGrowth      = min(rawGrowth, availableSlots)
```

`existingChildren_i` ist eine vereinfachte Schaetzung: durchschnittliche Anzahl Children pro Source-Member auf der naechsten Ebene. Voll exakt wird das erst mit echten Knoten; fuer den ersten Wurf reicht die Schaetzung.

### Schritt 2.3 - State durchreichen

- App-State `maxDirectMembersPerMember` an `runSimulation` weitergeben.
- Eingabefeld im Panel ist bereits angebunden.

### Schritt 2.4 - Tests

- Snapshot-Test: mit Default-Inputs und `maxDirectMembersPerMember = 29` bleibt das Ergebnis byte-identisch zur Phase-1-Version.
- Neuer Test: `maxDirectMembersPerMember = 3` erzwingt klares Plateau in `membersByLevel[0]`.
- Edge-Case: `maxDirectMembersPerMember = 1` (nur Einzelketten).

### Definition of Done

- Standardverhalten unveraendert.
- Begrenzung sichtbar im Chart, wenn der Wert klein gestellt wird.
- Tests gruen.

---

## Phase 3 - Realistic Growth Infrastruktur

**Ziel:** Pipeline-Architektur einfuehren, ohne das Verhalten zu aendern. Danach `dirichlet` und `momentum` als optionale Strategien.

**Risiko:** Hoechster Umbau. Sollte in mehreren Untermerges passieren, jeder einzelne gruen getestet. Default-Strategie bleibt `none` und ist verhalten 1:1 wie heute.

### Schritt 3.1 - `legs[]` in `NetworkSnapshot`

- Neue Struktur `Leg` in `simulator-core/src/contracts.ts`.
- Snapshot bekommt zusaetzlich `legs: Leg[]`, parallel zu `membersByLevel`.
- Erstbefuellung: gleichmaessig aus `membersByLevel` rekonstruiert (jedes Bein bekommt `share = 1 / legCount`).
- Bestehende Tests bleiben unveraendert; `membersByLevel` ist weiterhin die fuehrende Groesse.

### Schritt 3.2 - Pipeline und Modulator-Interface

- `packages/simulator-core/src/pipeline.ts` mit `GrowthModulator`-Interface und Kontext-Typen (`GrowthYearContext`, `GrowthSplitContext`, `GrowthYearResultContext`).
- `runSimulation` akzeptiert optional `{ growthModulator }`.

### Schritt 3.3 - Paket `simulator-realistic-growth`

Struktur:

```text
packages/simulator-realistic-growth/
  package.json
  src/
    contracts.ts
    index.ts
    rng.ts
    attrition.ts
    strategies/
      none.ts
      dirichlet.ts
      momentum.ts
```

- `noneStrategy` als erste Implementierung. Output identisch zu heute.
- Tests: Snapshot-Vergleich mit Phase-2-Output.

### Schritt 3.4 - `dirichlet`-Strategie

- Seeded PRNG (`rng.ts`).
- Dirichlet-Sampling mit `alpha = [varianceFactor, ...]`.
- Eigenschaftsbasierte Tests: `sum(splitNewMembers) == total`, `min >= 0`, Streuung waechst mit `varianceFactor`.

### Schritt 3.5 - `momentum`-Strategie

- Score pro Bein: `base + alpha * momentum + beta * noise - gamma * reversionPenalty`.
- Tests: Hot-Hand-Korrelation, Reversion ab Jahr 3, Summen-Erhaltung.

### Schritt 3.6 - UI-Verbindung

- `realityStrategy` aus `AdvancedSettingsPanel` an `runSimulation` durchreichen.
- `createGrowthModulator(options)` aus dem Paket.
- Beim Strategiewechsel laeuft die Simulation neu, alles aktualisiert sich live.

### Definition of Done

- `none` reproduziert das heutige Verhalten exakt.
- `dirichlet` erzeugt erkennbare Streuung zwischen den Beinen (z. B. im Sunburst).
- `momentum` zeigt Folgeerfolg und Reversion ab Jahr 3.
- Alle Strategien sind seedbar und reproduzierbar.
- Tests pro Paket gruen.

---

## Phase 4 - Polishing

**Ziel:** Tiefe und Politur, sobald die Infrastruktur steht. Reihenfolge nach Lust und Wert.

**Stand:** Die schnellen UX- und Stabilitaets-Punkte sind umgesetzt. `lifecycle`
bleibt sichtbar, ist aber bis zur echten Strategie deaktiviert.

### Schritt 4.1 - `lifecycle`-Strategie

- Bein-Archetypen (`driver`, `steady`, `passive`) mit Verteilung 10/30/60 Prozent.
- Phasen (`ramp`, `growth`, `plateau`, `fade`, `breakout`).
- Per-Jahr-Skalierung erhaelt die Gesamtmenge.
- UI-Ergaenzung: kleine Bein-Charakter-Anzeige unter dem Sunburst.
- Status: offen. UI-Option ist deaktiviert, damit kein No-op als fertiges Feature wirkt.

### Schritt 4.2 - Fortschrittsanzeige fuer Ziele

- Neben dem "ab Jahr X" zusaetzlich "noch -340 EUR/Mon" oder Prozentbalken.
- Im `GoalsEditorDialog` optional sichtbar.
- Status: umgesetzt in `AdvancedSettingsPanel` ueber `GoalProgress.currentValueEUR`
  und `percentage`.

### Schritt 4.3 - Echte Beine in den Visualisierungen

- `NetworkVisualizations` nutzt jetzt `legs[]` aus dem Snapshot.
- `buildLegs()` nutzt echte Bein-Level, echte Knoten und echtes Bein-QGV.
- Die Bein-Provision bleibt als anteilige Schaetzung nach Bein-QGV markiert,
  weil der Verguetungsplan aktuell keine isolierte Per-Bein-Provision berechnet.
- Bei `dirichlet`/`momentum`/`lifecycle` erscheinen unterschiedlich grosse Segmente und Spalten - die Beine sehen wieder "lebendig" aus, aber jetzt aus echter Mathematik.
- Status: umgesetzt bis auf echte Per-Bein-Provisionsberechnung.

### Schritt 4.4 - Eigene Ziele anlegen

- Im `GoalsEditorDialog` einen Button "+ Neues Ziel".
- Reset-Button "Defaults wiederherstellen".
- Status: umgesetzt inklusive Zieltyp-Auswahl, Loeschen und Defaults.

### Schritt 4.5 - Persistenz

- Slider- und Ziel-Werte in `localStorage` speichern, damit die Session erhalten bleibt.
- Optional: shareable Link mit URL-Parametern.
- Status: localStorage pro Produkt umgesetzt. Share-URL bleibt optional offen.

---

## Reihenfolge auf einen Blick

| Phase | Inhalt | Aufwand | Risiko | Sichtbarkeit |
| --- | --- | --- | --- | --- |
| 1 | Goals end-to-end, Marker im Chart | klein | niedrig | hoch |
| 2 | Membergrenze wirkt | klein | mittel | mittel |
| 3 | Realistic-Growth-Pipeline + 2 Strategien | gross | hoch | hoch |
| 4 | Lifecycle, Polishing, Persistenz | variabel | niedrig | mittel |

---

## Naechster konkreter Sprint

**Phase 1, Schritte 1.1 bis 1.4 in einem Rutsch.**

Konkrete Ergebnisse:

1. `monthlyProductCostEUR` in `SimulatorInputs` mit Default 100.
2. Neues Paket `simulator-goals` mit Evaluator und Tests.
3. `evaluateGoals()` in `App.tsx` integriert.
4. Goal-Symbole live im `ProvisionChart` an der erreichten Stelle.

Danach hat der User erstmals dynamische Zielmarker, die auf Slider-Aenderungen reagieren. Alles davor (`maxDirect`, Strategien) baut darauf auf.
