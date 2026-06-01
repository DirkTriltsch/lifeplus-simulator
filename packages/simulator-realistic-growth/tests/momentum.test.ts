import { describe, expect, it } from 'vitest';
import { computeMomentumWeights, createRng, createTreeGrowthStrategy } from '../src';

describe('computeMomentumWeights', () => {
  it('summiert immer zu 1', () => {
    const previous = [0.4, 0.3, 0.2, 0.1];
    const weights = computeMomentumWeights(
      4,
      previous,
      2,
      0.6,
      0.3,
      0.2,
      createRng(42),
    );

    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('liefert ohne Rauschen und ohne Reversion die erwartete base-Drift', () => {
    const previous = [0.5, 0.2, 0.2, 0.1];
    const weights = computeMomentumWeights(
      4,
      previous,
      2,
      1.0,
      0,
      0,
      createRng(1),
    );

    const base = 1 / 4;
    const expectedScores = previous.map((weight) => base + weight);
    const expectedSum = expectedScores.reduce((a, b) => a + b, 0);
    const expectedWeights = expectedScores.map((score) => score / expectedSum);

    for (let index = 0; index < 4; index++) {
      expect(weights[index]).toBeCloseTo(expectedWeights[index], 8);
    }
  });

  it('aktiviert Reversion erst ab Jahr 3', () => {
    const previous = [0.7, 0.1, 0.1, 0.1];

    const year2 = computeMomentumWeights(
      4,
      previous,
      2,
      0.6,
      0,
      0.5,
      createRng(1),
    );
    const year3 = computeMomentumWeights(
      4,
      previous,
      3,
      0.6,
      0,
      0.5,
      createRng(1),
    );

    expect(year3[0]).toBeLessThan(year2[0]);
  });

  it('haelt bei asymmetrischer Vorgeschichte das Top-Bein vorn', () => {
    const weights = computeMomentumWeights(
      4,
      [0.7, 0.1, 0.1, 0.1],
      2,
      0.9,
      0,
      0,
      createRng(1),
    );

    expect(weights[0]).toBeGreaterThan(weights[1]);
    expect(weights[0]).toBeGreaterThan(weights[2]);
    expect(weights[0]).toBeGreaterThan(weights[3]);
  });
});

describe('createTreeGrowthStrategy momentum', () => {
  it('liefert reproduzierbare Source-Gewichte bei gleichem Seed', () => {
    const first = createTreeGrowthStrategy({ strategy: 'momentum', seed: 99 });
    const second = createTreeGrowthStrategy({ strategy: 'momentum', seed: 99 });
    const context = {
      year: 2,
      monthIndex: 12,
      persons: [],
      sourceMembers: sourceMembers('a', 'b', 'c', 'd'),
      inputs: baseInputs(),
    };

    expect(first?.sourceWeights(context)).toEqual(second?.sourceWeights(context));
  });
});

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
