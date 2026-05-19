import { describe, expect, it } from 'vitest';
import { simulateNetwork, type NetworkInputs } from '@mlm/simulator-core';
import {
  computeMomentumWeights,
  createGrowthModulator,
  createMomentumStrategy,
  createRng,
} from '../src';

const baseInputs: NetworkInputs = {
  membersPerYear: 3,
  shoppersPerYear: 0,
  duplicationRate: 1,
  attritionRate: 0,
};

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

  it('liefert ohne Rauschen und ohne Reversion exakt die Vorjahresgewichte (zuzueglich base-Drift)', () => {
    const previous = [0.5, 0.2, 0.2, 0.1];
    const weights = computeMomentumWeights(
      4,
      previous,
      2,
      1.0, // momentum = 1
      0,   // no noise
      0,   // no reversion
      createRng(1),
    );

    // score = base + previous * 1 -> weights = (base + previous) / sum
    const base = 1 / 4;
    const expectedScores = previous.map((p) => base + p);
    const expectedSum = expectedScores.reduce((a, b) => a + b, 0);
    const expectedWeights = expectedScores.map((s) => s / expectedSum);

    for (let i = 0; i < 4; i++) {
      expect(weights[i]).toBeCloseTo(expectedWeights[i], 8);
    }
  });

  it('aktiviert Reversion erst ab Jahr 3', () => {
    const previous = [0.7, 0.1, 0.1, 0.1];

    const year2 = computeMomentumWeights(
      4, previous, 2, 0.6, 0, 0.5, createRng(1),
    );
    const year3 = computeMomentumWeights(
      4, previous, 3, 0.6, 0, 0.5, createRng(1),
    );

    // In Jahr 2: keine Reversion -> dominantes Bein bleibt stark
    // In Jahr 3: Reversion daempft -> dominantes Bein verliert relativ Gewicht
    expect(year3[0]).toBeLessThan(year2[0]);
  });
});

describe('momentum-Strategie', () => {
  it('symmetric in Jahr 1 (kein lastWeights)', () => {
    const modulator = createMomentumStrategy({ seed: 42 });

    const legs = modulator.splitLegs({
      year: 1,
      monthIndex: 0,
      membersByLevel: [4, 16],
      shoppersByLevel: [0, 0],
      directLegs: 4,
      inputs: baseInputs,
    });

    // weights wurden in Jahr 1 das erste Mal aus [0.25,0.25,0.25,0.25] gesample.
    // Sie sollten zu Aggregaten summieren.
    for (let level = 0; level < 2; level++) {
      const sum = legs.reduce(
        (a, l) => a + (l.membersByLevel[level] ?? 0),
        0,
      );
      expect(sum).toBeCloseTo([4, 16][level], 5);
    }
  });

  it('Level 0 bleibt symmetrisch', () => {
    const modulator = createMomentumStrategy({ seed: 7 });
    const legs = modulator.splitLegs({
      year: 3,
      monthIndex: 24,
      membersByLevel: [5, 50, 500],
      shoppersByLevel: [0, 0, 0],
      directLegs: 5,
      inputs: baseInputs,
    });

    for (const leg of legs) {
      expect(leg.membersByLevel[0]).toBeCloseTo(1, 8);
    }
  });

  it('produziert bei gleichem Seed reproduzierbare Verteilung', () => {
    const ctx = {
      year: 2,
      monthIndex: 12,
      membersByLevel: [4, 12, 36],
      shoppersByLevel: [0, 0, 0],
      directLegs: 4,
      inputs: baseInputs,
    };

    const a = createMomentumStrategy({ seed: 99 });
    const b = createMomentumStrategy({ seed: 99 });

    const legsA = a.splitLegs(ctx);
    const legsB = b.splitLegs(ctx);

    for (let i = 0; i < legsA.length; i++) {
      expect(legsA[i].membersByLevel).toEqual(legsB[i].membersByLevel);
    }
  });

  it('Hot-Hand: bei asymmetrischer Vorgeschichte bleibt das Top-Bein vorn', () => {
    const previous = [0.7, 0.1, 0.1, 0.1];
    const w = computeMomentumWeights(
      4, previous, 2,
      0.9, // strong momentum
      0,   // no noise (deterministisch)
      0,   // no reversion in year 2 anyway
      createRng(1),
    );

    expect(w[0]).toBeGreaterThan(w[1]);
    expect(w[0]).toBeGreaterThan(w[2]);
    expect(w[0]).toBeGreaterThan(w[3]);
  });

  it('Reversion: ab Jahr 3 sinkt das dominante Bein im Vergleich zu Jahr 2', () => {
    const previous = [0.7, 0.1, 0.1, 0.1];
    const w2 = computeMomentumWeights(
      4, previous, 2,
      0.9, 0, 0.6, createRng(1),
    );
    const w3 = computeMomentumWeights(
      4, previous, 3,
      0.9, 0, 0.6, createRng(1),
    );

    expect(w3[0]).toBeLessThan(w2[0]);
  });

  it('ist bei Wiederverwendung desselben Modulators ueber Simulationslaeufe reproduzierbar', () => {
    const modulator = createMomentumStrategy({ seed: 123 });

    const first = simulateNetwork(baseInputs, 36, { growthModulator: modulator });
    const second = simulateNetwork(baseInputs, 36, { growthModulator: modulator });

    expect(second[35].legs).toEqual(first[35].legs);
  });

  it('gibt frischen Beinen keine rueckwirkende Downline', () => {
    const modulator = createMomentumStrategy({ seed: 7 });
    const snapshots = simulateNetwork(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
      },
      24,
      { growthModulator: modulator },
    );

    expect(snapshots[23].legs[2].membersByLevel).toEqual([1]);
    expect(snapshots[23].legs[2].shoppersByLevel).toEqual([1.5]);
    expect(snapshots[23].legs[3].membersByLevel).toEqual([1]);
    expect(snapshots[23].legs[3].shoppersByLevel).toEqual([1.5]);
  });
});

describe('createGrowthModulator', () => {
  it('liefert eine momentum-Strategie fuer strategy="momentum"', () => {
    const modulator = createGrowthModulator({ strategy: 'momentum' });
    expect(modulator.id).toBe('momentum');
  });
});
