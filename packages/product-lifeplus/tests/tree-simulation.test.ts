import { describe, expect, it } from 'vitest';
import {
  personTreeToNetworkSnapshot,
  simulatePersonTree,
} from '@mlm/simulator-core';
import {
  calculateTreeCompensation,
  runLifeplusTreeSimulation,
} from '../src';

describe('LifePlus Personenbaum-Simulation', () => {
  it('erzeugt aus Szenario-Parametern echte Personen und Bestellungen', () => {
    const snapshots = simulatePersonTree(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
        memberMonthlyVolume: 200,
        shopperMonthlyVolume: 100,
      },
      24,
    );
    const y2 = snapshots[23];
    const network = personTreeToNetworkSnapshot(y2);

    expect(y2.persons.filter((person) => person.kind === 'member')).toHaveLength(3);
    expect(y2.persons.filter((person) => person.kind === 'shopper')).toHaveLength(3);
    expect(y2.orders.length).toBe(6);
    expect(network.membersByLevel).toEqual([4, 4]);
    expect(network.shoppersByLevel).toEqual([6, 6]);
  });

  it('berechnet Phase 1 exakt entlang der echten Upline', () => {
    const snapshot = simulatePersonTree(
      {
        membersPerYear: 1,
        shoppersPerYear: 0,
        duplicationRate: 0,
        attritionRate: 0,
        memberMonthlyVolume: 400,
        shopperMonthlyVolume: 100,
      },
      12,
    )[11];

    const comp = calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume: 40,
    });

    expect(comp.phase1Units).toBeCloseTo(32.5, 2);
    expect(comp.phase2Units).toBe(0);
    expect(comp.phase3Units).toBe(0);
  });

  it('liefert ein SimulationResult-kompatibles Ergebnis aus dem Personenbaum', () => {
    const result = runLifeplusTreeSimulation(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
        memberMonthlyVolume: 200,
        shopperMonthlyVolume: 200,
        unitToCurrency: 1,
      },
      24,
    );

    expect(result.months).toHaveLength(24);
    expect(result.yearEnds).toHaveLength(2);
    expect(result.finalMonth.networkSize).toBeGreaterThan(0);
    expect(result.finalMonth.totalEUR).toBeGreaterThan(0);
  });
});
