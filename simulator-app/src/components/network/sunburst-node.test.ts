import { describe, expect, it } from 'vitest';
import type {
  PersonTreeSnapshot,
  QuarterResult,
  TreeCompensationResult,
} from '@mlm/simulator-core';
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

  it('weist Root-eigene Shopper als virtuellen Eintrag aus', () => {
    const snapshot = createRootShopperSnapshot();
    const compensation = createRootShopperCompensation();

    const legs = buildLegsFromPersons({
      snapshot,
      compensation,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 100,
    });
    const tree = buildSunburstTreeFromPersons({
      snapshot,
      compensation,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 100,
    });

    const ownShoppers = legs.find((leg) => leg.isOwnShoppers);
    expect(ownShoppers?.nodeId).toBe('own-shoppers');
    expect(ownShoppers?.label).toBe('Eigene Shopper');
    expect(ownShoppers?.eur).toBe(50);
    expect(ownShoppers?.qgv).toBe(200);
    expect(legs.reduce((sum, leg) => sum + leg.eur, 0)).toBe(80);

    const ownShopperNode = findNodeById(tree, 'own-shoppers');
    expect(ownShopperNode?.provisionEUR).toBe(50);
    expect(tree.provisionEUR).toBe(80);
  });

  it('haelt inaktive direkte Root-Beine sichtbar, wenn darunter aktive Struktur liegt', () => {
    const snapshot = createInactiveDirectLegSnapshot();
    const compensation = createInactiveDirectLegCompensation();

    const legs = buildLegsFromPersons({
      snapshot,
      compensation,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 100,
    });
    const tree = buildSunburstTreeFromPersons({
      snapshot,
      compensation,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 100,
    });

    expect(legs).toHaveLength(1);
    expect(legs[0].nodeId).toBe('m-old');
    expect(legs[0].status).toBe('inactive');
    expect(legs[0].members).toBe(1);
    expect(legs[0].eur).toBe(42);
    expect(findLeg(tree, 1)?.id).toBe('m-old');
    expect(findNodeById(tree, 'm-live')?.parentId).toBe('m-old');
  });
});

function createSnapshot(overrides: Partial<QuarterResult>): QuarterResult {
  return {
    quarterIndex: 39,
    year: 10,
    quarterInYear: 4,
    periodMonths: 3,
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

function createPersonSnapshot(): PersonTreeSnapshot {
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

function createRootShopperSnapshot(): PersonTreeSnapshot {
  return {
    monthIndex: 11,
    year: 1,
    monthInYear: 12,
    rootId: 'root',
    persons: [
      {
        id: 'root',
        kind: 'root',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        shopperCount: 2,
        shopperMonthlyVolume: 100,
        childrenIds: ['m-1'],
      },
      {
        id: 'm-1',
        sponsorId: 'root',
        kind: 'member',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
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

function createRootShopperCompensation(): TreeCompensationResult {
  return createCompensation({
    totalUnits: 80,
    phase1Units: 80,
    rankName: 'Member',
    av: 100,
    qgv: 300,
    networkSize: 3,
    directLegs: 1,
    members: 1,
    shoppers: 2,
    payouts: [
      createPayout({
        orderId: 'o-root-shopper',
        orderPersonId: 'root',
        amount: 50,
      }),
      createPayout({
        orderId: 'o-m-1',
        orderPersonId: 'm-1',
        amount: 30,
      }),
    ],
    rankStates: [
      createRankState({ personId: 'root', rankName: 'Member', qgv: 300 }),
      createRankState({ personId: 'm-1', rankName: 'Member', qgv: 100 }),
    ],
  });
}

function createInactiveDirectLegSnapshot(): PersonTreeSnapshot {
  return {
    monthIndex: 11,
    year: 1,
    monthInYear: 12,
    rootId: 'root',
    persons: [
      {
        id: 'root',
        kind: 'root',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: ['m-old'],
      },
      {
        id: 'm-old',
        sponsorId: 'root',
        kind: 'member',
        joinedMonth: 0,
        active: false,
        weight: 0,
        personalMonthlyVolume: 100,
        childrenIds: ['m-live'],
      },
      {
        id: 'm-live',
        sponsorId: 'm-old',
        kind: 'member',
        joinedMonth: 12,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
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

function createInactiveDirectLegCompensation(): TreeCompensationResult {
  return createCompensation({
    totalUnits: 42,
    phase1Units: 42,
    rankName: 'Member',
    av: 100,
    qgv: 100,
    networkSize: 1,
    directLegs: 1,
    members: 1,
    shoppers: 0,
    payouts: [
      createPayout({
        orderId: 'o-m-live',
        orderPersonId: 'm-live',
        amount: 42,
      }),
    ],
    rankStates: [
      createRankState({ personId: 'root', rankName: 'Member', qgv: 100 }),
      createRankState({ personId: 'm-live', rankName: 'Member', qgv: 100 }),
    ],
  });
}

function createCompensation(
  overrides: Partial<TreeCompensationResult>,
): TreeCompensationResult {
  return {
    totalUnits: 0,
    phase1Units: 0,
    phase2Units: 0,
    phase3Units: 0,
    rankName: 'Member',
    av: 100,
    qgv: 0,
    networkSize: 0,
    directLegs: 0,
    members: 0,
    shoppers: 0,
    payouts: [],
    rankStates: [],
    ...overrides,
  };
}

function createPayout(
  overrides: Partial<TreeCompensationResult['payouts'][number]>,
): TreeCompensationResult['payouts'][number] {
  return {
    orderId: 'o-1',
    orderPersonId: 'm-1',
    receiverId: 'root',
    phase: 1,
    levelFromOrder: 1,
    slot: 'test',
    rate: 0,
    baseVolume: 0,
    amount: 0,
    reason: 'test',
    ...overrides,
  };
}

function createRankState({
  personId,
  rankName,
  av = 100,
  qgv,
}: {
  personId: string;
  rankName: string;
  av?: number;
  qgv: number;
}): TreeCompensationResult['rankStates'][number] {
  return {
    personId,
    rank: { name: rankName },
    av,
    qgv,
    qualifiedLegs: 0,
    bronzeLegs: 0,
    diamondLegs: 0,
  };
}
