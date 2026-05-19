/**
 * Pipeline-Hooks fuer Realistic-Growth-Strategien.
 *
 * Der Kern bleibt fuer die Netzwerk-Mathematik verantwortlich (`membersByLevel`,
 * `shoppersByLevel`, Cap-Logik, Fluktuation) und fuehrt echte `Leg`s mit
 * Geburtsjahr-Logik. Strategien bekommen diese Bein-Struktur und koennen sie
 * fuer realistischere Schwankungen modulieren, ohne die Aggregat-Summen zu
 * ersetzen.
 */

import type { Leg, NetworkInputs } from './network';

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
