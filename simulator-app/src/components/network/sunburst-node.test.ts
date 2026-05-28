import { describe, expect, it } from 'vitest';
import type { MonthResult } from '@mlm/simulator-core';
import {
  buildLegsFromPersons,
  buildSunburstTree,
  buildSunburstTreeFromPersons,
  estimateAggregateRank,
  findLeg,
  findLevel,
  findNodeById,
} from './sunburst-node';

describe('sunburst-node', () => {
  it('schaetzt aggregierte Ränge nur bis Diamond, solange keine echten Diamond-Beine bekannt sind', () => {
    expect(estimateAggregateRank(15000, 12)).toBe('Diamond');
    expect(estimateAggregateRank(25000, 12)).toBe('Diamond');
    expect(estimateAggregateRank(9000, 9)).toBe('Gold');
  });

  it('uebernimmt explizite Rangdaten aus dem Snapshot', () => {
    const tree = buildSunburstTree({
      snapshot: createSnapshot({
        legs: [
          {
            id: 'leg-a',
            membersByLevel: [1, 12],
            shoppersByLevel: [0, 0],
            ranksByLevel: ['3*Diamond'],
          },
        ],
      }),
      memberMonthlyVolume: 150,
      shopperMonthlyVolume: 150,
    });

    expect(findLeg(tree, 1)?.rankName).toBe('3*Diamond');
  });

  it('verteilt Phase-Werte anteilig auf Ebenen', () => {
    const tree = buildSunburstTree({
      snapshot: createSnapshot({
        phase1EUR: 100,
        phase2EUR: 50,
        phase3EUR: 25,
        totalEUR: 175,
        legs: [
          {
            id: 'leg-a',
            membersByLevel: [1, 3],
            shoppersByLevel: [1, 1],
          },
        ],
      }),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 100,
    });

    const level1 = findLevel(tree, 1, 1);
    const level2 = findLevel(tree, 1, 2);

    expect(level1?.phase1EUR).toBeCloseTo(100 / 3);
    expect(level1?.phase2EUR).toBeCloseTo(50 / 3);
    expect(level1?.phase3EUR).toBeCloseTo(25 / 3);
    expect(level2?.phase1EUR).toBeCloseTo(200 / 3);
    expect(level2?.phase2EUR).toBeCloseTo(100 / 3);
    expect(level2?.phase3EUR).toBeCloseTo(50 / 3);
  });

  it('baut Personenbaum-Legs mit echter Node-ID und ohne erfundene Euro-Provision', () => {
    const snapshot = createPersonSnapshot();

    const legs = buildLegsFromPersons({
      snapshot,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });

    expect(legs[0].nodeId).toBe('m-1');
    expect(legs[0].members).toBe(2);
    expect(legs[0].shoppers).toBe(1);
    expect(legs[0].qgv).toBe(250);
    expect(legs[0].eur).toBe(0);
  });

  it('verlinkt Personenbaum-Breadcrumbs ueber echte Personen-IDs', () => {
    const tree = buildSunburstTreeFromPersons({
      snapshot: createPersonSnapshot(),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });

    expect(findLeg(tree, 1)?.id).toBe('m-1');
    expect(findNodeById(tree, 'm-2')?.parentId).toBe('m-1');
  });
});

function createSnapshot(overrides: Partial<MonthResult>): MonthResult {
  return {
    monthIndex: 119,
    year: 10,
    monthInYear: 12,
    membersByLevel: [1],
    shoppersByLevel: [0],
    legs: [],
    totalEUR: 0,
    phase1EUR: 0,
    phase2EUR: 0,
    phase3EUR: 0,
    rankName: 'Member',
    av: 150,
    qgv: 150,
    bronzeLegs: 0,
    diamondLegs: 0,
    networkSize: 1,
    directLegs: 1,
    members: 1,
    shoppers: 0,
    memberGrowth: 0,
    memberAttrition: 0,
    shopperGrowth: 0,
    shopperAttrition: 0,
    ...overrides,
  };
}

function createPersonSnapshot() {
  return {
    monthIndex: 11,
    year: 1,
    monthInYear: 12,
    rootId: 'root',
    persons: [
      {
        id: 'root',
        kind: 'root' as const,
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: ['m-1'],
      },
      {
        id: 'm-1',
        sponsorId: 'root',
        kind: 'member' as const,
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: ['m-2', 's-1'],
      },
      {
        id: 'm-2',
        sponsorId: 'm-1',
        kind: 'member' as const,
        joinedMonth: 12,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: [],
      },
      {
        id: 's-1',
        sponsorId: 'm-1',
        kind: 'shopper' as const,
        joinedMonth: 12,
        active: true,
        weight: 1,
        personalMonthlyVolume: 50,
        childrenIds: [],
      },
    ],
    orders: [],
    memberGrowth: 0,
    memberAttrition: 0,
    shopperGrowth: 0,
    shopperAttrition: 0,
  };
}
