import { describe, expect, it } from 'vitest';
import { simulateNetwork, type NetworkInputs } from '@mlm/simulator-core';
import {
  createDirichletStrategy,
  createGrowthModulator,
  createRng,
  dirichletWeights,
} from '../src';

const baseInputs: NetworkInputs = {
  membersPerYear: 3,
  shoppersPerYear: 0,
  duplicationRate: 1,
  attritionRate: 0,
};

describe('dirichletWeights', () => {
  it('liefert gleichverteilte Gewichte bei varianceFactor = 0', () => {
    const w = dirichletWeights(4, 0, createRng(1));
    expect(w).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it('summiert immer zu 1', () => {
    const rng = createRng(7);
    for (const v of [0.1, 0.4, 0.7, 1.0]) {
      const w = dirichletWeights(5, v, rng);
      const sum = w.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });

  it('liefert ausschliesslich nicht-negative Werte', () => {
    const w = dirichletWeights(10, 1, createRng(99));
    for (const x of w) {
      expect(x).toBeGreaterThanOrEqual(0);
    }
  });

  it('streut bei hohem varianceFactor staerker als bei niedrigem', () => {
    const lowVar = dirichletWeights(8, 0.1, createRng(11));
    const highVar = dirichletWeights(8, 1.0, createRng(11));
    const stddev = (arr: number[]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance =
        arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };
    expect(stddev(highVar)).toBeGreaterThan(stddev(lowVar));
  });
});

describe('dirichlet-Strategie', () => {
  it('liefert directLegs Beine und Summen-Erhaltung pro Ebene', () => {
    const modulator = createDirichletStrategy({ seed: 42 });
    const legs = modulator.splitLegs({
      year: 2,
      monthIndex: 12,
      membersByLevel: [4, 16, 64],
      shoppersByLevel: [6, 0, 0],
      directLegs: 4,
      inputs: baseInputs,
    });

    expect(legs.length).toBe(4);
    for (let level = 0; level < 3; level++) {
      const sum = legs.reduce(
        (a, l) => a + (l.membersByLevel[level] ?? 0),
        0,
      );
      expect(sum).toBeCloseTo([4, 16, 64][level], 5);
    }
  });

  it('haelt Level 0 symmetrisch (jedes Bein hat genau einen Wurzel-Member)', () => {
    const modulator = createDirichletStrategy({ seed: 42, varianceFactor: 1 });
    const legs = modulator.splitLegs({
      year: 1,
      monthIndex: 0,
      membersByLevel: [5, 25, 125],
      shoppersByLevel: [0, 0, 0],
      directLegs: 5,
      inputs: baseInputs,
    });

    for (const leg of legs) {
      expect(leg.membersByLevel[0]).toBeCloseTo(1, 8);
    }
  });

  it('produziert bei gleichem Seed reproduzierbare Verteilung', () => {
    const a = createDirichletStrategy({ seed: 99, varianceFactor: 0.5 });
    const b = createDirichletStrategy({ seed: 99, varianceFactor: 0.5 });
    const ctx = {
      year: 3,
      monthIndex: 36,
      membersByLevel: [4, 12, 36],
      shoppersByLevel: [0, 0, 0],
      directLegs: 4,
      inputs: baseInputs,
    };

    const legsA = a.splitLegs(ctx);
    const legsB = b.splitLegs(ctx);

    for (let i = 0; i < legsA.length; i++) {
      expect(legsA[i].membersByLevel).toEqual(legsB[i].membersByLevel);
    }
  });

  it('erzeugt mit varianceFactor > 0 ungleich grosse Beine', () => {
    const modulator = createDirichletStrategy({ seed: 7, varianceFactor: 0.8 });
    const legs = modulator.splitLegs({
      year: 1,
      monthIndex: 0,
      membersByLevel: [5, 50, 500],
      shoppersByLevel: [0, 0, 0],
      directLegs: 5,
      inputs: baseInputs,
    });

    const level1Values = legs.map((l) => l.membersByLevel[1]);
    const max = Math.max(...level1Values);
    const min = Math.min(...level1Values);
    expect(max).toBeGreaterThan(min);
  });

  it('ist bei Wiederverwendung desselben Modulators ueber Simulationslaeufe reproduzierbar', () => {
    const modulator = createDirichletStrategy({ seed: 123, varianceFactor: 0.8 });

    const first = simulateNetwork(baseInputs, 36, { growthModulator: modulator });
    const second = simulateNetwork(baseInputs, 36, { growthModulator: modulator });

    expect(second[35].legs).toEqual(first[35].legs);
  });
});

describe('createGrowthModulator', () => {
  it('liefert eine dirichlet-Strategie fuer strategy="dirichlet"', () => {
    const modulator = createGrowthModulator({
      strategy: 'dirichlet',
      varianceFactor: 0.5,
      seed: 42,
    });
    expect(modulator.id).toBe('dirichlet');
  });
});
