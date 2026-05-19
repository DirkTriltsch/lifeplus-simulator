import type { GrowthModulator } from '@mlm/simulator-core';
import type { GrowthOptions, StrategyId } from './contracts';
import { createNoneStrategy } from './strategies/none';
import { createDirichletStrategy } from './strategies/dirichlet';
import { createMomentumStrategy } from './strategies/momentum';

export * from './contracts';
export { createNoneStrategy } from './strategies/none';
export {
  createDirichletStrategy,
  dirichletWeights,
} from './strategies/dirichlet';
export {
  createMomentumStrategy,
  computeMomentumWeights,
} from './strategies/momentum';
export { createRng, type Rng } from './rng';

export function createGrowthModulator(options: GrowthOptions): GrowthModulator {
  switch (options.strategy) {
    case 'none':
      return createNoneStrategy();
    case 'dirichlet':
      return createDirichletStrategy({
        varianceFactor: options.varianceFactor,
        seed: options.seed,
      });
    case 'momentum':
      return createMomentumStrategy({
        momentumStrength: options.momentumStrength,
        randomStrength: options.randomStrength,
        reversionStrength: options.reversionStrength,
        seed: options.seed,
      });
    case 'lifecycle':
      // Vorlaeufig faellt lifecycle auf noneStrategy zurueck.
      return createNoneStrategy();
    default: {
      const exhaustive: never = options.strategy;
      throw new Error(`Unknown strategy: ${exhaustive as StrategyId}`);
    }
  }
}
