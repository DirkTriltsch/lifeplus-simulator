import type { GrowthModulator } from '@mlm/simulator-core';

export type StrategyId = 'none' | 'dirichlet' | 'momentum' | 'lifecycle';

export interface GrowthOptions {
  strategy: StrategyId;
  /** Streuung der Verteilung (0..1). Wirkt bei dirichlet und momentum. */
  varianceFactor?: number;
  /** Staerke des Hot-Hand-Effekts. Wirkt bei momentum. */
  momentumStrength?: number;
  /** Staerke der Mean-Reversion ab Jahr 3. Wirkt bei momentum. */
  reversionStrength?: number;
  /** Staerke des Zufalls gegen Momentum. Wirkt bei momentum. */
  randomStrength?: number;
  /** Halbwertszeit des Momentums pro Jahr. Wirkt bei momentum. */
  momentumDecay?: number;
  /** Seed fuer reproduzierbare Ergebnisse. Default 42. */
  seed?: number;
}

export type { GrowthModulator };
