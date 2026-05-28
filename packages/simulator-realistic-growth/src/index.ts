import type { GrowthModulator, TreeGrowthStrategy } from '@mlm/simulator-core';
import type { GrowthOptions, StrategyId } from './contracts';
import { createNoneStrategy } from './strategies/none';
import { createDirichletStrategy, dirichletWeights } from './strategies/dirichlet';
import {
  createMomentumStrategy,
  computeMomentumWeights,
} from './strategies/momentum';
import { createRng } from './rng';

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

export function createTreeGrowthStrategy(
  options: GrowthOptions,
): TreeGrowthStrategy | undefined {
  switch (options.strategy) {
    case 'none':
    case 'lifecycle':
      return undefined;
    case 'dirichlet':
      return createDirichletTreeStrategy({
        varianceFactor: options.varianceFactor,
        seed: options.seed,
      });
    case 'momentum':
      return createMomentumTreeStrategy({
        momentumStrength: options.momentumStrength,
        randomStrength: options.randomStrength,
        reversionStrength: options.reversionStrength,
        seed: options.seed,
      });
    default: {
      const exhaustive: never = options.strategy;
      throw new Error(`Unknown strategy: ${exhaustive as StrategyId}`);
    }
  }
}

function createDirichletTreeStrategy(options: {
  varianceFactor?: number;
  seed?: number;
}): TreeGrowthStrategy {
  const varianceFactor = options.varianceFactor ?? 0.4;
  const seed = options.seed ?? 42;
  let rng = createRng(seed);

  return {
    id: 'dirichlet-tree',
    reset() {
      rng = createRng(seed);
    },
    sourceWeights({ sourceMembers }) {
      return dirichletWeights(sourceMembers.length, varianceFactor, rng);
    },
  };
}

function createMomentumTreeStrategy(options: {
  momentumStrength?: number;
  randomStrength?: number;
  reversionStrength?: number;
  seed?: number;
}): TreeGrowthStrategy {
  const momentumStrength = options.momentumStrength ?? 0.6;
  const randomStrength = options.randomStrength ?? 0.3;
  const reversionStrength = options.reversionStrength ?? 0.2;
  const seed = options.seed ?? 42;
  let rng = createRng(seed);
  let previousWeightsById = new Map<string, number>();

  return {
    id: 'momentum-tree',
    reset() {
      rng = createRng(seed);
      previousWeightsById = new Map();
    },
    sourceWeights({ sourceMembers, year }) {
      const sourceCount = sourceMembers.length;
      if (sourceCount <= 0) return [];

      const uniform = 1 / sourceCount;
      const previous = sourceMembers.map(
        (source) => previousWeightsById.get(source.id) ?? uniform,
      );
      const previousSum = previous.reduce((sum, weight) => sum + weight, 0) || 1;
      const normalizedPrevious = previous.map((weight) => weight / previousSum);
      const weights = computeMomentumWeights(
        sourceCount,
        normalizedPrevious,
        year,
        momentumStrength,
        randomStrength,
        reversionStrength,
        rng,
      );

      previousWeightsById = new Map(
        sourceMembers.map((source, index) => [source.id, weights[index] ?? uniform]),
      );

      return weights;
    },
  };
}
