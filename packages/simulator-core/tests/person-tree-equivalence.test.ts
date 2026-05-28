import { describe, expect, it } from 'vitest';
import {
  personTreeToNetworkSnapshot,
  simulateNetwork,
  simulatePersonTree,
} from '../src';

describe('Personenbaum als Standard-Quelle', () => {
  it.each([
    {
      name: 'Shopper-only',
      inputs: {
        membersPerYear: 0,
        shoppersPerYear: 1,
        duplicationRate: 0,
        attritionRate: 0,
        maxDirectMembersPerMember: 29,
      },
    },
    {
      name: 'Member ohne Duplikation',
      inputs: {
        membersPerYear: 2,
        shoppersPerYear: 0,
        duplicationRate: 0,
        attritionRate: 0,
        maxDirectMembersPerMember: 29,
      },
    },
    {
      name: 'Member und Shopper mit voller Duplikation',
      inputs: {
        membersPerYear: 1,
        shoppersPerYear: 1,
        duplicationRate: 1,
        attritionRate: 0,
        maxDirectMembersPerMember: 29,
      },
    },
  ])('liefert dieselben Aggregat-Snapshots wie simulateNetwork: $name', ({ inputs }) => {

    const aggregate = simulateNetwork(inputs, 120);
    const personTree = simulatePersonTree(
      {
        ...inputs,
        memberMonthlyVolume: 150,
        shopperMonthlyVolume: 150,
      },
      120,
    ).map(personTreeToNetworkSnapshot);

    expect(personTree).toHaveLength(aggregate.length);
    for (let index = 0; index < aggregate.length; index++) {
      expectLevelsClose(personTree[index].membersByLevel, aggregate[index].membersByLevel);
      expectLevelsClose(personTree[index].shoppersByLevel, aggregate[index].shoppersByLevel);
      expect(personTree[index].directLegs).toBeCloseTo(aggregate[index].directLegs, 8);
      expect(personTree[index].memberGrowth).toBeCloseTo(aggregate[index].memberGrowth, 8);
      expect(personTree[index].shopperGrowth).toBeCloseTo(aggregate[index].shopperGrowth, 8);
      expect(personTree[index].memberAttrition).toBeCloseTo(aggregate[index].memberAttrition, 8);
      expect(personTree[index].shopperAttrition).toBeCloseTo(aggregate[index].shopperAttrition, 8);
    }
  });

  it('dokumentiert die neue Personenbaum-Semantik bei Member-Fluktuation', () => {
    const inputs = {
      membersPerYear: 1.5,
      shoppersPerYear: 2,
      duplicationRate: 0.5,
      attritionRate: 0.1,
      maxDirectMembersPerMember: 4,
    };

    const aggregate = simulateNetwork(inputs, 120);
    const personTree = simulatePersonTree(
      {
        ...inputs,
        memberMonthlyVolume: 150,
        shopperMonthlyVolume: 150,
      },
      120,
    ).map(personTreeToNetworkSnapshot);

    expect(personTree[119].directLegs).toBeCloseTo(aggregate[119].directLegs, 8);
    expect(personTree[119].membersByLevel).not.toEqual(aggregate[119].membersByLevel);
    expect(total(personTree[119].membersByLevel)).toBeGreaterThan(0);
    expect(total(aggregate[119].membersByLevel)).toBeGreaterThan(0);
  });

  it('wendet Member-Fluktuation vor neuem Wachstum an', () => {
    const snapshots = simulatePersonTree(
      {
        membersPerYear: 1,
        shoppersPerYear: 0,
        duplicationRate: 1,
        attritionRate: 0.5,
        memberMonthlyVolume: 150,
        shopperMonthlyVolume: 150,
        maxDirectMembersPerMember: 29,
      },
      24,
    );

    expect(snapshots[0].memberGrowth).toBe(1);
    expect(snapshots[0].memberAttrition).toBe(0);
    expect(snapshots[12].memberGrowth).toBeGreaterThan(0);
    expect(snapshots[12].memberAttrition).toBe(0);
  });
});

function expectLevelsClose(actual: number[], expected: number[]) {
  expect(actual).toHaveLength(expected.length);
  for (let index = 0; index < expected.length; index++) {
    expect(actual[index]).toBeCloseTo(expected[index], 8);
  }
}

function total(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}
