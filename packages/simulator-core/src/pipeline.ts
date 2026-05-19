/**
 * Pipeline-Hooks fuer Realistic-Growth-Strategien.
 *
 * Der Kern bleibt fuer die Aggregat-Mathematik verantwortlich (`membersByLevel`,
 * `shoppersByLevel`, Cap-Logik, Fluktuation). Strategien steuern, wie diese
 * Aggregate auf einzelne `Leg`s verteilt werden. Bei der Standardstrategie
 * (`noneStrategy`) ist die Verteilung exakt symmetrisch.
 */

import type { Leg, NetworkInputs } from './network';

export interface LegSplitContext {
  year: number;
  monthIndex: number;
  membersByLevel: number[];
  shoppersByLevel: number[];
  directLegs: number;
  inputs: NetworkInputs;
}

export interface GrowthModulator {
  /** Eindeutige Strategie-ID, z. B. `'none'`, `'dirichlet'`, `'momentum'`. */
  id: string;
  /** Setzt internen Strategie-State vor einem neuen Simulationslauf zurueck. */
  reset?(): void;
  /** Wird optional vor dem Jahres-Start aufgerufen (z. B. fuer Momentum-State). */
  beforeYear?(year: number): void;
  /** Verteilt die Aggregate des Snapshots auf einzelne Beine. */
  splitLegs(context: LegSplitContext): Leg[];
  /** Wird optional am Ende eines Jahres aufgerufen (z. B. fuer Momentum-Update). */
  afterYear?(year: number, legs: Leg[]): void;
}
