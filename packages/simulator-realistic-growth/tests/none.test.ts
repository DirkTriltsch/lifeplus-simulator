import { describe, expect, it } from 'vitest';
import type { SimulatorInputs } from '@mlm/simulator-core';
import { createGrowthModulator, createNoneStrategy } from '../src';

const baseInputs: SimulatorInputs = {
  membersPerYear: 2,
  shoppersPerYear: 3,
  duplicationRate: 1,
  attritionRate: 0,
  memberMonthlyVolume: 45,
  shopperMonthlyVolume: 45,
};

describe('noneStrategy', () => {
  it('liefert genau directLegs Beine', () => {
    const modulator = createNoneStrategy();
    const legs = modulator.splitLegs({
      year: 1,
      monthIndex: 11,
      membersByLevel: [4, 8],
      shoppersByLevel: [6, 0],
      directLegs: 4,
      inputs: baseInputs,
    });

    expect(legs.length).toBe(4);
  });

  it('verteilt symmetrisch (alle Beine identisch)', () => {
    const modulator = createNoneStrategy();
    const legs = modulator.splitLegs({
      year: 2,
      monthIndex: 23,
      membersByLevel: [4, 8],
      shoppersByLevel: [6, 0],
      directLegs: 4,
      inputs: baseInputs,
    });

    const first = legs[0];
    for (const leg of legs.slice(1)) {
      expect(leg.membersByLevel).toEqual(first.membersByLevel);
      expect(leg.shoppersByLevel).toEqual(first.shoppersByLevel);
    }
  });

  it('summiert sich pro Ebene zu den Aggregaten', () => {
    const modulator = createNoneStrategy();
    const legs = modulator.splitLegs({
      year: 3,
      monthIndex: 35,
      membersByLevel: [6, 12, 18],
      shoppersByLevel: [9, 0, 0],
      directLegs: 6,
      inputs: baseInputs,
    });

    for (let level = 0; level < 3; level++) {
      const sum = legs.reduce(
        (a, l) => a + (l.membersByLevel[level] ?? 0),
        0,
      );
      expect(sum).toBeCloseTo([6, 12, 18][level], 5);
    }
  });

  it('liefert leeres Array bei directLegs = 0', () => {
    const modulator = createNoneStrategy();
    const legs = modulator.splitLegs({
      year: 1,
      monthIndex: 0,
      membersByLevel: [],
      shoppersByLevel: [],
      directLegs: 0,
      inputs: baseInputs,
    });

    expect(legs).toEqual([]);
  });
});

describe('createGrowthModulator', () => {
  it('liefert noneStrategy fuer strategy="none"', () => {
    const modulator = createGrowthModulator({ strategy: 'none' });
    expect(modulator.id).toBe('none');
  });

  it('faellt lifecycle vorlaeufig auf noneStrategy zurueck', () => {
    const lifecycle = createGrowthModulator({ strategy: 'lifecycle' });
    expect(lifecycle.id).toBe('none');
  });
});
