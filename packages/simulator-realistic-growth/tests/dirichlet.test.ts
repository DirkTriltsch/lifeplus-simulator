import { describe, expect, it } from 'vitest';
import { createRng, createTreeGrowthStrategy, dirichletWeights } from '../src';

describe('dirichletWeights', () => {
  it('liefert gleichverteilte Gewichte bei varianceFactor = 0', () => {
    const weights = dirichletWeights(4, 0, createRng(1));
    expect(weights).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it('summiert immer zu 1', () => {
    const rng = createRng(7);
    for (const variance of [0.1, 0.4, 0.7, 1.0]) {
      const weights = dirichletWeights(5, variance, rng);
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });

  it('liefert ausschliesslich nicht-negative Werte', () => {
    const weights = dirichletWeights(10, 1, createRng(99));
    for (const weight of weights) {
      expect(weight).toBeGreaterThanOrEqual(0);
    }
  });

  it('streut bei hohem varianceFactor staerker als bei niedrigem', () => {
    const lowVariance = dirichletWeights(8, 0.1, createRng(11));
    const highVariance = dirichletWeights(8, 1.0, createRng(11));

    expect(stddev(highVariance)).toBeGreaterThan(stddev(lowVariance));
  });
});

describe('createTreeGrowthStrategy dirichlet', () => {
  it('liefert reproduzierbare Source-Gewichte bei gleichem Seed', () => {
    const first = createTreeGrowthStrategy({
      strategy: 'dirichlet',
      varianceFactor: 0.8,
      seed: 99,
    });
    const second = createTreeGrowthStrategy({
      strategy: 'dirichlet',
      varianceFactor: 0.8,
      seed: 99,
    });

    const context = {
      year: 2,
      monthIndex: 12,
      persons: [],
      sourceMembers: sourceMembers('a', 'b', 'c', 'd'),
      inputs: baseInputs(),
    };

    expect(first?.sourceWeights(context)).toEqual(second?.sourceWeights(context));
  });

  it('liefert fuer equal/lifecycle keine Tree-Strategie', () => {
    expect(createTreeGrowthStrategy({ strategy: 'equal' })).toBeUndefined();
    expect(createTreeGrowthStrategy({ strategy: 'lifecycle' })).toBeUndefined();
  });
});

function stddev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function sourceMembers(...ids: string[]) {
  return ids.map((id) => ({ id })) as any;
}

function baseInputs() {
  return {
    membersPerYear: 3,
    shoppersPerYear: 0,
    duplicationRate: 1,
    attritionRate: 0,
    memberMonthlyVolume: 150,
    shopperMonthlyVolume: 150,
  };
}
